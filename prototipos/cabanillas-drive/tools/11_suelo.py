"""Paso R3.5 — Detalle del suelo de cerca: qué es cada metro (calzada, acera, tierra) y
texturas de detalle para quitar lo borroso de la ortofoto a ras de suelo.

- tipos.png (0,5 m/px, fila 0 = norte): R = calzada (calles OSM con media calzada según el
  tipo de vía), G = acera (franja de 1,8 m a cada lado, más calles peatonales y senderos
  urbanos), B = tierra (caminos agrícolas sin asfaltar). Suavizado para que no haya escalones.
- asfalto.png, baldosa.png, tierra.png: detalle en gris (128 = sin cambio), que el juego
  multiplica sobre el color de la ortofoto solo cerca de la cámara. Salen de las texturas
  CC0 de ambientCG descargadas en <raw>/externos/texturas/ (color × oclusión, en gris y
  normalizado a su media: la foto pone el color); si no están, se dibujan aquí.

Requiere 04_osm.py y 08_arboles.py (anchos de calzada).

Salidas: <assets>/suelo/{tipos.png, asfalto.png, baldosa.png, tierra.png, suelo.json}

Uso: conda run -n cabdrive python tools/11_suelo.py
"""
from __future__ import annotations

import importlib
import json
import sys

import numpy as np
import shapely
from affine import Affine
from PIL import Image
from rasterio.features import rasterize
from scipy import ndimage
from shapely.geometry import LineString, shape
from shapely.ops import unary_union

import math

import zipfile

import calzadas
from comun import cargar_config, cargar_origin, dir_assets, dir_raw

PASO_M = 0.5
ACERA_M = 1.8
ANCHO_CAMINO_M = 4.0        # caminos agrícolas de tierra
DIST_CASCO_M = 25.0         # como en 16_marcas_viales.py: casco = a menos de 25 m de un edificio
TRAVESIA = ("primary",)     # carretera dentro del casco: con arcén de aparcamiento
MEDIA_TRAVESIA_M = 6.0      # del eje al bordillo (carril 3,75 + aparcamiento 2,25); igual en 16_marcas_viales.py
RANGO_BORDILLO_M = 3.0      # bordillo.png: distancia al borde de la calzada de −3 a +3 m
LADO_TEX = 512
METROS_TEX = {"asfalto": 4.0, "baldosa": 2.0, "tierra": 4.0}   # texturas dibujadas: metros que cubren
# Texturas de ambientCG (CC0): archivo y metros reales que cubre cada una
EXTERNAS = {
    "asfalto": ("Asphalt031", 2.0, 1.0),
    "baldosa": ("PavingStones136", 1.6, 1.0),     # 4×4 baldosas de 40 cm
    "tierra": ("Ground109", 2.5, 0.8),
}                                                 # (id, metros, fuerza del contraste)


def ruido(lado, sigma, r):
    """Ruido suave y periódico (se repite sin costuras)."""
    n = r.normal(0, 1, (lado, lado))
    return ndimage.gaussian_filter(n, sigma, mode="wrap")


def normaliza(v, contraste):
    v = (v - v.mean()) / (v.std() + 1e-9)
    return np.clip(128 + v * contraste, 0, 255).astype(np.uint8)


def textura_asfalto(r):
    grano = ruido(LADO_TEX, 0.6, r) * 1.0 + ruido(LADO_TEX, 2.5, r) * 0.6 + ruido(LADO_TEX, 18, r) * 0.5
    # piedrecillas claras sueltas
    piedras = (r.random((LADO_TEX, LADO_TEX)) > 0.985).astype(float)
    piedras = ndimage.gaussian_filter(piedras, 0.7, mode="wrap") * 6
    return normaliza(grano + piedras, 24)


def textura_baldosa(r):
    """Baldosa hidráulica de 33 cm (la de las aceras de la Ribera): juntas y leve relieve."""
    lado = LADO_TEX
    n = 6                                                     # 6 baldosas en 2 m
    y, x = np.mgrid[0:lado, 0:lado] / lado * n
    fx, fy = x % 1, y % 1
    junta = np.minimum(np.minimum(fx, 1 - fx), np.minimum(fy, 1 - fy))
    surco = 1 - np.clip(junta / 0.035, 0, 1)
    tono = r.normal(0, 1, (n, n))[y.astype(int) % n, x.astype(int) % n]
    # dibujo de pastillas (relieve típico de 4×4 cuadraditos)
    px, py = (x * 4) % 1, (y * 4) % 1
    pastilla = (np.abs(px - 0.5) < 0.32) & (np.abs(py - 0.5) < 0.32)
    v = tono * 0.35 + ruido(lado, 1.0, r) * 0.5 + pastilla * 0.5 - surco * 3.0
    return normaliza(v, 18)


