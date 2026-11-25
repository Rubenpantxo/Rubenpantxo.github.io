// Prueba de la fase A4 del modo agricultura (PLAN_AGRICULTURA.md): arado y cultivador, en un
// navegador sin ventana.
//   1. En la COPE: coger el tractor y enganchar el arado (el cultivador sigue en el patio).
//   2. En la parcela de pruebas (2-700): bajar el arado (Q o ⬇) y conducir de verdad dos pasadas
//      (ida y vuelta) en la dirección de labor: queda arada la franja del ancho del arado con los
//      surcos en la dirección de la pasada; rodadas, polvo, terrones, gaviotas, sonido; el tractor
//      no pasa de la velocidad de trabajo; al levantarlo, el reversible da la vuelta.
//   3. Media parcela: las pasadas de un arado de 1,6 m sobre la mitad de la parcela (el mismo pincel
//      que usa el tractor, sin conducir: serían más de diez pasadas) dejan la mitad arada.
//   4. Cultivador: se cambia en la COPE (el arado vuelve al patio) y se pasa sobre lo arado: queda
//      cultivado (gradeado) y el rodillo gira.
//   5. Sin errores de consola.
// Saca capturas. Hace falta el servidor de desarrollo (npm run dev) y Playwright.
// Uso: node tools/prueba_labranza.mjs <carpeta de capturas> [bajo|medio|alto] [movil|no]
// (PUERTO=5180 si el servidor no está en el 5173; CANAL=chrome para usar el Chrome instalado)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const S = process.argv[2];
const calidad = process.argv[3] ?? 'bajo';
const movil = process.argv[4] === 'movil';
const puerto = process.env.PUERTO ?? '5173';
const REF = '2-700';
mkdirSync(S, { recursive: true });
const b = await chromium.launch({ channel: process.env.CANAL, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
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
  await p.screenshot({ path: `${S}/labranza_${nombre}${sufijo}.jpg`, quality: 85, timeout: 180000 });
  console.log(`  captura ${S}/labranza_${nombre}${sufijo}.jpg`);
};
const estado = (p) => p.evaluate((ref) => {
  const j = window.__juego;
  const m = j.agricultura;
  const t = m?.tractor;
  const e = t?.estado();
  const parcela = m?.labranza.parcelas.get(ref);
  return {
    llevaTractor: j.coche === t,
    tractor: e ? { x: e.posicion.x, z: e.posicion.z, kmh: e.velocidadKmh, volcado: e.volcado, fx: e.adelante.x, fz: e.adelante.z } : null,
    apero: m?.enganche.apero?.id ?? null,
    bajado: m?.enganche.bajado ?? false,
    subida: m?.enganche.subida ?? 1,
    volteo: m?.enganche.apero ? m.enganche.apero.volteo.rotation.z : 0,
    aparcados: m ? Object.fromEntries(Object.values(m.aperos).map((a) => [a.id, a.aparcado])) : {},
    recuento: parcela ? parcela.recuento() : null,
    cuenta: m ? { ...m.labranza.cuenta } : null,
    polvo: m?.labranza.particulas.vivas ?? 0,
    terrones: m?.labranza.particulas.terrones ?? 0,
    aves: m?.labranza.aves.cuantas ?? 0,
    posadas: m?.labranza.aves.posadas ?? 0,
    rpm: m?.sonido?.rpm ?? 0,
    hud: document.getElementById('agri-hud')?.hidden === false ? document.getElementById('agri-hud').textContent : '',
    botonApero: document.querySelector('[data-pulsar="apero"]')?.hidden === false,
    menu: Boolean(document.getElementById('menu-cope') && !document.getElementById('menu-cope').hidden),
  };
}, REF);
const dist = (a, [x, z]) => Math.hypot(a.x - x, a.z - z);
async function entrar(p) {
  if (movil) await p.locator('[data-pulsar="entrar"]').dispatchEvent('pointerdown');
  else await p.keyboard.press('KeyE');
  await fotogramas(p, 2);
}
async function apero(p) {
  if (movil) await p.locator('[data-pulsar="apero"]').dispatchEvent('pointerdown');
  else await p.keyboard.press('KeyQ');
  await fotogramas(p, 2);
}
async function pulsaMenu(p, texto) {
  await p.evaluate((t) => [...document.querySelectorAll('#menu-cope button')].find((x) => x.textContent.includes(t)).click(), texto);
  await fotogramas(p, 4);
}
async function paraEn(p, x, z, rumbo) {
  await p.evaluate(({ x, z, rumbo }) => {
    const j = window.__juego;
    const r = (rumbo * Math.PI) / 180;
    const { alturaLibre, altoCaja } = j.coche.config.chasis;
    j.coche.recoloca(x, j.mundo.terreno.alturaEn(x, z) + alturaLibre + altoCaja / 2 + 0.12, z, Math.sin(r), -Math.cos(r));
  }, { x, z, rumbo });
  for (let i = 0; i < 15; i++) {
    await fotogramas(p, 2);
    if (Math.abs((await estado(p)).tractor.kmh) < 0.4) break;
  }
}
// Espera hasta que se cumpla una condición sobre el estado (o se acaben los fotogramas)
async function hasta(p, condicion, maxFotogramas = 400) {
  let s;
  for (let i = 0; i < maxFotogramas; i += 4) {
    await fotogramas(p, 4);
    s = await estado(p);
    if (condicion(s)) return s;
  }
  return s;
}

// --- 1. COPE: tractor y arado
const p = await contexto.newPage();
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
p.on('pageerror', (e) => errores.push(`PAGEERROR ${e.message}`));
await p.goto(`http://localhost:${puerto}/?calidad=${calidad}&personaje=0&hora=dia&debug=1&agricultura`);
await p.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 300000 });
await p.evaluate(() => document.getElementById('jugar').click());
await p.waitForFunction(() => window.__juego.agricultura, null, { timeout: 120000 });
await fotogramas(p, 4);
const datos = await p.evaluate(async (ref) => {
  const { AGRICULTURA } = await import('/src/config/agricultura.js');
  const { ENTRADAS } = await import('/src/config/entradas.js');
  const d = await (await fetch('/assets/agricultura/parcelas.json')).json();
  return { cope: { ...AGRICULTURA.cope, aro: ENTRADAS.find((e) => e.id === 'cope').en }, parcela: d.parcelas.find((x) => x.ref === ref) };
}, REF);
const { cope, parcela } = datos;
let s = await estado(p);
comprueba(s.aparcados.arado && s.aparcados.cultivador, 'el arado y el cultivador esperan en el patio de la COPE');
await captura(p, '1_patio');
await entrar(p);
s = await estado(p);
const opciones = await p.evaluate(() => [...document.querySelectorAll('#menu-cope .aperos label')].map((l) => l.textContent));
comprueba(s.menu && opciones.some((x) => x.includes('Arado')) && opciones.some((x) => x.includes('Cultivador')), `el menú de la COPE ofrece los aperos (${opciones.join(', ')})`);
await p.evaluate(() => [...document.querySelectorAll('#menu-cope .aperos label')].find((l) => l.textContent.includes('Arado')).querySelector('input').click());
await captura(p, '2_menu_aperos');
await pulsaMenu(p, 'Coger el tractor');
await fotogramas(p, 4);
s = await estado(p);
comprueba(s.llevaTractor && s.apero === 'arado', 'arado enganchado al tractor');
comprueba(!s.aparcados.arado && s.aparcados.cultivador, 'el arado sale del patio; el cultivador se queda');
comprueba(s.subida > 0.9 && !s.bajado, 'llega levantado');
comprueba(!movil || s.botonApero, 'en el móvil aparece el botón del apero (⬇)');

