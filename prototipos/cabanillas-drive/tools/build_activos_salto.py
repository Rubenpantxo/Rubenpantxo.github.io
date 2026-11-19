"""Avión de carga y mochila-paracaídas del salto (PLAN_SALTO.md), paramétricos (Blender, modo consola).

Script CAD de Rubén: crea los dos modelos con primitivas y materiales de color, sin texturas
(0 MB de memoria de texturas):
  1. avion.glb              -> avión de carga (38 m de envergadura, 4 hélices, rampa trasera)
  2. mochila_paracaidas.glb -> mochila con arnés, solapas articuladas, pilotillo y cúpula de 9 celdas

Ejes: Blender X derecha, Y adelante, Z arriba; el GLB sale con +Y arriba y el morro hacia −Z
(como espera el juego). Los nodos que se mueven en el juego tienen el pivote en su sitio:
Helice_1…4 (giran sobre el eje de avance), Solapa_Izq / Solapa_Der (bisagra en el borde),
Pilotillo y Cupula_Paracaidas. La mochila sale CERRADA (solapas sin girar); src/salto/modelos.js
anima la apertura con los giros de src/config/salto.js (modelos.aperturaSolapas).

Los modelos que usa el juego son los de modelos/salto/ (más detallados: ventanillas, cabina, tren,
cuerdas, bandas y mandos). Este script sirve para regenerar o variar la versión paramétrica:
  - por defecto escribe en <processed>/salto_blender/ (no pisa nada)
  - con --out modelos/salto sustituye los del juego (después: npm run salto)

Uso (desde la raíz del proyecto):
    "<blender_path>" -b -P tools/build_activos_salto.py -- --root . [--out <carpeta>]
"""

import json
import math
import os
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector, Euler


