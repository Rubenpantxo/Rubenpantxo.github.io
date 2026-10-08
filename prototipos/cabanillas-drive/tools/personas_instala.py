"""Paso F6 — Instala MPFB (MakeHuman para Blender) y sus paquetes de recursos CC0 en una
configuración de Blender aislada del proyecto (no toca la del usuario).

Lo ejecuta tools/14_personas.py con BLENDER_USER_RESOURCES apuntando a
<processed>/blender_mpfb; a mano:

    set BLENDER_USER_RESOURCES=data/processed/blender_mpfb
    blender -b --python tools/personas_instala.py -- <carpeta con los zip> <carpeta de datos MPFB>

Entradas (descargadas en <raw>/externos/makehuman/): add-on-mpfb-v2.0.17.zip (GPL-3.0,
extensions.blender.org) y los paquetes *_cc0.zip. Los recursos van a una carpeta de ruta
corta (<processed>/mpfb): Blender no abre rutas de más de 260 caracteres.
"""
import sys
import zipfile
from pathlib import Path

import addon_utils
import bpy

args = sys.argv[sys.argv.index("--") + 1:]
carpeta = Path(args[0])
datos_mpfb = Path(args[1])
complemento = next(carpeta.glob("add-on-mpfb-*.zip"))

# La extensión ya está descomprimida en el repositorio de usuario (14_personas.py): se activa
modulo = "bl_ext.user_default.mpfb"
if modulo not in {m.__name__ for m in addon_utils.modules()}:
    print(f"No se encuentra {modulo}: descomprime {complemento.name} en extensions/user_default/mpfb")
    sys.exit(1)
addon_utils.enable(modulo, default_set=True, persistent=True)
prefs = bpy.context.preferences.addons[modulo].preferences
prefs.mpfb_user_data = str(datos_mpfb)
bpy.ops.wm.save_userpref()
print("  MPFB activo; datos de usuario en", prefs.mpfb_user_data)

datos = datos_mpfb / "data"
datos.mkdir(parents=True, exist_ok=True)
for paquete in sorted(carpeta.glob("*_cc0.zip")):
    with zipfile.ZipFile(paquete) as z:
        for miembro in z.infolist():
            nombre = miembro.filename
            if nombre.startswith("__MACOSX") or "with_genitals" in nombre:
                continue
            destino = datos / nombre
            if miembro.is_dir():
                destino.mkdir(parents=True, exist_ok=True)
                continue
            destino.parent.mkdir(parents=True, exist_ok=True)
            if not destino.exists() or destino.stat().st_size != miembro.file_size:
                destino.write_bytes(z.read(miembro))
    print(f"  {paquete.name} → {datos}")
print("MPFB listo")
