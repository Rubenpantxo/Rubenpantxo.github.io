"""Editor de personaje (PLAN_PERSONAJE.md, P1) — prepara los datos de MakeHuman para el navegador.

El editor hace en el navegador lo mismo que MakeHuman: malla base hm08 + suma de targets con los
pesos de las macros (sexo, edad, músculo, peso, altura, proporciones, origen, pecho), y la ropa,
el pelo, las cejas, las pestañas y los ojos se ajustan al cuerpo con su enlace .mhclo (cada vértice
de la prenda = combinación de 3 vértices del cuerpo + desplazamiento escalado). Así cualquier
prenda vale para cualquier cuerpo y el esqueleto sale de los «joint-*» del propio cuerpo.

Datos (todo CC0 de la comunidad MakeHuman; la malla, los targets, el esqueleto «game_engine» y sus
pesos vienen dentro de MPFB):
  <processed>/blender_mpfb/extensions/user_default/mpfb/data  (3dobjs, targets, rigs, mesh_metadata)
  <processed>/mpfb/data                                       (pelo, ropa, pieles, ojos, cejas…)

Salida en <assets>/personaje/:
  base.json + base.bin   malla, UV, pesos de piel, esqueleto, macros comprimidas y targets de detalle
  prendas/<id>.json/.bin una por prenda del catálogo (tools/personaje_catalogo.json)
  texturas.json          lista de texturas a convertir a WebP (lo hace tools/optimiza_personaje.mjs)

Compresión de las macros: ~500 targets densos (19 158 vértices cada uno) se guardan como una base
de SVD de rango K más la tabla de coeficientes de cada target: el navegador calcula los pesos de
MakeHuman y suma K vectores en vez de 500. Se informa del error máximo de la reconstrucción.

Uso: python tools/40_editor_personaje.py   (solo numpy; después: node tools/optimiza_personaje.mjs)
"""
from __future__ import annotations

import gzip
import json
import re
import sys
from pathlib import Path

import numpy as np

from comun import cargar_config, dir_assets, dir_processed, ruta_proyecto

ESCALA = 0.1                      # la malla de MakeHuman está en decímetros
# Unidades de expresión que usa el editor (se suman las de los dos lados)
EXPRESIONES = {
    "parpadeo": ["eye-left-closure", "eye-right-closure"],
    "sonrisa": ["mouth-corner-puller", "mouth-elevation"],
    "cejasArriba": ["eyebrows-left-up", "eyebrows-right-up"],
    "boca": ["mouth-open"],
}
RANGO_MACRO = 64                  # vectores de la base de SVD de las macros
ERROR_MACRO_MM = 0.8              # por encima, el vértice lleva su corrección exacta
CUANTO_DETALLE = 1 / 32767


# ---------------------------------------------------------------- lectura de MakeHuman
def lee_obj(ruta: Path):
    """Vértices, UV y caras (con su grupo) de un .obj de MakeHuman (caras de 3 o 4 lados)."""
    v, vt, caras = [], [], []
    grupo = ""
    for linea in ruta.read_text(encoding="utf-8", errors="replace").splitlines():
        if linea.startswith("v "):
            v.append([float(x) for x in linea.split()[1:4]])
        elif linea.startswith("vt "):
            vt.append([float(x) for x in linea.split()[1:3]])
        elif linea.startswith("g "):
            grupo = linea[2:].strip()
        elif linea.startswith("f "):
            esquinas = []
            for e in linea.split()[1:]:
                partes = e.split("/")
                esquinas.append((int(partes[0]) - 1, int(partes[1]) - 1 if len(partes) > 1 and partes[1] else -1))
            caras.append((grupo, esquinas))
    return np.array(v, np.float64), np.array(vt, np.float64) if vt else np.zeros((0, 2)), caras


def triangula(caras, solo_grupo=None):
    """Lista de triángulos [(v, vt) × 3] (abanico; las caras de MakeHuman son convexas)."""
    tris = []
    for grupo, esq in caras:
        if solo_grupo is not None and grupo != solo_grupo:
            continue
        for i in range(1, len(esq) - 1):
            tris.append((esq[0], esq[i], esq[i + 1]))
    return tris


