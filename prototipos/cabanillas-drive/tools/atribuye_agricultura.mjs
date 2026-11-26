import { createRequire } from 'node:module';
const requiere = createRequire(import.meta.url);
const { chromium } = requiere('playwright');
const nivel = process.argv[2] ?? 'bajo'; const esc = process.argv[3] ?? 'cebolla';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const c = await b.newContext(nivel === 'bajo' ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } : { viewport: { width: 1100, height: 620 } });
const p = await c.newPage();
await p.goto(`http://localhost:5173/?calidad=${nivel}&personaje=0&hora=dia&debug=1&agricultura=${esc}&dia=40`);
await p.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 400000 });
await p.evaluate(() => document.getElementById('jugar').click());
await p.waitForFunction(() => window.__juego.agricultura, null, { timeout: 200000 });
const fr = (n) => p.evaluate((k) => new Promise((r) => { let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
await fr(10);
const lee = () => p.evaluate(() => { const i = window.__juego.renderer.info.render; return [i.calls, i.triangles]; });
const base = await lee();
const res = await p.evaluate(async () => {
  const j = window.__juego; const esc = j.escena; const out = [];
  const marca = async () => { j.renderer.info.autoReset = false; j.renderer.info.reset(); j.renderer.render(esc, j.camara); const i = j.renderer.info.render; return { calls: i.calls, triangles: i.triangles }; };
  const total = await marca(); out.push(['total', total.calls, total.triangles]);
  for (const h of esc.children) {
    if (!h.visible) continue;
    h.visible = false; const i = await marca();
    out.push([h.name || h.type + (h.children.length ? `(${h.children.length})` : ''), total.calls - i.calls, total.triangles - i.triangles]);
    h.visible = true;
  }
  return out;
});
console.log(nivel, esc); for (const r of res) if (r[2] !== 0 || r[0] === 'total') console.log(' ', r.join(' | '));
await b.close();
