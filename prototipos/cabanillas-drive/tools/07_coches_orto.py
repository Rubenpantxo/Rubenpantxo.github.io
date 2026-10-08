"""Paso 1.7 — Coches «pintados» en la ortofoto: se detectan, se borran y se guardan sus
posiciones para poner coches 3D en su lugar.

1. Detección con YOLO11-OBB (Ultralytics, entrenado con imágenes aéreas DOTA; clase
   «small vehicle»), por teselas de 1024 px a la resolución de la ortofoto (4 px/m) y
   uniendo las detecciones repetidas en los solapes.
2. Se descartan las que caen sobre edificios y las que no tienen tamaño de turismo.
3. Sentido: en las calles, circulación por la derecha (o el de la calle si es de sentido
   único); fuera de ellas, al azar.
4. Borrado: caja de cada coche + margen + su sombra hacia el norte, rellenada con el
   asfalto de alrededor (mediana local) y fundida. Se vuelven a cortar las teselas.

Requiere 02_ortho.py, 03_buildings.py y 04_osm.py. Volver a ejecutarlo tras 02.
Los pesos del detector se descargan la primera vez a <processed>/modelos/.

Salidas:
    <assets>/coches_aparcados.json  {coches: [{x, z, rumbo, largo, ancho, color, confianza, en_calle}]}
    <assets>/orto/*  (teselas sin coches)
    <processed>/orto_limpia.tif
    <processed>/previews/coches_detectados.jpg, coches_borrados.jpg

Uso: conda run -n cabdrive python tools/07_coches_orto.py
"""
from __future__ import annotations

import importlib
import json
import math
import shutil
import sys
import time
from pathlib import Path

import numpy as np
import rasterio
from affine import Affine
from PIL import Image, ImageDraw
from scipy import ndimage
from shapely import STRtree
from shapely.affinity import translate
from shapely.geometry import Point, Polygon, shape
from shapely.ops import unary_union

from comun import cargar_config, cargar_origin, dir_assets, dir_previews, dir_processed
from previews import FUENTE

TESELA_PX = 1024
SOLAPE_PX = 192
SOLAPE_UNION = 0.4          # fracción de solape para considerar dos detecciones la misma
LARGO_M = (3.0, 6.5)
ANCHO_M = (1.3, 2.6)
MAX_SOBRE_EDIFICIO = 0.3
DIST_CALLE_M = 12.0
MARGEN_BORRADO_M = 0.45
SOMBRA_NORTE_M = 1.0
VENTANA_FONDO_M = 11
SEMILLA = 7


def detecta(orto: np.ndarray, modelo, confianza: float):
    """Detecciones OBB de vehículos en píxeles de la ortofoto: [(Polygon, conf, clase)]."""
    alto, ancho = orto.shape[:2]
    paso = TESELA_PX - SOLAPE_PX
    brutas = []
    for y in range(0, max(1, alto - SOLAPE_PX), paso):
        for x in range(0, max(1, ancho - SOLAPE_PX), paso):
            tesela = orto[y:y + TESELA_PX, x:x + TESELA_PX]
            r = modelo.predict(tesela, imgsz=TESELA_PX, conf=confianza, verbose=False)[0].obb
            for p, c, k in zip(r.xyxyxyxy.cpu().numpy(), r.conf.cpu().numpy(), r.cls.cpu().numpy().astype(int)):
                if "vehicle" in modelo.names[k]:
                    brutas.append((Polygon(p + [x, y]), float(c), modelo.names[k]))
    brutas.sort(key=lambda t: -t[1])
    quedan, arbol_pols = [], []
    for pol, c, clase in brutas:
        if not pol.is_valid or pol.area < 4:
            continue
        if any(pol.intersection(q).area / min(pol.area, q.area) > SOLAPE_UNION for q in arbol_pols
               if q.distance(pol) == 0):
            continue
        quedan.append((pol, c, clase))
        arbol_pols.append(pol)
    return brutas, quedan


def carga_modelo(config: dict, processed: Path):
    from ultralytics import YOLO
    nombre = config.get("detector_coches", "yolo11m-obb.pt")
    carpeta = processed / "modelos"
    carpeta.mkdir(parents=True, exist_ok=True)
    ruta = carpeta / nombre
    if not ruta.is_file():
        modelo = YOLO(nombre)                      # lo descarga al directorio actual
        if Path(nombre).is_file():
            shutil.move(nombre, ruta)
        return modelo
    return YOLO(str(ruta))


