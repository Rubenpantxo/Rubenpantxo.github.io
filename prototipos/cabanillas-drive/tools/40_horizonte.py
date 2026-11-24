"""Salto S1 — Horizonte: anillo de relieve y ortofoto alrededor de la zona del juego (PLAN_SALTO.md).

Desde el avión (550 m) se ve mucho más allá de la zona (1500 × 1400 m). Este script prepara un
cuadrado de config.horizonte.lado_m (8 km: su borde cae donde acaba la niebla) centrado en el
origen local, con un hueco donde ya está el terreno del juego:
  - relieve: MDT05 del IGN por WCS (config.horizonte.mdt_wcs_url / mdt_cobertura), promediado a
    una rejilla de paso_m. Se compara con el terreno del juego dentro de la zona y, si hay un
    desfase de altura, se resta (se informa de cuánto).
  - color: ortofoto PNOA del MISMO WMS y capa que 02_ortho.py. Antes de seguir se compara su
    parte central con la ortofoto del juego: si no se parecen (otro vuelo, otro año), se para.
  - costura: los vértices de la rejilla dentro de la zona o en su borde toman la altura del
    terreno del juego, un poco hundida (hundido_borde_m), y el anillo no tiene triángulos dentro.
Las descargas se cachean en <processed>/horizonte/ y no se repiten.

Salidas (las lee src/escena/horizonte.js):
    <assets>/horizonte/horizonte.json  (rejilla, hueco, fuentes)
    <assets>/horizonte/horizonte.f32   (alturas locales, Float32, filas de norte a sur)
    <assets>/horizonte/horizonte.jpg, horizonte_bajo.jpg  (ortofoto del cuadrado entero)
    <processed>/previews/horizonte.jpg (ortofoto con la zona marcada y el relieve sombreado)

Uso: conda run -n cabdrive python tools/40_horizonte.py
"""
from __future__ import annotations

import importlib
import io
import json
import sys
import time

import numpy as np
import requests
from PIL import Image, ImageDraw

from comun import cargar_config, cargar_origin, dir_assets, dir_previews, dir_processed

# Certificados del almacén de Windows: en este PC algo intercepta HTTPS con un certificado raíz que
# Python no conoce, y www.ign.es no manda su cadena completa (curl de Windows sí la completa)
try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

ortho = importlib.import_module("02_ortho")      # mismo WMS, capa y caché de bloques que la zona

CABECERAS = {"User-Agent": "cabanillas-drive (prototipo)"}
REINTENTOS = 3
ESPERA_S = (5, 15, 30)


def falla(mensaje: str) -> None:
    print(f"\nERROR: {mensaje}")
    sys.exit(1)


def pide(url: str, params: dict, descripcion: str) -> bytes:
    for intento in range(REINTENTOS):
        try:
            r = requests.get(url, params=params, headers=CABECERAS, timeout=180)
            r.raise_for_status()
            return r
        except requests.RequestException as e:
            print(f"  {descripcion}: intento {intento + 1}/{REINTENTOS} fallido ({e})")
            if intento + 1 < REINTENTOS:
                time.sleep(ESPERA_S[intento])
    falla(f"El servicio no responde tras {REINTENTOS} intentos ({descripcion}).")


# ------------------------------------------------------------------------------ MDT05 (WCS)
def mdt(H, e0, n0, lado, cache):
    """Mosaico del MDT en una rejilla de 5 m (pixel 0,0 = esquina noroeste), por bloques cacheados."""
    import rasterio
    res = 5.0
    n_px = round(lado / res)
    salida = np.full((n_px, n_px), np.nan, dtype=np.float32)
    bloque = float(H["mdt_bloque_m"])
    nb = int(np.ceil(lado / bloque))
    for j in range(nb):
        for i in range(nb):
            x0, x1 = e0 + i * bloque, min(e0 + (i + 1) * bloque, e0 + lado)
            y1, y0 = n0 + lado - j * bloque, max(n0 + lado - (j + 1) * bloque, n0)
            ruta = cache / f"mdt_{H['mdt_cobertura']}_{x0:.0f}_{y0:.0f}_{x1:.0f}_{y1:.0f}.tif"
            if not ruta.is_file():
                r = pide(H["mdt_wcs_url"], {
                    "SERVICE": "WCS", "REQUEST": "GetCoverage", "VERSION": "2.0.1", "COVERAGEID": H["mdt_cobertura"],
                    "SUBSET": [f"x({x0:.0f},{x1:.0f})", f"y({y0:.0f},{y1:.0f})"], "FORMAT": "image/tiff"}, ruta.name)
                if not r.headers.get("Content-Type", "").startswith("image/tiff"):
                    falla(f"El WCS devolvió {r.headers.get('Content-Type')} en vez de un GeoTIFF:\n{r.text[:400]}")
                ruta.write_bytes(r.content)
            with rasterio.open(ruta) as ds:
                if ds.crs is None or ds.crs.to_epsg() != 25830 or abs(ds.res[0] - res) > 1e-6:
                    falla(f"{ruta.name}: CRS {ds.crs} y resolución {ds.res}; se esperaba EPSG:25830 a 5 m.")
                a = ds.read(1).astype(np.float32)
                if ds.nodata is not None:
                    a[a == ds.nodata] = np.nan
                c0 = round((ds.bounds.left - e0) / res)
                r0 = round((n0 + lado - ds.bounds.top) / res)
                h, w = a.shape
                salida[r0:r0 + h, c0:c0 + w] = a
            print(f"  MDT bloque {j * nb + i + 1}/{nb * nb} listo")
    if np.isnan(salida).any():
        falla(f"El MDT tiene {int(np.isnan(salida).sum())} píxeles sin dato en el cuadrado del horizonte.")
    return salida


