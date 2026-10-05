"""Paso 1.4 — Calles, caminos, agua, usos del suelo y puntos de interés de OpenStreetMap.

Consulta Overpass para el bbox de la zona (en WGS84), guarda la respuesta cruda en
<processed>/osm_raw.json (si ya existe, no se repite la petición), convierte a
coordenadas locales [x, z], recorta a la zona y separa por temas.

Salidas:
    <assets>/osm/calles.geojson, caminos.geojson, agua.geojson, usos.geojson, poi.geojson
    <processed>/previews/osm.png (sobre la ortofoto)

Uso: conda run -n cabdrive python tools/04_osm.py
"""
from __future__ import annotations

import json
import sys
import time

import requests
from PIL import Image
from pyproj import Transformer
from shapely.geometry import LineString, Point, Polygon, box, mapping
from shapely.ops import linemerge, polygonize, transform as transforma, unary_union

from comun import cargar_config, cargar_origin, dir_assets, dir_previews, dir_processed
from previews import Lienzo

REINTENTOS = 3
ESPERA_S = (10, 30, 60)
CABECERAS = {"User-Agent": "cabanillas-drive (prototipo; rubenpantxo.com)"}
DECIMALES = 2

CALLES = {"motorway", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential",
          "living_street", "service", "road", "motorway_link", "trunk_link", "primary_link",
          "secondary_link", "tertiary_link"}
CAMINOS = {"track", "path", "footway", "cycleway", "bridleway", "steps", "pedestrian", "corridor"}
AMENITIES = ("place_of_worship|townhall|school|kindergarten|college|pharmacy|bar|cafe|restaurant|fast_food|"
             "pub|fuel|parking|hospital|clinic|doctors|library|post_office|police|fire_station|bank|atm|"
             "marketplace|community_centre|social_facility|social_centre|fountain|bus_station|"
             "drinking_water|toilets|theatre|arts_centre|grave_yard|recycling")
AGUA_AREA_LANDUSE = {"reservoir", "basin"}
AGUA_AREA_WATERWAY = {"riverbank", "dock"}
PROPIEDADES_CALLE = {"oneway": "sentido_unico", "lanes": "carriles", "width": "ancho", "surface": "superficie",
                     "bridge": "puente", "tunnel": "tunel", "layer": "capa", "maxspeed": "velocidad_max"}


def falla(mensaje: str) -> None:
    print(f"\nERROR: {mensaje}")
    sys.exit(1)


def consulta(s, w, n, e) -> str:
    b = f"({s:.6f},{w:.6f},{n:.6f},{e:.6f})"
    return f"""[out:json][timeout:180];
(
  way["highway"]{b};
  way["waterway"]{b};
  way["natural"="water"]{b};
  relation["natural"="water"]{b};
  way["landuse"]{b};
  relation["landuse"]{b};
  way["leisure"="park"]{b};
  relation["leisure"="park"]{b};
  node["amenity"~"^({AMENITIES})$"]{b};
  way["amenity"~"^({AMENITIES})$"]{b};
);
out geom;"""


def descarga(url: str, query: str) -> dict:
    for intento in range(REINTENTOS):
        try:
            r = requests.post(url, data={"data": query}, headers=CABECERAS, timeout=240)
            r.raise_for_status()
            return r.json()
        except (requests.RequestException, ValueError) as e:
            print(f"  Overpass: intento {intento + 1}/{REINTENTOS} fallido ({e})")
            if intento + 1 < REINTENTOS:
                time.sleep(ESPERA_S[intento])
    falla(f"Overpass no responde tras {REINTENTOS} intentos. Vuelve a probar más tarde "
          "o cambia osm_overpass_url en config.json (p. ej. https://overpass.kumi.systems/api/interpreter).")


# ------------------------------------------------------------------------ geometría
def coords(geometria) -> list[tuple[float, float]]:
    return [(p["lon"], p["lat"]) for p in geometria if p]


def es_area(tags: dict, cerrado: bool) -> bool:
    if not cerrado or tags.get("area") == "no":
        return False
    if "highway" in tags:
        return tags.get("area") == "yes"
    if "waterway" in tags:
        return tags["waterway"] in AGUA_AREA_WATERWAY
    return any(k in tags for k in ("landuse", "natural", "leisure", "amenity"))


