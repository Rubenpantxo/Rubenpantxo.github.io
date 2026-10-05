"""Paso R3.4 — Cielo fotográfico para el juego a partir de un HDRI CC0 de Poly Haven.

Entrada: <raw>/externos/cielo/*.hdr (Kloofendal 48d Partly Cloudy, «pure sky», 4k).
1. Se localiza el sol del HDRI (zona más brillante): el juego gira el cielo para que quede
   en el acimut del sol de la ortofoto (tools/10_sol.py).
2. Exposición: la mediana del cielo queda en un valor fijo; el disco solar se recorta (la luz
   directa la pone la luz direccional del juego).
3. Bajo el horizonte, el color medio del terreno (solo se ve en reflejos).
4. JPEG equirectangular 4096×2048 (sRGB) + color del horizonte para la niebla.

Salidas: <assets>/cielo/cielo.jpg, cielo.json

Uso: conda run -n cabdrive python tools/12_cielo.py
"""
from __future__ import annotations

import json
import sys

import cv2
import numpy as np
from PIL import Image

from comun import cargar_config, dir_assets, dir_raw

ANCHO = 4096
MEDIANA_CIELO = 0.42           # luminancia lineal de la mediana del cielo tras la exposición
TECHO = 1.0                    # recorte (el sol queda en blanco, sin brillo infinito)
SUELO_LINEAL = np.array([0.155, 0.125, 0.085], np.float32)   # color medio del terreno


def srgb(lineal):
    a = np.clip(lineal, 0, 1)
    return np.where(a <= 0.0031308, 12.92 * a, 1.055 * np.power(a, 1 / 2.4) - 0.055)


def main() -> int:
    config = cargar_config()
    origen = dir_raw(config) / "externos" / "cielo"
    hdrs = sorted(origen.glob("*.hdr"))
    if not hdrs:
        print(f"No hay ningún .hdr en {origen}")
        return 1
    hdr = cv2.imread(str(hdrs[0]), cv2.IMREAD_ANYDEPTH | cv2.IMREAD_COLOR)[..., ::-1].astype(np.float32)
    alto0, ancho0 = hdr.shape[:2]
    lum = hdr @ np.array([0.2126, 0.7152, 0.0722], np.float32)

    # Sol: máximo de la luminancia suavizada en la mitad superior
    suave = cv2.GaussianBlur(lum[: alto0 // 2], (0, 0), 4)
    fila, col = np.unravel_index(np.argmax(suave), suave.shape)
    u_sol = (col + 0.5) / ancho0
    elev_sol = 90 - (fila + 0.5) / alto0 * 180
    print(f"Sol del HDRI: u = {u_sol:.4f}, elevación {elev_sol:.1f}°")

    img = cv2.resize(hdr, (ANCHO, ANCHO // 2), interpolation=cv2.INTER_AREA)
    l2 = img @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    mitad = ANCHO // 4
    exposicion = MEDIANA_CIELO / float(np.median(l2[:mitad]))
    img *= exposicion
    # Recorte suave para que el sol no sature con un borde duro
    # y que tienda a blanco (sin halos de color en la corona del sol)
    m = img.max(axis=2, keepdims=True)
    rodilla = TECHO * 0.8
    comprimido = np.where(m > rodilla, rodilla + (TECHO - rodilla) * (1 - np.exp(-(m - rodilla) / (TECHO - rodilla))), m)
    blanco = np.clip((m - rodilla) / (3 * TECHO), 0, 1)
    img = img / np.maximum(m, 1e-6) * comprimido * (1 - blanco) + comprimido * blanco

    # Horizonte: media de la franja de 0–4° sobre él; debajo, transición al color del suelo
    filas = np.arange(ANCHO // 2)
    elev = 90 - (filas + 0.5) / (ANCHO // 2) * 180
    franja = (elev > 0) & (elev < 4)
    horizonte = img[franja].reshape(-1, 3).mean(0)
    t = np.clip(-elev / 6, 0, 1)[:, None, None]                        # 0 en el horizonte, 1 a −6°
    abajo = (elev < 0)[:, None, None]
    img = np.where(abajo, horizonte * (1 - t) + SUELO_LINEAL * t, img)

    salida = dir_assets(config) / "cielo"
    salida.mkdir(parents=True, exist_ok=True)
    Image.fromarray((srgb(img) * 255 + 0.5).astype(np.uint8)).save(salida / "cielo.jpg", quality=88, optimize=True)
    color_horizonte = (srgb(horizonte) * 255).round().astype(int).tolist()
    (salida / "cielo.json").write_text(json.dumps({
        "fuente": f"{hdrs[0].name} — Poly Haven (CC0)",
        "u_sol": round(float(u_sol), 5), "elevacion_sol_grados": round(float(elev_sol), 1),
        "exposicion": round(exposicion, 5),
        "color_horizonte_srgb": color_horizonte,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Exposición ×{exposicion:.4f} · horizonte {color_horizonte} · "
          f"{(salida / 'cielo.jpg').stat().st_size / 1e6:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