// --- 2. Dos pasadas de verdad en la 2-700
// Carriles en la dirección de labor: e (a lo largo), n (de lado). Para cada carril, el tramo dentro
const r = (parcela.labor_grados * Math.PI) / 180;
const e = [Math.sin(r), -Math.cos(r)];
const n = [-e[1], e[0]];
const [cx, cz] = parcela.centro;
const anillo = parcela.partes[0][0];
const dentro = (x, z) => {
  let c = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    if ((anillo[i][1] > z) !== (anillo[j][1] > z) && x < ((anillo[j][0] - anillo[i][0]) * (z - anillo[i][1])) / (anillo[j][1] - anillo[i][1]) + anillo[i][0]) c = !c;
  }
  return c;
};
const punto = (sv, tv) => [cx + e[0] * sv + n[0] * tv, cz + e[1] * sv + n[1] * tv];
function tramo(tv) {
  let a = null; let bb = null;
  for (let sv = -200; sv <= 200; sv += 0.5) {
    if (dentro(...punto(sv, tv))) { if (a === null) a = sv; bb = sv; }
  }
  return [a, bb];
}
// El carril más largo cerca del centro
let mejor = { t: 0, largo: 0 };
for (let tv = -20; tv <= 20; tv += 1) {
  const [a, bb] = tramo(tv);
  if (a !== null && bb - a > mejor.largo) mejor = { t: tv, largo: bb - a, a, b: bb };
}
console.log('  carril', JSON.stringify(mejor));
const LARGO = Math.min(45, mejor.largo - 16);
const rumboIda = parcela.labor_grados;
const byteLabor = Math.round(((((Math.atan2(e[1], e[0]) % Math.PI) + Math.PI) % Math.PI) / Math.PI) * 255);
async function pasada(tv, ida, nombreCaptura) {
  // El tractor entra 6 m (el apero trabaja unos 4,8 m por detrás de su centro)
  const [a, bb] = tramo(tv);
  const s0 = ida ? a + 7 : bb - 7;
  const largo = Math.min(LARGO, bb - a - 16);
  const [x0, z0] = punto(s0, tv);
  await paraEn(p, x0, z0, ida ? rumboIda : rumboIda + 180);
  await apero(p);
  let st = await hasta(p, (x) => x.subida < 0.05, 200);
  const antes = st.cuenta.pixeles;
  await p.keyboard.down('KeyW');
  let maxKmh = 0; let polvo = 0; let terrones = 0;
  st = await hasta(p, (x) => {
    maxKmh = Math.max(maxKmh, x.tractor.kmh);
    polvo = Math.max(polvo, x.polvo);
    terrones = Math.max(terrones, x.terrones);
    return dist(x.tractor, [x0, z0]) > largo;
  }, 2400);
  if (nombreCaptura) await captura(p, nombreCaptura);
  await p.keyboard.up('KeyW');
  if (nombreCaptura) {
    // Vista de comprobación: la cámara da vueltas alrededor del tractor (pausa del juego)
    await p.evaluate(() => window.__juego.ponPausa(true));
    await fotogramas(p, 50);
    await captura(p, `${nombreCaptura}_vista`);
    await p.evaluate(() => window.__juego.ponPausa(false));
  }
  st = await estado(p);
  await apero(p);
  return { st, maxKmh, polvo, terrones, pixeles: st.cuenta.pixeles - antes, recorrido: dist(st.tractor, [x0, z0]) };
}
const r1 = await pasada(mejor.t, true, '3_arando');
console.log('  pasada 1:', JSON.stringify({ ...r1, st: undefined }), JSON.stringify(r1.st.recuento));
const areaPasada = 1.6 * (r1.recorrido - 0) / (parcela.superficie_ha * 10000) * 100;
comprueba(r1.pixeles > 0 && r1.st.recuento.arado > 0, `la pasada ara la parcela (${r1.st.recuento.arado} %; un arado de 1,6 m en ${r1.recorrido.toFixed(0)} m son ≈ ${areaPasada.toFixed(1)} %)`);
comprueba(Math.abs(r1.st.recuento.arado - areaPasada) < areaPasada * 0.35 + 0.3, 'el porcentaje casa con la anchura del arado y lo recorrido');
comprueba(r1.maxKmh <= 10.6 && r1.maxKmh > 3, `con el arado clavado no pasa de la velocidad de trabajo (máx. ${r1.maxKmh.toFixed(1)} km/h)`);
comprueba(r1.polvo > 20, `polvo detrás del arado (${r1.polvo} partículas)`);
comprueba(r1.terrones > 3, `terrones (${r1.terrones})`);
comprueba(r1.st.cuenta.rodadas > 0, 'rodadas de las ruedas traseras');
comprueba(r1.st.rpm > 900, `suena el motor (${Math.round(r1.st.rpm)} rpm)`);
comprueba(/Arado/.test(r1.st.hud) && /2-700/.test(r1.st.hud), `el panel enseña el apero, la parcela y el porcentaje («${r1.st.hud}»)`);
// Surcos en la dirección de la pasada: los píxeles arados guardan el ángulo de la labor
const direcciones = await p.evaluate((ref) => {
  const q = window.__juego.agricultura.labranza.parcelas.get(ref);
  const h = new Map();
  for (let k = 0; k < q.interior.length; k++) {
    if (q.interior[k] && q.laboreo[k * 4] > 200) { const d = q.laboreo[k * 4 + 3]; h.set(d, (h.get(d) ?? 0) + 1); }
  }
  return [...h.entries()].sort((a, bb) => bb[1] - a[1]).slice(0, 3);
}, REF);
const dDir = Math.min(Math.abs(direcciones[0][0] - byteLabor), 255 - Math.abs(direcciones[0][0] - byteLabor));
comprueba(dDir <= 8, `surcos en la dirección de la pasada (byte ${direcciones[0][0]}, labor ${byteLabor})`);
// Al levantarlo, el reversible da la vuelta
const sv = await hasta(p, (x) => Math.abs(Math.abs(x.volteo) - Math.PI) < 0.01, 300);
comprueba(Math.abs(Math.abs(sv.volteo) - Math.PI) < 0.01, 'al levantar el arado reversible, da la vuelta');
await captura(p, '4_volteado');

