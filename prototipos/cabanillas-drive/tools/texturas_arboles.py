"""Paso R1.2a — Texturas de los árboles.

- Hojas y cortezas de EZ-Tree (MIT; cortezas CC0 de Poly Haven y TextureCan), reducidas a
  512 px y con el color de las hojas extendido a los píxeles transparentes (sin halos
  claros en los mipmaps).
- Palmera, dibujada aquí: hoja pinnada (raquis + foliolos) y tronco con las cicatrices de
  las hojas viejas. Sin fuentes externas.

Salida: <processed>/arboles_tex/*.png|jpg (las lee tools/genera_arboles.mjs).

Uso: conda run -n cabdrive python tools/texturas_arboles.py
"""
from __future__ import annotations

import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

from comun import RAIZ, cargar_config, dir_processed

EZ = RAIZ / "node_modules" / "@dgreenheck" / "ez-tree" / "src" / "lib" / "assets"
LADO = 512
HOJAS = ["ash", "oak", "pine"]
CORTEZAS = ["oak", "pine", "birch"]


def extiende_color(rgba: np.ndarray) -> np.ndarray:
    """Copia a cada píxel transparente el color del opaco más cercano."""
    transparente = rgba[..., 3] < 128
    _, (fi, ci) = ndimage.distance_transform_edt(transparente, return_indices=True)
    salida = rgba.copy()
    salida[..., :3] = rgba[fi, ci, :3]
    return salida


def hoja_palmera(ancho=1024, alto=256, semilla=3) -> Image.Image:
    """Hoja pinnada (tipo Phoenix): raquis a lo largo de u, foliolos inclinados hacia la punta."""
    r = np.random.default_rng(semilla)
    escala = 2                                      # se dibuja al doble y se reduce (antialias)
    W, H = ancho * escala, alto * escala
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    medio = H / 2
    n = 72
    for lado in (-1, 1):
        for i in range(n):
            t = (i + r.uniform(-0.3, 0.3)) / n      # 0 = base, 1 = punta
            if t < 0.06:
                continue
            x0 = W * (0.04 + 0.94 * t)
            largo = H * 0.47 * np.sin(np.pi * min(1, t * 1.15)) ** 0.7 * r.uniform(0.85, 1.05)
            angulo = np.radians(r.uniform(32, 42))  # inclinación hacia la punta
            x1 = x0 + largo * np.cos(angulo) * 0.9
            y1 = medio + lado * largo * np.sin(angulo) * 1.6
            grosor = escala * r.uniform(3.2, 4.4)
            verde = np.array([78, 104, 52]) * r.uniform(0.82, 1.12) + np.array([18, 12, 0]) * t
            color = tuple(int(c) for c in np.clip(verde, 0, 255)) + (255,)
            # Foliolo lanceolado: polígono estrecho que se afila en la punta
            dx, dy = x1 - x0, y1 - medio
            nrm = np.array([-dy, dx]) / max(1e-6, np.hypot(dx, dy))
            pts = [(x0, medio), (x0 + dx * 0.5 + nrm[0] * grosor, medio + dy * 0.5 + nrm[1] * grosor),
                   (x1, y1), (x0 + dx * 0.5 - nrm[0] * grosor, medio + dy * 0.5 - nrm[1] * grosor)]
            d.polygon(pts, fill=color)
            # nervio central algo más claro
            d.line([(x0, medio), (x0 + dx * 0.8, medio + dy * 0.8)],
                   fill=tuple(min(255, int(c * 1.18)) for c in color[:3]) + (255,), width=max(1, escala))
    # Raquis
    for k in range(W):
        t = k / W
        g = (1 - t) * 7 * escala + 1.5 * escala
        d.line([(k, medio - g / 2), (k, medio + g / 2)], fill=(122, 118, 70, 255))
    img = img.resize((ancho, alto), Image.LANCZOS)
    return Image.fromarray(extiende_color(np.array(img)))


def tronco_palmera(ancho=256, alto=512, semilla=5) -> Image.Image:
    """Tronco con cicatrices de hojas en espiral (bases de hoja cortadas)."""
    r = np.random.default_rng(semilla)
    base = np.array([112, 98, 78], np.float32)
    ruido = ndimage.gaussian_filter(r.normal(0, 1, (alto, ancho)), (1.5, 6))
    img = np.zeros((alto, ancho, 3), np.float32) + base
    img += ruido[..., None] * 9
    filas = 16                                      # anillos de cicatrices en la altura de la textura
    yy, xx = np.mgrid[0:alto, 0:ancho].astype(np.float32)
    for f in range(filas):
        for c in range(4):
            cx = (c + 0.5 * (f % 2)) * ancho / 4 + r.uniform(-6, 6)
            cy = (f + 0.5) * alto / filas + r.uniform(-3, 3)
            # cicatriz en forma de rombo aplanado: borde inferior oscuro, superior claro
            dx = ((xx - cx + ancho / 2) % ancho - ancho / 2) / (ancho / 4 * 0.52)
            dy = (yy - cy) / (alto / filas * 0.42)
            rombo = np.abs(dx) + np.abs(dy)
            dentro = rombo < 1
            sombra = np.clip((dy + 0.2) * 1.4, -1, 1)
            img[dentro] += (np.array([30, 26, 18]) * -sombra[dentro][:, None] - 16 * (1 - rombo[dentro])[:, None]) * r.uniform(0.7, 1.2)
    img = np.clip(img, 0, 255).astype(np.uint8)
    return Image.fromarray(img).filter(ImageFilter.GaussianBlur(0.6))


def normal_desde_altura(gris: np.ndarray, fuerza=2.5) -> Image.Image:
    gy, gx = np.gradient(gris.astype(np.float32) / 255)
    n = np.dstack([-gx * fuerza, gy * fuerza, np.ones_like(gx)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8))


def main() -> int:
    config = cargar_config()
    salida = dir_processed(config) / "arboles_tex"
    salida.mkdir(parents=True, exist_ok=True)
    if not EZ.is_dir():
        print(f"No encuentro {EZ}: ejecuta antes «npm install»")
        return 1
    for h in HOJAS:
        rgba = np.array(Image.open(EZ / "leaves" / f"{h}_color.png").convert("RGBA").resize((LADO, LADO), Image.LANCZOS))
        Image.fromarray(extiende_color(rgba)).save(salida / f"hoja_{h}.png", optimize=True)
    for c in CORTEZAS:
        Image.open(EZ / "bark" / f"{c}_color_1k.jpg").convert("RGB").resize((LADO, LADO), Image.LANCZOS) \
            .save(salida / f"corteza_{c}.jpg", quality=88)
        Image.open(EZ / "bark" / f"{c}_normal_1k.jpg").convert("RGB").resize((LADO, LADO), Image.LANCZOS) \
            .save(salida / f"corteza_{c}_normal.png", optimize=True)
    hoja_palmera().save(salida / "hoja_palmera.png", optimize=True)
    tronco = tronco_palmera()
    tronco.save(salida / "corteza_palmera.jpg", quality=88)
    normal_desde_altura(np.array(tronco.convert("L"))).save(salida / "corteza_palmera_normal.png", optimize=True)
    print(f"Texturas → {salida}")
    for f in sorted(salida.iterdir()):
        print(f"  {f.name}: {f.stat().st_size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
