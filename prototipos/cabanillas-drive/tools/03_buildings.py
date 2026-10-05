"""Paso 1.3 — Edificios desde el Catastro con altura medida por LiDAR.

- Lee la capa de edificaciones (CATASTPolEdificacion / CATAST_Pol_Edificacion),
  la recorta a la zona y descarta polígonos de menos de 8 m².
- Por edificio: base_y = mínimo del MDT bajo la huella (local, − H_base);
  height = percentil 90 del MDS dentro de la huella − base (en llano equivale al p90
  del nDSM del PLAN; en pendiente deja el tejado a su cota real), limitado a
  [min, max] de config.json. Sin MDS → p90 del nDSM; sin LiDAR → building_height_default_m.
- Simplifica (0,3 m) y orienta los anillos: exterior CCW en el plano (x, z) tal
  como se guardan las coordenadas.

Salidas:
    <assets>/buildings.geojson (coordenadas locales [x, z]; propiedades id, base_y, height)
    <processed>/previews/alturas.png

Uso: conda run -n cabdrive python tools/03_buildings.py
"""
from __future__ import annotations

import json
import sys

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.windows import Window, from_bounds as ventana_de
from shapely.geometry import box, mapping
from shapely.geometry.polygon import orient
from shapely.ops import transform as transforma

from comun import busca_capa, cargar_config, cargar_origin, dir_assets, dir_previews, dir_processed, dir_raw
from previews import Lienzo, rampa, sombreado

CAPA = "CATASTPolEdificacion"
AREA_MIN_M2 = 8.0
TOLERANCIA_SIMPLIFICAR_M = 0.3
PERCENTIL_ALTURA = 90
DECIMALES = 2


def falla(mensaje: str) -> None:
    print(f"\nERROR: {mensaje}")
    sys.exit(1)


class Raster:
    """Ráster recortado en memoria con lectura de los píxeles bajo un polígono."""

    def __init__(self, ruta):
        with rasterio.open(ruta) as ds:
            self.datos = ds.read(1, masked=True).astype("float64").filled(np.nan)
            self.transform = ds.transform
            self.alto, self.ancho = ds.height, ds.width

    def bajo(self, poligono) -> np.ndarray:
        """Valores (sin NaN) de los píxeles cuyo centro cae dentro del polígono; si no
        hay ninguno (huella muy estrecha), los que toca."""
        v = ventana_de(*poligono.bounds, transform=self.transform)
        c0, r0 = max(int(np.floor(v.col_off)), 0), max(int(np.floor(v.row_off)), 0)
        c1 = min(int(np.ceil(v.col_off + v.width)), self.ancho)
        r1 = min(int(np.ceil(v.row_off + v.height)), self.alto)
        if c1 <= c0 or r1 <= r0:
            return np.array([])
        sub = self.datos[r0:r1, c0:c1]
        tr = rasterio.windows.transform(Window(c0, r0, c1 - c0, r1 - r0), self.transform)
        for todos in (False, True):
            dentro = geometry_mask([poligono], out_shape=sub.shape, transform=tr, invert=True, all_touched=todos)
            valores = sub[dentro]
            valores = valores[np.isfinite(valores)]
            if valores.size:
                return valores
        return np.array([])


def redondea(coords):
    if isinstance(coords, (float, int)):
        return round(coords, DECIMALES)
    return [redondea(c) for c in coords]


def poligonos(geom):
    """Partes poligonales de una geometría (el recorte puede dar colecciones)."""
    if geom.geom_type == "Polygon":
        return [geom]
    if hasattr(geom, "geoms"):
        return [p for g in geom.geoms for p in poligonos(g)]
    return []


