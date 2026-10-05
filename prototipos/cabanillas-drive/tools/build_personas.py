"""Paso F6 — Peatones realistas con MakeHuman (MPFB2) en Blender, sin interfaz.

Por cada persona de tools/personas.json:
1. MPFB crea el cuerpo (sexo, edad, peso, músculo, altura, origen) con la malla reducida
   (proxy de ~1 600 vértices), el esqueleto «game_engine» (53 huesos), piel, ojos, cejas,
   pestañas, pelo y ropa (recursos CC0 de MakeHuman), con materiales de imagen simple.
2. Se aplica lo que oculta el cuerpo bajo la ropa, se reduce el pelo y la ropa a un presupuesto
   de triángulos y se une todo en una malla con un único material: las texturas se copian a un
   atlas (cada pieza en su casilla con margen) y se recolocan las UV. A los mayores se les
   aclara y agrisa el pelo.
3. Animaciones hechas aquí: «andar» (ciclo de 32 fotogramas a 30 fps: 1,07 s y 1,39 m a
   1,3 m/s; cadera, rodillas, tobillos, brazos y balanceo) y «quieto» (respiración, 4 s).
4. Exporta <salida>/<id>.glb y una vista previa <salida>/<id>.png.

Uso (lo lanza tools/14_personas.py):
    set BLENDER_USER_RESOURCES=data/processed/blender_mpfb
    blender -b --python tools/build_personas.py -- tools/personas.json data/processed/personas [--solo id]
"""
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Quaternion, Vector

from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.objectservice import ObjectService

ATLAS_LADO = 2048
MARGEN_PX = 8
CASILLA = {"Proxymeshes": 1024, "Hair": 512, "Clothes": 512, "Eyebrows": 256, "Eyelashes": 128, "Eyes": 128}
PRESUPUESTO_TRIS = {"Hair": 3000, "Clothes": 2600, "Eyebrows": 300, "Eyelashes": 300, "Eyes": 400}
FOTOGRAMAS_PASO = 32
FPS = 30
VELOCIDAD_DISENO = 1.3          # m/s a la que el ciclo no patina
FOTOGRAMAS_QUIETO = 120


def argumentos():
    a = sys.argv[sys.argv.index("--") + 1:]
    solo = a[a.index("--solo") + 1] if "--solo" in a else None
    return Path(a[0]), Path(a[1]), solo


def vacia_escena():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coleccion in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.images, bpy.data.actions):
        for d in list(coleccion):
            coleccion.remove(d)


def edad_a_macro(anos):
    if anos < 25:
        return 0.1875 + (anos - 11) / 14 * 0.3125
    return min(1.0, 0.5 + (anos - 25) / 65 * 0.5)


def crea_humano(p, comun):
    info = HumanService._create_default_human_info_dict()
    hombre = p["sexo"] == "hombre"
    af, ca, asi = p["raza"]
    info["phenotype"] = {
        "gender": 1.0 if hombre else 0.0, "age": edad_a_macro(p["edad"]), "muscle": p["musculo"],
        "weight": p["peso"], "proportions": 0.5, "height": p["altura"], "cupsize": 0.5, "firmness": 0.5,
        "race": {"african": af, "caucasian": ca, "asian": asi},
    }
    info.update({
        "name": p["id"], "rig": "game_engine", "proxy": comun["proxy"][p["sexo"]],
        "eyes": comun["ojos"], "eyebrows": p["cejas"], "eyelashes": comun["pestanas"], "hair": p["pelo"],
        "clothes": list(p["ropa"]), "skin_mhmat": p["piel"], "skin_material_type": "GAMEENGINE",
        "eyes_material_type": "GAMEENGINE", "clothes_material_type": "GAMEENGINE",
    })
    ajustes = HumanService.get_default_deserialization_settings()
    ajustes.update({"subdiv_levels": 0, "override_skin_model": "GAMEENGINE",
                    "override_clothes_model": "GAMEENGINE", "override_eyes_model": "GAMEENGINE"})
    return HumanService.deserialize_from_dict(info, ajustes)


def activa(o):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o


