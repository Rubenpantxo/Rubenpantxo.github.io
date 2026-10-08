"""Paso R1.4a — Mapa de vegetación baja (césped, hierba y rastrojo) a 1 m.

Para cada metro cuadrado de la zona:
- verde: césped o hierba verde = verde en la ortofoto (índice 2G − R − B) y sin nada alto
  encima en el LiDAR (nDSM < 1,2 m).
- seco: cereal, rastrojo o hierba seca = tono pajizo y claro en la ortofoto, fuera del casco,
  polígonos industriales y obras (usos de OSM).
Nunca sobre edificios, calles (con sus aceras), caminos ni agua.

El juego (src/escena/hierba.js) siembra mechones en 3D solo cerca de la cámara, con la
densidad de este mapa y el color de la ortofoto en ese punto.

Requiere 02_ortho.py (y 07: ortofoto sin coches), 03_buildings.py, 04_osm.py y 08_arboles.py.

Salidas:
    <assets>/vegetacion/densidad.jpg   R = verde, G = seco (0–255), fila 0 = norte (z = −alto/2)
    <assets>/vegetacion/color.jpg      color de la ortofoto a 1 m
    <assets>/vegetacion/vegetacion.json  {paso_m, columnas, filas, x0, z0}
    <processed>/previews/vegetacion.jpg

Uso: conda run -n cabdrive python tools/08b_vegetacion_baja.py
"""
from __future__ import annotations

import importlib
import json
import sys

import numpy as np
import rasterio
from affine import Affine
from PIL import Image
from rasterio.features import rasterize
from rasterio.warp import Resampling, reproject
from scipy import ndimage
from shapely.geometry import shape

from comun import cargar_config, cargar_origin, dir_assets, dir_previews, dir_processed

PASO_M = 1.0
NDSM_MAX_M = 1.2
VERDOR = (0.015, 0.07)            # de 0 a densidad plena
AMARILLEZ = (0.04, 0.09)
BRILLO_SECO = (115, 150)        # los labrados oscuros quedan fuera
ACERA_M = 1.8                     # además de la media calzada
CAMINO_M = 1.5
USOS_SIN_SECO = {"residential", "industrial", "construction", "farmyard", "cemetery"}


def rampa(v, a, b):
    return np.clip((v - a) / (b - a), 0, 1)


def main() -> int:
    config = cargar_config()
    origin = cargar_origin(config)
    processed, assets, previews = dir_processed(config), dir_assets(config), dir_previews(config)
    salida = assets / "vegetacion"
    salida.mkdir(parents=True, exist_ok=True)
    arboles = importlib.import_module("08_arboles")

    columnas, filas = int(origin["ancho"] / PASO_M), int(origin["alto"] / PASO_M)
    # Rejilla local → píxel: columna = (x + ancho/2)/paso, fila = (z + alto/2)/paso
    local = Affine(PASO_M, 0, -origin["ancho"] / 2, 0, PASO_M, -origin["alto"] / 2)
    utm = Affine(PASO_M, 0, origin["E_min"], 0, -PASO_M, origin["N_max"])

    orto = np.zeros((3, filas, columnas), np.float32)
    fuente = processed / ("orto_limpia.tif" if (processed / "orto_limpia.tif").is_file() else "orto_mosaico.tif")
    with rasterio.open(fuente) as ds:
        for b in range(3):
            reproject(ds.read(b + 1).astype(np.float32), orto[b], src_transform=ds.transform, src_crs=ds.crs,
                      dst_transform=utm, dst_crs=ds.crs, resampling=Resampling.average)
    ndsm = np.zeros((filas, columnas), np.float32)
    with rasterio.open(processed / "ndsm.tif") as ds:
        reproject(ds.read(1, masked=True).filled(0), ndsm, src_transform=ds.transform, src_crs=ds.crs,
                  dst_transform=utm, dst_crs=ds.crs, resampling=Resampling.max)
    r, g, b = orto
    suma = r + g + b + 1
    verdor = (2 * g - r - b) / suma
    amarillez = ((r + g) / 2 - b) / suma
    brillo = suma / 3

    def capa(nombre):
        return json.loads((assets / nombre).read_text(encoding="utf-8"))["features"]

    def mascara(formas):
        formas = [(f, 1) for f in formas if not f.is_empty]
        if not formas:
            return np.zeros((filas, columnas), bool)
        return rasterize(formas, out_shape=(filas, columnas), transform=local, fill=0, dtype="uint8") > 0

    fuera = mascara([shape(f["geometry"]).buffer(0.5) for f in capa("buildings.geojson")])
    fuera |= mascara([shape(f["geometry"]).buffer(arboles.MEDIA_CALZADA_M.get(f["properties"].get("tipo"), 3.0) + ACERA_M)
                      for f in capa("osm/calles.geojson")])
    fuera |= mascara([shape(f["geometry"]).buffer(CAMINO_M) for f in capa("osm/caminos.geojson")])
    fuera |= mascara([shape(f["geometry"]).buffer(1.0) for f in capa("osm/agua.geojson")])
    sin_seco = mascara([shape(f["geometry"]) for f in capa("osm/usos.geojson")
                        if f["properties"].get("tipo") in USOS_SIN_SECO])

    bajo = ndsm < NDSM_MAX_M
    verde = rampa(verdor, *VERDOR) * bajo * ~fuera
    seco = rampa(amarillez, *AMARILLEZ) * rampa(brillo, *BRILLO_SECO) * (1 - rampa(verdor, *VERDOR)) * bajo
    seco *= ~fuera & ~sin_seco
    verde = ndimage.uniform_filter(verde, 3)
    seco = ndimage.uniform_filter(seco, 3)

    densidad = np.dstack([verde * 255, seco * 255, np.zeros_like(verde)]).astype(np.uint8)
    Image.fromarray(densidad).save(salida / "densidad.jpg", quality=92)   # es suave: JPEG basta
    color = np.clip(np.moveaxis(orto, 0, -1), 0, 255).astype(np.uint8)
    Image.fromarray(color).save(salida / "color.jpg", quality=85)
    (salida / "vegetacion.json").write_text(json.dumps({
        "paso_m": PASO_M, "columnas": columnas, "filas": filas,
        "x0": -origin["ancho"] / 2, "z0": -origin["alto"] / 2,
        "canales": {"R": "césped / hierba verde", "G": "cereal, rastrojo o hierba seca"},
    }, ensure_ascii=False, indent=1), encoding="utf-8")

    vista = color.astype(np.float32) * 0.55
    vista[..., 1] += verde * 120
    vista[..., 0] += seco * 140
    vista[..., 1] += seco * 110
    Image.fromarray(np.clip(vista, 0, 255).astype(np.uint8)).save(previews / "vegetacion.jpg", quality=85)
    print(f"Césped/hierba verde: {verde.sum() / 1e4:.1f} ha equivalentes · seco: {seco.sum() / 1e4:.1f} ha")
    print(f"→ {salida}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
