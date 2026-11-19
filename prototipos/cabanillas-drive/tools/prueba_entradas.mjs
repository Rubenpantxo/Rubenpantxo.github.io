// Prueba de los puntos de entrada (F7) dentro del juego, en un navegador sin ventana:
//   1. Las entradas con sitio salen en «Ir a…» y en el minimapa; la que no tiene sitio, no.
//   2. «Ir a…» lleva al aro; dentro aparece el aviso (y en táctil el botón «Entrar»); E (o el
//      botón) abre el menú de fiestas; «Volver al pueblo» deja el coche donde estaba.
//   3. En coche corriendo no se entra; parado, sí.
//   4. «Ir a las fiestas» de la pantalla de inicio abre el menú.
//   5. ?aparece=<entrada> (de vuelta de otro juego) pone el coche allí y limpia la dirección.
//   6. Fuera de los aros, E sigue siendo bajarse del coche.
// Saca capturas. Hace falta el servidor de desarrollo (npm run dev) y Playwright.
// Uso: node tools/prueba_entradas.mjs <carpeta de capturas> [bajo|medio|alto] [movil|no]
import { createRequire } from 'node:module';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const S = process.argv[2];
const calidad = process.argv[3] ?? 'bajo';
const movil = process.argv[4] === 'movil';
const b = await chromium.launch({ channel: process.env.CANAL, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const contexto = await b.newContext(movil ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } : { viewport: { width: 1100, height: 620 } });
let fallos = 0;
const comprueba = (ok, texto) => { console.log(`  ${ok ? 'bien ' : 'FALLO'}  ${texto}`); if (!ok) fallos++; };
const errores = [];
async function abre(consulta = '', boton = 'jugar') {
  const p = await contexto.newPage();
  p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  p.on('pageerror', (e) => errores.push('PAGEERROR ' + e.message));
  await p.goto(`http://localhost:${process.env.PUERTO ?? '5173'}/?salto=0&personaje=0&calidad=${calidad}&debug=1${consulta}`);
  await p.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 240000 });
  await p.evaluate((id) => document.getElementById(id).click(), boton);
  await p.waitForTimeout(800);
  return p;
}
// Unos fotogramas del juego de verdad (el bucle va a menos de 1 FPS aquí: se espera a que pasen)
const fotogramas = (p, n = 3) => p.evaluate((k) => new Promise((r) => {
  let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);
const panel = (p) => p.evaluate(() => document.getElementById('estado').textContent);

console.log('1. Lugares');
const p = await abre();
const lugares = await p.evaluate(() => window.__juego.lugares.map((l) => l.nombre));
const opciones = await p.evaluate(() => [...document.querySelectorAll('#ir-a option')].map((o) => o.textContent));
comprueba(['Fiestas · Plaza', 'Fiestas · San Roque', 'Frontón · San Isidro', 'Frontón · Bardenas Reales'].every((l) => lugares.includes(l)),
  `«Ir a…»: ${lugares.filter((l) => l.startsWith('Fiestas') || l.startsWith('Frontón')).join(', ')} (${opciones.length - 1} lugares en la lista)`);

console.log('2. Ir a la plaza y entrar');
await p.evaluate(() => window.__juego.irA('Fiestas · Plaza'));
await fotogramas(p, 4);
const enPlaza = await p.evaluate(() => {
  const j = window.__juego; const c = j.coche.estado().posicion;
  return { d: Math.hypot(c.x - 177.2, c.z - 335.6), boton: !document.querySelector('[data-pulsar="entrar"]').hidden, coche: [c.x, c.z] };
});
const aviso = await p.evaluate(() => window.__juego.ultimoAviso);   // el último aviso, aunque ya haya caducado
comprueba(enPlaza.d < 7 && /Fiestas · Plaza/.test(aviso), `coche a ${enPlaza.d.toFixed(1)} m del aro; aviso «${aviso}»; botón Entrar ${enPlaza.boton ? 'a la vista' : 'oculto'}`);
await fotogramas(p, 8);                // la cámara del coche se asienta detrás
await p.screenshot({ path: `${S}/f7_aro_plaza${movil ? '_movil' : ''}.jpg`, quality: 85, timeout: 120000 });
if (movil) {
  await p.tap('[data-pulsar="entrar"]');
} else {
  await p.keyboard.press('KeyE');
}
await p.waitForFunction(() => window.__juego.modoFiestas !== null, null, { timeout: 120000 });
await p.waitForTimeout(1500);
const dentro = await p.evaluate(() => ({ modo: window.__juego.modoFiestas, entrada: window.__juego.fiestas.entrada,
  menu: getComputedStyle(document.getElementById('menu-fiestas')).display !== 'none', aPie: window.__juego.aPie }));
comprueba(dentro.entrada === 'menu' && dentro.menu, `${movil ? 'tocar «Entrar»' : 'E'}: ${JSON.stringify(dentro)}`);
await p.evaluate(() => [...document.querySelectorAll('#menu-fiestas button')].find((x) => x.textContent.includes('Volver al pueblo')).click());
await p.waitForFunction(() => window.__juego.modoFiestas === null, null, { timeout: 120000 });
await p.waitForTimeout(800);
const fuera = await p.evaluate(() => { const c = window.__juego.coche.estado().posicion; return { coche: [c.x, c.z], aPie: window.__juego.aPie }; });
comprueba(!fuera.aPie && Math.hypot(fuera.coche[0] - enPlaza.coche[0], fuera.coche[1] - enPlaza.coche[1]) < 1.5, `de vuelta en el coche, en el mismo sitio`);

console.log('3. En coche, corriendo, no se entra');
await p.evaluate(() => window.__juego.irA('Fiestas · San Roque'));
await fotogramas(p, 3);
// Unos 43 km/h durante unos fotogramas (el aviso se mira al principio de cada uno)
for (let i = 0; i < 3; i++) {
  await p.evaluate(() => window.__juego.coche.cuerpo.setLinvel({ x: 12, y: 0, z: 0 }, true));
  await fotogramas(p, 1);
}
const conPrisa = await p.evaluate(() => ({ kmh: Math.abs(window.__juego.coche.estado().velocidadKmh), boton: !document.querySelector('[data-pulsar="entrar"]').hidden }));
await p.evaluate(() => window.__juego.irA('Fiestas · San Roque'));
await fotogramas(p, 3);
const parado = await p.evaluate(() => ({ kmh: Math.abs(window.__juego.coche.estado().velocidadKmh), boton: !document.querySelector('[data-pulsar="entrar"]').hidden }));
comprueba(!conPrisa.boton && parado.boton, `a ${conPrisa.kmh.toFixed(0)} km/h no deja (botón ${conPrisa.boton}); parado (${parado.kmh.toFixed(0)} km/h), sí (botón ${parado.boton})`);

console.log('3b. Frontón: lleva a la cesta punta y, al volver atrás, aparece allí');
if (!movil) {
  await p.evaluate(() => window.__juego.irA('Frontón · Bardenas Reales'));
  for (let i = 0; i < 20 && await p.evaluate(() => Math.abs(window.__juego.coche.estado().velocidadKmh) > 2); i++) await fotogramas(p, 2);
  await fotogramas(p, 6);
  await p.screenshot({ path: `${S}/f7_aro_fronton.jpg`, quality: 85, timeout: 120000 });
  await Promise.all([p.waitForURL('**/juegos/cesta-punta/**', { timeout: 120000 }), p.keyboard.press('KeyE')]);
  const fuera = new URL(p.url()).pathname;
  await p.goBack({ timeout: 120000 });
  await p.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 240000 });
  await p.evaluate(() => document.getElementById('jugar').click());
  await fotogramas(p, 3);
  const vuelta = await p.evaluate(() => { const c = window.__juego.coche.estado().posicion; return { d: Math.hypot(c.x + 49.5, c.z + 65.5), url: location.search }; });
  comprueba(fuera === '/juegos/cesta-punta/' && vuelta.d < 10 && !vuelta.url.includes('aparece'),
    `E en el frontón → ${fuera}; atrás → coche a ${vuelta.d.toFixed(1)} m de la entrada; dirección «${vuelta.url}»`);
}

