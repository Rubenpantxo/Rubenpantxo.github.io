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
  tripuntal                                soporte del enganche, toma de fuerza y barra de tiro
  brazos_tripuntal                         brazos inferiores, tirantes y tercer punto (suben y bajan)
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

ENGANCHE = {}   # puntos del tripuntal del tractor (los rellena tractor())

# Aperos (A4): medidas en metros. Origen en el centro de los bulones inferiores del enganche;
# el apero se extiende hacia atrás (+Y de Blender); el suelo, trabajando, en z = −alto_bulon.
ARADO = {"cuerpos": 4, "corte": 0.40, "paso": 0.90, "y0": 0.95, "viga_z": 0.30, "alto_bulon": 0.45, "profundidad": 0.22}
ABONADORA = {"alto_bulon": 0.55, "tolva": (1.35, 0.36, 0.62, 1.42), "tolva_y": 0.78, "discos_x": 0.34, "disco_r": 0.3,
             "disco_z": 0.08, "ancho_trabajo": 12.0}
SEMBRADORA = {"ancho": 3.0, "lineas": 20, "alto_lanza": 0.42, "eje_y": 2.25, "rueda_r": 0.38, "marco_y": (1.55, 3.0),
              "marco_z": 0.22, "tolva_y": 2.2, "tolva_z": (0.5, 1.2), "tolva_fondo": (0.36, 0.9)}
CULTIVADOR = {"ancho": 3.0, "barras_y": (0.55, 1.15, 1.75), "barra_z": 0.35, "brazos_por_barra": 5,
              "separacion": 0.6, "alto_bulon": 0.45, "profundidad": 0.10, "rodillo_y": 2.45, "rodillo_r": 0.2}

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
    "apero_arado": (0.045, 0.075, 0.022, 1.0),       # verde oliva oscuro
    "apero_cultivador": (0.48, 0.30, 0.015, 1.0),    # amarillo mostaza
    "apero_abonadora": (0.018, 0.06, 0.17, 1.0),     # azul oscuro
    "apero_sembradora": (0.22, 0.012, 0.016, 1.0),   # rojo burdeos
    "abono": (0.78, 0.77, 0.72, 1.0),                # granulado blanco grisáceo
    "semilla": (0.62, 0.42, 0.13, 1.0),              # grano de cereal
    "proteccion": (0.75, 0.5, 0.0, 1.0),             # protector amarillo del cardán
    "acero": (0.62, 0.62, 0.6, 1.0),                 # vertederas y rejas gastadas de trabajar
    "senal_roja": (0.6, 0.012, 0.01, 1.0),
    "senal_blanca": (0.85, 0.85, 0.82, 1.0),
}


def limpiar_escena():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(nombre, roughness=0.55, metallic=0.0, emision=0.0, color=None):
    if nombre in bpy.data.materials:
        return bpy.data.materials[nombre]
    color = color or COLORES[nombre]
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
        "acero": material("acero", 0.32, 0.85),
        "abono": material("abono", 0.9),
        "semilla": material("semilla", 0.8),
        "senal_roja": material("senal_roja", 0.5),
        "senal_blanca": material("senal_blanca", 0.5),
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
    # Fijo (no sube con los brazos): soporte, toma de fuerza y barra de tiro
    trip_fijo = [
        cilindro("toma_fuerza", 0.045, 0.25, (0, yt + 0.1, 0.78), "y", M["metal"], 12),
        caja("barra_tiro", (0.12, 0.55, 0.05), (0, yt + 0.25, 0.42), M["negro"], 0.01),
        caja("soporte_tripuntal", (0.9, 0.2, 0.55), (0, yt - 0.05, 0.85), M["negro"], 0.02),
    ]
    # Puntos del enganche (Blender): eje de los brazos, rótulas y extremo del tercer punto
    ENGANCHE.update({"pivote": (0, yt, 0.564), "rotula": (0, yt + 0.85, 0.5), "superior": (0, yt + 0.775, 1.18),
                     "barra_tiro": (0, yt + 0.5, 0.42), "toma_fuerza": (0, yt + 0.225, 0.78)})

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
        "tripuntal": une("tripuntal", trip_fijo),
        "brazos_tripuntal": une("brazos_tripuntal", trip),
        "luces_trabajo": une("luces_trabajo", luces),
        "rotativo": une("rotativo", rotativo),
        "pilotos": une("pilotos", pilotos),
    }
    for r in ruedas:
        objetos[r.name] = r
    return objetos


