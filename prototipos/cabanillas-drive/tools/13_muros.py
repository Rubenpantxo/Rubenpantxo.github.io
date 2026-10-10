"""Paso F6 — Muros y vallas de parcela (corrales, patios, campo de fútbol, piscinas…).

Dos fuentes, sin inventar nada:
1. OpenStreetMap (<raw>/osm_extra/zona.osm, de 04b_osm_inventario.py): barrier=wall, fence y
   retaining_wall tal como están mapeados. Altura: la etiqueta height si la hay; si no, la que
   mide el LiDAR a lo largo de la línea; si tampoco, un valor típico (muro 1,8 m, valla 2 m).
2. LiDAR + Catastro: los linderos de las parcelas urbanas que no son pared de un edificio se
   recorren cada 0,25 m mirando el nDSM (0,5 m) a ±0,75 m del lindero. Hay muro donde aparece
   una franja continua de 0,6–4 m de alto que no es vegetación (verde en la ortofoto), ni un
   coche aparcado (07_coches_orto.py), ni un edificio, con altura regular (los setos y los
   objetos sueltos son irregulares). Tramos de al menos 2 m; los huecos de menos de 0,5 m se
   cierran (las puertas, más anchas, se quedan abiertas).
3. Catastro (tapias del casco): en el casco urbano del Catastro (CATAST_Pol_CascoUrbano) los
   linderos de parcela que no son pared de un edificio son tapias de corral o de patio, o el
   cerramiento a la calle (el LiDAR no las ve cuando hay árboles encima, son bajas o finas). Se
   ponen salvo sobre la calzada, en parques y zonas peatonales de OSM y en tramos cortos.
   Altura: la que mide el LiDAR a ±1 m si se ve en buena parte del tramo; si no, 2 m (f: catastro).
Junto a pistas deportivas y piscinas (OSM leisure=pitch, sports_centre, swimming_pool) los
tramos altos (> 2,2 m) se marcan como valla metálica.

Salidas:
    <assets>/muros.json   {muros: [{t: muro|valla|contencion, h, f: osm|lidar, p: [[x, z], …]}]}
    <processed>/previews/muros.png

Uso: conda run -n cabdrive python tools/13_muros.py
"""
from __future__ import annotations

import importlib
import json
import sys
try:
    import defusedxml.ElementTree as ET   # XML de fuera: sin entidades externas
except ImportError:
    import xml.etree.ElementTree as ET

import geopandas as gpd
import numpy as np
from PIL import Image
from pyproj import Transformer
from shapely.geometry import LineString, MultiLineString, Polygon, shape
from shapely.ops import linemerge, transform as transforma, unary_union

from comun import busca_capa, cargar_config, cargar_origin, dir_assets, dir_previews, dir_processed, dir_raw
from previews import Lienzo

PASO_M = 0.25
BUSQUEDA_M = 0.75            # a cada lado del lindero
ALTURA_MIN_M = 0.6
ALTURA_MAX_M = 4.0
MARGEN_EDIFICIO_M = 0.6
MARGEN_COCHE_M = 0.5
TRAMO_MIN_M = 2.0
HUECO_MAX_M = 0.5
REGULARIDAD = 0.6            # fracción de muestras a ±0,35 m de la mediana
VALLA_DEPORTIVA_M = 2.2
TAPIA_POR_DEFECTO_M = 2.0
TAPIA_TRAMO_MIN_M = 1.5
TAPIA_BUSQUEDA_M = 1.0
TAPIA_MEDIDA_MIN = 0.4       # fracción del tramo que el LiDAR tiene que ver para usar su altura
LIBRES_OSM = {"park", "playground", "garden", "pitch", "dog_park"}
MEDIA_CALZADA_M = {"primary": 4.0, "primary_link": 3.5, "secondary": 4.0, "tertiary": 3.5, "residential": 3.0,
                   "unclassified": 3.0, "living_street": 2.5, "service": 2.2, "pedestrian": 2.0, "track": 2.0}
POR_DEFECTO = {"wall": 1.8, "fence": 2.0, "retaining_wall": 1.0}
TIPOS_OSM = {"wall": "muro", "fence": "valla", "retaining_wall": "contencion"}
DECIMALES = 2


