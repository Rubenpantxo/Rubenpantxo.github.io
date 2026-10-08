"""Paso 1.6 — Aspecto individual de los edificios.

- Atlas de tejados: recorta de la ortofoto el rectángulo de cada edificio y los empaqueta
  en una sola imagen, para texturizar cada tejado con su foto real.
- Fachadas a la calle: lados del anillo exterior (no medianeros) con una calle de OSM
  delante. Ahí el juego pone puertas y portones de garaje.

Requiere 02_ortho.py, 03_buildings.py y 04_osm.py.

Salidas:
    <assets>/tejados.jpg
    <assets>/edificios_aspecto.json  {id: {"uv": [u0, v0, u1, v1], "calle": [lados]}}
        uv: rectángulo del bbox de la huella en el atlas (v = 1 arriba, como Three.js con flipY)

Uso: conda run -n cabdrive python tools/06_aspecto.py
"""
from __future__ import annotations

import json
import math
import sys

import numpy as np
import rasterio
from PIL import Image
from shapely import STRtree
from shapely.geometry import Point, shape

from comun import cargar_config, cargar_origin, dir_assets, dir_previews, dir_processed

ANCHO_ATLAS = 4096
ALTO_MAX_ATLAS = 4096
MARGEN_PX = 2
DIST_CALLE_M = 10.0      # eje de la calle como mucho a esta distancia de la fachada
SONDA_M = 3.0            # la calle tiene que estar delante (en la dirección de la normal)


def empaqueta(tamanos: list[tuple[int, int]], ancho: int) -> tuple[list[tuple[int, int]], int]:
    """Empaquetado por estantes, de más alto a más bajo. Devuelve posiciones y alto usado."""
    orden = sorted(range(len(tamanos)), key=lambda i: -tamanos[i][1])
    posiciones = [None] * len(tamanos)
    x = y = alto_estante = 0
    for i in orden:
        w, h = tamanos[i]
        if x + w > ancho:
            x, y = 0, y + alto_estante
            alto_estante = 0
        posiciones[i] = (x, y)
        x += w
        alto_estante = max(alto_estante, h)
    return posiciones, y + alto_estante


def main() -> int:
    config = cargar_config()
    origin = cargar_origin(config)
    assets = dir_assets(config)
    edificios = json.loads((assets / "buildings.geojson").read_text(encoding="utf-8"))["features"]
    calles = json.loads((assets / "osm" / "calles.geojson").read_text(encoding="utf-8"))["features"]

    with rasterio.open(dir_processed(config) / "orto_mosaico.tif") as ds:
        orto = np.moveaxis(ds.read(), 0, -1)
    px_m = orto.shape[1] / origin["ancho"]

    # --- Rectángulos de cada tejado en la ortofoto, con escala que quepa en el atlas
    cajas = []
    for f in edificios:
        x0, z0, x1, z1 = shape(f["geometry"]).bounds
        cajas.append((x0, z0, x1, z1))
    escala = 1.0
    while True:
        s = px_m * escala
        tamanos = [(math.ceil((x1 - x0) * s) + 2 * MARGEN_PX, math.ceil((z1 - z0) * s) + 2 * MARGEN_PX)
                   for x0, z0, x1, z1 in cajas]
        posiciones, alto_usado = empaqueta(tamanos, ANCHO_ATLAS)
        if alto_usado <= ALTO_MAX_ATLAS:
            break
        escala *= 0.9
    alto_atlas = min(ALTO_MAX_ATLAS, 1 << math.ceil(math.log2(max(alto_usado, 1))))
    s = px_m * escala
    print(f"Atlas de tejados: {len(cajas)} tejados a {s:g} px/m en {ANCHO_ATLAS}×{alto_atlas} px "
          f"({alto_usado / alto_atlas:.0%} de alto ocupado)")

    atlas = Image.new("RGB", (ANCHO_ATLAS, alto_atlas), (90, 80, 70))
    # Bordes repetidos para que el margen de los edificios de la orilla no se salga
    relleno = 8
    imagen_orto = Image.fromarray(np.pad(orto, ((relleno, relleno), (relleno, relleno), (0, 0)), mode="edge"))
    aspecto = {}
    for f, (x0, z0, x1, z1), (w, h), (ax, ay) in zip(edificios, cajas, tamanos, posiciones):
        # Recorte de la ortofoto (en sus px) con margen, remuestreado al tamaño del atlas
        margen_m = MARGEN_PX / s
        caja_orto = tuple((v + o) * px_m + relleno for v, o in zip(
            (x0 - margen_m, z0 - margen_m, x1 + margen_m, z1 + margen_m),
            (origin["ancho"] / 2, origin["alto"] / 2, origin["ancho"] / 2, origin["alto"] / 2)))
        trozo = imagen_orto.resize((w, h), Image.LANCZOS, box=caja_orto)
        atlas.paste(trozo, (ax, ay))
        u0 = (ax + MARGEN_PX) / ANCHO_ATLAS
        u1 = (ax + w - MARGEN_PX) / ANCHO_ATLAS
        v0 = 1 - (ay + MARGEN_PX) / alto_atlas        # borde norte (z0) arriba
        v1 = 1 - (ay + h - MARGEN_PX) / alto_atlas    # borde sur (z1)
        aspecto[str(f["properties"]["id"])] = {"uv": [round(u0, 6), round(v0, 6), round(u1, 6), round(v1, 6)]}

    calidad = int(config.get("ortho_jpeg_quality", 85))
    atlas.save(assets / "tejados.jpg", quality=calidad, optimize=True, progressive=True)
    atlas.resize((ANCHO_ATLAS // 4, alto_atlas // 4), Image.LANCZOS).save(dir_previews(config) / "tejados.jpg",
                                                                           quality=85)

    # --- Fachadas a la calle
    lineas = [shape(c["geometry"]) for c in calles]
    arbol = STRtree(lineas)
    total = 0
    for f in edificios:
        anillo = f["geometry"]["coordinates"][0]
        medianeras = set(f["properties"].get("medianeras", []))
        a_calle = []
        for lado in range(len(anillo) - 1):
            if lado in medianeras:
                continue
            (x0, z0), (x1, z1) = anillo[lado], anillo[lado + 1]
            largo = math.hypot(x1 - x0, z1 - z0)
            if largo < 2.0:
                continue
            # Exterior CCW en el plano (x, z): la normal exterior es la derecha del lado
            nx, nz = (z1 - z0) / largo, -(x1 - x0) / largo
            medio = Point((x0 + x1) / 2, (z0 + z1) / 2)
            delante = Point(medio.x + nx * SONDA_M, medio.y + nz * SONDA_M)
            cercana = arbol.nearest(medio)
            d_medio = lineas[cercana].distance(medio)
            if d_medio <= DIST_CALLE_M and lineas[cercana].distance(delante) < d_medio:
                a_calle.append(lado)
        aspecto[str(f["properties"]["id"])]["calle"] = a_calle
        total += len(a_calle)

    salida = {"atlas": "tejados.jpg", "px_por_m": round(s, 4), "edificios": aspecto}
    (assets / "edificios_aspecto.json").write_text(json.dumps(salida, separators=(",", ":")), encoding="utf-8")
    con_calle = sum(1 for a in aspecto.values() if a["calle"])
    print(f"Fachadas a la calle: {total} lados en {con_calle} edificios")
    print(f"\nSalidas:\n  {assets / 'tejados.jpg'} ({(assets / 'tejados.jpg').stat().st_size / 1_048_576:.1f} MB)\n"
          f"  {assets / 'edificios_aspecto.json'}\n  {dir_previews(config) / 'tejados.jpg'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