def separa_costuras(tris, vt):
    """Vértices de dibujo = pares únicos (vértice, UV). Devuelve mapa→vértice, UV e índices."""
    clave = {}
    mapa, uv, indices = [], [], []
    for tri in tris:
        for v, t in tri:
            k = (v, t)
            if k not in clave:
                clave[k] = len(mapa)
                mapa.append(v)
                uv.append(vt[t] if t >= 0 else (0.0, 0.0))
            indices.append(clave[k])
    return np.array(mapa, np.int32), np.array(uv, np.float32), np.array(indices, np.uint32)


def lee_target(ruta: Path, n: int) -> np.ndarray:
    d = np.zeros((n, 3), np.float32)
    abre = gzip.open if ruta.suffix == ".gz" else open
    with abre(ruta, "rt", encoding="utf-8") as f:
        for linea in f:
            if not linea or linea[0] == "#":
                continue
            p = linea.split()
            if len(p) >= 4:
                d[int(p[0])] = (float(p[1]), float(p[2]), float(p[3]))
    return d


def lee_mhclo(ruta: Path):
    """Enlace de una prenda: refs (n×3), pesos (n×3), desplazamientos (n×3), escalas y borrados."""
    refs, pesos, despl = [], [], []
    escalas = {}
    borrar = []
    meta = {"material": None, "obj_file": None, "z_depth": 50, "nombre": ruta.stem, "etiquetas": []}
    seccion = None
    base_indice = 0
    for linea in ruta.read_text(encoding="utf-8", errors="replace").splitlines():
        s = linea.strip()
        if not s or s.startswith("#"):
            continue
        p = s.split()
        if p[0] == "verts":
            seccion = "verts"
            base_indice = int(p[1]) if len(p) > 1 else 0
            continue
        if p[0] == "delete_verts":
            seccion = "borrar"
            continue
        if seccion == "verts" and re.match(r"^-?\d", p[0]):
            if len(p) >= 9:
                refs.append([int(p[0]), int(p[1]), int(p[2])])
                pesos.append([float(p[3]), float(p[4]), float(p[5])])
                despl.append([float(p[6]), float(p[7]), float(p[8])])
            elif len(p) == 1:
                refs.append([int(p[0])] * 3)
                pesos.append([1.0, 0.0, 0.0])
                despl.append([0.0, 0.0, 0.0])
            continue
        if seccion == "borrar" and re.match(r"^\d", p[0]):
            i = 0
            while i < len(p):
                if i + 2 < len(p) and p[i + 1] == "-":
                    borrar.extend(range(int(p[i]), int(p[i + 2]) + 1))
                    i += 3
                else:
                    borrar.append(int(p[i]))
                    i += 1
            continue
        if p[0] in ("x_scale", "y_scale", "z_scale"):
            escalas[p[0][0]] = [int(p[1]), int(p[2]), float(p[3])]
        elif p[0] == "material":
            meta["material"] = " ".join(p[1:])
        elif p[0] == "obj_file":
            meta["obj_file"] = " ".join(p[1:])
        elif p[0] == "z_depth":
            meta["z_depth"] = int(p[1])
        elif p[0] == "name":
            meta["nombre"] = " ".join(p[1:])
        elif p[0] == "tag":
            meta["etiquetas"].append(" ".join(p[1:]).lower())
    refs = np.array(refs, np.int32) - base_indice
    return refs, np.array(pesos, np.float32), np.array(despl, np.float32), escalas, sorted(set(borrar)), meta


def lee_mhmat(ruta: Path) -> dict:
    m = {}
    if not ruta.is_file():
        return m
    for linea in ruta.read_text(encoding="utf-8", errors="replace").splitlines():
        p = linea.strip().split(None, 1)
        if len(p) == 2 and not p[0].startswith("#"):
            m[p[0]] = p[1].strip()
    return m


# ---------------------------------------------------------------- macros de MakeHuman
def nombres_macro(dir_targets: Path):
    """Todos los targets que pueden salir de las macros (sin bebés: el editor empieza en 18 años)."""
    edades = ["child", "young", "old"]
    sexos = ["female", "male"]
    musc = ["minmuscle", "averagemuscle", "maxmuscle"]
    peso = ["minweight", "averageweight", "maxweight"]
    nombres = []
    for r in ["african", "asian", "caucasian"]:
        for s in sexos:
            for e in edades:
                nombres.append(f"macrodetails/{r}-{s}-{e}")
    for s in sexos:
        for e in edades:
            for m in musc:
                for w in peso:
                    nombres.append(f"macrodetails/universal-{s}-{e}-{m}-{w}")
                    for h in ["minheight", "maxheight"]:
                        nombres.append(f"macrodetails/height/{s}-{e}-{m}-{w}-{h}")
                    for pr in ["uncommonproportions", "idealproportions"]:
                        nombres.append(f"macrodetails/proportions/{s}-{e}-{m}-{w}-{pr}")
    for e in edades:
        for m in musc:
            for w in peso:
                for c in ["mincup", "averagecup", "maxcup"]:
                    for f in ["minfirmness", "averagefirmness", "maxfirmness"]:
                        if c == "averagecup" and f == "averagefirmness":
                            continue
                        nombres.append(f"breast/female-{e}-{m}-{w}-{c}-{f}")
    existentes = [n for n in nombres if (dir_targets / f"{n}.target.gz").is_file()]
    faltan = len(nombres) - len(existentes)
    if faltan:
        print(f"  aviso: faltan {faltan} targets macro en el disco (se omiten)")
    return existentes


