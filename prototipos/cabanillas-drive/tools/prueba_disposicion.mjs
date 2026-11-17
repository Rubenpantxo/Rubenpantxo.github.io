// Comprueba la disposición de la pantalla del modo fiestas en móviles en apaisado (F8): que el
// marcador, los avisos, el minimapa, el botón de menú y los botones de las suertes no se pisen ni
// se salgan de la pantalla, en varios tamaños. Saca una captura de cada uno.
// Hace falta el servidor de desarrollo (npm run dev) y Playwright.
// Uso: node tools/prueba_disposicion.mjs <carpeta de capturas>
import { createRequire } from 'node:module';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const S = process.argv[2];
const TAMANOS = [[667, 375], [740, 360], [844, 390], [915, 412], [1024, 600]];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fallos = 0;
const comprueba = (ok, texto) => { console.log(`  ${ok ? 'bien ' : 'FALLO'}  ${texto}`); if (!ok) fallos++; };
for (const [ancho, alto] of TAMANOS) {
  const c = await b.newContext({ viewport: { width: ancho, height: alto }, hasTouch: true, isMobile: true });
  const p = await c.newPage();
  await p.goto('http://localhost:5173/?calidad=bajo&debug=0&mozos=0');
  await p.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 300000 });
  await p.evaluate(() => document.getElementById('jugar').click());
  await p.evaluate(async () => {
    const { FIESTAS } = await import('/src/config/fiestas.js');
    FIESTAS.vaca.salidaS = 0.5;
    await window.__juego.entraFiestas('concurso');
  });
  await p.waitForFunction(() => window.__juego.fiestas?.partida, null, { timeout: 120000 });
  // La vaca embistiendo cerca (botones encendidos), un aviso grande y el refugio a mano
  const cajas = await p.evaluate(() => {
    const j = window.__juego; const f = j.fiestas;
    j.ponPausa(true); f.mostrarHud(true);
    const q = { avance: 0, lateral: 0, correr: false, conJoystick: false, giro: 0 };
    for (let i = 0; i < 120; i++) { f.paso(q, 1 / 60); j.fisica.mundo.step(); }
    const v = f.vacas[0]; const p = f.personaje.posicion();
    v.pon(p.x + 5, p.z + 1, Math.atan2(-5, -1), 'embiste', 0);
    f.paso(q, 1 / 60);
    f.recortes.avisa('¡Olé! Quiebro ceñido +300', 'ole', 5);
    f.fotograma(0.016, { dx: 0, dy: 0 }, { giro: 0 });
    document.querySelector('[data-pulsar="refugio"]').hidden = false;
    const r = (sel, nombre) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden')
      .map((e) => { const b = e.getBoundingClientRect(); return { nombre: nombre ?? sel, x0: b.left, y0: b.top, x1: b.right, y1: b.bottom }; })
      .filter((b) => b.x1 - b.x0 > 0);
    return [
      ...r('#hud-fiestas .paneles', 'marcador'), ...r('#hud-fiestas .aviso', 'aviso'), ...r('#hud-fiestas .pista', 'consejo'),
      ...r('#minimapa', 'minimapa'), ...r('#boton-menu', 'menú'),
      ...[...document.querySelectorAll('.botones-fiestas .boton-tactil')].filter((e) => !e.hidden)
        .map((e) => { const b = e.getBoundingClientRect(); return { nombre: `botón ${e.textContent}`, x0: b.left, y0: b.top, x1: b.right, y1: b.bottom }; }),
    ];
  });
  await p.evaluate(() => { window.__render.render(); });
  await p.screenshot({ path: `${S}/f8_${ancho}x${alto}.jpg`, quality: 80, timeout: 120000 });
  const pisan = [];
  for (let i = 0; i < cajas.length; i++) {
    for (let k = i + 1; k < cajas.length; k++) {
      const a = cajas[i]; const o = cajas[k];
      const sx = Math.min(a.x1, o.x1) - Math.max(a.x0, o.x0); const sy = Math.min(a.y1, o.y1) - Math.max(a.y0, o.y0);
      if (sx > 2 && sy > 2) pisan.push(`${a.nombre} / ${o.nombre}`);
    }
  }
  const fuera = cajas.filter((a) => a.x0 < -1 || a.y0 < -1 || a.x1 > ancho + 1 || a.y1 > alto + 1).map((a) => a.nombre);
  comprueba(!pisan.length && !fuera.length, `${ancho}×${alto}: ${cajas.length} elementos${pisan.length ? `; se pisan: ${pisan.join(', ')}` : ''}${fuera.length ? `; fuera: ${fuera.join(', ')}` : ''}`);
  await c.close();
}
console.log(fallos ? `\n${fallos} tamaños con problemas` : '\nTodo bien');
await b.close();
process.exit(fallos ? 1 : 0);
