"""Agricultura A0 — Parcelas reales del término de Cabanillas (PLAN_AGRICULTURA.md §5.1).

Registra TODAS las parcelas rústicas del término (decisión de Rubén, 2026-11-20): cada una con su
contorno exacto del Catastro de Navarra, su superficie y su referencia polígono-parcela, para que
en el juego se puedan trabajar, comprar, vender o consultar. Cualquiera se puede labrar.

Fuentes (todas del Gobierno de Navarra por el WFS de IDENA, salvo el relieve y la foto):
  - Catastro: parcelas rústicas y mixtas, parcelas de vía (caminos), polígonos y término.
    Si algún día está el paquete de shapefiles en <raw>/catastro/ (CATASTPolParcelaRusti…),
    se usa ese en lugar del WFS.
  - SIGPAC: recintos (uso agrícola, pendiente) → uso de cada parcela y cuánto se cultiva.
  - Regadío: parcelas de regadío (comunidad de regantes) → si la parcela es de regadío.
  - Relieve: terreno del juego (LiDAR, 1 m) dentro de la zona; fuera, el MDT05 del IGN que ya
    descargó tools/40_horizonte.py (caché en <processed>/horizonte/). Con descargar_mdt_que_falte
    se bajan del mismo WCS los bloques que faltan para cubrir el término (norte, fuera de los 8 km).
  - Foto de las vistas: PNOA máxima actualidad por el mismo WMS y caché de bloques que 02_ortho.py.

Por parcela calcula: superficie, perímetro, cota media/mín/máx y pendiente (plano ajustado), hacia
dónde baja, dirección de labor (eje largo del rectángulo mínimo), entrada (punto del contorno más
cercano a un camino del Catastro), uso SIGPAC, regadío y dudas. No corrige nada a ojo: si el
Catastro y el SIGPAC no casan, lo apunta como duda para que Rubén decida.

Todas las descargas se cachean en <processed>/agricultura/ y no se repiten.

Salidas:
    <assets>/agricultura/parcelas.json        (lo carga el juego: contornos en coordenadas locales)
    <processed>/agricultura/parcelas.csv      (tabla para buscar parcelas: referencia, paraje, ha…)
    <processed>/previews/parcelas.jpg         (término entero sobre la ortofoto, color por uso)
    <processed>/previews/parcelas_cotas.jpg   (cotas en color, rojo alto / azul bajo, y sombreado)
    <processed>/previews/parcelas_cotas_vega.jpg  (lo mismo con la escala de la vega de regadío)
    <processed>/previews/parcelas_zona_juego.jpg  (zona del juego con las referencias)
    <processed>/previews/parcelas_pol_NN.jpg  (una hoja por polígono con el número de cada parcela)

Uso: conda run -n cabdrive python tools/50_parcelas.py
"""
from __future__ import annotations

import csv
import importlib
import json
import math
import sys
import time
from collections import defaultdict

import numpy as np
import requests
from PIL import Image, ImageDraw, ImageFont
from shapely import contains_xy, make_valid
from shapely.geometry import MultiPolygon, Polygon, box, shape
from shapely.ops import linemerge, unary_union
from shapely.strtree import STRtree

from comun import (busca_capa, cargar_config, cargar_origin, dir_assets, dir_previews, dir_processed,
                   dir_raw, utm_a_local)

# Certificados del almacén de Windows (igual que 40_horizonte.py)
try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

ortho = importlib.import_module("02_ortho")      # mismo WMS, capa y caché de bloques que la zona

Image.MAX_IMAGE_PIXELS = None
CABECERAS = {"User-Agent": "cabanillas-drive (prototipo; rubenpantxo.com)"}
REINTENTOS = 3
ESPERA_S = (5, 15, 30)

# Usos SIGPAC (USO26) que se consideran cultivables en el juego
USOS_CULTIVO = {"TA", "TH", "VI", "OV", "FY", "FS", "FL", "FV", "CI", "CF", "OF", "VF", "VO", "OC",
                "CV", "FF", "IV", "NV", "CS", "OP"}
# Colores de las vistas por uso SIGPAC (los que no estén salen en gris)
COLOR_USO = {
    "TA": (255, 214, 0), "TH": (60, 200, 90), "VI": (170, 60, 200), "OV": (120, 150, 40),
    "FY": (255, 120, 40), "FS": (200, 120, 70), "FL": (255, 90, 120), "FV": (255, 150, 90),
    "CI": (255, 170, 60), "PS": (160, 220, 120), "PR": (150, 200, 110), "PA": (120, 180, 100),
    "FO": (0, 120, 50), "MT": (110, 140, 80), "IM": (140, 140, 140), "ED": (200, 60, 60),
    "ZU": (220, 80, 80), "CA": (230, 230, 230), "AG": (40, 140, 255), "ZC": (130, 130, 130),
    "IS": (90, 90, 90), "IV": (0, 200, 200),
}
NOMBRE_USO = {
    "TA": "tierra arable", "TH": "huerta", "VI": "viñedo", "OV": "olivar", "FY": "frutales",
    "FS": "frutos secos", "FL": "frutos secos y olivar", "FV": "frutales y viñedo", "CI": "cítricos",
    "PS": "pastizal", "PR": "pasto arbustivo", "PA": "pasto con arbolado", "FO": "forestal",
    "MT": "matorral", "IM": "improductivo", "ED": "edificaciones", "ZU": "zona urbana",
    "CA": "viales", "AG": "corrientes y superficies de agua", "ZC": "zona concentrada",
    "IS": "islas", "IV": "invernaderos",
}


def falla(mensaje: str) -> None:
    print(f"\nERROR: {mensaje}")
    sys.exit(1)


def pide(url: str, params: dict, descripcion: str) -> requests.Response:
    for intento in range(REINTENTOS):
        try:
            r = requests.get(url, params=params, headers=CABECERAS, timeout=180)
            r.raise_for_status()
            return r
        except requests.RequestException as e:
            print(f"  {descripcion}: intento {intento + 1}/{REINTENTOS} fallido ({e})")
            if intento + 1 < REINTENTOS:
                time.sleep(ESPERA_S[intento])
    falla(f"El WFS de IDENA no responde tras {REINTENTOS} intentos ({descripcion}).")


