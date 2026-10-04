"""Paso 1.0 — Inventario de los datos brutos de data/raw/.

Para cada entrada informa de formato, CRS, extensión, resolución y nodata;
comprueba si MDT y MDS cubren el 100 % de la zona y si son del mismo año;
localiza la capa de edificaciones del Catastro y lista sus campos.

Solo LEE data/raw/. Escribe el informe en <processed_dir>/informe_raw.md
y lo imprime por consola.

Uso (desde la raíz del proyecto):
    conda run -n cabdrive python tools/00_inspect_raw.py
"""
from __future__ import annotations

import re
import sys
import zipfile
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from comun import cargar_config, dir_processed, dir_raw, ruta_zona

EPSG_ESPERADO = 25830
LADO_MAX_ZONA_M = 1500.0
CAPA_EDIFICIOS = "CATASTPolEdificacion"
EXT_RASTER = {".asc", ".tif", ".tiff"}
EXT_AUXILIARES = {".prj", ".aux.xml", ".xml", ".ovr", ".tfw", ".txt", ".pdf",
                  ".dbf", ".shx", ".cpg", ".sbn", ".sbx", ".qmd", ".qpj"}
# Celdas máximas de la rejilla de análisis de cobertura (≈ 1 m en una zona de 2 × 2 km)
CELDAS_MAX_COBERTURA = 4_000_000
# Nomenclatura del Gobierno de Navarra: MDT_0064_43_2017_EPSG25830_50cm
PATRON_MDE = re.compile(
    r"(?P<tipo>MD[TS])_(?P<hoja>\d{3,4}_\d{1,2})_(?P<anio>(?:19|20)\d{2})"
    r"_EPSG(?P<epsg>\d+)_(?P<res>\d+c?m)", re.IGNORECASE)


@dataclass
class Informe:
    lineas: list[str] = field(default_factory=list)
    bloqueantes: list[str] = field(default_factory=list)
    avisos: list[str] = field(default_factory=list)

    def t(self, texto: str = "") -> None:
        self.lineas.append(texto)

    def bloquea(self, texto: str) -> None:
        self.bloqueantes.append(texto)

    def avisa(self, texto: str) -> None:
        self.avisos.append(texto)

    def markdown(self) -> str:
        partes = list(self.lineas)
        partes += ["", "## Resumen", ""]
        partes.append("### BLOQUEANTES" + ("" if self.bloqueantes else " — ninguno"))
        partes += [f"- {b}" for b in self.bloqueantes]
        partes.append("")
        partes.append("### AVISOS" + ("" if self.avisos else " — ninguno"))
        partes += [f"- {a}" for a in self.avisos]
        partes.append("")
        return "\n".join(partes)


def extension(ruta: Path) -> str:
    nombre = ruta.name.lower()
    return ".aux.xml" if nombre.endswith(".aux.xml") else ruta.suffix.lower()


def mb(ruta: Path) -> str:
    return f"{ruta.stat().st_size / 1_048_576:.1f} MB"


def epsg_de(crs) -> int | None:
    if crs is None:
        return None
    try:
        return crs.to_epsg()
    except Exception:  # noqa: BLE001
        return None


def describe_crs(crs) -> str:
    if crs is None:
        return "SIN CRS"
    epsg = epsg_de(crs)
    return f"EPSG:{epsg}" if epsg else crs.to_string()[:80]