def triangulos(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def prepara_mallas(basemesh):
    """Aplica modificadores (salvo el esqueleto), reduce y devuelve [(objeto, tipo)]."""
    piezas = []
    for o in list(bpy.data.objects):
        if o.type != "MESH" or o == basemesh:
            continue
        tipo = ObjectService.get_object_type(o) or "Clothes"
        activa(o)
        if o.data.shape_keys:
            bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
        for m in list(o.modifiers):
            if m.type != "ARMATURE":
                try:
                    bpy.ops.object.modifier_apply(modifier=m.name)
                except RuntimeError as e:
                    print("  no se pudo aplicar", m.name, e)
                    o.modifiers.remove(m)
        objetivo = PRESUPUESTO_TRIS.get(tipo)
        t = triangulos(o)
        if objetivo and t > objetivo:
            d = o.modifiers.new("reduce", "DECIMATE")
            d.ratio = objetivo / t
            # El diezmado tiene que ir antes que el esqueleto
            while o.modifiers.find("reduce") > 0:
                bpy.ops.object.modifier_move_up(modifier="reduce")
            bpy.ops.object.modifier_apply(modifier="reduce")
        # Una sola capa UV con el mismo nombre en todas (para unirlas)
        uvs = o.data.uv_layers
        if uvs:
            activa_uv = uvs.active
            for capa in list(uvs):
                if capa != activa_uv:
                    uvs.remove(capa)
            uvs.active.name = "UVMap"
        for i, mat in enumerate(o.data.materials):
            if mat:
                mat["tipo_pieza"] = tipo
        piezas.append((o, tipo))
    # Fuera la malla base (la sustituye el proxy)
    bpy.data.objects.remove(basemesh, do_unlink=True)
    return piezas


def une(piezas):
    cuerpo = next((o for o, t in piezas if t == "Proxymeshes"), piezas[0][0])
    bpy.ops.object.select_all(action="DESELECT")
    for o, _ in piezas:
        o.select_set(True)
    bpy.context.view_layer.objects.active = cuerpo
    bpy.ops.object.join()
    return cuerpo


def pixeles(img, lado):
    copia = img.copy()
    copia.scale(lado, lado)
    px = np.array(copia.pixels[:], dtype=np.float32).reshape(lado, lado, 4)
    bpy.data.images.remove(copia)
    return px


def atlas(obj, nombre, carpeta, gris_pelo=0.0):
    """Todas las texturas a un atlas; UV recolocadas; un único material."""
    mats = list(obj.data.materials)
    casillas = []
    for i, m in enumerate(mats):
        tipo = m.get("tipo_pieza", "Clothes") if m else "Clothes"
        img = None
        if m and m.node_tree:
            n = m.node_tree.nodes.get("DiffuseTexture")
            img = n.image if n and n.image else None
        casillas.append({"i": i, "tipo": tipo, "img": img, "lado": CASILLA.get(tipo, 512),
                         "color": tuple(m.diffuse_color) if m else (0.7, 0.7, 0.7, 1.0)})
    # Estanterías: de mayor a menor
    escala = 1.0
    while True:
        x = y = alto_fila = 0
        ok = True
        for c in sorted(casillas, key=lambda c: -c["lado"]):
            lado = int(c["lado"] * escala)
            if x + lado > ATLAS_LADO:
                x, y, alto_fila = 0, y + alto_fila, 0
            if y + lado > ATLAS_LADO:
                ok = False
                break
            c["pos"] = (x, y, lado)
            x += lado
            alto_fila = max(alto_fila, lado)
        if ok:
            break
        escala /= 2
    lienzo = np.zeros((ATLAS_LADO, ATLAS_LADO, 4), np.float32)
    for c in casillas:
        x, y, lado = c["pos"]
        dentro = lado - 2 * MARGEN_PX
        if c["img"] is not None and c["img"].size[0] > 0:
            px = pixeles(c["img"], dentro)
        else:
            px = np.ones((dentro, dentro, 4), np.float32) * np.array(c["color"], np.float32)
        if c["tipo"] == "Hair" and gris_pelo > 0:
            lum = px[..., :3] @ np.array([0.2126, 0.7152, 0.0722], np.float32)
            canas = np.clip(lum[..., None] * 0.6 + 0.45, 0, 1) * np.array([0.92, 0.91, 0.9], np.float32)
            px[..., :3] = px[..., :3] * (1 - gris_pelo) + canas * gris_pelo
        lienzo[y:y + lado, x:x + lado] = np.pad(px, ((MARGEN_PX, MARGEN_PX), (MARGEN_PX, MARGEN_PX), (0, 0)), mode="edge")
    imagen = bpy.data.images.new(f"atlas_{nombre}", ATLAS_LADO, ATLAS_LADO, alpha=True)
    imagen.pixels.foreach_set(lienzo.ravel())
    ruta_png = carpeta / f"atlas_{nombre}.png"
    imagen.filepath_raw = str(ruta_png)
    imagen.file_format = "PNG"
    imagen.save()
    imagen.source = "FILE"
    imagen.reload()

    # UV: cada cara a su casilla
    me = obj.data
    uv = np.zeros(len(me.loops) * 2, np.float32)
    me.uv_layers.active.data.foreach_get("uv", uv)
    uv = uv.reshape(-1, 2)
    mat_cara = np.zeros(len(me.polygons), np.int32)
    me.polygons.foreach_get("material_index", mat_cara)
    inicio = np.zeros(len(me.polygons), np.int32)
    total = np.zeros(len(me.polygons), np.int32)
    me.polygons.foreach_get("loop_start", inicio)
    me.polygons.foreach_get("loop_total", total)
    mat_bucle = np.repeat(mat_cara, total)
    for c in casillas:
        x, y, lado = c["pos"]
        sel = mat_bucle == c["i"]
        dentro = lado - 2 * MARGEN_PX
        u = np.clip(uv[sel], 0.0, 1.0)
        uv[sel, 0] = (x + MARGEN_PX + u[:, 0] * dentro) / ATLAS_LADO
        uv[sel, 1] = (y + MARGEN_PX + u[:, 1] * dentro) / ATLAS_LADO
    me.uv_layers.active.data.foreach_set("uv", uv.ravel())

    mat = bpy.data.materials.new(f"persona_{nombre}")
    if mat.node_tree is None:
        mat.use_nodes = True
    nodos = mat.node_tree.nodes
    # Por tipo, no por nombre: los nombres de los nodos dependen del idioma de Blender
    bsdf = next((n for n in nodos if n.type == "BSDF_PRINCIPLED"), None) or nodos.new("ShaderNodeBsdfPrincipled")
    if not any(n.type == "OUTPUT_MATERIAL" for n in nodos):
        salida_nodo = nodos.new("ShaderNodeOutputMaterial")
        mat.node_tree.links.new(bsdf.outputs["BSDF"], salida_nodo.inputs["Surface"])
    tex = nodos.new("ShaderNodeTexImage")
    tex.image = imagen
    mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    mat.node_tree.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    bsdf.inputs["Roughness"].default_value = 0.8
    me.materials.clear()
    me.materials.append(mat)
    for p in me.polygons:
        p.material_index = 0
    return imagen


# --- Animación -------------------------------------------------------------------------------
X = Vector((1, 0, 0))
Y = Vector((0, 1, 0))
Z = Vector((0, 0, 1))


def anima(arm):
    activa(arm)
    bpy.ops.object.mode_set(mode="POSE")
    pbs = arm.pose.bones
    huesos = arm.data.bones
    for pb in pbs:
        pb.rotation_mode = "QUATERNION"
    reposo = {b.name: b.matrix_local.to_quaternion() for b in huesos}

    def pon(nombre, q, fotograma):
        if nombre not in pbs:
            return
        r = reposo[nombre]
        pbs[nombre].rotation_quaternion = r.inverted() @ q @ r
        pbs[nombre].keyframe_insert("rotation_quaternion", frame=fotograma)

    def mueve(nombre, d, fotograma):
        r = reposo[nombre]
        pbs[nombre].location = r.inverted() @ d
        pbs[nombre].keyframe_insert("location", frame=fotograma)

    # El brazo cuelga (el reposo de MakeHuman tiene los brazos abiertos): rotación sobre el eje
    # adelante-atrás, con el signo que lo baje
    bajar = {}
    for lado in ("l", "r"):
        b = huesos[f"upperarm_{lado}"]
        d = (b.tail_local - b.head_local).normalized()
        actual = math.asin(max(-1.0, min(1.0, -d.z)))
        signo = 1 if b.head_local.x > 0 else -1
        bajar[lado] = Quaternion(Y, signo * (math.radians(80) - actual))
    codo = {}
    for lado in ("l", "r"):
        u = (huesos[f"upperarm_{lado}"].tail_local - huesos[f"upperarm_{lado}"].head_local).normalized()
        a = (huesos[f"lowerarm_{lado}"].tail_local - huesos[f"lowerarm_{lado}"].head_local).normalized()
        eje = u.cross(a).normalized()
        angulo = u.angle(a)
        codo[lado] = (eje, angulo)

    def flexion_codo(lado, grados):
        eje, angulo = codo[lado]
        return Quaternion(eje, math.radians(grados) - angulo)

    # Hacia delante: el personaje mira a −Y; girar sobre X en negativo lleva la pierna adelante
    adelante = -1

    def accion(nombre):
        a = bpy.data.actions.new(nombre)
        arm.animation_data_create()
        arm.animation_data.action = a
        return a

    rad = math.radians
    a_andar = accion("andar")
    for f in range(FOTOGRAMAS_PASO + 1):
        fase = f / FOTOGRAMAS_PASO
        for lado, desfase in (("l", 0.0), ("r", 0.5)):
            s = math.sin(2 * math.pi * (fase + desfase))
            c = math.cos(2 * math.pi * (fase + desfase))
            pon(f"thigh_{lado}", Quaternion(X, adelante * rad(24) * s), f)
            apoyo = max(0.0, math.sin(4 * math.pi * (fase + desfase - 0.25))) if s < 0.3 else 0.0
            pon(f"calf_{lado}", Quaternion(X, -adelante * rad(5 + 55 * max(0.0, c) ** 1.6 + 9 * apoyo)), f)
            pon(f"foot_{lado}", Quaternion(X, -adelante * rad(-11 * s)), f)
            # Brazo contrario a la pierna del mismo lado
            pon(f"upperarm_{lado}", Quaternion(X, adelante * rad(-17 * s)) @ bajar[lado], f)
            pon(f"lowerarm_{lado}", flexion_codo(lado, 14 + 12 * max(0.0, -s)), f)
        s1 = math.sin(2 * math.pi * fase)
        pon("pelvis", Quaternion(Z, rad(4) * s1), f)
        pon("spine_02", Quaternion(Z, -rad(3) * s1), f)
        pon("spine_01", Quaternion(X, adelante * rad(3)), f)
        mueve("pelvis", Vector((0, 0, 0.018 * math.cos(4 * math.pi * fase))), f)

    a_quieto = accion("quieto")
    for f in range(0, FOTOGRAMAS_QUIETO + 1, 10):
        fase = f / FOTOGRAMAS_QUIETO
        for lado in ("l", "r"):
            pon(f"upperarm_{lado}", bajar[lado], f)
            pon(f"lowerarm_{lado}", flexion_codo(lado, 10), f)
            pon(f"thigh_{lado}", Quaternion(X, 0), f)
            pon(f"calf_{lado}", Quaternion(X, 0), f)
        pon("spine_03", Quaternion(X, adelante * rad(1.2 * math.sin(2 * math.pi * fase))), f)
        pon("pelvis", Quaternion(Z, rad(1.5) * math.sin(2 * math.pi * fase)), f)
        mueve("pelvis", Vector((0.012 * math.sin(2 * math.pi * fase), 0, 0)), f)

    # Cada acción a su pista NLA (el exportador saca una animación por pista)
    arm.animation_data.action = None
    for a in (a_andar, a_quieto):
        pista = arm.animation_data.nla_tracks.new()
        pista.name = a.name
        tira = pista.strips.new(a.name, 0, a)
        if hasattr(tira, "action_slot") and len(a.slots):
            tira.action_slot = a.slots[0]
    bpy.ops.object.mode_set(mode="OBJECT")
    return a_andar, a_quieto


def depura_pesos(malla, arm):
    nombres = {g.index: g.name for g in malla.vertex_groups}
    cuenta = {}
    for v in malla.data.vertices:
        for g in v.groups:
            if g.weight > 0.3:
                cuenta[nombres[g.group]] = cuenta.get(nombres[g.group], 0) + 1
    huesos = {b.name for b in arm.data.bones}
    print("   modificadores:", [(m.type, getattr(m, "object", None) and m.object.name) for m in malla.modifiers])
    print("   grupos con peso:", sorted(cuenta.items(), key=lambda kv: -kv[1])[:24])
    print("   huesos sin grupo:", sorted(huesos - set(cuenta)))
    print("   grupos que no son huesos:", sorted(set(cuenta) - huesos)[:20])
    print("   padre:", malla.parent and malla.parent.name, "· esqueleto:", arm.name)
    for m in malla.data.materials:
        print("   material", m.name, "nodos", [(n.type, n.name, getattr(n, "is_active_output", None)) for n in m.node_tree.nodes])
        print("   enlaces", [(l.from_node.name, l.from_socket.name, l.to_node.name, l.to_socket.name) for l in m.node_tree.links])
        tex = next((n for n in m.node_tree.nodes if n.type == "TEX_IMAGE"), None)
        if tex:
            print("   imagen", tex.image.name, tex.image.source, tex.image.filepath_raw, tex.image.size[:], tex.image.has_data)
    for m in malla.modifiers:
        print("   armature:", m.show_render, m.show_viewport, getattr(m, "use_vertex_groups", None), getattr(m, "use_deform_preserve_volume", None))
    print("   pose_position:", arm.data.pose_position)
    print("   arm loc", tuple(arm.location), "malla loc", tuple(malla.location), "malla padre_inv", [tuple(round(x, 2) for x in fila) for fila in malla.matrix_parent_inverse])
    print("   hombro_l mundo", tuple(round(c, 2) for c in arm.matrix_world @ arm.data.bones["upperarm_l"].head_local))
    # ¿Se deforma? Vértice con más peso de upperarm_l: reposo frente a evaluado (andar, f8)
    g = malla.vertex_groups["upperarm_l"].index
    gh = malla.vertex_groups["hand_l"].index
    mejor = max(malla.data.vertices, key=lambda v: next((x.weight for x in v.groups if x.group == g), 0))
    mano = max(malla.data.vertices, key=lambda v: next((x.weight for x in v.groups if x.group == gh), 0))
    for p in arm.animation_data.nla_tracks:
        p.mute = p.name != "andar"
    bpy.context.scene.frame_set(8)
    dg = bpy.context.evaluated_depsgraph_get()
    ev = malla.evaluated_get(dg).to_mesh()
    for nombre, v in (("brazo", mejor), ("mano", mano)):
        print(f"   {nombre}: reposo {tuple(round(c, 2) for c in v.co)} evaluado {tuple(round(c, 2) for c in ev.vertices[v.index].co)}")
    malla.evaluated_get(dg).to_mesh_clear()


def depura(arm):
    """Direcciones de los huesos en reposo y en la pose «quieto» (fotograma 0)."""
    print("   armadura:", [round(v, 3) for v in arm.matrix_world.to_euler()], [round(v, 3) for v in arm.matrix_world.to_scale()])
    pistas = arm.animation_data.nla_tracks
    for i, p in enumerate(pistas):
        p.mute = p.name != "quieto"
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()
    for nombre in ("clavicle_l", "upperarm_l", "lowerarm_l", "hand_l", "upperarm_r", "lowerarm_r", "thigh_l", "calf_l"):
        b = arm.data.bones[nombre]
        pb = arm.pose.bones[nombre]
        reposo = (b.tail_local - b.head_local).normalized()
        pose = (pb.tail - pb.head).normalized()
        print(f"   {nombre:12s} reposo {tuple(round(v, 2) for v in reposo)} pose {tuple(round(v, 2) for v in pose)}"
              f" cabeza {tuple(round(v, 2) for v in pb.head)}")
    for p in pistas:
        p.mute = p.name != "andar"
    bpy.context.scene.frame_set(8)
    bpy.context.view_layer.update()
    for nombre in ("thigh_l", "thigh_r", "upperarm_l", "lowerarm_l"):
        pb = arm.pose.bones[nombre]
        print(f"   andar f8 {nombre:12s} {tuple(round(v, 2) for v in (pb.tail - pb.head).normalized())}")
    for p in pistas:
        p.mute = False


def exporta(ruta, objetos):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objetos:
        o.select_set(True)
    opciones = dict(filepath=str(ruta), export_format="GLB", use_selection=True, export_animations=True,
                    export_animation_mode="NLA_TRACKS", export_skins=True, export_morph=False, export_apply=True,
                    export_yup=True, export_texcoords=True, export_normals=True, export_materials="EXPORT",
                    export_image_format="AUTO", export_cameras=False, export_lights=False, export_force_sampling=True)
    disponibles = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    bpy.ops.export_scene.gltf(**{k: v for k, v in opciones.items() if k in disponibles})


def vista(ruta_png, arm, malla):
    escena = bpy.context.scene
    escena.render.engine = "BLENDER_WORKBENCH"
    escena.display.shading.light = "STUDIO"
    escena.display.shading.color_type = "TEXTURE"
    escena.render.resolution_x, escena.render.resolution_y = 600, 900
    escena.render.film_transparent = False
    if arm.animation_data and arm.animation_data.nla_tracks:
        for pista in arm.animation_data.nla_tracks:
            pista.mute = pista.name != "andar"
    escena.frame_set(8)
    bpy.context.view_layer.update()
    cam_datos = bpy.data.cameras.new("cam")
    cam_datos.lens = 60
    cam = bpy.data.objects.new("cam", cam_datos)
    escena.collection.objects.link(cam)
    cam.location = (1.6, -4.2, 1.15)
    direccion = Vector((0, 0, 0.95)) - cam.location
    cam.rotation_euler = direccion.to_track_quat("-Z", "Y").to_euler()
    escena.camera = cam
    escena.render.filepath = str(ruta_png)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam, do_unlink=True)