# ------------------------------------------------------------------------------ Descarga (WFS)
def wfs_capa(A: dict, capa: str, cache_dir, filtro_cql: str | None, bbox) -> list[dict]:
    """GetFeature en GeoJSON (EPSG:25830); cachea la colección entera.

    El WFS de IDENA devuelve como mucho wfs_pagina (1000) elementos por petición y su paginación
    (STARTINDEX) no sirve: el campo FEATURE es el mismo en toda la capa y no ordena. Por eso la caja
    se parte en cuatro, recursivamente, hasta que cada trozo cabe en una petición; los elementos que
    caen en varios trozos se juntan por su identificador y al final se comprueba el recuento."""
    nombre = capa.split(":")[-1]
    ruta = cache_dir / f"{nombre}.geojson"
    if ruta.is_file():
        return json.loads(ruta.read_text(encoding="utf-8"))["features"]
    pagina = int(A.get("wfs_pagina", 1000))
    base = {"SERVICE": "WFS", "VERSION": "2.0.0", "REQUEST": "GetFeature", "TYPENAMES": capa,
            "SRSNAME": "urn:ogc:def:crs:EPSG::25830"}

    def filtro(caja):
        partes = [filtro_cql] if filtro_cql else []
        if caja is not None:
            partes.append("BBOX(the_geom,{:.1f},{:.1f},{:.1f},{:.1f},'EPSG:25830')".format(*caja))
        return " AND ".join(partes) if partes else None

    def cuenta(caja) -> int:
        params = {**base, "RESULTTYPE": "hits"}
        if filtro(caja):
            params["CQL_FILTER"] = filtro(caja)
        r = pide(A["wfs_url"], params, f"{nombre} (recuento)")
        try:
            return int(r.text.split('numberMatched="')[1].split('"')[0])
        except (IndexError, ValueError):
            falla(f"Respuesta inesperada del WFS al contar {nombre}:\n{r.text[:400]}")

    total = cuenta(None if filtro_cql else bbox)
    print(f"  {nombre}: {total} elementos")
    elementos: dict[str, dict] = {}

    def baja(caja, nivel=0):
        n = cuenta(caja)
        if n == 0:
            return
        if n > pagina:
            if nivel > 8:
                falla(f"{nombre}: no se consigue partir la caja por debajo de {pagina} elementos.")
            x0, y0, x1, y1 = caja
            xm, ym = (x0 + x1) / 2, (y0 + y1) / 2
            for sub in ((x0, y0, xm, ym), (xm, y0, x1, ym), (x0, ym, xm, y1), (xm, ym, x1, y1)):
                baja(sub, nivel + 1)
            return
        r = pide(A["wfs_url"], {**base, "CQL_FILTER": filtro(caja), "OUTPUTFORMAT": "application/json",
                                "COUNT": pagina}, f"{nombre} trozo")
        if "json" not in r.headers.get("Content-Type", ""):
            falla(f"El WFS devolvió {r.headers.get('Content-Type')} en vez de GeoJSON:\n{r.text[:400]}")
        llegados = r.json()["features"]
        if len(llegados) != n:
            falla(f"{nombre}: el trozo anunciaba {n} elementos y llegaron {len(llegados)}.")
        for f in llegados:
            elementos[f.get("id") or json.dumps(f["properties"], sort_keys=True)] = f
        print(f"    {len(elementos)}/{total}")

    baja(tuple(bbox))
    if len(elementos) != total:
        falla(f"{nombre}: se juntaron {len(elementos)} elementos distintos y el WFS anunciaba {total}.")
    lista = list(elementos.values())
    ruta.write_text(json.dumps({"type": "FeatureCollection", "fuente": A["wfs_url"], "capa": capa,
                                "filtro": filtro_cql, "features": lista}, ensure_ascii=False),
                    encoding="utf-8")
    return lista


def capa_local(config: dict, nombre: str) -> list[dict] | None:
    """Si el paquete de shapefiles del Catastro está en <raw>/catastro/, lee la capa de ahí."""
    carpeta = dir_raw(config) / "catastro"
    if not carpeta.is_dir():
        return None
    encontrada = busca_capa(carpeta, nombre)
    if encontrada is None:
        return None
    import geopandas as gpd
    ruta, capa = encontrada
    gdf = gpd.read_file(ruta, layer=capa)
    if gdf.crs is None or gdf.crs.to_epsg() != 25830:
        gdf = gdf.to_crs(25830)
    print(f"  {nombre}: {len(gdf)} elementos de {ruta}")
    return json.loads(gdf.to_json())["features"]


def geometria(f: dict):
    g = shape(f["geometry"])
    return g if g.is_valid else make_valid(g)


def solo_poligonos(g):
    """Se queda con la parte de superficie de una geometría (make_valid puede dejar líneas)."""
    if isinstance(g, (Polygon, MultiPolygon)):
        return g
    partes = [p for p in getattr(g, "geoms", []) if isinstance(p, (Polygon, MultiPolygon))]
    return unary_union(partes) if partes else Polygon()


