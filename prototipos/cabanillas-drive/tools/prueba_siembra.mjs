// Prueba de la fase A5 del modo agricultura (PLAN_AGRICULTURA.md): abonadora y sembradora, en un
// navegador sin ventana.
//   0. La 2-700 se deja preparada (cultivada) en su mitad central con el mismo pincel que usan los
//      aperos (el arado y el cultivador de verdad ya los prueba prueba_labranza.mjs).
//   1. En la COPE: elegir la abonadora y la semilla (trigo) y coger el tractor: la tolva sale llena,
//      el cardán une la toma de fuerza.
//   2. Abonar: una pasada conducida de verdad con la abonadora bajada: los discos giran, echan el
//      granulado en abanico, queda abonada una franja de unos 12 m y la tolva baja lo que toca por
//      la dosis (kg/ha × superficie abonada).
//   3. En la COPE: cambiar a la sembradora (la abonadora vuelve al patio), con la tolva llena de trigo.
//   4. Sembrar: una pasada de verdad: la sembradora va detrás, sobre sus ruedas; queda sembrada una
//      franja de 3 m, la máscara guarda el día de siembra y la parcela el cultivo; rodadas de sus
//      ruedas; la tolva baja por la dosis del trigo.
//   5. Curva y marcha atrás: la sembradora sigue al tractor por dentro de la curva, con la lanza sin
//      pasar del giro máximo; marcha atrás, con las rejas levantadas, no siembra.
//   6. Tolva vacía: deja de sembrar y avisa. Sembrar sobre rastrojo avisa.
//   7. Sin errores de consola.
// Uso: node tools/prueba_siembra.mjs <carpeta de capturas> [bajo|medio|alto] [movil]
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
  await p.screenshot({ path: `${S}/siembra_${nombre}${sufijo}.jpg`, quality: 85, timeout: 180000 });
  console.log(`  captura ${S}/siembra_${nombre}${sufijo}.jpg`);
};
const estado = (p) => p.evaluate((ref) => {
  const j = window.__juego;
  const m = j.agricultura;
  const t = m?.tractor;
  const e = t?.estado();
  const ap = m?.enganche.apero;
  const parcela = m?.labranza.parcelas.get(ref);
  const rumbo = (x, z) => Math.atan2(x, z);
  let lanza = null;
  if (ap?.arrastrado && e) {
    const q = ap.objeto.quaternion;
    const f = { x: 2 * (q.x * q.z + q.w * q.y), z: 1 - 2 * (q.x * q.x + q.y * q.y) };   // +Z del apero en el mundo
    let g = rumbo(f.x, f.z) - rumbo(e.adelante.x, e.adelante.z);
    g = Math.atan2(Math.sin(g), Math.cos(g));
    const eje = m.enganche.ejeApero({ x: 0, y: 0, z: 0, copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }, setY(y) { this.y = y; return this; } });
    lanza = { giroGrados: (g * 180) / Math.PI, ejeX: eje.x, ejeZ: eje.z, sobreSuelo: ap.objeto.position.y - j.mundo.terreno.alturaEn(ap.objeto.position.x, ap.objeto.position.z) };
  }
  return {
    llevaTractor: j.coche === t,
    tractor: e ? { x: e.posicion.x, z: e.posicion.z, kmh: e.velocidadKmh, fx: e.adelante.x, fz: e.adelante.z } : null,
    apero: ap?.id ?? null,
    bajado: m?.enganche.bajado ?? false,
    subida: m?.enganche.subida ?? 1,
    tdf: m?.enganche.tdf ?? false,
    cardan: m?.enganche.cardan.visible ?? false,
    carga: ap ? ap.carga : 0,
    contenido: ap?.contenido ?? null,
    discos: ap?.discos.length ? ap.discos[0].rotation.y : 0,
    ruedas: ap?.ruedas.length ? ap.ruedas[0].rotation.x : 0,
    pata: ap?.pata ? ap.pata.visible : null,
    aparcados: m ? Object.fromEntries(Object.values(m.aperos).map((a) => [a.id, a.aparcado])) : {},
    recuento: parcela ? parcela.recuento() : null,
    siembra: parcela?.siembra ?? null,
    cuenta: m ? { ...m.labranza.cuenta } : null,
    granos: m?.labranza.particulas.granosEnElAire ?? 0,
    tolvaVacia: m?.labranza.tolvaVacia ?? false,
    sinPreparar: m?.labranza.sinPreparar ?? false,
    lanza,
    hud: document.getElementById('agri-hud')?.hidden === false ? document.getElementById('agri-hud').textContent : '',
    aviso: j.ultimoAviso ?? '',
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
const eligeEnMenu = (p, texto) => p.evaluate((t) => [...document.querySelectorAll('#menu-cope .aperos label')]
  .find((l) => l.textContent.includes(t)).querySelector('input').click(), texto);
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
async function hasta(p, condicion, maxFotogramas = 400) {
  let s;
  for (let i = 0; i < maxFotogramas; i += 4) {
    await fotogramas(p, 4);
    s = await estado(p);
    if (condicion(s)) return s;
  }
  return s;
}

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
  const { APEROS, SEMILLAS, ARRASTRE } = await import('/src/config/maquinaria.js');
  const d = await (await fetch('/assets/agricultura/parcelas.json')).json();
  return { cope: { ...AGRICULTURA.cope, aro: ENTRADAS.find((e) => e.id === 'cope').en }, parcela: d.parcelas.find((x) => x.ref === ref),
    aperos: APEROS, semillas: SEMILLAS, arrastre: ARRASTRE };
}, REF);
const { cope, parcela, aperos, semillas, arrastre } = datos;

