"""Paso 1.2 — Ortofoto.

Si existe <raw>/orto/orto_recorte.tif se usa ese archivo. Si no, se descarga del WMS
del PNOA de máxima actualidad (IGN), comprobando antes con GetCapabilities la capa y el
tamaño máximo por petición. Las respuestas se cachean en <processed>/orto_wms/.

La imagen se corta en una rejilla de N × N teselas alineada con el terreno: cada tesela
abarca un número entero de celdas del terreno y como mucho ortho_tile_px por lado. La
fase 2 usa esta misma rejilla para los chunks.

Salidas:
    <assets>/orto/orto_{fila}_{col}.jpg, <assets>/orto/orto.json
    <processed>/orto_mosaico.tif (GeoTIFF completo, para QGIS)
    <processed>/previews/orto.jpg (reducida a 1 px/m)

Uso: conda run -n cabdrive python tools/02_ortho.py
"""
from __future__ import annotations

import io
import json
import sys
import time
import xml.etree.ElementTree as ET

import numpy as np
import rasterio
import requests
from PIL import Image
from rasterio.enums import Resampling
from rasterio.transform import from_origin
from rasterio.warp import reproject

from comun import cargar_config, cargar_origin, dir_assets, dir_previews, dir_processed, dir_raw

CAPA_PREFERIDA = "OI.OrthoimageCoverage"
REINTENTOS = 3
ESPERA_S = (5, 15, 30)
CABECERAS = {"User-Agent": "cabanillas-drive (prototipo; rubenpantxo.com)"}

Image.MAX_IMAGE_PIXELS = None  # el mosaico completo supera el límite por defecto de Pillow


def falla(mensaje: str) -> None:
    print(f"\nERROR: {mensaje}")
    sys.exit(1)


def rejilla_teselas(ancho: float, alto: float, px_m: float, paso_terreno: float, max_px: int):
    """Menor N tal que cada tesela (ancho/N × alto/N) tenga px enteros ≤ max_px y
    abarque un número entero de celdas del terreno en ambos ejes."""
    for n in range(1, 65):
        tx, tz = ancho / n, alto / n
        px_x, px_z = tx * px_m, tz * px_m
        enteros = all(abs(v - round(v)) < 1e-6 for v in (px_x, px_z, tx / paso_terreno, tz / paso_terreno))
        if enteros and px_x <= max_px and px_z <= max_px:
            return n, tx, tz, round(px_x), round(px_z)
    falla("No hay una rejilla de teselas alineada con el terreno; revisa ortho_px_per_m y ortho_tile_px.")


# ------------------------------------------------------------------------------ WMS
def pide(url: str, params: dict, descripcion: str) -> requests.Response:
    for intento in range(REINTENTOS):
        try:
            r = requests.get(url, params=params, headers=CABECERAS, timeout=120)
            r.raise_for_status()
            return r
        except requests.RequestException as e:
            print(f"  {descripcion}: intento {intento + 1}/{REINTENTOS} fallido ({e})")
            if intento + 1 < REINTENTOS:
                time.sleep(ESPERA_S[intento])
    falla(f"El WMS no responde tras {REINTENTOS} intentos ({descripcion}). "
          "Opción manual: GUIA_RUBEN.md, parte F (orto_recorte.tif).")


def capacidades(url: str, cache) -> tuple[str, int, int]:
    """Nombre de capa y tamaño máximo por petición según GetCapabilities (cacheado)."""
    if not cache.is_file():
        r = pide(url, {"SERVICE": "WMS", "REQUEST": "GetCapabilities", "VERSION": "1.3.0"}, "GetCapabilities")
        cache.write_bytes(r.content)
    raiz = ET.fromstring(cache.read_bytes())
    ns = {"w": "http://www.opengis.net/wms"}
    capas = [e.text for e in raiz.iterfind(".//w:Layer/w:Name", ns)]
    if CAPA_PREFERIDA in capas:
        capa = CAPA_PREFERIDA
    else:
        candidatas = [c for c in capas if "ortho" in c.lower()]
        if not candidatas:
            falla(f"El WMS no ofrece ninguna capa de ortoimagen. Capas: {capas}")
        capa = candidatas[0]
    crs = {e.text for e in raiz.iterfind(".//w:CRS", ns)}
    if "EPSG:25830" not in crs:
        falla("El WMS no anuncia EPSG:25830.")
    max_w = int(raiz.findtext(".//w:Service/w:MaxWidth", "2048", ns))
    max_h = int(raiz.findtext(".//w:Service/w:MaxHeight", "2048", ns))
    return capa, max_w, max_h