# ------------------------------------------------------------------------------ Relieve
class Relieve:
    """Altura (m s. n. m.) en E, N: terreno del juego (LiDAR 1 m) dentro de la zona; fuera, MDT05
    de la caché del horizonte. NaN donde no hay ninguno de los dos."""

    def __init__(self, config, origin, assets, processed, caja=None, descargar=False):
        self.origin = origin
        self.juego = None
        ruta_t = assets / "terrain" / "terrain.json"
        if ruta_t.is_file():
            meta = json.loads(ruta_t.read_text(encoding="utf-8"))
            a = np.fromfile(assets / "terrain" / "terrain.f32", dtype="<f4")
            self.juego = (meta, a.reshape(meta["filas"], meta["columnas"]))
        else:
            print("  Aviso: no está public/assets/terrain (ejecuta 01_origin_terrain.py); solo MDT05.")
        H = config.get("horizonte", {})
        cobertura = H.get("mdt_cobertura", "Elevacion25830_5")
        self.bloques = []
        import rasterio
        if caja is not None and descargar:
            self.completa(H, origin, caja, processed / "agricultura" / "mdt", processed / "horizonte")
        rutas = sorted((processed / "horizonte").glob(f"mdt_{cobertura}_*.tif"))
        rutas += sorted((processed / "agricultura" / "mdt").glob(f"mdt_{cobertura}_*.tif"))
        for ruta in rutas:
            with rasterio.open(ruta) as ds:
                if ds.crs is None or ds.crs.to_epsg() != 25830:
                    falla(f"{ruta.name}: CRS {ds.crs}; se esperaba EPSG:25830.")
                a = ds.read(1).astype(np.float32)
                if ds.nodata is not None:
                    a[a == ds.nodata] = np.nan
                self.bloques.append((ds.bounds, ds.res[0], a))
        if not self.bloques:
            print("  Aviso: no hay MDT05 en <processed>/horizonte/ (ejecuta 40_horizonte.py).")

    @staticmethod
    def completa(H, origin, caja, cache, cache_horizonte):
        """Descarga del WCS del IGN (como 40_horizonte.py) los bloques del MDT05 que faltan para
        cubrir la caja, con la misma rejilla de bloques que el horizonte."""
        cobertura = H.get("mdt_cobertura", "Elevacion25830_5")
        bloque = float(H.get("mdt_bloque_m", 2000))
        lado = float(H.get("lado_m", 8000))
        e_ref, n_ref = origin["E_centro"] - lado / 2, origin["N_centro"] - lado / 2
        cache.mkdir(parents=True, exist_ok=True)
        i0, i1 = math.floor((caja[0] - e_ref) / bloque), math.ceil((caja[2] - e_ref) / bloque)
        j0, j1 = math.floor((caja[1] - n_ref) / bloque), math.ceil((caja[3] - n_ref) / bloque)
        for j in range(j0, j1):
            for i in range(i0, i1):
                x0, y0 = e_ref + i * bloque, n_ref + j * bloque
                nombre = f"mdt_{cobertura}_{x0:.0f}_{y0:.0f}_{x0 + bloque:.0f}_{y0 + bloque:.0f}.tif"
                if (cache_horizonte / nombre).is_file() or (cache / nombre).is_file():
                    continue
                r = pide(H["mdt_wcs_url"], {
                    "SERVICE": "WCS", "REQUEST": "GetCoverage", "VERSION": "2.0.1", "COVERAGEID": cobertura,
                    "SUBSET": [f"x({x0:.0f},{x0 + bloque:.0f})", f"y({y0:.0f},{y0 + bloque:.0f})"],
                    "FORMAT": "image/tiff"}, nombre)
                if not r.headers.get("Content-Type", "").startswith("image/tiff"):
                    falla(f"El WCS devolvió {r.headers.get('Content-Type')} en vez de un GeoTIFF:\n{r.text[:400]}")
                (cache / nombre).write_bytes(r.content)
                print(f"  MDT05 descargado: {nombre}")

    def mdt(self, e, n):
        h = np.full(e.shape, np.nan, dtype=np.float64)
        for b, res, a in self.bloques:
            dentro = (e >= b.left) & (e < b.right) & (n > b.bottom) & (n <= b.top)
            if not dentro.any():
                continue
            # centros de píxel: bilineal
            c = np.clip((e[dentro] - b.left) / res - 0.5, 0, a.shape[1] - 1.0001)
            f = np.clip((b.top - n[dentro]) / res - 0.5, 0, a.shape[0] - 1.0001)
            c0, f0 = np.floor(c).astype(int), np.floor(f).astype(int)
            tc, tf = c - c0, f - f0
            h[dentro] = ((a[f0, c0] * (1 - tc) + a[f0, c0 + 1] * tc) * (1 - tf)
                         + (a[f0 + 1, c0] * (1 - tc) + a[f0 + 1, c0 + 1] * tc) * tf)
        return h

    def altura(self, e, n):
        """Devuelve (alturas, fuente) con fuente = 'lidar_juego' | 'mdt05' | 'mixta' | None."""
        e, n = np.asarray(e, float), np.asarray(n, float)
        h = np.full(e.shape, np.nan)
        en_juego = np.zeros(e.shape, bool)
        if self.juego is not None:
            meta, a = self.juego
            x, z = utm_a_local(self.origin, e, n)
            x0, z0, paso = meta["vertice_0"]["x"], meta["vertice_0"]["z"], meta["paso_m"]
            c, f = (x - x0) / paso, (z - z0) / paso
            en_juego = (c >= 0) & (c <= meta["columnas"] - 1) & (f >= 0) & (f <= meta["filas"] - 1)
            if en_juego.any():
                c = np.clip(c[en_juego], 0, meta["columnas"] - 1.0001)
                f = np.clip(f[en_juego], 0, meta["filas"] - 1.0001)
                c0, f0 = np.floor(c).astype(int), np.floor(f).astype(int)
                tc, tf = c - c0, f - f0
                h[en_juego] = ((a[f0, c0] * (1 - tc) + a[f0, c0 + 1] * tc) * (1 - tf)
                               + (a[f0 + 1, c0] * (1 - tc) + a[f0 + 1, c0 + 1] * tc) * tf
                               + meta["H_base"])
        fuera = ~en_juego
        if fuera.any():
            h[fuera] = self.mdt(e[fuera], n[fuera])
        validos = ~np.isnan(h)
        if not validos.any():
            return h, None
        usa_juego, usa_mdt = (en_juego & validos).any(), (fuera & validos).any()
        fuente = "mixta" if usa_juego and usa_mdt else ("lidar_juego" if usa_juego else "mdt05")
        return h, fuente


def puntos_dentro(g, paso: float):
    """Rejilla de puntos de paso m dentro de la geometría (al menos el punto representativo)."""
    x0, y0, x1, y1 = g.bounds
    xs = np.arange(x0 + paso / 2, x1, paso)
    ys = np.arange(y0 + paso / 2, y1, paso)
    if len(xs) and len(ys):
        E, N = np.meshgrid(xs, ys)
        E, N = E.ravel(), N.ravel()
        dentro = contains_xy(g, E, N)
        if dentro.sum() >= 3:
            return E[dentro], N[dentro]
    p = g.representative_point()
    return np.array([p.x]), np.array([p.y])


def relieve_parcela(g, relieve: Relieve, paso: float) -> dict | None:
    E, N = puntos_dentro(g, paso)
    h, fuente = relieve.altura(E, N)
    ok = ~np.isnan(h)
    if fuente is None or ok.sum() == 0:
        return None
    E, N, h = E[ok], N[ok], h[ok]
    res = {"media": round(float(h.mean()), 2), "min": round(float(h.min()), 2),
           "max": round(float(h.max()), 2), "fuente": fuente,
           "cobertura": round(float(ok.mean()), 3)}
    if len(h) >= 6:
        # plano h = a·E + b·N + c (con E, N centrados): pendiente y hacia dónde baja
        A = np.column_stack([E - E.mean(), N - N.mean(), np.ones_like(E)])
        (a, b, _), *_ = np.linalg.lstsq(A, h, rcond=None)
        res["pendiente_pct"] = round(float(math.hypot(a, b) * 100), 2)
        # rumbo (0 = norte, 90 = este) de la dirección en que baja el terreno
        res["baja_hacia_grados"] = round(float(math.degrees(math.atan2(-a, -b)) % 360), 1)
    return res


