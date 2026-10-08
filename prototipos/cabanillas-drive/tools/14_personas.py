"""Paso F6 — Peatones realistas: lanza Blender con una configuración aislada del proyecto
(<processed>/blender_mpfb) para instalar MPFB y sus recursos (personas_instala.py) y generar
las personas de tools/personas.json (build_personas.py). Después: npm run personas.

Requiere en <raw>/externos/makehuman/ el complemento add-on-mpfb-*.zip (extensions.blender.org,
GPL-3.0) y los paquetes de recursos CC0 de MakeHuman (makehuman_system_assets, hair01, shoes01,
pants01, shirts01, skirts01, skins01, skins02).

Uso: conda run -n cabdrive python tools/14_personas.py [--solo id]
"""
from __future__ import annotations

import os
import subprocess
import sys
import zipfile
from pathlib import Path

from comun import cargar_config, dir_processed, dir_raw, ruta_proyecto


def main() -> int:
    config = cargar_config()
    processed = dir_processed(config)
    zips = dir_raw(config) / "externos" / "makehuman"
    complemento = next(zips.glob("add-on-mpfb-*.zip"), None)
    if complemento is None:
        print(f"Falta el complemento MPFB en {zips}")
        return 1
    entorno = dict(os.environ, BLENDER_USER_RESOURCES=str(processed / "blender_mpfb"))
    blender = config["blender_path"]

    # La extensión se descomprime a mano en el repositorio de usuario (el instalador de
    # extensiones de Blender 5.0 falla sin decir por qué en modo sin interfaz)
    destino = processed / "blender_mpfb" / "extensions" / "user_default" / "mpfb"
    if not (destino / "blender_manifest.toml").is_file():
        destino.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(complemento) as z:
            z.extractall(destino)
    datos_mpfb = processed / "mpfb"
    if not (datos_mpfb / "data" / "proxymeshes").is_dir():
        subprocess.run([blender, "-b", "--python", str(ruta_proyecto("tools/personas_instala.py")), "--",
                        str(zips), str(datos_mpfb)], env=entorno, check=True)
    orden = [blender, "-b", "--python", str(ruta_proyecto("tools/build_personas.py")), "--",
             str(ruta_proyecto("tools/personas.json")), str(processed / "personas"), *sys.argv[1:]]
    return subprocess.run(orden, env=entorno).returncode


if __name__ == "__main__":
    sys.exit(main())
