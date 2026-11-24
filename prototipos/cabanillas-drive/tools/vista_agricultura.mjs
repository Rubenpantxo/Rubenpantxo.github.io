// Vista de comprobación de la fase A2 del modo agricultura (PLAN_AGRICULTURA.md): abre el pincel de
// pruebas (?agricultura=pincel) en un navegador sin ventana, pinta el muestrario (una franja por estado de
// la tierra) y saca capturas de lejos, de cerca y desde arriba; después pinta trazos curvos a mano
// alzada para ver que los surcos siguen la pasada. Comprueba también:
//   - que el pincel solo pinta dentro de la parcela y que el recuento cuadra;
//   - que no hay errores en la consola;
//   - que sin ?agricultura el juego no descarga nada del modo (no cambia).
// Hace falta el servidor de desarrollo (npm run dev) y Playwright.
// Uso: node tools/vista_agricultura.mjs <carpeta de capturas> [bajo|medio|alto] [movil|no] [parcela]
// (PUERTO=5180 si el servidor no está en el 5173; CANAL=chrome para usar el Chrome instalado)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const S = process.argv[2];
const calidad = process.argv[3] ?? 'bajo';
const movil = process.argv[4] === 'movil';
const ref = process.argv[5] ?? '';
const puerto = process.env.PUERTO ?? '5173';
mkdirSync(S, { recursive: true });
const b = await chromium.launch({ channel: process.env.CANAL, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const contexto = await b.newContext(movil
  ? { viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }
  : { viewport: { width: 1280, height: 760 } });
let fallos = 0;
const comprueba = (ok, texto) => { console.log(`  ${ok ? 'bien ' : 'FALLO'}  ${texto}`); if (!ok) fallos++; };
const errores = [];
const sufijo = `${movil ? '_movil' : ''}_${calidad}`;
const fotogramas = (p, n = 3) => p.evaluate((k) => new Promise((r) => {
  let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);
const captura = async (p, nombre) => {
  await fotogramas(p, 3);
  await p.screenshot({ path: `${S}/agri_${nombre}${sufijo}.jpg`, quality: 85, timeout: 180000 });
  console.log(`  captura ${S}/agri_${nombre}${sufijo}.jpg`);
};

// --- 1. Pincel de pruebas
const p = await contexto.newPage();
p.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.location()?.url ?? '')) errores.push(m.text()); });
p.on('pageerror', (e) => errores.push(`PAGEERROR ${e.message}`));
await p.goto(`http://localhost:${puerto}/?calidad=${calidad}&personaje=0&hora=dia&agricultura=pincel${ref ? `&parcela=${ref}` : ''}`);
await p.waitForFunction(() => window.__agricultura, null, { timeout: 300000 });
const info = await p.evaluate(() => {
  const a = window.__agricultura;
  const q = a.parcela;
  return { ref: q.ref, ha: q.info.superficie_ha, mpp: q.mpp, ancho: q.ancho, alto: q.alto, triangulos: q.triangulos, dentro: q.pixelesDentro };
});
console.log(`Parcela ${info.ref}: ${info.ha} ha · máscara ${info.ancho}×${info.alto} a ${info.mpp} m/px · malla ${info.triangulos} triángulos`);
comprueba(info.dentro * info.mpp * info.mpp > info.ha * 1e4 * 0.97 && info.dentro * info.mpp * info.mpp < info.ha * 1e4 * 1.03,
  `superficie de la máscara ${(info.dentro * info.mpp * info.mpp / 1e4).toFixed(3)} ha ≈ ${info.ha} ha del Catastro`);
comprueba(!(await p.evaluate(() => document.getElementById('inicio')?.hidden === false)), 'sin pantalla de inicio');
await captura(p, '0_sin_trabajar');