# ------------------------------------------------------------------------------ Geometría
def anillos_locales(g, origin) -> list[list[list[list[float]]]]:
    """[[exterior, agujero…] por parte], cada anillo [[x, z], …] en coordenadas locales, sin repetir
    el primer vértice al final. Exteriores en sentido antihorario visto desde arriba (+Y)."""
    partes = []
    for p in (g.geoms if isinstance(g, MultiPolygon) else [g]):
        if p.is_empty:
            continue
        anillos = []
        for i, anillo in enumerate([p.exterior, *p.interiors]):
            coords = np.asarray(anillo.coords)[:-1]
            x, z = utm_a_local(origin, coords[:, 0], coords[:, 1])
            pts = np.column_stack([x, z])
            # En x-z con norte = −Z el giro se invierte respecto a E-N: se normaliza aquí
            area2 = float(np.sum(pts[:, 0] * np.roll(pts[:, 1], -1) - np.roll(pts[:, 0], -1) * pts[:, 1]))
            exterior_ccw = area2 < 0       # antihorario visto desde +Y equivale a área negativa en (x, z)
            if (i == 0) != exterior_ccw:
                pts = pts[::-1]
            anillos.append(np.round(pts, 2).tolist())
        partes.append(anillos)
    return partes


def rumbo_labor(g) -> float:
    """Rumbo (0–180°, 0 = norte) del eje largo del rectángulo mínimo que envuelve la parcela."""
    r = g.minimum_rotated_rectangle
    if r.geom_type != "Polygon":
        return 0.0
    c = np.asarray(r.exterior.coords)
    lados = [c[1] - c[0], c[2] - c[1]]
    largo = max(lados, key=lambda v: math.hypot(*v))
    return round(math.degrees(math.atan2(largo[0], largo[1])) % 180, 1)


