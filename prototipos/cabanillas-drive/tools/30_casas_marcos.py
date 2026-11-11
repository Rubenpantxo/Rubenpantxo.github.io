"""Casas a mano — localiza casas por calle y número y da su marco para src/datos/casas*.js.

Sirve para modelar fachadas a partir de fotos de calle (skill «fachadas-cabanillas»): con la
calle y los números de las fotos busca cada casa en OSM (addr:street + addr:housenumber), las
huellas del Catastro que la forman (buildings.geojson) y el eje de la calle, y calcula el marco
de la casa en el sistema de src/escena/casas.js:

  origen  esquina de la fachada a la IZQUIERDA de quien la mira desde la calle (x, z locales)
  eje     dirección de u (a la DERECHA de quien la mira); w = (eje_z, −eje_x) va hacia dentro
  ancho   de la fachada (m) y fondo del cuerpo principal

Además dice el lado de la calle (hacia dónde mira la fachada), el orden de las casas a lo largo
de la calle (para casar fotos con números), qué huellas del Catastro sustituir y cuáles dejar
(cobertizos del fondo), si dos números comparten huella (hay que modelarlas juntas en una fila)
y si alguna ya está modelada en src/datos/casas*.js.

Uso (desde la carpeta del prototipo):
  python tools/30_casas_marcos.py --calle "Juan XXIII" 10 16 18
  python tools/30_casas_marcos.py --calle "las Eras" --listar           # todas las de la calle
  python tools/30_casas_marcos.py --calle "Juan XXIII" 51 53 --juntas    # una fila con las dos
  python tools/30_casas_marcos.py --calle "las Eras" 6 --catastro 6=160,96,354
  python tools/30_casas_marcos.py --calle "Juan XXIII" 10 --esqueleto    # bloque fila(...) para pegar
  python tools/30_casas_marcos.py --calle "San Roque" 50 --json salida.json

Con conda: usar directamente el python del entorno (conda run falla con argumentos con saltos de
línea): C:/Users/RUBEN/miniforge3/envs/cabdrive/python.exe tools/30_casas_marcos.py …
"""
from __future__ import annotations

import argparse
import importlib
import json
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
from shapely.geometry import LineString, Point, Polygon, shape
from shapely.ops import nearest_points, unary_union

from comun import cargar_config, cargar_origin, dir_assets, dir_raw

FONDO_MAX_M = 14.0          # fondo que se modela (lo de detrás no se ve desde la calle)
FRENTE_M = 2.0              # huellas cuyo frente está a menos de esto del frente de la casa
PARTE_MIN = 0.3             # fracción de la huella que debe caer en la parcela de OSM
RAIZ = Path(__file__).resolve().parent.parent


def normaliza(t: str) -> str:
    t = unicodedata.normalize("NFD", t or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"\b(calle|c/|plaza|pl\.|avenida|av\.|carretera|ctra\.|de|del|la|las|el|los)\b", " ", t).strip()


def r(v, n=2):
    return round(float(v), n)


def cargar(config, origin):
    assets = dir_assets(config)
    el = importlib.import_module("15_osm_elementos")
    a_local = lambda e, n: (e - origin["E_centro"], -(n - origin["N_centro"]))  # noqa: E731
    nodos, etiquetas, vias = el.lee_osm(dir_raw(config) / "osm_extra" / "zona.osm", a_local)
    edificios = {f["properties"]["id"]: (shape(f["geometry"]), f["properties"])
                 for f in json.loads((assets / "buildings.geojson").read_text(encoding="utf-8"))["features"]}
    return nodos, etiquetas, vias, edificios