# ----------------------------------------------------------------------------- Aperos (A4)
def segmento(nombre, a, b, ancho, grueso, mat, radio_bisel=0.0):
    """Barra de sección ancho (x) × grueso entre dos puntos del plano de un mismo x (o casi)."""
    a, b = Vector(a), Vector(b)
    d = b - a
    giro = Vector((0, 1, 0)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    return caja(nombre, (ancho, d.length, grueso), (a + b) / 2, mat, radio_bisel, matriz=giro)


def superficie(nombre, funcion, nu, nv, mat, grosor=0.012):
    """Chapa curva: funcion(u, v) → (x, y, z) con u, v en [0, 1], con grosor (dos caras)."""
    malla = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    filas = [[bm.verts.new(funcion(i / nu, j / nv)) for j in range(nv + 1)] for i in range(nu + 1)]
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((filas[i][j], filas[i + 1][j], filas[i + 1][j + 1], filas[i][j + 1]))
    bm.to_mesh(malla)
    bm.free()
    obj = _objeto(nombre, malla, mat)
    for poligono in obj.data.polygons:
        poligono.use_smooth = True
    m = obj.modifiers.new("grosor", "SOLIDIFY")
    m.thickness = grosor
    m.offset = 0
    return obj


def con_origen(obj, punto):
    """Lleva el origen del objeto a «punto» sin moverlo (para girarlo en el juego sobre ese eje)."""
    p = Vector(punto)
    obj.data.transform(Matrix.Translation(-p))
    obj.location = p
    return obj


def espejo(obj, eje_x, eje_z):
    """Gira 180° la geometría alrededor de la recta paralela a Y por (eje_x, eje_z): pieza de vuelta."""
    obj.data.transform(Matrix.Translation((eje_x, 0, eje_z)) @ Matrix.Rotation(math.pi, 4, "Y")
                       @ Matrix.Translation((-eje_x, 0, -eje_z)))
    return obj


def senal(nombre, centro, M, lado=0.28, franjas=5):
    """Placa de señalización de apero: cuadrado con franjas diagonales rojas y blancas, de cara
    atrás (+Y). Cada franja es el trozo del cuadrado entre dos diagonales x + z = c."""
    cx, cy, cz = centro
    h = lado / 2

    def recorta(poligono, c, signo):          # se queda con la parte donde signo·(x + z − c) ≥ 0
        salida = []
        for k in range(len(poligono)):
            a, b = poligono[k], poligono[(k + 1) % len(poligono)]
            fa, fb = signo * (a[0] + a[1] - c), signo * (b[0] + b[1] - c)
            if fa >= 0:
                salida.append(a)
            if fa * fb < 0:
                t = fa / (fa - fb)
                salida.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
        return salida

    partes = []
    cuadrado = [(-h, -h), (h, -h), (h, h), (-h, h)]
    for k in range(franjas):
        c0 = -lado + 2 * lado * k / franjas
        c1 = -lado + 2 * lado * (k + 1) / franjas
        pol = recorta(recorta(cuadrado, c0, 1), c1, -1)
        if len(pol) < 3:
            continue
        malla = bpy.data.meshes.new(f"{nombre}_{k}")
        bm = bmesh.new()
        bm.faces.new([bm.verts.new((cx + x, cy, cz + z)) for x, z in pol])
        bm.to_mesh(malla)
        bm.free()
        obj = _objeto(f"{nombre}_{k}", malla, M["senal_roja"] if k % 2 == 0 else M["senal_blanca"])
        m = obj.modifiers.new("grosor", "SOLIDIFY")
        m.thickness = 0.012
        partes.append(obj)
    return partes


def cabezal_enganche(M, pintura, alto_mastil=0.68):
    """Bulones inferiores (a ±0,38 m, como las rótulas del tractor), placa y torre del tercer punto."""
    p = []
    for s in (-1, 1):
        p.append(cilindro(f"bulon{s}", 0.028, 0.16, (s * 0.38, 0, 0), "x", M["metal"], 10))
        p.append(caja(f"oreja{s}", (0.03, 0.16, 0.16), (s * 0.31, 0.04, 0.0), pintura, 0.01))
        p.append(segmento(f"torre{s}", (s * 0.22, 0.08, -0.02), (s * 0.05, -0.06, alto_mastil), 0.03, 0.09, pintura, 0.01))
    p.append(caja("placa_cabezal", (0.7, 0.08, 0.16), (0, 0.1, 0.03), pintura, 0.015))
    p.append(cilindro("bulon_superior", 0.024, 0.16, (0, -0.075, alto_mastil), "x", M["metal"], 10))
    return p


def arado(M):
    """Arado de vertedera reversible de cuatro cuerpos (1,6 m de trabajo), genérico, sin marca."""
    A = ARADO
    pintura = material("pintura_apero", 0.45, 0.1, color=COLORES["apero_arado"])
    zv, zs = A["viga_z"], -A["alto_bulon"]          # viga y suelo
    bastidor = cabezal_enganche(M, pintura)
    # Cabezal de volteo: tubo a lo largo de la marcha con su cilindro hidráulico
    bastidor.append(cilindro("volteo", 0.12, 0.5, (0, 0.32, zv), "y", pintura, 20))
    bastidor.append(segmento("cilindro_volteo", (0.0, 0.05, 0.62), (0.22, 0.32, zv + 0.1), 0.07, 0.07, M["metal"]))
    # Cuerpos en diagonal: cada uno corta «corte» m más a la derecha (−X) que el anterior
    n, corte, paso = A["cuerpos"], A["corte"], A["paso"]
    pies = [((n - 1) / 2 * corte - k * corte, A["y0"] + k * paso) for k in range(n)]
    dx, dy = pies[-1][0] - pies[0][0], pies[-1][1] - pies[0][1]
    t0 = (0.5 - pies[0][1]) / dy
    v0 = (pies[0][0] + dx * t0, 0.5)
    v1 = (pies[-1][0] + dx * 0.32, pies[-1][1] + dy * 0.32)
    bastidor.append(segmento("viga", (v0[0], v0[1], zv), (v1[0], v1[1], zv), 0.15, 0.15, pintura, 0.02))
    bastidor.append(segmento("union_viga", (0, 0.45, zv), (v0[0], v0[1] + 0.08, zv), 0.13, 0.13, pintura, 0.02))
    vertederas, rejas, cuchillas = [], [], []
    for k, (x, y) in enumerate(pies):
        largo_pie = zv - (zs - A["profundidad"]) + 0.08
        bastidor.append(caja(f"pie{k}", (0.06, 0.13, 2 * largo_pie), (x, y, zv), pintura, 0.01))
        bastidor.append(caja(f"abrazadera{k}", (0.2, 0.2, 0.2), (x, y, zv), pintura, 0.02))
        for vuelta in (False, True):
            piezas_v, piezas_r = [], []
            zr = zs - A["profundidad"]                    # fondo del surco
            # Vertedera: chapa alabeada que voltea la tierra hacia la derecha (−X)
            def vert(u, v, x=x, y=y, zr=zr):
                return (x + 0.08 - 0.12 * u - 0.36 * u * u * (0.35 + 0.65 * v) - 0.06 * v,
                        y - 0.32 + 0.86 * u + 0.12 * v * u,
                        zr + 0.02 + 0.42 * v + 0.05 * u * v)
            piezas_v.append(superficie(f"vertedera{k}{int(vuelta)}", vert, 10, 5, M["acero"]))
            # Reja (la punta que corta) y talón (apoyo en la pared del surco)
            malla = bpy.data.meshes.new(f"reja{k}")
            bm = bmesh.new()
            pts = [(x + 0.06, y - 0.48, zr), (x + 0.12, y - 0.1, zr + 0.01), (x - 0.30, y - 0.02, zr + 0.03), (x - 0.12, y - 0.32, zr + 0.01)]
            bm.faces.new([bm.verts.new(q) for q in pts])
            bm.to_mesh(malla)
            bm.free()
            reja = _objeto(f"reja{k}{int(vuelta)}", malla, M["acero"])
            m = reja.modifiers.new("grosor", "SOLIDIFY")
            m.thickness = 0.02
            piezas_r.append(reja)
            piezas_r.append(caja(f"talon{k}{int(vuelta)}", (0.015, 0.62, 0.12), (x + 0.12, y + 0.02, zr + 0.07), M["negro"]))
            piezas_r.append(caja(f"pecho{k}{int(vuelta)}", (0.1, 0.22, 0.34), (x + 0.04, y - 0.12, zr + 0.22), M["negro"], 0.02))
            # Cuchilla circular delante de cada cuerpo, con su brazo desde la viga
            cx, cy, cz = x + 0.10, y - 0.62, zr + 0.20
            piezas_r.append(segmento(f"brazo_cuchilla{k}{int(vuelta)}", (x + 0.1, y - 0.3, zv), (cx + 0.05, cy, cz), 0.05, 0.05, pintura))
            disco = cilindro(f"cuchilla{k}{int(vuelta)}", 0.22, 0.01, (cx, cy, cz), "x", M["acero"], 28)
            if vuelta:
                for o in piezas_v + piezas_r + [disco]:
                    espejo(o, x, zv)
            vertederas += piezas_v
            rejas += piezas_r
            cuchillas.append(disco)
    # Rueda de control al final de la viga, sobre su brazo; cuelga de un eje para seguir abajo al voltear
    pivote = (v1[0] + 0.05, v1[1] - 0.05, zv)
    rc = 0.3
    centro_rueda = (pivote[0] + 0.32, pivote[1] + 0.35, zs + rc)
    rueda_partes = [segmento("brazo_rueda", pivote, (centro_rueda[0] - 0.12, centro_rueda[1], centro_rueda[2]), 0.08, 0.08, pintura, 0.01),
                    anillo("rueda_control_cubierta", rc * 0.55, rc, 0.18, centro_rueda, M["neumatico"], 28, abombado=0.012),
                    cilindro("rueda_control_llanta", rc * 0.56, 0.15, centro_rueda, "x", M["llanta"], 24),
                    cilindro("rueda_control_eje", 0.04, 0.26, (centro_rueda[0] - 0.05, centro_rueda[1], centro_rueda[2]), "x", M["metal"], 10)]
    rueda = con_origen(une("rueda_control", rueda_partes), (0, pivote[1], zv))
    senales = senal("senal", (v1[0] + 0.2, v1[1] + 0.12, zv + 0.35), M)
    bastidor.append(segmento("soporte_senal", (v1[0] + 0.1, v1[1], zv), (v1[0] + 0.2, v1[1] + 0.1, zv + 0.25), 0.04, 0.04, pintura))
    objetos = {
        "bastidor": une("bastidor", bastidor),
        "vertederas": une("vertederas", vertederas),
        "rejas": une("rejas", rejas),
        "cuchillas": une("cuchillas", cuchillas),
        "senales": une("senales", senales),
        "rueda_control": rueda,
    }
    trabajo_y = sum(y for _, y in pies) / n
    datos = {"ancho_trabajo": round(n * corte, 3), "alto_bulon": A["alto_bulon"], "profundidad": A["profundidad"],
             "trabajo_z": round(-trabajo_y, 3), "eje_volteo_y": zv, "reversible": True,
             "cuerpos": [[round(x, 3), round(zs - A["profundidad"], 3), round(-y, 3)] for x, y in pies],
             "rueda_control": {"objeto": "rueda_control", "eje": [0, zv, round(-pivote[1], 3)]}}
    return objetos, datos


def cultivador(M):
    """Cultivador de brazos flexibles en S, tres filas y rodillo desterronador (3 m), sin marca."""
    C = CULTIVADOR
    pintura = material("pintura_apero", 0.45, 0.1, color=COLORES["apero_cultivador"])
    zb, zs = C["barra_z"], -C["alto_bulon"]
    W = C["ancho"]
    bastidor = cabezal_enganche(M, pintura)
    for k, y in enumerate(C["barras_y"]):
        bastidor.append(caja(f"barra{k}", (W, 0.1, 0.1), (0, y, zb), pintura, 0.012))
    for s in (-1, 1):
        bastidor.append(caja(f"larguero{s}", (0.1, C["barras_y"][-1] - C["barras_y"][0] + 0.25, 0.1),
                             (s * 0.6, sum(C["barras_y"][::2]) / 2, zb), pintura, 0.012))
        bastidor.append(segmento(f"tirante_bulon{s}", (s * 0.33, 0.05, 0.0), (s * 0.6, C["barras_y"][0], zb), 0.07, 0.07, pintura, 0.01))
    bastidor.append(segmento("tirante_superior", (0, -0.04, 0.66), (0, C["barras_y"][1], zb + 0.05), 0.07, 0.07, pintura, 0.01))
    brazos = []
    zr = zs - C["profundidad"]
    n, sep = C["brazos_por_barra"], C["separacion"]
    desplaza = sep / len(C["barras_y"])
    for b, y in enumerate(C["barras_y"]):
        for i in range(n):
            x = -W / 2 + 0.1 + i * sep + b * desplaza
            # Brazo en S: sale de la barra hacia atrás y abajo y acaba con la punta hacia delante
            puntos = [(x, y + 0.02, zb - 0.02), (x, y + 0.16, zb - 0.06), (x, y + 0.27, zb - 0.22), (x, y + 0.26, zb - 0.42),
                      (x, y + 0.14, zb - 0.62), (x, y + 0.02, zr + 0.12), (x, y - 0.06, zr + 0.02)]
            for j in range(len(puntos) - 1):
                brazos.append(segmento(f"s{b}_{i}_{j}", puntos[j], puntos[j + 1], 0.045, 0.014, M["negro"]))
            brazos.append(caja(f"grapa{b}_{i}", (0.07, 0.12, 0.14), (x, y, zb), M["negro"], 0.01))
            brazos.append(segmento(f"punta{b}_{i}", (x, y - 0.0, zr + 0.06), (x, y - 0.16, zr - 0.0), 0.07, 0.012, M["acero"]))
    # Rodillo desterronador (gira en el juego sobre su eje)
    ry, rr = C["rodillo_y"], C["rodillo_r"]
    rz = zs + rr
    rod = []
    for k in range(5):
        rod.append(cilindro(f"disco_rodillo{k}", rr, 0.02, (-W / 2 + 0.04 + k * (W - 0.08) / 4, ry, rz), "x", M["negro"], 20))
    for k in range(12):
        a = 2 * math.pi * k / 12
        rod.append(cilindro(f"varilla{k}", 0.016, W - 0.04, (0, ry + math.cos(a) * (rr - 0.015), rz + math.sin(a) * (rr - 0.015)), "x", M["metal"], 6))
    rod.append(cilindro("eje_rodillo", 0.025, W + 0.08, (0, ry, rz), "x", M["metal"], 10))
    rodillo = con_origen(une("rodillo", rod), (0, ry, rz))
    for s in (-1, 1):
        bastidor.append(segmento(f"brazo_rodillo{s}", (s * (W / 2 - 0.05), C["barras_y"][-1], zb), (s * (W / 2 + 0.03), ry, rz), 0.06, 0.08, pintura, 0.01))
    senales = []
    for s in (-1, 1):
        senales += senal(f"senal{s}", (s * (W / 2 - 0.2), C["barras_y"][-1] + 0.08, zb + 0.3), M)
        bastidor.append(caja(f"soporte_senal{s}", (0.04, 0.04, 0.3), (s * (W / 2 - 0.2), C["barras_y"][-1] + 0.05, zb + 0.15), pintura))
    objetos = {"bastidor": une("bastidor", bastidor), "brazos": une("brazos", brazos), "senales": une("senales", senales),
               "rodillo": rodillo}
    datos = {"ancho_trabajo": W, "alto_bulon": C["alto_bulon"], "profundidad": C["profundidad"],
             "trabajo_z": round(-(sum(C["barras_y"]) / len(C["barras_y"]) + 0.1), 3), "reversible": False,
             "rodillo": {"objeto": "rodillo", "radio": rr}}
    return objetos, datos


def tronco_piramide(nombre, inferior, superior, z0, z1, centro_y, mat, grosor=0.012, cerrado_abajo=True):
    """Tolva: tronco de pirámide hueco (abierto arriba). inferior y superior: (ancho x, fondo y)."""
    (ax0, ay0), (ax1, ay1) = inferior, superior
    malla = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    abajo = [bm.verts.new((sx * ax0 / 2, centro_y + sy * ay0 / 2, z0)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    arriba = [bm.verts.new((sx * ax1 / 2, centro_y + sy * ay1 / 2, z1)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    for k in range(4):
        bm.faces.new((abajo[k], abajo[(k + 1) % 4], arriba[(k + 1) % 4], arriba[k]))
    if cerrado_abajo:
        bm.faces.new(list(reversed(abajo)))
    bm.to_mesh(malla)
    bm.free()
    obj = _objeto(nombre, malla, mat)
    m = obj.modifiers.new("grosor", "SOLIDIFY")
    m.thickness = grosor
    return obj


def abonadora(M):
    """Abonadora centrífuga de dos discos suspendida (reparte 12 m), con tolva de pirámide y cardán."""
    A = ABONADORA
    pintura = material("pintura_apero", 0.4, 0.15, color=COLORES["apero_abonadora"])
    zs = -A["alto_bulon"]
    arriba, abajo, z0, z1 = A["tolva"]
    yt = A["tolva_y"]
    bastidor = cabezal_enganche(M, pintura)
    # Tolva y su borde
    bastidor.append(tronco_piramide("tolva", (abajo * 2.2, abajo), (arriba, arriba), z0, z1, yt, pintura, 0.015))
    for k, (dx, dy, cx, cy) in enumerate(((arriba + 0.06, 0.06, 0, yt - arriba / 2), (arriba + 0.06, 0.06, 0, yt + arriba / 2),
                                          (0.06, arriba, -arriba / 2, yt), (0.06, arriba, arriba / 2, yt))):
        bastidor.append(caja(f"borde{k}", (dx, dy, 0.07), (cx, cy, z1), pintura, 0.01))
    # Rejilla de arriba (para que no caigan terrones)
    rejilla = [caja(f"rejilla{k}", (arriba - 0.04, 0.012, 0.03), (0, yt - arriba / 2 + (k + 1) * arriba / 8, z1 - 0.02), M["negro"]) for k in range(7)]
    # Bastidor: montantes desde los bulones y la torre hasta la tolva, patas de apoyo
    for sx in (-1, 1):
        bastidor.append(segmento(f"montante{sx}", (sx * 0.38, 0.06, 0.0), (sx * 0.52, yt - 0.35, z1 - 0.1), 0.07, 0.07, pintura, 0.01))
        bastidor.append(segmento(f"montante_tras{sx}", (sx * 0.38, yt + 0.25, 0.05), (sx * 0.52, yt + 0.4, z1 - 0.1), 0.07, 0.07, pintura, 0.01))
        bastidor.append(segmento(f"larguero{sx}", (sx * 0.38, 0.02, 0.0), (sx * 0.38, yt + 0.25, 0.05), 0.07, 0.07, pintura, 0.01))
        bastidor.append(segmento(f"pata{sx}", (sx * 0.38, yt + 0.25, 0.05), (sx * 0.42, yt + 0.3, zs), 0.05, 0.05, pintura))
    bastidor.append(segmento("tirante_torre", (0, -0.06, 0.66), (0, yt - 0.35, z1 - 0.05), 0.06, 0.06, pintura))
    # Salidas y caja de engranajes con el eje de entrada (de la toma de fuerza)
    zd = A["disco_z"]
    mecanica = []
    for sx in (-1, 1):
        mecanica.append(cilindro(f"salida{sx}", 0.06, 0.18, (sx * A["discos_x"] * 0.6, yt + 0.03, z0 - 0.05), "z", M["metal"], 12))
    mecanica.append(caja("caja_engranajes", (0.5, 0.18, 0.14), (0, yt - 0.12, zd - 0.12), M["negro"], 0.02))
    mecanica.append(cilindro("eje_entrada", 0.035, yt - 0.22, (0, (yt - 0.22) / 2, zd - 0.12), "y", M["metal"], 10))
    # Protector trasero de los discos (arco de tubo)
    for k in range(10):
        a0 = math.radians(-20 + k * 22)
        a1 = math.radians(-20 + (k + 1) * 22)
        r = 0.98
        mecanica.append(segmento(f"protector{k}", (math.cos(a0) * r, yt + 0.05 + math.sin(a0) * 0.55, zd + 0.02),
                                 (math.cos(a1) * r, yt + 0.05 + math.sin(a1) * 0.55, zd + 0.02), 0.03, 0.03, M["metal"]))
    # Discos de reparto con cuatro paletas cada uno (giran en el juego sobre su eje vertical)
    discos = {}
    for sx, nombre in ((1, "disco_i"), (-1, "disco_d")):
        cx, cy = sx * A["discos_x"], yt + 0.05
        partes = [cilindro(f"{nombre}_plato", A["disco_r"], 0.012, (cx, cy, zd), "z", M["acero"], 28)]
        for k in range(4):
            a = math.radians(45 + 90 * k)
            partes.append(segmento(f"{nombre}_paleta{k}", (cx + math.cos(a) * 0.06, cy + math.sin(a) * 0.06, zd + 0.04),
                                   (cx + math.cos(a + 0.35 * sx) * (A["disco_r"] - 0.01), cy + math.sin(a + 0.35 * sx) * (A["disco_r"] - 0.01), zd + 0.04),
                                   0.012, 0.07, M["acero"]))
        partes.append(cilindro(f"{nombre}_cubo", 0.05, 0.08, (cx, cy, zd + 0.03), "z", M["negro"], 12))
        discos[nombre] = con_origen(une(nombre, partes), (cx, cy, zd))
    # Carga de abono: una placa que baja y encoge con lo que queda (origen abajo, en el centro)
    carga = con_origen(caja("carga", (arriba - 0.04, arriba - 0.04, 0.02), (0, yt, z1 - 0.06), M["abono"]), (0, yt, z1 - 0.06))
    senales = []
    for sx in (-1, 1):
        # Sobre la cara trasera de la tolva (inclinada): a 0,37 m de arriba, la cara está a ~0,45 m del centro
        zc = z1 - 0.37
        fondo = abajo / 2 + (arriba / 2 - abajo / 2) * (zc - z0) / (z1 - z0)
        senales += senal(f"senal{sx}", (sx * 0.33, yt + fondo + 0.015, zc), M, lado=0.22)
    objetos = {"bastidor": une("bastidor", bastidor), "rejilla": une("rejilla", rejilla), "mecanica": une("mecanica", mecanica),
               "senales": une("senales", senales), "carga": carga, **discos}
    datos = {"ancho_trabajo": A["ancho_trabajo"], "alto_bulon": A["alto_bulon"], "profundidad": 0,
             "trabajo_z": round(-(yt + 0.05), 3), "reversible": False, "tipo": "suspendido",
             "discos": ["disco_i", "disco_d"], "entrada_tdf": [0, round(zd - 0.12, 3), 0.0],
             "salida_discos": [[round(sx * A["discos_x"], 3), round(zd + 0.05, 3), round(-(yt + 0.05), 3)] for sx in (1, -1)],
             # La carga sube de z0 (vacía) a z1 (llena) y su lado pasa de abajo a arriba
             "carga": {"objeto": "carga", "y_vacia": round(z0 + 0.05, 3), "y_llena": round(z1 - 0.06, 3),
                       "escala_vacia": round(abajo / (arriba - 0.04), 3), "escala_vacia_x": round(abajo * 2.2 / (arriba - 0.04), 3)}}
    return objetos, datos


def sembradora(M):
    """Sembradora de cereal arrastrada de 3 m y 20 líneas: lanza, tolva, rejas de disco y rastrillo."""
    S = SEMBRADORA
    pintura = material("pintura_apero", 0.45, 0.12, color=COLORES["apero_sembradora"])
    zs = -S["alto_lanza"]
    W = S["ancho"]
    y0, y1 = S["marco_y"]
    zm = S["marco_z"]
    bastidor = []
    # Lanza en A con el ojo del enganche en el origen
    bastidor.append(cilindro("ojo", 0.07, 0.05, (0, 0, 0), "z", M["metal"], 14))
    for sx in (-1, 1):
        bastidor.append(segmento(f"lanza{sx}", (0, 0.05, 0.0), (sx * 0.75, y0, zm), 0.08, 0.1, pintura, 0.01))
    bastidor.append(segmento("lanza_centro", (0, 0.05, 0.0), (0, y0, zm), 0.08, 0.1, pintura, 0.01))
    # Marco
    for k, y in enumerate((y0, (y0 + y1) / 2, y1)):
        bastidor.append(caja(f"travesano{k}", (W + 0.1, 0.1, 0.1), (0, y, zm), pintura, 0.012))
    for sx in (-1, 1):
        bastidor.append(caja(f"lateral{sx}", (0.1, y1 - y0, 0.1), (sx * (W / 2 + 0.05), (y0 + y1) / 2, zm), pintura, 0.012))
    # Tolva corrida a lo ancho (tronco de pirámide alargado) con la tapa abierta hacia atrás
    za, zb = S["tolva_z"]
    fa, fb = S["tolva_fondo"]
    yt = S["tolva_y"]
    bastidor.append(tronco_piramide("tolva", (W - 0.1, fa), (W, fb), za, zb, yt, pintura, 0.015))
    bastidor.append(caja("borde_tolva", (W + 0.06, 0.05, 0.05), (0, yt - fb / 2, zb), pintura, 0.01))
    # Sin tapa: se ve la semilla que queda
    for sx in (-1, 1):
        bastidor.append(segmento(f"pata_tolva{sx}", (sx * (W / 2 - 0.1), yt - fa / 2, zm), (sx * (W / 2 - 0.05), yt - fb / 2, zb - 0.05), 0.06, 0.06, pintura))
        bastidor.append(segmento(f"pata_tolva_t{sx}", (sx * (W / 2 - 0.1), yt + fa / 2, zm), (sx * (W / 2 - 0.05), yt + fb / 2, zb - 0.05), 0.06, 0.06, pintura))
    # Plataforma y escalón para cargar
    bastidor.append(caja("plataforma", (1.2, 0.35, 0.03), (0, yt - fb / 2 - 0.25, za + 0.05), M["metal"]))
    bastidor.append(segmento("escalon", (0.55, yt - fb / 2 - 0.4, za + 0.04), (0.55, yt - fb / 2 - 0.45, zs + 0.25), 0.04, 0.04, M["metal"]))
    # Ruedas (también mueven la distribución; giran en el juego)
    ruedas = {}
    rr = S["rueda_r"]
    ey = S["eje_y"]
    for sx, nombre in ((1, "rueda_i"), (-1, "rueda_d")):
        cx = sx * (W / 2 + 0.2)
        partes = [anillo(f"{nombre}_cubierta", rr * 0.6, rr, 0.2, (cx, ey, zs + rr), M["neumatico"], 28, abombado=0.012),
                  cilindro(f"{nombre}_llanta", rr * 0.6, 0.16, (cx, ey, zs + rr), "x", M["llanta"], 24)]
        ruedas[nombre] = con_origen(une(nombre, partes), (cx, ey, zs + rr))
        bastidor.append(segmento(f"brazo_rueda{sx}", (sx * (W / 2 + 0.05), ey - 0.3, zm), (cx - sx * 0.12, ey, zs + rr), 0.08, 0.08, pintura, 0.01))
        bastidor.append(cilindro(f"eje{sx}", 0.04, 0.3, (cx - sx * 0.12, ey, zs + rr), "x", M["metal"], 10))
    # Líneas de siembra: brazo, disco y tubo de caída desde la tolva; rastrillo tapador detrás
    rejas, tubos = [], []
    n = S["lineas"]
    paso = W / n
    zr = zs + 0.12                           # bajadas, los discos entran unos centímetros
    for i in range(n):
        x = -W / 2 + paso / 2 + i * paso
        yr = y1 + (0.28 if i % 2 else 0.05)
        rejas.append(segmento(f"brazo_reja{i}", (x, y1 - 0.05, zm - 0.05), (x, yr, zr + 0.12), 0.03, 0.05, M["negro"]))
        rejas.append(cilindro(f"disco_reja{i}", 0.16, 0.01, (x, yr, zr + 0.04), "x", M["acero"], 18))
        tubos.append(segmento(f"tubo{i}", (x, yt + 0.05, za - 0.02), (x, yr - 0.02, zr + 0.2), 0.025, 0.025, M["negro"]))
    for i in range(n + 6):
        x = -W / 2 + i * W / (n + 5)
        rejas.append(segmento(f"pua{i}", (x, y1 + 0.5, zm - 0.05), (x, y1 + 0.75, zs + 0.13), 0.012, 0.012, M["metal"]))
    rejas.append(caja("barra_rastrillo", (W, 0.05, 0.05), (0, y1 + 0.5, zm - 0.05), M["metal"]))
    for sx in (-1, 1):
        rejas.append(segmento(f"soporte_rastrillo{sx}", (sx * W / 2, y1, zm), (sx * W / 2, y1 + 0.5, zm - 0.05), 0.05, 0.05, pintura))
    # Pata de apoyo de la lanza (solo se ve aparcada)
    pata = [cilindro("pata_tubo", 0.04, abs(zs) + 0.05, (0.0, 0.35, zs / 2), "z", M["metal"], 10),
            caja("pata_pie", (0.18, 0.18, 0.02), (0.0, 0.35, zs + 0.01), M["metal"])]
    carga = con_origen(caja("carga", (W - 0.08, fb - 0.04, 0.02), (0, yt, zb - 0.06), M["semilla"]), (0, yt, zb - 0.06))
    senales = []
    for sx in (-1, 1):
        senales += senal(f"senal{sx}", (sx * (W / 2 - 0.15), y1 + 0.08, zm + 0.35), M, lado=0.25)
        bastidor.append(caja(f"soporte_senal{sx}", (0.04, 0.04, 0.3), (sx * (W / 2 - 0.15), y1 + 0.05, zm + 0.15), pintura))
    objetos = {"bastidor": une("bastidor", bastidor), "rejas": une("rejas", rejas), "tubos": une("tubos", tubos),
               "pata": une("pata", pata), "senales": une("senales", senales), "carga": carga, **ruedas}
    trabajo_y = y1 + 0.2
    datos = {"ancho_trabajo": W, "alto_bulon": S["alto_lanza"], "profundidad": 0.04, "trabajo_z": round(-trabajo_y, 3),
             "reversible": False, "tipo": "arrastrado", "lineas": n,
             "eje_z": round(-ey, 3), "rueda_r": rr, "via": round(W + 0.4, 3), "ruedas": ["rueda_i", "rueda_d"],
             "rejas": "rejas", "pata": "pata", "bajada_rejas": 0.12,
             "carga": {"objeto": "carga", "y_vacia": round(za + 0.05, 3), "y_llena": round(zb - 0.06, 3),
                       "escala_vacia": round((fa - 0.04) / (fb - 0.04), 3), "escala_vacia_x": round((W - 0.18) / (W - 0.08), 3)}}
    return objetos, datos


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
    def juego(p):
        return [round(p[0] + d.x, 4), round(p[2] + d.z, 4), round(-(p[1] + d.y), 4)]
    return {
        "archivo": archivo,
        "enganche": {k: juego(v) for k, v in ENGANCHE.items()},
        "largo": round(mx.y - mn.y, 3),
        "ancho": round(mx.x - mn.x, 3),
        "alto": round(mx.z - mn.z, 3),
        "pintura": True,
        "triangulos": triangulos,
        "ruedas": ruedas,
        "fuente": "tools/build_maquinaria.py (modelo propio, genérico, sin marca)",
    }


def ficha_apero(objetos, datos, archivo, nombre):
    """Medidas del apero en ejes del juego, con el origen en los bulones inferiores del enganche."""
    bpy.context.view_layer.update()
    puntos = [o.matrix_world @ Vector(v) for o in objetos.values() for v in o.bound_box]
    triangulos = 0
    for o in objetos.values():
        o.data.calc_loop_triangles()
        triangulos += len(o.data.loop_triangles)
    return {
        "archivo": archivo,
        "nombre": nombre,
        "largo": round(max(p.y for p in puntos) - min(p.y for p in puntos), 3),
        "ancho": round(max(p.x for p in puntos) - min(p.x for p in puntos), 3),
        "alto": round(max(p.z for p in puntos) - min(p.z for p in puntos), 3),
        "triangulos": triangulos,
        "enganche": {"inferior": [0, 0, 0], "superior": [0, 0.68, 0.075]},
        "suelo_y": -datos["alto_bulon"],
        **datos,
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


def vistas(objetos, carpeta, largo, nombre="tractor", objetivo=(0, 0, 1.35), escala=1.0, suelo_z=0.0):
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
    os_.location.z = suelo_z
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
    objetivo = Vector(objetivo)
    for vista, pos in (("3cuartos", (-6.2, -7.0, 3.4)), ("lado", (-9.0, 0.0, 1.9)),
                       ("detras", (5.5, 7.5, 3.6)), ("frente", (0.0, -8.5, 2.0))):
        camara.location = objetivo + (Vector(pos) - Vector((0, 0, 1.35))) * escala
        archivo = f"{nombre}_{vista}"
        camara.rotation_euler = (objetivo - camara.location).to_track_quat("-Z", "Y").to_euler()
        escena.render.filepath = os.path.join(carpeta, f"{archivo}.png")
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
    solo = sys.argv[sys.argv.index("--solo") + 1].split(",") if "--solo" in sys.argv else None
    ruta_json = salida / "maquinaria.json"
    datos = json.loads(ruta_json.read_text(encoding="utf-8")) if solo and ruta_json.exists() else {}
    if not solo or "tractor" in solo:
        limpiar_escena()
        M = mats()
        objetos = tractor(M)
        mn, mx, d = centra(objetos)
        exportar_glb(list(objetos.values()), str(salida / "tractor.glb"))
        datos["tractor"] = ficha(objetos, mn, mx, d, "tractor.glb")
        t = datos["tractor"]
        print(f"[OK] Tractor: {t['largo']} × {t['ancho']} × {t['alto']} m, {t['triangulos']} triángulos")
        if con_vistas:
            vistas(objetos, str(previews), t["largo"])
    for id_, constructor, nombre, vista in (
            ("arado", arado, "Arado reversible de 4 cuerpos", ((0, 1.6, -0.05), 0.75)),
            ("cultivador", cultivador, "Cultivador de 3 m", ((0, 1.6, -0.05), 0.75)),
            ("abonadora", abonadora, "Abonadora centrífuga", ((0, 0.8, 0.5), 0.6)),
            ("sembradora", sembradora, "Sembradora de cereal de 3 m", ((0, 2.0, 0.3), 0.8))):
        if solo and id_ not in solo:
            continue
        limpiar_escena()
        M = mats()
        objetos, extra = constructor(M)
        exportar_glb(list(objetos.values()), str(salida / f"{id_}.glb"))
        datos[id_] = ficha_apero(objetos, extra, f"{id_}.glb", nombre)
        a = datos[id_]
        print(f"[OK] {nombre}: {a['largo']} × {a['ancho']} × {a['alto']} m, {a['triangulos']} triángulos, {a['ancho_trabajo']} m de trabajo")
        if con_vistas:
            vistas(objetos, str(previews), a["largo"], id_, objetivo=vista[0], escala=vista[1], suelo_z=-extra["alto_bulon"])
    ruta_json.write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")
