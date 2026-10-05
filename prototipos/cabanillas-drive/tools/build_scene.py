"""Fase 2.1 — Escena 3D con Blender en modo consola (solo bpy/bmesh, sin addons).

- Terreno: malla desde terrain.f32 dividida en los mismos N×N chunks que las teselas de
  ortofoto (orto.json). Cada chunk lleva su tesela como material, con UV planares.
- Edificios: extrusión de buildings.geojson (base en base_y, techo plano en
  base_y + height), agrupados por chunk. Fachada con colores ocre/blanco de la Ribera
  (variación por edificio en color de vértice) y techo de teja oscura.
- Exporta <processed>/cabanillas_raw.glb (+Y arriba) SOLO con el terreno y guarda la
  escena completa en <processed>/cabanillas.blend. Los edificios del juego se generan en
  el navegador (src/escena/edificios.js) con tejado de ortofoto y fachadas procedurales.

Ejes: Blender es Z arriba. Se construye en (X, Y, Z) = (x, −z, y) para que, al exportar
con +Y arriba (glTF: x, Z, −Y), el GLB quede en coordenadas locales (x, y, z) del juego.

Uso (desde la raíz del proyecto):
    "<blender_path>" -b -P tools/build_scene.py -- --root .
"""
import argparse
import json
import random
import sys
import time
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.geometry import tessellate_polygon


def argumentos():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser(description="Construye la escena de Cabanillas Drive")
    p.add_argument("--root", default=".", help="raíz del proyecto (carpeta con config.json)")
    return p.parse_args(argv)


ARGS = argumentos()
RAIZ = Path(ARGS.root).resolve()
sys.path.insert(0, str(RAIZ / "tools"))
from comun import cargar_config, cargar_origin, dir_assets, dir_processed  # noqa: E402

# Colores en sRGB (0–255): fachadas típicas de la Ribera y teja oscura
FACHADAS = [(232, 224, 205), (226, 206, 168), (214, 188, 140), (236, 228, 214), (205, 172, 120), (222, 214, 196)]
TEJA = (112, 64, 48)
VARIACION_BRILLO = 0.06


def lineal(c):
    """sRGB 0–255 → lineal 0–1 (los colores de vértice de glTF son lineales)."""
    s = np.asarray(c, dtype=float) / 255
    return np.where(s <= 0.04045, s / 12.92, ((s + 0.055) / 1.055) ** 2.4)


