"""Coches 3D: prepara los modelos de data/raw/coches/ para el juego (Blender, modo consola).

Por cada modelo de tools/coches.json:
  - importa (glb, fbx, obj o .blend), pone los esqueletos en reposo y aplana la jerarquía
  - quita suelos, objetos excluidos e interiores (no se ven y pesan mucho)
  - lo gira para que el frontal mire a −Y de Blender (= +Z del juego), lo escala a su
    largo real y lo apoya en el suelo (z = 0) centrado
  - reduce triángulos (tris_aparcado / tris_jugador), unifica cristales y marca como
    «pintura» el material de la carrocería para poder cambiarle el color en el juego
  - exporta <processed>/coches_raw/<id>.glb y una vista de comprobación

El coche del jugador (jugador: true) conserva las 4 ruedas como objetos aparte, con el
origen en su centro, para que giren. Se genera además <processed>/coches_raw/coches.json
con medidas, ruedas y fuentes; `npm run coches` lo optimiza a public/assets/coches/.

Uso (desde la raíz del proyecto):
    "<blender_path>" -b -P tools/build_coches.py -- --root . [--solo id1,id2]
"""
import argparse
import json
import math
import re
import sys
import time
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector


def argumentos():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--root", default=".")
    p.add_argument("--solo", default="", help="ids separados por comas")
    return p.parse_args(argv)


ARGS = argumentos()
RAIZ = Path(ARGS.root).resolve()
sys.path.insert(0, str(RAIZ / "tools"))
from comun import cargar_config, dir_previews, dir_processed, dir_raw  # noqa: E402

INTERIOR = re.compile(r"interior|leather|carpet|seat|asiento|dash|ceiling|pedal|belt|engine|motor|cuero|wood", re.I)
CRISTAL = re.compile(r"glass|window|cristal|vidrio|windscreen|windshield", re.I)
NO_PINTURA = re.compile(r"glass|window|tire|tyre|rubber|chrome|rim|wheel|light|lamp|interior|black|plastic|grill|"
                        r"metal|brake|plate|logo|carbon|mirror|neum|cromo|matt|caliper|drl|misc|aluminum|aluminium", re.I)
RUEDA = re.compile(r"wheel|rueda|roda|tire|tyre", re.I)
ANCHO_MAX_M = 2.45   # más ancho que esto no es una pieza de un turismo
ALTO_MAX_M = 2.6
FRENO = re.compile(r"brake|caliper|freno", re.I)


# ----------------------------------------------------------------------- utilidades
def mallas():
    return [o for o in bpy.context.scene.objects if o.type == "MESH"]


def triangulos(objs):
    total = 0
    for o in objs:
        o.data.calc_loop_triangles()
        total += len(o.data.loop_triangles)
    return total


def caja(objs):
    """Caja envolvente en coordenadas de mundo, desde los vértices (bound_box puede estar
    desactualizado tras transformar la malla)."""
    import numpy as np
    bloques = []
    for o in objs:
        n = len(o.data.vertices)
        if not n:
            continue
        co = np.empty(n * 3, dtype=np.float64)
        o.data.vertices.foreach_get("co", co)
        co = co.reshape(-1, 3)
        mw = np.array(o.matrix_world)
        bloques.append(co @ mw[:3, :3].T + mw[:3, 3])
    pts = np.concatenate(bloques)
    return Vector(pts.min(axis=0)), Vector(pts.max(axis=0))


def borra(objs):
    for o in list(objs):
        bpy.data.objects.remove(o, do_unlink=True)


def hornea(o):
    """Aplica modificadores y transformación del objeto a su malla (sin operadores)."""
    grafo = bpy.context.evaluated_depsgraph_get()
    nueva = bpy.data.meshes.new_from_object(o.evaluated_get(grafo))
    nueva.transform(o.matrix_world)
    o.modifiers.clear()
    o.data = nueva
    o.matrix_world = Matrix.Identity(4)


