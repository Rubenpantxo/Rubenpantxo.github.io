// El editor de personaje solo se abre desde los sitios «Tu personaje» del mapa (no en la portada ni al empezar).
//   1. La portada no tiene «Crea tu personaje» y «Jugar» entra directo (sin editor).
//   2. Los tres sitios están en «Ir a…» y, estando en uno y pulsando E, se abre el editor (HUD oculto).
//   3. «Cancelar» y «Guardar» cierran el editor y el juego sigue. Sin errores de consola.
// Uso: node tools/prueba_editor_mapa.mjs [bajo|medio|alto]
import { createRequire } from 'node:module';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const calidad = process.argv[2] ?? 'bajo';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 1100, height: 620 } })).newPage();
let fallos = 0; const errores = [];
const comprueba = (ok, t) => { console.log(`  ${ok ? 'bien ' : 'FALLO'}  ${t}`); if (!ok) fallos++; };
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
p.on('pageerror', (e) => errores.push('PAGEERROR ' + e.message));
const fr = (n) => p.evaluate((k) => new Promise((r) => { let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
await p.goto(`http://localhost:5173/?calidad=${calidad}&hora=dia&debug=1&salto=0`);
await p.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 400000 });
comprueba(await p.evaluate(() => !document.getElementById('crear-personaje')), 'la portada no tiene «Crea tu personaje»');
await p.evaluate(() => document.getElementById('jugar').click());
await fr(10);
comprueba(await p.evaluate(() => !document.getElementById('editor-personaje') && !document.body.classList.contains('editando-personaje')), '«Jugar» entra directo, sin editor');
const lugares = await p.evaluate(() => window.__juego.lugares.map((l) => l.nombre));
const mios = lugares.filter((n) => n.startsWith('Tu personaje'));
comprueba(mios.length === 3, `3 sitios en «Ir a…»: ${mios.join(' | ')}`);
for (const nombre of mios) {
  await p.evaluate((n) => window.__juego.irA(n), nombre);
  await fr(30);
  await p.keyboard.press('KeyE');
  await p.waitForSelector('#editor-personaje .ep-acciones', { timeout: 120000 });
  const oculto = await p.evaluate(() => getComputedStyle(document.getElementById('hud')).visibility === 'hidden');
  comprueba(oculto, `${nombre}: E abre el editor y el HUD se oculta`);
  const accion = nombre.includes('Peluquería') ? 'Guardar' : 'Cancelar';
  await p.locator('#editor-personaje .ep-acciones button', { hasText: accion }).click();
  await fr(20);
  comprueba(await p.evaluate(() => !document.getElementById('editor-personaje') && !document.body.classList.contains('editando-personaje')), `${nombre}: «${accion}» vuelve al juego`);
}
comprueba(errores.length === 0, `sin errores de consola${errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''}`);
await b.close();
console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO BIEN');
process.exit(fallos ? 1 : 0);