def textura_tierra(r):
    v = ruido(LADO_TEX, 1.2, r) * 0.8 + ruido(LADO_TEX, 6, r) * 0.8 + ruido(LADO_TEX, 30, r) * 0.6
    guijarros = (r.random((LADO_TEX, LADO_TEX)) > 0.992).astype(float)
    guijarros = ndimage.gaussian_filter(ndimage.binary_dilation(guijarros, iterations=2).astype(float), 1.0, mode="wrap")
    return normaliza(v + guijarros * 2.5, 22)


def textura_externa(carpeta, id_, fuerza):
    """Detalle en gris de una textura de ambientCG: color × oclusión, normalizado a 128."""
    zip_ = carpeta / f"{id_}_1K-JPG.zip"
    if not zip_.is_file():
        return None
    with zipfile.ZipFile(zip_) as z:
        def lee(sufijo, modo):
            with z.open(f"{id_}_1K-JPG_{sufijo}.jpg") as f:
                return np.asarray(Image.open(f).convert(modo).resize((LADO_TEX, LADO_TEX), Image.LANCZOS), np.float32)
        color = lee("Color", "RGB")
        try:
            ao = lee("AmbientOcclusion", "L") / 255
        except KeyError:
            ao = np.ones(color.shape[:2], np.float32)
    lum = (color @ np.array([0.2126, 0.7152, 0.0722], np.float32)) * ao
    rel = lum / lum.mean()
    return np.clip(128 * (1 + (rel - 1) * fuerza), 0, 255).astype(np.uint8)


def colores_orto(assets, filas, columnas, mascaras):
    """Mediana sRGB de la ortofoto (a 0,5 m/px) en cada máscara, quitando lo oscuro (sombras,
    coches) y lo muy claro (pintura): del percentil 35 al 85 de luminancia."""
    meta = json.loads((assets / "orto" / "orto.json").read_text(encoding="utf-8"))
    th, tw = meta["tesela_px"][1], meta["tesela_px"][0]
    foto = np.zeros((meta["filas"] * th, meta["columnas"] * tw, 3), np.uint8)
    for t in meta["teselas"]:
        foto[t["fila"] * th:(t["fila"] + 1) * th, t["col"] * tw:(t["col"] + 1) * tw] = \
            np.asarray(Image.open(assets / "orto" / t["archivo"]).convert("RGB"))
    foto = np.asarray(Image.fromarray(foto).resize((columnas, filas), Image.BILINEAR)).astype(np.float32)
    luz = foto @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    salida = {}
    for nombre, m in mascaras.items():
        if m.sum() < 100:
            continue
        l = luz[m]
        sel = (l >= np.percentile(l, 35)) & (l <= np.percentile(l, 85))
        salida[nombre] = [int(v) for v in np.median(foto[m][sel], axis=0)]
    print("  colores de la foto:", salida)
    return salida


def distancia_bordillo(calzada_v, calzada, acera, filas, columnas, origin):
    """bordillo.png (gris): 128 + 127 · d / RANGO_BORDILLO_M, con d la distancia con signo al
    borde de la calzada (+ dentro). Exacta (vector) en la franja junto a las aceras; fuera de
    ella solo el signo, saturado."""
    signo = np.where(calzada, 1.0, -1.0)
    franja = ndimage.binary_dilation(acera, iterations=int(RANGO_BORDILLO_M / PASO_M) + 2)
    franja &= ndimage.binary_dilation(calzada, iterations=int(RANGO_BORDILLO_M / PASO_M) + 2)
    franja &= ndimage.binary_dilation(~calzada, iterations=int(RANGO_BORDILLO_M / PASO_M) + 2)
    iy, ix = np.nonzero(franja)
    x = -origin["ancho"] / 2 + (ix + 0.5) * PASO_M
    z = -origin["alto"] / 2 + (iy + 0.5) * PASO_M
    borde = calzada_v.boundary
    tramos = [LineString(c) for g in getattr(borde, "geoms", [borde]) for c in zip(g.coords[:-1], g.coords[1:])]
    arbol = shapely.STRtree(tramos)
    puntos = shapely.points(x, z)
    (cual, _), dist = arbol.query_nearest(puntos, max_distance=RANGO_BORDILLO_M + 1, return_distance=True, all_matches=False)
    d = np.full(len(puntos), RANGO_BORDILLO_M + 1.0)
    d[cual] = dist
    shapely.prepare(calzada_v)
    dentro = shapely.contains_xy(calzada_v, x, z)
    d = np.where(dentro, d, -d)
    total = signo * (RANGO_BORDILLO_M + 1.0)
    total[iy, ix] = d
    print(f"  bordillo: {len(puntos)} píxeles con distancia exacta")
    return np.clip(np.round(128 + 127 * total / RANGO_BORDILLO_M), 0, 255).astype(np.uint8)