def limpiar_escena():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def crear_material_pbr(nombre, color_rgba, roughness=0.5, metallic=0.1, emission=None):
    mat = bpy.data.materials.new(name=nombre)
    if bpy.app.version < (5, 0, 0):
        mat.use_nodes = True                     # Blender 3.6 / 4.x (en 5.0 siempre usa nodos)
    nodos = mat.node_tree.nodes
    # En Blender 5.0 el material nuevo no trae «Principled BSDF»: se busca por tipo o se crea
    bsdf = next((n for n in nodos if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        bsdf = nodos.new("ShaderNodeBsdfPrincipled")
        salida = next((n for n in nodos if n.type == "OUTPUT_MATERIAL"), None) or nodos.new("ShaderNodeOutputMaterial")
        mat.node_tree.links.new(bsdf.outputs["BSDF"], salida.inputs["Surface"])
    mat.diffuse_color = color_rgba               # color en la vista del editor
    bsdf.inputs["Base Color"].default_value = color_rgba
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission is not None and "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = emission
        bsdf.inputs["Emission Strength"].default_value = 1.5
    return mat


def exportar_glb(objetos, ruta_salida):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objetos:
        obj.select_set(True)
    os.makedirs(os.path.dirname(os.path.abspath(ruta_salida)), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=ruta_salida,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
    )
    print(f"[OK] Exportado: {ruta_salida}")


def construir_avion(out_dir):
    limpiar_escena()

    mat_body = crear_material_pbr("Avion_Fuselaje", (0.48, 0.52, 0.56, 1.0), 0.52, 0.28)
    mat_belly = crear_material_pbr("Avion_Vientre", (0.37, 0.40, 0.45, 1.0), 0.58, 0.25)
    mat_nose = crear_material_pbr("Avion_Morro", (0.15, 0.17, 0.20, 1.0), 0.42, 0.15)
    mat_glass = crear_material_pbr("Avion_Cristal", (0.07, 0.13, 0.19, 1.0), 0.08, 0.92)
    mat_metal = crear_material_pbr("Avion_Metal", (0.77, 0.80, 0.83, 1.0), 0.28, 0.82)
    mat_blade = crear_material_pbr("Avion_Pala", (0.11, 0.13, 0.15, 1.0), 0.35, 0.35)
    mat_yellow = crear_material_pbr("Avion_Amarillo", (0.92, 0.70, 0.03, 1.0), 0.40, 0.10)
    mat_interior = crear_material_pbr("Avion_Bodega", (0.23, 0.25, 0.29, 1.0), 0.78, 0.15)
    mat_red = crear_material_pbr("Avion_Baliza", (0.94, 0.27, 0.27, 1.0), 0.20, 0.10, (0.9, 0.1, 0.1, 1.0))
    mat_green = crear_material_pbr("Avion_NavDer", (0.13, 0.77, 0.37, 1.0), 0.20, 0.10, (0.1, 0.8, 0.3, 1.0))

    root = bpy.data.objects.new("Avion_Carga_Cabanillas", None)
    bpy.context.collection.objects.link(root)

    # 1. Fuselaje lofted (sistema Blender: X derecha, Y adelante, Z arriba -> glTF exporta +Y arriba, -Z adelante)
    stations = [
        (-14.7, 0.06, 0.06, -0.35, False),
        (-14.2, 0.48, 0.46, -0.32, False),
        (-13.2, 0.98, 0.92, -0.22, False),
        (-11.9, 1.38, 1.25, -0.08, False),
        (-10.4, 1.78, 1.68,  0.05, False),
        (-8.2,  2.02, 1.92,  0.10, False),
        (-4.5,  2.05, 1.95,  0.10, False),
        (0.0,   2.05, 1.95,  0.10, False),
        (4.6,   2.02, 1.92,  0.12, False),
        (7.4,   1.62, 1.65,  0.48, True),
        (10.5,  1.05, 1.25,  0.95, True),
        (13.2,  0.48, 0.72,  1.38, True),
        (14.6,  0.14, 0.28,  1.62, True),
    ]

    bm = bmesh.new()
    ring_segs = 28
    rings = []
    for y_pos, rx, rz, zc, open_rear in stations:
        ring = []
        for i in range(ring_segs):
            theta = (i / ring_segs) * math.tau
            ct, st = math.cos(theta), math.sin(theta)
            exp = 2.25
            sx = math.copysign(abs(ct) ** (2.0 / exp), ct)
            sz = math.copysign(abs(st) ** (2.0 / exp), st)
            x = sx * rx
            z = zc + sz * rz
            if st < -0.55:
                z = max(z, zc - rz * 0.88)
            ring.append(bm.verts.new((x, -y_pos, z)))
        rings.append((ring, y_pos, open_rear))

    for s in range(len(rings) - 1):
        r0, y0, _ = rings[s]
        r1, _, open1 = rings[s + 1]
        is_bay = (y0 >= 4.5) and open1
        for i in range(ring_segs):
            ang = (i / ring_segs) * 360.0
            if is_bay and 205.0 < ang < 335.0:
                continue
            ni = (i + 1) % ring_segs
            bm.faces.new((r0[i], r0[ni], r1[ni], r1[i]))

    mesh_fuse = bpy.data.meshes.new("Fuselaje_Mesh")
    bm.to_mesh(mesh_fuse)
    bm.free()
    obj_fuse = bpy.data.objects.new("Fuselaje", mesh_fuse)
    obj_fuse.data.materials.append(mat_body)
    obj_fuse.parent = root
    bpy.context.collection.objects.link(obj_fuse)

    # 2. Rampa trasera articulada (pivote en borde inferior bodega)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, -2.15, 0.0))
    obj_rampa = bpy.context.active_object
    obj_rampa.name = "Rampa_Trasera"
    obj_rampa.scale = (2.55, 4.35, 0.16)
    bpy.ops.object.transform_apply(scale=True)
    obj_rampa.location = (0.0, -4.6, -1.68)
    obj_rampa.rotation_euler = Euler((-0.46, 0.0, 0.0), "XYZ")
    obj_rampa.data.materials.append(mat_interior)
    obj_rampa.parent = root

    # 3. Ala principal alta
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.85, 1.82))
    obj_ala = bpy.context.active_object
    obj_ala.name = "Ala_Principal"
    obj_ala.scale = (38.0, 3.6, 0.44)
    bpy.ops.object.transform_apply(scale=True)
    obj_ala.data.materials.append(mat_body)
    obj_ala.parent = root

    # 4. 4 Motores + 4 Hélices articuladas
    for idx, ex in enumerate([-10.8, -5.5, 5.5, 10.8], start=1):
        is_outer = abs(ex) > 8.0
        ez = 1.42 if is_outer else 1.56
        ey = 2.15 if is_outer else 2.45

        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.45, depth=3.2, location=(ex, ey, ez))
        nac = bpy.context.active_object
        nac.name = f"Motor_{idx}"
        nac.rotation_euler = Euler((math.pi / 2, 0.0, 0.0), "XYZ")
        nac.data.materials.append(mat_belly)
        nac.parent = root

        hub = bpy.data.objects.new(f"Helice_{idx}", None)
        hub.location = (ex, ey + 1.78, ez)
        hub.parent = root
        bpy.context.collection.objects.link(hub)

        for b in range(4):
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, 1.05))
            pala = bpy.context.active_object
            pala.name = f"Pala_{idx}_{b+1}"
            pala.scale = (0.24, 0.045, 1.85)
            bpy.ops.object.transform_apply(scale=True)
            pala.rotation_euler = Euler((0.0, (b * math.pi) / 2.0, 0.32), "XYZ")
            pala.data.materials.append(mat_blade)
            pala.parent = hub

    # 5. Cola + Luz baliza
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, -11.4, 5.1))
    v_fin = bpy.context.active_object
    v_fin.name = "Estabilizador_Vertical"
    v_fin.scale = (0.34, 4.4, 6.8)
    bpy.ops.object.transform_apply(scale=True)
    v_fin.data.materials.append(mat_body)
    v_fin.parent = root

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, -12.1, 1.95))
    h_fin = bpy.context.active_object
    h_fin.name = "Estabilizador_Horizontal"
    h_fin.scale = (12.8, 2.2, 0.24)
    bpy.ops.object.transform_apply(scale=True)
    h_fin.data.materials.append(mat_body)
    h_fin.parent = root

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.18, location=(0.0, -13.2, 8.6))
    baliza = bpy.context.active_object
    baliza.name = "Luz_Baliza"
    baliza.data.materials.append(mat_red)
    baliza.parent = root

    todos = [root] + list(root.children_recursive)
    exportar_glb(todos, os.path.join(out_dir, "avion.glb"))


