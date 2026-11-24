"""Maquinaria del modo agricultura (PLAN_AGRICULTURA.md §5.6), paramétrica (Blender, modo consola).

Script CAD: crea con primitivas y materiales de color, sin texturas, un TRACTOR GENÉRICO de doble
tracción (unos 4,8 × 2,5 × 3,2 m), sin marca ni logotipos. Las proporciones siguen las fotos de
referencia de Rubén (2026-11-21): ruedas traseras grandes, delanteras más pequeñas, capó estrecho
con contrapesos delante, cabina acristalada de cuatro postes, escape vertical, guardabarros traseros,
rotativo en el techo y tripuntal detrás. Siguen (A4–A8): aperos y cosechadora.

Piezas con nombre (las usa el juego):
  rueda_di, rueda_dd, rueda_ti, rueda_td   ruedas (delantera/trasera, izquierda/derecha), cada una
                                           con su neumático de tacos, llanta y buje
  carroceria                               todo lo fijo; el material «pintura» se recolorea
  vidrios                                  cristales de la cabina (transparentes)
  tripuntal                                brazos del enganche trasero (se moverán en A4)
  luces_delanteras, luces_trabajo, rotativo, pilotos   luces (materiales emisivos)

Ejes: Blender X izquierda, −Y adelante, Z arriba; el GLB sale con +Y arriba, morro hacia +Z y la
izquierda en +X (como los coches del juego). Suelo en y = 0 y centrado en largo y ancho.
Escribe también maquinaria.json (medidas y ruedas, como public/assets/coches/coches.json) y,
con --vistas, unas imágenes de comprobación renderizadas con Cycles.

Uso (desde la raíz del proyecto):
    "<blender_path>" -b -P tools/build_maquinaria.py -- --root . [--out modelos/maquinaria] [--vistas]
Después: npm run maquinaria  (comprime y copia a public/assets/maquinaria/)
"""

import json
import math
import os
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Matrix, Vector

# ----------------------------------------------------------------------------- Medidas (metros)
TRACTOR = {
    "trasera": {"radio": 0.86, "ancho": 0.60, "via": 1.86, "y": 1.15, "tacos": 22, "llanta": 0.55},
    "delantera": {"radio": 0.62, "ancho": 0.46, "via": 1.84, "y": -1.70, "tacos": 18, "llanta": 0.52},
    "capo": {"ancho": 1.0, "y0": -2.22, "y1": -0.05, "z0": 1.0, "z1": 1.86, "caida_morro": 0.24, "retranqueo": 0.16},
    "cabina": {"ancho": 1.56, "y0": -0.05, "y1": 1.55, "suelo": 1.38, "techo": 2.96},
}

# Colores en lineal (Blender). La pintura es roja por defecto; el juego la cambia
COLORES = {
    "pintura": (0.42, 0.012, 0.010, 1.0),
    "llanta": (0.55, 0.55, 0.52, 1.0),
    "negro": (0.025, 0.025, 0.027, 1.0),
    "neumatico": (0.018, 0.018, 0.018, 1.0),
    "metal": (0.35, 0.36, 0.37, 1.0),
    "rejilla": (0.04, 0.04, 0.045, 1.0),
    "vidrio": (0.08, 0.11, 0.12, 0.32),
    "luz": (1.0, 0.97, 0.9, 1.0),
    "ambar": (1.0, 0.42, 0.02, 1.0),
    "piloto": (0.6, 0.01, 0.01, 1.0),
    "asiento": (0.06, 0.06, 0.065, 1.0),
}