def lee_osm(ruta, a_local):
    """Barreras (líneas) y zonas deportivas (polígonos) del XML de la API de OSM."""
    raiz = ET.parse(ruta).getroot()
    a_utm = Transformer.from_crs(4326, 25830, always_xy=True)
    nodos = {}
    for n in raiz.iter("node"):
        e, n_ = a_utm.transform(float(n.get("lon")), float(n.get("lat")))
        nodos[n.get("id")] = a_local(e, n_)
    barreras, deportes, libres, calles = [], [], [], []
    for w in raiz.iter("way"):
        tags = {t.get("k"): t.get("v") for t in w.findall("tag")}
        pts = [nodos[nd.get("ref")] for nd in w.findall("nd") if nd.get("ref") in nodos]
        if len(pts) < 2:
            continue
        if tags.get("barrier") in TIPOS_OSM:
            altura = None
            try:
                altura = float(tags.get("height", "").replace(",", ".").split()[0])
            except (ValueError, IndexError):
                pass
            barreras.append({"tipo": tags["barrier"], "altura": altura, "linea": LineString(pts)})
        if tags.get("leisure") in ("pitch", "sports_centre", "swimming_pool", "stadium") and len(pts) >= 4:
            pol = Polygon(pts)
            if pol.is_valid and pol.area > 20:
                deportes.append(pol)
        # Espacios abiertos (sin tapia): parques, jardines, plazas peatonales
        abierto = tags.get("leisure") in LIBRES_OSM or tags.get("highway") == "pedestrian" or tags.get("place") == "square"
        if abierto and len(pts) >= 4 and pts[0] == pts[-1]:
            pol = Polygon(pts)
            if pol.is_valid:
                libres.append(pol)
        if tags.get("highway") in MEDIA_CALZADA_M:
            calles.append(LineString(pts).buffer(MEDIA_CALZADA_M[tags["highway"]] + 0.3, cap_style="flat"))
    return barreras, deportes, libres, calles


class Muestreo:
    """Alturas del nDSM y vegetación en coordenadas locales."""

    def __init__(self, ndsm, orto, tr, origin):
        self.h = ndsm
        r, g, b = orto[..., 0], orto[..., 1], orto[..., 2]
        self.verde = (2 * g - r - b) / (r + g + b + 1) > 0.06
        self.tr = tr
        self.origin = origin

    def en(self, x, z):
        e = np.asarray(x) + self.origin["E_centro"]
        n = self.origin["N_centro"] - np.asarray(z)
        c = ((e - self.tr.c) / self.tr.a).astype(int)
        f = ((n - self.tr.f) / self.tr.e).astype(int)
        ok = (c >= 0) & (c < self.h.shape[1]) & (f >= 0) & (f < self.h.shape[0])
        c = np.clip(c, 0, self.h.shape[1] - 1)
        f = np.clip(f, 0, self.h.shape[0] - 1)
        return np.where(ok, self.h[f, c], 0.0), np.where(ok, self.verde[f, c], True)


def perfil(linea, muestreo, prohibido):
    """Por cada punto del lindero (cada PASO_M): altura máxima a ±BUSQUEDA_M y su desplazamiento."""
    largo = linea.length
    s = np.arange(PASO_M / 2, largo, PASO_M)
    pts = np.array([linea.interpolate(d).coords[0] for d in s])
    delante = np.array([linea.interpolate(min(d + 0.1, largo)).coords[0] for d in s]) - \
        np.array([linea.interpolate(max(d - 0.1, 0)).coords[0] for d in s])
    delante /= np.maximum(np.linalg.norm(delante, axis=1, keepdims=True), 1e-6)
    normal = np.stack([-delante[:, 1], delante[:, 0]], axis=1)
    desplazamientos = np.arange(-BUSQUEDA_M, BUSQUEDA_M + 1e-6, 0.25)
    alturas = np.zeros((len(s), len(desplazamientos)))
    verdes = np.zeros_like(alturas, bool)
    for j, o in enumerate(desplazamientos):
        q = pts + normal * o
        alturas[:, j], verdes[:, j] = muestreo.en(q[:, 0], q[:, 1])
    validas = (~verdes) & (alturas >= ALTURA_MIN_M) & (alturas <= ALTURA_MAX_M)
    alturas_validas = np.where(validas, alturas, -1)
    mejor = alturas_validas.argmax(axis=1)
    h = alturas_validas[np.arange(len(s)), mejor]
    es_muro = h > 0
    # Nada de muro donde hay un edificio o un coche aparcado
    if prohibido is not None:
        import shapely
        es_muro &= ~shapely.contains_xy(prohibido, pts[:, 0], pts[:, 1])
    return s, pts, h, desplazamientos[mejor], normal, es_muro


def tramos(s, es_muro):
    """Rachas de muestras de muro, cerrando huecos cortos."""
    hueco = int(round(HUECO_MAX_M / PASO_M))
    marcado = es_muro.copy()
    i = 0
    n = len(marcado)
    while i < n:
        if not marcado[i]:
            j = i
            while j < n and not marcado[j]:
                j += 1
            if 0 < i and j < n and j - i <= hueco:
                marcado[i:j] = True
            i = j
        else:
            i += 1
    rachas = []
    i = 0
    while i < n:
        if marcado[i]:
            j = i
            while j < n and marcado[j]:
                j += 1
            if (j - i) * PASO_M >= TRAMO_MIN_M:
                rachas.append((i, j))
            i = j
        else:
            i += 1
    return rachas