# ------------------------------------------------------------------------------ Terreno del juego
def terreno_juego(assets):
    meta = json.loads((assets / "terrain" / "terrain.json").read_text(encoding="utf-8"))
    a = np.fromfile(assets / "terrain" / "terrain.f32", dtype="<f4").reshape(meta["filas"], meta["columnas"])
    x0, z0, paso = meta["vertice_0"]["x"], meta["vertice_0"]["z"], meta["paso_m"]

    def altura(x, z):
        """Bilineal en coordenadas locales (se recorta al borde de la zona)."""
        c = np.clip((np.asarray(x) - x0) / paso, 0, meta["columnas"] - 1.0001)
        f = np.clip((np.asarray(z) - z0) / paso, 0, meta["filas"] - 1.0001)
        c0, f0 = np.floor(c).astype(int), np.floor(f).astype(int)
        tc, tf = c - c0, f - f0
        return ((a[f0, c0] * (1 - tc) + a[f0, c0 + 1] * tc) * (1 - tf)
                + (a[f0 + 1, c0] * (1 - tc) + a[f0 + 1, c0 + 1] * tc) * tf)
    return meta, altura


# ------------------------------------------------------------------------------ Ortofoto (WMS)
def orto_cuadrado(config, H, e0, n0, lado, cache):
    url = config.get("ortho_wms_url", "https://www.ign.es/wms-inspire/pnoa-ma")
    capa, max_w, max_h = ortho.capacidades(url, cache / "pnoa_capabilities.xml")
    px = int(H["textura_px"])
    n = int(np.ceil(px / min(max_w, max_h)))
    b = px // n
    imagen = np.zeros((px, px, 3), dtype=np.uint8)
    m_px = lado / px
    for j in range(n):
        for i in range(n):
            bbox = (e0 + i * b * m_px, n0 + lado - (j + 1) * b * m_px, e0 + (i + 1) * b * m_px, n0 + lado - j * b * m_px)
            imagen[j * b:(j + 1) * b, i * b:(i + 1) * b] = ortho.descarga_bloque(url, capa, bbox, b, b, cache)
    return imagen, url, capa


def compara_con_juego(imagen, assets, lado, meta_t):
    """Correlación y diferencia media entre la parte central de la ortofoto nueva y la del juego."""
    orto = json.loads((assets / "orto" / "orto.json").read_text(encoding="utf-8"))
    ancho, alto = meta_t["tamaño_x_m"], meta_t["tamaño_z_m"]
    px_m = imagen.shape[0] / lado
    w, h = round(ancho * px_m), round(alto * px_m)
    c0 = round((lado / 2 - ancho / 2) * px_m)
    r0 = round((lado / 2 - alto / 2) * px_m)
    nueva = imagen[r0:r0 + h, c0:c0 + w].astype(np.float32)
    juego = Image.new("RGB", tuple(orto["imagen_px"]))
    tw, th = orto["tesela_px"]
    for f in range(orto["filas"]):
        for c in range(orto["columnas"]):
            juego.paste(Image.open(assets / "orto" / f"orto_{f}_{c}.jpg").convert("RGB"), (c * tw, f * th))
    juego = np.asarray(juego.resize((w, h), Image.LANCZOS)).astype(np.float32)
    ln, lj = nueva.mean(axis=2).ravel(), juego.mean(axis=2).ravel()
    corr = float(np.corrcoef(ln, lj)[0, 1])
    dif = float(np.abs(nueva - juego).mean())
    return corr, dif