def limpiar_escena():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(nombre, roughness=0.55, metallic=0.0, emision=0.0):
    if nombre in bpy.data.materials:
        return bpy.data.materials[nombre]
    color = COLORES[nombre]
    mat = bpy.data.materials.new(name=nombre)
    if bpy.app.version < (5, 0, 0):
        mat.use_nodes = True
    nodos = mat.node_tree.nodes
    bsdf = next((n for n in nodos if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        bsdf = nodos.new("ShaderNodeBsdfPrincipled")
        salida = next((n for n in nodos if n.type == "OUTPUT_MATERIAL"), None) or nodos.new("ShaderNodeOutputMaterial")
        mat.node_tree.links.new(bsdf.outputs["BSDF"], salida.inputs["Surface"])
    mat.diffuse_color = color
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if color[3] < 1.0:
        bsdf.inputs["Alpha"].default_value = color[3]
        for atributo, valor in (("surface_render_method", "BLENDED"), ("blend_method", "BLEND")):
            if hasattr(mat, atributo):
                try:
                    setattr(mat, atributo, valor)
                except TypeError:
                    pass
    if emision > 0:
        entrada = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        entrada.default_value = color
        bsdf.inputs["Emission Strength"].default_value = emision
    return mat


def mats():
    return {
        "pintura": material("pintura", 0.35, 0.05),
        "llanta": material("llanta", 0.4, 0.3),
        "negro": material("negro", 0.7),
        "neumatico": material("neumatico", 0.92),
        "metal": material("metal", 0.35, 0.8),
        "rejilla": material("rejilla", 0.8),
        "vidrio": material("vidrio", 0.05),
        "luz": material("luz", 0.2, 0.0, 2.0),
        "ambar": material("ambar", 0.3, 0.0, 2.0),
        "piloto": material("piloto", 0.3, 0.0, 1.0),
        "asiento": material("asiento", 0.85),
    }


# ----------------------------------------------------------------------------- Primitivas
def _objeto(nombre, malla, mat):
    obj = bpy.data.objects.new(nombre, malla)
    bpy.context.collection.objects.link(obj)
    if mat is not None:
        obj.data.materials.append(mat)
    return obj


def bisel(obj, ancho, segmentos=2):
    if ancho <= 0:
        return obj
    m = obj.modifiers.new("bisel", "BEVEL")
    m.width = ancho
    m.segments = segmentos
    m.limit_method = "ANGLE"
    m.angle_limit = math.radians(35)
    m.harden_normals = False
    return obj


def caja(nombre, dims, centro, mat, radio_bisel=0.0, matriz=None):
    """Caja de dims (x, y, z) con centro en «centro»; matriz opcional (giro) aplicada antes de mover."""
    malla = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(dims), verts=bm.verts)
    if matriz is not None:
        bmesh.ops.transform(bm, matrix=matriz, verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(centro), verts=bm.verts)
    bm.to_mesh(malla)
    bm.free()
    return bisel(_objeto(nombre, malla, mat), radio_bisel)


def cilindro(nombre, radio, largo, centro, eje, mat, segmentos=24, radio2=None, radio_bisel=0.0):
    """Cilindro (o cono si radio2) a lo largo del eje 'x', 'y' o 'z'."""
    malla = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segmentos, radius1=radio,
                          radius2=radio if radio2 is None else radio2, depth=largo)
    giro = {"x": Matrix.Rotation(math.radians(90), 4, "Y"), "y": Matrix.Rotation(math.radians(90), 4, "X"),
            "z": Matrix.Identity(4)}[eje]
    bmesh.ops.transform(bm, matrix=giro, verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(centro), verts=bm.verts)
    bm.to_mesh(malla)
    bm.free()
    return bisel(_objeto(nombre, malla, mat), radio_bisel)