def importa(ruta: Path):
    ext = ruta.suffix.lower()
    if ext == ".glb" or ext == ".gltf":
        bpy.ops.import_scene.gltf(filepath=str(ruta))
    elif ext == ".fbx":
        try:
            bpy.ops.import_scene.fbx(filepath=str(ruta), use_anim=False)
        except RuntimeError as e:
            # FBX antiguos (versión < 7100): importador nuevo de Blender (ufbx)
            print(f"  importador FBX clásico: {e}; se usa wm.fbx_import")
            bpy.ops.wm.fbx_import(filepath=str(ruta))
    elif ext == ".obj":
        bpy.ops.wm.obj_import(filepath=str(ruta))
    elif ext == ".blend":
        with bpy.data.libraries.load(str(ruta), link=False) as (origen, destino):
            destino.objects = origen.objects
        for o in destino.objects:
            if o is not None and o.type == "MESH":
                bpy.context.scene.collection.objects.link(o)
    else:
        raise ValueError(f"Formato no soportado: {ruta}")


# -------------------------------------------------------------------------- limpieza
def limpia(cfg):
    for o in bpy.context.scene.objects:
        if o.type == "ARMATURE":
            o.data.pose_position = "REST"
    bpy.context.view_layer.update()
    for o in mallas():
        for m in list(o.modifiers):
            if m.type == "ARMATURE":
                o.modifiers.remove(m)
    # Datos únicos por objeto (los modelos instancian mallas) y jerarquía aplanada
    for o in mallas():
        if o.data.users > 1:
            o.data = o.data.copy()
    for o in mallas():
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
    borra([o for o in bpy.context.scene.objects if o.type != "MESH"])
    for o in mallas():
        hornea(o)
    # Modelos con piezas exportadas en marcos de ejes distintos (p. ej. civil05):
    # se gira cada objeto según la primera regla cuyo patrón coincida con su nombre
    for o in mallas():
        for regla in cfg.get("rotar_objetos", []):
            if re.search(regla["patron"], o.name, re.I):
                o.data.transform(Matrix.Rotation(math.radians(regla["grados"]), 4, regla["eje"]))
                o.data.update()
                break

    excluir = [re.compile(e, re.I) for e in cfg.get("excluir", [])]
    quitar = [o for o in mallas() if any(e.search(o.name) for e in excluir)]
    # Interiores: objetos cuyos materiales son todos de interior
    for o in mallas():
        nombres = [m.name for m in o.data.materials if m]
        if nombres and all(INTERIOR.search(n) for n in nombres):
            quitar.append(o)
    borra(set(quitar))
    # Caras de materiales excluidos (p. ej. el habitáculo del kuga, que va en el mismo objeto
    # que el capó y parte del techo: quitar el objeto entero dejaba el motor a la vista)
    excluir_mat = [re.compile(e, re.I) for e in cfg.get("excluir_materiales", [])]
    if excluir_mat:
        for o in mallas():
            fuera = {i for i, m in enumerate(o.data.materials) if m and any(e.search(m.name) for e in excluir_mat)}
            if not fuera:
                continue
            bm = bmesh.new()
            bm.from_mesh(o.data)
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in fuera], context="FACES")
            bm.to_mesh(o.data)
            bm.free()
        borra([o for o in mallas() if not o.data.polygons])

    # Suelos y fondos: objetos planos casi tan grandes como toda la escena
    mn, mx = caja(mallas())
    lado = max(mx.x - mn.x, mx.y - mn.y)
    planos = []
    for o in mallas():
        a, b = caja([o])
        horizontal = max(b.x - a.x, b.y - a.y)
        if horizontal > 0.6 * lado and (b.z - a.z) < 0.03 * horizontal:
            planos.append(o)
    borra(planos)

    if cfg.get("un_coche"):
        deja_un_coche()


def deja_un_coche():
    """Si la escena trae varios coches, se queda con el grupo de objetos más pesado."""
    objs = mallas()
    cajas = {o.name: caja([o]) for o in objs}
    grupos, asignado = [], {}
    for o in objs:
        if o.name in asignado:
            continue
        grupo, pila = [], [o]
        asignado[o.name] = True
        while pila:
            a = pila.pop()
            grupo.append(a)
            amn, amx = cajas[a.name]
            for b in objs:
                if b.name in asignado:
                    continue
                bmn, bmx = cajas[b.name]
                margen = 0.02 * (amx - amn).length
                if all(amn[i] - margen <= bmx[i] and bmn[i] - margen <= amx[i] for i in range(3)):
                    asignado[b.name] = True
                    pila.append(b)
        grupos.append(grupo)
    grupos.sort(key=triangulos, reverse=True)
    for g in grupos[1:]:
        borra(g)
    print(f"  {len(grupos)} grupos de objetos; se conserva el mayor")