def ya_modeladas():
    """{id del Catastro: nombre de la fila} de las casas ya hechas en src/datos/casas*.js."""
    hechas = {}
    for ruta in sorted((RAIZ / "src" / "datos").glob("casas*.js")):
        texto = ruta.read_text(encoding="utf-8")
        for m in re.finditer(r"fila\('([^']+)'[^\n]*?\[([\d,\s]+)\]\s*,\s*\[", texto):
            for i in re.findall(r"\d+", m.group(2)):
                hechas[int(i)] = f"{ruta.name}:{m.group(1)}"
        for m in re.finditer(r"nombre:\s*'([^']+)'[\s\S]{0,400}?edificios:\s*\[([\d,\s]+)\]", texto):
            for i in re.findall(r"\d+", m.group(2)):
                hechas.setdefault(int(i), f"{ruta.name}:{m.group(1)}")
        m = re.search(r"EDIFICIOS_SAN_ISIDRO\s*=\s*\[([\d,\s]+)\]", texto)
        if m:
            for i in re.findall(r"\d+", m.group(1)):
                hechas[int(i)] = f"{ruta.name}:san_isidro"
    return hechas


def marco(pol_fachada, ejes_calle):
    """Origen, eje, normal hacia dentro y distancia al eje de la calle de un polígono."""
    q = nearest_points(unary_union(ejes_calle), pol_fachada)[0]
    lin = min(ejes_calle, key=lambda l: l.distance(q))
    s = lin.project(q)
    a, b = lin.interpolate(max(0, s - 3)), lin.interpolate(min(lin.length, s + 3))
    t = np.array([b.x - a.x, b.y - a.y]); t /= np.linalg.norm(t)
    c = np.array([q.x, q.y])
    n = np.array([-t[1], t[0]])
    if (np.array(pol_fachada.centroid.coords[0]) - c) @ n < 0:
        n = -n
    pts = np.vstack([np.array(g.exterior.coords) for g in getattr(pol_fachada, "geoms", [pol_fachada])])
    d = (pts - c) @ n
    d0 = d.min()
    e = np.array([-n[1], n[0]])                                  # W = (e_z, −e_x) = n
    u = (pts - c) @ e
    origen = c + e * u.min() + n * d0
    return origen, e, n, float(d0)


def en_marco(origen, e, n, p):
    v = np.asarray(p) - origen
    return float(v @ e), float(v @ n)


