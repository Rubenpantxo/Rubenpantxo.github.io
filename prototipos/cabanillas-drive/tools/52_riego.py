"""Riego a manta (PLAN_AGRICULTURA.md §5.5, fase A7): cotas, boqueras y llenado de cada parcela.

Para cada parcela de config.json → agricultura.riego.parcelas:
  - Rejilla de cotas (celda_m, 1 m) con el terreno del juego (public/assets/terrain: el MDT del LiDAR
    que usa la física), plano ajustado (pendiente y hacia dónde baja) y microrrelieve.
  - Boqueras: la celda de dentro de la parcela más cercana a cada una.
  - Simulación del riego con el mismo modelo que el juego (src/agricultura/riego.js): lámina de agua
    por celda, flujo a las cuatro vecinas con la ecuación «inercial local» (Bates y otros, 2010) y
    rozamiento de Manning, caudal por las boqueras, infiltración que baja al mojarse el suelo.
    Tiempo hasta cubrir el 50, 90 y 100 % y lámina infiltrada.
  - Vista para Rubén (como la herramienta del vídeo 3): ortofoto con la acequia y las boqueras,
    cotas con curvas de nivel y flechas hacia donde corre el agua, y orden de llegada del agua.

Salidas (re-ejecutable):
  public/assets/agricultura/riego.json                     (lo lee el juego: modelo y boqueras)
  data/processed/previews/agricultura/riego_<ref>.jpg       (vista para revisar)

Uso:  conda run -n cabdrive python tools/52_riego.py
"""
from __future__ import annotations

import importlib
import json
import math
import sys
import time

import numpy as np
from PIL import Image, ImageDraw
from shapely import contains_xy
from shapely.geometry import Polygon

from comun import cargar_config, cargar_origin, dir_assets, dir_previews, dir_processed

parcelas_mod = importlib.import_module("50_parcelas")      # ortofoto, letra y colores de las vistas

G = 9.81


def falla(mensaje: str) -> None:
    print(f"ERROR: {mensaje}")
    sys.exit(1)


# ------------------------------------------------------------------ terreno del juego
def carga_terreno(assets):
    meta = json.loads((assets / "terrain" / "terrain.json").read_text(encoding="utf-8"))
    alturas = np.fromfile(assets / "terrain" / "terrain.f32", dtype="<f4").reshape(meta["filas"], meta["columnas"])
    x0, z0, paso = meta["vertice_0"]["x"], meta["vertice_0"]["z"], meta["paso_m"]

    def altura(x, z):
        """Bilineal, como alturaEn() de src/datos/terreno.js (x, z: arrays)."""
        fc = np.clip((np.asarray(x) - x0) / paso, 0, meta["columnas"] - 1.000001)
        ff = np.clip((np.asarray(z) - z0) / paso, 0, meta["filas"] - 1.000001)
        c, f = np.floor(fc).astype(int), np.floor(ff).astype(int)
        tc, tf = fc - c, ff - f
        arriba = alturas[f, c] * (1 - tc) + alturas[f, c + 1] * tc
        abajo = alturas[f + 1, c] * (1 - tc) + alturas[f + 1, c + 1] * tc
        return arriba * (1 - tf) + abajo * tf

    return meta, altura


# ------------------------------------------------------------------ rejilla de la parcela
def rejilla(parcela, M, altura):
    celda = M["celda_m"] if parcela["superficie_ha"] <= M["celda_grande_desde_ha"] else M["celda_grande_m"]
    x0, z0, x1, z1 = parcela["caja"]
    ox, oz = x0 - celda, z0 - celda
    nx, nz = math.ceil((x1 - x0) / celda) + 2, math.ceil((z1 - z0) / celda) + 2
    xs = ox + (np.arange(nx) + 0.5) * celda
    zs = oz + (np.arange(nz) + 0.5) * celda
    X, Z = np.meshgrid(xs, zs)
    poligono = Polygon(parcela["partes"][0][0], holes=parcela["partes"][0][1:])
    for parte in parcela["partes"][1:]:
        poligono = poligono.union(Polygon(parte[0], holes=parte[1:]))
    dentro = contains_xy(poligono, X, Z)
    cota = altura(X, Z).astype(np.float64)
    return {"celda": celda, "ribazo_m": M["ribazo_cm"] / 100, "ox": ox, "oz": oz, "nx": nx, "nz": nz, "X": X, "Z": Z, "dentro": dentro, "cota": cota,
            "poligono": poligono}


