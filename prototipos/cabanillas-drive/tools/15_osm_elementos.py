"""Paso F6 — Elementos de OpenStreetMap que faltaban: mobiliario, señales, tendido eléctrico,
piscinas, instalaciones deportivas, parques infantiles y números de portal.

Todo sale de <raw>/osm_extra/zona.osm (04b_osm_inventario.py) y se coloca así:
- Bancos, mesas, paneles, hitos, fuente, bebedero, aparcabicis y parada: en su nodo; mirando a
  la calle o senda más cercana (OSM no guarda hacia dónde miran).
- STOP y ceda el paso: el nodo está sobre la calzada; la señal va a la derecha del sentido al que
  afecta (etiqueta direction=forward/backward respecto al dibujo de la vía; si falta, el sentido que
  llega al cruce más cercano), a media calzada + 0,6 m, de cara a los coches.
- Torres eléctricas: solo las de la zona que el LiDAR confirma, con su altura (máximo del nDSM a
  8 m). La línea de 66 kV no se dibuja: OSM solo tiene torres a kilómetros de la zona, y por donde
  la recta entre ellas cruza el término el LiDAR no ve nada alto (el trazado real se desconoce).
- Piscinas, campos, gradas y parques infantiles: sus polígonos. Porterías y canastas en los lados
  cortos del rectángulo mínimo del campo (lo que define el deporte).
- Números de portal: edificios OSM con addr:housenumber; la placa va en la pared del edificio del
  Catastro más próxima a la calle addr:street, a la altura del primer piso bajo (2,3 m).

Salida: <assets>/osm/elementos.json (coordenadas locales [x, z]; rumbo = atan2(dx, dz) del frente)

Uso: conda run -n cabdrive python tools/15_osm_elementos.py
"""
from __future__ import annotations

import importlib
import json
import math
import sys

import numpy as np
from pyproj import Transformer
from shapely import STRtree
from shapely.geometry import LineString, Point, Polygon, shape
from shapely.ops import nearest_points

from comun import cargar_config, cargar_origin, dir_assets, dir_processed, dir_raw

try:
    import defusedxml.ElementTree as ET   # XML de fuera: sin entidades externas
except ImportError:
    import xml.etree.ElementTree as ET

MEDIA_CALZADA_M = {"primary": 4.0, "secondary": 4.0, "tertiary": 3.5, "residential": 3.0, "unclassified": 3.0,
                   "living_street": 2.5, "service": 2.2, "primary_link": 3.5, "track": 2.0}
ALTURA_PLACA_M = 2.3
DEC = 2


def r2(v):
    return round(float(v), DEC)


def lee_osm(ruta, a_local):
    raiz = ET.parse(ruta).getroot()
    a_utm = Transformer.from_crs(4326, 25830, always_xy=True)
    nodos, etiquetas_nodo = {}, {}
    for n in raiz.iter("node"):
        e, nn = a_utm.transform(float(n.get("lon")), float(n.get("lat")))
        nodos[n.get("id")] = a_local(e, nn)
        tags = {t.get("k"): t.get("v") for t in n.findall("tag")}
        if tags:
            etiquetas_nodo[n.get("id")] = tags
    vias = []
    for w in raiz.iter("way"):
        tags = {t.get("k"): t.get("v") for t in w.findall("tag")}
        refs = [nd.get("ref") for nd in w.findall("nd") if nd.get("ref") in nodos]
        vias.append({"id": w.get("id"), "tags": tags, "refs": refs})
    return nodos, etiquetas_nodo, vias


def rumbo_hacia(dx, dz):
    return math.atan2(dx, dz)