def geometria_elemento(el: dict):
    """Geometría shapely en WGS84 (lon, lat) de un elemento de Overpass con 'out geom'."""
    if el["type"] == "node":
        return Point(el["lon"], el["lat"])
    if el["type"] == "way":
        c = coords(el.get("geometry", []))
        if len(c) < 2:
            return None
        cerrado = len(c) >= 4 and c[0] == c[-1]
        return Polygon(c) if es_area(el.get("tags", {}), cerrado) else LineString(c)
    if el["type"] == "relation" and el.get("tags", {}).get("type") == "multipolygon":
        lineas = {"outer": [], "inner": []}
        for m in el.get("members", []):
            c = coords(m.get("geometry", []))
            if m.get("type") == "way" and len(c) >= 2:
                lineas["inner" if m.get("role") == "inner" else "outer"].append(LineString(c))
        exteriores = list(polygonize(linemerge(lineas["outer"]))) if lineas["outer"] else []
        interiores = list(polygonize(linemerge(lineas["inner"]))) if lineas["inner"] else []
        if not exteriores:
            return None
        forma = unary_union(exteriores)
        return forma.difference(unary_union(interiores)) if interiores else forma
    return None


def redondea(c):
    if isinstance(c, (float, int)):
        return round(c, DECIMALES)
    return [redondea(v) for v in c]


def feature(geom, props: dict) -> dict:
    return {"type": "Feature", "properties": props, "geometry": {
        "type": geom.geom_type, "coordinates": redondea(mapping(geom)["coordinates"])}}


def clasifica(tags: dict, geom) -> str | None:
    tipo_geom = geom.geom_type
    lineal = tipo_geom in ("LineString", "MultiLineString")
    if "highway" in tags and lineal:
        if tags["highway"] in CALLES:
            return "calles"
        if tags["highway"] in CAMINOS:
            return "caminos"
        return None
    if "waterway" in tags or tags.get("natural") == "water" or tags.get("landuse") in AGUA_AREA_LANDUSE:
        return "agua"
    if ("landuse" in tags or tags.get("leisure") == "park") and not lineal and tipo_geom != "Point":
        return "usos"
    if "amenity" in tags:
        return "poi"
    return None


def propiedades(tema: str, el: dict) -> dict:
    tags = el.get("tags", {})
    p = {"id": f"{el['type'][0]}{el['id']}", "nombre": tags.get("name")}
    if tema in ("calles", "caminos"):
        p["tipo"] = tags["highway"]
        for clave, nombre in PROPIEDADES_CALLE.items():
            if clave in tags:
                p[nombre] = tags[clave]
    elif tema == "agua":
        p["tipo"] = tags.get("waterway") or tags.get("water") or tags.get("natural") or tags.get("landuse")
    elif tema == "usos":
        p["tipo"] = tags.get("landuse") or tags.get("leisure")
    else:
        p["tipo"] = tags["amenity"]
    return {k: v for k, v in p.items() if v is not None}