# ------------------------------------------------------------------------------ Principal
def main() -> int:
    config = cargar_config()
    H = config["horizonte"]
    origin = cargar_origin(config)
    processed, assets = dir_processed(config), dir_assets(config)
    cache = processed / "horizonte"
    cache.mkdir(parents=True, exist_ok=True)
    salida = assets / "horizonte"
    salida.mkdir(parents=True, exist_ok=True)
    dir_previews(config).mkdir(parents=True, exist_ok=True)

    lado, paso = float(H["lado_m"]), float(H["paso_m"])
    e0, n0 = origin["E_centro"] - lado / 2, origin["N_centro"] - lado / 2
    meta_t, altura_juego = terreno_juego(assets)
    mx, mz = meta_t["tamaño_x_m"] / 2, meta_t["tamaño_z_m"] / 2
    print(f"Horizonte {lado:g} × {lado:g} m (paso {paso:g} m) alrededor de la zona de {2 * mx:g} × {2 * mz:g} m")

    # 1. Ortofoto y comprobación de que es el mismo vuelo que la de la zona
    imagen, url, capa = orto_cuadrado(config, H, e0, n0, lado, cache)
    corr, dif = compara_con_juego(imagen, assets, lado, meta_t)
    print(f"Ortofoto: {imagen.shape[1]}×{imagen.shape[0]} px ({lado / imagen.shape[0]:.2f} m/px); "
          f"parecido con la del juego: correlación {corr:.3f}, diferencia media {dif:.1f} niveles")
    if corr < float(H["minima_correlacion_orto"]):
        falla(f"La ortofoto del WMS ya no se parece a la del juego (correlación {corr:.3f} < "
              f"{H['minima_correlacion_orto']}): puede ser otro vuelo. Hay que decidir qué hacer (PLAN_SALTO.md, S1).")

    # 2. Relieve: MDT05 promediado a la rejilla (cada vértice, la media de los 4 × 4 píxeles de 5 m)
    m5 = mdt(H, e0, n0, lado, cache)
    k = round(paso / 5.0)
    n_v = round(lado / paso) + 1
    p = np.pad(m5, k // 2, mode="edge")[: n_v * k, : n_v * k]
    alt = p.reshape(n_v, k, n_v, k).mean(axis=(1, 3)) - origin["H_base"]
    xs = -lado / 2 + np.arange(n_v) * paso
    zs = -lado / 2 + np.arange(n_v) * paso                      # fila 0 = norte (z mínima)
    X, Z = np.meshgrid(xs, zs)
    dentro = (np.abs(X) <= mx) & (np.abs(Z) <= mz)
    interior = (np.abs(X) < mx - paso) & (np.abs(Z) < mz - paso)
    desfase = float(np.median(alt[interior] - altura_juego(X[interior], Z[interior])))
    print(f"MDT05 frente al terreno del juego dentro de la zona: desfase mediano {desfase:+.2f} m (se resta)")
    alt = alt - desfase
    borde = (~dentro) & (np.abs(X) <= mx + paso) & (np.abs(Z) <= mz + paso)
    salto_borde = float(np.abs(alt[borde] - altura_juego(X[borde], Z[borde])).mean())
    # Dentro de la zona o en su borde: la altura del terreno del juego, algo hundida
    alt[dentro] = altura_juego(X[dentro], Z[dentro]) - float(H["hundido_borde_m"])
    print(f"Costura: diferencia media en la primera fila de fuera {salto_borde:.2f} m")

    # 3. Salidas
    alt.astype("<f4").tofile(salida / "horizonte.f32")
    img = Image.fromarray(imagen)
    img.save(salida / "horizonte.jpg", quality=85)
    img.resize((int(H["textura_bajo_px"]),) * 2, Image.LANCZOS).save(salida / "horizonte_bajo.jpg", quality=85)
    meta = {
        "lado_m": lado, "paso_m": paso, "vertices": n_v,
        "vertice_0": {"x": -lado / 2, "z": -lado / 2, "nota": "esquina noroeste; filas de norte a sur"},
        "hueco": {"mitad_x": mx, "mitad_z": mz,
                  "nota": "sin triángulos con los tres vértices dentro de la zona o en su borde"},
        "formato": "Float32 little-endian, alturas locales (y = H − H_base)",
        "desfase_mdt_m": round(desfase, 3),
        "fuente_relieve": f"MDT05 del IGN, WCS {H['mdt_wcs_url']} ({H['mdt_cobertura']}), media a {paso:g} m",
        "fuente_color": f"PNOA máxima actualidad, WMS {url} (capa {capa})",
        "parecido_orto": {"correlacion": round(corr, 4), "diferencia_media": round(dif, 2)},
        "atribucion": "MDT05 y PNOA cedidos por © Instituto Geográfico Nacional",
        "texturas": {"alta": "horizonte.jpg", "bajo": "horizonte_bajo.jpg"},
    }
    (salida / "horizonte.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # 4. Vista previa: ortofoto con sombreado del relieve y la zona marcada
    gy, gx = np.gradient(alt, paso)
    sombra = np.clip(0.75 + (-gx * 0.6 - gy * 0.6) * 1.5, 0.35, 1.25)
    sombra = np.asarray(Image.fromarray((sombra * 200).clip(0, 255).astype(np.uint8)).resize(img.size, Image.BILINEAR)) / 200
    vista = Image.fromarray((imagen * sombra[..., None]).clip(0, 255).astype(np.uint8))
    d = ImageDraw.Draw(vista)
    s = vista.size[0] / lado
    d.rectangle([(lado / 2 - mx) * s, (lado / 2 - mz) * s, (lado / 2 + mx) * s, (lado / 2 + mz) * s], outline=(255, 224, 0), width=3)
    vista.save(dir_previews(config) / "horizonte.jpg", quality=85)
    kb = sum(f.stat().st_size for f in salida.iterdir()) / 1024
    print(f"Listo: {n_v}×{n_v} vértices, {kb:.0f} KB en {salida}; vista previa en {dir_previews(config) / 'horizonte.jpg'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
