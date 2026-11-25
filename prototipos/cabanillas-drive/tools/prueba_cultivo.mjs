// Prueba de la fase A6 del modo agricultura (PLAN_AGRICULTURA.md): los cultivos crecen.
//   1. ?dia=N empieza el reloj agrícola en ese día; con el juego en marcha avanza una hora de juego
//      por día (AGRICULTURA.reloj); en la COPE se pasan días.
//   2. En la 2-700 (preparada y abonada con el pincel) se siembra trigo en tres franjas en días
//      distintos (1, 31 y 61) con el mismo pincel que la sembradora (la sembradora de verdad la
//      prueba prueba_siembra.mjs); y cebada en una parcela vecina.
//   3. Pasando días se ven las etapas: nascencia, ahijado, encañado, espigado, llenado y madura;
//      el panel dice la etapa; las franjas de días distintos tienen alturas distintas.
//   4. Lo que se queda sin cosechar no vuelve a nacer al pasar de 255 días.
//   5. Coste: milisegundos por fotograma y triángulos con el cultivo a la vista y sin él.
//   6. Sin errores de consola.
// Uso: node tools/prueba_cultivo.mjs <carpeta de capturas> [bajo|medio|alto] [movil]
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
  await p.screenshot({ path: `${S}/cultivo_${nombre}${sufijo}.jpg`, quality: 85, timeout: 180000 });
  console.log(`  captura ${S}/cultivo_${nombre}${sufijo}.jpg`);
};
const DIA0 = 3;
const p = await contexto.newPage();
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
p.on('pageerror', (e) => errores.push(`PAGEERROR ${e.message}`));
await p.goto(`http://localhost:${puerto}/?calidad=${calidad}&personaje=0&hora=dia&debug=1&agricultura&dia=${DIA0}`);
await p.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 300000 });
await p.evaluate(() => document.getElementById('jugar').click());
await p.waitForFunction(() => window.__juego.agricultura, null, { timeout: 120000 });
await fotogramas(p, 4);

// --- 1. Reloj
let r = await p.evaluate(() => ({ dia: window.__juego.agricultura.reloj.dia, hoy: window.__juego.agricultura.reloj.hoy, t: performance.now() }));
comprueba(r.dia === DIA0, `?dia=${DIA0} empieza el reloj en el día ${r.dia}`);
await fotogramas(p, 120);
const r2 = await p.evaluate(() => ({ hoy: window.__juego.agricultura.reloj.hoy, t: performance.now() }));
const seg = (r2.hoy - r.hoy) * 3600;
const real = (r2.t - r.t) / 1000;
// El juego cuenta su tiempo (con fotogramas muy lentos, como aquí, cada uno cuenta como mucho lo que
// deja el bucle del juego): avanza, y nunca más que el tiempo real
comprueba(seg > 0.5 && seg <= real * 1.05, `con el juego en marcha el reloj avanza (${seg.toFixed(1)} s de juego en ${real.toFixed(1)} s reales)`);
const unaHora = await p.evaluate(() => { const rl = window.__juego.agricultura.reloj; const a = rl.hoy; rl.avanza(1800); const d = rl.hoy - a; rl.pon(a); return d; });
comprueba(Math.abs(unaHora - 0.5) < 1e-9, `media hora de juego es medio día de cultivo (${unaHora} días)`);
// Pasar días en el menú de la COPE
if (movil) await p.locator('[data-pulsar="entrar"]').dispatchEvent('pointerdown');
else await p.keyboard.press('KeyE');
await fotogramas(p, 3);
const textoCalendario = await p.evaluate(() => [...document.querySelectorAll('#menu-cope .tolva')].map((x) => x.textContent).join(' | '));
await p.evaluate(() => [...document.querySelectorAll('#menu-cope button')].find((x) => x.textContent.includes('+7')).click());
await fotogramas(p, 3);
await captura(p, '0_calendario');
r = await p.evaluate(() => window.__juego.agricultura.reloj.dia);
comprueba(r === DIA0 + 7, `en la COPE, «+7 días» pasa al día ${r} («${textoCalendario}»)`);
await p.evaluate(() => [...document.querySelectorAll('#menu-cope button')].find((x) => x.textContent === 'Cerrar').click());

