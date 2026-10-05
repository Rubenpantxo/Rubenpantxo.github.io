"""Paso R2 — Tejados reales desde el LiDAR (MDS a 0,5 m).

Por edificio:
1. Puntos del MDS dentro de la huella (encogida 0,35 m para no coger el borde ni la calle).
2. Hasta 4 planos por RANSAC sucesivo (faldones). El tejado es el mínimo de los planos:
   así salen bien los de un agua, dos aguas, cuatro aguas y los planos, con cumbreras y
   limatesas exactas (cada faldón es la huella recortada por semiplanos, sin escalones).
3. Se elige el número de planos con menos error (penalizando cada plano de más). Si ni así
   cuadra (tejados en L con limahoyas, varias alturas, cubiertas curvas…), malla de rejilla
   del propio MDS filtrado.
4. Aleros de 0,3 m (sin invadir a los vecinos) con su canto y su cara inferior.
5. Muros: la altura de cada lado sigue el borde real del tejado (perfil por lado).

La física no cambia (sigue usando base_y + height de buildings.geojson).

Requiere 01_origin_terrain.py y 03_buildings.py.

Salidas:
    <assets>/tejados.bin   vértices Int16 (cm respecto al punto «ref» de cada edificio) y
                           después índices Uint16, edificio tras edificio
    <assets>/tejados.json  {edificios: {id: {modo, ref: [x, y, z], t: [desde, nVert, desdeIdx, nIdx]
                            faldones, a: igual para aleros, p: [[[t, y, …] por lado] por anillo]}}}
    <processed>/previews/tejados_error.png  (error medio por edificio: tejado − MDS)

Uso: conda run -n cabdrive python tools/09_tejados.py
"""
from __future__ import annotations

import json
import sys
import time

import numpy as np
import rasterio
import shapely
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.spatial import Delaunay
from shapely import STRtree
from shapely.geometry import Polygon, shape
from shapely.ops import unary_union

from comun import cargar_config, cargar_origin, dir_assets, dir_previews, dir_processed
from previews import FUENTE, Lienzo

EROSION_M = 0.35
UMBRAL_PLANO_M = 0.12
MAX_PLANOS = 4
ITERACIONES = 250
PENDIENTE_MAX = 1.2          # tan(50°)
PENALIZA_PLANO_M = 0.04
ERROR_MAX_PLANOS_M = 0.35    # por encima, rejilla
ALERO_M = 0.3
CANTO_ALERO_M = 0.18
PASO_REJILLA_M = 1.0
DECIMALES = 2
SEMILLA = 11


def puntos_mds(mds, tr, origin, poligono):
    """(x, z, h) locales de los píxeles del MDS cuyo centro cae dentro del polígono."""
    x0, z0, x1, z1 = poligono.bounds
    e0, e1 = x0 + origin["E_centro"], x1 + origin["E_centro"]
    n0, n1 = origin["N_centro"] - z1, origin["N_centro"] - z0
    c0 = max(int((e0 - tr.c) / tr.a) - 1, 0)
    c1 = min(int((e1 - tr.c) / tr.a) + 2, mds.shape[1])
    f0 = max(int((tr.f - n1) / -tr.e) - 1, 0)
    f1 = min(int((tr.f - n0) / -tr.e) + 2, mds.shape[0])
    if c1 <= c0 or f1 <= f0:
        return np.empty((0, 3)), None
    cc, ff = np.meshgrid(np.arange(c0, c1), np.arange(f0, f1))
    x = tr.c + (cc + 0.5) * tr.a - origin["E_centro"]
    z = origin["N_centro"] - (tr.f + (ff + 0.5) * tr.e)
    dentro = shapely.contains_xy(poligono, x, z)
    h = mds[f0:f1, c0:c1]
    ok = dentro & np.isfinite(h)
    return np.column_stack([x[ok], z[ok], h[ok]]), (f0, f1, c0, c1, x, z, ok)


def ajusta_plano(p):
    A = np.column_stack([p[:, 0], p[:, 1], np.ones(len(p))])
    sol, *_ = np.linalg.lstsq(A, p[:, 2], rcond=None)
    return sol


