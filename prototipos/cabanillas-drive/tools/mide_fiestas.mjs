// Mide lo que cuesta el modo fiestas en cada calidad (F8): llamadas de dibujo, triángulos, gente
// visible y tiempo de cálculo por fotograma (lógica: vacas, mozos, público, jugador; sin el
// dibujo, que aquí lo hace la CPU y no dice nada del móvil). Desde el centro de la plaza mirando
// al tablado, y en la calle durante el encierro.
// Hace falta el servidor de desarrollo (npm run dev) y Playwright.
// Uso: node tools/mide_fiestas.mjs [calidades separadas por comas]   (por defecto bajo,medio,alto)
import { createRequire } from 'node:module';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const calidades = (process.argv[2] ?? 'bajo,medio,alto').split(',');
const b = await chromium.launch({ channel: process.env.CANAL, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const filas = [];
for (const calidad of calidades) {
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  await p.goto(`http://localhost:${process.env.PUERTO ?? '5173'}/?salto=0&calidad=${calidad}&debug=1`);
  await p.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 300000 });
  await p.evaluate(() => document.getElementById('jugar').click());
  for (const modo of ['concurso', 'encierro']) {
    await p.evaluate(async (m) => { window.__juego.ponPausa(false); await window.__juego.entraFiestas(m); }, modo);
    await p.waitForFunction(() => window.__juego.fiestas?.partida, null, { timeout: 120000 });
    const r = await p.evaluate(() => {
      const j = window.__juego; const f = j.fiestas;
      j.ponPausa(true); f.mostrarHud(true);
      const quieto = { avance: 0, lateral: 0, correr: false, conJoystick: false, giro: 0 };
      // Que salgan las vacas y se muevan los mozos (sin medir)
      for (let i = 0; i < 60 * 12; i++) { f.paso(quieto, 1 / 60); j.fisica.mundo.step(); if (i % 4 === 0) { f.fotograma(4 / 60, { dx: 0, dy: 0 }, { giro: 0 }); f.actualiza(4 / 60, j.camara); } }
      // Tiempo de la lógica: 240 pasos de física (sin el paso de Rapier) y 60 fotogramas
      let t0 = performance.now();
      for (let i = 0; i < 240; i++) f.paso(quieto, 1 / 60);
      const pasoMs = (performance.now() - t0) / 240;
      t0 = performance.now();
      for (let i = 0; i < 60; i++) { f.fotograma(1 / 60, { dx: 0, dy: 0 }, { giro: 0 }); f.actualiza(1 / 60, j.camara); }
      const fotogramaMs = (performance.now() - t0) / 60;
      // Dibujo: la vista del jugador
      j.renderer.info.autoReset = false;
      j.renderer.info.reset();
      window.__render.render();
      const info = j.renderer.info.render;
      let personas = 0; let visibles = 0; let mallasPersonas = 0;
      j.escena.traverse((o) => {
        if (o.isSkinnedMesh) { mallasPersonas++; }
      });
      for (const g of f.publico ? j.escena.getObjectByName('fiestas_publico').children : []) { personas++; if (g.visible) visibles++; }
      // Lo que cuesta cada parte: se apaga y se vuelve a dibujar
      const mide = () => { j.renderer.info.reset(); window.__render.render(); return { c: j.renderer.info.render.calls, t: j.renderer.info.render.triangles }; };
      const total = mide();
      const partes = {};
      const grupos = { publico: 'fiestas_publico', mozos: 'fiestas_mozos', vallado: 'fiestas_vallado', arena: 'fiestas_arena',
        banderines: 'fiestas_banderines', ambulancia: 'fiestas_ambulancia', jugador: 'fiestas_jugador' };
      for (const [k, nombre] of Object.entries(grupos)) {
        const o = j.escena.getObjectByName(nombre);
        if (!o) continue;
        const antes = o.visible; o.visible = false;
        const m = mide(); o.visible = antes;
        partes[k] = `${total.c - m.c}/${Math.round((total.t - m.t) / 1000)}k`;
      }
      const vis = f.vacas.map((v) => v.objeto.visible); f.vacas.forEach((v) => { v.objeto.visible = false; });
      const sv = mide(); f.vacas.forEach((v, i) => { v.objeto.visible = vis[i]; });
      partes.vacas = `${total.c - sv.c}/${Math.round((total.t - sv.t) / 1000)}k`;
      j.renderer.info.autoReset = true;
      return { partes, llamadas: info.calls, triangulos: Math.round(info.triangles / 1000), personas, visibles, mallasPersonas,
        mozos: f.mozos?.mozos.length ?? 0, vacas: f.vacas.length, pasoMs: +(pasoMs * 4).toFixed(2), fotogramaMs: +fotogramaMs.toFixed(2) };
    });
    // pasoMs ×4: a 60 FPS con física a 240 Hz hay 4 pasos por fotograma
    filas.push({ calidad, modo, ...r });
    console.log(JSON.stringify({ calidad, modo, ...r }));
  }
  await p.close();
}
console.log('\ncalidad  modo       llamadas  ktriáng  público(vis)  mozos vacas  lógica/fotograma (ms)');
for (const f of filas) {
  console.log(`         partes (llamadas/triángulos): ${Object.entries(f.partes).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log(`${f.calidad.padEnd(8)} ${f.modo.padEnd(10)} ${String(f.llamadas).padStart(8)} ${String(f.triangulos).padStart(8)}  ${String(f.personas).padStart(5)} (${String(f.visibles).padStart(3)})  ${String(f.mozos).padStart(5)} ${String(f.vacas).padStart(5)}  ${(f.pasoMs + f.fotogramaMs).toFixed(1).padStart(6)} (paso ${f.pasoMs}, dibujo-lógica ${f.fotogramaMs})`);
}
await b.close();
