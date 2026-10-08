"""Dibujo de las vistas previas de data/processed/previews/.

Todas en coordenadas locales (x este, z sur) con el norte arriba: la fila 0 de la
imagen es z = −alto/2 y la columna 0 es x = −ancho/2.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry

# Fuente libre que trae Pillow. No tiene vocales con tilde: los rótulos van sin ellas.
FUENTE = ImageFont.load_default(size=15)


class Lienzo:
    def __init__(self, origin: dict, px_por_m: float, fondo: Image.Image | None = None,
                 color_fondo=(40, 44, 48)):
        self.s = px_por_m
        self.x0 = -origin["ancho"] / 2
        self.z0 = -origin["alto"] / 2
        tam = (round(origin["ancho"] * px_por_m), round(origin["alto"] * px_por_m))
        if fondo is None:
            self.img = Image.new("RGB", tam, color_fondo)
        else:
            self.img = fondo.convert("RGB").resize(tam, Image.LANCZOS)
        self.dib = ImageDraw.Draw(self.img, "RGBA")

    def px(self, coords) -> list[tuple[float, float]]:
        return [((x - self.x0) * self.s, (z - self.z0) * self.s) for x, z, *_ in coords]

    def geometria(self, geom: BaseGeometry | dict, borde=None, relleno=None, ancho: int = 1) -> None:
        """Dibuja una geometría shapely (o un dict GeoJSON) en coordenadas locales."""
        if isinstance(geom, dict):
            geom = shape(geom)
        tipo = geom.geom_type
        if tipo.startswith("Multi") or tipo == "GeometryCollection":
            for parte in geom.geoms:
                self.geometria(parte, borde, relleno, ancho)
        elif tipo == "Polygon":
            exterior = self.px(geom.exterior.coords)
            if len(exterior) >= 3:
                self.dib.polygon(exterior, fill=relleno, outline=borde, width=ancho if borde else 0)
            for hueco in geom.interiors:
                self.dib.line(self.px(hueco.coords), fill=borde or relleno, width=1)
        elif tipo == "LineString":
            self.dib.line(self.px(geom.coords), fill=borde, width=ancho, joint="curve")
        elif tipo == "Point":
            (x, y), r = self.px(geom.coords)[0], max(ancho, 3)
            self.dib.ellipse([x - r, y - r, x + r, y + r], fill=relleno or borde, outline=(0, 0, 0))

    def rotulo(self, lineas: list[str], leyenda: list[tuple[str, tuple]] | None = None) -> None:
        """Caja arriba a la izquierda con texto y, opcionalmente, una leyenda de colores."""
        alto_linea = 20
        filas = len(lineas) + len(leyenda or [])
        ancho = max(self.dib.textlength(t, font=FUENTE) for t in lineas + [n for n, _ in leyenda or []]) + 40
        self.dib.rectangle([0, 0, ancho, filas * alto_linea + 10], fill=(20, 28, 38, 225))
        y = 6
        for t in lineas:
            self.dib.text((8, y), t, font=FUENTE, fill=(255, 255, 255))
            y += alto_linea
        for nombre, color in leyenda or []:
            self.dib.rectangle([8, y + 3, 24, y + 15], fill=color)
            self.dib.text((30, y), nombre, font=FUENTE, fill=(255, 255, 255))
            y += alto_linea

    def guarda(self, ruta: Path, calidad: int = 88) -> None:
        if ruta.suffix.lower() in (".jpg", ".jpeg"):
            self.img.save(ruta, quality=calidad, optimize=True)
        else:
            self.img.save(ruta, optimize=True)


def sombreado(dir_terreno: Path, brillo: float = 0.55) -> Image.Image:
    """Sombreado en gris del terreno exportado (terrain.f32), sin rótulos, para fondo."""
    import json
    import math

    import numpy as np

    meta = json.loads((dir_terreno / "terrain.json").read_text(encoding="utf-8"))
    z = np.fromfile(dir_terreno / "terrain.f32", dtype="<f4").reshape(meta["filas"], meta["columnas"]) * 2.0
    gz, gx = np.gradient(z.astype("float64"), meta["paso_m"])
    normal = np.dstack((-gx, gz, np.ones_like(z, dtype="float64")))
    normal /= np.linalg.norm(normal, axis=2, keepdims=True)
    az, alt = math.radians(315), math.radians(45)
    luz = np.array([math.sin(az) * math.cos(alt), math.cos(az) * math.cos(alt), math.sin(alt)])
    gris = np.clip(normal @ luz, 0, 1) * 255 * brillo
    return Image.fromarray(gris.astype("uint8"), "L")


def rampa(t: float, paradas: list[float], colores: list[tuple]) -> tuple:
    """Interpola linealmente un color RGB(A) para t en [0, 1]."""
    t = min(max(t, paradas[0]), paradas[-1])
    for i in range(len(paradas) - 1):
        if t <= paradas[i + 1]:
            f = (t - paradas[i]) / (paradas[i + 1] - paradas[i])
            return tuple(round(a + (b - a) * f) for a, b in zip(colores[i], colores[i + 1]))
    return colores[-1]
