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
from affine import Affine
from PIL import Image
from rasterio.features import rasterize
from scipy import ndimage
from shapely.geometry import shape

import zipfile

from comun import cargar_config, cargar_origin, dir_assets, dir_raw

PASO_M = 0.5
ACERA_M = 1.8
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


def main() -> int:
    config = cargar_config()
    origin = cargar_origin(config)
    assets = dir_assets(config)
    salida = assets / "suelo"
    salida.mkdir(parents=True, exist_ok=True)
    medias = importlib.import_module("08_arboles").MEDIA_CALZADA_M

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
    calzada = mascara([shape(f["geometry"]).buffer(medias.get(f["properties"].get("tipo"), 3.0), cap_style="flat")
                       for f in calles if medias.get(f["properties"].get("tipo"), 3.0) > 0])
    acera = mascara([shape(f["geometry"]).buffer(medias.get(f["properties"].get("tipo"), 3.0) + ACERA_M)
                     for f in calles])
    acera |= mascara([shape(f["geometry"]).buffer(1.5) for f in caminos
                      if f["properties"].get("tipo") in ("footway", "pedestrian", "steps", "cycleway")])
    acera &= ~calzada
    tierra = mascara([shape(f["geometry"]).buffer(2.0) for f in caminos
                      if f["properties"].get("tipo") in ("track", "path")]) & ~calzada & ~acera
    # Fuera de las calles (patios, solares, campos) no hay detalle: queda la foto
    tipos = np.dstack([calzada, acera, tierra]).astype(np.float32) * 255
    tipos = ndimage.gaussian_filter(tipos, (1.0, 1.0, 0))
    Image.fromarray(tipos.astype(np.uint8)).save(salida / "tipos.png", optimize=True)

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
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Calzada {calzada.sum() * PASO_M ** 2 / 1e4:.1f} ha · acera {acera.sum() * PASO_M ** 2 / 1e4:.1f} ha · "
          f"tierra {tierra.sum() * PASO_M ** 2 / 1e4:.1f} ha")
    for f in sorted(salida.iterdir()):
        print(f"  {f.name}: {f.stat().st_size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