const r2 = await pasada(mejor.t + 1.6, false, null);
console.log('  pasada 2:', JSON.stringify(r2.st.recuento), 'aves', r2.st.aves, 'posadas', r2.st.posadas);
comprueba(r2.st.recuento.arado > r1.st.recuento.arado * 1.6, `la vuelta, al lado, añade otra franja (${r1.st.recuento.arado} → ${r2.st.recuento.arado} %)`);
comprueba(r2.st.aves >= 2, `llegan gaviotas detrás del arado (${r2.st.aves})`);
// Vista de cerca de lo arado y las gaviotas
await p.evaluate(() => window.__juego.camaraCoche.cambia());
await captura(p, '5_cabina');
await p.evaluate(() => window.__juego.camaraCoche.cambia());

// --- 3. Media parcela (el mismo pincel, sin conducir)
const media = await p.evaluate(({ ref, e, n, centro }) => {
  const m = window.__juego.agricultura;
  const q = m.labranza.parcelas.get(ref);
  const copia = { l: q.laboreo.slice(), c: q.cultivo.slice() };
  q.laboreo.fill(0); q.cultivo.fill(0);
  // Pasadas de 1,6 m sobre la mitad de un lado de la línea media (a lo largo de la labor)
  let tMin = Infinity; let tMax = -Infinity;
  for (const [x, z] of q.info.partes[0][0]) { const t = (x - centro[0]) * n[0] + (z - centro[1]) * n[1]; tMin = Math.min(tMin, t); tMax = Math.max(tMax, t); }
  return import('/src/agricultura/pincel.js').then(({ pinta }) => {
    // Media por superficie: se busca la línea que deja la mitad a cada lado (por pasadas de 1,6 m)
    let pasadas = 0;
    for (let t = tMin + 0.8; t < tMax; t += 1.6) {
      pinta(q, 'arar', centro[0] + e[0] * -300 + n[0] * t, centro[1] + e[1] * -300 + n[1] * t, centro[0] + e[0] * 300 + n[0] * t, centro[1] + e[1] * 300 + n[1] * t, 1.6);
      pasadas++;
      if (q.recuento().arado >= 50) break;
    }
    const r = q.recuento().arado;
    q.laboreo.set(copia.l); q.cultivo.set(copia.c); q.marcaCambio(0, 0, q.ancho - 1, q.alto - 1); q.sube(performance.now(), true);
    return { r, pasadas };
  });
}, { ref: REF, e, n, centro: parcela.centro });
comprueba(media.r >= 48 && media.r <= 54, `${media.pasadas} pasadas de 1,6 m sobre media parcela la dejan arada al ${media.r} %`);