def descarga_bloque(url, capa, bbox, w, h, cache_dir) -> np.ndarray:
    """GetMap de un bloque (bbox en EPSG:25830, w × h px). Cachea la respuesta."""
    nombre = f"{capa}_{bbox[0]:.3f}_{bbox[1]:.3f}_{bbox[2]:.3f}_{bbox[3]:.3f}_{w}x{h}.jpg"
    ruta = cache_dir / nombre
    if not ruta.is_file():
        params = {"SERVICE": "WMS", "VERSION": "1.1.1", "REQUEST": "GetMap", "LAYERS": capa, "STYLES": "",
                  "SRS": "EPSG:25830", "BBOX": ",".join(f"{v:.3f}" for v in bbox),
                  "WIDTH": w, "HEIGHT": h, "FORMAT": "image/jpeg"}
        r = pide(url, params, f"bloque {nombre}")
        if not r.headers.get("Content-Type", "").startswith("image/"):
            falla(f"El WMS devolvió {r.headers.get('Content-Type')} en vez de una imagen:\n{r.text[:500]}")
        ruta.write_bytes(r.content)
    img = Image.open(io.BytesIO(ruta.read_bytes())).convert("RGB")
    if img.size != (w, h):
        falla(f"Bloque {nombre}: tamaño {img.size}, esperado {(w, h)}.")
    return np.asarray(img)