def simplifica(puntos, tolerancia=0.15):
    return list(LineString(puntos).simplify(tolerancia).coords)


def main() -> int:
    config = cargar_config()
    origin = cargar_origin(config)
    processed = dir_processed(config)
    assets = dir_assets(config)
    a_local = lambda e, n, z=None: (e - origin["E_centro"], -(n - origin["N_centro"]))  # noqa: E731

    ruta_osm = dir_raw(config) / "osm_extra" / "zona.osm"
    if not ruta_osm.is_file():
        print("Falta data/raw/osm_extra/zona.osm: ejecuta antes tools/04b_osm_inventario.py")
        return 1
    barreras, deportes, libres, calles_osm = lee_osm(ruta_osm, a_local)
    zona_deportiva = unary_union([d.buffer(3.0) for d in deportes]) if deportes else None
    print(f"OSM: {len(barreras)} barreras, {len(deportes)} zonas deportivas o piscinas")

    print("Leyendo nDSM y ortofoto…")
    ndsm, orto, tr = importlib.import_module("08_arboles").lee_rasters(processed)
    muestreo = Muestreo(ndsm, orto, tr, origin)

    edificios = json.loads((assets / "buildings.geojson").read_text(encoding="utf-8"))["features"]
    huellas = unary_union([shape(f["geometry"]) for f in edificios])
    coches = json.loads((assets / "coches_aparcados.json").read_text(encoding="utf-8"))["coches"]
    cajas = []
    for c in coches:
        fx, fz = np.sin(c["rumbo"]), np.cos(c["rumbo"])
        l, a = c["largo"] / 2 + MARGEN_COCHE_M, c["ancho"] / 2 + MARGEN_COCHE_M
        cajas.append(Polygon([(c["x"] + fx * l * sl + fz * a * sa, c["z"] + fz * l * sl - fx * a * sa)
                              for sl, sa in ((1, 1), (1, -1), (-1, -1), (-1, 1))]))
    prohibido = unary_union([huellas.buffer(MARGEN_EDIFICIO_M), *cajas])

    muros = []
    # 1. OSM
    for b in barreras:
        linea = b["linea"]
        s, pts, h, _, _, es_muro = perfil(linea, muestreo, None)
        medida = float(np.median(h[es_muro])) if es_muro.mean() > 0.5 else None
        altura = b["altura"] or medida or POR_DEFECTO[b["tipo"]]
        muros.append({"t": TIPOS_OSM[b["tipo"]], "h": round(float(np.clip(altura, 0.5, 6.0)), DECIMALES), "f": "osm",
                      "p": [[round(x, DECIMALES), round(z, DECIMALES)] for x, z in linea.coords]})
    lineas_osm = unary_union([b["linea"] for b in barreras]).buffer(1.0) if barreras else None

    # 2. LiDAR a lo largo de los linderos del Catastro
    capa = busca_capa(dir_raw(config) / "catastro", "CATASTPolParcelaUrba")
    if capa is None:
        print("No está la capa de parcelas urbanas del Catastro")
        return 1
    parcelas = gpd.read_file(capa[0])
    a_local_geom = lambda e, n, z=None: a_local(e, n)  # noqa: E731
    linderos = unary_union([transforma(a_local_geom, g).boundary for g in parcelas.geometry if g is not None])
    linderos = linderos.difference(prohibido)
    if lineas_osm is not None:
        linderos = linderos.difference(lineas_osm)
    linderos = linemerge(linderos) if not isinstance(linderos, LineString) else linderos
    partes = list(linderos.geoms) if isinstance(linderos, MultiLineString) else [linderos]
    partes = [p for p in partes if p.length >= TRAMO_MIN_M]
    print(f"Linderos a revisar: {len(partes)} tramos, {sum(p.length for p in partes) / 1000:.1f} km")

    n_lidar = 0
    largo_lidar = 0.0
    for linea in partes:
        s, pts, h, desp, normal, es_muro = perfil(linea, muestreo, prohibido)
        for i, j in tramos(s, es_muro):
            hs = h[i:j][es_muro[i:j]]
            if len(hs) < 4:
                continue
            mediana = float(np.median(hs))
            if np.mean(np.abs(hs - mediana) < 0.35) < REGULARIDAD:
                continue                     # irregular: seto, chatarra, leña…
            # Se lleva el muro a donde está de verdad (el lindero puede ir medio metro al lado)
            o = float(np.median(desp[i:j][es_muro[i:j]]))
            o = float(np.clip(o, -0.5, 0.5))
            puntos = pts[i:j] + normal[i:j] * o
            if len(puntos) < 2:
                continue
            tipo = "muro"
            if zona_deportiva is not None and mediana > VALLA_DEPORTIVA_M and \
                    zona_deportiva.intersects(LineString(puntos)):
                tipo = "valla"
            muros.append({"t": tipo, "h": round(mediana, DECIMALES), "f": "lidar",
                          "p": [[round(x, DECIMALES), round(z, DECIMALES)] for x, z in simplifica(puntos)]})
            n_lidar += 1
            largo_lidar += (j - i) * PASO_M

    # 3. Tapias del casco: linderos sin muro, fuera de la calzada y de los espacios abiertos
    capa_casco = busca_capa(dir_raw(config) / "catastro", "CATASTPolCascoUrbano")
    n_cat, largo_cat, medidas_cat = 0, 0.0, 0
    if capa_casco is None:
        print("No está la capa de casco urbano del Catastro: sin tapias del paso 3")
    else:
        casco = unary_union([transforma(a_local_geom, g) for g in gpd.read_file(capa_casco[0]).geometry if g is not None])
        ya = unary_union([LineString(m["p"]) for m in muros]).buffer(1.0)
        fuera = unary_union([huellas.buffer(0.4), ya, *[c for c in calles_osm], *[l.buffer(1.5) for l in libres]])
        todos = unary_union([transforma(a_local_geom, g).boundary for g in parcelas.geometry if g is not None])
        candidatos = todos.intersection(casco).difference(fuera)
        candidatos = linemerge(candidatos) if not isinstance(candidatos, LineString) else candidatos
        partes3 = list(candidatos.geoms) if hasattr(candidatos, "geoms") else [candidatos]
        for linea in partes3:
            if not isinstance(linea, LineString) or linea.length < TAPIA_TRAMO_MIN_M:
                continue
            s = np.arange(PASO_M / 2, linea.length, PASO_M)
            pts = np.array([linea.interpolate(d).coords[0] for d in s])
            delante = np.array([linea.interpolate(min(d + 0.1, linea.length)).coords[0] for d in s]) -                 np.array([linea.interpolate(max(d - 0.1, 0)).coords[0] for d in s])
            delante /= np.maximum(np.linalg.norm(delante, axis=1, keepdims=True), 1e-6)
            normal = np.stack([-delante[:, 1], delante[:, 0]], axis=1)
            mejor = np.full(len(s), -1.0)
            for o in np.arange(-TAPIA_BUSQUEDA_M, TAPIA_BUSQUEDA_M + 1e-6, 0.25):
                q = pts + normal * o
                h, verde = muestreo.en(q[:, 0], q[:, 1])
                mejor = np.maximum(mejor, np.where((~verde) & (h >= 0.4) & (h <= ALTURA_MAX_M), h, -1.0))
            vistas = mejor > 0
            if vistas.mean() >= TAPIA_MEDIDA_MIN:
                altura = float(np.clip(np.median(mejor[vistas]), 1.0, 3.5))
                medidas_cat += 1
            else:
                altura = TAPIA_POR_DEFECTO_M
            muros.append({"t": "muro", "h": round(altura, DECIMALES), "f": "catastro",
                          "p": [[round(x, DECIMALES), round(z, DECIMALES)] for x, z in simplifica(list(linea.coords), 0.1)]})
            n_cat += 1
            largo_cat += linea.length
        print(f"Tapias del casco (Catastro): {n_cat} tramos, {largo_cat / 1000:.2f} km "
              f"({medidas_cat} con altura del LiDAR, el resto {TAPIA_POR_DEFECTO_M} m)")

    (assets / "muros.json").write_text(json.dumps({
        "sistema": "local: x este, z sur (m); h = altura sobre el terreno (m)",
        "fuentes": "OpenStreetMap (ODbL) barrier=*; LiDAR PNOA 2024 (nDSM) en linderos del Catastro de Navarra; "
                    "tapias del casco: linderos del Catastro de Navarra sin edificio",
        "muros": muros}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    por_tipo = {}
    for m in muros:
        por_tipo[m["t"]] = por_tipo.get(m["t"], 0) + 1
    print(f"Muros: {len(muros)} ({n_lidar} del LiDAR, {largo_lidar / 1000:.2f} km; {n_cat} del Catastro; "
          f"{len(muros) - n_lidar - n_cat} de OSM) · por tipo {por_tipo}")

    lienzo = Lienzo(origin, 1, fondo=Image.open(dir_previews(config) / "orto.jpg"))
    colores = {"muro": (255, 60, 40, 255), "valla": (60, 200, 255, 255), "contencion": (255, 200, 0, 255)}
    for m in muros:
        borde = (255, 120, 220, 255) if m["f"] == "catastro" else colores[m["t"]]
        lienzo.geometria(LineString(m["p"]), borde=borde, ancho=2 if m["f"] != "osm" else 3)
    lienzo.img.save(dir_previews(config) / "muros.png")
    return 0


if __name__ == "__main__":
    sys.exit(main())