def comprime_svd(D: np.ndarray, rango: int, error_mm: float):
    """D (T × 3N, en metros) → base B (K × 3N, int16 con escala por vector), coeficientes C (T × K)
    y, por target, los vértices donde la reconstrucción se aparta más de error_mm (corrección
    dispersa). Los coeficientes se ajustan a la base ya cuantizada: lo que dibuja el navegador es
    exactamente lo que se mide aquí."""
    U, S, Vt = np.linalg.svd(D, full_matrices=False)
    B = Vt[:rango]
    escala = np.abs(B).max(axis=1) / 32767
    Bq = np.round(B / escala[:, None]).astype(np.int16)
    Br = Bq.astype(np.float64) * escala[:, None]
    C = (D @ Br.T) @ np.linalg.inv(Br @ Br.T)
    resto = (D - C @ Br).reshape(len(D), -1, 3)
    err = np.sqrt((resto ** 2).sum(-1)) * 1000
    correcciones = []
    for t in range(len(D)):
        vs = np.nonzero(err[t] > error_mm)[0]
        correcciones.append((vs, resto[t, vs]))
    final = err.copy()
    for t, (vs, _) in enumerate(correcciones):
        final[t, vs] = 0
    return Bq, escala.astype(np.float32), C.astype(np.float32), correcciones, float(final.max()), float(err.mean())


# ---------------------------------------------------------------- deslizadores de detalle
TRADUCE = {
    "head": "cabeza", "forehead": "frente", "eyebrows": "cejas", "eyes": "ojos", "nose": "nariz",
    "mouth": "boca", "ears": "orejas", "chin": "barbilla", "cheek": "mejillas", "neck": "cuello",
    "torso": "torso", "hip": "cadera", "stomach": "vientre", "buttocks": "glúteos", "pelvis": "pelvis",
    "arms": "brazos", "hands": "manos", "legs": "piernas", "feet": "pies", "breast": "pecho",
}


def deslizadores(dir_targets: Path, n: int):
    """Lee target.json de MPFB: cada categoría con opuestos → un deslizador −1…1 (ambos lados)."""
    info = json.loads((dir_targets / "target.json").read_text(encoding="utf-8"))
    sliders, targets = [], {}
    for grupo, datos in info.items():
        if grupo not in TRADUCE:
            continue
        for cat in datos.get("categories", []):
            op = cat.get("opposites") or {}
            neg = [op.get("negative-left"), op.get("negative-right")] if cat.get("has_left_and_right") else [op.get("negative-unsided")]
            pos = [op.get("positive-left"), op.get("positive-right")] if cat.get("has_left_and_right") else [op.get("positive-unsided")]
            neg = [t for t in neg if t]
            pos = [t for t in pos if t]
            if not neg and not pos:
                # Sin opuestos: cada target suelto es un deslizador 0…1
                for t in cat.get("targets", []):
                    neg, pos = [], [t]
                    break
            todos = neg + pos
            if not todos:
                continue
            rutas = {t: dir_targets / grupo / f"{t}.target.gz" for t in todos}
            if not all(r.is_file() for r in rutas.values()):
                continue
            # Los dos lados se suman en un solo target (el editor es simétrico)
            s = {"id": cat["name"], "grupo": grupo, "neg": None, "pos": None}
            for clave, lista in (("neg", neg), ("pos", pos)):
                if lista:
                    nombre = f"{cat['name']}|{clave}"
                    targets[nombre] = sum(lee_target(rutas[t], n) for t in lista)
                    s[clave] = nombre
            sliders.append(s)
    return sliders, targets