// Carriles en la dirección de labor
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
  for (let sv = -200; sv <= 200; sv += 0.5) if (dentro(...punto(sv, tv))) { if (a === null) a = sv; bb = sv; }
  return [a, bb];
}
// Carril central: el más largo con |t| ≤ 6 (la franja de 12 m de la abonadora cabe dentro)
let carril = { t: 0, largo: 0 };
for (let tv = -6; tv <= 6; tv += 1) {
  const [a, bb] = tramo(tv);
  if (a !== null && bb - a > carril.largo) carril = { t: tv, largo: bb - a, a, b: bb };
}
console.log('  carril', JSON.stringify(carril));

// --- 0. La mitad central de la parcela, cultivada (preparada para sembrar)
const preparada = await p.evaluate(({ ref, e, n, centro, t0 }) => {
  const m = window.__juego.agricultura;
  const info = m.registro.parcelaEn(centro[0] + n[0] * t0, centro[1] + n[1] * t0);
  if (info?.ref !== ref) throw new Error(`El centro no cae en la ${ref}`);
  const q = m.labranza.activa(info);
  return import('/src/agricultura/pincel.js').then(({ pinta }) => {
    for (let t = t0 - 12; t <= t0 + 12; t += 2) {
      const a = [centro[0] - e[0] * 300 + n[0] * t, centro[1] - e[1] * 300 + n[1] * t];
      const bb = [centro[0] + e[0] * 300 + n[0] * t, centro[1] + e[1] * 300 + n[1] * t];
      pinta(q, 'gradear', a[0], a[1], bb[0], bb[1], 2.2);
    }
    q.sube(performance.now(), true);
    return q.recuento();
  });
}, { ref: REF, e, n, centro: parcela.centro, t0: carril.t });
console.log('  preparada:', JSON.stringify(preparada));
comprueba(preparada.gradeado > 30, `la mitad central de la 2-700, cultivada para la prueba (${preparada.gradeado} %)`);

// --- 1. COPE: abonadora y semilla de trigo
await entrar(p);
let s = await estado(p);
const etiquetas = await p.evaluate(() => [...document.querySelectorAll('#menu-cope .aperos label')].map((l) => l.textContent));
comprueba(s.menu && ['Abonadora', 'Sembradora', 'Trigo', 'Cebada'].every((x) => etiquetas.some((l) => l.includes(x))), `el menú ofrece la abonadora, la sembradora y la semilla (${etiquetas.join(', ')})`);
await eligeEnMenu(p, 'Abonadora');
await eligeEnMenu(p, 'Trigo');
await captura(p, '1_menu');
await pulsaMenu(p, 'Coger el tractor');
s = await estado(p);
comprueba(s.llevaTractor && s.apero === 'abonadora', 'tractor con la abonadora');
comprueba(s.carga === aperos.abonadora.capacidadKg && s.contenido === 'abono', `la tolva sale llena (${s.carga} kg de ${s.contenido})`);
comprueba(s.cardan, 'el cardán une la toma de fuerza del tractor y la abonadora');
comprueba(!s.aparcados.abonadora && s.aparcados.sembradora, 'la abonadora sale del patio; la sembradora se queda');
comprueba(/Tolva/.test(s.hud), `el panel enseña la tolva («${s.hud}»)`);