# --------------------------------------------------------------------------- zona
def inspecciona_zona(inf: Informe, ruta: Path):
    """Devuelve la geometría de la zona (shapely) en EPSG:25830, o None."""
    inf.t("## Zona (`zona.geojson`)")
    inf.t("")
    if not ruta.is_file():
        inf.t(f"- **No existe** `{ruta.name}`.")
        inf.bloquea(f"Falta la zona: `{ruta.name}` en `{ruta.parent.name}/` (GUIA_RUBEN.md, parte C).")
        inf.t("")
        return None

    import geopandas as gpd

    gdf = gpd.read_file(ruta)
    inf.t(f"- Archivo: `{ruta.name}` ({mb(ruta)})")
    inf.t(f"- Entidades: {len(gdf)} · tipos: {', '.join(sorted(set(gdf.geom_type)))}")
    inf.t(f"- CRS declarado: {describe_crs(gdf.crs)}")
    if len(gdf) != 1:
        inf.bloquea(f"`zona.geojson` debe tener 1 polígono y tiene {len(gdf)}.")
    if gdf.empty:
        return None
    if gdf.crs is None:
        inf.bloquea("`zona.geojson` no declara CRS; se espera EPSG:25830.")
        return None
    if epsg_de(gdf.crs) != EPSG_ESPERADO:
        inf.avisa(f"`zona.geojson` está en {describe_crs(gdf.crs)}; se reproyecta a EPSG:25830 para el análisis. "
                  "PLAN.md §3 pide EPSG:25830 directamente.")
        gdf = gdf.to_crs(EPSG_ESPERADO)

    zona = gdf.union_all() if hasattr(gdf, "union_all") else gdf.unary_union
    minx, miny, maxx, maxy = zona.bounds
    ancho, alto = maxx - minx, maxy - miny
    rect = zona.area / (ancho * alto) if ancho * alto > 0 else 0
    inf.t(f"- Bbox EPSG:25830: E {minx:.2f} – {maxx:.2f} · N {miny:.2f} – {maxy:.2f}")
    inf.t(f"- Tamaño: {ancho:.1f} × {alto:.1f} m ({zona.area / 1e6:.3f} km²)")
    inf.t(f"- Centro del bbox: E {(minx + maxx) / 2:.2f} · N {(miny + maxy) / 2:.2f} "
          "(solo informativo; el origen oficial lo fija 1.1 en origin.json)")
    inf.t(f"- ¿Rectángulo alineado con los ejes?: {'sí' if rect > 0.999 else f'no (ocupa {rect:.1%} de su bbox)'}")
    if rect <= 0.999:
        inf.avisa("La zona no es un rectángulo alineado con los ejes; el pipeline usará su bbox.")
    if max(ancho, alto) > LADO_MAX_ZONA_M:
        inf.avisa(f"La zona supera {LADO_MAX_ZONA_M:.0f} m de lado (GUIA parte C recomienda máximo 1,5 × 1,5 km).")
    inf.t("")
    return zona


# ------------------------------------------------------------------------ rásteres
def rejilla_zona(zona):
    """Rejilla de análisis alineada con el bbox de la zona: (forma, transform, máscara de la zona)."""
    from rasterio.features import geometry_mask
    from rasterio.transform import from_bounds

    minx, miny, maxx, maxy = zona.bounds
    paso = max(1.0, ((maxx - minx) * (maxy - miny) / CELDAS_MAX_COBERTURA) ** 0.5)
    ancho = max(1, int(round((maxx - minx) / paso)))
    alto = max(1, int(round((maxy - miny) / paso)))
    transform = from_bounds(minx, miny, maxx, maxy, ancho, alto)
    dentro = geometry_mask([zona], out_shape=(alto, ancho), transform=transform, invert=True)
    return (alto, ancho), transform, dentro, paso


def lee_sobre_rejilla(ds, zona, forma):
    """Lee la banda 1 sobre el bbox de la zona remuestreada a `forma`. Devuelve (valores, válidos)."""
    import numpy as np
    from rasterio.enums import Resampling
    from rasterio.windows import from_bounds as ventana_de

    ventana = ventana_de(*zona.bounds, transform=ds.transform)
    mascara = ds.read_masks(1, window=ventana, out_shape=forma, boundless=True,
                            resampling=Resampling.nearest)
    valores = ds.read(1, window=ventana, out_shape=forma, boundless=True,
                      fill_value=ds.nodata if ds.nodata is not None else 0,
                      resampling=Resampling.nearest).astype("float64")
    validos = (mascara > 0) & np.isfinite(valores)
    if ds.nodata is not None:
        validos &= valores != ds.nodata
    return valores, validos