def limpia_escena():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def nuevo_objeto(nombre, malla):
    obj = bpy.data.objects.new(nombre, malla)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def material_nuevo(nombre):
    """Material con un Principled BSDF conectado a la salida. En Blender 5 los materiales
    nuevos no siempre traen ese nodo, así que se crea si falta."""
    mat = bpy.data.materials.new(nombre)
    mat.use_backface_culling = True  # → glTF doubleSided = false (no hay caras vistas por detrás)
    if mat.node_tree is None:
        mat.use_nodes = True
    arbol = mat.node_tree
    bsdf = next((n for n in arbol.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        salida = next((n for n in arbol.nodes if n.type == "OUTPUT_MATERIAL"), None)
        if salida is None:
            salida = arbol.nodes.new("ShaderNodeOutputMaterial")
        bsdf = arbol.nodes.new("ShaderNodeBsdfPrincipled")
        arbol.links.new(bsdf.outputs["BSDF"], salida.inputs["Surface"])
    return mat, arbol.nodes, bsdf


# --------------------------------------------------------------------------- terreno
def material_orto(nombre, ruta_imagen):
    mat, nodos, bsdf = material_nuevo(nombre)
    bsdf.inputs["Roughness"].default_value = 1.0
    bsdf.inputs["Metallic"].default_value = 0.0
    tex = nodos.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(str(ruta_imagen))
    tex.interpolation = "Linear"
    tex.extension = "EXTEND"  # → CLAMP_TO_EDGE: sin costuras entre chunks
    mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def malla_terreno(nombre, alturas, meta, tesela):
    """Malla de un chunk: vértices de la rejilla dentro de la tesela (bordes compartidos
    con los vecinos para que no haya grietas), triángulos con diagonal NO–SE."""
    paso, ancho, alto = meta["paso_m"], meta["tamaño_x_m"], meta["tamaño_z_m"]
    c0 = round((tesela["x_min"] + ancho / 2) / paso)
    c1 = round((tesela["x_max"] + ancho / 2) / paso)
    f0 = round((tesela["z_min"] + alto / 2) / paso)
    f1 = round((tesela["z_max"] + alto / 2) / paso)
    sub = alturas[f0:f1 + 1, c0:c1 + 1]
    nf, nc = sub.shape

    xs = -ancho / 2 + np.arange(c0, c1 + 1) * paso
    zs = -alto / 2 + np.arange(f0, f1 + 1) * paso
    xx, zz = np.meshgrid(xs, zs)
    co = np.column_stack([xx.ravel(), -zz.ravel(), sub.ravel()]).astype(np.float32)

    i, j = np.meshgrid(np.arange(nf - 1), np.arange(nc - 1), indexing="ij")
    a = (i * nc + j).ravel()
    b, c = a + 1, a + nc
    d = c + 1
    tris = np.concatenate([np.column_stack([a, c, d]), np.column_stack([a, d, b])]).astype(np.int32)

    malla = bpy.data.meshes.new(nombre)
    malla.vertices.add(len(co))
    malla.vertices.foreach_set("co", co.ravel())
    malla.loops.add(tris.size)
    malla.loops.foreach_set("vertex_index", tris.ravel())
    malla.polygons.add(len(tris))
    malla.polygons.foreach_set("loop_start", np.arange(0, tris.size, 3, dtype=np.int32))
    malla.update(calc_edges=True)

    u = (xx.ravel() - tesela["x_min"]) / (tesela["x_max"] - tesela["x_min"])
    v = 1.0 - (zz.ravel() - tesela["z_min"]) / (tesela["z_max"] - tesela["z_min"])
    uv_vertice = np.column_stack([u, v]).astype(np.float32)
    capa_uv = malla.uv_layers.new(name="UVMap")
    capa_uv.data.foreach_set("uv", uv_vertice[tris.ravel()].ravel())
    malla.shade_smooth()
    malla.validate()
    return malla, len(tris)


# ------------------------------------------------------------------------- edificios
def material_color_vertice(nombre, rugosidad):
    mat, nodos, bsdf = material_nuevo(nombre)
    bsdf.inputs["Roughness"].default_value = rugosidad
    attr = nodos.new("ShaderNodeVertexColor")
    attr.layer_name = "Color"
    mat.node_tree.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def area_firmada(puntos):
    return 0.5 * sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(puntos, puntos[1:] + puntos[:1]))


def anillo_blender(coords, exterior):
    """[x, z] locales → (X, Y) de Blender sin punto de cierre; exterior CCW, huecos CW."""
    puntos = [(x, -z) for x, z in coords]
    if len(puntos) > 1 and puntos[0] == puntos[-1]:
        puntos = puntos[:-1]
    if (area_firmada(puntos) > 0) != exterior:
        puntos.reverse()
    return puntos


def anade_edificio(bm, capa_color, props, anillos, c_fachada, c_tejado):
    base, techo = props["base_y"], props["base_y"] + props["height"]
    superiores = []
    for k, anillo in enumerate(anillos):
        abajo = [bm.verts.new((x, y, base)) for x, y in anillo]
        arriba = [bm.verts.new((x, y, techo)) for x, y in anillo]
        n = len(anillo)
        for a in range(n):
            b = (a + 1) % n
            cara = bm.faces.new((abajo[a], abajo[b], arriba[b], arriba[a]))
            cara.material_index = 0
            for bucle in cara.loops:
                bucle[capa_color] = c_fachada
        superiores.append(arriba)

    poligonos = [[v.co.copy() for v in anillo] for anillo in superiores]
    planos = [v for anillo in superiores for v in anillo]
    for tri in tessellate_polygon(poligonos):
        verts = [planos[t] for t in tri]
        normal = (verts[1].co - verts[0].co).cross(verts[2].co - verts[0].co)
        if normal.z < 0:
            verts.reverse()
        try:
            cara = bm.faces.new(verts)
        except ValueError:  # triángulo degenerado o repetido
            continue
        cara.material_index = 1
        for bucle in cara.loops:
            bucle[capa_color] = c_tejado


def color_edificio(ident):
    rng = random.Random(ident)
    brillo = 1 + rng.uniform(-VARIACION_BRILLO, VARIACION_BRILLO)
    fachada = np.clip(lineal(rng.choice(FACHADAS)) * brillo, 0, 1)
    tejado = np.clip(lineal(TEJA) * (1 + rng.uniform(-0.12, 0.12)), 0, 1)
    return (*fachada, 1.0), (*tejado, 1.0)


# ------------------------------------------------------------------- comprobaciones
def altura_terreno(alturas, meta, x, z):
    """Interpolación bilineal en la rejilla del terreno (coordenadas locales)."""
    paso = meta["paso_m"]
    fc = np.clip((np.asarray(x) + meta["tamaño_x_m"] / 2) / paso, 0, meta["columnas"] - 1.000001)
    ff = np.clip((np.asarray(z) + meta["tamaño_z_m"] / 2) / paso, 0, meta["filas"] - 1.000001)
    c0, f0 = fc.astype(int), ff.astype(int)
    tc, tf = fc - c0, ff - f0
    h00, h01 = alturas[f0, c0], alturas[f0, c0 + 1]
    h10, h11 = alturas[f0 + 1, c0], alturas[f0 + 1, c0 + 1]
    return (h00 * (1 - tc) + h01 * tc) * (1 - tf) + (h10 * (1 - tc) + h11 * tc) * tf


def exporta_glb(ruta, objetos):
    """Exporta solo `objetos`. Los edificios del juego se generan en el navegador desde
    buildings.geojson (tejado con ortofoto y fachadas procedurales); aquí quedan en el
    .blend para revisarlos."""
    for obj in bpy.context.scene.objects:
        obj.select_set(obj in objetos)
    opciones = dict(filepath=str(ruta), export_format="GLB", export_yup=True, export_apply=True,
                    export_texcoords=True, export_normals=True, export_materials="EXPORT",
                    export_image_format="AUTO", export_vertex_color="MATERIAL", export_cameras=False,
                    export_lights=False, use_selection=True, export_extras=False)
    disponibles = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    bpy.ops.export_scene.gltf(**{k: v for k, v in opciones.items() if k in disponibles})


def main():
    t0 = time.time()
    config = cargar_config()
    origin = cargar_origin(config)
    assets, processed = dir_assets(config), dir_processed(config)
    meta = json.loads((assets / "terrain" / "terrain.json").read_text(encoding="utf-8"))
    orto = json.loads((assets / "orto" / "orto.json").read_text(encoding="utf-8"))
    edificios = json.loads((assets / "buildings.geojson").read_text(encoding="utf-8"))["features"]
    alturas = np.fromfile(assets / "terrain" / "terrain.f32", dtype="<f4").reshape(meta["filas"], meta["columnas"])
    if abs(meta["tamaño_x_m"] - origin["ancho"]) > 1e-6 or abs(meta["tamaño_z_m"] - origin["alto"]) > 1e-6:
        raise SystemExit("terrain.json no coincide con origin.json; vuelve a ejecutar 01_origin_terrain.py")

    limpia_escena()
    print(f"Blender {bpy.app.version_string} · {orto['filas']}×{orto['columnas']} chunks")

    # --- Terreno
    tris_terreno = 0
    terreno = []
    for tesela in orto["teselas"]:
        nombre = f"terreno_{tesela['fila']}_{tesela['col']}"
        malla, n = malla_terreno(nombre, alturas, meta, tesela)
        malla.materials.append(material_orto(f"orto_{tesela['fila']}_{tesela['col']}",
                                             assets / "orto" / tesela["archivo"]))
        terreno.append(nuevo_objeto(nombre, malla))
        tris_terreno += n
    print(f"Terreno: {tris_terreno:,} triángulos ({time.time() - t0:.0f} s)")

    # --- Edificios agrupados por chunk (según el centroide de su huella)
    fachada = material_color_vertice("fachada", 0.9)
    tejado = material_color_vertice("tejado", 0.75)
    tx, tz = orto["tesela_m"]
    grupos = {}
    for f in edificios:
        exterior = f["geometry"]["coordinates"][0]
        cx = sum(p[0] for p in exterior) / len(exterior)
        cz = sum(p[1] for p in exterior) / len(exterior)
        col = min(max(int((cx + origin["ancho"] / 2) // tx), 0), orto["columnas"] - 1)
        fila = min(max(int((cz + origin["alto"] / 2) // tz), 0), orto["filas"] - 1)
        grupos.setdefault((fila, col), []).append(f)

    flotan, enterrados, max_flota = 0, 0, 0.0
    caras = 0
    for (fila, col), lista in sorted(grupos.items()):
        bm = bmesh.new()
        capa_color = bm.loops.layers.float_color.new("Color")
        for f in lista:
            props = f["properties"]
            anillos = [anillo_blender(a, k == 0) for k, a in enumerate(f["geometry"]["coordinates"])]
            anillos = [a for a in anillos if len(a) >= 3]
            if not anillos:
                continue
            c_fachada, c_tejado = color_edificio(props["id"])
            anade_edificio(bm, capa_color, props, anillos, c_fachada, c_tejado)

            # ¿Flota o queda enterrado? Terreno en los vértices de la huella
            pts = np.array([p for a in f["geometry"]["coordinates"] for p in a])
            suelo = altura_terreno(alturas, meta, pts[:, 0], pts[:, 1])
            flota = props["base_y"] - float(suelo.min())
            max_flota = max(max_flota, flota)
            flotan += flota > 0.5
            enterrados += float(suelo.max()) > props["base_y"] + props["height"] - 0.5
        nombre = f"edificios_{fila}_{col}"
        malla = bpy.data.meshes.new(nombre)
        bm.to_mesh(malla)
        caras += len(bm.faces)
        bm.free()
        malla.materials.append(fachada)
        malla.materials.append(tejado)
        nuevo_objeto(nombre, malla)
    print(f"Edificios: {len(edificios)} en {len(grupos)} chunks, {caras:,} caras")
    print(f"  Base sobre el terreno (vértices de la huella): máximo {max_flota:.2f} m por encima del punto "
          f"más bajo; {flotan} edificios flotan > 0,5 m")
    print(f"  Tejado a menos de 0,5 m del terreno más alto de su huella: {enterrados} edificios")

    # --- Exportación
    ruta_glb = processed / "cabanillas_raw.glb"
    exporta_glb(ruta_glb, terreno)
    print(f"GLB (solo terreno): {ruta_glb} ({ruta_glb.stat().st_size / 1_048_576:.1f} MB)")

    ruta_blend = processed / "cabanillas.blend"
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(ruta_blend), compress=True)
    print(f"Blend: {ruta_blend} ({ruta_blend.stat().st_size / 1_048_576:.1f} MB) · total {time.time() - t0:.0f} s")


if __name__ == "__main__":
    main()