# ------------------------------------------------------------------------------ Vistas
def fuente_letra(tam: int):
    for nombre in ("DejaVuSans-Bold.ttf", "arialbd.ttf", "DejaVuSans.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(nombre, tam)
        except OSError:
            continue
    return ImageFont.load_default(size=tam)


def texto_con_borde(draw, xy, texto, tam, color=(255, 255, 255), borde=(0, 0, 0), centro=True):
    f = fuente_letra(tam)
    if centro:
        x0, y0, x1, y1 = draw.textbbox((0, 0), texto, font=f)
        xy = (xy[0] - (x1 - x0) / 2, xy[1] - (y1 - y0) / 2 - y0)
    draw.text(xy, texto, font=f, fill=color, stroke_width=max(1, tam // 7), stroke_fill=borde)


class Lienzo:
    """Imagen georreferenciada (E, N → píxel) para dibujar las vistas."""

    def __init__(self, imagen: Image.Image, e0, n1, px_m):
        self.img = imagen.convert("RGB")
        self.e0, self.n1, self.px_m = e0, n1, px_m
        self.capa = Image.new("RGBA", self.img.size, (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.capa)

    def px(self, e, n):
        return ((e - self.e0) * self.px_m, (self.n1 - n) * self.px_m)

    def poligono(self, g, borde, ancho=1, relleno=None):
        for p in (g.geoms if hasattr(g, "geoms") else [g]):
            if p.is_empty or p.geom_type != "Polygon":
                continue
            ext = [self.px(x, y) for x, y in p.exterior.coords]
            if relleno is not None:
                self.d.polygon(ext, fill=relleno)
                for hueco in p.interiors:
                    self.d.polygon([self.px(x, y) for x, y in hueco.coords], fill=(0, 0, 0, 0))
            self.d.line(ext, fill=borde, width=ancho, joint="curve")
            for hueco in p.interiors:
                self.d.line([self.px(x, y) for x, y in hueco.coords], fill=borde, width=ancho)

    def final(self) -> Image.Image:
        return Image.alpha_composite(self.img.convert("RGBA"), self.capa).convert("RGB")


def mosaico_orto(config, A, caja, processed) -> tuple[Image.Image, float]:
    """Ortofoto PNOA de la caja (E0, N0, E1, N1) a orto_px_m, por bloques cacheados de 02_ortho."""
    px_m = float(A.get("orto_px_m", 1.0))
    url = config.get("ortho_wms_url", "https://www.ign.es/wms-inspire/pnoa-ma")
    capa, max_w, max_h = ortho.capacidades(url, processed / "pnoa_capabilities.xml")
    cache_dir = processed / "orto_wms"
    cache_dir.mkdir(exist_ok=True)
    e0, n0, e1, n1 = caja
    ancho_px, alto_px = round((e1 - e0) * px_m), round((n1 - n0) * px_m)
    nx, ny = -(-ancho_px // max_w), -(-alto_px // max_h)
    bw, bh = -(-ancho_px // nx), -(-alto_px // ny)
    imagen = np.zeros((alto_px, ancho_px, 3), dtype=np.uint8)
    for j in range(ny):
        for i in range(nx):
            c0, r0 = i * bw, j * bh
            w, h = min(bw, ancho_px - c0), min(bh, alto_px - r0)
            bbox = (e0 + c0 / px_m, n1 - (r0 + h) / px_m, e0 + (c0 + w) / px_m, n1 - r0 / px_m)
            imagen[r0:r0 + h, c0:c0 + w] = ortho.descarga_bloque(url, capa, bbox, w, h, cache_dir)
        print(f"  ortofoto: fila de bloques {j + 1}/{ny}")
    return Image.fromarray(imagen), px_m


def leyenda(img: Image.Image, lineas: list[tuple[tuple, str]], titulo: str, tam=26) -> Image.Image:
    alto = 30 + tam * 2 + len(lineas) * int(tam * 1.4)
    panel = Image.new("RGB", (img.width, alto), (24, 24, 28))
    d = ImageDraw.Draw(panel)
    d.text((20, 14), titulo, font=fuente_letra(tam + 4), fill=(255, 255, 255))
    y = 24 + tam * 2
    columnas = 3 if img.width > 2400 else 2
    ancho_col = img.width // columnas
    for k, (color, texto) in enumerate(lineas):
        col, fila = k % columnas, k // columnas
        x, yy = 20 + col * ancho_col, y + fila * int(tam * 1.4)
        if color is not None:
            d.rectangle([x, yy + 4, x + tam, yy + tam], fill=color, outline=(255, 255, 255))
        d.text((x + tam + 12, yy), texto, font=fuente_letra(tam - 2), fill=(230, 230, 230))
    alto_real = y + (len(lineas) + columnas - 1) // columnas * int(tam * 1.4) + 16
    salida = Image.new("RGB", (img.width, img.height + alto_real), (24, 24, 28))
    salida.paste(img, (0, 0))
    salida.paste(panel.crop((0, 0, img.width, alto_real)), (0, img.height))
    return salida


def color_cota(t: np.ndarray) -> np.ndarray:
    """0 → azul, 0,5 → verde-amarillo, 1 → rojo (como la herramienta del vídeo 3)."""
    paradas = np.array([[40, 70, 200], [40, 170, 230], [70, 200, 90], [240, 220, 60], [230, 120, 40],
                        [200, 30, 30]], float)
    t = np.clip(t, 0, 1) * (len(paradas) - 1)
    i = np.clip(np.floor(t).astype(int), 0, len(paradas) - 2)
    f = (t - i)[..., None]
    return (paradas[i] * (1 - f) + paradas[i + 1] * f).astype(np.uint8)


# ------------------------------------------------------------------------------ Principal
def main() -> int:
    config = cargar_config()
    A = config.get("agricultura")
    if not A:
        falla("Falta el bloque «agricultura» en config.json.")
    origin = cargar_origin(config)
    processed, assets, previews = dir_processed(config), dir_assets(config), dir_previews(config)
    cache = processed / "agricultura"
    cache.mkdir(parents=True, exist_ok=True)
    (cache / "wfs").mkdir(exist_ok=True)
    previews.mkdir(parents=True, exist_ok=True)
    salida_dir = assets / "agricultura"
    salida_dir.mkdir(parents=True, exist_ok=True)
    mun = int(A["municipio"])
    filtro = f"CMUNICIPIO={mun}"

    print("Capas del Catastro, SIGPAC y regadío:")
    wfs = cache / "wfs"

    caja_t = [None]

    def catastro(clave: str, nombre_local: str):
        local = capa_local(config, nombre_local)
        return local if local is not None else wfs_capa(A, A[clave], wfs, filtro, caja_t[0])

    caja_t[0] = A.get("caja_busqueda", [540000, 4640000, 700000, 4790000])   # Navarra entera
    f_termino = catastro("capa_termino", "CATASTPolMunicipio")
    if not f_termino:
        falla(f"El Catastro no devuelve el término con CMUNICIPIO={mun}.")
    termino = solo_poligonos(unary_union([geometria(f) for f in f_termino]))
    nombre_mun = f_termino[0]["properties"].get("MUNICIPIO", "?")
    print(f"  término: {nombre_mun}, {termino.area / 1e4:.1f} ha")
    caja_t[0] = termino.buffer(100).bounds
    f_rust = catastro("capa_parcelas", "CATASTPolParcelaRusti")
    f_mixt = catastro("capa_mixtas", "CATASTPolParcelaMixta")
    f_vias = catastro("capa_caminos", "CATASTPolParcelaVia")
    f_pols = catastro("capa_poligonos", "CATASTPolPoligono")
    f_casco = catastro("capa_casco", "CATASTPolCascoUrbano")
    f_sig = wfs_capa(A, A["capa_sigpac"], wfs, filtro, caja_t[0])
    f_reg = wfs_capa(A, A["capa_regadio"], wfs, None, termino.buffer(50).bounds)

    # ------------------------------------------------------------------ geometrías auxiliares
    recintos = [(geometria(f), f["properties"]) for f in f_sig]
    arbol_sig = STRtree([g for g, _ in recintos])
    regadio = [(solo_poligonos(geometria(f)), f["properties"]) for f in f_reg]
    regadio = [(g, p) for g, p in regadio if g.intersects(termino)]
    arbol_reg = STRtree([g for g, _ in regadio]) if regadio else None
    zona = box(origin["E_min"], origin["N_min"], origin["E_max"], origin["N_max"])
    relieve = Relieve(config, origin, assets, processed, termino.bounds,
                      bool(A.get("descargar_mdt_que_falte", False)))
    paso_mdt = float(A.get("mdt_paso_muestreo_m", 2.0))
    entrada_max = float(A.get("entrada_max_m", 3.0))
    duda_area = float(A.get("duda_area_rel", 0.02))
    duda_sig = float(A.get("duda_sigpac_rel", 0.10))
    sig_por_ref = defaultdict(list)
    for g, p in recintos:
        sig_por_ref[(p.get("POLIGONO"), p.get("PARCELA"))].append(g)

    # ------------------------------------------------------------------ caminos (para las entradas)
    # El Catastro rústico no dibuja casi ningún camino como parcela: los caminos son los huecos
    # entre parcelas. Se juntan esos huecos (solo los de entrada_ancho_min_m o más, con una apertura
    # morfológica), los viales del SIGPAC (CA), las parcelas de vía y el casco urbano.
    elementos = [(f, "rustica") for f in f_rust] + [(f, "mixta") for f in f_mixt]
    ocupado = unary_union([solo_poligonos(geometria(f)) for f, _ in elementos])
    r_ap = float(A.get("entrada_ancho_min_m", 2.5)) / 2
    huecos = termino.buffer(5).difference(ocupado).buffer(-r_ap).buffer(r_ap * 1.05)
    trozos_camino = [huecos]
    trozos_camino += [g for g, ps in recintos if ps.get("IDUSO26") == "CA"]
    trozos_camino += [solo_poligonos(geometria(f)) for f in f_vias + f_casco]
    caminos = unary_union(trozos_camino)
    piezas_camino = [c for c in (caminos.geoms if hasattr(caminos, "geoms") else [caminos]) if not c.is_empty]
    arbol_cam = STRtree(piezas_camino)
    print(f"  caminos y accesos: {caminos.area / 1e4:.1f} ha en {len(piezas_camino)} piezas")

    # ------------------------------------------------------------------ parcelas
    print("Parcelas:")
    parcelas, geoms = [], {}
    vistas = set()
    for k, (f, tipo) in enumerate(elementos):
        p = f["properties"]
        pol, par = int(p["POLIGONO"]), int(p["PARCELA"])
        ref = f"{pol}-{par}"
        dudas = []
        g0 = shape(f["geometry"])
        g = solo_poligonos(geometria(f))
        if not g0.is_valid:
            dudas.append("contorno del Catastro no válido (se ha reparado automáticamente)")
        if g.is_empty:
            print(f"  {ref}: sin superficie, se omite")
            continue
        if ref in vistas:
            ref = f"{ref}#{k}"
            dudas.append("referencia repetida en el Catastro")
        vistas.add(ref)
        area = g.area
        if p.get("GEOM_AREA") and abs(area - p["GEOM_AREA"]) / max(area, 1) > duda_area:
            dudas.append(f"superficie calculada {area:.0f} m² y la del Catastro {p['GEOM_AREA']:.0f} m²")
        if isinstance(g, MultiPolygon) and len(g.geoms) > 1:
            dudas.append(f"parcela en {len(g.geoms)} trozos separados")

        # SIGPAC: usos por superficie dentro de la parcela
        usos = defaultdict(float)
        explot = defaultdict(float)
        pend_sum = pend_area = 0.0
        for i in arbol_sig.query(g):
            gs, ps = recintos[i]
            inter = g.intersection(gs).area
            if inter < 1:
                continue
            usos[ps.get("IDUSO26") or "?"] += inter
            explot[(ps.get("TIPOEXPLOT") or "?").lower()] += inter
            if ps.get("PENDIENTE") is not None:
                pend_sum += ps["PENDIENTE"] * inter
                pend_area += inter
        cubierto = sum(usos.values())
        sigpac = None
        if cubierto > 0:
            uso_principal = max(usos, key=usos.get)
            propios = sig_por_ref.get((pol, par), [])
            coincidencia = None
            if propios:
                u = unary_union(propios)
                coincidencia = round(1 - g.symmetric_difference(u).area / max(area, 1), 3)
                if coincidencia < 1 - duda_sig:
                    dudas.append(f"el SIGPAC dibuja la parcela distinta del Catastro "
                                 f"(coinciden en un {coincidencia * 100:.0f} %)")
            else:
                dudas.append("el SIGPAC no tiene recintos con esta referencia")
            sigpac = {
                "uso": uso_principal,
                "usos": {u: round(a / area, 3) for u, a in sorted(usos.items(), key=lambda t: -t[1])},
                "cultivable_m2": round(sum(a for u, a in usos.items() if u in USOS_CULTIVO), 1),
                "pendiente_sigpac_pct": round(pend_sum / pend_area / 10, 2) if pend_area else None,
                "explotacion": max(explot, key=explot.get),
                "coincidencia": coincidencia,
            }
        else:
            dudas.append("sin recintos SIGPAC encima")

        # Regadío
        reg = None
        if arbol_reg is not None:
            area_reg, colectivos = 0.0, defaultdict(float)
            for i in arbol_reg.query(g):
                gr, pr = regadio[i]
                inter = g.intersection(gr).area
                if inter >= 1:
                    area_reg += inter
                    colectivos[pr.get("COLECTIVOR") or "?"] += inter
            if area_reg > 0:
                reg = {"fraccion": round(min(area_reg / area, 1.0), 3),
                       "colectivo": max(colectivos, key=colectivos.get)}

        # Relieve
        cota = relieve_parcela(g, relieve, paso_mdt)
        if cota is None:
            dudas.append("sin relieve (fuera de la zona del juego y de la caché del MDT05)")
        elif cota["cobertura"] < 0.99:
            dudas.append(f"relieve incompleto (solo en el {cota['cobertura'] * 100:.0f} % de la parcela)")

        # Entrada desde un camino del Catastro
        entrada = None
        cerca = [piezas_camino[i] for i in arbol_cam.query(g.buffer(entrada_max))]
        if cerca:
            zona_cam = unary_union(cerca).buffer(entrada_max)
            frente = g.boundary.intersection(zona_cam)
            if frente.geom_type == "MultiLineString":
                frente = linemerge(frente)
            lineas_f = [l for l in getattr(frente, "geoms", [frente])
                        if l.geom_type == "LineString" and l.length > 0.5]
            if lineas_f:
                larga = max(lineas_f, key=lambda l: l.length)
                pe = larga.interpolate(0.5, normalized=True)
                x, z = utm_a_local(origin, pe.x, pe.y)
                entrada = {"x": round(float(x), 2), "z": round(float(z), 2),
                           "frente_m": round(sum(l.length for l in lineas_f), 1)}
        if entrada is None:
            dudas.append("sin camino junto a la parcela (se entra por otra parcela o falta el camino)")

        # Zona del juego
        if zona.contains(g):
            en_zona = "dentro"
        elif zona.intersects(g):
            en_zona = "parcial"
        else:
            en_zona = "fuera"

        c = g.representative_point()
        cx, cz = utm_a_local(origin, c.x, c.y)
        b = g.bounds
        bx0, bz1 = utm_a_local(origin, b[0], b[1])
        bx1, bz0 = utm_a_local(origin, b[2], b[3])
        parcelas.append({
            "ref": ref, "poligono": pol, "parcela": par, "tipo": tipo,
            "paraje": (p.get("PARAJE") or "").strip() or None,
            "superficie_m2": round(area, 1), "superficie_ha": round(area / 1e4, 4),
            "perimetro_m": round(g.length, 1),
            "centro": [round(float(cx), 2), round(float(cz), 2)],
            "caja": [round(float(bx0), 2), round(float(bz0), 2), round(float(bx1), 2), round(float(bz1), 2)],
            "cota": cota, "labor_grados": rumbo_labor(g), "entrada": entrada,
            "sigpac": sigpac, "regadio": reg, "zona_juego": en_zona,
            "catastro": {"idcatastro": p.get("IDCATASTRO"), "url": p.get("URL"), "alta": p.get("BEGINLIFE")},
            "dudas": dudas,
            "partes": anillos_locales(g, origin),
        })
        geoms[ref] = g
        if (k + 1) % 250 == 0:
            print(f"  {k + 1}/{len(elementos)}")
    parcelas.sort(key=lambda q: (q["poligono"], q["parcela"], q["ref"]))
    print(f"  {len(parcelas)} parcelas ({sum(q['tipo'] == 'mixta' for q in parcelas)} mixtas)")

    # ------------------------------------------------------------------ parcelas.json y CSV
    poligonos = []
    for f in f_pols:
        gp = solo_poligonos(geometria(f))
        num = f["properties"].get("POLIGONO")
        poligonos.append({"poligono": int(num) if num is not None else None,
                          "partes": anillos_locales(gp, origin)})
    poligonos.sort(key=lambda q: q["poligono"] or 0)
    fechas = sorted({f["properties"].get("BEGINLIFE") for f in f_rust if f["properties"].get("BEGINLIFE")})
    datos = {
        "version": 1,
        "municipio": nombre_mun,
        "convencion": origin["convencion"],
        "origen": {k: origin[k] for k in ("E_centro", "N_centro", "H_base", "crs")},
        "fuentes": {
            "catastro": f"Catastro de Navarra, WFS {A['wfs_url']} ({A['capa_parcelas']}, {A['capa_mixtas']}, {A['capa_caminos']})",
            "sigpac": f"SIGPAC de Navarra, WFS {A['wfs_url']} ({A['capa_sigpac']})",
            "regadio": f"Regadío de Navarra, WFS {A['wfs_url']} ({A['capa_regadio']})",
            "relieve": "terreno del juego (LiDAR del Gobierno de Navarra, 1 m) y MDT05 del IGN fuera de la zona",
            "atribucion": "© Gobierno de Navarra (Catastro, SIGPAC, regadío, LiDAR); MDT05 cedido por © IGN",
        },
        "fechas_catastro": [fechas[0], fechas[-1]] if fechas else None,
        "notas": {
            "partes": "[[exterior, agujero…] por trozo]; anillos [[x, z], …] locales, sin repetir el primer vértice",
            "labor_grados": "rumbo del eje largo (0 = norte, 90 = este)",
            "baja_hacia_grados": "rumbo hacia el que baja el plano ajustado al relieve",
            "pendiente_sigpac_pct": "PENDIENTE de los recintos SIGPAC (décimas de %) / 10, ponderada por superficie",
            "entrada": "punto del contorno junto a un camino: vial SIGPAC (CA), parcela de vía del Catastro, casco urbano o hueco entre parcelas de al menos entrada_ancho_min_m",
            "zona_juego": "dentro | parcial | fuera de la zona con terreno y ortofoto del juego",
        },
        "termino": anillos_locales(termino, origin),
        "poligonos": poligonos,
        "parcelas": parcelas,
    }
    ruta_json = salida_dir / "parcelas.json"
    ruta_json.write_text(json.dumps(datos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"→ {ruta_json} ({ruta_json.stat().st_size / 1e6:.2f} MB)")

    ruta_csv = cache / "parcelas.csv"
    with ruta_csv.open("w", newline="", encoding="utf-8-sig") as fcsv:
        w = csv.writer(fcsv, delimiter=";")
        w.writerow(["referencia", "polígono", "parcela", "tipo", "paraje", "superficie_ha", "uso_sigpac",
                    "cultivable_ha", "regadío_%", "comunidad_regantes", "cota_media_m", "pendiente_%",
                    "zona_juego", "frente_a_camino_m", "dudas"])
        for q in parcelas:
            s, r, c = q["sigpac"] or {}, q["regadio"] or {}, q["cota"] or {}
            w.writerow([q["ref"], q["poligono"], q["parcela"], q["tipo"], q["paraje"] or "",
                        f"{q['superficie_ha']:.4f}".replace(".", ","), s.get("uso", ""),
                        f"{s.get('cultivable_m2', 0) / 1e4:.4f}".replace(".", ","),
                        round(r.get("fraccion", 0) * 100), r.get("colectivo", ""),
                        str(c.get("media", "")).replace(".", ","), str(c.get("pendiente_pct", "")).replace(".", ","),
                        q["zona_juego"], str((q["entrada"] or {}).get("frente_m", "")).replace(".", ","), " | ".join(q["dudas"])])
    print(f"→ {ruta_csv}")

    # ------------------------------------------------------------------ vistas
    print("Vistas:")
    margen = 60.0
    e0, n0, e1, n1 = termino.bounds
    caja = (math.floor(e0 - margen), math.floor(n0 - margen), math.ceil(e1 + margen), math.ceil(n1 + margen))
    orto_img, px_m = mosaico_orto(config, A, caja, processed)
    geom_pol = {pp["poligono"]: solo_poligonos(geometria(f)) for pp, f in
                zip([{"poligono": int(f["properties"]["POLIGONO"])} for f in f_pols], f_pols)}

    def color_parcela(q):
        uso = (q["sigpac"] or {}).get("uso")
        return COLOR_USO.get(uso, (180, 180, 180))

    # 1) Término entero, color por uso
    escala = float(A.get("vista_general_px_m", 0.35))
    peq = orto_img.resize((round(orto_img.width * escala / px_m), round(orto_img.height * escala / px_m)),
                          Image.LANCZOS)
    L = Lienzo(peq, caja[0], caja[3], escala)
    for q in parcelas:
        col = color_parcela(q)
        L.poligono(geoms[q["ref"]], borde=col + (255,), ancho=1, relleno=col + (70,))
    for num, gp in geom_pol.items():
        L.poligono(gp, borde=(255, 255, 255, 255), ancho=3)
    L.poligono(termino, borde=(255, 40, 40, 255), ancho=5)
    L.poligono(zona, borde=(0, 230, 255, 255), ancho=4)
    for num, gp in geom_pol.items():
        pr = gp.representative_point()
        texto_con_borde(L.d, L.px(pr.x, pr.y), f"Pol. {num}", 44)
    zx, zy = L.px(origin["E_min"], origin["N_max"])
    texto_con_borde(L.d, (zx + 8, zy + 8), "zona del juego", 30, color=(0, 230, 255), centro=False)
    usos_vistos = defaultdict(float)
    for q in parcelas:
        if q["sigpac"]:
            usos_vistos[q["sigpac"]["uso"]] += q["superficie_ha"]
    lineas = [(COLOR_USO.get(u, (180, 180, 180)), f"{u} {NOMBRE_USO.get(u, '')} · {ha:.0f} ha")
              for u, ha in sorted(usos_vistos.items(), key=lambda t: -t[1])]
    lineas += [((255, 40, 40), "límite del término"), ((255, 255, 255), "polígonos catastrales"),
               ((0, 230, 255), "zona con terreno del juego (1 500 × 1 400 m)")]
    total_ha = sum(q["superficie_ha"] for q in parcelas)
    img = leyenda(L.final(), lineas, f"{nombre_mun}: {len(parcelas)} parcelas rústicas, {total_ha:.0f} ha "
                                     f"(color = uso SIGPAC principal)")
    img.save(previews / "parcelas.jpg", quality=88)
    print(f"→ {previews / 'parcelas.jpg'}")

    # 2) Cotas: relieve en color con sombreado, enmascarado al término. Dos escalas: el término
    #    entero (los cerros mandan) y la vega de regadío (donde está casi todo lo que se riega)
    paso_c = 1 / escala
    xs = caja[0] + (np.arange(peq.width) + 0.5) * paso_c
    ys = caja[3] - (np.arange(peq.height) + 0.5) * paso_c
    E, N = np.meshgrid(xs, ys)
    h, _ = relieve.altura(E.ravel(), N.ravel())
    h = h.reshape(E.shape)
    dentro_t = contains_xy(termino, E, N)
    validas = dentro_t & ~np.isnan(h)
    riego = [geoms[q["ref"]] for q in parcelas if q["regadio"] and q["regadio"]["fraccion"] > 0.5]
    en_riego = contains_xy(unary_union(riego), E, N) & validas if riego else np.zeros_like(validas)

    def vista_cotas(nombre, lo, hi, titulo):
        hh = np.where(np.isnan(h), np.nanmean(h[validas]), h)
        gy, gx = np.gradient(hh, paso_c)
        som = np.clip(0.75 + (-gx * 0.6 + gy * 0.6) * 2.5, 0.35, 1.25)[..., None]
        col = color_cota((hh - lo) / max(hi - lo, 0.1)).astype(float) * som
        base = np.asarray(peq.convert("L").convert("RGB"), float) * 0.45
        rgb = np.where(validas[..., None], np.clip(col, 0, 255), base)
        L = Lienzo(Image.fromarray(rgb.astype(np.uint8)), caja[0], caja[3], escala)
        for q in parcelas:
            L.poligono(geoms[q["ref"]], borde=(0, 0, 0, 110), ancho=1)
        L.poligono(termino, borde=(255, 255, 255, 255), ancho=4)
        L.poligono(zona, borde=(255, 255, 255, 255), ancho=3)
        pasos = 6
        lineas = [(tuple(int(v) for v in color_cota(np.array([i / (pasos - 1)]))[0]),
                   f"{lo + (hi - lo) * i / (pasos - 1):.1f} m") for i in range(pasos)]
        if (dentro_t & np.isnan(h)).any():
            lineas.append(((60, 60, 60), "sin relieve"))
        img = leyenda(L.final(), lineas, titulo)
        img.save(previews / nombre, quality=88)
        print(f"→ {previews / nombre}")

    if validas.any():
        lo, hi = np.percentile(h[validas], [2, 98])
        vista_cotas("parcelas_cotas.jpg", lo, hi, "Cotas del término (rojo alto, azul bajo) con sombreado")
        if en_riego.any():
            lo, hi = np.percentile(h[en_riego], [2, 98])
            vista_cotas("parcelas_cotas_vega.jpg", lo, hi,
                        "Cotas con la escala de la vega de regadío (lo que pasa de la escala sale rojo)")

    # 3) Hojas: zona del juego y una por polígono, con el número de cada parcela
    def hoja(nombre, caja_h, filtro_q, etiqueta, titulo):
        x0 = round((caja_h[0] - caja[0]) * px_m)
        y0 = round((caja[3] - caja_h[3]) * px_m)
        x1 = round((caja_h[2] - caja[0]) * px_m)
        y1 = round((caja[3] - caja_h[1]) * px_m)
        recorte = orto_img.crop((x0, y0, x1, y1))
        lado = max(recorte.size)
        objetivo = int(A.get("hoja_px", 3000))
        f_esc = max(1.0, objetivo / lado)
        recorte = recorte.resize((round(recorte.width * f_esc), round(recorte.height * f_esc)), Image.LANCZOS)
        esc = px_m * f_esc
        L = Lienzo(recorte, caja[0] + x0 / px_m, caja[3] - y0 / px_m, esc)
        sel = [q for q in parcelas if filtro_q(q)]
        for q in sel:
            duda = bool(q["dudas"]) and any("SIGPAC dibuja" in d or "no válido" in d or "superficie calculada" in d
                                            for d in q["dudas"])
            L.poligono(geoms[q["ref"]], borde=(255, 120, 0, 255) if duda else (255, 255, 0, 255), ancho=2)
        for q in sel:
            gq = geoms[q["ref"]]
            # tamaño de letra según el tamaño de la parcela en la imagen
            ancho_px_q = math.sqrt(gq.area) * esc
            tam = int(np.clip(ancho_px_q * 0.28, 11, 40))
            pr = gq.representative_point()
            texto_con_borde(L.d, L.px(pr.x, pr.y), etiqueta(q), tam)
            if q["entrada"]:
                ex = q["entrada"]["x"] + origin["E_centro"]
                en = -q["entrada"]["z"] + origin["N_centro"]
                px, py = L.px(ex, en)
                L.d.ellipse([px - 4, py - 4, px + 4, py + 4], fill=(0, 230, 255, 255))
        L.poligono(zona, borde=(0, 230, 255, 255), ancho=3)
        lineas = [((255, 255, 0), "parcela (número = parcela catastral)"),
                  ((255, 120, 0), "duda: Catastro y SIGPAC no casan o contorno raro"),
                  ((0, 230, 255), "entrada (punto) · zona del juego (rectángulo)")]
        img = leyenda(L.final(), lineas, titulo, tam=24)
        img.save(previews / nombre, quality=88)
        return len(sel)

    n_z = hoja("parcelas_zona_juego.jpg", (origin["E_min"], origin["N_min"], origin["E_max"], origin["N_max"]),
               lambda q: q["zona_juego"] != "fuera", lambda q: q["ref"],
               "Zona del juego: parcelas con referencia polígono-parcela")
    print(f"→ {previews / 'parcelas_zona_juego.jpg'} ({n_z} parcelas)")
    for num, gp in sorted(geom_pol.items()):
        b = gp.buffer(40).bounds
        n_p = hoja(f"parcelas_pol_{num:02d}.jpg", b, lambda q, num=num: q["poligono"] == num,
                   lambda q: str(q["parcela"]),
                   f"Polígono {num}: {sum(q['poligono'] == num for q in parcelas)} parcelas, "
                   f"{sum(q['superficie_ha'] for q in parcelas if q['poligono'] == num):.0f} ha")
        print(f"→ {previews / f'parcelas_pol_{num:02d}.jpg'} ({n_p} parcelas)")

    # ------------------------------------------------------------------ resumen
    print("\nResumen:")
    print(f"  parcelas: {len(parcelas)}, {total_ha:.1f} ha (término {termino.area / 1e4:.1f} ha)")
    for z in ("dentro", "parcial", "fuera"):
        print(f"  zona del juego {z}: {sum(q['zona_juego'] == z for q in parcelas)}")
    print(f"  con regadío: {sum(1 for q in parcelas if q['regadio'] and q['regadio']['fraccion'] > 0.5)}")
    print(f"  sin relieve: {sum(1 for q in parcelas if q['cota'] is None)}")
    print(f"  sin camino junto a la parcela: {sum(1 for q in parcelas if q['entrada'] is None)}")
    tipos_duda = defaultdict(int)
    for q in parcelas:
        for d in q["dudas"]:
            tipos_duda[d.split(" (")[0].split(" a menos")[0][:60]] += 1
    for d, n in sorted(tipos_duda.items(), key=lambda t: -t[1]):
        print(f"  duda ×{n}: {d}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