def rumbo(n):
    """Hacia dónde mira la fachada (contraria a la normal hacia dentro)."""
    mira = -n                                                      # x este, z sur
    a = (np.degrees(np.arctan2(mira[0], -mira[1])) + 360) % 360    # 0 = norte, 90 = este
    nombres = ["norte", "noreste", "este", "sureste", "sur", "suroeste", "oeste", "noroeste"]
    return nombres[int(((a + 22.5) % 360) // 45)]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--calle", required=True, help="nombre (o parte) de la calle, sin tildes ni «Calle»")
    ap.add_argument("numeros", nargs="*", help="números de portal")
    ap.add_argument("--listar", action="store_true", help="lista todas las casas con número de la calle, en orden")
    ap.add_argument("--juntas", action="store_true", help="una sola fila para todos los números (comparten huella o son contiguas)")
    ap.add_argument("--catastro", action="append", default=[], help="NUM=id,id fuerza las huellas del Catastro de un número")
    ap.add_argument("--esqueleto", action="store_true", help="imprime un bloque fila(...) para src/datos/casasCalles.js")
    ap.add_argument("--json", help="guarda el resultado en este archivo")
    args = ap.parse_args()

    config = cargar_config()
    origin = cargar_origin(config)
    nodos, _, vias, edificios = cargar(config, origin)
    clave = normaliza(args.calle)

    calles = {}
    for v in vias:
        t = v["tags"]
        # (sin las áreas peatonales cerradas de las plazas: su contorno toca las fachadas)
        cerrada = len(v["refs"]) > 3 and v["refs"][0] == v["refs"][-1] and t.get("area") == "yes"
        if t.get("highway") and t.get("name") and clave in normaliza(t["name"]) and len(v["refs"]) > 1 and not cerrada:
            calles.setdefault(t["name"], []).append(LineString([nodos[x] for x in v["refs"]]))
    casas = {}
    for v in vias:
        t = v["tags"]
        if "addr:housenumber" in t and clave in normaliza(t.get("addr:street", "")) and len(v["refs"]) > 3:
            casas[(t["addr:street"], t["addr:housenumber"])] = Polygon([nodos[x] for x in v["refs"]]).buffer(0)
    if not calles:
        print(f"No hay ninguna calle en OSM que contenga «{args.calle}».")
        return 1
    nombres = sorted(calles)
    if len(nombres) > 1:
        print("Ojo, varias calles coinciden:", ", ".join(nombres), "— se usa", nombres[0])
    nombre_calle = nombres[0]
    ejes = calles[nombre_calle]
    casas = {k[1]: p for k, p in casas.items() if k[0] == nombre_calle}

    # Orden a lo largo de la calle (dirección principal de su eje) y hacia dónde mira cada casa,
    # para casar las fotos con los números
    eje_union = unary_union(ejes)
    puntos_eje = np.vstack([np.array(l.coords) for l in ejes])
    media = puntos_eje.mean(axis=0)
    # dirección principal sin np.linalg (su BLAS revienta en el entorno cabdrive de Windows)
    dx, dz = (puntos_eje - media).T
    ang = 0.5 * np.arctan2(2 * (dx * dz).sum(), (dx * dx).sum() - (dz * dz).sum())
    direccion = np.array([np.cos(ang), np.sin(ang)])

    def lugar(p):
        q = nearest_points(eje_union, p.centroid)[0]
        hacia_dentro = np.array([p.centroid.x - q.x, p.centroid.y - q.y])
        return float((np.array(p.centroid.coords[0]) - media) @ direccion), rumbo(hacia_dentro / (np.linalg.norm(hacia_dentro) or 1))

    if args.listar:
        print(f"{nombre_calle}: {len(casas)} casas con número en OSM, en orden a lo largo de la calle")
        for num, p in sorted(casas.items(), key=lambda kv: lugar(kv[1])[0]):
            s, mira = lugar(p)
            print(f"  {num:>5}  s={s:7.1f} m  fachada al {mira:9s} ({r(p.centroid.x, 1)}, {r(p.centroid.y, 1)})")
        if not args.numeros:
            return 0

    forzadas = {}
    for f in args.catastro:
        num, ids = f.split("=")
        forzadas[num] = [int(x) for x in ids.split(",")]
    hechas = ya_modeladas()

    def huellas(num):
        if num in forzadas:
            return forzadas[num], []
        pol = casas[num]
        cand = [(i, g) for i, (g, pr) in edificios.items() if g.area > 3 and g.intersection(pol).area > PARTE_MIN * g.area]
        if not cand:
            return [], []
        dist = {i: g.distance(eje_union) for i, g in cand}
        dmin = min(dist.values())
        delante = [i for i, _ in cand if dist[i] <= dmin + FRENTE_M]
        detras = [i for i, _ in cand if i not in delante]
        return delante, detras

    faltan = [n for n in args.numeros if n not in casas and n not in forzadas]
    for n in faltan:
        print(f"FALTA {nombre_calle} {n} en OSM. Números de la calle: {', '.join(sorted(casas, key=lambda x: (len(x), x)))}")
    numeros = [n for n in args.numeros if n not in faltan]
    grupos = [numeros] if args.juntas else [[n] for n in numeros]

    # Números que comparten huella: avisar (se modelan juntos en una fila)
    uso = {}
    for n in numeros:
        for i in huellas(n)[0]:
            uso.setdefault(i, []).append(n)
    compartidas = {i: ns for i, ns in uso.items() if len(ns) > 1}

    salida = []
    for grupo in grupos:
        ids, atras = [], []
        for n in grupo:
            d, a = huellas(n)
            ids += [i for i in d if i not in ids]
            atras += [i for i in a if i not in atras]
        if not ids:
            print(f"{grupo}: sin huellas del Catastro (usa --catastro NUM=id,...)")
            continue
        pol = unary_union([edificios[i][0] for i in ids])
        origen, e, nn, d0 = marco(pol, ejes)
        partes = []
        for i in ids:
            ps = [en_marco(origen, e, nn, p) for p in edificios[i][0].exterior.coords]
            partes.append({"id": i, "alto": edificios[i][1]["height"], "plantas": edificios[i][1]["plantas"],
                           "tipo": edificios[i][1]["tipo"], "u": [r(min(p[0] for p in ps)), r(max(p[0] for p in ps))],
                           "w": [r(min(p[1] for p in ps)), r(max(p[1] for p in ps))]})
        ancho = max(p["u"][1] for p in partes)
        # Una casa: todo el frente de su huella. Varias: se reparten el frente por el centro de
        # sus parcelas de OSM, en tramos seguidos de 0 al ancho
        if len(grupo) == 1:
            tramos = [{"numero": grupo[0], "u": [0.0, r(ancho)]}]
        else:
            centros = []
            for n in grupo:
                ps = [en_marco(origen, e, nn, p) for p in casas[n].exterior.coords] if n in casas else []
                frente = [p[0] for p in ps if p[1] < 2.5] or [p[0] for p in ps]
                centros.append(((min(frente) + max(frente)) / 2 if frente else 0.0, n, frente))
            centros.sort()
            cortes = [0.0]
            for (_, _, fa), (_, _, fb) in zip(centros[:-1], centros[1:]):
                cortes.append((max(fa) + min(fb)) / 2 if fa and fb else cortes[-1] + ancho / len(grupo))
            cortes.append(ancho)
            tramos = [{"numero": n, "u": [r(max(0.0, cortes[k])), r(min(ancho, cortes[k + 1]))]} for k, (_, n, _) in enumerate(centros)]
        fondo = min(FONDO_MAX_M, max(p["w"][1] for p in partes))
        nombre = re.sub(r"[^a-z0-9]+", "_", normaliza(nombre_calle)).strip("_") + "_" + "_".join(grupo)
        res = {"fila": nombre, "calle": nombre_calle, "numeros": grupo, "origen": [r(origen[0]), r(origen[1])],
               "eje": [r(e[0], 5), r(e[1], 5)], "ancho": r(ancho), "fondo": r(fondo, 1), "mira_al": rumbo(nn),
               "eje_calle_a_fachada": r(d0), "edificios": ids, "se_quedan_detras": atras, "partes": partes, "casas": tramos,
               "ya_modeladas": {i: hechas[i] for i in ids if i in hechas}}
        salida.append(res)

        print(f"\n== {nombre_calle} {'+'.join(grupo)}  (fila '{nombre}')")
        print(f"   origen {res['origen']}  eje {res['eje']}  ancho {res['ancho']} m  fondo {res['fondo']} m  "
              f"mira al {res['mira_al']}  eje de la calle a {res['eje_calle_a_fachada']} m de la fachada")
        for p in partes:
            print(f"   Catastro {p['id']:>5}: {p['alto']} m, {p['plantas']} pl., {p['tipo']}, u {p['u']}, w {p['w']}")
        if atras:
            print(f"   se quedan (fondo/patio): {atras}")
        if len(grupo) > 1:
            for tr in tramos:
                print(f"   nº {tr['numero']}: u {tr['u']} (reparto por las parcelas de OSM; ajustar con las fotos)")
        if res["ya_modeladas"]:
            print(f"   ¡YA MODELADA! {res['ya_modeladas']}")
    if compartidas:
        print("\nOjo: huellas compartidas entre números (modelarlos juntos con --juntas):",
              "; ".join(f"{i}: {', '.join(ns)}" for i, ns in compartidas.items()))

    if args.esqueleto:
        print("\n// ---- para src/datos/casasCalles.js (dentro de FILAS_CALLES) ----")
        for res in salida:
            casas_js = []
            for tr in res["casas"]:
                a, b = tr["u"]
                alto = 6.3 if max(p["plantas"] for p in res["partes"]) >= 2 else 3.6
                casas_js.append(
                    f"  {{\n    numero: {tr['numero']}, u: [{a}, {b}],\n"
                    f"    cuerpos: [{{ u: [{a}, {b}], w: [0, {res['fondo']}], alto: {alto}, mat: 'enfoscado', color: BLANCO,\n"
                    f"      huecos: [] }}],\n"
                    f"    tejados: [tejado([{a}, {b}], [0, {res['fondo']}], {alto})],\n  }}")
            print(f"  // {res['calle']} {'+'.join(res['numeros'])}: …\n"
                  f"  fila('{res['fila']}', {res['origen']}, {res['eje']}, {res['ancho']}, {res['edificios']}, [\n"
                  + ",\n".join(casas_js) + "\n  ]),")
    if args.json:
        Path(args.json).write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"\nGuardado en {args.json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