# -------------------------------------------------------------------- normalización
def eje_principal(objs):
    """Ángulo (rad) del eje largo en planta, por componentes principales de los vértices.
    Se redondea a múltiplos de 90° si está a menos de 2° (modelos ya alineados)."""
    import numpy as np
    pts = []
    for o in objs:
        n = len(o.data.vertices)
        co = np.empty(n * 3)
        o.data.vertices.foreach_get("co", co)
        pts.append(co.reshape(-1, 3)[:, :2])
    xy = np.concatenate(pts)
    xy = xy[:: max(1, len(xy) // 200000)] - xy.mean(axis=0)
    valores, vectores = np.linalg.eigh(np.cov(xy.T))
    vx, vy = vectores[:, np.argmax(valores)]
    angulo = math.atan2(vy, vx)
    # El vector propio puede salir con cualquier signo: ángulo en (−88°, 92°], de modo
    # que un eje casi vertical en planta (±90°) siempre dé +90° y no se dé la vuelta
    while angulo > math.pi / 2 + math.radians(2):
        angulo -= math.pi
    while angulo <= -math.pi / 2 + math.radians(2):
        angulo += math.pi
    recto = round(angulo / (math.pi / 2)) * (math.pi / 2)
    return recto if abs(angulo - recto) < math.radians(2) else angulo


def normaliza(cfg):
    objs = mallas()
    # El eje largo tiene que acabar en Y: se gira lo que falte desde el eje principal
    giro = math.pi / 2 - eje_principal(objs)
    giro += math.radians(cfg.get("girar", 0))
    rot = Matrix.Rotation(giro, 4, "Z")
    for o in objs:
        o.data.transform(rot)
        o.data.update()
    for pasada in range(2):
        objs = mallas()
        mn, mx = caja(objs)
        escala = cfg["largo_m"] / (mx.y - mn.y)
        centro = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
        m = Matrix.Scale(escala, 4) @ Matrix.Translation(-centro)
        for o in objs:
            o.data.transform(m)
            o.data.update()
        if pasada == 0:
            # Piezas imposibles para un turismo (sombras, planos de estudio…): fuera
            raras = []
            for o in objs:
                a, b = caja([o])
                if (b.x - a.x) > ANCHO_MAX_M or (b.z - a.z) > ALTO_MAX_M:
                    raras.append(o)
            if not raras:
                break
            print(f"   fuera por tamaño: {', '.join(o.name for o in raras)[:120]}")
            borra(raras)
    mn, mx = caja(mallas())
    return mx - mn


def reduce(objs, objetivo):
    total = triangulos(objs)
    if total <= objetivo:
        return total
    ratio = objetivo / total
    for o in objs:
        o.data.calc_loop_triangles()
        antes = len(o.data.loop_triangles)
        if antes < 60:
            continue
        r = max(ratio, 60 / antes)
        for intento in range(2):
            mod = o.modifiers.new("reduce", "DECIMATE")
            mod.ratio = r
            mod.use_collapse_triangulate = True
            hornea(o)
            o.data.calc_loop_triangles()
            despues = len(o.data.loop_triangles)
            if despues <= max(3 * r * antes, 200) or intento == 1:
                break
            # Mallas con caras sueltas (vértices duplicados) no se dejan simplificar:
            # se sueldan los vértices coincidentes y se repite
            bm = bmesh.new()
            bm.from_mesh(o.data)
            bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
            bm.to_mesh(o.data)
            bm.free()
            r = max(ratio * antes / max(despues, 1), 60 / despues)
        if antes > 100000:
            print(f"   reduce {o.name[:30]}: {antes:,} → {despues:,}")
    return triangulos(objs)


# ------------------------------------------------------------------------ materiales
def bsdf_de(mat):
    if not mat or not mat.node_tree:
        return None
    return next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)


def imagen_valida(img):
    """Empaquetada (GLB) o con archivo existente. has_data no sirve: las imágenes se cargan
    de forma perezosa y antes de usarse dan False."""
    if img is None:
        return False
    if img.packed_file:
        return True
    ruta = bpy.path.abspath(img.filepath)
    return bool(ruta) and Path(ruta).is_file()


def a_principled(mat):
    """El exportador glTF solo entiende Principled BSDF: los materiales con otro sombreador
    (difuso, brillo…) se convierten conservando su color."""
    arbol = mat.node_tree
    color = (0.5, 0.5, 0.5, 1)
    for n in arbol.nodes:
        if n.type.startswith("BSDF") and "Color" in n.inputs:
            color = tuple(n.inputs["Color"].default_value)
            break
    salida = next((n for n in arbol.nodes if n.type == "OUTPUT_MATERIAL"), None) or arbol.nodes.new(
        "ShaderNodeOutputMaterial")
    bsdf = arbol.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = color
    arbol.links.new(bsdf.outputs["BSDF"], salida.inputs["Surface"])
    return bsdf


def arregla_materiales(lado_max):
    for mat in bpy.data.materials:
        if mat.users and not mat.node_tree:
            mat.use_nodes = True
        if not mat.node_tree:
            continue
        if bsdf_de(mat) is None:
            a_principled(mat)
        for n in list(mat.node_tree.nodes):
            if n.type == "TEX_IMAGE" and not imagen_valida(n.image):
                mat.node_tree.nodes.remove(n)
        bsdf = bsdf_de(mat)
        if bsdf and CRISTAL.search(mat.name):
            for enlace in list(bsdf.inputs["Base Color"].links):
                mat.node_tree.links.remove(enlace)
            bsdf.inputs["Base Color"].default_value = (0.035, 0.045, 0.055, 1)
            bsdf.inputs["Roughness"].default_value = 0.05
            bsdf.inputs["Metallic"].default_value = 0.1
            bsdf.inputs["Alpha"].default_value = 1.0
            mat.name = "cristal"
        if bsdf:
            bsdf.inputs["Alpha"].default_value = 1.0
    for img in bpy.data.images:
        if imagen_valida(img) and max(img.size) > lado_max:
            f = lado_max / max(img.size)
            img.scale(max(1, int(img.size[0] * f)), max(1, int(img.size[1] * f)))


def areas_materiales(objs):
    areas = {}
    for o in objs:
        for p in o.data.polygons:
            if p.material_index < len(o.data.materials):
                mat = o.data.materials[p.material_index]
                if mat:
                    areas[mat] = areas.get(mat, 0) + p.area
    return areas


def informe(objs):
    """Objetos más grandes y materiales con más superficie, para ajustar coches.json."""
    filas = []
    for o in objs:
        mn, mx = caja([o])
        o.data.calc_loop_triangles()
        filas.append(((mx - mn).length, o.name, len(o.data.loop_triangles), [round(v, 2) for v in (mx - mn)]))
    for diag, nombre, tris, dims in sorted(filas, reverse=True)[:8]:
        print(f"   objeto {nombre[:40]:40s} diag {diag:8.2f} tris {tris:7d} dims {dims}")
    for mat, area in sorted(areas_materiales(objs).items(), key=lambda t: -t[1])[:10]:
        bsdf = bsdf_de(mat)
        tex = bool(bsdf and bsdf.inputs["Base Color"].links)
        color = [round(c, 2) for c in bsdf.inputs["Base Color"].default_value[:3]] if bsdf else None
        print(f"   material {mat.name[:40]:40s} área {area:10.2f} textura {'sí' if tex else 'no'} color {color}")


def marca_pintura(objs, preferidos=None):
    """Material de la carrocería → «pintura» (blanco, se tiñe por instancia en el juego).
    preferidos: lista de expresiones con los nombres de material (coches.json); si no hay,
    el material sin textura con más superficie que no sea cristal, goma, cromo, luces…
    preferidos = False desactiva el teñido (pintura con textura propia)."""
    if preferidos is False:
        return None
    areas = areas_materiales(objs)
    if preferidos:
        patrones = [re.compile(p, re.I) for p in preferidos]
        elegidos = [m for m in areas if any(p.search(m.name) for p in patrones)]
    else:
        candidatos = []
        for mat, area in areas.items():
            bsdf = bsdf_de(mat)
            con_textura = bsdf is not None and bool(bsdf.inputs["Base Color"].links)
            if NO_PINTURA.search(mat.name) or mat.name == "cristal" or con_textura or bsdf is None:
                continue
            candidatos.append((area, mat))
        elegidos = [max(candidatos, key=lambda t: t[0])[1]] if candidatos else []
    if not elegidos:
        return None
    color = tuple(bsdf_de(elegidos[0]).inputs["Base Color"].default_value) if bsdf_de(elegidos[0]) else (1, 1, 1, 1)
    # Todas las caras de los materiales elegidos pasan a un único material «pintura»
    pintura = elegidos[0]
    for o in objs:
        for i, mat in enumerate(o.data.materials):
            if mat in elegidos:
                o.data.materials[i] = pintura
    pintura.name = "pintura"
    bsdf = bsdf_de(pintura)
    if bsdf:
        for enlace in list(bsdf.inputs["Base Color"].links):
            pintura.node_tree.links.remove(enlace)
        bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
        bsdf.inputs["Roughness"].default_value = 0.3
        bsdf.inputs["Metallic"].default_value = 0.3
    return [round(c, 3) for c in color[:3]]


# --------------------------------------------------------------------------- ruedas
def separa_ruedas():
    """Ruedas del coche del jugador: objetos con nombre de rueda (sin frenos), con el
    origen en su centro. Devuelve sus datos en coordenadas del juego (x, y, z)."""
    ruedas = [o for o in mallas() if RUEDA.search(o.name) and not FRENO.search(o.name)]
    datos = []
    for o in ruedas:
        mn, mx = caja([o])
        centro = (mn + mx) / 2
        o.data.transform(Matrix.Translation(-centro))
        o.location = centro
        radio = (mx.z - mn.z) / 2
        # Blender (X, Y, Z) → juego (x, y, z) = (X, Z, −Y)
        datos.append({"objeto": o.name, "centro": [round(centro.x, 4), round(centro.z, 4), round(-centro.y, 4)],
                      "radio": round(radio, 4), "ancho": round(mx.x - mn.x, 4)})
    return ruedas, datos


def une(objs, nombre):
    principal = objs[0]
    if len(objs) > 1:
        with bpy.context.temp_override(active_object=principal, object=principal,
                                       selected_objects=objs, selected_editable_objects=objs):
            bpy.ops.object.join()
    principal.name = nombre
    principal.data.name = nombre
    return principal


# ------------------------------------------------------------------------ exportación
def exporta(ruta):
    opciones = dict(filepath=str(ruta), export_format="GLB", export_yup=True, export_apply=True,
                    export_texcoords=True, export_normals=True, export_materials="EXPORT",
                    export_image_format="AUTO", export_cameras=False, export_lights=False, use_selection=False,
                    export_extras=False, export_animations=False, export_skins=False, export_morph=False)
    disponibles = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    bpy.ops.export_scene.gltf(**{k: v for k, v in opciones.items() if k in disponibles})


def vista(ruta_png, pintura_prueba=True):
    """Vista lateral desde +X: el frontal (−Y) debe quedar a la IZQUIERDA. La pintura se
    tiñe de verde para comprobar que se ha elegido bien."""
    objs = mallas()
    mn, mx = caja(objs)
    centro, diag = (mn + mx) / 2, (mx - mn).length
    mat = bpy.data.materials.get("pintura")
    if mat and pintura_prueba:
        bsdf_de(mat).inputs["Base Color"].default_value = (0.1, 0.65, 0.2, 1)
    mundo = bpy.data.worlds.new("w")
    mundo.color = (0.8, 0.82, 0.85)
    bpy.context.scene.world = mundo
    sol = bpy.data.objects.new("sol", bpy.data.lights.new("sol", "SUN"))
    sol.data.energy = 3.5
    sol.rotation_euler = (math.radians(40), 0, math.radians(60))
    bpy.context.scene.collection.objects.link(sol)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    esc = bpy.context.scene
    esc.render.resolution_x, esc.render.resolution_y = 640, 300
    cam.location = centro + Vector((diag * 1.6, -diag * 0.55, diag * 0.45))
    cam.rotation_euler = (centro - cam.location).to_track_quat("-Z", "Y").to_euler()
    esc.render.filepath = str(ruta_png)
    bpy.ops.render.render(write_still=True)
    borra([sol, cam])
    if mat and pintura_prueba:
        bsdf_de(mat).inputs["Base Color"].default_value = (1, 1, 1, 1)


def main():
    config = cargar_config()
    conf = json.loads((RAIZ / "tools" / "coches.json").read_text(encoding="utf-8"))
    solo = {s for s in ARGS.solo.split(",") if s}
    origen = dir_raw(config) / "coches"
    salida = dir_processed(config) / "coches_raw"
    vistas = dir_previews(config) / "coches"
    salida.mkdir(parents=True, exist_ok=True)
    vistas.mkdir(parents=True, exist_ok=True)
    ruta_manifiesto = salida / "coches.json"
    manifiesto = json.loads(ruta_manifiesto.read_text(encoding="utf-8")) if ruta_manifiesto.exists() else {}

    for cfg in conf["modelos"]:
        if solo and cfg["id"] not in solo:
            continue
        t0 = time.time()
        ruta = origen / cfg["id"] / cfg["archivo"]
        print(f"== {cfg['id']}: {ruta.name}")
        bpy.ops.wm.read_factory_settings(use_empty=True)
        importa(ruta)
        tris_inicio = triangulos(mallas())
        limpia(cfg)
        dims = normaliza(cfg)
        informe(mallas())
        jugador = cfg.get("jugador", False)
        arregla_materiales(conf["lado_textura_max"])

        datos_ruedas = []
        if jugador:
            ruedas, datos_ruedas = separa_ruedas()
            if len(ruedas) != 4:
                raise SystemExit(f"{cfg['id']}: se esperaban 4 ruedas y hay {len(ruedas)}")
            cuerpo = [o for o in mallas() if o not in ruedas]
            tris_ruedas = reduce(ruedas, conf["tris_jugador"] // 8)
            reduce(cuerpo, conf["tris_jugador"] - tris_ruedas)
            une(cuerpo, "carroceria")
            for o, d in zip(ruedas, datos_ruedas):
                o.name = o.data.name = f"rueda_{'d' if d['centro'][2] > 0 else 't'}{'i' if d['centro'][0] > 0 else 'd'}"
                d["objeto"] = o.name
        else:
            reduce(mallas(), cfg.get("tris", conf["tris_aparcado"]))
            une(mallas(), cfg["id"])
        pintura = marca_pintura(mallas(), cfg.get("pintura"))
        tris_fin = triangulos(mallas())

        vista(vistas / f"{cfg['id']}.png")
        exporta(salida / f"{cfg['id']}.glb")
        # Versión ligera para los coches aparcados lejanos
        archivo_lejos = None
        if not jugador:
            reduce(mallas(), conf["tris_lejos"])
            archivo_lejos = f"{cfg['id']}_lejos.glb"
            exporta(salida / archivo_lejos)
        manifiesto[cfg["id"]] = {
            "archivo": f"{cfg['id']}.glb", "archivo_lejos": archivo_lejos, "jugador": jugador,
            "largo": round(dims.y, 3), "ancho": round(dims.x, 3), "alto": round(dims.z, 3),
            "pintura": pintura is not None, "color_original": pintura, "triangulos": tris_fin,
            "ruedas": datos_ruedas, "fuente": cfg.get("fuente", ""),
        }
        print(f"   {tris_inicio:,} → {tris_fin:,} triángulos · {dims.y:.2f} × {dims.x:.2f} × {dims.z:.2f} m · "
              f"pintura: {'sí' if pintura else 'no (textura)'} · {time.time() - t0:.0f} s")
    ruta_manifiesto.write_text(json.dumps(manifiesto, ensure_ascii=False, indent=1), encoding="utf-8")
    print("FIN")


if __name__ == "__main__":
    main()
