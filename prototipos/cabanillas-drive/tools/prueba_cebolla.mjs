// Prueba de la fase A10 (primera parte) del modo agricultura: la cebolla.
//   1. ?agricultura=cebolla empieza con el tractor y la arrancadora (modelo hecho en código) dentro de
//      la 2-700 sembrada de cebolla madura (165 días).
//   2. Q baja la arrancadora; una pasada de verdad arranca la cebolla por donde pasa (1,8 m), el cajón
//      se llena según el rendimiento (55 t/ha por el vigor) y la parcela queda como arrancada.
//   3. Con la cebolla verde (edad pedida) no arranca nada.
//   4. En la COPE se descarga el cajón (queda apuntado) y se vende al precio de la cebolla.
//   5. Capturas de la cebolla en varias edades. Sin errores de consola.
// Uso: node tools/prueba_cebolla.mjs <carpeta de capturas> [bajo|medio|alto] [movil]
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
  await p.evaluate(() => window.__juego.ponPausa(true));
  await fotogramas(p, 45);
  await p.screenshot({ path: `${S}/cebolla_${nombre}${sufijo}.jpg`, quality: 85, timeout: 180000 });
  console.log(`  captura ${S}/cebolla_${nombre}${sufijo}.jpg`);
  await p.evaluate(() => window.__juego.ponPausa(false));
};
const estado = (p) => p.evaluate((ref) => {
  const j = window.__juego; const m = j.agricultura;
  const e = m.tractor.estado();
  const q = m.labranza.parcelas.get(ref);
  const a = m.aperos.arrancadora;
  return {
    enTractor: j.coche === m.tractor, apero: m.enganche.apero?.id, x: e.posicion.x, z: e.posicion.z, kmh: e.velocidadKmh,
    subida: m.enganche.subida, carga: a.carga, capacidad: a.capacidad, recuento: q ? { ...q.recuento() } : null,
    kgArrancados: m.labranza.cuenta?.kgArrancados ?? null,
    hud: document.getElementById('agri-hud')?.textContent ?? '',
    cajonY: a.modelo.getObjectByName('carga')?.scale.y,
  };
}, REF);
async function hasta(p, condicion, max = 400) {
  let s;
  for (let i = 0; i < max; i += 4) { await fotogramas(p, 4); s = await estado(p); if (condicion(s)) return s; }
  return s;
}
const entra = async (edad) => {
  const p = await contexto.newPage();
  p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  p.on('pageerror', (e) => errores.push(`PAGEERROR ${e.message}`)); p.on('crash', () => console.log('  PÁGINA CAÍDA'));
  await p.goto(`http://localhost:${puerto}/?calidad=${calidad}&personaje=0&hora=dia&debug=1&agricultura=cebolla${edad ? `&edad=${edad}` : ''}&dia=40`);
  await p.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 300000 });
  await p.evaluate(() => document.getElementById('jugar').click());
  await p.waitForFunction(() => window.__juego.agricultura, null, { timeout: 120000 });
  await fotogramas(p, 10);
  return p;
};

// --- 1 y 2. Cebolla madura
let p = await entra(null);
let s = await estado(p);
comprueba(s.enTractor && s.apero === 'arrancadora', 'empieza en el tractor con la arrancadora enganchada');
comprueba(s.recuento?.sembrado > 85 && /Cebolla/.test(s.hud) && /Madura/.test(s.hud), `la ${REF} está sembrada de cebolla madura (${s.recuento?.sembrado} %; panel: «${s.hud.slice(0, 80)}…»)`);
await captura(p, '0_inicio');
await p.keyboard.press('KeyQ');
s = await hasta(p, (x) => x.subida < 0.05, 200);
const x0 = s.x; const z0 = s.z;
await p.keyboard.down('KeyW');
let maxKmh = 0;
s = await hasta(p, (x) => { maxKmh = Math.max(maxKmh, x.kmh); return Math.hypot(x.x - x0, x.z - z0) > 30; }, 3000);
await captura(p, '1_arrancando');
await p.keyboard.up('KeyW');
s = await hasta(p, (x) => Math.abs(x.kmh) < 0.3, 300);
const recorrido = Math.hypot(s.x - x0, s.z - z0);
comprueba(s.carga > 100, `la arrancadora carga cebolla en el cajón: ${s.carga.toFixed(0)} kg tras ${recorrido.toFixed(0)} m (máx. ${maxKmh.toFixed(1)} km/h)`);
comprueba(maxKmh <= 7.5, 'con la arrancadora bajada el tractor no pasa de 7 km/h');
comprueba(s.recuento?.cosechado > 0, `queda cebolla arrancada en la parcela (${s.recuento?.cosechado} % cosechado)`);
comprueba(s.cajonY > 0.06, `el montón del cajón crece (escala ${s.cajonY?.toFixed(2)})`);
await captura(p, '2_cajon');

// --- 4. COPE: descargar el cajón y vender
const dinero0 = await p.evaluate(() => window.__juego.agricultura.economia.dinero);
await p.evaluate(() => window.__juego.agricultura.entra());
await fotogramas(p, 6);
const boton = p.getByText('Descargar el cajón en la COPE');
comprueba(await boton.count() === 1, 'el menú de la COPE ofrece «Descargar el cajón en la COPE»');
await captura(p, '3_menu');
const kg = s.carga;
await boton.click();
await fotogramas(p, 6);
const g = await p.evaluate(() => ({ granero: { ...window.__juego.agricultura.granero }, carga: window.__juego.agricultura.aperos.arrancadora.carga }));
comprueba(Math.abs((g.granero.cebolla ?? 0) - kg) < 1 && g.carga === 0, `el cajón se vacía y quedan ${Math.round(g.granero.cebolla ?? 0)} kg de cebolla en el granero`);
const importe = await p.evaluate(() => window.__juego.agricultura.vende('cebolla'));
const dinero1 = await p.evaluate(() => window.__juego.agricultura.economia.dinero);
comprueba(Math.abs(importe - kg * 0.3355) < 0.5 && Math.abs(dinero1 - dinero0 - importe) < 0.5, `se vende a 0,3355 €/kg: ${Math.round(importe)} €`);
await p.close();

// --- 3 y 5. Cebolla en varias edades (y verde no se arranca)
for (const edad of [30, 90, 140, 150]) {
  p = await entra(edad);
  await captura(p, `edad${edad}`);
  if (edad === 90) {
    await p.keyboard.press('KeyQ');
    await hasta(p, (x) => x.subida < 0.05, 200);
    await p.keyboard.down('KeyW');
    const t0 = await estado(p);
    await hasta(p, (x) => Math.hypot(x.x - t0.x, x.z - t0.z) > 15, 2000);
    await p.keyboard.up('KeyW');
    const f = await estado(p);
    comprueba(f.carga === 0, 'con la cebolla verde (90 días) la arrancadora no arranca nada');
  }
  await p.close();
}
comprueba(errores.length === 0, errores.length ? `errores de consola: ${errores.slice(0, 3).join(' | ')}` : 'sin errores de consola');
await b.close();
console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTODO BIEN');
process.exit(fallos ? 1 : 0);