def construir_mochila_paracaidas(out_dir):
    limpiar_escena()

    mat_cordura = crear_material_pbr("Para_Cordura", (0.13, 0.15, 0.19, 1.0), 0.72, 0.10)
    mat_red = crear_material_pbr("Para_RojoCabanillas", (0.86, 0.15, 0.15, 1.0), 0.45, 0.08)
    mat_white = crear_material_pbr("Para_Blanco", (0.97, 0.98, 0.99, 1.0), 0.45, 0.05)
    mat_web = crear_material_pbr("Para_Correa", (0.08, 0.09, 0.12, 1.0), 0.80, 0.05)
    mat_steel = crear_material_pbr("Para_Acero", (0.82, 0.84, 0.86, 1.0), 0.22, 0.90)

    root = bpy.data.objects.new("Mochila_Paracaidas_Root", None)
    bpy.context.collection.objects.link(root)

    # 1. Cuerpo mochila dorsal
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, -0.08, 0.0))
    cuerpo = bpy.context.active_object
    cuerpo.name = "Mochila_Cuerpo"
    cuerpo.scale = (0.34, 0.15, 0.52)
    bpy.ops.object.transform_apply(scale=True)
    cuerpo.data.materials.append(mat_cordura)
    cuerpo.parent = root

    # 2. Solapas articuladas izquierda y derecha
    for side, nombre in [(-1, "Solapa_Izq"), (1, "Solapa_Der")]:
        pivote = bpy.data.objects.new(nombre, None)
        pivote.location = (side * 0.16, -0.16, -0.10)
        pivote.parent = root
        bpy.context.collection.objects.link(pivote)

        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-side * 0.08, -0.005, 0.0))
        solapa = bpy.context.active_object
        solapa.name = f"{nombre}_Malla"
        solapa.scale = (0.165, 0.018, 0.28)
        bpy.ops.object.transform_apply(scale=True)
        solapa.data.materials.append(mat_cordura)
        solapa.parent = pivote

    # 3. Correas de arnés hacia adelante (+Y en Blender = -Z frente en glTF)
    for side in (-1, 1):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side * 0.13, 0.12, 0.26))
        hombro = bpy.context.active_object
        hombro.name = f"Correa_Hombro_{'Izq' if side < 0 else 'Der'}"
        hombro.scale = (0.045, 0.28, 0.025)
        bpy.ops.object.transform_apply(scale=True)
        hombro.data.materials.append(mat_web)
        hombro.parent = root

        bpy.ops.mesh.primitive_torus_add(major_radius=0.026, minor_radius=0.006, location=(side * 0.13, 0.05, 0.26))
        anilla = bpy.context.active_object
        anilla.name = f"Anilla_3_{'Izq' if side < 0 else 'Der'}"
        anilla.data.materials.append(mat_steel)
        anilla.parent = root

    # 4. Pilotillo superior
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.32, location=(0.0, -0.35, 5.45))
    pilotillo = bpy.context.active_object
    pilotillo.name = "Pilotillo"
    pilotillo.scale = (1.0, 1.0, 0.45)
    bpy.ops.object.transform_apply(scale=True)
    pilotillo.data.materials.append(mat_red)
    pilotillo.parent = root

    # 5. Cúpula Ram-Air de 9 celdas (franjas rojas y blancas)
    cupula = bpy.data.objects.new("Cupula_Paracaidas", None)
    cupula.location = (0.0, 0.0, 4.35)
    cupula.parent = root
    bpy.context.collection.objects.link(cupula)

    num_cells = 9
    total_span = 7.4
    cell_w = total_span / num_cells
    chord = 2.85
    arch_r = 5.4

    for c in range(num_cells):
        xc = (c - (num_cells - 1) / 2.0) * cell_w
        theta = xc / arch_r
        px = math.sin(theta) * arch_r
        pz = math.cos(theta) * arch_r - arch_r

        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(px, 0.0, pz))
        celda = bpy.context.active_object
        celda.name = f"Celda_{c + 1}"
        celda.scale = (cell_w * 0.99, chord, 0.34)
        bpy.ops.object.transform_apply(scale=True)
        celda.rotation_euler = Euler((0.0, theta, 0.0), "XYZ")
        celda.data.materials.append(mat_red if c % 2 == 0 else mat_white)
        celda.parent = cupula

    todos = [root] + list(root.children_recursive)
    exportar_glb(todos, os.path.join(out_dir, "mochila_paracaidas.glb"))


def carpeta_salida():
    """--out si se da; si no, <processed>/salto_blender/ según config.json (rutas relativas a --root)."""
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    raiz = Path(argv[argv.index("--root") + 1]) if "--root" in argv else Path(".")
    if "--out" in argv:
        salida = Path(argv[argv.index("--out") + 1])
        return salida if salida.is_absolute() else raiz / salida
    config = json.loads((raiz / "config.json").read_text(encoding="utf-8"))
    return raiz / config.get("processed_dir", "data/processed") / "salto_blender"


if __name__ == "__main__":
    out_dir = carpeta_salida().resolve()
    construir_avion(str(out_dir))
    construir_mochila_paracaidas(str(out_dir))
    print(f"[OK] Modelos del salto en {out_dir}")
