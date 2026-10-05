"""Utilidades compartidas por los scripts de tools/.

Todas las rutas salen de config.json, relativas a la raíz del proyecto
(la carpeta que contiene config.json). Ningún script usa rutas fijas.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
RUTA_CONFIG = RAIZ / "config.json"

# Consola de Windows: forzar UTF-8 para que tildes y símbolos salgan bien
for _flujo in (sys.stdout, sys.stderr):
    try:
        _flujo.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass


def cargar_config() -> dict:
    """Lee config.json de la raíz del proyecto."""
    with RUTA_CONFIG.open(encoding="utf-8") as f:
        return json.load(f)


def ruta_proyecto(relativa: str) -> Path:
    """Convierte una ruta de config.json (relativa a la raíz) en absoluta."""
    ruta = Path(relativa)
    return ruta if ruta.is_absolute() else RAIZ / ruta


def dir_raw(config: dict) -> Path:
    return ruta_proyecto(config.get("raw_dir", "data/raw"))


def dir_processed(config: dict) -> Path:
    return ruta_proyecto(config.get("processed_dir", "data/processed"))


def dir_assets(config: dict) -> Path:
    """Lo que sirve el juego (public/assets)."""
    return ruta_proyecto(config.get("assets_dir", "public/assets"))


def dir_previews(config: dict) -> Path:
    return dir_processed(config) / "previews"


def ruta_zona(config: dict) -> Path:
    return ruta_proyecto(config["zona"])


def ruta_origin(config: dict) -> Path:
    """origin.json: fuente única de E_centro, N_centro y H_base (PLAN.md §4)."""
    return dir_processed(config) / "origin.json"


def cargar_origin(config: dict) -> dict:
    """Lee origin.json. Solo 01_origin_terrain.py lo escribe; el resto lo lee de aquí."""
    ruta = ruta_origin(config)
    if not ruta.is_file():
        raise FileNotFoundError(f"No existe {ruta}. Ejecuta antes tools/01_origin_terrain.py")
    with ruta.open(encoding="utf-8") as f:
        return json.load(f)


def utm_a_local(origin: dict, e, n, h=None):
    """UTM (EPSG:25830) → local: x = E − E_centro, z = −(N − N_centro), y = h − H_base."""
    x = e - origin["E_centro"]
    z = -(n - origin["N_centro"])
    if h is None:
        return x, z
    return x, h - origin["H_base"], z
