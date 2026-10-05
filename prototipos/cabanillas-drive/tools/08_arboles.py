"""Paso R1.1 — Árboles individuales desde el LiDAR (nDSM) y la ortofoto.

1. Vegetación alta = nDSM > 2 m, fuera de los edificios (+1 m) y con verde en la ortofoto
   a menos de 2,5 m (índice 2G − R − B). La ortofoto no es ortofoto verdadera: las copas
   salen desplazadas respecto al LiDAR y las palmeras se ven grisáceas, por eso el verde se
   busca en un entorno y no píxel a píxel. Se descartan las «copas» planas (toldos, casetas
   y camiones que no están en el Catastro).
2. Copas = máximos locales del nDSM suavizado, con una ventana que crece con la altura del
   árbol (los árboles altos tienen copas más anchas y si no se partirían en varios).
3. Cada copa se delimita por cuencas (watershed) dentro de su mancha de vegetación:
   radio = √(área/π), altura = p98 del nDSM, color = mediana de la parte iluminada.
4. Tipo estimado por forma y color: ciprés (columna estrecha), chopo (alto y estrecho),
   conífera (verde oscuro), palmera (copa pequeña, aislada y de borde brusco) y frondosa
   (el resto). En las manchas de arbolado con varias copas manda el tipo mayoritario
   (pinar, chopera…). Se corrige a mano en tools/arboles_tipos.json.

Requiere 01_origin_terrain.py, 02_ortho.py y 03_buildings.py.

Salidas:
    <assets>/arboles.json   {tipos, campos, arboles: [[x, z, altura, radio, tipo, r, g, b], …]}
    <processed>/previews/arboles.jpg, arboles_detalle.jpg

Uso: conda run -n cabdrive python tools/08_arboles.py
"""
from __future__ import annotations

import json
import sys

import numpy as np
import rasterio
from rasterio.features import rasterize
from rasterio.warp import Resampling, reproject
from scipy import ndimage
from scipy.spatial import cKDTree
from shapely.geometry import Point, shape
from shapely.ops import transform as transforma
from skimage.segmentation import watershed
from PIL import Image, ImageDraw

from comun import RAIZ, cargar_config, cargar_origin, dir_assets, dir_previews, dir_processed, utm_a_local
from previews import FUENTE

ALTURA_MIN_M = 2.0          # vegetación alta (por debajo: setos, coches, muretes)
ALTURA_COPA_MIN_M = 2.4     # cima mínima (olivos y frutales de huerta rondan 2,5–4 m)
MARGEN_EDIFICIO_M = 1.0
VERDOR_MIN = 0.03
ENTORNO_VERDOR_PX = 7       # 3,5 m
RUGOSIDAD_MIN_M = 0.18      # desviación típica del nDSM en una copa: por debajo es algo plano
MANCHA_MIN_COPAS = 6        # manchas con al menos estas copas toman el tipo mayoritario
HILERA_SEPARACION_M = (3.5, 13.0)   # distancia entre árboles de una alineación de calle
HILERA_MIN_ARBOLES = 4
SIGMA_SUAVIZADO_PX = 1.2
AREA_MIN_M2 = 1.0
# Diámetro de la ventana de búsqueda de cimas según la altura (Popescu y Wynne, 2004):
# d = 2,51 + 0,00901·h²  (m)
VENTANAS = [(0.0, 5), (9.0, 7), (14.0, 9), (19.0, 11), (24.0, 13)]   # (altura desde, px)

TIPOS = ["frondosa", "conifera", "cipres", "chopo", "palmera"]
COLORES_TIPO = {
    "frondosa": (255, 230, 0),
    "conifera": (0, 200, 255),
    "cipres": (190, 80, 255),
    "chopo": (255, 120, 0),
    "palmera": (255, 40, 120),
}


def lee_rasters(processed):
    with rasterio.open(processed / "ndsm.tif") as ds:
        ndsm = ds.read(1, masked=True).filled(0).astype(np.float32)
        perfil = ds.profile
        tr = ds.transform
    # Ortofoto (0,25 m) a la rejilla del nDSM (0,5 m, desplazada 0,125 m): media por área
    orto = np.zeros((3, *ndsm.shape), np.float32)
    with rasterio.open(processed / "orto_mosaico.tif") as ds:
        for b in range(3):
            reproject(ds.read(b + 1).astype(np.float32), orto[b], src_transform=ds.transform,
                      src_crs=ds.crs, dst_transform=tr, dst_crs=perfil["crs"], resampling=Resampling.average)
    return np.clip(ndsm, 0, None), np.moveaxis(orto, 0, -1), tr


def mascara_edificios(edificios, origin, tr, forma):
    a_utm = lambda x, y, z=None: (x + origin["E_centro"], -y + origin["N_centro"])
    huellas = [transforma(a_utm, shape(f["geometry"])).buffer(MARGEN_EDIFICIO_M) for f in edificios]
    return rasterize([(h, 1) for h in huellas], out_shape=forma, transform=tr, fill=0, dtype="uint8") > 0