def main() -> int:
    config = cargar_config()
    origin = cargar_origin(config)
    processed = dir_processed(config)
    dir_osm = dir_assets(config) / "osm"
    dir_osm.mkdir(parents=True, exist_ok=True)

    zona_utm = box(origin["E_min"], origin["N_min"], origin["E_max"], origin["N_max"])
    a_wgs = Transformer.from_crs(25830, 4326, always_xy=True)
    a_utm = Transformer.from_crs(4326, 25830, always_xy=True)
    lon, lat = a_wgs.transform([origin["E_min"], origin["E_max"], origin["E_min"], origin["E_max"]],
                               [origin["N_min"], origin["N_min"], origin["N_max"], origin["N_max"]])

    ruta_cruda = processed / "osm_raw.json"
    if ruta_cruda.is_file():
        print(f"Usando la respuesta cacheada {ruta_cruda}")
        datos = json.loads(ruta_cruda.read_text(encoding="utf-8"))
    else:
        print("Consultando Overpass…")
        datos = descarga(config["osm_overpass_url"], consulta(min(lat), min(lon), max(lat), max(lon)))
        ruta_cruda.write_text(json.dumps(datos, ensure_ascii=False), encoding="utf-8")
    elementos = datos.get("elements", [])
    print(f"  {len(elementos)} elementos OSM (datos de {datos.get('osm3s', {}).get('timestamp_osm_base', '?')})")

    e_c, n_c = origin["E_centro"], origin["N_centro"]
    a_local = lambda x, y, z=None: (x - e_c, -(y - n_c))  # noqa: E731
    temas = {t: [] for t in ("calles", "caminos", "agua", "usos", "poi")}
    ignorados = 0
    for el in elementos:
        geom = geometria_elemento(el)
        if geom is None or geom.is_empty:
            ignorados += 1
            continue
        if not geom.is_valid:
            geom = geom.buffer(0)
        geom = transforma(a_utm.transform, geom)
        tema = clasifica(el.get("tags", {}), geom)
        if tema == "poi" and geom.geom_type != "Point":
            geom = geom.representative_point()
        if tema is None:
            ignorados += 1
            continue
        geom = geom.intersection(zona_utm)
        if geom.is_empty:
            continue
        if geom.geom_type == "GeometryCollection":
            partes = [g for g in geom.geoms if g.geom_type in ("LineString", "Polygon", "Point")]
            if not partes:
                continue
            geom = unary_union(partes)
        temas[tema].append(feature(transforma(a_local, geom), propiedades(tema, el)))

    descripcion = "local Cabanillas Drive: [x, z] en metros, x = E − E_centro, z = −(N − N_centro)"
    print("Salidas:")
    for tema, features in temas.items():
        features.sort(key=lambda f: f["properties"]["id"])
        ruta = dir_osm / f"{tema}.geojson"
        ruta.write_text(json.dumps({"type": "FeatureCollection", "sistema": descripcion,
                                    "fuente": "© colaboradores de OpenStreetMap (ODbL)", "features": features},
                                   ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        tipos = {}
        for f in features:
            tipos[f["properties"].get("tipo")] = tipos.get(f["properties"].get("tipo"), 0) + 1
        resumen = ", ".join(f"{k} {v}" for k, v in sorted(tipos.items(), key=lambda kv: -kv[1])[:8])
        print(f"  {ruta.name}: {len(features)} ({resumen}) · {ruta.stat().st_size / 1024:.0f} KB")
    print(f"  Elementos sin tema o sin geometría: {ignorados}")

    # --- Vista previa sobre la ortofoto
    lienzo = Lienzo(origin, 1, fondo=Image.open(dir_previews(config) / "orto.jpg"))
    colores = {"usos": (255, 255, 255, 40), "agua": (40, 140, 255, 255), "caminos": (230, 160, 60, 255),
               "calles": (255, 230, 0, 255), "poi": (230, 30, 60, 255)}
    for f in temas["usos"]:
        lienzo.geometria(f["geometry"], borde=(255, 255, 255, 120), relleno=colores["usos"])
    for f in temas["agua"]:
        poligonal = "Polygon" in f["geometry"]["type"]
        lienzo.geometria(f["geometry"], borde=colores["agua"], relleno=(40, 140, 255, 90) if poligonal else None,
                         ancho=3)
    for f in temas["caminos"]:
        lienzo.geometria(f["geometry"], borde=colores["caminos"], ancho=2)
    for f in temas["calles"]:
        lienzo.geometria(f["geometry"], borde=colores["calles"], ancho=3)
    for f in temas["poi"]:
        lienzo.geometria(f["geometry"], relleno=colores["poi"], ancho=5)
    lienzo.rotulo(["OSM sobre ortofoto PNOA · 1 px/m"],
                  leyenda=[("calles", colores["calles"]), ("caminos", colores["caminos"]),
                           ("agua", colores["agua"]), ("usos del suelo", (255, 255, 255)), ("POI", colores["poi"])])
    lienzo.guarda(dir_previews(config) / "osm.png")
    print(f"  {dir_previews(config) / 'osm.png'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