async function pasada(tv, ida, largoMax, nombreCaptura, { volante = null } = {}) {
  const [a, bb] = tramo(tv);
  const s0 = ida ? a + 8 : bb - 8;
  const largo = Math.min(largoMax, bb - a - 16);
  const [x0, z0] = punto(s0, tv);
  await paraEn(p, x0, z0, ida ? parcela.labor_grados : parcela.labor_grados + 180);
  await fotogramas(p, 10);
  await apero(p);
  let st = await hasta(p, (x) => x.subida < 0.05, 200);
  const antes = st;
  await p.keyboard.down('KeyW');
  let maxKmh = 0; let granos = 0; let giroMax = 0; let tolvaVacia = false; let sinPreparar = false;
  st = await hasta(p, (x) => {
    maxKmh = Math.max(maxKmh, x.tractor.kmh);
    granos = Math.max(granos, x.granos);
    if (x.lanza) giroMax = Math.max(giroMax, Math.abs(x.lanza.giroGrados));
    tolvaVacia ||= x.tolvaVacia;
    sinPreparar ||= x.sinPreparar;
    return dist(x.tractor, [x0, z0]) > largo;
  }, 2400);
  if (nombreCaptura) await captura(p, nombreCaptura);
  await p.keyboard.up('KeyW');
  st = await estado(p);
  if (nombreCaptura) {
    await p.evaluate(() => window.__juego.ponPausa(true));
    await fotogramas(p, 50);
    await captura(p, `${nombreCaptura}_vista`);
    await p.evaluate(() => window.__juego.ponPausa(false));
  }
  await apero(p);
  return { antes, st, maxKmh, granos, giroMax, tolvaVacia, sinPreparar, recorrido: dist(st.tractor, [x0, z0]) };
}

// --- 2. Abonar
const r1 = await pasada(carril.t, true, 45, '2_abonando');
const ab = r1.st.recuento.abonado - r1.antes.recuento.abonado;
const haAbonadas = (ab / 100) * parcela.superficie_ha;
const kg = r1.antes.carga - r1.st.carga;
const esperadoKg = haAbonadas * aperos.abonadora.dosisKgHa;
console.log('  abonado:', JSON.stringify(r1.st.recuento), `${kg.toFixed(1)} kg`);
const esperadoPct = (12 * r1.recorrido) / (parcela.superficie_ha * 10000) * 100;
comprueba(ab > esperadoPct * 0.6 && ab < esperadoPct * 1.25, `la abonadora reparte una franja de ~12 m (${ab.toFixed(1)} % de la parcela; 12 m × ${r1.recorrido.toFixed(0)} m son ≈ ${esperadoPct.toFixed(1)} %)`);
comprueba(Math.abs(kg - esperadoKg) < esperadoKg * 0.15 + 0.5, `la tolva baja lo que toca: ${kg.toFixed(1)} kg (${aperos.abonadora.dosisKgHa} kg/ha × ${haAbonadas.toFixed(3)} ha ≈ ${esperadoKg.toFixed(1)} kg)`);
comprueba(r1.granos > 20, `los discos echan el abono en abanico (${r1.granos} granos en el aire)`);
comprueba(Math.abs(r1.st.discos - r1.antes.discos) > 5, 'los discos giran con la toma de fuerza');
comprueba(r1.maxKmh <= aperos.abonadora.velocidadMaxKmh + 0.6, `no pasa de la velocidad de trabajo (máx. ${r1.maxKmh.toFixed(1)} km/h)`);
comprueba(r1.st.recuento.gradeado >= preparada.gradeado - 0.2, 'abonar no deshace lo cultivado');

// --- 3. COPE: sembradora con trigo
await paraEn(p, cope.aro[0], cope.aro[1], 180);
await entrar(p);
await pulsaMenu(p, 'Enganchar Sembradora');
s = await estado(p);
comprueba(s.apero === 'sembradora' && s.aparcados.abonadora && !s.aparcados.sembradora, 'sembradora enganchada; la abonadora vuelve al patio');
comprueba(s.carga === aperos.sembradora.capacidadKg && s.contenido === 'trigo', `tolva llena de trigo (${s.carga} kg)`);
comprueba(s.pata === false && !s.cardan, 'enganchada: sin la pata de apoyo y sin cardán');
await fotogramas(p, 20);
s = await estado(p);
comprueba(s.lanza && Math.abs(s.lanza.giroGrados) < 3 && Math.abs(s.lanza.sobreSuelo - 0.42) < 0.25, `la sembradora va detrás del tractor, derecha y a la altura de la barra (giro ${s.lanza?.giroGrados.toFixed(1)}°)`);
await captura(p, '3_sembradora_cope');

