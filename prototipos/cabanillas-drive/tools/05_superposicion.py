"""Cierre de la fase 1 — superposición de edificios y calles sobre la ortofoto.

Sirve para comprobar que todas las capas están alineadas entre sí.

Salidas:
    <processed>/previews/superposicion.png          zona completa a 2 px/m
    <processed>/previews/superposicion_detalle.png  400 × 400 m alrededor del origen a 4 px/m

Uso: conda run -n cabdrive python tools/05_superposicion.py
"""
from __future__ import annotations

import json
import sys

import numpy as np
import rasterio
from PIL import Image

from comun import cargar_config, cargar_origin, dir_assets, dir_previews, dir_processed
from previews import Lienzo

LADO_DETALLE_M = 400


def carga(ruta):
    return json.loads(ruta.read_text(encoding="utf-8"))["features"]


def dibuja(lienzo: Lienzo, edificios, calles, caminos, grosor: int) -> None:
    for f in edificios:
        lienzo.geometria(f["geometry"], borde=(0, 255, 255, 255), relleno=(0, 255, 255, 45), ancho=grosor)
    for f in caminos:
        lienzo.geometria(f["geometry"], borde=(255, 150, 40, 255), ancho=grosor)
    for f in calles:
        lienzo.geometria(f["geometry"], borde=(255, 230, 0, 255), ancho=grosor + 1)


def main() -> int:
    config = cargar_config()
    origin = cargar_origin(config)
    assets = dir_assets(config)
    previews = dir_previews(config)
    edificios = carga(assets / "buildings.geojson")
    calles = carga(assets / "osm" / "calles.geojson")
    caminos = carga(assets / "osm" / "caminos.geojson")

    with rasterio.open(dir_processed(config) / "orto_mosaico.tif") as ds:
        orto = Image.fromarray(np.moveaxis(ds.read(), 0, -1))

    lienzo = Lienzo(origin, 2, fondo=orto)
    dibuja(lienzo, edificios, calles, caminos, 1)
    lienzo.rotulo(["Superposicion: Catastro + OSM sobre PNOA · 2 px/m"],
                  leyenda=[("edificios (Catastro)", (0, 255, 255)), ("calles (OSM)", (255, 230, 0)),
                           ("caminos (OSM)", (255, 150, 40))])
    lienzo.guarda(previews / "superposicion.png")

    # Detalle centrado en el origen (el casco) a más resolución
    px_m = orto.width / origin["ancho"]
    mitad = LADO_DETALLE_M / 2
    caja = tuple(round(v * px_m) for v in (origin["ancho"] / 2 - mitad, origin["alto"] / 2 - mitad,
                                            origin["ancho"] / 2 + mitad, origin["alto"] / 2 + mitad))
    sub_origin = {"ancho": LADO_DETALLE_M, "alto": LADO_DETALLE_M}
    detalle = Lienzo(sub_origin, px_m, fondo=orto.crop(caja))
    dibuja(detalle, edificios, calles, caminos, 2)
    detalle.rotulo([f"Detalle {LADO_DETALLE_M} x {LADO_DETALLE_M} m alrededor del origen · {px_m:g} px/m"],
                   leyenda=[("edificios", (0, 255, 255)), ("calles", (255, 230, 0)), ("caminos", (255, 150, 40))])
    detalle.guarda(previews / "superposicion_detalle.png")

    print(f"Salidas:\n  {previews / 'superposicion.png'}\n  {previews / 'superposicion_detalle.png'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
