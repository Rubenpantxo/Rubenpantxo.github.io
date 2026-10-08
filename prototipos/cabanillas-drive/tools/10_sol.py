"""Paso R3.1 — Dirección del sol el día de la ortofoto, a partir de sus sombras.

Para cada sol candidato (acimut, elevación) se proyectan las sombras de todo lo que mide el
nDSM (edificios, árboles, muros) y se correlaciona con lo oscura que es la ortofoto en el
suelo libre a menos de 20 m de algún objeto (ni el asfalto lejano ni las fachadas cuentan).
Gana el sol con la correlación más alta: sombras demasiado cortas o largas la bajan. Búsqueda
gruesa y luego fina, con la elevación limitada a lo posible en la latitud de Cabanillas
(42° N: como mucho ~71,5° en el solsticio de verano).

Así las sombras 3D del juego caen donde la foto ya tiene las suyas.

Requiere 01_origin_terrain.py y 02_ortho.py.

Salida: <assets>/sol.json {acimut_grados (desde el norte, horario), elevacion_grados, correlacion}
        <processed>/previews/sol.jpg (sombras calculadas sobre la ortofoto)

Uso: conda run -n cabdrive python tools/10_sol.py
"""
from __future__ import annotations

import json
import sys

import numpy as np
import rasterio
from affine import Affine
from PIL import Image
from rasterio.warp import Resampling, reproject

from comun import cargar_config, cargar_origin, dir_assets, dir_previews, dir_processed

PASO_M = 1.0
RECORTE_M = 700            # cuadrado central (casco y alrededores), lado en metros
SOMBRA_MAX_M = 30
OBJETO_MIN_M = 1.0         # píxeles con algo encima no cuentan (ni dentro ni fuera)


def sombras(alturas, acimut, elevacion):
    """Máscara de suelo en sombra: algún objeto hacia el sol tapa el rayo."""
    a = np.radians(acimut)
    hacia_sol = np.array([np.sin(a), -np.cos(a)])          # (x este, z sur) en la imagen: col, fila
    tan_e = np.tan(np.radians(elevacion))
    sombra = np.zeros(alturas.shape, bool)
    for s in np.arange(PASO_M, SOMBRA_MAX_M, PASO_M):
        dc, df = int(round(hacia_sol[0] * s / PASO_M)), int(round(hacia_sol[1] * s / PASO_M))
        desplazada = np.roll(np.roll(alturas, -df, axis=0), -dc, axis=1)
        sombra |= desplazada > s * tan_e
    return sombra


ELEVACION_MAX = 71.5


def otsu(v):
    hist, bordes = np.histogram(v, bins=128)
    p = hist / hist.sum()
    w = np.cumsum(p)
    mu = np.cumsum(p * bordes[:-1])
    entre = (mu[-1] * w - mu) ** 2 / np.maximum(w * (1 - w), 1e-9)
    return bordes[np.argmax(entre)]


def puntua(alturas, oscuridad, zona, acimut, elevacion):
    s = sombras(alturas, acimut, elevacion)[zona].astype(np.float32)
    if s.std() == 0:
        return 0.0
    return float(np.corrcoef(s, oscuridad)[0, 1])


def main() -> int:
    config = cargar_config()
    origin = cargar_origin(config)
    processed, assets, previews = dir_processed(config), dir_assets(config), dir_previews(config)
    n = int(RECORTE_M / PASO_M)
    e0 = origin["E_centro"] - RECORTE_M / 2
    n0 = origin["N_centro"] + RECORTE_M / 2
    destino = Affine(PASO_M, 0, e0, 0, -PASO_M, n0)
    alturas = np.zeros((n, n), np.float32)
    orto = np.zeros((3, n, n), np.float32)
    with rasterio.open(processed / "ndsm.tif") as ds:
        reproject(ds.read(1, masked=True).filled(0), alturas, src_transform=ds.transform, src_crs=ds.crs,
                  dst_transform=destino, dst_crs=ds.crs, resampling=Resampling.max)
    with rasterio.open(processed / "orto_mosaico.tif") as ds:
        for b in range(3):
            reproject(ds.read(b + 1).astype(np.float32), orto[b], src_transform=ds.transform, src_crs=ds.crs,
                      dst_transform=destino, dst_crs=ds.crs, resampling=Resampling.average)
    luz = orto.mean(0)
    libre = alturas < OBJETO_MIN_M
    libre[:SOMBRA_MAX_M, :] = libre[-SOMBRA_MAX_M:, :] = False   # bordes del np.roll
    libre[:, :SOMBRA_MAX_M] = libre[:, -SOMBRA_MAX_M:] = False

    from scipy import ndimage
    zona = libre & ndimage.binary_dilation(alturas >= 2.0, iterations=20)
    oscuridad = -luz[zona]
    mejor = (-1, 0, 0)
    for acimut in range(0, 360, 10):
        for elev in range(25, 75, 5):
            p = puntua(alturas, oscuridad, zona, acimut, elev)
            if p > mejor[0]:
                mejor = (p, acimut, elev)
    print(f"Búsqueda gruesa: acimut {mejor[1]}°, elevación {mejor[2]}° (correlación {mejor[0]:.3f})")
    _, a0, e0_ = mejor
    for acimut in np.arange(a0 - 8, a0 + 8.1, 1):
        for elev in np.arange(e0_ - 5, min(e0_ + 5, ELEVACION_MAX) + 0.1, 1):
            p = puntua(alturas, oscuridad, zona, acimut % 360, elev)
            if p > mejor[0]:
                mejor = (p, float(acimut % 360), float(elev))
    contraste, acimut, elev = mejor
    print(f"Sol de la ortofoto: acimut {acimut:.0f}° (desde el norte, horario), elevación {elev:.0f}° "
          f"· correlación {contraste:.3f}")

    (assets / "sol.json").write_text(json.dumps({
        "acimut_grados": acimut, "elevacion_grados": elev, "correlacion": round(contraste, 3),
        "metodo": "sombras del nDSM proyectadas frente a zonas oscuras de la ortofoto PNOA",
    }, ensure_ascii=False, indent=1), encoding="utf-8")

    s = sombras(alturas, acimut, elev) & libre
    vista = np.moveaxis(orto, 0, -1).copy()
    vista[s] = vista[s] * 0.5 + np.array([255, 0, 160]) * 0.5
    Image.fromarray(np.clip(vista, 0, 255).astype(np.uint8)).save(previews / "sol.jpg", quality=85)
    return 0


if __name__ == "__main__":
    sys.exit(main())
