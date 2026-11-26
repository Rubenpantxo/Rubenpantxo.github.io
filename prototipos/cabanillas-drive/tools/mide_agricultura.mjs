// Presupuesto del modo agricultura (A11): por nivel de calidad y escenario mide llamadas de dibujo,
// triángulos, geometrías y texturas (renderer.info) y el tiempo de JS que gasta modo.actualiza por
// fotograma. Los FPS reales no valen con la gráfica por software; sí valen los conteos y el JS.
// Uso: node tools/mide_agricultura.mjs [niveles separados por coma] [escenarios: cebolla,cosecha,brocoli]
import { createRequire } from 'node:module';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const niveles = (process.argv[2] ?? 'bajo,medio,alto').split(',');
const escenarios = (process.argv[3] ?? 'cebolla,brocoli').split(',');
const puerto = process.env.PUERTO ?? '5173';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const filas = [];
for (const nivel of niveles) {
  for (const esc of escenarios) {
    const movil = nivel === 'bajo';
    const c = await b.newContext(movil ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } : { viewport: { width: 1100, height: 620 } });
    const p = await c.newPage();
    await p.goto(`http://localhost:${puerto}/?calidad=${nivel}&personaje=0&hora=dia&debug=1&agricultura=${esc}&dia=40`);
    await p.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 400000 });
    await p.evaluate(() => document.getElementById('jugar').click());
    await p.waitForFunction(() => window.__juego.agricultura, null, { timeout: 200000 });
    await p.evaluate(() => {
      const m = window.__juego.agricultura; const f = m.actualiza.bind(m);
      window.__ms = { n: 0, t: 0, max: 0 };
      m.actualiza = (...a) => { const t = performance.now(); const r = f(...a); const d = performance.now() - t; window.__ms.n++; window.__ms.t += d; window.__ms.max = Math.max(window.__ms.max, d); return r; };
    });
    await p.evaluate(() => new Promise((r) => { let i = 0; const f = () => (++i >= 40 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
    const r = await p.evaluate(() => {
      const i = window.__juego.renderer.info; const q = window.__juego.agricultura.labranza.parcelas.get('2-700');
      return { llamadas: i.render.calls, triangulos: i.render.triangles, geometrias: i.memory.geometries, texturas: i.memory.textures,
        jsMedioMs: window.__ms.t / Math.max(1, window.__ms.n), jsMaxMs: window.__ms.max, fotogramas: window.__ms.n,
        mascara: q ? [q.ancho, q.alto] : null, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
    });
    filas.push({ nivel, esc, ...r });
    console.log(JSON.stringify({ nivel, esc, ...r }));
    await c.close();
  }
}
await b.close();