def inspecciona_rasteres(inf: Informe, etiqueta: str, carpeta: Path, zona, multibanda=False) -> dict:
    """Inventario de una carpeta de rásteres. Devuelve metadatos agregados para comparar MDT/MDS."""
    resultado = {"anios": set(), "hojas": set(), "res": set(), "cobertura": None, "n": 0}
    inf.t(f"## {etiqueta} (`{carpeta.name}/`)")
    inf.t("")
    if not carpeta.is_dir():
        inf.t("- **La carpeta no existe.**")
        inf.bloquea(f"Falta la carpeta `{carpeta.name}/` de {etiqueta}.")
        return resultado

    todos = sorted(p for p in carpeta.rglob("*") if p.is_file())
    rasteres = [p for p in todos if extension(p) in EXT_RASTER]
    zips = [p for p in todos if extension(p) == ".zip"]
    otros = [p for p in todos if p not in rasteres and p not in zips and extension(p) not in EXT_AUXILIARES]

    if zips:
        inf.t(f"- ZIP sin descomprimir: {', '.join(f'`{z.name}`' for z in zips)}")
        if not rasteres:
            inf.bloquea(f"{etiqueta}: solo hay ZIP en `{carpeta.name}/`; hay que descomprimirlos (GUIA parte D).")
    if otros:
        inf.t(f"- Archivos no reconocidos: {', '.join(f'`{o.name}`' for o in otros)}")
    if not rasteres:
        inf.t("- **No hay rásteres** (.asc/.tif).")
        if not zips:
            inf.bloquea(f"{etiqueta}: la carpeta `{carpeta.name}/` está vacía.")
        inf.t("")
        return resultado

    import numpy as np
    import rasterio

    rejilla = rejilla_zona(zona) if zona is not None else None
    cubierto = np.zeros(rejilla[0], dtype=bool) if rejilla else None
    vmin, vmax = np.inf, -np.inf

    inf.t("| Archivo | Driver | CRS | Tamaño px | Resolución | Nodata | Tipo | Extensión (E/N) | Hoja | Año |")
    inf.t("|---|---|---|---|---|---|---|---|---|---|")
    for ruta in rasteres:
        with rasterio.open(ruta) as ds:
            epsg = epsg_de(ds.crs)
            m = PATRON_MDE.search(ruta.name)
            hoja = m["hoja"] if m else "?"
            anio = m["anio"] if m else (re.search(r"(?:19|20)\d{2}", ruta.name) or [None])[0] or "?"
            resx, resy = ds.res
            b = ds.bounds
            inf.t(f"| `{ruta.name}` ({mb(ruta)}) | {ds.driver} | {describe_crs(ds.crs)} | "
                  f"{ds.width}×{ds.height}{f' ×{ds.count} bandas' if ds.count > 1 else ''} | "
                  f"{resx:g}×{resy:g} m | {ds.nodata} | {ds.dtypes[0]} | "
                  f"{b.left:.0f}–{b.right:.0f} / {b.bottom:.0f}–{b.top:.0f} | {hoja} | {anio} |")

            resultado["n"] += 1
            resultado["anios"].add(anio)
            resultado["hojas"].add(hoja)
            resultado["res"].add(round(resx, 3))
            if abs(resx - resy) > 1e-6:
                inf.avisa(f"`{ruta.name}`: píxel no cuadrado ({resx}×{resy}).")
            if ds.crs is None:
                inf.bloquea(f"`{ruta.name}` no tiene CRS (¿falta el .prj?). Se espera EPSG:25830; "
                            "la cobertura se calcula suponiéndolo.")
            elif epsg != EPSG_ESPERADO:
                inf.bloquea(f"`{ruta.name}` está en {describe_crs(ds.crs)}, no en EPSG:25830.")
                continue
            if ds.nodata is None and not multibanda:
                inf.avisa(f"`{ruta.name}` no declara nodata.")
            if rejilla:
                valores, validos = lee_sobre_rejilla(ds, zona, rejilla[0])
                validos &= rejilla[2]
                cubierto |= validos
                if validos.any() and not multibanda:
                    vmin = min(vmin, float(valores[validos].min()))
                    vmax = max(vmax, float(valores[validos].max()))
    inf.t("")

    if rejilla:
        forma, _, dentro, paso = rejilla
        cobertura = cubierto.sum() / dentro.sum() if dentro.sum() else 0.0
        resultado["cobertura"] = cobertura
        inf.t(f"- Cobertura de la zona con píxeles válidos: **{cobertura:.2%}** "
              f"(rejilla de análisis de {paso:.2f} m, {forma[1]}×{forma[0]} celdas)")
        if np.isfinite(vmin):
            inf.t(f"- Rango de valores dentro de la zona: {vmin:.2f} – {vmax:.2f}")
        if cobertura < 0.9999:
            inf.bloquea(f"{etiqueta} cubre solo el {cobertura:.2%} de la zona.")
    if len(resultado["anios"]) > 1:
        inf.avisa(f"{etiqueta}: hay archivos de varios años ({', '.join(sorted(resultado['anios']))}).")
    if len(resultado["res"]) > 1:
        inf.avisa(f"{etiqueta}: hay resoluciones distintas ({', '.join(map(str, sorted(resultado['res'])))} m).")
    inf.t("")
    return resultado