def main():
    cfg_ruta, salida, solo = argumentos()
    salida = salida.resolve()
    cfg = json.loads(cfg_ruta.read_text(encoding="utf-8"))
    salida.mkdir(parents=True, exist_ok=True)
    resumen = []
    for p in cfg["personas"]:
        if solo and p["id"] != solo:
            continue
        print(f"== {p['id']}")
        vacia_escena()
        bpy.context.scene.render.fps = FPS
        basemesh = crea_humano(p, cfg)
        arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
        piezas = prepara_mallas(basemesh)
        print("   piezas:", [(o.name, t, triangulos(o)) for o, t in piezas])
        malla = une(piezas)
        atlas(malla, p["id"], salida, p.get("pelo_gris", 0.0))
        anima(arm)
        if solo:
            depura(arm)
            depura_pesos(malla, arm)
        alto = max((malla.matrix_world @ Vector(v)).z for v in malla.bound_box)
        tris = triangulos(malla)
        vista(salida / f"{p['id']}.png", arm, malla)
        exporta(salida / f"{p['id']}.glb", [arm, malla])
        resumen.append({"id": p["id"], "sexo": p["sexo"], "edad": p["edad"], "triangulos": tris,
                        "alto_m": round(alto, 3), "huesos": len(arm.data.bones)})
        print(f"   {tris} triángulos · {alto:.2f} m · {len(arm.data.bones)} huesos")
    (salida / "personas_bruto.json").write_text(json.dumps({
        "fps": FPS, "fotogramas_paso": FOTOGRAMAS_PASO, "velocidad_diseno_ms": VELOCIDAD_DISENO,
        "metros_por_ciclo": round(VELOCIDAD_DISENO * FOTOGRAMAS_PASO / FPS, 3), "personas": resumen,
    }, ensure_ascii=False, indent=1), encoding="utf-8")


main()
