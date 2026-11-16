"""Fiestas F0 — vista cenital del recinto del modo fiestas sobre la ortofoto.

Dibuja lo que hay en src/datos/fiestas.js (línea de fachadas, vallas por tipo y numeradas,
puerta, tablado, gradas, corral, ambulancia, burladeros, zonas de público y dudas) para que Rubén lo revise
y lo corrija antes de modelar nada (PLAN_FIESTAS.md, fase F0). Además comprueba la geometría y
lista lo que hay hoy dentro del recinto (coches aparcados, farolas, bancos, árboles…), que la
F1 tendrá que quitar o respetar.

Entradas:
    src/datos/fiestas.js                 (se evalúa con node: es la única fuente del recinto)
    <assets>/buildings.geojson, muros.json, osm/calles.geojson, osm/poi.geojson,
    coches_aparcados.json, farolas.json, arboles.json, osm/elementos.json, terrain/terrain.f32
    Ortofoto: <assets>/orto/orto_F_C.jpg; si no están (juego publicado), las texturas del
    terreno dentro de <assets>/cabanillas.glb, que son las mismas teselas.

Salida:
    <processed>/previews/recinto_fiestas.png   vista general + tres detalles + lista de dudas

Uso (desde la carpeta del prototipo):
    conda run -n cabdrive python tools/20_recinto_fiestas.py
    python tools/20_recinto_fiestas.py --assets ../../juegos/cabanillas-drive/assets   # sin public/assets
    python tools/20_recinto_fiestas.py --jpg docs/fiestas/recinto_fiestas.jpg           # copia ligera
"""
from __future__ import annotations

import argparse
import io
import json
import math
import struct
import subprocess
import sys
import textwrap
import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFont
from shapely.geometry import LineString, Point, Polygon, shape
from shapely.ops import unary_union

from comun import RAIZ, cargar_config, cargar_origin, dir_assets, dir_previews, ruta_proyecto
from previews import Lienzo

# Encuadres (x_min, x_max, z_min, z_max, px/m, título)
PANELES = [
    (-30, 216, 262, 374, 7.3, "Recinto completo"),
    (139, 215, 311, 373, 23, "Detalle 1 - Plaza del Ayuntamiento"),
    (60, 154, 288, 337, 19, "Detalle 2 - San Roque, mitad este (hacia la plaza)"),
    (-24, 66, 266, 313, 20, "Detalle 3 - San Roque, mitad oeste (hacia la Sala de Cultura)"),
]
ANCHO_IMAGEN = 1800

COLOR_TIPO = {
    "tablones": (255, 150, 30),
    "panel": (235, 40, 40),
    "tubo": (175, 120, 255),
    "puerta": (70, 230, 110),
    "tablado": (215, 30, 140),
    "ninguna": (175, 175, 175),
}
NOMBRE_TIPO = {
    "tablones": "valla de tablones",
    "panel": "panel rojo macizo",
    "tubo": "barandilla roja de tubo",
    "puerta": "puerta (plaza / calle)",
    "tablado": "frente del tablado",
    "ninguna": "sin valla (tapia o fachada)",
}
ARENA = (236, 205, 120)
PUBLICO = (255, 235, 60)
RECORRIDO = (120, 175, 255)
AMBULANCIA = (60, 150, 255)
CORRAL = (150, 95, 45)
GRADAS = (200, 30, 30)
GRIS = (215, 215, 215)
DUDA = (255, 225, 40)

FUENTES_TTF = ["DejaVuSans.ttf", "arial.ttf", "segoeui.ttf", "LiberationSans-Regular.ttf"]
_con_tildes = True


def fuente(tam: int) -> ImageFont.ImageFont:
    """Fuente del sistema con tildes; si no hay ninguna, la de Pillow (sin tildes)."""
    global _con_tildes
    for nombre in FUENTES_TTF:
        try:
            return ImageFont.truetype(nombre, tam)
        except OSError:
            continue
    _con_tildes = False
    return ImageFont.load_default(size=tam)


def txt(t: str) -> str:
    """La fuente de reserva de Pillow no tiene tildes ni ¿ «: se quitan."""
    if _con_tildes:
        return t
    t = t.replace("¿", "").replace("¡", "").replace("«", '"').replace("»", '"').replace("≈", "~").replace("…", "...")
    return "".join(c for c in unicodedata.normalize("NFD", t) if unicodedata.category(c) != "Mn" or c == "̃") \
        .replace("ñ", "n").replace("Ñ", "N")


# ---------------------------------------------------------------- datos

def carga_recinto() -> dict:
    """Evalúa src/datos/fiestas.js con node y devuelve RECINTO_FIESTAS."""
    codigo = "import('./src/datos/fiestas.js').then((m) => console.log(JSON.stringify(m.RECINTO_FIESTAS)))"
    try:
        r = subprocess.run(["node", "--input-type=module", "-e", codigo], cwd=RAIZ, capture_output=True,
                           text=True, encoding="utf-8", check=True)
    except FileNotFoundError:
        raise SystemExit("No se encuentra node: hace falta para leer src/datos/fiestas.js")
    except subprocess.CalledProcessError as e:
        raise SystemExit(f"src/datos/fiestas.js no se puede evaluar:\n{e.stderr}")
    return json.loads(r.stdout)