def ransac_planos(p, r):
    """Planos h = a·x + b·z + c, de más a menos puntos."""
    planos = []
    quedan = p.copy()
    minimo = max(8, int(0.1 * len(p)))
    for _ in range(MAX_PLANOS):
        if len(quedan) < minimo:
            break
        idx = r.integers(0, len(quedan), size=(ITERACIONES, 3))
        P = quedan[idx]                                         # (it, 3, 3)
        v1, v2 = P[:, 1] - P[:, 0], P[:, 2] - P[:, 0]
        n = np.cross(v1, v2)                                    # normal (nx, nz, nh) en ejes (x, z, h)
        valido = np.abs(n[:, 2]) > 1e-6
        a = -n[:, 0] / np.where(valido, n[:, 2], 1)
        b = -n[:, 1] / np.where(valido, n[:, 2], 1)
        c = P[:, 0, 2] - a * P[:, 0, 0] - b * P[:, 0, 1]
        valido &= np.hypot(a, b) <= PENDIENTE_MAX
        if not valido.any():
            break
        res = np.abs(quedan[:, 2][None, :] - (a[:, None] * quedan[:, 0][None, :] + b[:, None] * quedan[:, 1][None, :] + c[:, None]))
        cuenta = np.where(valido, (res < UMBRAL_PLANO_M).sum(1), -1)
        k = int(np.argmax(cuenta))
        if cuenta[k] < minimo:
            break
        inl = res[k] < UMBRAL_PLANO_M
        plano = ajusta_plano(quedan[inl])
        if np.hypot(plano[0], plano[1]) > PENDIENTE_MAX:
            plano = np.array([a[k], b[k], c[k]])
        planos.append(plano)
        quedan = quedan[np.abs(quedan[:, 2] - (plano[0] * quedan[:, 0] + plano[1] * quedan[:, 1] + plano[2])) >= 2 * UMBRAL_PLANO_M]
    return planos


def superficie(planos, x, z):
    return np.min([a * x + b * z + c for a, b, c in planos], axis=0)


def semiplano(a, b, c, caja):
    """Polígono de la caja (x0, z0, x1, z1) donde a·x + b·z + c ≤ 0 (Sutherland–Hodgman)."""
    x0, z0, x1, z1 = caja
    pts = [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]
    f = lambda q: a * q[0] + b * q[1] + c
    salida = []
    for i, p in enumerate(pts):
        q = pts[(i + 1) % 4]
        fp, fq = f(p), f(q)
        if fp <= 0:
            salida.append(p)
        if (fp <= 0) != (fq <= 0):
            t = fp / (fp - fq)
            salida.append((p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])))
    return Polygon(salida) if len(salida) >= 3 else Polygon()


def triangulos(geom):
    """Triángulos [(x, z)×3] de un (Multi)Polygon, con triangulación restringida."""
    if geom.is_empty or geom.area < 1e-4:
        return []
    salida = []
    for t in shapely.constrained_delaunay_triangles(geom).geoms:
        c = list(t.exterior.coords)[:3]
        if Polygon(c).area > 1e-5:
            salida.append(c)
    return salida


def hacia_arriba(tri):
    (xa, za), (xb, zb), (xc, zc) = tri
    # Normal hacia +y: (b − a) × (c − a) con y arriba ⇒ (zb − za)(xc − xa) − (xb − xa)(zc − za) > 0
    if (zb - za) * (xc - xa) - (xb - xa) * (zc - za) < 0:
        return [tri[0], tri[2], tri[1]]
    return tri


def anillos_geojson(f):
    salida = []
    for anillo in f["geometry"]["coordinates"]:
        a = [tuple(p) for p in anillo]
        if a[0] == a[-1]:
            a = a[:-1]
        salida.append(a)
    return salida


def perfil_planos(planos, a, b):
    """[t, y, …] a lo largo del lado a→b: extremos y cambios de faldón."""
    ts = {0.0, 1.0}
    for i in range(len(planos)):
        for j in range(i + 1, len(planos)):
            d = np.array(planos[i]) - np.array(planos[j])
            fa = d[0] * a[0] + d[1] * a[1] + d[2]
            fb = d[0] * b[0] + d[1] * b[1] + d[2]
            if (fa < 0) != (fb < 0) and abs(fa - fb) > 1e-9:
                ts.add(fa / (fa - fb))
    ts = sorted(t for t in ts if 0 <= t <= 1)
    x = np.array([a[0] + t * (b[0] - a[0]) for t in ts])
    z = np.array([a[1] + t * (b[1] - a[1]) for t in ts])
    return ts, superficie(planos, x, z)