def anillo(nombre, r_int, r_ext, ancho, centro, mat, segmentos=40, abombado=0.0):
    """Neumático hueco a lo largo del eje X: banda de rodadura y dos flancos (coronas) que dejan
    ver la llanta. «abombado» saca los flancos hacia fuera a media altura (perfil redondeado)."""
    malla = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    cx, cy, cz = centro
    perfil = [(-ancho / 2 + abombado * 0.0, r_int), (-ancho / 2 - abombado, (r_int + r_ext) / 2),
              (-ancho / 2 + abombado * 0.6, r_ext - abombado * 0.4), (ancho / 2 - abombado * 0.6, r_ext - abombado * 0.4),
              (ancho / 2 + abombado, (r_int + r_ext) / 2), (ancho / 2, r_int)]
    anillos = []
    for k in range(segmentos):
        a = 2 * math.pi * k / segmentos
        anillos.append([bm.verts.new((cx + x, cy + math.cos(a) * r, cz + math.sin(a) * r)) for x, r in perfil])
    for k in range(segmentos):
        A, B = anillos[k], anillos[(k + 1) % segmentos]
        for j in range(len(perfil) - 1):
            bm.faces.new((A[j], A[j + 1], B[j + 1], B[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(malla)
    bm.free()
    obj = _objeto(nombre, malla, mat)
    for poligono in obj.data.polygons:
        poligono.use_smooth = True
    return obj


def arco_guardabarros(nombre, radio, ancho, centro, desde_deg, hasta_deg, grosor, mat, segmentos=20):
    """Chapa curva (guardabarros) alrededor del eje X, entre dos ángulos (0° = hacia delante, −Y)."""
    malla = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    cx, cy, cz = centro
    filas = []
    for k in range(segmentos + 1):
        a = math.radians(desde_deg + (hasta_deg - desde_deg) * k / segmentos)
        fila = []
        for r in (radio, radio + grosor):
            y = cy - math.cos(a) * r
            z = cz + math.sin(a) * r
            fila.append([bm.verts.new((cx - ancho / 2, y, z)), bm.verts.new((cx + ancho / 2, y, z))])
        filas.append(fila)
    for k in range(segmentos):
        (a0, a1), (b0, b1) = filas[k]
        (c0, c1), (d0, d1) = filas[k + 1]
        bm.faces.new((a0, a1, c1, c0))          # cara interior
        bm.faces.new((b1, b0, d0, d1))          # cara exterior
        bm.faces.new((a0, c0, d0, b0))          # canto izquierdo/derecho
        bm.faces.new((c1, a1, b1, d1))
    for k in (0, segmentos):
        (a0, a1), (b0, b1) = filas[k]
        cara = bm.faces.new((a0, b0, b1, a1)) if k == 0 else bm.faces.new((a0, a1, b1, b0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(malla)
    bm.free()
    return _objeto(nombre, malla, mat)


def une(nombre, objetos):
    """Une objetos (aplicando sus modificadores) en uno solo con el nombre dado."""
    objetos = [o for o in objetos if o is not None]
    bpy.ops.object.select_all(action="DESELECT")
    for o in objetos:
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.context.view_layer.objects.active = objetos[0]
    if len(objetos) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = nombre
    obj.data.name = nombre
    return obj


# ----------------------------------------------------------------------------- Piezas
def rueda(nombre, d, x, M):
    """Neumático agrícola con tacos en espiga, llanta y buje. x: centro lateral (+ izquierda)."""
    R, W, y, n = d["radio"], d["ancho"], d["y"], d["tacos"]
    c = (x, y, R)
    partes = []
    # Carcasa hueca: banda de rodadura y flancos redondeados que dejan ver la llanta
    rl = R * d["llanta"]
    partes.append(anillo(f"{nombre}_carcasa", rl, R - 0.055, W * 0.9, c, M["neumatico"], 40, abombado=W * 0.06))
    # Tacos: dos medias barras por posición, en espiga, alternadas
    alto_taco = 0.065
    largo_taco = W * 0.52
    for k in range(n):
        for lado in (-1, 1):
            a = 2 * math.pi * (k + (0.5 if lado > 0 else 0.0)) / n
            giro_eje = Matrix.Rotation(a, 4, "X")
            espiga = Matrix.Rotation(math.radians(28) * lado, 4, "Z")     # inclinado en el plano de rodadura
            t = (giro_eje @ Matrix.Translation((lado * W * 0.22, 0, R - alto_taco / 2 - 0.005)) @ espiga)
            partes.append(caja(f"{nombre}_taco{k}_{lado}", (largo_taco, 0.075, alto_taco), (0, 0, 0), M["neumatico"],
                               matriz=t))
            partes[-1].location = Vector(c)
    # Llanta: aro y disco hundido, buje y tuercas, a los dos lados
    partes.append(cilindro(f"{nombre}_aro", rl, W * 0.86, c, "x", M["llanta"], 32))
    for s in (-1, 1):
        cx = x + s * W * 0.30
        partes.append(cilindro(f"{nombre}_disco{s}", rl * 0.92, 0.03, (cx, y, R), "x", M["llanta"], 32))
        partes.append(cilindro(f"{nombre}_buje{s}", rl * 0.32, 0.12, (cx + s * 0.05, y, R), "x", M["metal"], 20,
                               radio2=rl * 0.24))
        for j in range(8):
            a = 2 * math.pi * j / 8
            partes.append(cilindro(f"{nombre}_tuerca{s}_{j}", 0.022, 0.05,
                                   (cx + s * 0.03, y + math.cos(a) * rl * 0.45, R + math.sin(a) * rl * 0.45), "x",
                                   M["metal"], 6))
    return une(nombre, partes)


def tractor(M):
    T = TRACTOR
    tr, de, cp, cb = T["trasera"], T["delantera"], T["capo"], T["cabina"]
    fijo = []

    # --- Bastidor y motor (bajo el capó), ejes
    fijo.append(caja("bloque_motor", (0.78, cp["y1"] - cp["y0"] - 0.1, 0.62), (0, (cp["y0"] + cp["y1"]) / 2, 0.82),
                     M["negro"], 0.03))
    fijo.append(caja("eje_delantero", (de["via"] - de["ancho"] * 0.7, 0.24, 0.24), (0, de["y"], de["radio"]), M["negro"], 0.03))
    fijo.append(cilindro("eje_trasero", 0.17, tr["via"] - tr["ancho"] * 0.6, (0, tr["y"], tr["radio"]), "x", M["negro"], 20))
    fijo.append(caja("carter_trasero", (0.95, 1.4, 0.62), (0, 0.75, 0.92), M["negro"], 0.04))
    # Contrapesos delanteros (placas) y su soporte
    for k in range(5):
        fijo.append(caja(f"contrapeso{k}", (0.86, 0.075, 0.5), (0, cp["y0"] - 0.08 - k * 0.08, 0.88), M["negro"], 0.012))
    fijo.append(caja("soporte_contrapesos", (0.5, 0.45, 0.2), (0, cp["y0"] - 0.1, 0.55), M["negro"], 0.02))

    # --- Capó: caja con el morro más bajo y estrecho
    malla = bpy.data.meshes.new("capo")
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    largo = cp["y1"] - cp["y0"]
    bmesh.ops.scale(bm, vec=Vector((cp["ancho"], largo, cp["z1"] - cp["z0"])), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector((0, (cp["y0"] + cp["y1"]) / 2, (cp["z0"] + cp["z1"]) / 2)), verts=bm.verts)
    for v in bm.verts:
        if v.co.y < (cp["y0"] + cp["y1"]) / 2:            # mitad delantera
            t = (cp["y0"] + largo / 2 - v.co.y) / (largo / 2)
            if v.co.z > (cp["z0"] + cp["z1"]) / 2:
                v.co.z -= cp["caida_morro"] * t
                v.co.y += cp["retranqueo"] * t            # frente inclinado: arriba más atrás (morro moderno)
            v.co.x *= 1 - 0.06 * t
    bm.to_mesh(malla)
    bm.free()
    fijo.append(bisel(_objeto("capo", malla, M["pintura"]), 0.06, 3))
    # Rejilla frontal de arriba abajo (inclinada como el frente), faros en la rejilla y en los
    # costados del capó, y paragolpes
    alto_frente = cp["z1"] - cp["caida_morro"] - cp["z0"]
    inclina = math.atan2(cp["retranqueo"], alto_frente)
    giro = Matrix.Rotation(-inclina, 4, "X")
    yf = cp["y0"] + cp["retranqueo"] / 2 - 0.012
    zf = cp["z0"] + alto_frente / 2
    fijo.append(caja("rejilla", (cp["ancho"] * 0.86, 0.03, alto_frente * 0.86), (0, yf, zf), M["rejilla"], 0.01, matriz=giro))
    for k in range(6):                                  # lamas horizontales
        zk = cp["z0"] + 0.12 + k * alto_frente * 0.13
        yk = cp["y0"] + cp["retranqueo"] * (zk - cp["z0"]) / alto_frente - 0.03
        fijo.append(caja(f"lama{k}", (cp["ancho"] * 0.8, 0.02, 0.025), (0, yk, zk), M["negro"]))
    fijo.append(caja("paragolpes", (cp["ancho"] + 0.06, 0.12, 0.16), (0, cp["y0"] - 0.04, cp["z0"] + 0.02), M["negro"], 0.02))
    for s in (-1, 1):
        zfa = cp["z0"] + alto_frente * 0.62
        yfa = cp["y0"] + cp["retranqueo"] * 0.62 - 0.035
        fijo.append(caja(f"faro{s}", (0.2, 0.03, 0.08), (s * 0.3, yfa, zfa), M["luz"], 0.01, matriz=giro))
        # Faros altos en el costado del capó, como los tractores de ahora
        fijo.append(caja(f"faro_costado{s}", (0.03, 0.34, 0.07), (s * (cp["ancho"] * 0.47 + 0.004), cp["y0"] + 0.42, cp["z1"] - cp["caida_morro"] * 0.8 - 0.1),
                         M["luz"], 0.01))
        fijo.append(caja(f"rejilla_lateral{s}", (0.02, 0.9, 0.22), (s * (cp["ancho"] / 2 + 0.002), -1.3, 1.36),
                         M["rejilla"], 0.005))
        fijo.append(caja(f"banda{s}", (0.012, largo * 0.92, 0.035), (s * (cp["ancho"] / 2 + 0.004), (cp["y0"] + cp["y1"]) / 2 + 0.05, 1.62),
                         M["metal"]))

    # --- Cabina: plataforma, cuatro postes, techo, asiento, volante
    ancho, y0, y1, suelo, techo = cb["ancho"], cb["y0"], cb["y1"], cb["suelo"], cb["techo"]
    fijo.append(caja("plataforma", (ancho + 0.1, y1 - y0 + 0.1, 0.14), (0, (y0 + y1) / 2, suelo - 0.07), M["negro"], 0.02))
    for sx in (-1, 1):
        for yy in (y0 + 0.04, y1 - 0.04):
            fijo.append(caja(f"poste{sx}_{yy:.2f}", (0.075, 0.075, techo - suelo), (sx * (ancho / 2 - 0.04), yy, (suelo + techo) / 2),
                             M["negro"], 0.015))
        fijo.append(caja(f"marco_puerta{sx}", (0.05, 0.05, techo - suelo - 0.1), (sx * (ancho / 2 - 0.03), y0 + 0.75, (suelo + techo) / 2),
                         M["negro"], 0.01))
    fijo.append(caja("techo", (ancho + 0.16, y1 - y0 + 0.3, 0.17), (0, (y0 + y1) / 2 + 0.05, techo + 0.08), M["pintura"], 0.05))
    fijo.append(caja("visera", (ancho * 0.9, 0.18, 0.05), (0, y0 - 0.14, techo - 0.02), M["negro"], 0.01))
    fijo.append(caja("asiento", (0.5, 0.45, 0.12), (0, y0 + 1.0, suelo + 0.45), M["asiento"], 0.04))
    fijo.append(caja("respaldo", (0.5, 0.12, 0.6), (0, y0 + 1.25, suelo + 0.8), M["asiento"], 0.04))
    fijo.append(cilindro("columna", 0.04, 0.6, (0, y0 + 0.35, suelo + 0.45), "z", M["negro"], 10))
    fijo.append(cilindro("aro_volante", 0.19, 0.035, (0, 0, 0), "z", M["negro"], 20))
    fijo[-1].rotation_euler = (math.radians(35), 0, 0)
    fijo[-1].location = (0, y0 + 0.42, suelo + 0.78)
    # Escape vertical delante del poste derecho, con su tapa
    fijo.append(cilindro("escape", 0.065, techo + 0.35 - 1.5, (-0.62, y0 - 0.12, (1.5 + techo + 0.35) / 2), "z", M["negro"], 14))
    fijo.append(cilindro("tapa_escape", 0.075, 0.04, (-0.62, y0 - 0.12, techo + 0.37), "z", M["metal"], 14))
    # Depósito (derecha) y escalones (izquierda) entre las ruedas
    fijo.append(caja("deposito", (0.36, 0.85, 0.55), (-0.62, -0.75, 0.95), M["pintura"], 0.08))
    for k in range(3):
        fijo.append(caja(f"escalon{k}", (0.3, 0.22, 0.03), (0.78, y0 + 0.25, 0.55 + k * 0.28), M["negro"], 0.005))
    fijo.append(caja("estribo_lado", (0.03, 0.22, 0.85), (0.93, y0 + 0.25, 0.95), M["negro"]))
    # Retrovisores
    for s in (-1, 1):
        fijo.append(caja(f"brazo_espejo{s}", (0.42, 0.03, 0.03), (s * (ancho / 2 + 0.2), y0 + 0.05, techo - 0.45), M["negro"]))
        fijo.append(caja(f"espejo{s}", (0.04, 0.2, 0.32), (s * (ancho / 2 + 0.42), y0 + 0.05, techo - 0.55), M["negro"], 0.02))

    # --- Guardabarros traseros (pintura) y pilotos
    for s in (-1, 1):
        x = s * tr["via"] / 2
        fijo.append(arco_guardabarros(f"guardabarros{s}", tr["radio"] + 0.07, tr["ancho"] + 0.12, (x, tr["y"], tr["radio"]),
                                      15, 165, 0.035, M["pintura"]))
        fijo.append(caja(f"tapa_guardabarros{s}", (abs(x) - ancho / 2 + 0.05, 1.1, 0.04), (s * (ancho / 2 + (abs(x) - ancho / 2) / 2), tr["y"], suelo + 0.02),
                         M["negro"]))

    # --- Luces (objetos aparte, para poder encenderlas)
    luces = [
        caja("luz_trabajo_d1", (0.14, 0.05, 0.08), (0.45, y0 - 0.12, techo + 0.05), M["luz"], 0.01),
        caja("luz_trabajo_d2", (0.14, 0.05, 0.08), (-0.45, y0 - 0.12, techo + 0.05), M["luz"], 0.01),
        caja("luz_trabajo_t1", (0.14, 0.05, 0.08), (0.45, y1 + 0.22, techo + 0.05), M["luz"], 0.01),
        caja("luz_trabajo_t2", (0.14, 0.05, 0.08), (-0.45, y1 + 0.22, techo + 0.05), M["luz"], 0.01),
    ]
    rotativo = [cilindro("rotativo_base", 0.07, 0.04, (0.55, y1 - 0.15, techo + 0.19), "z", M["negro"], 14),
                cilindro("rotativo_cupula", 0.065, 0.12, (0.55, y1 - 0.15, techo + 0.27), "z", M["ambar"], 14, radio2=0.045)]
    # En el extremo trasero de cada guardabarros
    yp = tr["y"] + math.cos(math.radians(15)) * (tr["radio"] + 0.1)
    zp = tr["radio"] + math.sin(math.radians(15)) * (tr["radio"] + 0.1) + 0.06
    pilotos = [caja(f"piloto{s}", (0.14, 0.04, 0.09), (s * tr["via"] / 2, yp, zp), M["piloto"], 0.01) for s in (-1, 1)]

    # --- Tripuntal: brazos inferiores, tercer punto, toma de fuerza y barra de tiro
    trip = []
    yt = tr["y"] + 0.45
    for s in (-1, 1):
        trip.append(caja(f"brazo_inferior{s}", (0.07, 0.85, 0.09), (s * 0.38, yt + 0.42, 0.52), M["negro"], 0.01,
                         matriz=Matrix.Rotation(math.radians(-6), 4, "X")))
        trip.append(caja(f"tirante{s}", (0.05, 0.05, 0.42), (s * 0.38, yt + 0.4, 0.78), M["metal"]))
        trip.append(cilindro(f"rotula{s}", 0.05, 0.08, (s * 0.38, yt + 0.85, 0.5), "x", M["metal"], 10))
    trip.append(cilindro("tercer_punto", 0.045, 0.75, (0, yt + 0.4, 1.18), "y", M["metal"], 12))
    trip.append(cilindro("toma_fuerza", 0.045, 0.25, (0, yt + 0.1, 0.78), "y", M["metal"], 12))
    trip.append(caja("barra_tiro", (0.12, 0.55, 0.05), (0, yt + 0.25, 0.42), M["negro"], 0.01))
    trip.append(caja("soporte_tripuntal", (0.9, 0.2, 0.55), (0, yt - 0.05, 0.85), M["negro"], 0.02))

    vidrios = []
    vid_z = (suelo + 0.12 + techo - 0.04) / 2
    vid_h = techo - 0.04 - suelo - 0.12
    vidrios.append(caja("vidrio_frente", (ancho - 0.12, 0.012, vid_h), (0, y0 + 0.01, vid_z), M["vidrio"]))
    vidrios.append(caja("vidrio_detras", (ancho - 0.12, 0.012, vid_h), (0, y1 - 0.01, vid_z), M["vidrio"]))
    for s in (-1, 1):
        vidrios.append(caja(f"vidrio_lado{s}", (0.012, y1 - y0 - 0.12, vid_h), (s * (ancho / 2 - 0.02), (y0 + y1) / 2, vid_z), M["vidrio"]))

    ruedas = [
        rueda("rueda_di", de, de["via"] / 2, M),
        rueda("rueda_dd", de, -de["via"] / 2, M),
        rueda("rueda_ti", tr, tr["via"] / 2, M),
        rueda("rueda_td", tr, -tr["via"] / 2, M),
    ]
    objetos = {
        "carroceria": une("carroceria", fijo),
        "vidrios": une("vidrios", vidrios),
        "tripuntal": une("tripuntal", trip),
        "luces_trabajo": une("luces_trabajo", luces),
        "rotativo": une("rotativo", rotativo),
        "pilotos": une("pilotos", pilotos),
    }
    for r in ruedas:
        objetos[r.name] = r
    return objetos


# ----------------------------------------------------------------------------- Salida
def centra(objetos):
    """Centra en largo (Y) y ancho (X), suelo en z = 0. Devuelve la caja (min, max) final."""
    bpy.context.view_layer.update()
    puntos = [o.matrix_world @ Vector(v) for o in objetos.values() for v in o.bound_box]
    mn = Vector((min(p.x for p in puntos), min(p.y for p in puntos), min(p.z for p in puntos)))
    mx = Vector((max(p.x for p in puntos), max(p.y for p in puntos), max(p.z for p in puntos)))
    d = Vector((-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z))
    for o in objetos.values():
        o.location += d
    bpy.context.view_layer.update()
    return mn + d, mx + d, d


def ficha(objetos, mn, mx, d, archivo):
    """Medidas y ruedas en ejes del juego (x = Blender x, y = Blender z, z = −Blender y)."""
    def centro_rueda(nombre, datos):
        x = (datos["via"] / 2 if nombre.endswith("i") else -datos["via"] / 2) + d.x
        return [round(x, 4), round(datos["radio"] + d.z, 4), round(-(datos["y"] + d.y), 4)]
    ruedas = []
    for nombre, clave in (("rueda_di", "delantera"), ("rueda_dd", "delantera"), ("rueda_ti", "trasera"), ("rueda_td", "trasera")):
        datos = TRACTOR[clave]
        ruedas.append({"objeto": nombre, "centro": centro_rueda(nombre, datos), "radio": datos["radio"], "ancho": datos["ancho"]})
    triangulos = 0
    for o in objetos.values():
        o.data.calc_loop_triangles()
        triangulos += len(o.data.loop_triangles)
    return {
        "archivo": archivo,
        "largo": round(mx.y - mn.y, 3),
        "ancho": round(mx.x - mn.x, 3),
        "alto": round(mx.z - mn.z, 3),
        "pintura": True,
        "triangulos": triangulos,
        "ruedas": ruedas,
        "fuente": "tools/build_maquinaria.py (modelo propio, genérico, sin marca)",
    }


def exportar_glb(objetos, ruta):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objetos:
        o.select_set(True)
    os.makedirs(os.path.dirname(os.path.abspath(ruta)), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=ruta, export_format="GLB", use_selection=True, export_yup=True,
                              export_apply=True, export_materials="EXPORT")
    print(f"[OK] Exportado: {ruta}")


def vistas(objetos, carpeta, largo):
    """Imágenes de comprobación con Cycles: tres cuartos delante, lado, detrás y planta."""
    os.makedirs(carpeta, exist_ok=True)
    escena = bpy.context.scene
    escena.render.engine = "CYCLES"
    escena.cycles.samples = 48
    escena.cycles.device = "CPU"
    escena.render.resolution_x = 1200
    escena.render.resolution_y = 800
    escena.render.film_transparent = False
    mundo = bpy.data.worlds.new("cielo")
    mundo.use_nodes = True if bpy.app.version < (5, 0, 0) else mundo.use_nodes
    fondo = next((n for n in mundo.node_tree.nodes if n.type == "BACKGROUND"), None)
    if fondo is None:
        fondo = mundo.node_tree.nodes.new("ShaderNodeBackground")
        salida = next((n for n in mundo.node_tree.nodes if n.type == "OUTPUT_WORLD"), None) or mundo.node_tree.nodes.new("ShaderNodeOutputWorld")
        mundo.node_tree.links.new(fondo.outputs["Background"], salida.inputs["Surface"])
    fondo.inputs["Color"].default_value = (0.62, 0.68, 0.75, 1.0)
    fondo.inputs["Strength"].default_value = 0.9
    escena.world = mundo
    sol = bpy.data.objects.new("sol", bpy.data.lights.new("sol", "SUN"))
    sol.data.energy = 4.0
    sol.rotation_euler = (math.radians(50), 0, math.radians(35))
    bpy.context.collection.objects.link(sol)
    suelo = bpy.data.meshes.new("suelo")
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=20)
    bm.to_mesh(suelo)
    bm.free()
    os_ = bpy.data.objects.new("suelo", suelo)
    mat_suelo = bpy.data.materials.new("suelo_vista")
    mat_suelo.diffuse_color = (0.42, 0.36, 0.28, 1)
    if bpy.app.version < (5, 0, 0):
        mat_suelo.use_nodes = True
    b = next((n for n in mat_suelo.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if b is None:
        b = mat_suelo.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
        sal = next((n for n in mat_suelo.node_tree.nodes if n.type == "OUTPUT_MATERIAL"), None) or mat_suelo.node_tree.nodes.new("ShaderNodeOutputMaterial")
        mat_suelo.node_tree.links.new(b.outputs["BSDF"], sal.inputs["Surface"])
    b.inputs["Base Color"].default_value = (0.36, 0.29, 0.2, 1)
    os_.data.materials.append(mat_suelo)
    bpy.context.collection.objects.link(os_)
    camara = bpy.data.objects.new("camara", bpy.data.cameras.new("camara"))
    camara.data.lens = 45
    bpy.context.collection.objects.link(camara)
    escena.camera = camara
    objetivo = Vector((0, 0, 1.35))
    for nombre, pos in (("tractor_3cuartos", (-6.2, -7.0, 3.4)), ("tractor_lado", (-9.0, 0.0, 1.9)),
                        ("tractor_detras", (5.5, 7.5, 3.6)), ("tractor_frente", (0.0, -8.5, 2.0))):
        camara.location = Vector(pos)
        camara.rotation_euler = (objetivo - camara.location).to_track_quat("-Z", "Y").to_euler()
        escena.render.filepath = os.path.join(carpeta, f"{nombre}.png")
        bpy.ops.render.render(write_still=True)
        print(f"[OK] Vista: {escena.render.filepath}")


def argumentos():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    raiz = Path(argv[argv.index("--root") + 1]) if "--root" in argv else Path(".")
    salida = Path(argv[argv.index("--out") + 1]) if "--out" in argv else Path("modelos/maquinaria")
    if not salida.is_absolute():
        salida = raiz / salida
    config = json.loads((raiz / "config.json").read_text(encoding="utf-8"))
    previews = raiz / config.get("processed_dir", "data/processed") / "previews" / "maquinaria"
    return salida.resolve(), previews.resolve(), "--vistas" in argv


if __name__ == "__main__":
    salida, previews, con_vistas = argumentos()
    limpiar_escena()
    M = mats()
    objetos = tractor(M)
    mn, mx, d = centra(objetos)
    exportar_glb(list(objetos.values()), str(salida / "tractor.glb"))
    datos = {"tractor": ficha(objetos, mn, mx, d, "tractor.glb")}
    (salida / "maquinaria.json").write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")
    t = datos["tractor"]
    print(f"[OK] Tractor: {t['largo']} × {t['ancho']} × {t['alto']} m, {t['triangulos']} triángulos")
    if con_vistas:
        vistas(objetos, str(previews), t["largo"])
