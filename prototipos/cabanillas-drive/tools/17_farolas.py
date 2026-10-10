"""Paso F8 — Farolas del alumbrado público.

OpenStreetMap no tiene farolas en Cabanillas y el plano de alumbrado del Ayuntamiento solo
cubre la unidad UE5. Se sacan del LiDAR y se completan así:
1. Detectadas (f: lidar): en el nDSM (0,5 m) manchas de 3,5–12 m de alto y como mucho 4 píxeles
   (1 m²), aisladas (casi nada alto alrededor: no es un árbol ni un tejado), que no son verde en
   la ortofoto, a menos de 3,5 m del borde de la calzada y fuera de los edificios. Las de menos de
   2 m entre sí se juntan. La altura es la medida.
2. Completadas (f: estimada): en cada calle del casco con al menos dos detectadas se mide la
   separación habitual entre ellas (mediana, entre 15 y 40 m) y se rellenan los huecos de más de
   1,6 veces esa separación, en el mismo lado que la detectada más próxima. Las calles del casco
   sin ninguna detectada llevan una cada 25 m al tresbolillo (el LiDAR no ve las de pared).
Rumbo: hacia el eje de la calle (el brazo vuela sobre la calzada).

Salida: <assets>/farolas.json {farolas: [{x, z, h, rumbo, f}]}

Uso: conda run -n cabdrive python tools/17_farolas.py
"""
from __future__ import annotations

import importlib
import json
import math
import sys

import geopandas as gpd
import numpy as np
import shapely
from scipy import ndimage
from shapely.geometry import Point, shape
from shapely.ops import transform as transforma, unary_union

from comun import busca_capa, cargar_config, cargar_origin, dir_assets, dir_processed, dir_raw

ALTO_MIN, ALTO_MAX = 3.5, 12.0
PIXELES_MAX = 4
JUNTA_M = 2.0
DESDE_BORDE_M = 3.5
SEPARACION_POR_DEFECTO_M = 25.0
SEPARACION_LIMITES = (15.0, 40.0)
HUECO_FACTOR = 1.6
ALTO_ESTIMADA_M = 4.5
MEDIA = {"primary": 4.0, "primary_link": 3.5, "secondary": 4.0, "tertiary": 3.5, "residential": 3.0,
         "unclassified": 3.0, "living_street": 2.5}


def r2(v):
    return round(float(v), 2)