await p.evaluate(() => window.__agricultura.muestrario());
const r = await p.evaluate(() => window.__agricultura.recuento());
console.log('  recuento con el muestrario:', JSON.stringify(r));
comprueba(r.arado + r.gradeado > 60 && r.arado + r.gradeado < 85, `arado o gradeado entre 60 y 85 %: ${r.arado + r.gradeado} %`);
comprueba(r.rodadas > 2, `rodadas por encima del 2 %: ${r.rodadas} %`);
comprueba(r.sembrado > 15 && r.sembrado < 40, `sembrado entre 15 y 40 %: ${r.sembrado} %`);
comprueba(r.cosechado > 5 && r.cosechado < 25, `cosechado entre 5 y 25 %: ${r.cosechado} %`);
await p.evaluate(() => window.__agricultura.vista('lejos'));
await captura(p, '1_muestrario_lejos');
await p.evaluate(() => window.__agricultura.vista('arriba'));
await captura(p, '2_muestrario_arriba');
// De cerca, una captura por franja (la cámara a lo largo de cada franja)
const franjas = await p.evaluate(() => {
  const a = window.__agricultura;
  return Array.from(document.querySelectorAll('.agri-etiqueta'), (d) => d.textContent);
});
console.log(`  franjas: ${franjas.join(', ')}`);
const puntos = await p.evaluate(() => {
  // Las etiquetas guardan su punto en el muestrario; se toma el centro de cada franja
  const a = window.__agricultura;
  return a.etiquetas?.() ?? [];
});
for (const [k, e] of puntos.entries()) {
  await p.evaluate(({ x, z }) => window.__agricultura.vista('cerca', x, z), e);
  await captura(p, `3_cerca_${k + 1}_${e.texto.toLowerCase().replace(/\s+/g, '_')}`);
}

// --- 2. Trazos a mano alzada: un arco arado y una curva sembrada encima, con el pincel del ratón
await p.evaluate(() => { document.querySelector('[data-limpia]').click(); window.__agricultura.vista('arriba'); });
await fotogramas(p, 2);
const caja = await p.evaluate(() => {
  const r = document.getElementById('escena').getBoundingClientRect();
  return { w: r.width, h: r.height };
});
async function arco(labor, ancho, radio, desde, hasta) {
  await p.evaluate(({ labor, ancho }) => {
    document.querySelector(`[data-labor="${labor}"]`).click();
    const i = document.querySelector('#agri-panel input[type=range]');
    i.value = ancho; i.dispatchEvent(new Event('input'));
  }, { labor, ancho });
  const cx = caja.w / 2;
  const cy = caja.h * 0.42;
  const pts = [];
  for (let a = desde; a <= hasta; a += 0.08) pts.push([cx + Math.cos(a) * radio, cy + Math.sin(a) * radio * 0.8]);
  if (movil) {
    // Un dedo: CDP manda los eventos táctiles
    const cdp = await contexto.newCDPSession(p);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1] }] });
    for (const [x, y] of pts.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await p.mouse.move(pts[0][0], pts[0][1]);
    await p.mouse.down();
    for (const [x, y] of pts.slice(1)) await p.mouse.move(x, y);
    await p.mouse.up();
  }
}
const radio = Math.min(caja.w, caja.h) * 0.28;
await arco('arar', 6, radio, 3.3, 6.2);
await arco('sembrar', 3, radio, 3.4, 4.8);
await arco('rodar', 3, radio * 0.75, 3.2, 6.3);
const r2 = await p.evaluate(() => window.__agricultura.recuento());
console.log('  recuento tras los trazos:', JSON.stringify(r2));
comprueba(r2.arado > 3, `el pincel con ${movil ? 'el dedo' : 'el ratón'} ara: ${r2.arado} %`);
comprueba(r2.sembrado > 0.5, `y siembra: ${r2.sembrado} %`);
await captura(p, '4_trazos_arriba');
await p.evaluate(() => { const a = window.__agricultura; a.orbita.cabeceo = 0.5; a.orbita.distancia = 40; });
await captura(p, '5_trazos_oblicua');

// Fuera de la parcela no se pinta
const fuera = await p.evaluate(() => {
  const a = window.__agricultura;
  const [x0, z0] = a.parcela.info.caja;
  return a.pinta('arar', x0 - 30, z0 - 30, x0 - 10, z0 - 10, 6);
});
comprueba(fuera === 0, 'nada pintado fuera de la parcela');
comprueba(errores.length === 0, `sin errores en la consola${errores.length ? `: ${errores.slice(0, 5).join(' | ')}` : ''}`);
await p.close();

// --- 3. Sin ?agricultura, nada del modo
const q = await contexto.newPage();
const pedidos = [];
q.on('request', (req) => { if (/src\/agricultura\/|assets\/agricultura|assets\/maquinaria/.test(req.url())) pedidos.push(req.url()); });
await q.goto(`http://localhost:${puerto}/?calidad=${calidad}&personaje=0&salto=0`);
await q.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 300000 });
comprueba(pedidos.length === 0, `sin ?agricultura no se descarga nada del modo${pedidos.length ? `: ${pedidos.join(', ')}` : ''}`);
comprueba(!(await q.evaluate(() => Boolean(document.getElementById('agri-panel')))), 'sin ?agricultura no hay panel');
await q.close();

await b.close();
console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
