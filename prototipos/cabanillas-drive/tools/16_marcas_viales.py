"""Paso F7 — Marcas viales y bordillos: lo que la ortofoto deja borroso a ras de suelo.

Todo sale de <raw>/osm_extra/zona.osm (04b_osm_inventario.py) y de elementos.json (señales):
- Pasos de cebra: vías footway=crossing marcadas (crossing distinto de «unmarked»). Las franjas
  ocupan el tramo de la senda que cae dentro de la calzada (calle con su media calzada).
- Ejes: línea discontinua en el centro de las carreteras y calles principales de doble sentido
  (primary, primary_link, secondary, tertiary). Bordes continuos en la carretera (primary).
- Líneas de detención: en cada STOP (continua) o ceda el paso (discontinua), de la mitad de la
  calzada al bordillo del lado de la señal, a la altura del nodo de OSM.
- Bordillos: contorno de la calzada de las calles del casco (a menos de 25 m de un edificio del
  Catastro), donde empieza la acera. Las medias calzadas son las del resto del pipeline.

Salida: <assets>/osm/marcas.json (coordenadas locales [x, z])

Uso: conda run -n cabdrive python tools/16_marcas_viales.py
"""
from __future__ import annotations

import importlib
import json
import math
import sys

from shapely import STRtree
from shapely.geometry import LineString, MultiLineString, Point, shape
from shapely.ops import nearest_points, unary_union

from comun import cargar_config, cargar_origin, dir_assets, dir_raw

elementos = importlib.import_module("15_osm_elementos")
MEDIA = elementos.MEDIA_CALZADA_M
CON_EJE = {"primary", "primary_link", "secondary", "tertiary"}
CON_BORDE = {"primary"}
CON_BORDILLO = {"residential", "living_street", "unclassified", "tertiary", "secondary", "primary", "primary_link", "service"}
CRUCES_SIN_MARCA = {"unmarked", "no"}
DIST_CASCO_M = 25.0
MIN_PASO_M = 2.0


def r2(v):
    return round(float(v), 2)


def lineas(geom):
    if geom.is_empty:
        return []
    if isinstance(geom, LineString):
        return [geom]
    if isinstance(geom, MultiLineString):
        return list(geom.geoms)
    return [g for g in getattr(geom, "geoms", []) if isinstance(g, LineString)]


def coords(linea, paso=None):
    if paso:
        n = max(1, int(math.ceil(linea.length / paso)))
        linea = LineString([linea.interpolate(i / n, normalized=True) for i in range(n + 1)])
    return [[r2(x), r2(z)] for x, z in linea.coords]