def carga_filas_casas() -> list[LineString]:
    """Línea de fachada de cada fila de casas hecha a mano (src/datos/casas.js): es la que ve el juego."""
    codigo = ("import('./src/datos/casas.js').then((m) => console.log(JSON.stringify(m.FILAS_CASAS.map((f) => "
              "({ o: f.origen, e: f.eje, u: [Math.min(...f.casas.map((c) => c.u[0])), Math.max(...f.casas.map((c) => c.u[1]))] })))))")
    r = subprocess.run(["node", "--input-type=module", "-e", codigo], cwd=RAIZ, capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        return []
    return [LineString([(f["o"][0] + f["e"][0] * u, f["o"][1] + f["e"][1] * u) for u in f["u"]]) for f in json.loads(r.stdout)]


def lee_json(ruta: Path):
    return json.loads(ruta.read_text(encoding="utf-8"))


def carga_orto(assets: Path, origin: dict) -> tuple[Image.Image, float]:
    """Mosaico de la ortofoto (toda la zona) y sus px/m, desde las teselas o desde el GLB."""
    meta = lee_json(assets / "orto" / "orto.json")
    ancho, alto = meta["imagen_px"]
    tw, th = meta["tesela_px"]
    mosaico = Image.new("RGB", (ancho, alto))
    teselas = {(t["fila"], t["col"]): assets / "orto" / t["archivo"] for t in meta["teselas"]}
    if all(r.is_file() for r in teselas.values()):
        for (fila, col), ruta in teselas.items():
            mosaico.paste(Image.open(ruta).convert("RGB"), (col * tw, fila * th))
        origen = "teselas de assets/orto"
    else:
        glb = assets / "cabanillas.glb"
        if not glb.is_file():
            raise SystemExit(f"No hay ortofoto: faltan las teselas de {assets / 'orto'} y {glb}")
        with glb.open("rb") as f:
            f.read(12)
            largo, _ = struct.unpack("<I4s", f.read(8))
            gltf = json.loads(f.read(largo))
            f.read(8)
            base = f.tell()
            puestas = 0
            for im in gltf.get("images", []):
                partes = im.get("name", "").split("_")
                if len(partes) != 3 or partes[0] != "orto":
                    continue
                vista = gltf["bufferViews"][im["bufferView"]]
                f.seek(base + vista.get("byteOffset", 0))
                tesela = Image.open(io.BytesIO(f.read(vista["byteLength"]))).convert("RGB")
                if tesela.size != (tw, th):
                    tesela = tesela.resize((tw, th), Image.LANCZOS)
                mosaico.paste(tesela, (int(partes[2]) * tw, int(partes[1]) * th))
                puestas += 1
        if puestas != len(teselas):
            raise SystemExit(f"{glb.name} trae {puestas} teselas de ortofoto y hacen falta {len(teselas)}")
        origen = f"texturas de {glb.name}"
    print(f"Ortofoto: {origen} ({ancho} x {alto} px, {meta['px_por_m']:g} px/m)")
    return mosaico, ancho / origin["ancho"]


def poligonos_de(geom: dict) -> list[list]:
    return [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]


# ---------------------------------------------------------------- dibujo

class Panel(Lienzo):
    """Lienzo de previews.py sobre un recorte cualquiera de la ortofoto."""

    def __init__(self, orto: Image.Image, px_orto: float, origin: dict, x0, x1, z0, z1, px):
        caja = tuple(round(v * px_orto) for v in (x0 + origin["ancho"] / 2, z0 + origin["alto"] / 2,
                                                  x1 + origin["ancho"] / 2, z1 + origin["alto"] / 2))
        fondo = ImageEnhance.Brightness(orto.crop(caja)).enhance(0.8)
        super().__init__({"ancho": x1 - x0, "alto": z1 - z0}, px, fondo=fondo)
        self.x0, self.z0, self.x1, self.z1 = x0, z0, x1, z1

    def dentro(self, x, z, margen=0.0) -> bool:
        return self.x0 - margen <= x <= self.x1 + margen and self.z0 - margen <= z <= self.z1 + margen

    def p(self, x, z) -> tuple[float, float]:
        return (x - self.x0) * self.s, (z - self.z0) * self.s

    def discontinua(self, a, b, color, ancho, trazo=6.0, hueco=5.0) -> None:
        (ax, ay), (bx, by) = self.p(*a), self.p(*b)
        largo = math.hypot(bx - ax, by - ay)
        if largo < 1e-6:
            return
        ux, uy = (bx - ax) / largo, (by - ay) / largo
        s = 0.0
        while s < largo:
            e = min(s + trazo, largo)
            self.dib.line([(ax + ux * s, ay + uy * s), (ax + ux * e, ay + uy * e)], fill=color, width=ancho)
            s += trazo + hueco

    def etiqueta(self, x, z, texto, f, fondo, color=(0, 0, 0), borde=(0, 0, 0), redonda=False) -> None:
        px, py = self.p(x, z)
        w = self.dib.textlength(texto, font=f)
        h = f.size
        if redonda:
            r = max(w, h) / 2 + 3
            self.dib.ellipse([px - r, py - r, px + r, py + r], fill=fondo, outline=borde, width=2)
        else:
            self.dib.rounded_rectangle([px - w / 2 - 5, py - h / 2 - 4, px + w / 2 + 5, py + h / 2 + 4], radius=5,
                                       fill=fondo, outline=borde, width=2)
        self.dib.text((px, py), texto, font=f, fill=color, anchor="mm")

    def rotulo_calle(self, x, z, texto, f) -> None:
        px, py = self.p(x, z)
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1)):
            self.dib.text((px + dx, py + dy), texto, font=f, fill=(0, 0, 0, 230), anchor="mm")
        self.dib.text((px, py), texto, font=f, fill=(255, 255, 255), anchor="mm")