// --- 4. Cultivador sobre lo arado
await paraEn(p, cope.aro[0], cope.aro[1], 180);
await entrar(p);
await pulsaMenu(p, 'Enganchar Cultivador');
s = await estado(p);
comprueba(s.apero === 'cultivador' && s.aparcados.arado && !s.aparcados.cultivador, 'cultivador enganchado; el arado vuelve al patio');
const rodillo0 = await p.evaluate(() => window.__juego.agricultura.enganche.apero.rodillo.rotation.x);
const r3 = await pasada(mejor.t + 0.8, true, '6_cultivando');
const rodillo1 = await p.evaluate(() => window.__juego.agricultura.enganche.apero.rodillo.rotation.x);
console.log('  cultivador:', JSON.stringify(r3.st.recuento), `máx. ${r3.maxKmh.toFixed(1)} km/h`);
comprueba(r3.st.recuento.gradeado > 0, `el cultivador deja la tierra cultivada (${r3.st.recuento.gradeado} %)`);
comprueba(r3.st.recuento.arado < r2.st.recuento.arado, `lo arado por donde pasa queda cultivado (arado ${r2.st.recuento.arado} → ${r3.st.recuento.arado} %)`);
comprueba(r3.maxKmh <= 13.6, `con el cultivador no pasa de su velocidad de trabajo (máx. ${r3.maxKmh.toFixed(1)} km/h)`);
comprueba(Math.abs(rodillo1 - rodillo0) > 3, 'el rodillo gira al trabajar');
await p.evaluate(() => window.__juego.agricultura.labranza.parcelas.get('2-700'));
comprueba(errores.length === 0, `sin errores en la consola${errores.length ? `: ${errores.slice(0, 5).join(' | ')}` : ''}`);
await p.close();
await b.close();
console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