def main() -> int:
    config = cargar_config()
    origin = cargar_origin(config)
    processed = dir_processed(config)
    dir_previews(config).mkdir(parents=True, exist_ok=True)
    h_min, h_max = float(config["building_height_min_m"]), float(config["building_height_max_m"])
    h_def = float(config["building_height_default_m"])

    encontrada = busca_capa(dir_raw(config) / "catastro", CAPA)
    if encontrada is None:
        falla(f"No se encuentra la capa {CAPA} en {dir_raw(config) / 'catastro'}.")
    ruta, capa = encontrada
    edificios = gpd.read_file(ruta, layer=capa)
    print(f"Catastro: {len(edificios)} edificaciones en {ruta}")
    if edificios.crs is None:
        falla("La capa de edificios no tiene CRS.")
    if edificios.crs.to_epsg() != 25830:
        print(f"  Reproyectando de {edificios.crs} a EPSG:25830")
        edificios = edificios.to_crs(25830)

    zona = box(origin["E_min"], origin["N_min"], origin["E_max"], origin["N_max"])
    edificios = edificios[edificios.intersects(zona)]
    partes = []
    for geom in edificios.geometry.make_valid().intersection(zona):
        partes.extend(poligonos(geom))
    areas = np.array([p.area for p in partes])
    pequenos = int((areas < AREA_MIN_M2).sum())
    partes = [p for p, a in zip(partes, areas) if a >= AREA_MIN_M2]
    print(f"  En la zona: {len(areas)} polígonos; descartados {pequenos} de menos de {AREA_MIN_M2:g} m² → {len(partes)}")

    mdt = Raster(processed / "mdt_clip.tif")
    ndsm = Raster(processed / "ndsm.tif")
    mds = Raster(processed / "mds_clip.tif")

    h_base, e_c, n_c = origin["H_base"], origin["E_centro"], origin["N_centro"]
    a_local = lambda x, y, z=None: (x - e_c, -(y - n_c))  # noqa: E731
    features = []
    sin_datos = recortados = 0
    alturas, bases, difs_techo = [], [], []
    for i, poligono in enumerate(partes, start=1):
        suelo = mdt.bajo(poligono)
        if not suelo.size:
            falla(f"Edificio {i}: no hay MDT bajo la huella (no debería pasar tras el relleno de 1.1).")
        base = float(suelo.min())

        # Tejado = p90 del MDS dentro de la huella. Se mide desde base_y (el punto más bajo
        # del suelo) para que en pendiente el tejado quede a su cota real; en llano equivale
        # al p90 del nDSM del PLAN, que queda como respaldo si falta el MDS.
        techo = mds.bajo(poligono)
        sobre = ndsm.bajo(poligono)
        if techo.size:
            altura = float(np.percentile(techo, PERCENTIL_ALTURA)) - base
            if sobre.size:
                difs_techo.append(altura - float(np.percentile(sobre, PERCENTIL_ALTURA)))
        elif sobre.size:
            altura = float(np.percentile(sobre, PERCENTIL_ALTURA))
        else:
            altura = None
        if altura is None:
            altura = h_def
            sin_datos += 1
        else:
            if altura < h_min or altura > h_max:
                recortados += 1
            altura = min(max(altura, h_min), h_max)

        simple = poligono.simplify(TOLERANCIA_SIMPLIFICAR_M, preserve_topology=True)
        if simple.is_empty or not simple.is_valid or simple.area < AREA_MIN_M2 / 2:
            simple = poligono
        local = orient(transforma(a_local, simple), sign=1.0)
        features.append({
            "type": "Feature",
            "properties": {"id": i, "base_y": round(base - h_base, DECIMALES), "height": round(altura, DECIMALES)},
            "geometry": {"type": "Polygon", "coordinates": redondea(mapping(local)["coordinates"])},
        })
        alturas.append(altura)
        bases.append(base - h_base)

    salida = {
        "type": "FeatureCollection",
        "sistema": "local Cabanillas Drive: [x, z] en metros, x = E − E_centro, z = −(N − N_centro); "
                   "anillo exterior CCW en el plano (x, z); base_y y height en metros (y = altura − H_base)",
        "fuente": "Catastro de Navarra (edificaciones) + LiDAR Gobierno de Navarra (alturas)",
        "features": features,
    }
    ruta_salida = dir_assets(config) / "buildings.geojson"
    ruta_salida.write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    alturas, bases, difs = np.array(alturas), np.array(bases), np.array(difs_techo)
    print(f"Alturas: p10 {np.percentile(alturas, 10):.1f} · mediana {np.median(alturas):.1f} · "
          f"p90 {np.percentile(alturas, 90):.1f} · máx {alturas.max():.1f} m")
    print(f"  Limitadas a [{h_min:g}, {h_max:g}] m: {recortados} · sin LiDAR válido (altura {h_def:g} m): {sin_datos}")
    print(f"base_y: {bases.min():.2f} – {bases.max():.2f} m")
    print(f"Altura por MDS frente a p90 del nDSM: {(np.abs(difs) > 1).sum()} edificios ganan más de 1 m "
          f"(máx {np.abs(difs).max():.1f} m): son huellas en pendiente")

    # --- Vista previa: relieve en gris + huellas coloreadas por altura
    lienzo = Lienzo(origin, 2, fondo=sombreado(dir_assets(config) / "terrain"))
    paradas = [0.0, 0.25, 0.5, 0.75, 1.0]
    colores = [(49, 104, 196), (46, 170, 120), (238, 212, 60), (240, 130, 40), (210, 40, 40)]
    escala = lambda h: rampa((h - 3) / 15, paradas, colores)  # noqa: E731  # 3 m → azul, 18 m → rojo
    for f in features:
        lienzo.geometria(f["geometry"], relleno=escala(f["properties"]["height"]), borde=(15, 15, 15), ancho=1)
    lienzo.rotulo([f"Edificios: {len(features)} · altura = p{PERCENTIL_ALTURA} del MDS - base", "Norte arriba · 2 px/m"],
                  leyenda=[(f"{h} m", escala(h)) for h in (3, 6, 9, 12, 15, 18)])
    lienzo.guarda(dir_previews(config) / "alturas.png")

    tam = ruta_salida.stat().st_size / 1_048_576
    print(f"\nSalidas:\n  {ruta_salida} ({len(features)} edificios, {tam:.1f} MB)\n  {dir_previews(config) / 'alturas.png'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
