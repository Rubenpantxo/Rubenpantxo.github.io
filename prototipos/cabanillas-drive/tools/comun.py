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


def ruta_zona(config: dict) -> Path:
    return ruta_proyecto(config["zona"])


def ruta_origin(config: dict) -> Path:
    """origin.json: fuente única de E_centro, N_centro y H_base (PLAN.md §4)."""
    return dir_processed(config) / "origin.json"