def plano(R):
    d = R["dentro"]
    A = np.c_[R["X"][d], R["Z"][d], np.ones(d.sum())]
    coef, *_ = np.linalg.lstsq(A, R["cota"][d], rcond=None)
    a, b, _ = coef
    pendiente = math.hypot(a, b) * 100
    # Hacia dónde baja: −gradiente; rumbo 0 = norte (−Z), 90 = este (+X)
    gx, gz = -a, -b
    rumbo = (math.degrees(math.atan2(gx, -gz)) + 360) % 360
    resto = R["cota"] - (a * R["X"] + b * R["Z"] + coef[2])
    # Ribazo: lo que sobresale del plano de la parcela más de ribazo_cm (las lindes, que no se riegan)
    R["regable"] = d & (resto <= R["ribazo_m"])
    return {"pendiente_pct": round(pendiente, 3), "baja_hacia_grados": round(rumbo, 1),
            "microrrelieve_cm": round(float(resto[R["regable"]].std()) * 100, 1),
            "ribazo_pct": round(float((d & ~R["regable"]).sum() / d.sum() * 100), 1), "coef": coef}


def celda_boquera(R, x, z):
    d2 = (R["X"] - x) ** 2 + (R["Z"] - z) ** 2
    d2[~R["dentro"]] = np.inf
    j, i = np.unravel_index(np.argmin(d2), d2.shape)
    return int(i), int(j)


# ------------------------------------------------------------------ simulación (igual que riego.js)
class Riego:
    def __init__(self, R, M, boqueras):
        self.R, self.M = R, M
        self.c = R["celda"]
        self.z = R["cota"]
        self.dentro = R["dentro"]
        nz, nx = self.z.shape
        self.h = np.zeros((nz, nx))
        self.qx = np.zeros((nz, nx - 1))
        self.qz = np.zeros((nz - 1, nx))
        self.W = np.where(self.dentro, M["humedad_lluvia"] * M["agua_util_mm"], 0.0)   # agua del suelo, mm
        self.boqueras = boqueras
        self.abierta = True
        self.t = 0.0
        self.llegada = np.full((nz, nx), np.nan)
        self.entrada_m3 = 0.0
        self.abre_x = self.dentro[:, :-1] & self.dentro[:, 1:]
        self.abre_z = self.dentro[:-1, :] & self.dentro[1:, :]
        self.n2 = M["manning_n"] ** 2
        self.f0 = M["infiltracion_inicial_mmh"] / 1000 / 3600
        self.fb = M["infiltracion_basica_mmh"] / 1000 / 3600
        self.caudal = M["caudal_boquera_ls"] / 1000

    def dt_max(self):
        hmax = max(float(self.h.max()), 0.01)
        return min(2.0, 0.7 * self.c / math.sqrt(G * hmax))

    def paso(self, dt):
        c, z, h = self.c, self.z, self.h
        eta = z + h
        # Caras entre columnas (x) y entre filas (z)
        for eje in (1, 0):
            if eje == 1:
                ea, eb, za, zb, q, abre = eta[:, :-1], eta[:, 1:], z[:, :-1], z[:, 1:], self.qx, self.abre_x
            else:
                ea, eb, za, zb, q, abre = eta[:-1, :], eta[1:, :], z[:-1, :], z[1:, :], self.qz, self.abre_z
            hf = np.maximum(ea, eb) - np.maximum(za, zb)
            S = (eb - ea) / c
            mojada = abre & (hf > 1e-4)
            hfs = np.where(mojada, hf, 1.0)
            nuevo = (q - G * hfs * dt * S) / (1 + G * dt * self.n2 * np.abs(q) / hfs ** (7 / 3))
            q[...] = np.where(mojada, nuevo, 0.0)
        # Limitador: ninguna celda da más agua de la que tiene
        qx, qz = self.qx, self.qz
        sale = np.zeros_like(h)
        sale[:, :-1] += np.maximum(qx, 0)
        sale[:, 1:] += np.maximum(-qx, 0)
        sale[:-1, :] += np.maximum(qz, 0)
        sale[1:, :] += np.maximum(-qz, 0)
        sale *= dt / c
        factor = np.where(sale > h, h / np.maximum(sale, 1e-12), 1.0)
        qx *= np.where(qx > 0, factor[:, :-1], factor[:, 1:])
        qz *= np.where(qz > 0, factor[:-1, :], factor[1:, :])
        dh = np.zeros_like(h)
        dh[:, :-1] -= qx
        dh[:, 1:] += qx
        dh[:-1, :] -= qz
        dh[1:, :] += qz
        h += dh * dt / c
        np.maximum(h, 0, out=h)
        # Boqueras
        if self.abierta:
            for i, j in self.boqueras:
                h[j, i] += self.caudal * dt / (c * c)
                self.entrada_m3 += self.caudal * dt
        # Infiltración (baja según se llena el suelo); lo que pasa de agua_util se pierde en profundidad
        Wmax = self.M["agua_util_mm"]
        f = (self.fb + (self.f0 - self.fb) * (1 - np.minimum(self.W, Wmax) / Wmax)) * dt
        inf = np.minimum(h, f)
        h -= inf
        self.W = np.minimum(Wmax, self.W + inf * 1000)
        self.t += dt
        vis = self.M["lamina_visible_mm"] / 1000
        nuevas = np.isnan(self.llegada) & (h > vis)
        self.llegada[nuevas] = self.t

    def avanza(self, segundos):
        fin = self.t + segundos
        while self.t < fin - 1e-9:
            self.paso(min(self.dt_max(), fin - self.t))

    def cubierto(self):
        r = self.R["regable"]
        return float((~np.isnan(self.llegada) & r).sum() / r.sum())