// --- 4. Sembrar
const r2 = await pasada(carril.t, false, 45, '4_sembrando');
const se = r2.st.recuento.sembrado - r2.antes.recuento.sembrado;
const kgS = r2.antes.carga - r2.st.carga;
const esperadoS = (3 * (r2.recorrido - 3)) / (parcela.superficie_ha * 10000) * 100;
console.log('  sembrado:', JSON.stringify(r2.st.recuento), `${kgS.toFixed(2)} kg`, JSON.stringify(r2.st.siembra));
comprueba(se > esperadoS * 0.7 && se < esperadoS * 1.3, `siembra una franja de 3 m (${se.toFixed(1)} %; 3 m × ${(r2.recorrido - 3).toFixed(0)} m son ≈ ${esperadoS.toFixed(1)} %)`);
const kgEsperado = (se / 100) * parcela.superficie_ha * semillas.trigo.dosisKgHa;
comprueba(Math.abs(kgS - kgEsperado) < kgEsperado * 0.15 + 0.3, `la tolva baja por la dosis del trigo (${kgS.toFixed(1)} kg; ≈ ${kgEsperado.toFixed(1)} kg)`);
const dias = await p.evaluate((ref) => {
  const q = window.__juego.agricultura.labranza.parcelas.get(ref);
  const h = new Map();
  for (let k = 0; k < q.interior.length; k++) if (q.interior[k] && q.cultivo[k * 4 + 1] > 0) h.set(q.cultivo[k * 4 + 1], (h.get(q.cultivo[k * 4 + 1]) ?? 0) + 1);
  return { dias: [...h.entries()], byte: window.__juego.agricultura.reloj.byte };
}, REF);
comprueba(dias.dias.length === 1 && dias.dias[0][0] === dias.byte && r2.st.siembra?.cultivo === 'trigo', `la máscara guarda el día de siembra (byte ${dias.dias.map((d) => d[0]).join(', ')} = día de hoy) y la parcela el cultivo (${r2.st.siembra?.cultivo})`);
comprueba(r2.st.cuenta.rodadasApero > 0, 'rodadas de las ruedas de la sembradora');
comprueba(Math.abs(r2.st.ruedas - r2.antes.ruedas) > 20, 'sus ruedas giran');
comprueba(r2.st.lanza && Math.abs(r2.st.lanza.sobreSuelo - 0.42) < 0.3, `va apoyada en el suelo (lanza a ${r2.st.lanza?.sobreSuelo.toFixed(2)} m)`);
comprueba(r2.maxKmh <= aperos.sembradora.velocidadMaxKmh + 0.6, `no pasa de la velocidad de trabajo (máx. ${r2.maxKmh.toFixed(1)} km/h)`);
comprueba(!r2.sinPreparar, 'en la tierra preparada no avisa de rastrojo');

// --- 5. Curva y marcha atrás (rejas levantadas)
await p.keyboard.down('KeyW');
await p.keyboard.down('KeyA');
let giroMax = 0;
let sCurva = await hasta(p, (x) => { giroMax = Math.max(giroMax, Math.abs(x.lanza.giroGrados)); return false; }, 160);
await p.keyboard.up('KeyA');
await p.keyboard.up('KeyW');
comprueba(giroMax > 8 && giroMax <= arrastre.anguloMaxGrados + 0.5, `en la curva, la sembradora gira respecto al tractor (hasta ${giroMax.toFixed(0)}°; máximo ${arrastre.anguloMaxGrados}°)`);
await captura(p, '5_curva');
const sembradoAntes = sCurva.recuento.sembrado;
await p.keyboard.down('KeyS');
sCurva = await hasta(p, (x) => { giroMax = Math.max(giroMax, Math.abs(x.lanza.giroGrados)); return false; }, 160);
await p.keyboard.up('KeyS');
comprueba(Math.abs(sCurva.recuento.sembrado - sembradoAntes) < 0.05, 'marcha atrás con las rejas levantadas no siembra');
comprueba(giroMax <= arrastre.anguloMaxGrados + 0.5, `marcha atrás, la lanza no pasa del giro máximo (${giroMax.toFixed(0)}°)`);

// --- 6. Rastrojo y tolva vacía
// Un carril fuera de lo preparado (que es el central ± 12 m)
const tR = [carril.t + 17, carril.t - 17].find((tv) => { const [a, bb] = tramo(tv); return a !== null && bb - a > 35; });
if (tR !== undefined) {
  const rR = await pasada(tR, true, 14, null);
  comprueba(rR.sinPreparar, 'sembrar sobre rastrojo avisa');
}
await p.evaluate(() => { const a = window.__juego.agricultura.enganche.apero; a.carga = 0.2; a.pintaCarga(); });
const rV = await pasada(carril.t + 3, true, 30, null);
comprueba(rV.tolvaVacia && rV.st.carga === 0, 'con la tolva vacía deja de sembrar y avisa');
comprueba(/vacía/.test(rV.st.aviso), `avisa: «${rV.st.aviso}»`);

comprueba(errores.length === 0, `sin errores en la consola${errores.length ? `: ${errores.slice(0, 5).join(' | ')}` : ''}`);
await p.close();
await b.close();
console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