// --- 2. Siembra en franjas (y cebada al lado)
const datos = await p.evaluate(async (ref) => {
  const j = window.__juego; const m = j.agricultura;
  m.cogeTractor(0, null);
  const d = await (await fetch('/assets/agricultura/parcelas.json')).json();
  const par = d.parcelas.find((x) => x.ref === ref);
  const rr = (par.labor_grados * Math.PI) / 180;
  const e = [Math.sin(rr), -Math.cos(rr)];
  const n = [-e[1], e[0]];
  const c = par.centro;
  const { pinta } = await import('/src/agricultura/pincel.js');
  const linea = (q, t, lab, ancho, op = {}) => pinta(q, lab, c[0] - e[0] * 300 + n[0] * t, c[1] - e[1] * 300 + n[1] * t,
    c[0] + e[0] * 300 + n[0] * t, c[1] + e[1] * 300 + n[1] * t, ancho, op);
  const q = m.labranza.activa(m.registro.parcelaEn(c[0], c[1]));
  for (let t = -17; t <= 17; t += 2) { linea(q, t, 'gradear', 2.2); linea(q, t, 'abonar', 2.2); }
  // Tres franjas de 10 m, sembradas con 30 días de diferencia (se siembran al llegar su día; el
  // reloj nunca va hacia atrás). Aquí se siembra la primera, el día 1
  m.reloj.pon(1);
  const franjas = [[-11, 1], [0, 31], [11, 61]].map(([t, dia]) => ({ t, dia, x: c[0] + n[0] * t, z: c[1] + n[1] * t }));
  window.__siembraFranja = (f) => {
    linea(q, f.t, 'sembrar', 10, { dia: m.reloj.byte, extremosRectos: true });
    q.siembra = { cultivo: 'trigo', primerDia: q.siembra?.primerDia ?? m.reloj.dia, ultimoDia: m.reloj.dia };
  };
  window.__siembraFranja(franjas[0]);
  // Cebada en la parcela de al lado (la primera que se encuentre a un lado de la 2-700), el día 61
  let vecina = null;
  window.__siembraCebada = () => {
    if (!vecina) return;
    const v = m.labranza.parcelas.get(vecina.ref);
    pinta(v, 'sembrar', vecina.x - e[0] * 60, vecina.z - e[1] * 60, vecina.x + e[0] * 60, vecina.z + e[1] * 60, 12, { dia: m.reloj.byte, extremosRectos: true });
    v.siembra = { cultivo: 'cebada', primerDia: m.reloj.dia, ultimoDia: m.reloj.dia };
  };
  for (const t of [36, 40, -26, -30, 46]) {
    const x = c[0] + n[0] * t; const z = c[1] + n[1] * t;
    const info = m.registro.parcelaEn(x, z);
    if (info && info.ref !== ref && (info.superficie_ha ?? 0) > 0.1) {
      const v = m.labranza.activa(info);
      pinta(v, 'gradear', x - e[0] * 60, z - e[1] * 60, x + e[0] * 60, z + e[1] * 60, 12);
      pinta(v, 'abonar', x - e[0] * 60, z - e[1] * 60, x + e[0] * 60, z + e[1] * 60, 12);
      vecina = { ref: info.ref, x, z };
      break;
    }
  }
  return { e, n, c, franjas, vecina, rec: q.recuento() };
}, REF);
console.log('  franjas', JSON.stringify(datos.franjas.map((f) => [f.t, f.dia])), 'cebada en', datos.vecina?.ref, JSON.stringify(datos.rec));
comprueba(datos.rec.sembrado > 15, `primera franja de trigo sembrada el día 1 (${datos.rec.sembrado} % de la parcela)`);
comprueba(Boolean(datos.vecina), `cebada en la parcela de al lado (${datos.vecina?.ref})`);
// El tractor, parado al principio de la franja del medio, mirando a lo largo
await p.evaluate(({ e, c }) => {
  const j = window.__juego;
  const x = c[0] - e[0] * 38; const z = c[1] - e[1] * 38;
  const { alturaLibre, altoCaja } = j.coche.config.chasis;
  j.coche.recoloca(x, j.mundo.terreno.alturaEn(x, z) + alturaLibre + altoCaja / 2 + 0.12, z, e[0], e[1]);
}, datos);