def main() -> int:
    config = cargar_config()
    origin = cargar_origin(config)
    assets, processed = dir_assets(config), dir_processed(config)
    with rasterio.open(processed / "orto_mosaico.tif") as ds:
        orto = np.moveaxis(ds.read(), 0, -1)
    alto_px, ancho_px = orto.shape[:2]
    s = ancho_px / origin["ancho"]                      # px por metro
    a_local = Affine(1 / s, 0, -origin["ancho"] / 2, 0, 1 / s, -origin["alto"] / 2)   # píxel → local
    a_pixel = ~a_local

    calles = json.loads((assets / "osm" / "calles.geojson").read_text(encoding="utf-8"))["features"]
    edificios = json.loads((assets / "buildings.geojson").read_text(encoding="utf-8"))["features"]
    huellas = [shape(f["geometry"]) for f in edificios]
    arbol_huellas = STRtree(huellas)
    lineas, datos_lineas = [], []
    for f in calles:
        geom = shape(f["geometry"])
        for parte in getattr(geom, "geoms", [geom]):
            lineas.append(parte)
            datos_lineas.append(f["properties"])
    arbol_calles = STRtree(lineas)

    # --- Detección
    t0 = time.time()
    modelo = carga_modelo(config, processed)
    brutas, detecciones = detecta(orto, modelo, float(config.get("detector_confianza", 0.15)))
    print(f"Detector {config.get('detector_coches', 'yolo11m-obb.pt')}: {len(brutas)} detecciones, "
          f"{len(detecciones)} tras unir solapes ({time.time() - t0:.0f} s)")

    rng = np.random.default_rng(SEMILLA)
    coches, rechazos = [], {}
    for pol_px, conf, clase in detecciones:
        pts = np.array(pol_px.exterior.coords[:4])
        local = Polygon([a_local * tuple(p) for p in pts])
        lados = [np.linalg.norm(pts[(i + 1) % 4] - pts[i]) / s for i in range(2)]
        largo, ancho = max(lados), min(lados)
        if not (LARGO_M[0] <= largo <= LARGO_M[1] and ANCHO_M[0] <= ancho <= ANCHO_M[1]):
            rechazos["tamaño"] = rechazos.get("tamaño", 0) + 1
            continue
        tapado = sum(local.intersection(huellas[i]).area for i in arbol_huellas.query(local))
        if tapado / local.area > MAX_SOBRE_EDIFICIO:
            rechazos["sobre edificio"] = rechazos.get("sobre edificio", 0) + 1
            continue
        # Eje largo en local
        i_largo = 0 if lados[0] >= lados[1] else 1
        v = (pts[(i_largo + 1) % 4] - pts[i_largo]) / s
        ux, uz = v / (np.linalg.norm(v) or 1)
        centro = local.centroid
        x0, z0 = centro.x, centro.y

        en_calle = False
        if lineas:
            k = arbol_calles.nearest(centro)
            linea = lineas[k]
            if linea.distance(centro) <= DIST_CALLE_M:
                d = linea.project(centro)
                p1, p2 = linea.interpolate(max(d - 1, 0)), linea.interpolate(min(d + 1, linea.length))
                sx, sz = p2.x - p1.x, p2.y - p1.y
                n = math.hypot(sx, sz) or 1
                sx, sz = sx / n, sz / n
                if abs(ux * sx + uz * sz) > math.cos(math.radians(30)):
                    en_calle = True
                    q = linea.interpolate(d)
                    lado = sx * (z0 - q.y) - sz * (x0 - q.x)      # > 0: a la derecha de la calle
                    sentido = datos_lineas[k].get("sentido_unico")
                    signo = 1 if sentido == "yes" else -1 if sentido == "-1" else (1 if lado > 0 else -1)
                    if ux * sx + uz * sz < 0:
                        ux, uz = -ux, -uz
                    ux, uz = ux * signo, uz * signo
        if not en_calle and rng.random() < 0.5:
            ux, uz = -ux, -uz

        # Color: mediana de la mitad más clara de los píxeles de la caja (sin sombra ni lunas)
        x_min, y_min, x_max, y_max = (max(int(v), 0) for v in pol_px.bounds)
        caja = Image.new("L", (x_max - x_min + 2, y_max - y_min + 2))
        ImageDraw.Draw(caja).polygon([(px - x_min, py - y_min) for px, py in pts], fill=1)
        sel = np.asarray(caja, bool)
        recorte = orto[y_min:y_min + sel.shape[0], x_min:x_min + sel.shape[1]]
        sel = sel[:recorte.shape[0], :recorte.shape[1]]
        pix = recorte[sel].astype(np.float32)
        color = [128, 128, 128]
        if len(pix):
            orden = np.argsort(pix.mean(axis=1))
            color = [int(c) for c in np.median(pix[orden[len(orden) // 2:]], axis=0)]

        coches.append({"x": round(x0, 2), "z": round(z0, 2), "rumbo": round(math.atan2(ux, uz), 4),
                       "largo": round(largo, 2), "ancho": round(ancho, 2), "color": color,
                       "confianza": round(conf, 3), "en_calle": en_calle, "_poligono": local})

    print(f"Coches: {len(coches)} ({sum(c['en_calle'] for c in coches)} en calle) · descartes: "
          f"{', '.join(f'{k} {v}' for k, v in rechazos.items()) or 'ninguno'}")

    # --- Borrado: caja + margen + sombra hacia el norte, relleno con el asfalto de alrededor
    zonas = []
    for c in coches:
        caja = c["_poligono"].buffer(MARGEN_BORRADO_M, join_style=2)
        zonas.append(unary_union([caja, translate(caja, 0, -SOMBRA_NORTE_M)]).convex_hull)
    imagen_mascara = Image.new("L", (ancho_px, alto_px))
    dib = ImageDraw.Draw(imagen_mascara)
    for z in zonas:
        dib.polygon([a_pixel * p for p in z.exterior.coords], fill=255)
    mascara = np.asarray(imagen_mascara, np.float32) / 255

    f = int(round(s))
    orto_f = orto.astype(np.float32)
    # Fondo: mediana a 1 px/m sin contar lo que se va a borrar
    reducido = orto_f[: alto_px // f * f, : ancho_px // f * f].reshape(alto_px // f, f, ancho_px // f, f, 3).mean(axis=(1, 3))
    tapa = mascara[: alto_px // f * f, : ancho_px // f * f].reshape(alto_px // f, f, ancho_px // f, f).max(axis=(1, 3)) > 0
    relleno = reducido.copy()
    if tapa.any():
        # Cada píxel tapado toma el valor del píxel libre más cercano antes de la mediana
        _, (fi, ci) = ndimage.distance_transform_edt(tapa, return_indices=True)
        relleno = reducido[fi, ci]
    mediana = np.stack([ndimage.median_filter(relleno[..., c], size=VENTANA_FONDO_M // 2 * 2 + 1) for c in range(3)], -1)
    fondo = np.asarray(Image.fromarray(np.clip(mediana, 0, 255).astype(np.uint8)).resize((ancho_px, alto_px),
                                                                                         Image.BILINEAR), np.float32)
    alfa = ndimage.gaussian_filter(mascara, sigma=1.5)[..., None]
    grano = rng.normal(0, 3.0, size=orto.shape).astype(np.float32)
    limpia = np.clip(orto_f * (1 - alfa) + (fondo + grano) * alfa, 0, 255).astype(np.uint8)

    perfil = dict(driver="GTiff", width=ancho_px, height=alto_px, count=3, dtype="uint8", crs="EPSG:25830",
                  transform=rasterio.transform.from_origin(origin["E_min"], origin["N_max"], 1 / s, 1 / s),
                  compress="jpeg", photometric="ycbcr", jpeg_quality=90, tiled=True)
    with rasterio.open(processed / "orto_limpia.tif", "w", **perfil) as ds:
        ds.write(np.moveaxis(limpia, -1, 0))
    ortho = importlib.import_module("02_ortho")
    total = ortho.escribe_teselas(limpia, config, origin, "PNOA máxima actualidad (IGN), coches borrados")

    salida = [{k: v for k, v in c.items() if not k.startswith("_")} for c in coches]
    (assets / "coches_aparcados.json").write_text(
        json.dumps({"sistema": "local: x este, z sur (m); rumbo = atan2(dx, dz) del frontal (rad)",
                    "detector": config.get("detector_coches", "yolo11m-obb.pt"), "coches": salida},
                   ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # --- Vistas previas del casco (400 × 400 m)
    lado = 400
    c0 = int((origin["ancho"] / 2 - lado / 2) * s)
    f0 = int((origin["alto"] / 2 - lado / 2) * s)
    caja_px = (c0, f0, c0 + int(lado * s), f0 + int(lado * s))
    antes = Image.fromarray(orto).crop(caja_px)
    dib = ImageDraw.Draw(antes)
    for c in coches:
        pts = [a_pixel * p for p in c["_poligono"].exterior.coords]
        dib.polygon([(px - c0, py - f0) for px, py in pts], outline=(255, 40, 40) if c["en_calle"] else (40, 200, 255),
                    width=2)
        frente = a_pixel * (c["x"] + math.sin(c["rumbo"]) * c["largo"] / 2, c["z"] + math.cos(c["rumbo"]) * c["largo"] / 2)
        dib.ellipse([frente[0] - c0 - 3, frente[1] - f0 - 3, frente[0] - c0 + 3, frente[1] - f0 + 3], fill=(255, 255, 0))
    dib.rectangle([0, 0, 560, 26], fill=(20, 28, 38))
    dib.text((6, 4), f"{len(coches)} coches (rojo: en calle, azul: fuera; amarillo = frontal)", font=FUENTE,
             fill=(255, 255, 255))
    antes.save(dir_previews(config) / "coches_detectados.jpg", quality=88)
    par = Image.new("RGB", (antes.width * 2, antes.height))
    par.paste(Image.fromarray(orto).crop(caja_px), (0, 0))
    par.paste(Image.fromarray(limpia).crop(caja_px), (antes.width, 0))
    par.save(dir_previews(config) / "coches_borrados.jpg", quality=88)

    print(f"\nSalidas:\n  {assets / 'coches_aparcados.json'}\n  {assets / 'orto'} ({total / 1_048_576:.1f} MB)\n"
          f"  {processed / 'orto_limpia.tif'}\n  {dir_previews(config) / 'coches_detectados.jpg'}, coches_borrados.jpg")
    return 0


if __name__ == "__main__":
    sys.exit(main())
