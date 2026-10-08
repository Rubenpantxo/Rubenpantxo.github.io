"""Paso 1.4b — Inventario de todo lo que hay mapeado en OpenStreetMap en la zona.

Descarga de la API oficial de OpenStreetMap todo lo mapeado en el bbox de la zona (XML completo,
con geometrías: también lo usa 13_muros.py) y resume qué temas hay y cuántos elementos, marcando
los que el juego ya usa (04_osm.py) y los que podrían servir. (Overpass, con solo etiquetas,
queda como alternativa si la API no responde.)

Salidas:
    <raw>/osm_extra/zona.osm               XML de la API de OSM (o inventario.json de Overpass)
    <processed>/osm_inventario.md          resumen legible

Uso: conda run -n cabdrive python tools/04b_osm_inventario.py
"""
from __future__ import annotations

import collections
import json
import sys
import time

import requests
from pyproj import Transformer

from comun import cargar_config, cargar_origin, dir_processed, dir_raw

CABECERAS = {"User-Agent": "cabanillas-drive (prototipo; rubenpantxo.com)"}
# Claves que describen qué es un elemento (las demás son detalles: nombre, dirección…)
CLAVES = ["highway", "building", "barrier", "landuse", "leisure", "amenity", "shop", "man_made", "natural",
          "waterway", "power", "sport", "historic", "tourism", "office", "craft", "emergency", "railway",
          "public_transport", "advertising", "surface", "playground", "place", "boundary", "healthcare",
          "club", "religion", "memorial", "artwork_type", "street_lamp", "highway:lamp", "crossing",
          "traffic_calming", "tree", "denotation", "wall", "fence_type", "material", "height", "width",
          "lit", "sidewalk", "parking", "service", "entrance", "addr:housenumber"]
# Lo que ya usa 04_osm.py
USADO = {("highway", None), ("waterway", None), ("natural", "water"), ("landuse", None), ("leisure", "park")}


# Servidores de Overpass: el de config.json y, si está saturado, espejos públicos
ESPEJOS = ["https://overpass.kumi.systems/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]


def pide_overpass(config: dict, consulta: str) -> dict:
    for url in [config["osm_overpass_url"], *ESPEJOS]:
        for intento in range(2):
            try:
                r = requests.post(url, data={"data": consulta}, headers=CABECERAS, timeout=240)
                r.raise_for_status()
                print(f"  respuesta de {url}")
                return r.json()
            except Exception as e:  # noqa: BLE001
                print(f"  {url}: intento {intento + 1}/2 fallido ({e})")
                time.sleep(10)
    print("ERROR: ningún servidor de Overpass responde; prueba más tarde")
    sys.exit(1)


def lee_osm(ruta) -> dict:
    """XML de la API de OSM → mismo formato que Overpass (solo lo que usa el inventario)."""
    try:
        import defusedxml.ElementTree as ET
    except ImportError:
        import xml.etree.ElementTree as ET
    raiz = ET.parse(ruta).getroot()
    elementos = []
    for el in raiz:
        if el.tag not in ("node", "way", "relation"):
            continue
        etiquetas = {t.get("k"): t.get("v") for t in el.findall("tag")}
        if etiquetas:
            elementos.append({"type": el.tag, "id": int(el.get("id")), "tags": etiquetas})
    return {"elements": elementos, "osm3s": {"timestamp_osm_base": raiz.get("generator", "API OSM")}}


def ya_usado(clave: str, valor: str) -> bool:
    return (clave, None) in USADO or (clave, valor) in USADO


def main() -> None:
    config = cargar_config()
    origin = cargar_origin(config)
    a_wgs = Transformer.from_crs(25830, 4326, always_xy=True)
    lon, lat = a_wgs.transform([origin["E_min"], origin["E_max"]], [origin["N_min"], origin["N_max"]])
    b = f"({min(lat):.6f},{min(lon):.6f},{max(lat):.6f},{max(lon):.6f})"
    destino = dir_raw(config) / "osm_extra"
    destino.mkdir(parents=True, exist_ok=True)
    ruta_osm = destino / "zona.osm"
    ruta = destino / "inventario.json"
    if not ruta_osm.is_file() and not ruta.is_file():
        url = f"https://api.openstreetmap.org/api/0.6/map?bbox={min(lon):.6f},{min(lat):.6f},{max(lon):.6f},{max(lat):.6f}"
        print(f"Descargando {url}")
        try:
            r = requests.get(url, headers=CABECERAS, timeout=300)
            r.raise_for_status()
            ruta_osm.write_bytes(r.content)
            print(f"  {len(r.content) / 1e6:.1f} MB")
        except Exception as e:  # noqa: BLE001
            print(f"  la API de OSM no responde ({e}); se prueba Overpass")
    if ruta_osm.is_file():
        datos = lee_osm(ruta_osm)
    elif ruta.is_file():
        print(f"Usando la respuesta guardada {ruta}")
        datos = json.loads(ruta.read_text(encoding="utf-8"))
    else:
        consulta = f"[out:json][timeout:180];(node{b}(if:count_tags()>0);way{b};relation{b};);out tags;"
        print("Consultando Overpass (solo etiquetas)…")
        datos = pide_overpass(config, consulta)
        ruta.write_text(json.dumps(datos, ensure_ascii=False), encoding="utf-8")

    elementos = datos.get("elements", [])
    cuenta = collections.Counter()
    ejemplos = {}
    claves_vistas = collections.Counter()
    for el in elementos:
        etiquetas = el.get("tags", {})
        for k in etiquetas:
            claves_vistas[k] += 1
        for k in CLAVES:
            if k in etiquetas:
                v = etiquetas[k] if k not in ("height", "width", "addr:housenumber") else "(valor)"
                cuenta[(k, v, el["type"])] += 1
                if "name" in etiquetas:
                    ejemplos.setdefault((k, v), etiquetas["name"])

    lineas = [f"# Inventario OSM de la zona ({len(elementos)} elementos con etiquetas; "
              f"datos de {datos.get('osm3s', {}).get('timestamp_osm_base', '?')})", "",
              "| clave | valor | tipo | n.º | ya usado | ejemplo |", "|---|---|---|---|---|---|"]
    for (k, v, t), n in sorted(cuenta.items(), key=lambda kv: (kv[0][0], -kv[1])):
        lineas.append(f"| {k} | {v} | {t} | {n} | {'sí' if ya_usado(k, v) else ''} | {ejemplos.get((k, v), '')} |")
    lineas += ["", "## Todas las claves", "", ", ".join(f"{k} ({n})" for k, n in claves_vistas.most_common())]
    salida = dir_processed(config) / "osm_inventario.md"
    salida.write_text("\n".join(lineas), encoding="utf-8")
    print(f"{len(elementos)} elementos · resumen en {salida}")


if __name__ == "__main__":
    main()