def main() -> int:
    config = cargar_config()
    origin = cargar_origin(config)
    assets = dir_assets(config)
    ndsm, orto, tr = importlib.import_module("08_arboles").lee_rasters(dir_processed(config))
    r, g, b = (orto[..., i].astype(np.float32) for i in range(3))
    verde = (2 * g - r - b) / (r + g + b + 1) > 0.06

    candidato = (ndsm > ALTO_MIN) & (ndsm < ALTO_MAX)
    etiquetas, n = ndimage.label(candidato)
    tamanos = ndimage.sum(candidato, etiquetas, range(1, n + 1))
    pequenas = np.isin(etiquetas, np.where(tamanos <= PIXELES_MAX)[0] + 1)
    alrededor = ndimage.uniform_filter((ndsm > 2.0).astype(np.float32), 7)
    filas, cols = np.nonzero(pequenas & (alrededor < 0.15) & ~verde)
    e = tr.c + (cols + 0.5) * tr.a
    nn = tr.f + (filas + 0.5) * tr.e
    xs, zs, hs = e - origin["E_centro"], -(nn - origin["N_centro"]), ndsm[filas, cols]

    calles = [f for f in json.loads((assets / "osm" / "calles.geojson").read_text(encoding="utf-8"))["features"]
              if f["properties"].get("tipo") in MEDIA]
    lineas = [shape(f["geometry"]) for f in calles]
    medias = [MEDIA[f["properties"]["tipo"]] for f in calles]
    franja = unary_union([l.buffer(m + DESDE_BORDE_M) for l, m in zip(lineas, medias)])
    calzada = unary_union([l.buffer(m, cap_style="flat") for l, m in zip(lineas, medias)])
    edificios = unary_union([shape(f["geometry"]) for f in
                             json.loads((assets / "buildings.geojson").read_text(encoding="utf-8"))["features"]])
    ok = shapely.contains_xy(franja, xs, zs) & ~shapely.contains_xy(edificios.buffer(0.6), xs, zs) & \
        ~shapely.contains_xy(calzada, xs, zs)
    orden = np.argsort(-hs[ok])
    detectadas = []
    for x, z, h in zip(xs[ok][orden], zs[ok][orden], hs[ok][orden]):
        if all(math.hypot(x - d[0], z - d[1]) > JUNTA_M for d in detectadas):
            detectadas.append((float(x), float(z), float(h)))
    print(f"Detectadas en el LiDAR: {len(detectadas)}")

    a_local = lambda e_, n_, z_=None: (e_ - origin["E_centro"], -(n_ - origin["N_centro"]))  # noqa: E731
    capa_casco = busca_capa(dir_raw(config) / "catastro", "CATASTPolCascoUrbano")
    casco = unary_union([transforma(a_local, g_) for g_ in gpd.read_file(capa_casco[0]).geometry if g_ is not None])

    farolas = []
    indice = shapely.STRtree(lineas)

    def rumbo_a_calle(x, z, linea):
        q = linea.interpolate(linea.project(Point(x, z)))
        return math.atan2(q.x - x, q.y - z)

    for x, z, h in detectadas:
        i = indice.nearest(Point(x, z))
        farolas.append({"x": r2(x), "z": r2(z), "h": r2(h), "rumbo": r2(rumbo_a_calle(x, z, lineas[i])), "f": "lidar"})

    # Completar por calles del casco
    por_calle = {}
    for x, z, h in detectadas:
        por_calle.setdefault(int(indice.nearest(Point(x, z))), []).append((x, z, h))
    estimadas = 0
    for i, (linea, media) in enumerate(zip(lineas, medias)):
        dentro = linea.intersection(casco)
        if dentro.is_empty or dentro.length < 15:
            continue
        propias = sorted(por_calle.get(i, []), key=lambda p: linea.project(Point(p[0], p[1])))
        d_propias = [linea.project(Point(p[0], p[1])) for p in propias]
        if len(propias) >= 2:
            sep = float(np.clip(np.median(np.diff(d_propias)) if len(propias) > 2 else d_propias[-1] - d_propias[0],
                                *SEPARACION_LIMITES))
        else:
            sep = SEPARACION_POR_DEFECTO_M
        alto = float(np.median([p[2] for p in propias])) if propias else ALTO_ESTIMADA_M
        # Puestos cada «sep» en fase con las detectadas; se ocupan los que no tienen una cerca
        largo = linea.length
        fase = (d_propias[0] % sep) if propias else sep / 2
        d = fase
        while d < largo - sep / 3:
            libre = all(abs(d - dp) > sep * 0.5 for dp in d_propias)
            p = linea.interpolate(d)
            d += sep
            if not libre or not casco.contains(p):
                continue
            dd = linea.project(p)
            # Lado: el de la detectada más próxima; sin ninguna, al tresbolillo
            p2 = linea.interpolate(min(largo, dd + 0.5))
            p1 = linea.interpolate(max(0.0, dd - 0.5))
            tx, tz = p2.x - p1.x, p2.y - p1.y
            lt = math.hypot(tx, tz) or 1
            nx, nz = -tz / lt, tx / lt
            if propias:
                cerca = min(propias, key=lambda q: math.hypot(q[0] - p.x, q[1] - p.y))
                lado = 1 if (cerca[0] - p.x) * nx + (cerca[1] - p.y) * nz > 0 else -1
            else:
                lado = 1 if int(dd / sep) % 2 == 0 else -1
            off = media + 0.6
            x, z = p.x + nx * lado * off, p.y + nz * lado * off
            if edificios.contains(Point(x, z)):
                off = media + 0.25            # acera estrecha: farola de pared
                x, z = p.x + nx * lado * off, p.y + nz * lado * off
            if any(math.hypot(x - f["x"], z - f["z"]) < sep * 0.6 for f in farolas):
                continue
            farolas.append({"x": r2(x), "z": r2(z), "h": r2(alto), "rumbo": r2(math.atan2(-nx * lado, -nz * lado)),
                            "f": "estimada"})
            estimadas += 1
    (assets / "farolas.json").write_text(json.dumps({
        "sistema": "local: x este, z sur (m); h = altura (m); rumbo = atan2(dx, dz) hacia la calle",
        "fuentes": "LiDAR PNOA 2024 (nDSM) y ortofoto PNOA; huecos completados por calle (f: estimada)",
        "farolas": farolas}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Farolas: {len(farolas)} ({len(detectadas)} del LiDAR, {estimadas} estimadas)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