def simula(R, M, boqueras, max_min):
    s = Riego(R, M, boqueras)
    marcas = {}
    t_cierre = None
    while s.t < max_min * 60:
        s.avanza(10)
        cub = s.cubierto()
        for p in (0.5, 0.9, M["cierre_cubierto"], 0.98, 1.0):
            if cub >= p and p not in marcas:
                marcas[p] = s.t
        # El regante cierra la tajadera cuando el agua llega casi al final (cierre_cubierto)
        if M["cierre_cubierto"] in marcas and s.abierta:
            s.abierta = False
            t_cierre = s.t
        if not s.abierta and float(s.h[R["dentro"]].max()) < M["lamina_visible_mm"] / 1000:
            break
    return s, marcas, t_cierre


# ------------------------------------------------------------------ vista
def vista(ref, parcela, R, plano_p, sim, marcas, t_cierre, acequia, boqueras, config, A, origin, processed, previews, aceleracion):
    E0, N0 = origin["E_centro"], origin["N_centro"]
    px_m = float(A["riego"].get("vista_px_m", 6))
    margen = 12
    x0, z0, x1, z1 = parcela["caja"]
    x0, z0, x1, z1 = x0 - margen, z0 - margen, x1 + margen, z1 + margen
    orto_cfg = dict(A, orto_px_m=px_m)
    orto, px_m = parcelas_mod.mosaico_orto(config, orto_cfg, (E0 + x0, N0 - z1, E0 + x1, N0 - z0), processed)
    W, H = orto.size

    def P(x, z):
        return ((x - x0) * px_m, (z - z0) * px_m)

    def linde(d, color, ancho=3):
        for anillo in parcela["partes"][0]:
            d.line([P(*p) for p in anillo + [anillo[0]]], fill=color, width=ancho)

    def acequia_y_boqueras(d):
        d.line([P(*p) for p in acequia], fill=(40, 230, 90), width=4)
        for k, (bx, bz) in enumerate(boqueras):
            x, y = P(bx, bz)
            d.ellipse([x - 9, y - 9, x + 9, y + 9], outline=(0, 200, 255), width=4)
            parcelas_mod.texto_con_borde(d, (x + 16, y - 14), f"B{k + 1}", 22, (120, 230, 255))

    # Panel 1: ortofoto
    p1 = orto.copy().convert("RGBA")
    d1 = ImageDraw.Draw(p1)
    linde(d1, (255, 80, 255))
    acequia_y_boqueras(d1)

    # Rejilla a la vista: cada celda → rectángulo
    c = R["celda"]

    def pinta_celdas(img, colores, mascara):
        capa = Image.new("RGBA", img.size, (0, 0, 0, 0))
        dc = ImageDraw.Draw(capa)
        for j in range(R["nz"]):
            for i in range(R["nx"]):
                if not mascara[j, i]:
                    continue
                xa, za = R["ox"] + i * c, R["oz"] + j * c
                dc.rectangle([*P(xa, za), *P(xa + c, za + c)], fill=tuple(int(v) for v in colores[j, i]) + (235,))
        return Image.alpha_composite(img, capa)

    # Panel 2: cotas relativas, curvas cada 5 cm y flechas hacia donde corre el agua
    d = R["dentro"]
    cota = R["cota"]
    lo, hi = np.percentile(cota[d], 1), np.percentile(cota[d], 99)
    t = np.clip((cota - lo) / max(hi - lo, 1e-3), 0, 1)
    colores2 = parcelas_mod.color_cota(t)
    colores2[d & ~R["regable"]] = (150, 150, 150)
    p2 = pinta_celdas(orto.convert("L").convert("RGBA"), colores2, d)
    d2 = ImageDraw.Draw(p2)
    # Curvas de nivel (bordes entre celdas de distinto escalón de 5 cm)
    esc = np.floor((cota - lo) / 0.05)
    for j in range(R["nz"]):
        for i in range(R["nx"]):
            if not d[j, i]:
                continue
            xa, za = R["ox"] + i * c, R["oz"] + j * c
            if i + 1 < R["nx"] and d[j, i + 1] and esc[j, i + 1] != esc[j, i]:
                d2.line([P(xa + c, za), P(xa + c, za + c)], fill=(20, 20, 20), width=1)
            if j + 1 < R["nz"] and d[j + 1, i] and esc[j + 1, i] != esc[j, i]:
                d2.line([P(xa, za + c), P(xa + c, za + c)], fill=(20, 20, 20), width=1)
    # Flechas: gradiente de la cota suavizada (media de 5 × 5 m), cada 6 m
    k = max(1, round(2.5 / c))
    pad = np.pad(np.where(d, cota, np.nan), k, mode="edge")
    suave = np.zeros_like(cota)
    for j in range(R["nz"]):
        for i in range(R["nx"]):
            v = pad[j:j + 2 * k + 1, i:i + 2 * k + 1]
            suave[j, i] = np.nanmean(v) if np.isfinite(v).any() else cota[j, i]
    gz_, gx_ = np.gradient(suave, c)
    paso = max(1, round(6 / c))
    for j in range(paso // 2, R["nz"], paso):
        for i in range(paso // 2, R["nx"], paso):
            if not d[j, i]:
                continue
            gx, gz = -gx_[j, i], -gz_[j, i]
            m = math.hypot(gx, gz)
            if m < 1e-5:
                continue
            x, y = P(R["X"][j, i], R["Z"][j, i])
            L = 2.6 * px_m
            ex, ey = x + gx / m * L, y + gz / m * L
            d2.line([x, y, ex, ey], fill=(255, 255, 255), width=3)
            a = math.atan2(ey - y, ex - x)
            for s in (2.6, -2.6):
                d2.line([ex, ey, ex - 9 * math.cos(a + s / 3), ey - 9 * math.sin(a + s / 3)], fill=(255, 255, 255), width=3)
    linde(d2, (255, 255, 255), 2)
    acequia_y_boqueras(d2)

    # Panel 3: orden de llegada del agua (minutos de riego)
    ll = sim.llegada / 60
    fin = np.nanmax(ll[d]) if np.isfinite(ll[d]).any() else 1
    tt = np.clip(np.nan_to_num(ll, nan=fin) / max(fin, 1e-3), 0, 1)
    # Azul (primero) → verde → amarillo → rojo (último)
    colores = parcelas_mod.color_cota(tt)
    p3 = pinta_celdas(orto.convert("L").convert("RGBA"), colores, d & ~np.isnan(ll))
    d3 = ImageDraw.Draw(p3)
    paso_min = 5 if fin > 25 else 2
    iso = np.floor(np.nan_to_num(ll, nan=1e9) / paso_min)
    for j in range(R["nz"]):
        for i in range(R["nx"]):
            if not d[j, i]:
                continue
            xa, za = R["ox"] + i * c, R["oz"] + j * c
            if i + 1 < R["nx"] and d[j, i + 1] and iso[j, i + 1] != iso[j, i]:
                d3.line([P(xa + c, za), P(xa + c, za + c)], fill=(10, 10, 10), width=2)
            if j + 1 < R["nz"] and d[j + 1, i] and iso[j + 1, i] != iso[j, i]:
                d3.line([P(xa, za + c), P(xa + c, za + c)], fill=(10, 10, 10), width=2)
    linde(d3, (255, 255, 255), 2)
    acequia_y_boqueras(d3)

    # Norte arriba en los tres (−Z arriba ya: z crece hacia el sur, y crece hacia abajo)
    for img in (p1, p2, p3):
        dd = ImageDraw.Draw(img)
        parcelas_mod.texto_con_borde(dd, (W - 30, 24), "N ↑", 24)
    sep = 12
    tira = Image.new("RGB", (3 * W + 2 * sep, H), (24, 24, 28))
    for k, img in enumerate((p1, p2, p3)):
        tira.paste(img.convert("RGB"), (k * (W + sep), 0))
    dd = ImageDraw.Draw(tira)
    titulos = ["Ortofoto: acequia (verde) y boqueras", f"Cotas: {lo + origin['H_base']:.2f}–{hi + origin['H_base']:.2f} m, curvas cada 5 cm",
               f"Llegada del agua (curvas cada {paso_min} min)"]
    for k, ti in enumerate(titulos):
        parcelas_mod.texto_con_borde(dd, (k * (W + sep) + 12, H - 34), ti, 20, centro=False)

    M = A["riego"]["modelo"]
    cierre = M["cierre_cubierto"]
    mm = sim.entrada_m3 / (parcela["superficie_m2"]) * 1000
    infil = sim.W[R["regable"]] - M["humedad_lluvia"] * M["agua_util_mm"]
    lineas = [
        ((40, 230, 90), "Acequia (ortofoto PNOA, ±1 m)"),
        ((0, 200, 255), f"Boqueras: {len(boqueras)} × {M['caudal_boquera_ls']} L/s (orientativo)"),
        (None, f"Pendiente media {plano_p['pendiente_pct']:.2f} % hacia {plano_p['baja_hacia_grados']:.0f}° · microrrelieve ±{plano_p['microrrelieve_cm']:.1f} cm"),
        ((150, 150, 150), f"Ribazo de las lindes ({plano_p['ribazo_pct']:.0f} %, más de {M['ribazo_cm']} cm sobre el plano): no se riega"),
        (None, f"Cubre el 50 % en {marcas.get(0.5, float('nan')) / 60:.0f} min y el {cierre * 100:.0f} % en {marcas.get(cierre, float('nan')) / 60:.0f} (se cierra la tajadera); el resto llega con lo que queda"),
        (None, f"En el juego (×{aceleracion:.0f}: un día de cultivo por hora): {marcas.get(cierre, float('nan')) / 60 / aceleracion:.1f} min de juego"),
        (None, f"Agua aplicada {mm:.0f} mm · infiltrada {infil.mean():.0f} mm de media ({np.percentile(infil, 5):.0f}–{np.percentile(infil, 95):.0f}; el suelo guarda {M['agua_util_mm']} mm)"),
        (None, "Flechas blancas: hacia dónde baja el terreno (media de 5 m)"),
        (None, "Colores de cota y de llegada: azul bajo / primero → rojo alto / último"),
    ]
    salida = parcelas_mod.leyenda(tira, lineas, f"Riego a manta de la parcela {ref} ({parcela['paraje']}, {parcela['superficie_ha']:.2f} ha)", tam=24)
    previews.mkdir(parents=True, exist_ok=True)
    ruta = previews / f"riego_{ref}.jpg"
    salida.save(ruta, quality=90)
    return ruta


# ------------------------------------------------------------------ principal
def main() -> int:
    config = cargar_config()
    A = config["agricultura"]
    RG = A.get("riego")
    if not RG:
        falla("config.json no tiene agricultura.riego")
    origin = cargar_origin(config)
    assets = dir_assets(config)
    processed = dir_processed(config)
    previews = dir_previews(config) / "agricultura"
    M = RG["modelo"]
    _, altura = carga_terreno(assets)
    todas = {p["ref"]: p for p in json.loads((assets / "agricultura" / "parcelas.json").read_text(encoding="utf-8"))["parcelas"]}
    # Mismo ritmo que el juego: un día de cultivo cada hora de juego (src/config/agricultura.js)
    aceleracion = 24.0
    salida = {"version": 1, "fecha": time.strftime("%Y-%m-%d"), "nota": RG.get("nota", ""), "modelo": M,
              "convencion": "coordenadas locales del juego (x, z; norte = −Z)", "parcelas": {}}
    for ref, datos in RG["parcelas"].items():
        parcela = todas.get(ref)
        if not parcela:
            falla(f"la parcela {ref} no está en parcelas.json")
        if parcela.get("zona_juego") != "dentro":
            print(f"  aviso: {ref} no está entera en la zona del juego; la cota fuera sale del MDT05 (metros enteros)")
        print(f"Parcela {ref} ({parcela['paraje']}, {parcela['superficie_ha']} ha)")
        R = rejilla(parcela, M, altura)
        pl = plano(R)
        print(f"  rejilla {R['nx']} × {R['nz']} celdas de {R['celda']} m ({int(R['dentro'].sum())} dentro)")
        print(f"  pendiente {pl['pendiente_pct']} % hacia {pl['baja_hacia_grados']}° · microrrelieve ±{pl['microrrelieve_cm']} cm"
              f" · ribazo (más de {M['ribazo_cm']} cm sobre el plano) {pl['ribazo_pct']} %"
              f" (parcelas.json: {parcela['cota']['pendiente_pct']} % hacia {parcela['cota']['baja_hacia_grados']}°)")
        boqueras = [celda_boquera(R, x, z) for x, z in datos["boqueras"]]
        for k, ((x, z), (i, j)) in enumerate(zip(datos["boqueras"], boqueras)):
            print(f"  boquera B{k + 1}: ({x}, {z}) → celda ({i}, {j}) a {math.hypot(R['X'][j, i] - x, R['Z'][j, i] - z):.1f} m,"
                  f" cota {R['cota'][j, i] + origin['H_base']:.2f} m")
        t0 = time.time()
        sim, marcas, t_cierre = simula(R, M, boqueras, RG.get("simular_min", 240))
        print(f"  simulación: {sim.t / 60:.0f} min de riego en {time.time() - t0:.1f} s;"
              + "".join(f" {int(p * 100)} % a los {t / 60:.1f} min;" for p, t in sorted(marcas.items()))
              + f" agua aplicada {sim.entrada_m3:.0f} m³ ({sim.entrada_m3 / parcela['superficie_m2'] * 1000:.0f} mm)")
        if M["cierre_cubierto"] not in marcas:
            print("  aviso: el agua no llega a cubrir la parcela en el tiempo simulado")
        ruta = vista(ref, parcela, R, pl, sim, marcas, t_cierre, datos["acequia"], datos["boqueras"], config, A, origin,
                     processed, previews, aceleracion)
        print(f"  vista: {ruta}")
        salida["parcelas"][ref] = {
            "acequia": datos["acequia"],
            "boqueras": [{"x": x, "z": z} for x, z in datos["boqueras"]],
            "celda_m": R["celda"],
            "cota": {"pendiente_pct": pl["pendiente_pct"], "baja_hacia_grados": pl["baja_hacia_grados"],
                     "microrrelieve_cm": pl["microrrelieve_cm"], "ribazo_pct": pl["ribazo_pct"]},
            "simulacion": {f"minutos_{int(p * 100)}": round(t / 60, 1) for p, t in marcas.items()}
                          | {"mm_aplicados": round(sim.entrada_m3 / parcela["superficie_m2"] * 1000)},
        }
    ruta = assets / "agricultura" / "riego.json"
    ruta.write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Escrito {ruta}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