def cimas(suave, veg):
    """Máximos locales con ventana variable según la altura del propio píxel."""
    resultado = np.zeros(suave.shape, bool)
    limites = [h for h, _ in VENTANAS[1:]] + [np.inf]
    for (desde, px), hasta in zip(VENTANAS, limites):
        disco = np.hypot(*np.mgrid[-(px // 2):px // 2 + 1, -(px // 2):px // 2 + 1]) <= px / 2
        es_max = suave == ndimage.maximum_filter(suave, footprint=disco)
        resultado |= es_max & (suave >= desde) & (suave < hasta)
    return resultado & veg & (suave > ALTURA_COPA_MIN_M)


def clasifica(h, r, rgb, verde, aislamiento):
    """Tipo de árbol por forma (altura, radio) y color de la copa en la ortofoto."""
    rr, gg, bb = (c / 255 for c in rgb)
    v = max(rr, gg, bb)
    tono_azulado = bb / max(gg, 1e-3)
    if r <= 1.4 and h >= 4.5:
        return "cipres"
    # Palmera: copa pequeña, suelta y de hoja gris verdosa (poco índice de verde)
    if 1.2 <= r <= 2.8 and h >= 3.0 and verde < 0.03 and aislamiento >= 0.7:
        return "palmera"
    if h >= 13 and r / h <= 0.3 and v >= 0.26:
        return "chopo"
    if v < 0.24 and tono_azulado > 0.62 and h >= 5:
        return "conifera"
    return "frondosa"


def tipo_por_manchas(arboles, manchas):
    """En cada mancha de arbolado con bastantes copas, el tipo mayoritario (entre frondosa,
    conífera y chopo) se impone: un pinar no tiene chopos sueltos por una copa más clara."""
    grupos = {}
    for a in arboles:
        grupos.setdefault(a["mancha"], []).append(a)
    cambiados = 0
    for mancha, lista in grupos.items():
        comunes = [a for a in lista if a["tipo"] in ("frondosa", "conifera", "chopo")]
        if mancha == 0 or len(comunes) < MANCHA_MIN_COPAS:
            continue
        tipos, cuentas = np.unique([a["tipo"] for a in comunes], return_counts=True)
        mayor = tipos[np.argmax(cuentas)]
        for a in comunes:
            if a["tipo"] != mayor:
                a["tipo"] = str(mayor)
                cambiados += 1
    return cambiados


def hileras(arboles):
    """Alineaciones (árboles de calle o paseo): árboles pequeños con dos vecinos casi opuestos a
    distancias parecidas. Devuelve el número de hilera de cada árbol (0 = ninguna)."""
    # Solo árboles sueltos (su mancha de vegetación tiene 1–2 copas): en un pinar plantado a
    # marco real también hay «filas», pero no son árboles de calle
    copas_mancha = {}
    for a in arboles:
        copas_mancha[a["mancha"]] = copas_mancha.get(a["mancha"], 0) + 1
    idx = [i for i, a in enumerate(arboles)
           if a["radio"] <= 3.0 and a["altura"] <= 12 and copas_mancha[a["mancha"]] <= 2]
    pos = np.array([[arboles[i]["x"], arboles[i]["z"]] for i in idx])
    arbol = cKDTree(pos)
    padre = list(range(len(idx)))

    def raiz(i):
        while padre[i] != i:
            padre[i] = padre[padre[i]]
            i = padre[i]
        return i

    en_hilera = np.zeros(len(idx), bool)
    for i, p in enumerate(pos):
        vecinos = [j for j in arbol.query_ball_point(p, HILERA_SEPARACION_M[1]) if j != i]
        vecinos = [j for j in vecinos if np.hypot(*(pos[j] - p)) >= HILERA_SEPARACION_M[0]]
        for a_ in range(len(vecinos)):
            for b_ in range(a_ + 1, len(vecinos)):
                va, vb = pos[vecinos[a_]] - p, pos[vecinos[b_]] - p
                da, db = np.hypot(*va), np.hypot(*vb)
                if max(da, db) / min(da, db) < 1.4 and va @ vb / (da * db) < -0.97:
                    en_hilera[i] = True
                    for j in (vecinos[a_], vecinos[b_]):
                        padre[raiz(j)] = raiz(i)
    grupos = {}
    for i in range(len(idx)):
        if en_hilera[i] or any(en_hilera[j] and raiz(j) == raiz(i) for j in arbol.query_ball_point(pos[i], HILERA_SEPARACION_M[1])):
            grupos.setdefault(raiz(i), []).append(idx[i])
    numero = np.zeros(len(arboles), int)
    n = 0
    for miembros in grupos.values():
        if len(miembros) >= HILERA_MIN_ARBOLES:
            n += 1
            numero[miembros] = n
    return numero


def aplica_correcciones(arboles, ruta):
    """tools/arboles_tipos.json → "correcciones": lista de reglas que cambian el tipo:
      {x, z, radio, tipo}            todo árbol dentro del círculo
      {linea: [[x, z], …], ancho, tipo}   todo árbol a menos de «ancho» de la polilínea
    tipo "quitar" elimina el árbol (falso positivo)."""
    if not ruta.is_file():
        return arboles, 0
    from shapely.geometry import LineString
    reglas = json.loads(ruta.read_text(encoding="utf-8")).get("correcciones", [])
    for regla in reglas:
        if "linea" in regla:
            regla["_geom"] = LineString(regla["linea"]).buffer(regla.get("ancho", 2.0))
    cambios = 0
    quedan = []
    for a in arboles:
        for regla in reglas:
            dentro = (regla["_geom"].contains(Point(a["x"], a["z"])) if "_geom" in regla else
                      (a["x"] - regla["x"]) ** 2 + (a["z"] - regla["z"]) ** 2 <= regla["radio"] ** 2)
            if dentro:
                a["tipo"] = regla["tipo"]
                cambios += 1
        if a["tipo"] != "quitar":
            quedan.append(a)
    return quedan, cambios


def vista_previa(orto, arboles, origin, ruta, px_por_m, recorte=None):
    """Círculos de copa sobre la ortofoto (color = tipo). recorte = (x0, z0, lado) en metros."""
    s_src = orto.shape[1] / origin["ancho"]
    if recorte:
        x0, z0, lado = recorte
        c0, f0 = int((x0 + origin["ancho"] / 2) * s_src), int((z0 + origin["alto"] / 2) * s_src)
        trozo = orto[f0:f0 + int(lado * s_src), c0:c0 + int(lado * s_src)]
        tam = (int(lado * px_por_m),) * 2
    else:
        x0, z0 = -origin["ancho"] / 2, -origin["alto"] / 2
        trozo = orto
        tam = (int(origin["ancho"] * px_por_m), int(origin["alto"] * px_por_m))
    img = Image.fromarray(np.clip(trozo, 0, 255).astype(np.uint8)).resize(tam, Image.LANCZOS)
    d = ImageDraw.Draw(img, "RGBA")
    for a in arboles:
        cx, cz = (a["x"] - x0) * px_por_m, (a["z"] - z0) * px_por_m
        if not (-20 <= cx <= tam[0] + 20 and -20 <= cz <= tam[1] + 20):
            continue
        rr = max(1.5, a["radio"] * px_por_m)
        d.ellipse([cx - rr, cz - rr, cx + rr, cz + rr], outline=COLORES_TIPO[a["tipo"]] + (255,), width=1)
    y = 6
    for tipo, color in COLORES_TIPO.items():
        n = sum(a["tipo"] == tipo for a in arboles)
        d.rectangle([6, y, 210, y + 18], fill=(0, 0, 0, 150))
        d.text((10, y + 1), f"{tipo}: {n}", fill=color, font=FUENTE)
        y += 20
    img.save(ruta, quality=88)


def main() -> int:
    config = cargar_config()
    origin = cargar_origin(config)
    processed, assets, previews = dir_processed(config), dir_assets(config), dir_previews(config)
    previews.mkdir(parents=True, exist_ok=True)

    ndsm, orto, tr = lee_rasters(processed)
    paso = tr.a
    edificios = json.loads((assets / "buildings.geojson").read_text(encoding="utf-8"))["features"]
    ocupado = mascara_edificios(edificios, origin, tr, ndsm.shape)

    r, g, b = orto[..., 0], orto[..., 1], orto[..., 2]
    verdor = (2 * g - r - b) / (r + g + b + 1)
    verde_cerca = ndimage.maximum_filter(ndimage.gaussian_filter(verdor, 1.0), size=ENTORNO_VERDOR_PX)
    veg = (ndsm > ALTURA_MIN_M) & ~ocupado & (verde_cerca > VERDOR_MIN)
    veg = ndimage.binary_opening(veg, iterations=1)
    veg = ndimage.binary_fill_holes(veg)            # huecos de sombra dentro de una copa
    print(f"Vegetación alta: {veg.sum() * paso * paso / 1e4:.2f} ha")

    suave = ndimage.gaussian_filter(np.where(veg, ndsm, 0), SIGMA_SUAVIZADO_PX)
    marcas, n = ndimage.label(cimas(suave, veg))
    print(f"Cimas: {n}")
    copas = watershed(-suave, marcas, mask=veg)
    manchas, _ = ndimage.label(veg)

    indices = np.arange(1, n + 1)
    area_px = ndimage.sum_labels(np.ones_like(ndsm), copas, indices)
    alturas = np.array(ndimage.labeled_comprehension(ndsm, copas, indices, lambda v: np.percentile(v, 98), float, 0))
    rugosidad = ndimage.standard_deviation(ndsm, copas, indices)
    verde_copa = ndimage.median(verdor, copas, indices)
    centros = ndimage.center_of_mass(np.ones_like(ndsm), copas, indices)
    # Aislamiento: fracción del anillo alrededor de la copa que no es vegetación alta
    anillo = ndimage.grey_dilation(copas, size=5) * (copas == 0)
    libre = ndimage.mean(~veg, anillo, indices)
    brillo = orto.sum(axis=-1)

    objetos = ndimage.find_objects(copas)
    arboles = []
    planos = 0
    for k, (f, c) in enumerate(centros):
        area = area_px[k] * paso * paso
        h = float(alturas[k])
        if area < AREA_MIN_M2 or h < ALTURA_COPA_MIN_M:
            continue
        if rugosidad[k] < RUGOSIDAD_MIN_M and area > 4:
            planos += 1
            continue
        caja = objetos[k]
        dentro = copas[caja] == k + 1
        pix = orto[caja][dentro]
        luz = brillo[caja][dentro]
        iluminados = pix[luz >= np.median(luz)]
        rgb = np.median(iluminados, axis=0)
        # Gris claro y sin color: cubierta o toldo que no está en el Catastro
        if rgb.min() > 150 and rgb.max() - rgb.min() < 25:
            planos += 1
            continue
        radio = float(np.sqrt(area / np.pi))
        e = tr.c + (c + 0.5) * paso
        nn = tr.f - (f + 0.5) * paso
        x, z = utm_a_local(origin, e, nn)
        tipo = clasifica(h, radio, rgb, float(verde_copa[k]),
                         float(libre[k]) if not np.isnan(libre[k]) else 0.0)
        arboles.append({"x": x, "z": z, "altura": h, "radio": radio, "tipo": tipo,
                        "color": [int(v) for v in rgb], "mancha": int(manchas[int(round(f)), int(round(c))]),
                        "verde": round(float(verde_copa[k]), 3), "rugosidad": round(float(rugosidad[k]), 2),
                        "aislamiento": round(float(libre[k]), 2) if not np.isnan(libre[k]) else 0.0})
    print(f"Descartadas por planas o grises (toldos, casetas, camiones): {planos}")
    print(f"Cambios de tipo por mancha: {tipo_por_manchas(arboles, manchas)}")
    for a, h in zip(arboles, hileras(arboles)):
        a["hilera"] = int(h)
    print(f"Hileras (alineaciones de calle): {len({a['hilera'] for a in arboles}) - 1}, "
          f"{sum(a['hilera'] > 0 for a in arboles)} árboles")

    arboles, cambios = aplica_correcciones(arboles, RAIZ / "tools" / "arboles_tipos.json")
    if cambios:
        print(f"Correcciones manuales aplicadas: {cambios}")

    hs = np.array([a["altura"] for a in arboles])
    rs = np.array([a["radio"] for a in arboles])
    print(f"Árboles: {len(arboles)} · altura p10/p50/p90 = {np.percentile(hs, [10, 50, 90]).round(1)} m"
          f" · radio p10/p50/p90 = {np.percentile(rs, [10, 50, 90]).round(1)} m")
    for tipo in TIPOS:
        print(f"  {tipo}: {sum(a['tipo'] == tipo for a in arboles)}")

    salida = {
        "sistema": "local (m): x = E − E_centro, z = −(N − N_centro); el suelo se toma del terreno",
        "fuente": "nDSM LiDAR 2024 (Gobierno de Navarra) + ortofoto PNOA (IGN)",
        "tipos": TIPOS,
        "campos": ["x", "z", "altura", "radio", "tipo", "r", "g", "b"],
        "arboles": [[round(a["x"], 2), round(a["z"], 2), round(a["altura"], 1), round(a["radio"], 2),
                     TIPOS.index(a["tipo"]), *a["color"]] for a in arboles],
    }
    (assets / "arboles.json").write_text(json.dumps(salida, separators=(",", ":")), encoding="utf-8")
    # Atributos de cada copa para ajustar la clasificación
    (processed / "arboles_atributos.json").write_text(json.dumps(arboles), encoding="utf-8")

    # Vistas previas sobre la ortofoto original (0,25 m)
    with rasterio.open(processed / "orto_mosaico.tif") as ds:
        orto_hd = np.moveaxis(ds.read(), 0, -1)
    vista_previa(orto_hd, arboles, origin, previews / "arboles.jpg", 1.0)
    vista_previa(orto_hd, arboles, origin, previews / "arboles_detalle.jpg", 3.0, recorte=(-200, -200, 400))
    print(f"→ {assets / 'arboles.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