# ---------------------------------------------------------------- empaquetado binario
class Paquete:
    def __init__(self):
        self.trozos = []
        self.offset = 0

    def mete(self, arr: np.ndarray) -> dict:
        arr = np.ascontiguousarray(arr)
        pad = (-self.offset) % 4
        if pad:
            self.trozos.append(b"\0" * pad)
            self.offset += pad
        d = {"o": self.offset, "n": int(arr.size), "t": str(arr.dtype)}
        b = arr.tobytes()
        self.trozos.append(b)
        self.offset += len(b)
        return d

    def guarda(self, ruta: Path):
        """Comprimido con gzip (.binz): el navegador lo abre con DecompressionStream. No se llama
        .gz para que ningún servidor lo sirva con Content-Encoding y lo descomprima dos veces."""
        ruta.with_suffix(".binz").write_bytes(gzip.compress(b"".join(self.trozos), 9, mtime=0))
        return self.offset


def pesos_piel(dir_rig: Path, nombres_huesos, n):
    """Pesos del esqueleto game_engine sobre la malla base → 4 huesos por vértice."""
    w = json.loads((dir_rig / "weights.game_engine.json").read_text(encoding="utf-8"))["weights"]
    listas = [[] for _ in range(n)]
    for hueso, pares in w.items():
        if hueso not in nombres_huesos:
            continue
        h = nombres_huesos.index(hueso)
        for v, p in pares:
            if v < n:
                listas[v].append((p, h))
    idx = np.zeros((n, 4), np.uint8)
    pes = np.zeros((n, 4), np.float32)
    for v, l in enumerate(listas):
        l.sort(reverse=True)
        l = l[:4]
        s = sum(p for p, _ in l) or 1.0
        for k, (p, h) in enumerate(l):
            idx[v, k] = h
            pes[v, k] = p / s
    return idx, pes