def main() -> int:
    config = cargar_config()
    origin = cargar_origin(config)
    assets = dir_assets(config)
    processed = dir_processed(config)
    a_local = lambda e, n: (e - origin["E_centro"], -(n - origin["N_centro"]))  # noqa: E731
    ruta = dir_raw(config) / "osm_extra" / "zona.osm"
    if not ruta.is_file():
        print("Falta data/raw/osm_extra/zona.osm: ejecuta antes tools/04b_osm_inventario.py")
        return 1
    nodos, etq, vias = lee_osm(ruta, a_local)
    dentro = lambda x, z: abs(x) <= origin["ancho"] / 2 and abs(z) <= origin["alto"] / 2  # noqa: E731

    # Calles y sendas para orientar
    calles_vias = [v for v in vias if v["tags"].get("highway") in MEDIA_CALZADA_M and len(v["refs"]) >= 2]
    lineas_calle = [LineString([nodos[r] for r in v["refs"]]) for v in calles_vias]
    sendas = [LineString([nodos[r] for r in v["refs"]]) for v in vias
              if v["tags"].get("highway") in ("footway", "pedestrian", "path", "steps", "cycleway") and len(v["refs"]) >= 2]
    indice_calles = STRtree(lineas_calle)
    indice_todas = STRtree(lineas_calle + sendas)
    todas = lineas_calle + sendas

    def mira_a_via(x, z, solo_calles=False):
        """Rumbo hacia la vía más cercana (perpendicular a ella)."""
        lista, indice = (lineas_calle, indice_calles) if solo_calles else (todas, indice_todas)
        i = indice.nearest(Point(x, z))
        q = nearest_points(lista[i], Point(x, z))[0]
        dx, dz = q.x - x, q.y - z
        if math.hypot(dx, dz) < 0.05:
            return 0.0
        return rumbo_hacia(dx, dz)

    def puntos_de(clave, valor):
        return [(i, nodos[i]) for i, t in etq.items() if t.get(clave) == valor and i in nodos and dentro(*nodos[i])]

    salida = {"sistema": "local: x este, z sur (m); rumbo = atan2(dx, dz) del frente (rad)",
              "fuente": "© colaboradores de OpenStreetMap (ODbL); alturas de torres: LiDAR PNOA 2024"}

    salida["bancos"] = [{"x": r2(x), "z": r2(z), "rumbo": r2(mira_a_via(x, z))} for _, (x, z) in puntos_de("amenity", "bench")]
    salida["mesas"] = [{"x": r2(x), "z": r2(z), "rumbo": r2(mira_a_via(x, z))} for _, (x, z) in puntos_de("leisure", "picnic_table")]
    salida["fuentes"] = [{"x": r2(x), "z": r2(z), "tipo": "fuente"} for _, (x, z) in puntos_de("amenity", "fountain")] + \
        [{"x": r2(x), "z": r2(z), "tipo": "bebedero", "rumbo": r2(mira_a_via(x, z))} for _, (x, z) in puntos_de("amenity", "drinking_water")]
    salida["aparcabicis"] = [{"x": r2(x), "z": r2(z), "rumbo": r2(mira_a_via(x, z)), "plazas": int(etq[i].get("capacity", 10))}
                             for i, (x, z) in puntos_de("amenity", "bicycle_parking")]
    salida["paneles"] = [{"x": r2(x), "z": r2(z), "rumbo": r2(mira_a_via(x, z)), "tipo": etq[i].get("board_type", "board")}
                         for i, (x, z) in puntos_de("tourism", "information")]
    salida["paradas"] = [{"x": r2(x), "z": r2(z), "rumbo": r2(mira_a_via(x, z, solo_calles=True))}
                         for _, (x, z) in puntos_de("highway", "bus_stop")]
    salida["hitos"] = [{"x": r2(x), "z": r2(z), "rumbo": r2(mira_a_via(x, z, solo_calles=True)),
                        "texto": f"{etq[i].get('ref', '')}", "km": etq[i].get("distance", "")}
                       for i, (x, z) in puntos_de("highway", "milestone")]
    salida["puertas"] = [{"x": r2(x), "z": r2(z), "rumbo": r2(mira_a_via(x, z))} for _, (x, z) in puntos_de("barrier", "gate")]

    # Señales de STOP y ceda el paso
    uso_nodo = {}
    for v in calles_vias:
        for r in v["refs"]:
            uso_nodo[r] = uso_nodo.get(r, 0) + 1
    senales = []
    for tipo_osm, tipo in (("stop", "stop"), ("give_way", "ceda")):
        for i, (x, z) in puntos_de("highway", tipo_osm):
            via = next((v for v in calles_vias if i in v["refs"]), None)
            if via is None:
                continue
            k = via["refs"].index(i)
            sentido = etq[i].get("direction")
            if sentido not in ("forward", "backward"):
                # Hacia el cruce más cercano a lo largo de la vía
                def distancia_cruce(paso):
                    d, j = 0.0, k
                    while 0 <= j + paso < len(via["refs"]):
                        a, b = nodos[via["refs"][j]], nodos[via["refs"][j + paso]]
                        d += math.dist(a, b)
                        j += paso
                        if uso_nodo.get(via["refs"][j], 0) > 1:
                            return d
                    return math.inf
                sentido = "forward" if distancia_cruce(1) <= distancia_cruce(-1) else "backward"
            # Dirección de marcha de los coches a los que afecta (la del dibujo o la contraria)
            a = nodos[via["refs"][max(k - 1, 0)]]
            b = nodos[via["refs"][min(k + 1, len(via["refs"]) - 1)]]
            dx, dz = b[0] - a[0], b[1] - a[1]
            if sentido == "backward":
                dx, dz = -dx, -dz
            largo = math.hypot(dx, dz) or 1
            dx, dz = dx / largo, dz / largo
            # Derecha del sentido de marcha (x este, z sur): (−dz, dx)
            media = MEDIA_CALZADA_M.get(via["tags"].get("highway"), 3.0)
            px, pz = x + -dz * (media + 0.6), z + dx * (media + 0.6)
            senales.append({"x": r2(px), "z": r2(pz), "tipo": tipo, "rumbo": r2(rumbo_hacia(-dx, -dz))})
    salida["senales"] = senales

    # Tendido eléctrico: torres con la altura del LiDAR
    ndsm, _, tr = importlib.import_module("08_arboles").lee_rasters(processed)

    def max_ndsm(x, z, radio=4.0):
        e, n = x + origin["E_centro"], origin["N_centro"] - z
        c, f = int((e - tr.c) / tr.a), int((n - tr.f) / tr.e)
        rp = int(radio / tr.a)
        ventana = ndsm[max(f - rp, 0):f + rp + 1, max(c - rp, 0):c + rp + 1]
        return float(ventana.max()) if ventana.size else 0.0

    torres = {}
    for i, (x, z) in [(i, nodos[i]) for i, t in etq.items() if t.get("power") == "tower" and i in nodos]:
        alto = max_ndsm(x, z, 8.0) if dentro(x, z) else 0.0
        if alto > 4:          # solo las que el LiDAR confirma (las de fuera de la zona no se dibujan)
            torres[i] = {"x": r2(x), "z": r2(z), "alto": r2(alto)}
    salida["torres"] = list(torres.values())

    # Piscinas, deportes y juegos
    def poligono(v):
        pts = [nodos[r] for r in v["refs"]]
        if len(pts) < 4:
            return None
        p = Polygon(pts)
        return p if p.is_valid and p.area > 2 else None

    def anillo(p):
        return [[r2(x), r2(z)] for x, z in list(p.exterior.coords)[:-1]]

    piscinas, canchas, gradas, juegos = [], [], [], []
    centro_deportivo = [poligono(v) for v in vias if v["tags"].get("leisure") == "sports_centre"]
    centro_deportivo = [p for p in centro_deportivo if p]
    for v in vias:
        t = v["tags"]
        p = poligono(v)
        if p is None or not dentro(*p.centroid.coords[0]):
            continue
        if t.get("leisure") == "swimming_pool":
            publica = any(c.contains(p.centroid) for c in centro_deportivo)
            piscinas.append({"p": anillo(p), "publica": publica})
        elif t.get("leisure") == "pitch" and t.get("sport") in ("soccer", "basketball"):
            rect = p.minimum_rotated_rectangle
            esq = list(rect.exterior.coords)[:4]
            lados = [(esq[i], esq[(i + 1) % 4]) for i in range(4)]
            largo_lado = [math.dist(a, b) for a, b in lados]
            cortos = sorted(range(4), key=lambda i: largo_lado[i])[:2]
            cx, cz = rect.centroid.coords[0]
            extremos = []
            for i in cortos:
                (ax, az), (bx, bz) = lados[i]
                mx, mz = (ax + bx) / 2, (az + bz) / 2
                extremos.append({"x": r2(mx), "z": r2(mz), "rumbo": r2(rumbo_hacia(cx - mx, cz - mz))})
            canchas.append({"deporte": t["sport"], "largo": r2(max(largo_lado)), "ancho": r2(min(largo_lado)),
                            "extremos": extremos, "nombre": t.get("name", "")})
        elif t.get("leisure") == "bleachers":
            rect = p.minimum_rotated_rectangle
            # Las gradas miran al campo más cercano
            cx, cz = rect.centroid.coords[0]
            campos = [poligono(w) for w in vias if w["tags"].get("leisure") == "pitch"]
            campos = [c for c in campos if c]
            objetivo = min(campos, key=lambda c: c.distance(rect)).centroid.coords[0] if campos else (cx, cz + 1)
            gradas.append({"p": anillo(rect), "mira": [r2(objetivo[0]), r2(objetivo[1])]})
        elif t.get("leisure") == "playground":
            juegos.append({"p": anillo(p), "centro": [r2(p.centroid.x), r2(p.centroid.y)], "area": r2(p.area)})
    salida.update({"piscinas": piscinas, "canchas": canchas, "gradas": gradas, "juegos": juegos})

    # Números de portal en la pared del Catastro más próxima a su calle
    edificios = json.loads((assets / "buildings.geojson").read_text(encoding="utf-8"))["features"]
    paredes, datos_pared = [], []
    for f in edificios:
        anillo_cat = f["geometry"]["coordinates"][0]
        for i in range(len(anillo_cat) - 1):
            (x0, z0), (x1, z1) = anillo_cat[i][:2], anillo_cat[i + 1][:2]
            if math.dist((x0, z0), (x1, z1)) < 1.5:
                continue
            paredes.append(LineString([(x0, z0), (x1, z1)]))
            datos_pared.append({"base": f["properties"]["base_y"], "alto": f["properties"]["height"]})
    indice_paredes = STRtree(paredes)
    calles_por_nombre = {}
    for v in calles_vias:
        nombre = v["tags"].get("name")
        if nombre:
            calles_por_nombre.setdefault(nombre, []).append(LineString([nodos[r] for r in v["refs"]]))
    portales = []
    for v in vias + [{"tags": t, "refs": [i]} for i, t in etq.items()]:
        t = v["tags"]
        if "addr:housenumber" not in t or not v["refs"]:
            continue
        pts = [nodos[r] for r in v["refs"] if r in nodos]
        if not pts:
            continue
        centro = Polygon(pts).centroid if len(pts) >= 4 else Point(pts[0])
        if not dentro(centro.x, centro.y):
            continue
        calle = calles_por_nombre.get(t.get("addr:street", ""))
        objetivo = min(calle, key=lambda c: c.distance(centro)) if calle else lineas_calle[indice_calles.nearest(centro)]
        # Pared candidata: cerca del edificio y de cara a la calle
        mejores = indice_paredes.query(centro.buffer(25))
        mejor, mejor_d = None, math.inf
        for j in mejores:
            pared = paredes[j]
            mitad = pared.interpolate(0.5, normalized=True)
            d = mitad.distance(objetivo) + 0.5 * mitad.distance(centro)
            if mitad.distance(centro) > 18:
                continue
            if d < mejor_d:
                mejor, mejor_d = j, d
        if mejor is None:
            continue
        pared = paredes[mejor]
        (x0, z0), (x1, z1) = pared.coords
        mitad = pared.interpolate(0.5, normalized=True)
        q = nearest_points(objetivo, mitad)[0]
        # Normal hacia la calle
        ex, ez = (x1 - x0) / pared.length, (z1 - z0) / pared.length
        nx, nz = -ez, ex
        if (q.x - mitad.x) * nx + (q.y - mitad.y) * nz < 0:
            nx, nz = -nx, -nz
        # Junto a un extremo de la pared (donde suele estar la puerta), a 0,6 m
        desde = 0.6 if pared.length > 3 else pared.length / 2
        px, pz = x0 + ex * desde + nx * 0.04, z0 + ez * desde + nz * 0.04
        portales.append({"x": r2(px), "z": r2(pz), "rumbo": r2(rumbo_hacia(nx, nz)), "y": r2(datos_pared[mejor]["base"] + ALTURA_PLACA_M),
                         "texto": t["addr:housenumber"].strip()[:6]})
    # Sin repetidos (mismo número en la misma pared)
    vistos, unicos = set(), []
    for p in portales:
        k = (p["texto"], round(p["x"]), round(p["z"]))
        if k not in vistos:
            vistos.add(k)
            unicos.append(p)
    salida["portales"] = unicos

    (assets / "osm" / "elementos.json").write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    resumen = {k: len(v) for k, v in salida.items() if isinstance(v, (list, dict))}
    print("Elementos:", resumen)
    print("Torres:", [t["alto"] for t in torres.values()])
    return 0


if __name__ == "__main__":
    sys.exit(main())