def rect_ambulancia(amb: dict) -> list[tuple[float, float]]:
    """Rectángulo de la ambulancia: apoyada en `en` y alargada hacia `direccion`."""
    cx, cz = amb["en"]
    dx, dz = amb["direccion"]
    n = math.hypot(dx, dz)
    dx, dz = dx / n, dz / n
    largo, medio = amb["largo"], amb["ancho"] / 2
    return [(cx - dz * medio, cz + dx * medio), (cx + dx * largo - dz * medio, cz + dz * largo + dx * medio),
            (cx + dx * largo + dz * medio, cz + dz * largo - dx * medio), (cx + dz * medio, cz - dx * medio)]


def dibuja_panel(panel: Panel, recinto: dict, capas: dict, titulo: str, general: bool) -> None:
    s = panel.s
    f_num = fuente(max(13, round(min(s, 20) * 0.95)))
    f_calle = fuente(15 if general else 19)
    f_tit = fuente(22)

    # Huellas del Catastro y tapias, finas, para ver de dónde sale la línea de fachadas
    for pol in capas["edificios"]:
        if pol.intersects(panel_caja(panel)):
            panel.geometria(pol, borde=(255, 255, 255, 110), ancho=1)
    for linea in capas["muros"]:
        if linea.intersects(panel_caja(panel)):
            panel.geometria(linea, borde=(255, 120, 255, 170), ancho=2)

    # Suelo del festejo: arena en la plaza, recorrido en la calle, público detrás de las vallas
    panel.dib.polygon(panel.px(recinto["plaza"]["ruedo"]), fill=ARENA + (105,))
    panel.dib.polygon(panel.px(recinto["calle"]["recorrido"]), fill=RECORRIDO + (70,))
    panel.geometria(capas["publico"], relleno=PUBLICO + (85,))
    for gradas in [recinto["tablado"]] + recinto["gradas"]["partes"]:
        panel.dib.polygon(panel.px(gradas["esquinas"]), fill=GRADAS + (170,), outline=(255, 255, 255, 255))
    # Línea de fachadas de la que cuelgan las vallas
    for zona in ("plaza", "calle"):
        borde = recinto[zona]["borde"]
        panel.dib.line(panel.px(borde + borde[:1]), fill=(255, 255, 255, 230), width=2)

    # Coches aparcados que hoy están en el recinto (habrá que quitarlos en F1)
    for c in capas["coches"]:
        if panel.dentro(c["x"], c["z"]):
            sn, cs, l, a = math.sin(c["rumbo"]), math.cos(c["rumbo"]), c["largo"] / 2, c["ancho"] / 2
            caja = [(c["x"] + sn * dl + cs * da, c["z"] + cs * dl - sn * da) for dl, da in ((l, a), (l, -a), (-l, -a), (-l, a))]
            panel.dib.polygon(panel.px(caja), outline=(120, 255, 255, 255), width=2)

    # Ambulancia, corral (manga y salida), vallas grises de las puertas y burladeros
    caja = rect_ambulancia(recinto["ambulancia"])
    panel.dib.polygon(panel.px(caja), fill=AMBULANCIA + (110,), outline=AMBULANCIA + (255,), width=2)
    cx, cz = (caja[1][0] + caja[2][0]) / 2 + 2.2, (caja[1][1] + caja[2][1]) / 2 + 1.4     # pasado el morro
    if panel.dentro(cx, cz) and not general:
        panel.etiqueta(cx, cz, "Ambulancia", f_num, (255, 255, 255, 235), borde=AMBULANCIA)
    corral = recinto["corral"]
    panel.dib.polygon(panel.px(corral["patio"]), fill=CORRAL + (90,), outline=CORRAL + (255,), width=3)
    panel.dib.line(panel.px(corral["pasillo"]), fill=CORRAL + (255,), width=max(4, round(s * 0.5)))
    panel.dib.polygon(panel.px(corral["manga"]), fill=CORRAL + (220,), outline=(255, 255, 255, 255))
    for refugio in recinto["refugios"]:
        panel.dib.polygon(panel.px(refugio["esquinas"]), outline=GRIS + (255,), width=max(2, round(s * 0.15)))
    for cierre in recinto["cierres"]:
        panel.dib.line(panel.px([cierre["a"], cierre["b"]]), fill=(235, 40, 40, 255), width=max(3, round(s * 0.3)))

    # Vallas por tipo. Las que cruzan una calle (bocacalle, cierre) llevan rayas blancas encima
    grosor = max(4, round(s * 0.4))
    for t in recinto["tramos"]:
        color = COLOR_TIPO.get(t["tipo"], (255, 255, 255))
        if t["tipo"] == "ninguna":
            panel.discontinua(t["a"], t["b"], color + (255,), max(3, grosor // 2), trazo=grosor * 1.5, hueco=grosor)
            continue
        panel.dib.line(panel.px([t["a"], t["b"]]), fill=(0, 0, 0, 255), width=grosor + 4)
        panel.dib.line(panel.px([t["a"], t["b"]]), fill=color + (255,), width=grosor)
        if t["clase"] in ("bocacalle", "cierre"):
            panel.discontinua(t["a"], t["b"], (255, 255, 255, 255), max(2, grosor // 2), trazo=grosor, hueco=grosor)
    # Corral: flecha de salida hacia el ruedo; burladeros
    if panel.dentro(*corral["salida"]):
        (ax, ay), (bx, by) = panel.p(*corral["manga"][0]), panel.p(*corral["manga"][3])
        sx, sy = panel.p(*corral["salida"])
        l = math.hypot(bx - ax, by - ay) or 1.0
        ux, uy = (bx - ax) / l, (by - ay) / l
        punta = (sx + ux * 2.2 * s, sy + uy * 2.2 * s)
        panel.dib.line([(sx, sy), punta], fill=(255, 255, 255, 255), width=max(3, round(s * 0.2)))
        panel.dib.polygon([punta, (punta[0] - ux * 0.8 * s - uy * 0.5 * s, punta[1] - uy * 0.8 * s + ux * 0.5 * s),
                           (punta[0] - ux * 0.8 * s + uy * 0.5 * s, punta[1] - uy * 0.8 * s - ux * 0.5 * s)], fill=(255, 255, 255, 255))
        if not general:
            cx, cz = sum(p[0] for p in corral["patio"]) / 4, sum(p[1] for p in corral["patio"]) / 4
            if panel.dentro(cx, cz):
                panel.etiqueta(cx, cz, "Corrales", f_num, (255, 255, 255, 235), borde=CORRAL)
            for parte in recinto["gradas"]["partes"][:2]:
                gx, gz = sum(p[0] for p in parte["esquinas"]) / 4, sum(p[1] for p in parte["esquinas"]) / 4
                panel.etiqueta(gx, gz, "plaza" if parte["mira"] == "este" else "calle", fuente(max(11, round(s * 0.5))),
                               (255, 255, 255, 220), borde=GRADAS)
    for b in recinto["burladeros"]:
        if panel.dentro(*b["en"]):
            px, py = panel.p(*b["en"])
            r = max(4, s * 0.45)
            panel.dib.rectangle([px - r, py - r * 0.45, px + r, py + r * 0.45], fill=(235, 40, 40, 255), outline=(255, 255, 255, 255))

    # Números: al lado de fuera del recorrido (hacia la fachada), para no tapar la valla.
    # Con «?», los tramos que no se ven en ninguna foto (siguen siendo propuesta)
    for t in recinto["tramos"]:
        mx, mz = (t["a"][0] + t["b"][0]) / 2, (t["a"][1] + t["b"][1]) / 2
        fx, fz = (t["fachada"][0][0] + t["fachada"][1][0]) / 2, (t["fachada"][0][1] + t["fachada"][1][1]) / 2
        d = math.hypot(fx - mx, fz - mz)
        fuera = (f_num.size * 0.95) / s + 0.25
        if d > 0.05:
            mx, mz = mx + (fx - mx) / d * fuera, mz + (fz - mz) / d * fuera
        elif t["clase"] == "fachada":
            # Sin valla (va sobre la tapia): el número, hacia el eje de la calle
            eje = LineString(recinto[t["zona"]]["eje"])
            q = eje.interpolate(eje.project(Point(mx, mz)))
            d = math.hypot(q.x - mx, q.y - mz) or 1.0
            mx, mz = mx + (q.x - mx) / d * fuera, mz + (q.y - mz) / d * fuera
        if panel.dentro(mx, mz):
            panel.etiqueta(mx, mz, str(t["id"]) + ("" if t.get("visto") else "?"), f_num, (255, 255, 255, 240), redonda=True,
                           borde=COLOR_TIPO.get(t["tipo"], (0, 0, 0)))

    # Nombres de calles (OSM) y lugares
    vistos = set()
    for nombre, linea in capas["calles"]:
        parte = linea.intersection(panel_caja(panel, -6))
        if parte.is_empty or parte.length < 12 or nombre in vistos:
            continue
        if parte.geom_type != "LineString":
            parte = max(parte.geoms, key=lambda g: g.length)
        vistos.add(nombre)
        m = parte.interpolate(0.5, normalized=True)
        panel.rotulo_calle(m.x, m.y, txt(nombre), f_calle)
    for nombre, (x, z) in capas["lugares"]:
        if panel.dentro(x, z, -4):
            panel.rotulo_calle(x, z, txt(nombre), f_calle)

    # Dudas
    for d in recinto["dudas"]:
        if panel.dentro(*d["en"]):
            panel.etiqueta(d["en"][0], d["en"][1], d["id"], f_num, DUDA + (245,))

    # Título, escala y norte
    ancho_tit = panel.dib.textlength(txt(titulo), font=f_tit) + 24
    panel.dib.rectangle([0, 0, ancho_tit, 36], fill=(20, 28, 38, 235))
    panel.dib.text((12, 6), txt(titulo), font=f_tit, fill=(255, 255, 255))
    w, h = panel.img.size
    metros = 20 if general else 5
    x1, y1 = w - 24, h - 22
    panel.dib.rectangle([x1 - metros * s - 12, y1 - 28, x1 + 12, y1 + 12], fill=(20, 28, 38, 220))
    panel.dib.line([(x1 - metros * s, y1), (x1, y1)], fill=(255, 255, 255), width=4)
    for x in (x1 - metros * s, x1):
        panel.dib.line([(x, y1 - 6), (x, y1 + 6)], fill=(255, 255, 255), width=3)
    panel.dib.text((x1 - metros * s / 2, y1 - 14), f"{metros} m", font=fuente(15), fill=(255, 255, 255), anchor="mm")
    nx, ny = w - 34, 70
    panel.dib.ellipse([nx - 24, ny - 30, nx + 24, ny + 30], fill=(20, 28, 38, 220))
    panel.dib.polygon([(nx, ny - 24), (nx - 9, ny + 2), (nx + 9, ny + 2)], fill=(255, 255, 255))
    panel.dib.text((nx, ny + 14), "N", font=fuente(16), fill=(255, 255, 255), anchor="mm")


def panel_caja(panel: Panel, margen: float = 0.0) -> Polygon:
    return Polygon([(panel.x0 - margen, panel.z0 - margen), (panel.x1 + margen, panel.z0 - margen),
                    (panel.x1 + margen, panel.z1 + margen), (panel.x0 - margen, panel.z1 + margen)])


def bloque_leyenda(recinto: dict, ancho: int) -> Image.Image:
    """Cabecera con el estado y la leyenda de colores."""
    f, f_tit = fuente(17), fuente(26)
    entradas = [(NOMBRE_TIPO[t], COLOR_TIPO[t], "linea") for t in COLOR_TIPO]
    entradas += [
        ("valla que cruza una calle (rayas blancas)", (255, 255, 255), "rayas"),
        ("arena (ruedo de la plaza)", ARENA, "relleno"),
        ("recorrido de la calle (asfalto)", RECORRIDO, "relleno"),
        ("acera del público, detrás de la valla", PUBLICO, "relleno"),
        ("tablado y gradas", GRADAS, "relleno"),
        ("ambulancia", AMBULANCIA, "relleno"),
        ("corrales, pasillo, manga y flecha de salida", CORRAL, "relleno"),
        ("burladero / cierre de barrotes", (235, 40, 40), "relleno"),
        ("valla gris en una puerta", GRIS, "borde"),
        ("línea de fachadas (gruesa) y Catastro (fina)", (255, 255, 255), "borde"),
        ("duda (D1...); en círculo, nº de tramo (con ?: no visto en fotos)", DUDA, "relleno"),
    ]
    columnas = 3
    filas = math.ceil(len(entradas) / columnas)
    alto = 62 + filas * 26 + 14
    img = Image.new("RGB", (ancho, alto), (20, 28, 38))
    d = ImageDraw.Draw(img)
    estado = recinto["estado"].upper()
    d.text((16, 12), txt(f"Cabanillas Drive - modo fiestas - F0: recinto sobre plano ({estado}, tercera vuelta con los croquis de Rubén)"),
           font=f_tit, fill=(255, 255, 255))
    for i, (nombre, color, clase) in enumerate(entradas):
        x, y = 16 + (i // filas) * (ancho // columnas), 58 + (i % filas) * 26
        if clase == "linea":
            d.line([(x, y + 10), (x + 30, y + 10)], fill=color, width=7)
        elif clase == "rayas":
            d.line([(x, y + 10), (x + 30, y + 10)], fill=COLOR_TIPO["tablones"], width=7)
            for k in range(3):
                d.line([(x + 3 + k * 10, y + 10), (x + 8 + k * 10, y + 10)], fill=color, width=3)
        elif clase == "borde":
            d.rectangle([x, y + 2, x + 30, y + 18], outline=color, width=2)
        else:
            d.rectangle([x, y + 2, x + 30, y + 18], fill=color)
        d.text((x + 40, y), txt(nombre), font=f, fill=(255, 255, 255))
    return img


def bloque_dudas(recinto: dict, ancho: int) -> Image.Image:
    """Pie con el texto de las dudas (las etiquetas amarillas de los planos)."""
    f, f_tit = fuente(17), fuente(22)
    por_linea = max(60, int((ancho - 90) / (f.size * 0.52)))
    lineas = []
    for d in recinto["dudas"]:
        partes = textwrap.wrap(txt(d["texto"]), por_linea)
        lineas += [(d["id"] if i == 0 else "", t) for i, t in enumerate(partes)]
    alto = 52 + len(lineas) * 23 + 14
    img = Image.new("RGB", (ancho, alto), (20, 28, 38))
    dib = ImageDraw.Draw(img)
    dib.text((16, 12), txt("Dudas para Rubén (etiquetas amarillas del plano)"), font=f_tit, fill=(255, 255, 255))
    y = 50
    for ident, texto in lineas:
        if ident:
            dib.text((16, y), ident, font=f, fill=DUDA)
        dib.text((70, y), texto, font=f, fill=(235, 235, 235))
        y += 23
    return img


# ---------------------------------------------------------------- comprobaciones

def informe(recinto: dict, capas: dict, assets: Path) -> list[str]:
    avisos = []
    obst = capas["obstaculos"]
    tramos = recinto["tramos"]
    borde_plaza = Polygon(recinto["plaza"]["borde"])
    borde_calle = Polygon(recinto["calle"]["borde"])
    ruedo = Polygon(recinto["plaza"]["ruedo"])
    recorrido = Polygon(recinto["calle"]["recorrido"])
    dentro = unary_union([borde_plaza, borde_calle])

    print(f"\nRecinto ({recinto['estado']}): {len(tramos)} tramos de valla, separación {recinto['separacionValla']:g} m")
    print(f"  Plaza: {borde_plaza.area:.0f} m² entre fachadas, ruedo de arena {ruedo.area:.0f} m²")
    print(f"  Calle: {borde_calle.area:.0f} m² entre fachadas, recorrido {recorrido.area:.0f} m², "
          f"eje {LineString(recinto['calle']['eje']).length:.0f} m")
    for pol, nombre in ((ruedo, "ruedo"), (recorrido, "recorrido de la calle")):
        if not pol.is_valid:
            avisos.append(f"el polígono del {nombre} se cruza consigo mismo")

    print("\n  nº zona  clase      lado   tipo      largo   a → b                              visto        nota")
    por_tipo: dict[str, float] = {}
    for t in tramos:
        por_tipo[t["tipo"]] = por_tipo.get(t["tipo"], 0) + t["largo"]
        seg = LineString([t["a"], t["b"]])
        nota = t["nombre"] or ""
        if t["tipo"] not in ("ninguna", "puerta") and seg.intersects(obst):
            corte = seg.intersection(obst).length
            if corte > 0.3:
                avisos.append(f"tramo {t['id']}: la valla atraviesa {corte:.1f} m de edificio o tapia")
        print(f"  {t['id']:2d} {t['zona']:5s} {t['clase']:10s} {t['lado']:6s} {t['tipo']:9s} {t['largo']:5.1f}   "
              f"({t['a'][0]:6.1f},{t['a'][1]:6.1f}) → ({t['b'][0]:6.1f},{t['b'][1]:6.1f})   {t.get('visto') or 'propuesta':12s} {nota}")
    print("  Total por tipo: " + ", ".join(f"{k} {v:.0f} m" for k, v in por_tipo.items()))

    # La línea de fachadas tiene que pasar por una fachada o una tapia de verdad (las gradas y la
    # puerta no: van en medio de la calle). 1,2 m de margen: las filas de casas hechas a mano son
    # rectas y la huella del Catastro tiene entrantes
    for t in tramos:
        if t["clase"] in ("gradas", "puerta"):
            continue
        for x, z in t["fachada"]:
            d = Point(x, z).distance(obst)
            if d > 1.2 and not any(Point(x, z).distance(Point(*q)) < 0.01 for g in tramos if g["clase"] in ("gradas", "puerta")
                                   for q in g["fachada"]):
                avisos.append(f"tramo {t['id']}: la línea de fachadas pasa por ({x:.1f}, {z:.1f}), a {d:.1f} m de "
                              "cualquier fachada o tapia")

    # Ancho libre del recorrido: de cada valla del lado norte a la del lado sur
    sur = unary_union([LineString([t["a"], t["b"]]) for t in tramos if t["zona"] == "calle" and t["lado"] == "sur"])
    minimo = (1e9, None)
    for t in tramos:
        if t["zona"] == "calle" and t["lado"] == "norte":
            seg = LineString([t["a"], t["b"]])
            for k in range(int(seg.length) + 1):
                p = seg.interpolate(k)
                d = p.distance(sur)
                if d < minimo[0]:
                    minimo = (d, p)
    print(f"\n  Ancho libre mínimo de la calle: {minimo[0]:.1f} m en ({minimo[1].x:.0f}, {minimo[1].y:.0f})"
          + (" (el paso entre las gradas del nº 2 y la valla norte)" if minimo[1].x > 148 else ""))
    norte_p = [t for t in tramos if t["zona"] == "plaza" and t["lado"] == "norte"]
    sur_p = unary_union([LineString([t["a"], t["b"]]) for t in tramos if t["zona"] == "plaza" and t["lado"] == "sur"])
    ancho_o = Point(norte_p[0]["a"]).distance(sur_p)
    ancho_e = Point(norte_p[-1]["b"]).distance(sur_p)
    print(f"  Ruedo de la plaza: {sum(t['largo'] for t in norte_p):.0f} m de largo, {ancho_o:.1f} m de ancho junto a la "
          f"puerta y {ancho_e:.1f} m junto al Ayuntamiento")
    print(f"  Puerta: {recinto['puerta']['largo']:.1f} m (la mitad norte del cierre; la sur es el frente de las gradas)")
    vistos = sum(t["largo"] for t in tramos if t.get("visto"))
    print(f"  Tramos vistos en las fotos: {sum(1 for t in tramos if t.get('visto'))} de {len(tramos)} "
          f"({vistos:.0f} de {sum(t['largo'] for t in tramos):.0f} m)")

    # Desnivel a lo largo de los ejes
    ruta_f32 = assets / "terrain" / "terrain.f32"
    ruta_u16 = assets / "terrain" / "terrain.u16"
    meta = lee_json(assets / "terrain" / "terrain.json")
    alturas = None
    if ruta_f32.is_file():
        alturas = np.fromfile(ruta_f32, dtype="<f4").reshape(meta["filas"], meta["columnas"])
    elif ruta_u16.is_file():
        m16 = lee_json(assets / "terrain" / "terrain_u16.json")
        alturas = m16["minimo"] + np.fromfile(ruta_u16, dtype="<u2").reshape(meta["filas"], meta["columnas"]) * m16["escala"]
    if alturas is not None:
        def altura(x, z):
            c = min(max(round(x - meta["vertice_0"]["x"]), 0), meta["columnas"] - 1)
            f = min(max(round(z - meta["vertice_0"]["z"]), 0), meta["filas"] - 1)
            return float(alturas[f, c])
        for zona in ("plaza", "calle"):
            eje = LineString(recinto[zona]["eje"])
            hs = [altura(*eje.interpolate(k).coords[0]) for k in range(int(eje.length) + 1)]
            print(f"  Terreno en el eje de la {zona}: de {hs[0]:.1f} a {hs[-1]:.1f} m (mín {min(hs):.1f}, máx {max(hs):.1f}; "
                  f"pendiente media {abs(hs[-1] - hs[0]) / eje.length * 100:.1f} %)")

    # Lo que hay hoy entre las fachadas del recinto
    print("\n  Dentro del recinto hoy (para la F1):")
    coches = [c for c in capas["coches"] if dentro.contains(Point(c["x"], c["z"]))]
    print(f"    coches aparcados: {len(coches)}" + "".join(f"\n      ({c['x']:.1f}, {c['z']:.1f})" for c in coches))
    farolas = [f for f in capas["farolas"] if dentro.buffer(0.5).contains(Point(f["x"], f["z"]))]
    print(f"    farolas: {len(farolas)}" + "".join(
        f"\n      ({f['x']:.1f}, {f['z']:.1f}) {'del LiDAR' if f['f'] == 'lidar' else 'estimada'}" for f in farolas))
    arboles = [a for a in capas["arboles"] if dentro.contains(Point(a[0], a[1]))]
    print(f"    árboles: {len(arboles)}" + "".join(f"\n      ({a[0]:.1f}, {a[1]:.1f}) alto {a[2]:.1f} m" for a in arboles))
    hay = False
    for clase, lista in capas["elementos"].items():
        if clase == "portales":
            continue
        for e in lista:
            if isinstance(e, dict) and "x" in e and dentro.contains(Point(e["x"], e["z"])):
                print(f"    {clase}: ({e['x']:.1f}, {e['z']:.1f})")
                hay = True
    if not hay:
        print("    bancos, señales y demás elementos de OSM: ninguno")

    print(f"\n  Dudas abiertas: {len(recinto['dudas'])}")
    for d in recinto["dudas"]:
        print(f"    {d['id']}: {d['texto']}")
    a_ojo = ["patio y pasillo de los corrales"] if recinto["corral"].get("aprox") else []
    a_ojo += [f"burladero {i + 1}" for i, b in enumerate(recinto["burladeros"]) if b.get("aprox")]
    a_ojo += ["medidas de las gradas del nº 2"] if recinto["gradas"].get("aprox") else []
    a_ojo += ["valla gris de una puerta" for r in recinto["refugios"] if r.get("aprox")]
    e = recinto["encierro"]
    print(f"  Encierro: sale del {e['sale']}, {e['vueltas']} vueltas a la calle con la puerta abierta y acaba en el {e['acaba']}")
    print("  Puesto a ojo (por confirmar): " + (", ".join(a_ojo) or "nada"))
    print(f"  Cierres de barrotes: {len(recinto['cierres'])}; burladeros: {len(recinto['burladeros'])}; "
          f"vallas grises: {len(recinto['refugios'])}")
    return avisos


# ---------------------------------------------------------------- principal

def main() -> int:
    ap = argparse.ArgumentParser(description="Vista cenital del recinto del modo fiestas")
    ap.add_argument("--assets", help="carpeta de assets del juego (por defecto, assets_dir de config.json)")
    ap.add_argument("--jpg", help="guarda además una copia en JPEG en esta ruta")
    args = ap.parse_args()

    config = cargar_config()
    origin = cargar_origin(config)
    assets = ruta_proyecto(args.assets) if args.assets else dir_assets(config)
    if not (assets / "buildings.geojson").is_file():
        print(f"No hay datos del juego en {assets}. Genera public/assets con el pipeline o indica otra carpeta con "
              "--assets (por ejemplo, la del juego publicado: ../../juegos/cabanillas-drive/assets)")
        return 1

    recinto = carga_recinto()
    edificios = [shape(f["geometry"]).buffer(0) for f in lee_json(assets / "buildings.geojson")["features"]]
    muros = [LineString(m["p"]) for m in lee_json(assets / "muros.json")["muros"] if len(m["p"]) >= 2]
    zona = unary_union([Polygon(recinto["plaza"]["borde"]), Polygon(recinto["calle"]["borde"])]).buffer(60)
    edificios = [e for e in edificios if e.intersects(zona)]
    muros = [m for m in muros if m.intersects(zona)]
    arboles_json = lee_json(assets / "arboles.json")
    lista_arboles = next(v for k, v in arboles_json.items() if isinstance(v, list) and v and isinstance(v[0], list))
    nombres_poi = {"townhall": "Ayuntamiento", "community_centre": None, "library": None}
    borde_total = unary_union([Polygon(recinto["plaza"]["borde"]), Polygon(recinto["calle"]["borde"])])
    lugares = []
    for f in lee_json(assets / "osm" / "poi.geojson")["features"]:
        tipo = f["properties"].get("tipo")
        if tipo in nombres_poi:
            nombre = nombres_poi[tipo] or f["properties"].get("nombre", "")
            lugares.append(("Sala de Cultura" if "Cultural" in nombre else nombre, f["geometry"]["coordinates"][:2]))
    capas = {
        "edificios": edificios,
        "muros": muros,
        "obstaculos": unary_union(edificios + [m.buffer(0.1) for m in muros] + [f.buffer(0.1) for f in carga_filas_casas()]),
        # Público: lo que queda entre la línea de fachadas y las vallas (menos el tablado)
        "publico": borde_total.difference(unary_union([Polygon(recinto["plaza"]["ruedo"]), Polygon(recinto["calle"]["recorrido"]),
                                                        Polygon(recinto["tablado"]["esquinas"]),
                                                        Polygon(recinto["corral"]["manga"])]).buffer(0.01)),
        "calles": [(f["properties"]["nombre"], shape(f["geometry"])) for f in lee_json(assets / "osm" / "calles.geojson")["features"]
                   if f["properties"].get("nombre") and f["geometry"]["type"] == "LineString"],
        "lugares": lugares,
        "coches": lee_json(assets / "coches_aparcados.json")["coches"],
        "farolas": lee_json(assets / "farolas.json")["farolas"],
        "arboles": lista_arboles,
        "elementos": {k: v for k, v in lee_json(assets / "osm" / "elementos.json").items() if isinstance(v, list)},
    }

    orto, px_orto = carga_orto(assets, origin)
    bloques = [bloque_leyenda(recinto, ANCHO_IMAGEN)]
    for i, (x0, x1, z0, z1, px, titulo) in enumerate(PANELES):
        panel = Panel(orto, px_orto, origin, x0, x1, z0, z1, px)
        dibuja_panel(panel, recinto, capas, titulo, general=(i == 0))
        img = panel.img
        if img.width != ANCHO_IMAGEN:
            lienzo = Image.new("RGB", (ANCHO_IMAGEN, img.height), (20, 28, 38))
            lienzo.paste(img, ((ANCHO_IMAGEN - img.width) // 2, 0))
            img = lienzo
        bloques.append(img)
    bloques.append(bloque_dudas(recinto, ANCHO_IMAGEN))

    separa = 6
    total = Image.new("RGB", (ANCHO_IMAGEN, sum(b.height for b in bloques) + separa * (len(bloques) - 1)), (20, 28, 38))
    y = 0
    for b in bloques:
        total.paste(b, (0, y))
        y += b.height + separa

    previews = dir_previews(config)
    previews.mkdir(parents=True, exist_ok=True)
    salida = previews / "recinto_fiestas.png"
    total.save(salida, optimize=True)
    salidas = [salida]
    if args.jpg:
        ruta_jpg = ruta_proyecto(args.jpg)
        ruta_jpg.parent.mkdir(parents=True, exist_ok=True)
        total.save(ruta_jpg, quality=86, optimize=True)
        salidas.append(ruta_jpg)

    avisos = informe(recinto, capas, assets)
    if avisos:
        print("\nAVISOS:")
        for a in avisos:
            print(f"  - {a}")
    else:
        print("\nGeometría sin avisos.")
    print("\nSalidas:" + "".join(f"\n  {s} ({total.width} x {total.height} px)" for s in salidas))
    return 0


if __name__ == "__main__":
    sys.exit(main())