def main() -> int:
    config = cargar_config()
    proc = dir_processed(config)
    dmpfb = proc / "blender_mpfb" / "extensions" / "user_default" / "mpfb" / "data"
    drec = proc / "mpfb" / "data"
    if not (dmpfb / "3dobjs" / "base.obj").is_file() or not drec.is_dir():
        print(f"Faltan los datos de MPFB en {dmpfb} o {drec} (tools/14_personas.py los instala)")
        return 1
    salida = dir_assets(config) / "personaje"
    (salida / "prendas").mkdir(parents=True, exist_ok=True)
    catalogo = json.loads(ruta_proyecto("tools/personaje_catalogo.json").read_text(encoding="utf-8"))

    # --- Malla base (todo en metros; los ayudantes se guardan porque las prendas se enganchan a ellos)
    v, vt, caras = lee_obj(dmpfb / "3dobjs" / "base.obj")
    n = len(v)
    tris = triangula(caras, "body")
    mapa, uv, indices = separa_costuras(tris, vt)
    grupos = json.loads((dmpfb / "mesh_metadata" / "basemesh_vertex_groups.json").read_text(encoding="utf-8"))
    print(f"Malla base: {n} vértices ({len(tris)} triángulos del cuerpo, {len(mapa)} vértices de dibujo)")

    # --- Esqueleto: cabeza y cola de cada hueso = media de un cubo «joint-*» o de unos vértices
    rig = json.loads((dmpfb / "rigs" / "standard" / "rig.game_engine.json").read_text(encoding="utf-8"))
    nombres_huesos = list(rig.keys())

    def puntos(def_):
        if def_["strategy"] == "CUBE":
            vs = []
            for a, b in grupos[def_["cube_name"]]:
                vs.extend(range(a, b + 1))
            return vs
        return list(def_["vertex_indices"])

    huesos = [{"nombre": h, "padre": rig[h]["parent"] or None, "cabeza": puntos(rig[h]["head"]),
               "cola": puntos(rig[h]["tail"]), "giro": rig[h].get("roll", 0)} for h in nombres_huesos]
    idx_piel, pesos = pesos_piel(dmpfb / "rigs" / "standard", nombres_huesos, n)

    paq = Paquete()
    meta = {"version": 1, "escala": ESCALA, "vertices": n, "cuerpo": 13380,
            "posiciones": paq.mete((v * ESCALA).astype(np.float32)),
            "mapa": paq.mete(mapa), "uv": paq.mete(uv), "indices": paq.mete(indices),
            "pielIndices": paq.mete(idx_piel), "pielPesos": paq.mete(pesos), "huesos": huesos,
            "grupos": {k: g for k, g in grupos.items() if k.startswith("helper-") or k in ("HelperGeometry", "JointCubes")}}

    # --- Macros: SVD de todos los targets densos
    dir_targets = dmpfb / "targets"
    macro = nombres_macro(dir_targets)
    print(f"Targets macro: {len(macro)} (leyendo…)")
    D = np.stack([lee_target(dir_targets / f"{t}.target.gz", n).ravel() * ESCALA for t in macro]).astype(np.float64)
    Bq, escala_b, C, corr, err, medio = comprime_svd(D, RANGO_MACRO, ERROR_MACRO_MM)
    # Correcciones: todas juntas (target, vértice, delta int16 con escala común)
    t_idx = np.concatenate([np.full(len(vs), t, np.uint16) for t, (vs, _) in enumerate(corr)])
    v_idx = np.concatenate([vs for vs, _ in corr]).astype(np.uint16)
    deltas = np.concatenate([d for _, d in corr]) if len(t_idx) else np.zeros((0, 3))
    esc_c = float(np.abs(deltas).max()) / 32767 if len(deltas) else 1.0
    print(f"  SVD rango {RANGO_MACRO}: error medio {medio:.3f} mm; {len(t_idx)} correcciones > {ERROR_MACRO_MM} mm; "
          f"error máx final {err:.3f} mm; base {Bq.nbytes / 1048576:.1f} MB")
    meta["macro"] = {"targets": macro, "rango": RANGO_MACRO, "base": paq.mete(Bq), "escalas": paq.mete(escala_b),
                     "coeficientes": paq.mete(C), "error_mm": round(err, 4),
                     "correcciones": {"t": paq.mete(t_idx), "v": paq.mete(v_idx),
                                      "d": paq.mete(np.round(deltas / esc_c).astype(np.int16)), "e": esc_c}}
    # Tramos de cada macro (macro.json): el navegador calcula los pesos igual que MakeHuman
    meta["macro"]["partes"] = json.loads((dir_targets / "macrodetails" / "macro.json").read_text(encoding="utf-8"))["macrotargets"]

    # --- Detalle: dispersos (solo los vértices que se mueven), int16 con escala por target
    sliders, targets = deslizadores(dir_targets, n)
    det = {}
    bytes_det = 0
    for nombre, d in targets.items():
        d = d * ESCALA
        movidos = np.nonzero(np.abs(d).max(1) > 1e-6)[0].astype(np.uint16 if n < 65536 else np.uint32)
        if len(movidos) == 0:
            continue
        vals = d[movidos]
        esc = float(np.abs(vals).max()) / 32767 or 1e-9
        q = np.round(vals / esc).astype(np.int16)
        det[nombre] = {"v": paq.mete(movidos), "d": paq.mete(q), "e": esc}
        bytes_det += movidos.nbytes + q.nbytes
    sliders = [s for s in sliders if all(t in det for t in (s["neg"], s["pos"]) if t)]
    # Expresiones (unidades de MakeHuman): parpadeo, sonrisa… para dar vida al editor y al juego
    dir_expr = dir_targets / "expression" / "units" / "caucasian"
    expresiones = {}
    for nombre, partes in EXPRESIONES.items():
        d = sum(lee_target(dir_expr / f"{t}.target.gz", n) for t in partes) * ESCALA
        movidos = np.nonzero(np.abs(d).max(1) > 1e-6)[0].astype(np.uint16)
        esc = float(np.abs(d[movidos]).max()) / 32767
        expresiones[nombre] = {"v": paq.mete(movidos), "d": paq.mete(np.round(d[movidos] / esc).astype(np.int16)), "e": esc}
        bytes_det += movidos.nbytes * 4
    meta["expresiones"] = expresiones
    meta["detalle"] = {"targets": det, "deslizadores": sliders}
    print(f"Detalle: {len(sliders)} deslizadores, {len(det)} targets, {bytes_det / 1048576:.1f} MB")

    # --- Prendas del catálogo (pelo, cejas, pestañas, ojos, ropa)
    texturas = []
    hechas = []
    for item in catalogo["prendas"]:
        carpeta = drec / item["carpeta"]
        mhclo = next(carpeta.glob("*.mhclo"), None)
        if mhclo is None:
            print(f"  falta {item['carpeta']}")
            continue
        refs, pw, despl, escalas, borrar, m = lee_mhclo(mhclo)
        pv, pvt, pcaras = lee_obj(carpeta / (m["obj_file"] or f"{mhclo.stem}.obj"))
        if len(pv) != len(refs):
            print(f"  {item['id']}: {len(pv)} vértices y {len(refs)} enlaces; se omite")
            continue
        ptris = triangula(pcaras)
        pmapa, puv, pind = separa_costuras(ptris, pvt)
        mat = lee_mhmat(carpeta / (m["material"] or f"{mhclo.stem}.mhmat"))
        if item.get("material"):
            mat = lee_mhmat(drec / item["material"])
        pq = Paquete()
        pj = {"id": item["id"], "z": m["z_depth"], "vertices": len(pv),
              "refs": pq.mete(refs.astype(np.uint16)), "pesos": pq.mete(pw), "despl": pq.mete(despl * 1.0),
              "escalas": escalas, "mapa": pq.mete(pmapa), "uv": pq.mete(puv), "indices": pq.mete(pind),
              "borrar": pq.mete(np.array(borrar, np.uint16)) if borrar else None}
        tex = {}
        base_mat = (drec / item["material"]).parent if item.get("material") else carpeta
        for clave, sal in (("diffuseTexture", "color"), ("normalmapTexture", "normal")):
            if mat.get(clave):
                origen = base_mat / Path(mat[clave]).name
                if origen.is_file():
                    nombre = f"{item['id']}_{sal}.webp"
                    texturas.append({"origen": str(origen), "destino": nombre, "tipo": sal,
                                     "lado": item.get("lado", 1024 if sal == "color" else 512)})
                    tex[sal] = nombre
        pj["texturas"] = tex
        pj["transparente"] = mat.get("transparent", "False") == "True" or item["hueco"] in ("pelo", "cejas", "pestanas")
        pq.guarda(salida / "prendas" / f"{item['id']}.bin")
        (salida / "prendas" / f"{item['id']}.json").write_text(json.dumps(pj, ensure_ascii=False), encoding="utf-8")
        hechas.append(item["id"])
        miniatura = carpeta / f"{mhclo.stem}.thumb"
        if miniatura.is_file():
            texturas.append({"origen": str(miniatura), "destino": f"mini_{item['id']}.webp", "tipo": "mini", "lado": 128})
    print(f"Prendas: {len(hechas)} de {len(catalogo['prendas'])}")

    # --- Pieles e iris
    for piel in catalogo["pieles"]:
        mat = lee_mhmat(drec / piel["material"])
        origen = (drec / piel["material"]).parent / Path(mat.get("diffuseTexture", "")).name
        if origen.is_file():
            texturas.append({"origen": str(origen), "destino": f"piel_{piel['id']}.webp", "tipo": "color", "lado": 2048})
            texturas.append({"origen": str(origen), "destino": f"piel_{piel['id']}_m.webp", "tipo": "color", "lado": 1024})
            mini = next((drec / piel["material"]).parent.glob("*.thumb"), None)
            if mini:
                texturas.append({"origen": str(mini), "destino": f"mini_piel_{piel['id']}.webp", "tipo": "mini", "lado": 128})
        else:
            print(f"  falta la textura de la piel {piel['id']}")
    for ojo in catalogo["iris"]:
        mat = lee_mhmat(drec / ojo["material"])
        origen = (drec / ojo["material"]).parent / Path(mat.get("diffuseTexture", "")).name
        if origen.is_file():
            texturas.append({"origen": str(origen), "destino": f"iris_{ojo['id']}.webp", "tipo": "color", "lado": 512})
            mini = (drec / ojo["material"]).with_suffix(".thumb")
            if mini.is_file():
                texturas.append({"origen": str(mini), "destino": f"mini_iris_{ojo['id']}.webp", "tipo": "mini", "lado": 96})

    total = paq.guarda(salida / "base.bin")
    (salida / "base.json").write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    cat_salida = dict(catalogo)
    cat_salida["prendas"] = [p for p in catalogo["prendas"] if p["id"] in hechas]
    (salida / "catalogo.json").write_text(json.dumps(cat_salida, ensure_ascii=False, indent=1), encoding="utf-8")
    (proc / "personaje_texturas.json").write_text(json.dumps(texturas, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"base.binz: {total / 1048576:.1f} MB → {(salida / 'base.binz').stat().st_size / 1048576:.1f} MB comprimido · "
          f"{len(texturas)} texturas por convertir")
    return 0


if __name__ == "__main__":
    sys.exit(main())