await p.close();

console.log('4. Desde la pantalla de inicio');
const p2 = await abre('', 'jugar-fiestas');
await p2.waitForFunction(() => window.__juego.modoFiestas !== null, null, { timeout: 120000 });
await p2.waitForTimeout(1500);
const inicio = await p2.evaluate(() => ({ entrada: window.__juego.fiestas.entrada, menu: getComputedStyle(document.getElementById('menu-fiestas')).display !== 'none' }));
comprueba(inicio.entrada === 'menu' && inicio.menu, `«Ir a las fiestas»: ${JSON.stringify(inicio)}`);
await p2.close();

console.log('5. De vuelta de otro juego (?aparece=)');
const p3 = await abre('&aparece=fiestas_sanroque');
await fotogramas(p3, 3);
const vuelta = await p3.evaluate(() => { const c = window.__juego.coche.estado().posicion; return { d: Math.hypot(c.x - 117.3, c.z - 317.2), url: location.search }; });
comprueba(vuelta.d < 10 && !vuelta.url.includes('aparece'), `coche a ${vuelta.d.toFixed(1)} m de San Roque; dirección «${vuelta.url}»`);
console.log('6. Fuera de los aros, E baja del coche');
await p3.evaluate(() => window.__juego.irA('Ayuntamiento de Cabanillas'));
// Hasta que el coche se asienta (con el coche en marcha no deja bajarse)
for (let i = 0; i < 20 && await p3.evaluate(() => Math.abs(window.__juego.coche.estado().velocidadKmh) > 2); i++) await fotogramas(p3, 2);
if (!movil) {
  await p3.keyboard.press('KeyE');
  await fotogramas(p3, 3);
  const baja = await p3.evaluate(() => ({ aPie: window.__juego.aPie, modo: window.__juego.modoFiestas, aviso: document.getElementById('estado').textContent, kmh: Math.round(window.__juego.coche.estado().velocidadKmh) }));
  comprueba(baja.aPie && baja.modo === null, `E en el Ayuntamiento: ${JSON.stringify(baja)}`);
}
await p3.close();
comprueba(errores.length === 0, `errores de consola: ${JSON.stringify(errores.slice(0, 6))}`);
console.log(fallos ? `\n${fallos} comprobaciones fallan` : '\nTodo bien');
await b.close();
process.exit(fallos ? 1 : 0);