def mosaico_wms(config, origin, ancho_px, alto_px, px_m, processed) -> tuple[np.ndarray, str]:
    url = config.get("ortho_wms_url", "https://www.ign.es/wms-inspire/pnoa-ma")
    capa, max_w, max_h = capacidades(url, processed / "pnoa_capabilities.xml")
    print(f"WMS: capa {capa}, máximo {max_w}×{max_h} px por petición")
    cache_dir = processed / "orto_wms"
    cache_dir.mkdir(exist_ok=True)

    # Bloques de petición ≤ máximo del servidor, alineados con píxeles enteros
    nx, ny = -(-ancho_px // max_w), -(-alto_px // max_h)
    bw, bh = -(-ancho_px // nx), -(-alto_px // ny)
    imagen = np.zeros((alto_px, ancho_px, 3), dtype=np.uint8)
    for j in range(ny):
        for i in range(nx):
            c0, r0 = i * bw, j * bh
            w, h = min(bw, ancho_px - c0), min(bh, alto_px - r0)
            bbox = (origin["E_min"] + c0 / px_m, origin["N_max"] - (r0 + h) / px_m,
                    origin["E_min"] + (c0 + w) / px_m, origin["N_max"] - r0 / px_m)
            imagen[r0:r0 + h, c0:c0 + w] = descarga_bloque(url, capa, bbox, w, h, cache_dir)
            print(f"  bloque {j * nx + i + 1}/{nx * ny} listo")
    fuente = f"PNOA máxima actualidad, WMS {url} (capa {capa})"
    return imagen, fuente


def mosaico_local(ruta, origin, ancho_px, alto_px, px_m) -> tuple[np.ndarray, str]:
    """Remuestrea orto_recorte.tif a la rejilla de la zona."""
    destino = np.zeros((3, alto_px, ancho_px), dtype=np.uint8)
    with rasterio.open(ruta) as ds:
        if ds.crs is None or ds.crs.to_epsg() != 25830:
            falla(f"{ruta.name} debe estar en EPSG:25830.")
        if ds.count < 3:
            falla(f"{ruta.name} tiene {ds.count} bandas; se esperan 3 (RGB).")
        for b in range(3):
            reproject(source=rasterio.band(ds, b + 1), destination=destino[b],
                      dst_transform=from_origin(origin["E_min"], origin["N_max"], 1 / px_m, 1 / px_m),
                      dst_crs="EPSG:25830", resampling=Resampling.bilinear)
    if (destino.max(axis=0) == 0).mean() > 0.001:
        falla(f"{ruta.name} no cubre toda la zona.")
    return np.moveaxis(destino, 0, -1), f"archivo local {ruta.name}"


def main() -> int:
    config = cargar_config()
    origin = cargar_origin(config)
    processed, assets = dir_processed(config), dir_assets(config)
    dir_orto = assets / "orto"
    dir_orto.mkdir(parents=True, exist_ok=True)
    dir_previews(config).mkdir(parents=True, exist_ok=True)

    terreno = json.loads((assets / "terrain" / "terrain.json").read_text(encoding="utf-8"))
    px_m = float(config["ortho_px_per_m"])
    ancho, alto = origin["ancho"], origin["alto"]
    ancho_px, alto_px = round(ancho * px_m), round(alto * px_m)
    n, tx, tz, tpx_x, tpx_z = rejilla_teselas(ancho, alto, px_m, terreno["paso_m"], int(config["ortho_tile_px"]))
    print(f"Ortofoto {ancho_px}×{alto_px} px ({px_m:g} px/m) → {n}×{n} teselas de {tpx_x}×{tpx_z} px "
          f"({tx:g} × {tz:g} m)")

    recorte = dir_raw(config) / "orto" / "orto_recorte.tif"
    if recorte.is_file():
        imagen, fuente = mosaico_local(recorte, origin, ancho_px, alto_px, px_m)
    else:
        imagen, fuente = mosaico_wms(config, origin, ancho_px, alto_px, px_m, processed)

    # GeoTIFF completo para revisar en QGIS
    perfil = dict(driver="GTiff", width=ancho_px, height=alto_px, count=3, dtype="uint8", crs="EPSG:25830",
                  transform=from_origin(origin["E_min"], origin["N_max"], 1 / px_m, 1 / px_m),
                  compress="jpeg", photometric="ycbcr", jpeg_quality=90, tiled=True)
    with rasterio.open(processed / "orto_mosaico.tif", "w", **perfil) as ds:
        ds.write(np.moveaxis(imagen, -1, 0))

    # Teselas para el juego (se borran las de una rejilla anterior)
    calidad = int(config.get("ortho_jpeg_quality", 85))
    for viejo in dir_orto.glob("orto_*.jpg"):
        viejo.unlink()
    teselas = []
    total = 0
    for fila in range(n):
        for col in range(n):
            bloque = imagen[fila * tpx_z:(fila + 1) * tpx_z, col * tpx_x:(col + 1) * tpx_x]
            nombre = f"orto_{fila}_{col}.jpg"
            Image.fromarray(bloque).save(dir_orto / nombre, quality=calidad, optimize=True, progressive=True)
            total += (dir_orto / nombre).stat().st_size
            x_min, z_min = -ancho / 2 + col * tx, -alto / 2 + fila * tz
            teselas.append({"archivo": nombre, "fila": fila, "col": col,
                            "x_min": x_min, "x_max": x_min + tx, "z_min": z_min, "z_max": z_min + tz})
    meta = {
        "filas": n, "columnas": n,
        "px_por_m": px_m,
        "tesela_px": [tpx_x, tpx_z],
        "tesela_m": [tx, tz],
        "imagen_px": [ancho_px, alto_px],
        "orden": "fila 0 = norte (z mínima), columna 0 = oeste (x mínima)",
        "fuente": fuente,
        "atribucion": "PNOA cedido por © Instituto Geográfico Nacional",
        "teselas": teselas,
    }
    (dir_orto / "orto.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    Image.fromarray(imagen).resize((round(ancho), round(alto)), Image.LANCZOS).save(
        dir_previews(config) / "orto.jpg", quality=88, optimize=True)

    print(f"\nSalidas:\n  {dir_orto} — {n * n} teselas, {total / 1_048_576:.1f} MB en total\n"
          f"  {processed / 'orto_mosaico.tif'}\n  {dir_previews(config) / 'orto.jpg'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
