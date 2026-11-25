// Prueba de la fase A7 del modo agricultura (PLAN_AGRICULTURA.md): riego a manta.
//   1. ?agricultura=riego empieza con el tractor junto a la tajadera B1 de la 2-700; la acequia y
//      las tajaderas están en la escena; el aviso de la tajadera sale (y el botón 💧 en el móvil).
//   2. La 2-700 se prepara y se siembra de trigo (pincel); la parcela de al lado también, sin regar.
//   3. G (o 💧) abre la tajadera: el agua entra con el juego en marcha y se ve la lámina.
//   4. Con las dos boqueras abiertas, el agua cubre la parcela siguiendo el relieve en los mismos
//      tiempos que tools/52_riego.py (mismo modelo); al cerrar la tajadera se va metiendo en el suelo.
//   5. El suelo queda húmedo y se seca con los días; lo sembrado que se riega apunta más agua
//      (crece más) que lo que no se riega.
//   6. El tractor en la tierra mojada: barro (menos agarre).
//   7. Pasar días con el agua corriendo cierra las tajaderas y mete el agua en el suelo.
//   8. Coste de la simulación por fotograma; sin errores de consola.
// Uso: node tools/prueba_riego.mjs <carpeta de capturas> [bajo|medio|alto] [movil]
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const S = process.argv[2];
const calidad = process.argv[3] ?? 'bajo';
const movil = process.argv[4] === 'movil';
const puerto = process.env.PUERTO ?? '5173';
const REF = '2-700';
const datosPython = JSON.parse(readFileSync(new URL('../public/assets/agricultura/riego.json', import.meta.url), 'utf-8'));
mkdirSync(S, { recursive: true });
const b = await chromium.launch({ channel: process.env.CANAL, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const contexto = await b.newContext(movil
  ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }
  : { viewport: { width: 1100, height: 620 } });
let fallos = 0;
const comprueba = (ok, texto) => { console.log(`  ${ok ? 'bien ' : 'FALLO'}  ${texto}`); if (!ok) fallos++; };
const errores = [];
const sufijo = `${movil ? '_movil' : ''}_${calidad}`;
const fotogramas = (p, n = 3) => p.evaluate((k) => new Promise((r) => {
  let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);
const captura = async (p, nombre) => {
  await fotogramas(p, 3);
  await p.screenshot({ path: `${S}/riego_${nombre}${sufijo}.jpg`, quality: 85, timeout: 180000 });
  console.log(`  captura ${S}/riego_${nombre}${sufijo}.jpg`);
};
// Vista desde arriba (pausa: la cámara gira alrededor del vehículo)
const vista = async (p, nombre) => {
  await p.evaluate(() => window.__juego.ponPausa(true));
  await fotogramas(p, 45);
  await captura(p, nombre);
  await p.evaluate(() => window.__juego.ponPausa(false));
};
const p = await contexto.newPage();
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
p.on('pageerror', (e) => errores.push(`PAGEERROR ${e.message}`));
await p.goto(`http://localhost:${puerto}/?calidad=${calidad}&personaje=0&hora=dia&debug=1&agricultura=riego&dia=3`);
await p.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 300000 });
await p.evaluate(() => document.getElementById('jugar').click());
await p.waitForFunction(() => window.__juego.agricultura, null, { timeout: 120000 });
await fotogramas(p, 8);

// --- 1. Acequia, tajaderas y aviso
let r = await p.evaluate((ref) => {
  const j = window.__juego; const m = j.agricultura;
  const s = m.riego.sitios.get(ref);
  return {
    hay: m.riego.hay, tajaderas: s?.acequia.tajaderas.length ?? 0, enTractor: m.llevaTractor,
    acequia: Boolean(j.escena?.getObjectByName?.('canal_acequia') ?? s?.acequia.raiz.getObjectByName('canal_acequia')),
    cerca: m.tajaderaCerca, aviso: document.getElementById('agri-riego')?.textContent ?? '',
    boton: !document.querySelector('[data-pulsar="tajadera"]').hidden,
  };
}, REF);
comprueba(r.hay && r.tajaderas === 2 && r.acequia, `la acequia de la ${REF} y sus ${r.tajaderas} tajaderas están en la escena`);
comprueba(r.enTractor && r.cerca?.nombre === 'B1', `?agricultura=riego empieza en el tractor junto a la tajadera ${r.cerca?.nombre} (a ${r.cerca?.distancia?.toFixed(1)} m)`);
comprueba(/Tajadera B1/.test(r.aviso) && /abrirla/.test(r.aviso), `el aviso de la tajadera sale («${r.aviso}»)`);
if (movil) comprueba(r.boton, 'en el móvil sale el botón 💧');
await captura(p, '0_tajadera');

// --- 2. Parcela preparada y sembrada (y la de al lado, sin regar)
const datos = await p.evaluate(async (ref) => {
  const m = window.__juego.agricultura;
  const d = await (await fetch('/assets/agricultura/parcelas.json')).json();
  const par = d.parcelas.find((x) => x.ref === ref);
  const rr = (par.labor_grados * Math.PI) / 180;
  const e = [Math.sin(rr), -Math.cos(rr)];
  const n = [-e[1], e[0]];
  const c = par.centro;
  const { pinta } = await import('/src/agricultura/pincel.js');
  const linea = (q, cx, cz, t, lab, ancho, op = {}) => pinta(q, lab, cx - e[0] * 300 + n[0] * t, cz - e[1] * 300 + n[1] * t,
    cx + e[0] * 300 + n[0] * t, cz + e[1] * 300 + n[1] * t, ancho, op);
  const q = m.labranza.activa(m.registro.porRef(ref));
  for (let t = -60; t <= 60; t += 2.5) { linea(q, c[0], c[1], t, 'gradear', 3); linea(q, c[0], c[1], t, 'abonar', 3); linea(q, c[0], c[1], t, 'sembrar', 3, { dia: m.reloj.byte }); }
  q.siembra = { cultivo: 'trigo', primerDia: m.reloj.dia, ultimoDia: m.reloj.dia };
  // La de al lado (testigo sin regar)
  let vecina = null;
  for (const t of [36, 40, -26, -30, 46]) {
    const x = c[0] + n[0] * t; const z = c[1] + n[1] * t;
    const info = m.registro.parcelaEn(x, z);
    if (info && info.ref !== ref && (info.superficie_ha ?? 0) > 0.1) {
      const v = m.labranza.activa(info);
      for (let k = -6; k <= 6; k += 3) { linea(v, x, z, k, 'gradear', 3); linea(v, x, z, k, 'abonar', 3); linea(v, x, z, k, 'sembrar', 3, { dia: m.reloj.byte }); }
      v.siembra = { cultivo: 'trigo', primerDia: m.reloj.dia, ultimoDia: m.reloj.dia };
      vecina = info.ref;
      break;
    }
  }
  // Hasta el ahijado (los riegos de primavera)
  m.pasaDias(60);
  return { e, n, c, vecina, rec: q.recuento(), dia: m.reloj.dia };
}, REF);
comprueba(datos.rec.sembrado > 80 && Boolean(datos.vecina), `${REF} sembrada de trigo (${datos.rec.sembrado} %) y la ${datos.vecina} de testigo; día ${datos.dia}`);

// --- 3. Abrir la tajadera con G (o 💧): el agua entra con el juego en marcha
if (movil) await p.locator('[data-pulsar="tajadera"]').dispatchEvent('pointerdown');
else await p.keyboard.press('KeyG');
await fotogramas(p, 4);
r = await p.evaluate((ref) => ({ est: window.__juego.agricultura.riego.estado(ref), t0: window.__juego.agricultura.riego.sitios.get(ref).sim.t }), REF);
comprueba(r.est.abiertas === 1 && r.est.regando, `${movil ? '💧' : 'G'} abre la tajadera B1 (${r.est.caudalLs} L/s)`);
await fotogramas(p, 90);
r = await p.evaluate((ref) => {
  const m = window.__juego.agricultura; const s = m.riego.sitios.get(ref);
  return { t: s.sim.t, hMax: s.sim.hMax, visible: s.lamina.malla.visible, compuerta: s.acequia.tajaderas[0].compuerta.position.y,
    chorro: s.acequia.tajaderas[0].chorro.visible, aviso: document.getElementById('agri-riego')?.textContent ?? '' };
}, REF);
comprueba(r.t > 5 && r.hMax > 0.01 && r.visible, `con el juego en marcha el agua entra (${(r.t / 60).toFixed(1)} min de riego, lámina de hasta ${(r.hMax * 100).toFixed(1)} cm)`);
comprueba(r.compuerta > 0.2 && r.chorro, `la compuerta sube (${r.compuerta.toFixed(2)} m) y cae el chorro`);
comprueba(/Regando/.test(r.aviso), `el aviso dice cómo va («${r.aviso}»)`);
await captura(p, '1_abierta');
await vista(p, '1_abierta_vista');

// --- 4. Las dos boqueras: el agua cubre la parcela siguiendo el relieve
const marcas = {};
const avanzaHasta = async (objetivo, max = 6000) => p.evaluate(({ ref, objetivo, max }) => {
  const m = window.__juego.agricultura; const s = m.riego.sitios.get(ref);
  window.__marcas ??= {};
  const inicio = s.sim.t;
  while (s.sim.cubierto < objetivo && s.sim.t - inicio < max) {
    m.riego.simula(10);
    for (const u of [0.5, 0.9, 0.95]) if (s.sim.cubierto >= u && window.__marcas[u] == null) window.__marcas[u] = s.sim.t;
  }
  for (const q of m.labranza.parcelas.values()) q.sube(performance.now(), true);
  return { t: s.sim.t, cubierto: s.sim.cubierto, marcas: window.__marcas };
}, { ref: REF, objetivo, max });
await p.evaluate((ref) => {
  const m = window.__juego.agricultura; const s = m.riego.sitios.get(ref);
  // Mismo arranque que tools/52_riego.py: las dos a la vez desde el suelo de antes (se vuelve a empezar)
  m.riego.alterna(ref, 0, false); m.riego.simula(1e5); m.riego.resuelve();
  m.labranza.parcelas.get(ref).cultivo.forEach((v, k, a) => { if (k % 4 === 0) a[k] = 0; });
  s.sim.releeSuelo();
  m.riego.alterna(ref, 0, true); m.riego.alterna(ref, 1, true);
}, REF);
r = await avanzaHasta(0.3);
// Coloca el tractor en el centro de la parcela (para la vista de arriba)
await p.evaluate(({ c }) => {
  const j = window.__juego;
  const { alturaLibre, altoCaja } = j.coche.config.chasis;
  j.coche.recoloca(c[0], j.mundo.terreno.alturaEn(c[0], c[1]) + alturaLibre + altoCaja / 2 + 0.12, c[1], 0.7, 0.7);
}, datos);
await fotogramas(p, 6);
await vista(p, '2_avance_30');
r = await avanzaHasta(0.7);
await vista(p, '3_avance_70');
r = await avanzaHasta(0.95);
Object.assign(marcas, r.marcas);
const py = datosPython.parcelas[REF].simulacion;
const cerca = (a, b2) => Math.abs(a - b2) <= Math.max(2, b2 * 0.2);
const m50 = marcas[0.5] / 60; const m90 = marcas[0.9] / 60; const m95 = marcas[0.95] / 60;
comprueba(cerca(m50, py.minutos_50) && cerca(m90, py.minutos_90) && cerca(m95, py.minutos_95),
  `cubre el 50, 90 y 95 % a los ${m50.toFixed(1)}, ${m90.toFixed(1)} y ${m95.toFixed(1)} min (tools/52_riego.py: ${py.minutos_50}, ${py.minutos_90} y ${py.minutos_95})`);
// El agua sigue el relieve: llega antes a lo bajo, a igual distancia de las boqueras
const relieve = await p.evaluate((ref) => {
  const s = window.__juego.agricultura.riego.sitios.get(ref).sim;
  const pts = [];
  for (let k = 0; k < s.llegada.length; k++) {
    if (!s.regable[k] || s.llegada[k] < 0) continue;
    const x = s.ox + ((k % s.nx) + 0.5) * s.celda; const z = s.oz + (Math.floor(k / s.nx) + 0.5) * s.celda;
    const d = Math.min(...s.boqueras.map((bq) => Math.hypot(bq.x - x, bq.z - z)));
    pts.push([d, s.cota[k], s.llegada[k]]);
  }
  // Correlación parcial de la llegada con la cota, quitando la distancia (residuos de ajustes lineales)
  const ajusta = (xs, ys) => { const n = xs.length; const mx = xs.reduce((a, v) => a + v, 0) / n; const my = ys.reduce((a, v) => a + v, 0) / n;
    let sxy = 0; let sxx = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
    const b1 = sxy / sxx; return ys.map((v, i) => v - (my + b1 * (xs[i] - mx))); };
  const corr = (a, c) => { const n = a.length; const ma = a.reduce((s2, v) => s2 + v, 0) / n; const mc = c.reduce((s2, v) => s2 + v, 0) / n;
    let sac = 0; let saa = 0; let scc = 0; for (let i = 0; i < n; i++) { sac += (a[i] - ma) * (c[i] - mc); saa += (a[i] - ma) ** 2; scc += (c[i] - mc) ** 2; }
    return sac / Math.sqrt(saa * scc); };
  const d = pts.map((q) => q[0]); const y = pts.map((q) => q[1]); const t = pts.map((q) => q[2]);
  return { n: pts.length, conDistancia: corr(d, t), parcialCota: corr(ajusta(d, y), ajusta(d, t)) };
}, REF);
comprueba(relieve.conDistancia > 0.5, `el agua avanza desde las boqueras (correlación llegada-distancia ${relieve.conDistancia.toFixed(2)})`);
comprueba(relieve.parcialCota > 0.15, `y sigue el relieve: a igual distancia llega antes a lo bajo (correlación parcial llegada-cota ${relieve.parcialCota.toFixed(2)})`);
// Se cierra (como el regante) y el agua se va metiendo en el suelo
const cierre = await p.evaluate(async (ref) => {
  const m = window.__juego.agricultura; const s = m.riego.sitios.get(ref);
  m.riego.alterna(ref, 0, false); m.riego.alterna(ref, 1, false);
  const mm = (s.sim.entradaM3 / m.registro.porRef(ref).superficie_m2) * 1000;
  // Dos horas después, y ocho (la cola del riego: lo más bajo de la parcela, junto a la linde suroeste)
  const conAgua = () => { let n = 0; let d = 0; for (let k = 0; k < s.sim.h.length; k++) if (s.sim.dentro[k]) { d++; if (s.sim.h[k] > 0.005) n++; } return n / d; };
  const antes = conAgua();
  m.riego.simula(2 * 3600);
  const a2 = conAgua();
  m.riego.simula(6 * 3600);
  const a8 = conAgua();
  const t = 8 * 3600;
  const q = m.labranza.parcelas.get(ref);
  let suma = 0; let n = 0;
  for (let k = 0; k < q.interior.length; k++) if (q.interior[k] && s.sim.regable[s.sim.celdaPixel[k]]) { suma += q.cultivo[k * 4] / 255; n++; }
  q.sube(performance.now(), true);
  return { mm, humedad: suma / n, antes, a2, a8, t };
}, REF);
comprueba(cierre.a2 < cierre.antes && cierre.a8 < 0.15, `con la tajadera cerrada el agua se mete en el suelo: lámina en el ${(cierre.antes * 100).toFixed(0)} % de la parcela al cerrar, ${(cierre.a2 * 100).toFixed(0)} % a las 2 h y ${(cierre.a8 * 100).toFixed(0)} % a las 8 h (en lo más bajo)`);
comprueba(Math.abs(cierre.mm - datosPython.parcelas[REF].simulacion.mm_aplicados) < 25 && cierre.humedad > 0.75,
  `agua aplicada ${cierre.mm.toFixed(0)} mm (52_riego.py: ${datosPython.parcelas[REF].simulacion.mm_aplicados}); el suelo queda al ${(cierre.humedad * 100).toFixed(0)} %`);
await fotogramas(p, 6);
await vista(p, '4_mojado');

// --- 5. Se seca con los días; lo regado crece con más agua que el testigo
const dias = await p.evaluate(({ ref, vecina }) => {
  const m = window.__juego.agricultura;
  const media = (q, canal) => { let s2 = 0; let n = 0; for (let k = 0; k < q.interior.length; k++) if (q.interior[k] && q.cultivo[k * 4 + 1]) { s2 += canal(k); n++; } return n ? s2 / n : 0; };
  const q = m.labranza.parcelas.get(ref); const v = m.labranza.parcelas.get(vecina);
  const hum = () => media(q, (k) => q.cultivo[k * 4] / 255);
  const h0 = hum();
  m.pasaDias(1);
  const h1 = hum();
  m.pasaDias(14);
  const h15 = hum();
  const aguaRegada = media(q, (k) => q.agua[k] / 255);
  const aguaTestigo = media(v, (k) => v.agua[k] / 255);
  for (const p2 of m.labranza.parcelas.values()) p2.sube(performance.now(), true);
  return { h0, h1, h15, aguaRegada, aguaTestigo, dia: m.reloj.dia };
}, { ref: REF, vecina: datos.vecina });
comprueba(dias.h1 < dias.h0 && dias.h15 < dias.h1 - 0.3, `el suelo se seca con los días (${(dias.h0 * 100).toFixed(0)} % → ${(dias.h1 * 100).toFixed(0)} % al día siguiente → ${(dias.h15 * 100).toFixed(0)} % a los 15 días)`);
comprueba(dias.aguaRegada > dias.aguaTestigo + 0.05, `el trigo regado apunta más agua que el testigo sin regar (${dias.aguaRegada.toFixed(2)} frente a ${dias.aguaTestigo.toFixed(2)}: vigor ×${(0.8 + 0.4 * dias.aguaRegada).toFixed(2)} frente a ×${(0.8 + 0.4 * dias.aguaTestigo).toFixed(2)})`);

// --- 6. Barro: con el suelo mojado, menos agarre
const barro = await p.evaluate(async ({ ref, c }) => {
  const j = window.__juego; const m = j.agricultura;
  m.riego.alterna(ref, 0, true); m.riego.alterna(ref, 1, true);
  m.riego.simula(1800);
  const s = m.riego.sitios.get(ref);
  // Una celda con agua
  let k = 0; for (let i = 0; i < s.sim.h.length; i++) if (s.sim.h[i] > 0.02) { k = i; break; }
  const x = s.sim.ox + ((k % s.sim.nx) + 0.5) * s.sim.celda; const z = s.sim.oz + (Math.floor(k / s.sim.nx) + 0.5) * s.sim.celda;
  const { alturaLibre, altoCaja } = j.coche.config.chasis;
  j.coche.recoloca(x, j.mundo.terreno.alturaEn(x, z) + alturaLibre + altoCaja / 2 + 0.12, z, 0.7, 0.7);
  await new Promise((res) => { let n = 0; const f = () => (++n > 4 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  return { barro: m.labranza.barro, agarre: j.coche.config.ruedas.agarre };
}, { ref: REF, c: datos.c });
comprueba(barro.barro > 0.5, `el tractor en lo regado está en el barro (${barro.barro.toFixed(2)}; agarre trasero ${barro.agarre.toFixed(2)})`);
await captura(p, '5_barro');

// --- 7. Pasar días con el agua corriendo
const pasa = await p.evaluate((ref) => {
  const m = window.__juego.agricultura; const s = m.riego.sitios.get(ref);
  const antes = s.sim.laminaMedia;
  m.pasaDias(1);
  return { antes, despues: s.sim.laminaMedia, abiertas: s.sim.abiertas, compuerta: s.acequia.tajaderas[0].objetivo };
}, REF);
comprueba(pasa.antes > 0 && pasa.despues === 0 && pasa.abiertas === 0 && pasa.compuerta === 0, 'pasar días cierra las tajaderas y el agua se mete en el suelo');

// --- 8. Coste: la simulación con el agua corriendo, por fotograma
const coste = await p.evaluate(async (ref) => {
  const m = window.__juego.agricultura; const s = m.riego.sitios.get(ref);
  m.riego.alterna(ref, 0, true); m.riego.alterna(ref, 1, true);
  m.riego.simula(900);
  // Un segundo de juego a 60 fotogramas (24 s de riego): lo que tarda riego.actualiza
  const t0 = performance.now();
  for (let i = 0; i < 60; i++) m.riego.actualiza(1 / 60);
  const ms = (performance.now() - t0) / 60;
  m.riego.alterna(ref, 0, false); m.riego.alterna(ref, 1, false);
  return { ms, celdas: s.sim.nx * s.sim.nz };
}, REF);
console.log(`  coste: ${coste.ms.toFixed(2)} ms por fotograma con el agua corriendo (${coste.celdas} celdas, 60 fotogramas por segundo)`);
comprueba(coste.ms < 8, `la simulación cabe en el fotograma (${coste.ms.toFixed(2)} ms)`);

comprueba(errores.length === 0, `sin errores en la consola${errores.length ? `: ${errores.slice(0, 5).join(' | ')}` : ''}`);
await p.close();
await b.close();
console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
