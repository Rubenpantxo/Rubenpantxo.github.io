"""Calzada de ancho variable para las calles con aparcamiento en los dos lados, común a
11_suelo.py (asfalto, acera y bordillo nítido) y 16_marcas_viales.py (bordillos y pasos).

En esas calles la media calzada fija (3 m) dejaba los coches aparcados encima de la acera: la
calzada llega hasta `acera` metros de las fachadas, vallas y parcelas de cada lado, y la acera
rellena ese hueco hasta ellas. Donde no hay nada cerca (cruces, solares) se queda la media
calzada normal.
"""
from __future__ import annotations

import importlib
import json
import math

import numpy as np
from scipy import ndimage
from shapely import STRtree
from shapely.geometry import LineString, MultiLineString, Point, Polygon, shape
from shapely.ops import unary_union

from comun import dir_raw

# Calle (id de OSM) → ancho de acera a cada lado [izquierda, derecha] según el sentido de la vía.
# San Isidro va de oeste a este: izquierda = sur, derecha = norte (la acera norte llega hasta el
# borde de fuera de los alcorques de los árboles de bola, 2 m desde las vallas)
AJUSTES = {
    "314836559": {"nombre": "Calle San Isidro", "acera": [1.8, 2.0]},
}
PASO_M = 1.0
ALCANCE_M = 14.0
MARGEN_COCHE_M = 0.25
MAX_DESPLAZAMIENTO_M = 1.25


def id_osm(valor):
    return str(valor).lstrip("w")


def obstaculos(assets, config, origin):
    """Fachadas, parcelas y tapias: edificios del Catastro, casas de OSM y muros.json."""
    geoms = [shape(f["geometry"]) for f in json.loads((assets / "buildings.geojson").read_text(encoding="utf-8"))["features"]]
    ruta = assets / "muros.json"
    if ruta.is_file():
        for m in json.loads(ruta.read_text(encoding="utf-8"))["muros"]:
            if m.get("h", 0) >= 0.5 and len(m["p"]) >= 2:
                geoms.append(LineString(m["p"]).buffer(0.1))
    osm = dir_raw(config) / "osm_extra" / "zona.osm"
    if osm.is_file():
        el = importlib.import_module("15_osm_elementos")
        a_local = lambda e, n: (e - origin["E_centro"], -(n - origin["N_centro"]))  # noqa: E731
        nodos, _, vias = el.lee_osm(osm, a_local)
        for v in vias:
            if "building" in v["tags"] and len(v["refs"]) >= 4:
                pol = Polygon([nodos[r] for r in v["refs"]])
                if pol.is_valid and pol.area < 2000:
                    geoms.append(pol)
    return geoms


def _suaviza(v, base, ventana_min, ventana_med, ventana_media):
    v = np.where(np.isnan(v), np.inf, v)
    v = ndimage.minimum_filter1d(v, ventana_min, mode="nearest")
    v = np.where(np.isinf(v), base, v)
    v = ndimage.median_filter(v, ventana_med, mode="nearest")
    return ndimage.uniform_filter1d(v, ventana_media, mode="nearest")


