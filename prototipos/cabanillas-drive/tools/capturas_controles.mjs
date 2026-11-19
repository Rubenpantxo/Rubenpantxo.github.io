// Capturas de la pestaña «Fiestas» de la pantalla de Controles (F8): una en el ordenador
// (1280 × 720) y otra en el móvil en apaisado (1266 × 585), con el marcador, una embestida (las
// suertes encendidas), un «¡Olé!» y la valla a mano. Las guarda en public/ui/ (webp) y escribe
// dónde poner cada número de la leyenda (en % de la imagen), para copiarlo a index.html.
// Hace falta el servidor de desarrollo (npm run dev), Playwright y Python con Pillow.
// Uso: node tools/capturas_controles.mjs [calidad]
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const calidad = process.argv[2] ?? 'medio';
const tmp = mkdtempSync(join(tmpdir(), 'capturas-'));
const b = await chromium.launch({ channel: process.env.CANAL, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const VISTAS = [
  { nombre: 'teclado', contexto: { viewport: { width: 1280, height: 720 } },
    marcas: [['#hud-fiestas .paneles > .panel:first-child', 'jugador'], ['#hud-fiestas .paneles > .panel:last-child', 'vaquilla'],
      ['#hud-fiestas .aviso', 'aviso'], ['#hud-fiestas .pista', 'consejo'], ['#hud-fiestas .teclas', 'suertes'], ['#minimapa', 'minimapa']] },
  { nombre: 'tactil', contexto: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true },
    marcas: [['#boton-menu', 'menú'], ['#hud-fiestas .paneles > .panel:first-child', 'jugador'], ['#hud-fiestas .paneles > .panel:last-child', 'vaquilla'],
      ['.joystick-base', 'joystick'], ['[data-pulsar="quiebro"]', 'quiebro'], ['[data-pulsar="recorte"]', 'recorte'], ['[data-pulsar="salto"]', 'salto'],
      ['[data-pulsar="especial"]', 'especial'], ['[data-pulsar="refugio"]', 'subir'], ['[data-pulsar="camaraFiestas"]', 'cámara'], ['[data-pulsar="sonido"]', 'sonido']] },
];
for (const v of VISTAS) {
  const c = await b.newContext(v.contexto);
  const p = await c.newPage();
  await p.goto(`http://localhost:${process.env.PUERTO ?? '5173'}/?salto=0&calidad=${calidad}&mozos=0&capa=colorada`);
  await p.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 300000 });
  await p.evaluate(() => { document.documentElement.dataset.joystick = 'fijo'; document.getElementById('jugar').click(); });
  await p.evaluate(async () => {
    const { FIESTAS } = await import('/src/config/fiestas.js');
    FIESTAS.vaca.salidaS = 0.3;
    await window.__juego.entraFiestas('concurso');
  });
  await p.waitForFunction(() => window.__juego.fiestas?.partida, null, { timeout: 120000 });
  await p.evaluate(() => {
    const j = window.__juego; const f = j.fiestas; const r = f.recinto;
    j.ponPausa(true); f.mostrarHud(true);
    const q = { avance: 0, lateral: 0, correr: false, conJoystick: false, giro: 0 };
    for (let i = 0; i < 90; i++) { f.paso(q, 1 / 60); j.fisica.mundo.step(); }
    // El jugador a un metro de la valla de tablones del lado sur, mirando al ruedo
    const t = r.tramos.find((x) => x.zona === 'plaza' && x.tipo === 'tablones' && x.clase === 'fachada' && x.largo > 8);
    const m = [(t.a[0] + t.b[0]) / 2, (t.a[1] + t.b[1]) / 2];
    const c = r.plaza.ruedo.reduce((s, p) => [s[0] + p[0] / r.plaza.ruedo.length, s[1] + p[1] / r.plaza.ruedo.length], [0, 0]);
    const l = Math.hypot(c[0] - m[0], c[1] - m[1]); const n = [(c[0] - m[0]) / l, (c[1] - m[1]) / l];
    const x = m[0] + n[0] * 1.0; const z = m[1] + n[1] * 1.0;
    // Mirando a lo largo de la valla, un poco hacia el ruedo (la cámara queda dentro)
    const d = [(t.b[0] - t.a[0]) / t.largo, (t.b[1] - t.a[1]) / t.largo];
    const mira = [d[0] * 0.8 + n[0] * 0.6, d[1] * 0.8 + n[1] * 0.6];
    const guinada = Math.atan2(-mira[0], -mira[1]);
    j.peaton.activa(x, z, guinada); j.colisiones.fuerza({ x, z });
    f.personaje.reinicia(guinada); f.camaraJugador.reinicia(guinada);
    for (let i = 0; i < 4; i++) { f.paso(q, 1 / 60); j.fisica.mundo.step(); }
    const v = f.vacas[0];
    // La vaca delante, viniendo hacia el jugador
    const vx = x + mira[0] * 9; const vz = z + mira[1] * 9;
    v.pon(vx, vz, Math.atan2(x - vx, z - vz), 'embiste', 0);
    for (let i = 0; i < 12; i++) { f.paso(q, 1 / 60); j.fisica.mundo.step(); }
    f.recortes.suma(1250);
    f.recortes.avisa('¡Olé! Quiebro ceñido +300', 'ole', 30);
    j.ponPausa(false);
  });
  // Unos fotogramas de verdad (la cámara se asienta y el HUD se pinta)
  await p.evaluate(() => new Promise((r) => { let i = 0; const f = () => (++i >= 4 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  await p.evaluate(() => {
    const j = window.__juego;
    document.getElementById('panel').style.display = 'none';
    j.ponPausa(true); window.__render.render();
    // El juego sigue (para que se vean el minimapa, ☰ y los botones), pero la escena se queda en
    // este fotograma: una imagen justo encima del lienzo y debajo de toda la interfaz
    const fijo = Object.assign(document.createElement('img'), { id: 'fotograma-fijo' });
    fijo.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none';
    fijo.src = j.renderer.domElement.toDataURL('image/png');
    j.renderer.domElement.after(fijo);
    j.ponPausa(false);
  });
  await p.waitForTimeout(500);
  const marcas = await p.evaluate((lista) => lista.map(([sel, nombre]) => {
    const e = document.querySelector(sel);
    if (!e || !e.getClientRects().length || getComputedStyle(e).visibility === 'hidden') return [nombre, null];
    const r = e.getBoundingClientRect();
    return [nombre, [+(100 * (r.left + r.width / 2) / innerWidth).toFixed(1), +(100 * (r.top + r.height / 2) / innerHeight).toFixed(1)]];
  }), v.marcas);
  const png = join(tmp, `${v.nombre}.png`);
  await p.screenshot({ path: png, timeout: 180000 });
  const salida = `public/ui/controles_fiestas_${v.nombre}.webp`;
  execFileSync('python3', ['-c', `from PIL import Image; Image.open('${png}').convert('RGB').save('${salida}', 'WEBP', quality=82)`]);
  console.log(`${salida}`);
  marcas.forEach(([nombre, en], i) => console.log(`  ${i + 1}. ${nombre}: ${en ? `left: ${en[0]}%; top: ${en[1]}%` : 'no se ve'}`));
  await c.close();
}
await b.close();