def main() -> int:
    config = cargar_config()
    origin = cargar_origin(config)
    assets = dir_assets(config)
    ruta = dir_raw(config) / "osm_extra" / "zona.osm"
    if not ruta.is_file():
        print("Falta data/raw/osm_extra/zona.osm: ejecuta antes tools/04b_osm_inventario.py")
        return 1
    a_local = lambda e, n: (e - origin["E_centro"], -(n - origin["N_centro"]))  # noqa: E731
    nodos, etq, vias = elementos.lee_osm(ruta, a_local)
    zona = shape({"type": "Polygon", "coordinates": [[
        [-origin["ancho"] / 2, -origin["alto"] / 2], [origin["ancho"] / 2, -origin["alto"] / 2],
        [origin["ancho"] / 2, origin["alto"] / 2], [-origin["ancho"] / 2, origin["alto"] / 2]]]})

    calles = []
    for v in vias:
        tipo = v["tags"].get("highway")
        if tipo in MEDIA and tipo != "track" and len(v["refs"]) >= 2:
            calles.append({"tags": v["tags"], "tipo": tipo, "refs": v["refs"],
                           "linea": LineString([nodos[r] for r in v["refs"]]), "media": MEDIA[tipo]})
    calzadas = [c["linea"].buffer(c["media"], cap_style="flat") for c in calles]
    calzada = unary_union(calzadas)

    edificios = [shape(f["geometry"]) for f in json.loads((assets / "buildings.geojson").read_text(encoding="utf-8"))["features"]]
    casco = unary_union([e.buffer(DIST_CASCO_M) for e in edificios])

    # --- Pasos de cebra
    pasos = []
    for v in vias:
        t = v["tags"]
        if t.get("footway") != "crossing" or t.get("crossing") in CRUCES_SIN_MARCA or len(v["refs"]) < 2:
            continue
        senda = LineString([nodos[r] for r in v["refs"]])
        for tramo in lineas(senda.intersection(calzada)):
            if tramo.length < MIN_PASO_M:
                continue
            (x0, z0), (x1, z1) = tramo.coords[0], tramo.coords[-1]
            c = tramo.interpolate(0.5, normalized=True)
            pasos.append({"x": r2(c.x), "z": r2(c.y), "dx": r2((x1 - x0) / tramo.length), "dz": r2((z1 - z0) / tramo.length),
                          "largo": r2(tramo.length)})

    # --- Ejes y bordes
    ejes, bordes = [], []
    for c in calles:
        doble = c["tags"].get("oneway") not in ("yes", "1", "-1")
        dentro = c["linea"].intersection(zona)
        if c["tipo"] in CON_EJE and doble:
            ejes += [coords(l, 2.0) for l in lineas(dentro) if l.length > 4]
        if c["tipo"] in CON_BORDE:
            for lado in (-1, 1):
                d = lado * (c["media"] - 0.25)
                ejes_borde = c["linea"].offset_curve(d)
                bordes += [coords(l, 2.0) for l in lineas(ejes_borde.intersection(zona)) if l.length > 4]

    # --- Líneas de detención (STOP y ceda el paso)
    datos_el = json.loads((assets / "osm" / "elementos.json").read_text(encoding="utf-8"))
    indice = STRtree([c["linea"] for c in calles])
    detenciones = []
    for s in datos_el.get("senales", []):
        p = Point(s["x"], s["z"])
        i = indice.nearest(p)
        c = calles[i]
        q = nearest_points(c["linea"], p)[0]
        d = c["linea"].project(q)
        a = c["linea"].interpolate(max(0.0, d - 1.0))
        b = c["linea"].interpolate(min(c["linea"].length, d + 1.0))
        tx, tz = b.x - a.x, b.y - a.y
        lt = math.hypot(tx, tz) or 1.0
        tx, tz = tx / lt, tz / lt
        nx, nz = -tz, tx
        # Lado de la señal respecto al eje, y la línea un poco antes del cruce (1 m hacia atrás)
        lado = 1.0 if (s["x"] - q.x) * nx + (s["z"] - q.y) * nz > 0 else -1.0
        hacia_cruce = math.sin(s["rumbo"]) * tx + math.cos(s["rumbo"]) * tz   # la señal mira a los coches
        cx, cz = q.x + tx * hacia_cruce * 1.0, q.y + tz * hacia_cruce * 1.0
        m = c["media"] - 0.2
        doble = c["tags"].get("oneway") not in ("yes", "1", "-1")
        desde = 0.15 if doble else -m
        detenciones.append({"tipo": s["tipo"], "p": [[r2(cx + nx * lado * desde), r2(cz + nz * lado * desde)],
                                                      [r2(cx + nx * lado * m), r2(cz + nz * lado * m)]]})

    # --- Bordillos: contorno de la calzada del casco
    urbanas = unary_union([z for z, c in zip(calzadas, calles) if c["tipo"] in CON_BORDILLO])
    contorno = urbanas.boundary.intersection(casco).intersection(zona.buffer(-1))
    bordillos = [coords(l.simplify(0.15), None) for l in lineas(contorno) if l.length > 3]

    salida = {"sistema": "local: x este, z sur (m)", "fuente": "© colaboradores de OpenStreetMap (ODbL)",
              "pasos": pasos, "ejes": ejes, "bordes": bordes, "detenciones": detenciones, "bordillos": bordillos}
    (assets / "osm" / "marcas.json").write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    largo = lambda ls: sum(LineString(l).length for l in ls)  # noqa: E731
    print(f"Pasos de cebra {len(pasos)} · ejes {largo(ejes):.0f} m · bordes {largo(bordes):.0f} m · "
          f"líneas de detención {len(detenciones)} · bordillos {largo(bordillos):.0f} m")
    return 0


if __name__ == "__main__":
    sys.exit(main())