class CalzadaVariable:
    def __init__(self, linea, media, acera, geoms):
        self.linea = linea
        n = max(2, int(math.ceil(linea.length / PASO_M)) + 1)
        self.s = np.linspace(0, linea.length, n)
        pts = [linea.interpolate(s) for s in self.s]
        self.p = np.array([[q.x, q.y] for q in pts])
        t = np.gradient(self.p, axis=0)
        t /= np.linalg.norm(t, axis=1, keepdims=True)
        self.normal = np.stack([-t[:, 1], t[:, 0]], axis=1)       # izquierda del sentido de la vía
        arbol = STRtree(geoms)
        self.bordillo = []
        self.fachada = []
        for k, lado in enumerate((1, -1)):
            f = np.full(n, np.nan)
            for i in range(n):
                a = self.p[i]
                b = a + self.normal[i] * lado * ALCANCE_M
                rayo = LineString([a, b])
                for j in arbol.query(rayo):
                    g = geoms[j]
                    cruce = rayo.intersection(g)
                    if not cruce.is_empty:
                        d = Point(a).distance(cruce)
                        if d > media * 0.8 and (np.isnan(f[i]) or d < f[i]):
                            f[i] = d
            fach = _suaviza(f, np.nan, 5, 1, 1)
            borde = np.maximum(media, np.where(np.isnan(f), media, f - acera[k]))
            borde = _suaviza(np.where(np.isnan(f), np.nan, borde), media, 5, 13, 7)
            borde = np.maximum(borde, media)
            self.bordillo.append(borde)
            self.fachada.append(np.where(np.isnan(fach), borde + acera[k], np.maximum(fach, borde + 0.3)))

    def _franja(self, lado, d0, d1):
        k = 0 if lado > 0 else 1
        a = self.p + self.normal * lado * d0[:, None]
        b = self.p + self.normal * lado * d1[:, None]
        pol = Polygon(np.vstack([a, b[::-1]]))
        return pol if pol.is_valid else pol.buffer(0)

    def calzada(self):
        cero = np.zeros(len(self.s))
        return unary_union([self._franja(1, cero, self.bordillo[0]), self._franja(-1, cero, self.bordillo[1])])

    def acera(self):
        return unary_union([self._franja(1, self.bordillo[0], self.fachada[0]), self._franja(-1, self.bordillo[1], self.fachada[1])])

    def bordillo_en(self, x, z):
        """(lado, distancia al eje, bordillo de ese lado) en el punto más cercano del eje."""
        q = Point(x, z)
        s = self.linea.project(q)
        i = int(np.clip(round(s / (self.s[1] - self.s[0])), 0, len(self.s) - 1))
        d = np.array([x, z]) - self.p[i]
        lateral = float(d @ self.normal[i])
        lado = 1 if lateral > 0 else -1
        return lado, abs(lateral), float(self.bordillo[0 if lado > 0 else 1][i]), i


def calzadas_variables(calles, medias, assets, config, origin):
    """{id: CalzadaVariable} para las calles de AJUSTES presentes en `calles` (lista de
    (id, LineString, tipo))."""
    elegidas = [(i, l, t) for i, l, t in calles if id_osm(i) in AJUSTES]
    if not elegidas:
        return {}
    geoms = obstaculos(assets, config, origin)
    salida = {}
    for i, linea, tipo in elegidas:
        cv = CalzadaVariable(linea, medias.get(tipo, 3.0), AJUSTES[id_osm(i)]["acera"], geoms)
        salida[id_osm(i)] = cv
        print(f"  calzada variable {AJUSTES[id_osm(i)]['nombre']}: bordillo {cv.bordillo[0].min():.1f}–{cv.bordillo[0].max():.1f} m (izq.), "
              f"{cv.bordillo[1].min():.1f}–{cv.bordillo[1].max():.1f} m (der.)")
    return salida


def recoloca_coches(assets, variables):
    """Mete en la calzada los coches aparcados que pisaban la acera de esas calles (desplaza el
    coche hacia el eje hasta MARGEN_COCHE_M del bordillo). Idempotente."""
    ruta = assets / "coches_aparcados.json"
    if not variables or not ruta.is_file():
        return 0
    datos = json.loads(ruta.read_text(encoding="utf-8"))
    movidos = 0
    for c in datos["coches"]:
        for cv in variables.values():
            if cv.linea.distance(Point(c["x"], c["z"])) > 8:
                continue
            lado, d, borde, i = cv.bordillo_en(c["x"], c["z"])
            # medio ancho del coche medido a lo ancho de la calle (según su rumbo)
            n = cv.normal[i]
            fx, fz = math.sin(c["rumbo"]), math.cos(c["rumbo"])
            ancho = abs(fx * n[0] + fz * n[1]) * c["largo"] / 2 + abs(-fz * n[0] + fx * n[1]) * c["ancho"] / 2
            exceso = d + ancho - (borde - MARGEN_COCHE_M)
            # Arrimado al bordillo (hacia dentro si pisaba la acera, hacia fuera si quedaba
            # separado). Más de MAX_DESPLAZAMIENTO_M: está en un vado o un patio (o el eje de
            # OSM va descentrado), o circulando por el centro; se deja donde lo vio la foto
            if abs(exceso) > 0.02 and abs(exceso) <= MAX_DESPLAZAMIENTO_M and d > ancho:
                c["x"] = round(c["x"] - n[0] * lado * exceso, 2)
                c["z"] = round(c["z"] - n[1] * lado * exceso, 2)
                movidos += 1
    ruta.write_text(json.dumps(datos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  coches aparcados metidos en la calzada: {movidos}")
    return movidos