// --- 3. Etapas (edades de la primera franja)
const etapas = [[20, 'Nascencia'], [70, 'Ahijado'], [140, 'Encañado'], [172, 'Espigado'], [205, 'Llenado del grano'], [226, 'Madura']];
const alturas = {};
for (const [edad, etapa] of etapas) {
  const est = await p.evaluate(async ({ edad, franjas }) => {
    const m = window.__juego.agricultura;
    // Las otras dos franjas (y la cebada) se siembran al llegar su día
    for (const f of franjas.slice(1)) {
      if (!f.sembrada && 1 + edad > f.dia) {
        m.reloj.pon(f.dia);
        window.__siembraFranja(f);
        if (f.dia === 61) window.__siembraCebada();
        f.sembrada = true;
      }
    }
    window.__franjas = franjas;
    m.reloj.pon(1 + edad);
    for (const q of m.labranza.parcelas.values()) q.sube(performance.now(), true);
    const { faseDe } = await import('/src/agricultura/crecimiento.js');
    return { dia: m.reloj.dia, fases: franjas.map((f) => faseDe('trigo', m.reloj.dia - f.dia)), cebada: faseDe('cebada', m.reloj.dia - 61) };
  }, { edad, franjas: await p.evaluate(() => window.__franjas) ?? datos.franjas });
  alturas[edad] = est.fases.map((f) => f.altura);
  // Para ver la nascencia, el tractor se pone en la primera franja (la única sembrada); luego, en la del medio
  await p.evaluate(({ e, c, n, t }) => {
    const j = window.__juego;
    const x = c[0] - e[0] * 38 + n[0] * t; const z = c[1] - e[1] * 38 + n[1] * t;
    const { alturaLibre, altoCaja } = j.coche.config.chasis;
    j.coche.recoloca(x, j.mundo.terreno.alturaEn(x, z) + alturaLibre + altoCaja / 2 + 0.12, z, e[0], e[1]);
  }, { ...datos, t: edad === 20 ? -11 : 0 });
  await fotogramas(p, 12);
  const hud = await p.evaluate(() => document.getElementById('agri-hud')?.textContent ?? '');
  comprueba(est.fases[0].etapa === etapa, `día ${est.dia}: la primera franja (${edad} días) está en «${est.fases[0].etapa}»; las otras, «${est.fases[1].etapa}» y «${est.fases[2].etapa}»; la cebada, «${est.cebada.etapa}»`);
  comprueba(/Trigo/.test(hud) && /días/.test(hud), `  el panel dice el cultivo y la etapa donde está el tractor («${hud.match(/🌾[^📅]*/)?.[0]?.trim()}»)`);
  const nombre = etapa.toLowerCase().replace(/ /g, '_').normalize('NFD').replace(/[̀-ͯ]/g, '');
  await captura(p, `${edad}_${nombre}`);
  if ([70, 172, 226].includes(edad)) {
    await p.evaluate(() => window.__juego.ponPausa(true));
    await fotogramas(p, 45);
    await captura(p, `${edad}_${nombre}_vista`);
    await p.evaluate(() => window.__juego.ponPausa(false));
  }
}
const h = alturas[172];
comprueba(h[0] > h[1] + 0.1 && h[1] > h[2] + 0.1, `el día 173, las franjas sembradas en días distintos tienen alturas distintas (${h.map((x) => x.toFixed(2)).join(', ')} m)`);
// De cerca: cámara de la cabina con el trigo espigado
await p.evaluate(() => window.__juego.agricultura.reloj.pon(1 + 185));
await p.evaluate(() => window.__juego.camaraCoche.cambia());
await fotogramas(p, 10);
await captura(p, 'cabina_floracion');
await p.evaluate(() => window.__juego.camaraCoche.cambia());

// --- 4. Sin cosechar: no vuelve a nacer
const viejo = await p.evaluate(async () => {
  const m = window.__juego.agricultura;
  const { edadDe } = await import('/src/agricultura/crecimiento.js');
  m.pasaDias(300);
  let max = 0; let n = 0;
  for (const q of m.labranza.parcelas.values()) {
    for (let k = 0; k < q.interior.length; k++) {
      const b0 = q.cultivo[k * 4 + 1];
      if (b0) { max = Math.max(max, edadDe(b0, m.reloj.dia)); n++; }
    }
  }
  return { max, n, dia: m.reloj.dia };
});
comprueba(viejo.n > 0 && viejo.max <= 250 && viejo.max >= 240, `300 días después (día ${viejo.dia}) lo sembrado sigue maduro y no vuelve a nacer (edad tope ${viejo.max} días)`);

// --- 5. Coste por fotograma (cerca del cultivo, con él y sin él)
await p.evaluate(() => window.__juego.agricultura.reloj.pon(1 + 185));
await fotogramas(p, 10);
const coste = await p.evaluate(async () => {
  const j = window.__juego;
  const m = j.agricultura;
  const mide = () => new Promise((res) => {
    const t = []; let antes = performance.now(); let k = 0;
    const f = () => { const ahora = performance.now(); t.push(ahora - antes); antes = ahora; if (++k < 40) requestAnimationFrame(f); else res(t.slice(5).reduce((a, b2) => a + b2, 0) / (t.length - 5)); };
    requestAnimationFrame(f);
  });
  const con = await mide();
  const triCon = j.renderer?.info.render.triangles ?? null;
  for (const c of m.cultivos.values()) c.raiz.visible = false;
  const sin = await mide();
  const triSin = j.renderer?.info.render.triangles ?? null;
  for (const c of m.cultivos.values()) c.raiz.visible = true;
  const inst = [...m.cultivos.values()].map((c) => c.instancias);
  return { con, sin, triCon, triSin, inst };
});
console.log(`  coste (${calidad}, swiftshader): ${coste.con.toFixed(1)} ms con el cultivo, ${coste.sin.toFixed(1)} ms sin él; matas por parcela: ${coste.inst.join(', ')}; triángulos ${coste.triCon ?? '?'} / ${coste.triSin ?? '?'}`);
comprueba(coste.con < coste.sin * 2.2, `el cultivo no más que dobla el tiempo del fotograma (${(coste.con / coste.sin).toFixed(2)} veces)`);

comprueba(errores.length === 0, `sin errores en la consola${errores.length ? `: ${errores.slice(0, 5).join(' | ')}` : ''}`);
await p.close();
await b.close();
console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
