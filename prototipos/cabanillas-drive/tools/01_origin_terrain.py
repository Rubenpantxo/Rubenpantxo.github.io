"""Paso 1.1 — Origen local y terreno.

- Lee el bbox de zona.geojson, mosaica y recorta MDT y MDS a la zona.
- Escribe data/processed/origin.json (E_centro, N_centro, H_base...). Es el ÚNICO
  script que calcula el origen; el resto lo lee con comun.cargar_origin().
- Remuestrea el MDT a terrain_resolution_m (vértices de la rejilla sobre la zona),
  rellena nodata por interpolación y exporta el terreno para el juego.

Salidas:
    <assets>/terrain/terrain.f32   Float32 LE, filas de norte a sur, alturas − H_base
    <assets>/terrain/terrain.json  metadatos de la rejilla
    <processed>/mdt_clip.tif, mds_clip.tif, ndsm.tif (MDS − MDT), a resolución nativa
    <processed>/previews/relieve.png

Uso (desde la raíz del proyecto):
    conda run -n cabdrive python tools/01_origin_terrain.py
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from PIL import Image, ImageDraw, ImageFont
from rasterio.enums import Resampling
from rasterio.fill import fillnodata
from rasterio.merge import merge
from rasterio.transform import from_origin
from rasterio.warp import reproject
from rasterio.windows import from_bounds as ventana_de

from comun import (cargar_config, dir_assets, dir_previews, dir_processed, dir_raw,
                   ruta_origin, ruta_zona)

EPSG = 25830
CRS = f"EPSG:{EPSG}"
NODATA = -9999.0
EXT_RASTER = {".asc", ".tif", ".tiff"}
# Distancia máxima (m) que se rellena por interpolación; más allá se considera hueco real
DIST_MAX_RELLENO_M = 50.0
# Exageración vertical del sombreado (la Ribera es muy llana)
EXAGERACION_RELIEVE = 2.0


def falla(mensaje: str) -> None:
    print(f"\nERROR: {mensaje}")
    sys.exit(1)


# ----------------------------------------------------------------------------- zona
def lee_zona(config: dict) -> tuple[float, float, float, float]:
    zona = gpd.read_file(ruta_zona(config))
    if zona.crs is None or zona.crs.to_epsg() != EPSG:
        falla(f"zona.geojson debe estar en {CRS} (está en {zona.crs}).")
    minx, miny, maxx, maxy = (float(v) for v in zona.total_bounds)
    return minx, miny, maxx, maxy


def elige_rejilla(ancho: float, alto: float, res: float) -> tuple[int, int, float, str]:
    """Columnas, filas y paso de la rejilla de vértices. Prefiere 2^n + 1 por lado si da
    celdas cuadradas con un paso cercano al objetivo; si no, usa el paso exacto."""
    kx = round(math.log2(ancho / res))
    kz = round(math.log2(alto / res))
    px, pz = ancho / 2 ** kx, alto / 2 ** kz
    if abs(px - pz) / max(px, pz) < 0.01 and abs(px / res - 1) <= 0.25:
        return 2 ** kx + 1, 2 ** kz + 1, px, f"2^n + 1 por lado ({2 ** kx + 1}×{2 ** kz + 1}), paso {px:.4f} m"

    columnas = round(ancho / res) + 1
    filas = round(alto / res) + 1
    paso_x = ancho / (columnas - 1)
    paso_z = alto / (filas - 1)
    if abs(paso_x - paso_z) > 1e-6:
        falla(f"La zona ({ancho} × {alto} m) no da celdas cuadradas con paso {res} m. "
              "Ajusta zona.geojson a múltiplos de terrain_resolution_m.")
    nota = (f"paso exacto {paso_x:g} m ({columnas}×{filas} vértices). No se usa 2^n + 1: con una zona de "
            f"{ancho:g} × {alto:g} m daría celdas de {px:.3f} × {pz:.3f} m (no cuadradas o lejos de {res:g} m)")
    return columnas, filas, paso_x, nota


# -------------------------------------------------------------------------- mosaico
def rasteres(carpeta: Path) -> list[Path]:
    lista = sorted(p for p in carpeta.iterdir() if p.is_file() and p.suffix.lower() in EXT_RASTER)
    if not lista:
        falla(f"No hay rásteres en {carpeta}")
    return lista


def ajusta_a_rejilla(bounds, origen_x: float, origen_y: float, res: float):
    """Amplía bounds hasta coincidir con la rejilla de píxeles de origen."""
    minx, miny, maxx, maxy = bounds
    f = lambda v, o: o + math.floor((v - o) / res + 1e-9) * res  # noqa: E731
    c = lambda v, o: o + math.ceil((v - o) / res - 1e-9) * res  # noqa: E731
    return f(minx, origen_x), f(miny, origen_y), c(maxx, origen_x), c(maxy, origen_y)


def mosaico(nombre: str, rutas: list[Path], bounds) -> tuple[np.ndarray, rasterio.Affine, float]:
    """Mosaico de las hojas sobre bounds a resolución nativa (NaN = sin dato).
    Comprueba que todas comparten CRS, resolución y rejilla, y compara sus solapes."""
    with rasterio.open(rutas[0]) as ds0:
        res = ds0.res[0]
        ox, oy = ds0.transform.c, ds0.transform.f
    for ruta in rutas:
        with rasterio.open(ruta) as ds:
            if ds.crs is None or ds.crs.to_epsg() != EPSG:
                falla(f"{ruta.name} no está en {CRS}.")
            if abs(ds.res[0] - res) > 1e-9 or abs(ds.res[1] - res) > 1e-9:
                falla(f"{ruta.name} tiene resolución {ds.res}, distinta de {res}.")
            dx = (ds.transform.c - ox) / res
            dy = (ds.transform.f - oy) / res
            if abs(dx - round(dx)) > 1e-6 or abs(dy - round(dy)) > 1e-6:
                falla(f"{ruta.name} no está alineado con la rejilla de {rutas[0].name}.")

    bounds = ajusta_a_rejilla(bounds, ox, oy, res)
    resultado = None
    transform = None
    for ruta in rutas:
        datos, transform = merge([str(ruta)], bounds=bounds, nodata=NODATA, dtype="float32")
        hoja = datos[0].astype("float32")
        hoja[hoja == NODATA] = np.nan
        if resultado is None:
            resultado = hoja
            continue
        ambos = np.isfinite(resultado) & np.isfinite(hoja)
        if ambos.any():
            dif = np.abs(resultado[ambos] - hoja[ambos])
            print(f"  {nombre}: solape con {ruta.name}: {ambos.sum():,} px, "
                  f"diferencia media {dif.mean():.3f} m, máxima {dif.max():.3f} m")
        resultado = np.where(np.isfinite(resultado), resultado, hoja)
    return resultado, transform, res


def recorte(arr: np.ndarray, transform, res: float, bounds) -> tuple[np.ndarray, rasterio.Affine]:
    """Sub-matriz de arr que cubre exactamente bounds (alineados con la rejilla)."""
    minx, miny, maxx, maxy = bounds
    col0 = round((minx - transform.c) / res)
    fila0 = round((transform.f - maxy) / res)
    ancho = round((maxx - minx) / res)
    alto = round((maxy - miny) / res)
    return arr[fila0:fila0 + alto, col0:col0 + ancho], from_origin(minx, maxy, res, res)


def rellena(nombre: str, arr: np.ndarray, res: float) -> tuple[np.ndarray, int]:
    """Rellena NaN por interpolación (GDAL FillNodata). Falla si quedan huecos grandes."""
    huecos = ~np.isfinite(arr)
    n = int(huecos.sum())
    if n == 0:
        return arr, 0
    entrada = np.where(huecos, NODATA, arr).astype("float32")
    salida = fillnodata(entrada, mask=(~huecos).astype("uint8"),
                        max_search_distance=DIST_MAX_RELLENO_M / res, smoothing_iterations=0)
    quedan = int((salida == NODATA).sum())
    if quedan:
        falla(f"{nombre}: {quedan} px sin dato a más de {DIST_MAX_RELLENO_M:g} m de cualquier dato válido. "
              "No se inventan alturas: revisa la cobertura.")
    return salida, n


def guarda_tif(ruta: Path, arr: np.ndarray, transform, descripcion: str) -> None:
    datos = np.where(np.isfinite(arr), arr, NODATA).astype("float32")
    perfil = dict(driver="GTiff", width=datos.shape[1], height=datos.shape[0], count=1,
                  dtype="float32", crs=CRS, transform=transform, nodata=NODATA,
                  compress="deflate", predictor=3, tiled=True, blockxsize=256, blockysize=256)
    with rasterio.open(ruta, "w", **perfil) as ds:
        ds.write(datos, 1)
        ds.update_tags(descripcion=descripcion)


# -------------------------------------------------------------------------- relieve
def guarda_relieve(alturas: np.ndarray, paso: float, ruta: Path, h_base: float) -> None:
    """Sombreado (luz del NO, 45°) teñido por altura. Norte arriba."""
    z = alturas.astype("float64") * EXAGERACION_RELIEVE
    gz, gx = np.gradient(z, paso)          # gz crece hacia el sur (filas), gx hacia el este
    normal = np.dstack((-gx, gz, np.ones_like(z)))
    normal /= np.linalg.norm(normal, axis=2, keepdims=True)
    az, alt = math.radians(315), math.radians(45)
    luz = np.array([math.sin(az) * math.cos(alt), math.cos(az) * math.cos(alt), math.sin(alt)])
    sombra = np.clip(normal @ luz, 0, 1)

    t = (alturas - alturas.min()) / max(float(np.ptp(alturas)), 1e-6)
    paradas = [0.0, 0.35, 0.7, 1.0]
    colores = np.array([[86, 130, 72], [196, 186, 120], [168, 118, 76], [245, 240, 232]], dtype=float)
    rgb = np.dstack([np.interp(t, paradas, colores[:, i]) for i in range(3)])
    rgb *= (0.35 + 0.65 * sombra)[..., None]
    imagen = Image.fromarray(np.clip(rgb, 0, 255).astype("uint8"))

    dibujo = ImageDraw.Draw(imagen)
    # Fuente libre que trae Pillow; no tiene vocales con tilde, por eso el texto va sin ellas
    fuente = ImageFont.load_default(size=15)
    texto = (f"Relieve · paso {paso:g} m · norte arriba · luz NO · vertical x{EXAGERACION_RELIEVE:g}\n"
             f"{h_base + alturas.min():.1f} - {h_base + alturas.max():.1f} m (H_base {h_base:.2f} m)")
    caja = dibujo.multiline_textbbox((8, 6), texto, font=fuente)
    dibujo.rectangle([0, 0, caja[2] + 8, caja[3] + 6], fill=(20, 28, 38))
    dibujo.multiline_text((8, 6), texto, font=fuente, fill=(255, 255, 255))
    imagen.save(ruta, optimize=True)


# ---------------------------------------------------------------------- comprobación
def media_ponderada(ds, celda) -> float | None:
    """Media de los píxeles de ds bajo celda, ponderada por el área solapada (como el
    remuestreo 'average'). Los píxeles de origen no tienen por qué coincidir con la celda."""
    x0, y0, x1, y1 = celda
    res = ds.res[0]
    v = ventana_de(*celda, transform=ds.transform)
    c0, r0 = math.floor(v.col_off + 1e-9), math.floor(v.row_off + 1e-9)
    c1, r1 = math.ceil(v.col_off + v.width - 1e-9), math.ceil(v.row_off + v.height - 1e-9)
    valores = ds.read(1, window=((r0, r1), (c0, c1)), masked=True)
    if valores.count() != valores.size:
        return None
    izq = ds.transform.c + np.arange(c0, c1) * res
    arr = ds.transform.f - np.arange(r0, r1) * res
    peso_x = np.clip(np.minimum(izq + res, x1) - np.maximum(izq, x0), 0, None)
    peso_y = np.clip(np.minimum(arr, y1) - np.maximum(arr - res, y0), 0, None)
    pesos = np.outer(peso_y, peso_x)
    return float((valores.filled(0) * pesos).sum() / pesos.sum())


def comprueba_muestras(rutas: list[Path], alturas: np.ndarray, zona, paso: float, h_base: float) -> float:
    """Compara vértices del terreno con la media ponderada de los píxeles originales de su celda."""
    minx, _, _, maxy = zona
    filas, columnas = alturas.shape
    rng = np.random.default_rng(1)
    puntos = [(0, 0), (0, columnas - 1), (filas - 1, 0), (filas - 1, columnas - 1), (filas // 2, columnas // 2)]
    puntos += [(int(rng.integers(filas)), int(rng.integers(columnas))) for _ in range(15)]
    max_dif = 0.0
    for fila, col in puntos:
        e, n = minx + col * paso, maxy - fila * paso
        celda = (e - paso / 2, n - paso / 2, e + paso / 2, n + paso / 2)
        for ruta in rutas:
            with rasterio.open(ruta) as ds:
                b = ds.bounds
                if not (b.left <= celda[0] and celda[2] <= b.right and b.bottom <= celda[1] and celda[3] <= b.top):
                    continue
                media = media_ponderada(ds, celda)
                if media is not None:
                    max_dif = max(max_dif, abs(media - (float(alturas[fila, col]) + h_base)))
                break
    return max_dif


# ----------------------------------------------------------------------------- main
def main() -> int:
    config = cargar_config()
    raw, processed = dir_raw(config), dir_processed(config)
    dir_terreno = dir_assets(config) / "terrain"
    for carpeta in (processed, dir_previews(config), dir_terreno):
        carpeta.mkdir(parents=True, exist_ok=True)

    zona = lee_zona(config)
    minx, miny, maxx, maxy = zona
    ancho, alto = maxx - minx, maxy - miny
    e_centro, n_centro = (minx + maxx) / 2, (miny + maxy) / 2
    res_obj = float(config["terrain_resolution_m"])
    columnas, filas, paso, nota_rejilla = elige_rejilla(ancho, alto, res_obj)
    margen = max(4.0, paso)

    print(f"Zona: {ancho:g} × {alto:g} m · centro E {e_centro:.2f} N {n_centro:.2f}")
    print(f"Rejilla del terreno: {nota_rejilla}")

    # --- Mosaico con margen (para remuestrear los bordes) y recorte exacto a la zona
    con_margen = (minx - margen, miny - margen, maxx + margen, maxy + margen)
    rutas_mdt, rutas_mds = rasteres(raw / "mdt"), rasteres(raw / "mds")
    print("Mosaicando MDT y MDS…")
    mdt_m, tr_m, res = mosaico("MDT", rutas_mdt, con_margen)
    mds_m, tr_s, res_s = mosaico("MDS", rutas_mds, con_margen)
    if tr_m != tr_s or mdt_m.shape != mds_m.shape:
        falla("MDT y MDS no comparten rejilla; no se puede calcular MDS − MDT píxel a píxel.")

    zona_rejilla = ajusta_a_rejilla(zona, tr_m.c, tr_m.f, res)
    if any(abs(a - b) > 1e-6 for a, b in zip(zona_rejilla, zona)):
        print(f"  Aviso: la zona no cae en la rejilla de {res:g} m; el recorte se amplía a {zona_rejilla}")
    mdt_zona, tr_zona = recorte(mdt_m, tr_m, res, zona_rejilla)
    mds_zona, _ = recorte(mds_m, tr_m, res, zona_rejilla)

    sin_mdt = int((~np.isfinite(mdt_zona)).sum())
    sin_mds = int((~np.isfinite(mds_zona)).sum())
    if sin_mdt == mdt_zona.size:
        falla("El MDT no tiene ningún dato dentro de la zona.")
    h_base = round(float(np.nanmin(mdt_zona)), 3)
    print(f"H_base (mínimo del MDT {res:g} m en la zona): {h_base:.3f} m")

    # --- Relleno de huecos del MDT (el terreno no puede tener agujeros)
    mdt_m, rellenos = rellena("MDT", mdt_m, res)
    mdt_zona, _ = recorte(mdt_m, tr_m, res, zona_rejilla)
    print(f"Píxeles sin dato en la zona: MDT {sin_mdt:,} (rellenados por interpolación), "
          f"MDS {sin_mds:,} (se dejan sin dato)")

    # --- Recortes nativos
    ndsm = mds_zona - mdt_zona
    guarda_tif(processed / "mdt_clip.tif", mdt_zona, tr_zona,
               f"MDT {res:g} m recortado a la zona; {sin_mdt} px rellenados por interpolación")
    guarda_tif(processed / "mds_clip.tif", mds_zona, tr_zona, f"MDS {res:g} m recortado a la zona")
    guarda_tif(processed / "ndsm.tif", ndsm, tr_zona, "MDS − MDT (m)")
    validos = ndsm[np.isfinite(ndsm)]
    p50, p90, p99 = np.percentile(validos, [50, 90, 99])
    print(f"nDSM: mín {validos.min():.2f} · p50 {p50:.2f} · p90 {p90:.2f} · p99 {p99:.2f} · máx {validos.max():.2f} m "
          f"· píxeles < −0,5 m: {(validos < -0.5).sum():,}")

    # --- Terreno remuestreado: cada vértice es la media de los píxeles de su celda
    alturas = np.full((filas, columnas), NODATA, dtype="float32")
    reproject(source=mdt_m, destination=alturas, src_transform=tr_m, src_crs=CRS,
              dst_transform=from_origin(minx - paso / 2, maxy + paso / 2, paso, paso), dst_crs=CRS,
              src_nodata=NODATA, dst_nodata=NODATA, resampling=Resampling.average)
    if (alturas == NODATA).any() or not np.isfinite(alturas).all():
        falla("El remuestreo dejó vértices sin dato.")
    alturas -= np.float32(h_base)

    alturas.astype("<f4").tofile(dir_terreno / "terrain.f32")
    meta = {
        "filas": filas,
        "columnas": columnas,
        "paso_m": paso,
        "tamaño_x_m": ancho,
        "tamaño_z_m": alto,
        "altura_min": round(float(alturas.min()), 3),
        "altura_max": round(float(alturas.max()), 3),
        "formato": "Float32 little-endian; filas de norte a sur, cada fila de oeste a este",
        "vertice_0": {"x": -ancho / 2, "z": -alto / 2, "nota": "esquina noroeste en coordenadas locales"},
        "H_base": h_base,
        "rejilla": nota_rejilla,
    }
    (dir_terreno / "terrain.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    origin = {
        "E_centro": e_centro,
        "N_centro": n_centro,
        "H_base": h_base,
        "ancho": ancho,
        "alto": alto,
        "crs": CRS,
        "E_min": minx, "E_max": maxx, "N_min": miny, "N_max": maxy,
        "convencion": "1 unidad = 1 m; x = E − E_centro; z = −(N − N_centro) (norte = −Z); y = altura − H_base",
        "H_base_origen": f"mínimo del MDT a {res:g} m dentro de la zona",
    }
    ruta_origin(config).write_text(json.dumps(origin, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    guarda_relieve(alturas, paso, dir_previews(config) / "relieve.png", h_base)

    dif = comprueba_muestras(rutas_mdt, alturas, zona, paso, h_base)
    print(f"Comprobación de 20 vértices contra el MDT original: diferencia máxima {dif * 100:.2f} cm")
    if dif > 0.01:
        falla("El terreno no coincide con el MDT original (posible desplazamiento de rejilla).")

    tam = (dir_terreno / "terrain.f32").stat().st_size / 1_048_576
    print("\nSalidas:")
    print(f"  {ruta_origin(config)}")
    print(f"  {dir_terreno / 'terrain.f32'} ({tam:.1f} MB) y terrain.json — {filas}×{columnas}, "
          f"alturas {meta['altura_min']}–{meta['altura_max']} m sobre H_base")
    print(f"  {processed / 'mdt_clip.tif'}, mds_clip.tif, ndsm.tif ({mdt_zona.shape[1]}×{mdt_zona.shape[0]} px)")
    print(f"  {dir_previews(config) / 'relieve.png'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
