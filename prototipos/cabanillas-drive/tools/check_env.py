"""Comprueba el entorno del pipeline: librerías Python y Blender.

Uso (desde la raíz del proyecto):
    conda run -n cabdrive python tools/check_env.py

Sale con código 1 si falta algo.
"""
from __future__ import annotations

import importlib
import platform
import subprocess
import sys
from pathlib import Path

from comun import cargar_config

errores: list[str] = []


def version_de(modulo: str, atributo: str = "__version__") -> str | None:
    try:
        mod = importlib.import_module(modulo)
    except Exception as e:  # noqa: BLE001 — queremos informar de cualquier fallo de importación
        errores.append(f"No se puede importar {modulo}: {e}")
        return None
    valor = getattr(mod, atributo, None)
    return valor() if callable(valor) else str(valor)


def main() -> int:
    print("== Entorno de Cabanillas Drive ==")
    print(f"Python      {platform.python_version()}  ({sys.executable})")

    gdal = version_de("osgeo.gdal", "__version__")
    print(f"GDAL        {gdal or 'NO DISPONIBLE'}")

    rasterio = version_de("rasterio")
    if rasterio:
        import rasterio as rio
        print(f"rasterio    {rasterio}  (GDAL interno {rio.__gdal_version__})")
    else:
        print("rasterio    NO DISPONIBLE")

    for modulo in ("geopandas", "shapely", "pyproj", "numpy", "PIL", "requests"):
        v = version_de(modulo)
        nombre = "pillow" if modulo == "PIL" else modulo
        print(f"{nombre:<11} {v or 'NO DISPONIBLE'}")

    if "pyproj" in sys.modules:
        import pyproj
        try:
            pyproj.CRS.from_epsg(25830)
            print("pyproj      EPSG:25830 resuelto correctamente")
        except Exception as e:  # noqa: BLE001
            errores.append(f"pyproj no resuelve EPSG:25830: {e}")

    # Blender
    config = cargar_config()
    blender = Path(config.get("blender_path", ""))
    print(f"\nBlender     {blender}")
    if not blender.is_file():
        errores.append(f"No existe blender_path de config.json: {blender}")
    else:
        try:
            salida = subprocess.run(
                [str(blender), "--version"], capture_output=True, text=True,
                timeout=120, encoding="utf-8", errors="replace",
            )
            lineas = [l for l in salida.stdout.splitlines() if l.strip()]
            if salida.returncode != 0 or not lineas:
                errores.append(f"blender --version devolvió código {salida.returncode}")
            else:
                print(f"            {lineas[0]}")
        except subprocess.TimeoutExpired:
            errores.append("blender --version no respondió en 120 s")

    print()
    if errores:
        print("ERRORES:")
        for e in errores:
            print(f"  - {e}")
        return 1
    print("Todo correcto.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
