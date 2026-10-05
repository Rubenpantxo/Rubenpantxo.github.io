"""Paso 1.3 — Edificios desde el Catastro con altura medida por LiDAR.

- Lee la capa de edificaciones (CATASTPolEdificacion / CATAST_Pol_Edificacion),
  la recorta a la zona y descarta polígonos de menos de 8 m².
- Clasifica cada polígono con los rótulos de CATAST_Txt_EdifAlturas: número de plantas
  (I, II, III…), porches/tejavanas (P, T) y construcciones singulares (RELIGIOSO,
  FRONTON…). Los que no son edificios (patios PAV, jardines J, solares SUELO,
  piscinas…) se descartan: la ortofoto ya los muestra a ras de suelo.
- Por edificio: base_y = mínimo del MDT bajo la huella (local, − H_base);
  height = percentil 90 del MDS dentro de la huella − base (en llano equivale al p90
  del nDSM del PLAN; en pendiente deja el tejado a su cota real), limitado a
  [min, max] de config.json. Sin MDS → p90 del nDSM; sin LiDAR → building_height_default_m.
- Simplifica (0,3 m) y orienta los anillos: exterior CCW en el plano (x, z) tal
  como se guardan las coordenadas.
- Marca las medianeras: lados del anillo exterior pegados a otro edificio (sin ventanas).

Salidas:
    <assets>/buildings.geojson (coordenadas locales [x, z]; propiedades id, base_y, height,
        tipo, plantas, medianeras = índices de los lados del anillo exterior)
    <processed>/previews/alturas.png

Uso: conda run -n cabdrive python tools/03_buildings.py
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.windows import Window, from_bounds as ventana_de
from shapely import STRtree
from shapely.geometry import Point, Polygon, box, mapping
from shapely.geometry.polygon import orient
from shapely.ops import transform as transforma

from comun import busca_capa, cargar_config, cargar_origin, dir_assets, dir_previews, dir_processed, dir_raw
from previews import Lienzo, rampa, sombreado

CAPA = "CATASTPolEdificacion"
CAPA_ROTULOS = "CATASTTxtEdifAlturas"
AREA_MIN_M2 = 8.0
TOLERANCIA_SIMPLIFICAR_M = 0.3
PERCENTIL_ALTURA = 90
DECIMALES = 2
DIST_MEDIANERA_M = 0.5
ALTURA_PLANTA_M = 3.0

ROMANOS = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8}
# Rótulos de superficies que no son edificios: no se extruyen
NO_EDIFICIO = {"PAV": "patio", "J": "jardin", "SUELO": "solar", "PISCINA": "piscina", "PARQUE": "parque",
               "ESTANQUE": "estanque", "CEMENTERIO": "cementerio", "INSTALACION DEPORTIVA": "deportivo",
               "BASCULA": "bascula"}
SINGULARES = {"RELIGIOSO": "religioso", "FRONTON": "fronton", "DEPOSITO": "deposito", "SILOS": "silos",
              "RUINAS": "ruinas"}


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


def interpreta_rotulos(rotulos: list[str]) -> tuple[str, int]:
    """(tipo, plantas sobre rasante) a partir de los rótulos del Catastro de un polígono.
    tipo ∈ edificio, cobertizo, singulares… o un tipo de NO_EDIFICIO si no se extruye."""
    plantas, cubierto, singular, suelo = 0, False, None, None
    for rotulo in rotulos:
        rotulo = rotulo.strip().upper()
        if rotulo in SINGULARES:
            singular = SINGULARES[rotulo]
            continue
        if rotulo in NO_EDIFICIO:
            suelo = NO_EDIFICIO[rotulo]
            continue
        for parte in rotulo.split("+"):
            m = re.fullmatch(r"(\d*)([A-Z]+)", parte.strip())
            if not m:
                continue
            codigo = m.group(2)
            if codigo in ROMANOS:
                plantas = max(plantas, ROMANOS[codigo])
            elif codigo in ("P", "T", "EM"):   # porche, tejavana/terraza, entreplanta
                cubierto = True
            elif codigo in NO_EDIFICIO and suelo is None:
                suelo = NO_EDIFICIO[codigo]
    if plantas:
        return "edificio", plantas
    if singular:
        return singular, 0
    if cubierto:
        return "cobertizo", 1
    if suelo:
        return suelo, 0
    if rotulos:            # solo sótanos (S, SS, PS…): nada sobre rasante
        return "sotano", 0
    return "edificio", 0   # sin rótulo: se deduce de la altura


def main() -> int:
    config = cargar_config()
    origin = cargar_origin(config)
    processed = dir_processed(config)
    dir_previews(config).mkdir(parents=True, exist_ok=True)
    h_min, h_max = float(config["building_height_min_m"]), float(config["building_height_max_m"])
    h_def = float(config["building_height_default_m"])
    carpeta = dir_raw(config) / "catastro"

    encontrada = busca_capa(carpeta, CAPA)
    if encontrada is None:
        falla(f"No se encuentra la capa {CAPA} en {carpeta}.")
    ruta, capa = encontrada
    edificios = gpd.read_file(ruta, layer=capa)
    print(f"Catastro: {len(edificios)} edificaciones en {ruta}")
    if edificios.crs is None:
        falla("La capa de edificios no tiene CRS.")
    if edificios.crs.to_epsg() != 25830:
        print(f"  Reproyectando de {edificios.crs} a EPSG:25830")
        edificios = edificios.to_crs(25830)

    zona = box(origin["E_min"], origin["N_min"], origin["E_max"], origin["N_max"])
    edificios = edificios[edificios.intersects(zona)].reset_index(drop=True)

    # --- Rótulos (plantas / uso) unidos a su polígono
    rotulos_por_poligono: dict[int, list[str]] = {}
    encontrada = busca_capa(carpeta, CAPA_ROTULOS)
    if encontrada is None:
        print(f"  Aviso: no está la capa {CAPA_ROTULOS}; las plantas se deducen de la altura")
    else:
        rotulos = gpd.read_file(encontrada[0], layer=encontrada[1]).to_crs(edificios.crs)
        unidos = gpd.sjoin(rotulos[["CADTEXT", "geometry"]], edificios[["geometry"]], predicate="within")
        for indice, texto in zip(unidos["index_right"], unidos["CADTEXT"]):
            rotulos_por_poligono.setdefault(int(indice), []).append(str(texto))
        print(f"  Rótulos de plantas/uso: {len(unidos)} en {len(rotulos_por_poligono)} polígonos")

    partes, clases = [], []
    for indice, geom in enumerate(edificios.geometry.make_valid().intersection(zona)):
        clase = interpreta_rotulos(rotulos_por_poligono.get(indice, []))
        for p in poligonos(geom):
            partes.append(p)
            clases.append(clase)
    areas = np.array([p.area for p in partes])
    pequenos = int((areas < AREA_MIN_M2).sum())
    excluidos = Counter(t for (t, _), a in zip(clases, areas) if a >= AREA_MIN_M2 and t in
                        set(NO_EDIFICIO.values()) | {"sotano"})
    seleccion = [(p, c) for p, c, a in zip(partes, clases, areas)
                 if a >= AREA_MIN_M2 and c[0] not in set(NO_EDIFICIO.values()) | {"sotano"}]
    print(f"  En la zona: {len(areas)} polígonos; {pequenos} de menos de {AREA_MIN_M2:g} m²; "
          f"no son edificios {sum(excluidos.values())} ({', '.join(f'{k} {v}' for k, v in excluidos.most_common())})"
          f" → {len(seleccion)} edificios")

    mdt = Raster(processed / "mdt_clip.tif")
    ndsm = Raster(processed / "ndsm.tif")
    mds = Raster(processed / "mds_clip.tif")

    h_base, e_c, n_c = origin["H_base"], origin["E_centro"], origin["N_centro"]
    a_local = lambda x, y, z=None: (x - e_c, -(y - n_c))  # noqa: E731
    features, locales = [], []
    sin_datos = recortados = plantas_deducidas = 0
    alturas, bases, difs_techo = [], [], []
    for i, (poligono, (tipo, plantas)) in enumerate(seleccion, start=1):
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

        # Plantas: las del Catastro si caben en la altura medida; si no, por la altura
        if plantas == 0 or plantas * 2.4 > altura:
            plantas = int(min(max(round((altura - 0.5) / ALTURA_PLANTA_M), 1), 12))
            plantas_deducidas += 1

        simple = poligono.simplify(TOLERANCIA_SIMPLIFICAR_M, preserve_topology=True)
        if simple.is_empty or not simple.is_valid or simple.area < AREA_MIN_M2 / 2:
            simple = poligono
        local = orient(transforma(a_local, simple), sign=1.0)
        local = Polygon(redondea(list(local.exterior.coords)), [redondea(list(h.coords)) for h in local.interiors])
        locales.append(local)
        features.append({
            "type": "Feature",
            "properties": {"id": i, "base_y": round(base - h_base, DECIMALES), "height": round(altura, DECIMALES),
                           "tipo": tipo, "plantas": plantas},
            "geometry": {"type": "Polygon", "coordinates": mapping(local)["coordinates"]},
        })
        alturas.append(altura)
        bases.append(base - h_base)

    # --- Medianeras: lados exteriores pegados a otro edificio
    arbol = STRtree(locales)
    total_medianeras = 0
    for k, (f, poligono) in enumerate(zip(features, locales)):
        anillo = list(poligono.exterior.coords)
        medianeras = []
        for lado in range(len(anillo) - 1):
            (x0, z0), (x1, z1) = anillo[lado], anillo[lado + 1]
            medio = Point((x0 + x1) / 2, (z0 + z1) / 2)
            vecinos = arbol.query(medio.buffer(DIST_MEDIANERA_M))
            if any(j != k and locales[j].distance(medio) <= DIST_MEDIANERA_M for j in vecinos):
                medianeras.append(lado)
        f["properties"]["medianeras"] = medianeras
        total_medianeras += len(medianeras)

    salida = {
        "type": "FeatureCollection",
        "sistema": "local Cabanillas Drive: [x, z] en metros, x = E − E_centro, z = −(N − N_centro); "
                   "anillo exterior CCW en el plano (x, z); base_y y height en metros (y = altura − H_base); "
                   "medianeras = índices de los lados del anillo exterior (lado i: vértice i → i+1)",
        "fuente": "Catastro de Navarra (edificaciones y rótulos de plantas) + LiDAR Gobierno de Navarra (alturas)",
        "features": features,
    }
    ruta_salida = dir_assets(config) / "buildings.geojson"
    ruta_salida.write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    alturas, bases, difs = np.array(alturas), np.array(bases), np.array(difs_techo)
    tipos = Counter(f["properties"]["tipo"] for f in features)
    plantas = Counter(f["properties"]["plantas"] for f in features)
    print(f"Tipos: {', '.join(f'{k} {v}' for k, v in tipos.most_common())}")
    print(f"Plantas: {', '.join(f'{k}: {v}' for k, v in sorted(plantas.items()))} "
          f"({plantas_deducidas} deducidas de la altura)")
    print(f"Alturas: p10 {np.percentile(alturas, 10):.1f} · mediana {np.median(alturas):.1f} · "
          f"p90 {np.percentile(alturas, 90):.1f} · máx {alturas.max():.1f} m")
    print(f"  Limitadas a [{h_min:g}, {h_max:g}] m: {recortados} · sin LiDAR válido (altura {h_def:g} m): {sin_datos}")
    print(f"base_y: {bases.min():.2f} – {bases.max():.2f} m · medianeras: {total_medianeras} lados")
    if difs.size:
        print(f"Altura por MDS frente a p90 del nDSM: {(np.abs(difs) > 1).sum()} edificios ganan más de 1 m "
              f"(máx {np.abs(difs).max():.1f} m): son huellas en pendiente")

    # --- Vista previa: relieve en gris + huellas coloreadas por altura, medianeras en blanco
    lienzo = Lienzo(origin, 2, fondo=sombreado(dir_assets(config) / "terrain"))
    paradas = [0.0, 0.25, 0.5, 0.75, 1.0]
    colores = [(49, 104, 196), (46, 170, 120), (238, 212, 60), (240, 130, 40), (210, 40, 40)]
    escala = lambda h: rampa((h - 3) / 15, paradas, colores)  # noqa: E731  # 3 m → azul, 18 m → rojo
    for f, poligono in zip(features, locales):
        lienzo.geometria(f["geometry"], relleno=escala(f["properties"]["height"]), borde=(15, 15, 15), ancho=1)
        anillo = list(poligono.exterior.coords)
        for lado in f["properties"]["medianeras"]:
            lienzo.dib.line(lienzo.px([anillo[lado], anillo[lado + 1]]), fill=(255, 255, 255), width=2)
    lienzo.rotulo([f"Edificios: {len(features)} · altura = p{PERCENTIL_ALTURA} del MDS - base",
                   "Medianeras en blanco · Norte arriba · 2 px/m"],
                  leyenda=[(f"{h} m", escala(h)) for h in (3, 6, 9, 12, 15, 18)])
    lienzo.guarda(dir_previews(config) / "alturas.png")

    tam = ruta_salida.stat().st_size / 1_048_576
    print(f"\nSalidas:\n  {ruta_salida} ({len(features)} edificios, {tam:.1f} MB)\n  {dir_previews(config) / 'alturas.png'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