def compara_mdt_mds(inf: Informe, mdt: dict, mds: dict) -> None:
    inf.t("## Coherencia MDT ↔ MDS")
    inf.t("")
    if not mdt["n"] or not mds["n"]:
        inf.t("- No se puede comparar: falta uno de los dos.")
        inf.t("")
        return
    mismo_anio = mdt["anios"] == mds["anios"] and "?" not in mdt["anios"]
    inf.t(f"- Años MDT: {', '.join(sorted(mdt['anios']))} · MDS: {', '.join(sorted(mds['anios']))} → "
          f"{'mismo año' if mismo_anio else 'NO coinciden o no se pueden leer del nombre'}")
    inf.t(f"- Hojas MDT: {', '.join(sorted(mdt['hojas']))} · MDS: {', '.join(sorted(mds['hojas']))}")
    inf.t(f"- Resolución MDT: {sorted(mdt['res'])} m · MDS: {sorted(mds['res'])} m")
    if not mismo_anio:
        inf.bloquea("MDT y MDS no son del mismo año (o el año no se deduce del nombre). "
                    "La altura de edificios (MDS − MDT) necesita el mismo vuelo.")
    if mdt["hojas"] != mds["hojas"]:
        inf.avisa("MDT y MDS no tienen las mismas hojas.")
    if mdt["res"] != mds["res"]:
        inf.avisa("MDT y MDS tienen resoluciones distintas.")
    inf.t("")


# ------------------------------------------------------------------------ catastro
def capas_vectoriales(carpeta: Path) -> list[tuple[str, str, str]]:
    """Lista (origen legible, ruta para GDAL, nombre de capa) de shp/gpkg, también dentro de ZIP."""
    import pyogrio

    capas = []
    for ruta in sorted(p for p in carpeta.rglob("*") if p.is_file()):
        ext = extension(ruta)
        if ext == ".shp":
            capas.append((ruta.name, str(ruta), ruta.stem))
        elif ext == ".gpkg":
            for nombre, _ in pyogrio.list_layers(ruta):
                capas.append((f"{ruta.name}:{nombre}", str(ruta), nombre))
        elif ext == ".zip":
            with zipfile.ZipFile(ruta) as z:
                for interno in z.namelist():
                    if interno.lower().endswith(".shp"):
                        gdal_ruta = f"/vsizip/{ruta.as_posix()}/{interno}"
                        capas.append((f"{ruta.name} → {interno}", gdal_ruta, Path(interno).stem))
    return capas


def inspecciona_catastro(inf: Informe, carpeta: Path, zona) -> None:
    inf.t(f"## Catastro (`{carpeta.name}/`)")
    inf.t("")
    if not carpeta.is_dir() or not any(carpeta.rglob("*")):
        inf.t("- **Carpeta vacía o inexistente.**")
        inf.bloquea(f"Falta el Catastro en `{carpeta.name}/` (capa {CAPA_EDIFICIOS}, GUIA parte E).")
        inf.t("")
        return

    import geopandas as gpd
    import pyogrio

    capas = capas_vectoriales(carpeta)
    if not capas:
        inf.t("- No hay capas vectoriales (.shp, .gpkg ni .shp dentro de .zip).")
        inf.bloquea("El Catastro no contiene ninguna capa vectorial legible.")
        inf.t("")
        return
    inf.t("Capas encontradas:")
    for origen, _, _ in capas:
        inf.t(f"- `{origen}`")
    inf.t("")

    objetivo = [c for c in capas if c[2].lower() == CAPA_EDIFICIOS.lower()] or \
               [c for c in capas if CAPA_EDIFICIOS.lower() in c[2].lower()]
    if not objetivo:
        inf.bloquea(f"No se encuentra la capa `{CAPA_EDIFICIOS}` en el Catastro.")
        parecidas = [c[0] for c in capas if "edific" in c[2].lower()]
        if parecidas:
            inf.avisa(f"Capas con nombre parecido: {', '.join(parecidas)}.")
        inf.t("")
        return
    if len(objetivo) > 1:
        inf.avisa(f"Hay {len(objetivo)} capas `{CAPA_EDIFICIOS}`; se inspecciona la primera.")

    origen, ruta_gdal, _ = objetivo[0]
    capa = None if ruta_gdal.lower().endswith((".shp",)) else objetivo[0][2]
    info = pyogrio.read_info(ruta_gdal, layer=capa)
    gdf = gpd.read_file(ruta_gdal, layer=capa)
    inf.t(f"### Capa objetivo: `{origen}`")
    inf.t("")
    inf.t(f"- Entidades: {len(gdf)} · geometría: {info.get('geometry_type')} · CRS: {describe_crs(gdf.crs)}")
    inf.t(f"- Codificación: {info.get('encoding')}")
    if gdf.crs is None:
        inf.bloquea(f"`{origen}` no tiene CRS (¿falta el .prj?).")
    elif epsg_de(gdf.crs) != EPSG_ESPERADO:
        inf.avisa(f"`{origen}` está en {describe_crs(gdf.crs)}; habrá que reproyectar a EPSG:25830 en 1.3.")
    if not gdf.empty:
        b = gdf.total_bounds
        inf.t(f"- Extensión: E {b[0]:.0f}–{b[2]:.0f} · N {b[1]:.0f}–{b[3]:.0f}")
    if zona is not None and gdf.crs is not None and not gdf.empty:
        en_zona = gdf.to_crs(EPSG_ESPERADO)
        en_zona = en_zona[en_zona.intersects(zona)]
        inf.t(f"- Edificaciones que tocan la zona: **{len(en_zona)}**")
        if len(en_zona):
            areas = en_zona.area
            inf.t(f"- Área de huellas en la zona: mín {areas.min():.1f} m², mediana {areas.median():.1f} m², "
                  f"máx {areas.max():.1f} m² · menores de 8 m² (se descartarán en 1.3): {(areas < 8).sum()}")
        else:
            inf.bloquea("Ninguna edificación del Catastro cae dentro de la zona.")
    inf.t("")
    inf.t("| Campo | Tipo | Ejemplo |")
    inf.t("|---|---|---|")
    for col in gdf.columns:
        if col == gdf.geometry.name:
            continue
        no_nulos = gdf[col].dropna()
        ejemplo = str(no_nulos.iloc[0])[:40] if len(no_nulos) else "—"
        inf.t(f"| `{col}` | {gdf[col].dtype} | {ejemplo.replace('|', '/')} |")
    inf.t("")