def main() -> int:
    config = cargar_config()
    origin = cargar_origin(config)
    assets = dir_assets(config)
    salida = assets / "suelo"
    salida.mkdir(parents=True, exist_ok=True)
    # Anchos de 08_arboles.py, con el ramal de la carretera como en 15/16 (el bordillo sale de allí)
    medias = {**importlib.import_module("08_arboles").MEDIA_CALZADA_M, "primary_link": 3.5}

    columnas, filas = int(origin["ancho"] / PASO_M), int(origin["alto"] / PASO_M)
    local = Affine(PASO_M, 0, -origin["ancho"] / 2, 0, PASO_M, -origin["alto"] / 2)

    def capa(nombre):
        return json.loads((assets / nombre).read_text(encoding="utf-8"))["features"]

    def mascara(formas):
        formas = [(f, 1) for f in formas if not f.is_empty]
        return rasterize(formas, out_shape=(filas, columnas), transform=local, fill=0, dtype="uint8") > 0 if formas \
            else np.zeros((filas, columnas), bool)

    calles = capa("osm/calles.geojson")
    caminos = capa("osm/caminos.geojson")
    edificios = [shape(f["geometry"]) for f in capa("buildings.geojson")]
    casco = mascara([unary_union([e.buffer(DIST_CASCO_M) for e in edificios])])
    # Calles con aparcamiento a los dos lados (calzadas.py): calzada hasta cerca de las fachadas
    variables = calzadas.calzadas_variables(
        [(f["properties"].get("id"), shape(f["geometry"]), f["properties"].get("tipo")) for f in calles
         if shape(f["geometry"]).geom_type == "LineString"], medias, assets, config, origin)

    def forma_calzada(f):
        cv = variables.get(calzadas.id_osm(f["properties"].get("id")))
        return cv.calzada() if cv else shape(f["geometry"]).buffer(medias.get(f["properties"].get("tipo"), 3.0), cap_style="flat")
    formas_calzada = [forma_calzada(f) for f in calles if medias.get(f["properties"].get("tipo"), 3.0) > 0]
    calzada = mascara(formas_calzada)
    # Travesía: en el casco la carretera lleva arcén de aparcamiento a cada lado (coches a 4,6 m
    # del eje, fachadas a ~8 m): calzada hasta MEDIA_TRAVESIA_M y la acera detrás
    travesia = [shape(f["geometry"]) for f in calles if f["properties"].get("tipo") in TRAVESIA]
    calzada |= mascara([g.buffer(MEDIA_TRAVESIA_M, cap_style="flat") for g in travesia]) & casco
    # Acera solo en el casco: fuera, las carreteras y calles van entre campos sin acera
    acera = mascara([shape(f["geometry"]).buffer(medias.get(f["properties"].get("tipo"), 3.0) + ACERA_M)
                     for f in calles]) & casco
    acera |= mascara([g.buffer(MEDIA_TRAVESIA_M + ACERA_M) for g in travesia]) & casco
    acera |= mascara([cv.acera() for cv in variables.values()]) & casco
    acera |= mascara([shape(f["geometry"]).buffer(1.5) for f in caminos
                      if f["properties"].get("tipo") in ("footway", "pedestrian", "steps", "cycleway")])
    acera &= ~calzada
    tierra = mascara([shape(f["geometry"]).buffer(ANCHO_CAMINO_M / 2) for f in caminos
                      if f["properties"].get("tipo") in ("track", "path")]) & ~calzada & ~acera
    # Fuera de las calles (patios, solares, campos) no hay textura: queda la foto
    tipos = np.dstack([calzada, acera, tierra]).astype(np.float32) * 255
    tipos = ndimage.gaussian_filter(tipos, (0.7, 0.7, 0))
    Image.fromarray(tipos.astype(np.uint8)).save(salida / "tipos.png", optimize=True)

    # Bordillo nítido: distancia con signo (m) al borde de la calzada, con la geometría exacta
    # (la misma que da el bordillo de 16_marcas_viales.py), para que el juego corte asfalto y
    # cemento justo debajo del bordillo en vez de mezclarlos en un metro y medio
    casco_v = unary_union([e.buffer(DIST_CASCO_M) for e in edificios])
    calzada_v = unary_union(formas_calzada + [g.buffer(MEDIA_TRAVESIA_M, cap_style="flat").intersection(casco_v) for g in travesia])
    Image.fromarray(distancia_bordillo(calzada_v, calzada, acera, filas, columnas, origin)).save(
        salida / "bordillo.png", optimize=True)
    # Los coches aparcados que quedaban sobre la acera de esas calles pasan a la calzada
    calzadas.recoloca_coches(assets, variables)

    # Dirección de la vía más cercana (para alinear juntas de acera, desgaste y rodadas):
    # R, G = cos 2θ, sin 2θ (eje sin sentido) y B = distancia al eje de la vía (0,1 m por nivel)
    tramos = []
    for f in calles + caminos:
        g = shape(f["geometry"])
        for linea in getattr(g, "geoms", [g]):
            c = list(linea.coords)
            for a, b in zip(c[:-1], c[1:]):
                if a != b:
                    tramos.append((LineString([a, b]), math.atan2(b[1] - a[1], b[0] - a[0])))
    ids = rasterize([(t, i + 1) for i, (t, _) in enumerate(tramos)], out_shape=(filas, columnas), transform=local,
                    fill=0, dtype="int32", all_touched=True)
    dist, (iy, ix) = ndimage.distance_transform_edt(ids == 0, return_indices=True)
    angulos = np.array([0.0] + [a for _, a in tramos])[ids[iy, ix]]
    direccion = np.dstack([np.cos(2 * angulos) * 0.5 + 0.5, np.sin(2 * angulos) * 0.5 + 0.5,
                           np.clip(dist * PASO_M / 25.5, 0, 1)]) * 255
    Image.fromarray(np.round(direccion).astype(np.uint8)).save(salida / "direccion.png", optimize=True)

    # Color de cada suelo en la ortofoto (mediana de lo soleado, sin coches ni sombras): la
    # textura lo usa como base para que de lejos se vea igual que la foto
    colores = colores_orto(assets, filas, columnas, {"calzada": calzada & casco, "acera": acera & casco,
                                                     "tierra": tierra})

    r = np.random.default_rng(5)
    dibujadas = {"asfalto": textura_asfalto, "baldosa": textura_baldosa, "tierra": textura_tierra}
    metros = dict(METROS_TEX)
    externas = dir_raw(config) / "externos" / "texturas"
    for nombre, dibuja in dibujadas.items():
        id_, m, fuerza = EXTERNAS[nombre]
        img = textura_externa(externas, id_, fuerza)
        if img is not None:
            metros[nombre] = m
            print(f"  {nombre}: ambientCG {id_} ({m} m)")
        else:
            img = dibuja(r)
            print(f"  {nombre}: dibujada (falta {id_}_1K-JPG.zip)")
        Image.fromarray(img).save(salida / f"{nombre}.png", optimize=True)
    (salida / "suelo.json").write_text(json.dumps({
        "paso_m": PASO_M, "columnas": columnas, "filas": filas, "x0": -origin["ancho"] / 2, "z0": -origin["alto"] / 2,
        "metros_textura": metros,
        "canales": {"R": "calzada", "G": "acera", "B": "tierra"},
        "direccion": {"R": "cos 2θ", "G": "sin 2θ", "B": "distancia al eje (25,5 m = 255)"},
        "colores_srgb": colores,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Calzada {calzada.sum() * PASO_M ** 2 / 1e4:.1f} ha · acera {acera.sum() * PASO_M ** 2 / 1e4:.1f} ha · "
          f"tierra {tierra.sum() * PASO_M ** 2 / 1e4:.1f} ha")
    for f in sorted(salida.iterdir()):
        print(f"  {f.name}: {f.stat().st_size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