def tejado_planos(f, poligono, planos, vecinos, base):
    """Faldones, aleros y perfiles de muro de un tejado de planos."""
    tejado = poligono.buffer(ALERO_M, join_style="mitre", mitre_limit=2.0)
    if vecinos:
        tejado = tejado.difference(unary_union([v.buffer(0.02) for v in vecinos]))
    tejado = unary_union([tejado, poligono])
    if tejado.geom_type == "MultiPolygon":
        tejado = max(tejado.geoms, key=lambda g: g.intersection(poligono).area)
    x0, z0, x1, z1 = tejado.bounds
    caja = (x0 - 1, z0 - 1, x1 + 1, z1 + 1)
    t, a = [], []
    for i, (ai, bi, ci) in enumerate(planos):
        region = tejado
        for j, (aj, bj, cj) in enumerate(planos):
            if i != j:
                region = region.intersection(semiplano(ai - aj, bi - bj, ci - cj, caja))
                if region.is_empty:
                    break
        for tri in triangulos(region):
            for x, z in hacia_arriba(tri):
                t += [x, ai * x + bi * z + ci, z]
    # Aleros: cara inferior (mirando abajo) y canto
    vuelo = tejado.difference(poligono)
    for tri in triangulos(vuelo):
        tri = hacia_arriba(tri)[::-1]
        for x, z in tri:
            a += [x, float(superficie(planos, np.array([x]), np.array([z]))[0]) - CANTO_ALERO_M, z]
    borde = poligono.buffer(0.05)
    for anillo in [tejado.exterior, *tejado.interiors]:
        c = list(anillo.coords)
        for p, q in zip(c[:-1], c[1:]):
            if borde.contains(shapely.Point((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)):
                continue
            yp, yq = superficie(planos, np.array([p[0], q[0]]), np.array([p[1], q[1]]))
            quad = [(p, yp), (q, yq), (q, yq - CANTO_ALERO_M), (p, yp - CANTO_ALERO_M)]
            for k in (0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2):     # por las dos caras (el sentido del anillo varía)
                (x, z), y = quad[k]
                a += [x, y, z]
    # Perfiles de los muros (mismos anillos y orden que buildings.geojson)
    perfiles = []
    for anillo in anillos_geojson(f):
        lados = []
        for k in range(len(anillo)):
            ts, ys = perfil_planos(planos, anillo[k], anillo[(k + 1) % len(anillo)])
            ys = np.maximum(ys, base + 1.0)
            lados.append([v for tt, yy in zip(ts, ys) for v in (tt, yy)])
        perfiles.append(lados)
    return t, a, perfiles


def tejado_rejilla(f, poligono, mds, tr, origin, base, techo):
    """Malla del MDS filtrado (tejados que no son un puñado de planos)."""
    interior = poligono.buffer(-0.25)
    if interior.is_empty:
        interior = poligono
    p, extra = puntos_mds(mds, tr, origin, interior)
    if len(p) < 6:
        return None
    f0, f1, c0, c1, X, Z, ok = extra
    parche = np.where(ok, mds[f0:f1, c0:c1], np.nan)
    _, (fi, ci) = ndimage.distance_transform_edt(~ok, return_indices=True)
    parche = parche[fi, ci]
    parche = ndimage.median_filter(parche, size=3)
    parche = np.clip(parche, base + 1.5, techo + 1.0)

    def altura(x, z):
        e = np.asarray(x) + origin["E_centro"]
        n = origin["N_centro"] - np.asarray(z)
        cc = (e - tr.c) / tr.a - 0.5 - c0
        ff = (tr.f - n) / -tr.e - 0.5 - f0
        return ndimage.map_coordinates(parche, [ff, cc], order=1, mode="nearest")

    paso = PASO_REJILLA_M if poligono.area < 150 else PASO_REJILLA_M * 1.5
    x0, z0, x1, z1 = poligono.bounds
    gx, gz = np.meshgrid(np.arange(x0 + paso / 2, x1, paso), np.arange(z0 + paso / 2, z1, paso))
    dentro = shapely.contains_xy(poligono.buffer(-paso * 0.3), gx, gz)
    borde = np.array(shapely.segmentize(poligono, paso).exterior.coords)[:-1]
    huecos = [np.array(shapely.segmentize(Polygon(h), paso).exterior.coords)[:-1] for h in poligono.interiors]
    pts = np.vstack([borde, *huecos, np.column_stack([gx[dentro], gz[dentro]])])
    if len(pts) < 3:
        return None
    tri = Delaunay(pts)
    centros = pts[tri.simplices].mean(1)
    validos = tri.simplices[shapely.contains_xy(poligono, centros[:, 0], centros[:, 1])]
    ys = altura(pts[:, 0], pts[:, 1])
    t = []
    for s in validos:
        (xa, za), (xb, zb), (xc, zc) = pts[s]
        if (zb - za) * (xc - xa) - (xb - xa) * (zc - za) < 0:
            s = s[[0, 2, 1]]
        for k in s:
            t += [pts[k, 0], float(ys[k]), pts[k, 1]]
    perfiles = []
    for anillo in anillos_geojson(f):
        lados = []
        for k in range(len(anillo)):
            a, b = np.array(anillo[k]), np.array(anillo[(k + 1) % len(anillo)])
            largo = np.hypot(*(b - a))
            n = max(1, int(np.ceil(largo / paso)))
            ts = np.linspace(0, 1, n + 1)
            q = a[None, :] + ts[:, None] * (b - a)[None, :]
            ys_l = np.maximum(altura(q[:, 0], q[:, 1]), base + 1.0)
            lados.append([v for tt, yy in zip(ts, ys_l) for v in (float(tt), float(yy))])
        perfiles.append(lados)
    error = float(np.mean(np.minimum(np.abs(altura(p[:, 0], p[:, 1]) - p[:, 2]), 2.0)))
    return t, [], perfiles, error


def indexa(plano, ref):
    """Triángulos sueltos [x,y,z…] → vértices Int16 (cm respecto a ref) e índices Uint16."""
    v = np.round((np.array(plano, np.float64).reshape(-1, 3) - ref) * 100).astype(np.int64)
    if not len(v):
        return np.empty((0, 3), np.int16), np.empty(0, np.uint16)
    unicos, idx = np.unique(v, axis=0, return_inverse=True)
    if np.abs(unicos).max() > 32767 or len(unicos) > 65535:
        raise ValueError("edificio demasiado grande para Int16/Uint16")
    return unicos.astype(np.int16), idx.reshape(-1).astype(np.uint16)


def redondea(lista):
    return [round(float(v), DECIMALES) for v in lista]


def main() -> int:
    config = cargar_config()
    origin = cargar_origin(config)
    processed, assets, previews = dir_processed(config), dir_assets(config), dir_previews(config)
    with rasterio.open(processed / "mds_clip.tif") as ds:
        mds = ds.read(1, masked=True).filled(np.nan).astype(np.float32) - origin["H_base"]
        tr = ds.transform
    edificios = json.loads((assets / "buildings.geojson").read_text(encoding="utf-8"))["features"]
    poligonos = [shape(f["geometry"]) for f in edificios]
    indice = STRtree(poligonos)
    r = np.random.default_rng(SEMILLA)

    salida, errores = {}, {}
    vertices, indices = [], []
    n_vert, n_idx = 0, 0
    modos = {"planos": 0, "rejilla": 0, "plano_defecto": 0}
    n_planos = []
    t0 = time.time()
    for k, (f, pol) in enumerate(zip(edificios, poligonos)):
        props = f["properties"]
        base, techo = props["base_y"], props["base_y"] + props["height"]
        interior = pol.buffer(-EROSION_M)
        p, _ = puntos_mds(mds, tr, origin, interior if not interior.is_empty else pol)
        vecinos = [poligonos[j] for j in indice.query(pol.buffer(ALERO_M + 0.1)) if j != k]
        resultado, modo, err = None, None, None
        if len(p) >= 10:
            planos = ransac_planos(p, r)
            mejor = None
            for n in range(1, len(planos) + 1):
                e = float(np.mean(np.minimum(np.abs(superficie(planos[:n], p[:, 0], p[:, 1]) - p[:, 2]), 2.0)))
                if mejor is None or e + PENALIZA_PLANO_M * n < mejor[0] + PENALIZA_PLANO_M * mejor[1]:
                    mejor = (e, n)
            if mejor and mejor[0] <= ERROR_MAX_PLANOS_M:
                elegidos = planos[:mejor[1]]
                vert = np.array(pol.buffer(ALERO_M).exterior.coords)
                bajo = superficie(elegidos, vert[:, 0], vert[:, 1]).min()
                if bajo > base + 1.2:
                    resultado = tejado_planos(f, pol, elegidos, vecinos, base)
                    modo, err = "planos", mejor[0]
                    n_planos.append(mejor[1])
            if resultado is None:
                rejilla = tejado_rejilla(f, pol, mds, tr, origin, base, techo)
                if rejilla is not None:
                    modo = "rejilla"
                    *resultado, err = rejilla
        if resultado is None:
            modo = "plano_defecto"                      # el juego hace el techo plano de siempre
            modos[modo] += 1
            continue
        modos[modo] += 1
        t, a, perfiles = resultado
        c = pol.centroid
        ref = np.array([round(c.x, 2), round(base, 2), round(c.y, 2)])
        entrada = {"modo": modo, "ref": ref.tolist(), "p": [[redondea(lado) for lado in anillo] for anillo in perfiles]}
        for clave, plano in (("t", t), ("a", a)):
            v, ix = indexa(plano, ref)
            entrada[clave] = [n_vert, len(v), n_idx, len(ix)]
            vertices.append(v)
            indices.append(ix)
            n_vert += len(v)
            n_idx += len(ix)
        salida[str(props["id"])] = entrada
        if err is not None:
            errores[props["id"]] = err
        if (k + 1) % 400 == 0:
            print(f"  {k + 1}/{len(edificios)} ({time.time() - t0:.0f} s)")

    with (assets / "tejados.bin").open("wb") as fb:
        fb.write(np.concatenate(vertices).astype("<i2").tobytes())
        fb.write(np.concatenate(indices).astype("<u2").tobytes())
    (assets / "tejados.json").write_text(json.dumps({
        "sistema": "local (m); y = altura − H_base",
        "binario": {"archivo": "tejados.bin", "vertices": n_vert, "indices": n_idx,
                    "formato": "Int16 x,y,z en cm desde ref; luego Uint16 índices locales a cada edificio"},
        "fuente": "MDS LiDAR 2024 (Gobierno de Navarra) y huellas del Catastro",
        "edificios": salida}, separators=(",", ":")), encoding="utf-8")

    e = np.array(list(errores.values()))
    tris = sum(v["t"][3] for v in salida.values()) // 3
    tris_a = sum(v["a"][3] for v in salida.values()) // 3
    print(f"Modos: {modos} · planos por tejado: {np.bincount(n_planos).tolist()}")
    print(f"Error medio tejado − MDS: {e.mean():.3f} m (mediana {np.median(e):.3f}, p90 {np.percentile(e, 90):.3f})")
    print(f"Triángulos: tejados {tris}, aleros {tris_a} · {(assets / 'tejados.json').stat().st_size / 1e6:.1f} + {(assets / 'tejados.bin').stat().st_size / 1e6:.1f} MB")

    # Vista previa: error medio por edificio (verde < 0,15 m, amarillo 0,3, rojo > 0,6)
    lienzo = Lienzo(origin, 1.0)
    for f in edificios:
        i = f["properties"]["id"]
        if i not in errores:
            color = (90, 90, 90)
        else:
            v = min(errores[i] / 0.6, 1)
            color = (int(255 * min(1, 2 * v)), int(255 * min(1, 2 * (1 - v))), 40)
        if salida.get(str(i), {}).get("modo") == "rejilla":
            lienzo.geometria(f["geometry"], relleno=color, borde=(255, 255, 255))
        else:
            lienzo.geometria(f["geometry"], relleno=color)
    d = ImageDraw.Draw(lienzo.img)
    d.text((8, 8), f"Error tejado-MDS: medio {e.mean():.2f} m. Borde blanco = malla de rejilla", fill=(255, 255, 255), font=FUENTE)
    lienzo.img.save(previews / "tejados_error.png")
    return 0


if __name__ == "__main__":
    sys.exit(main())