# ---------------------------------------------------------------------------- orto
def inspecciona_orto(inf: Informe, carpeta: Path, zona) -> None:
    recorte = carpeta / "orto_recorte.tif"
    if recorte.is_file():
        inspecciona_rasteres(inf, "Ortofoto local", carpeta, zona, multibanda=True)
        return
    inf.t(f"## Ortofoto (`{carpeta.name}/`)")
    inf.t("")
    restos = [p.name for p in carpeta.rglob("*") if p.is_file()] if carpeta.is_dir() else []
    inf.t("- No hay `orto_recorte.tif` → en el paso 1.2 se descargará por WMS del PNOA (esperado).")
    if restos:
        inf.avisa(f"`orto/` contiene archivos pero no `orto_recorte.tif`: {', '.join(restos)}. Se ignorarán.")
    inf.t("")


# ---------------------------------------------------------------------------- main
def main() -> int:
    config = cargar_config()
    raw = dir_raw(config)
    zona_ruta = ruta_zona(config)
    salida = dir_processed(config) / "informe_raw.md"

    inf = Informe()
    inf.t("# Informe de datos brutos — Cabanillas Drive (paso 1.0)")
    inf.t("")
    inf.t(f"- Fecha: {datetime.now():%Y-%m-%d %H:%M}")
    inf.t(f"- Carpeta: `{raw}`")
    inf.t("")

    if not raw.is_dir():
        inf.t("**No existe la carpeta de datos brutos.**")
        inf.bloquea(f"No existe `{raw}`.")
    else:
        esperados = {zona_ruta.name, "mdt", "mds", "catastro", "orto"}
        extra = sorted(p.name for p in raw.iterdir() if p.name not in esperados)
        if extra:
            inf.avisa(f"Elementos no previstos en data/raw/: {', '.join(extra)}.")

        zona = inspecciona_zona(inf, zona_ruta)
        if zona is None:
            inf.avisa("Sin zona no se puede calcular la cobertura de los rásteres.")
        mdt = inspecciona_rasteres(inf, "MDT", raw / "mdt", zona)
        mds = inspecciona_rasteres(inf, "MDS", raw / "mds", zona)
        compara_mdt_mds(inf, mdt, mds)
        inspecciona_catastro(inf, raw / "catastro", zona)
        inspecciona_orto(inf, raw / "orto", zona)

    texto = inf.markdown()
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(texto, encoding="utf-8")
    print(texto)
    print(f"Informe guardado en {salida}")
    return 1 if inf.bloqueantes else 0


if __name__ == "__main__":
    sys.exit(main())
