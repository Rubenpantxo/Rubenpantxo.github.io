// Prueba automática del modo fiestas (F1) en un navegador sin ventana: entra al modo, saca
// capturas del lienzo, suelta un «bot» que corre al azar a paso de física y comprueba que nunca
// sale del recinto, y al salir comprueba que el pueblo queda como antes (colisiones, hora,
// tráfico, peatones, farolas) y que no queda nada del festejo en la escena.
//
// Hace falta el servidor de desarrollo en marcha (npm run dev) y Playwright con su Chromium:
// si no está instalado en el proyecto, indicar dónde con PLAYWRIGHT_RAIZ (carpeta node_modules).
//
// Uso: node tools/prueba_fiestas.mjs <carpeta de capturas> [plaza|calle|encierro] [bajo|medio|alto] [movil|no] [sinfotos]
//   PLAYWRIGHT_RAIZ=$(npm root -g) node tools/prueba_fiestas.mjs /tmp/capturas calle bajo
// Sin tarjeta gráfica (SwiftShader) cada captura tarda cerca de un minuto: «sinfotos» las omite.
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const S = process.argv[2];
const modo = process.argv[3] ?? 'plaza';
const calidad = process.argv[4] ?? 'bajo';
const movil = process.argv[5] === 'movil';
const sinFotos = process.argv[6] === 'sinfotos';
const b = await chromium.launch({ channel: process.env.CANAL, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext(movil ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 } : { viewport: { width: 1100, height: 620 } });
const p = await ctx.newPage();
const errores = [];
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
p.on('pageerror', (e) => errores.push('PAGEERROR ' + e.message));
const foto = async (nombre) => {
  if (sinFotos) return;
  const url = await p.evaluate(() => { const j = window.__juego; j.peaton.colocaCamara(j.camara); window.__render.render(); return j.renderer.domElement.toDataURL('image/jpeg', 0.85); });
  writeFileSync(`${S}/f1_${modo}_${nombre}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
};
await p.goto(`http://localhost:${process.env.PUERTO ?? '5173'}/?salto=0&calidad=${calidad}&debug=1&vacas=0`);
await p.waitForFunction(() => window.__juego, null, { timeout: 240000 });
// Estado del pueblo antes de entrar
const cuenta = () => p.evaluate(() => {
  const j = window.__juego; let mallas = 0; j.escena.traverse((o) => { if (o.isMesh || o.isLine) mallas++; });
  return { mallas, colliders: j.fisica.mundo.colliders.len(), hora: j.ciclo.modo, trafico: j.trafico.raiz.visible, peatones: j.peatones.raiz.visible,
    aPie: j.aPie, fov: j.camara.fov, farola: (() => { const m = new j.THREE.Matrix4(); const f = j.farolas.raiz.getObjectByName('farolas_postes'); let n = 0; for (let i = 0; i < f.count; i++) { f.getMatrixAt(i, m); if (m.elements[0] === 0 && m.elements[5] === 0) n++; } return n; })() };
});
await p.evaluate(() => document.getElementById('jugar').click());
await p.waitForTimeout(1500);
const antes = await cuenta();
await p.evaluate((m) => window.__juego.entraFiestas(m), modo);
await p.waitForFunction(() => window.__juego.modoFiestas, null, { timeout: 60000 });
await p.waitForTimeout(1500);
const dentro = await cuenta();
console.log('ANTES', JSON.stringify(antes));
console.log('DENTRO', JSON.stringify(dentro), JSON.stringify(await p.evaluate(() => window.__juego.fiestas.resumen)));
await foto('inicio');
console.log('COSTE', JSON.stringify(await p.evaluate(() => { const j = window.__juego; let mallas = 0; let tri = 0; let piel = 0;
  j.escena.children.forEach((o) => { if (!o.name.startsWith('fiestas_')) return; o.traverse((h) => { if (!h.isMesh) return; mallas++; if (h.isSkinnedMesh) piel++;
    const g = h.geometry; tri += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (h.isInstancedMesh ? h.count : 1); }); });
  return { mallas, conEsqueleto: piel, triangulos: Math.round(tri) }; })));
const mira = async (x, z, dx, dz, nombre) => {
  await p.evaluate(([x, z, g]) => { window.__juego.peaton.activa(x, z, g); }, [x, z, Math.atan2(-dx, -dz)]);
  await p.waitForTimeout(600);
  await foto(nombre);
};
if (modo === 'plaza') {
  await mira(178, 336.5, 0, -1, 'n5');                // el nº 5: ni farola ni montón
  await mira(190, 339, -1, -0.33, 'oeste');           // puerta y gradas del nº 2
  await mira(168, 331.5, 1, 0.33, 'este');            // tablado
  await mira(182, 335, 0.5, 1, 'corral');
  await mira(189.5, 340, 1, 0.33, 'tablado');
  await mira(165.5, 329.2, -1, 0.25, 'gradas2');
} else {
  await mira(165, 329.5, -1, -0.3, 'puerta_plaza');   // la puerta abierta desde la plaza
  await mira(140, 322.5, 1, 0.3, 'puerta_calle');     // gradas y puerta desde la calle
  await mira(118, 317.3, 1, 0.25, 'tapia');           // tapia, valla gris, tubo
  await mira(75, 301.3, -1, -0.3, 'calle');
  await mira(22, 286.5, -1, -0.3, 'final');
}
// Prueba de recinto: un «bot» corre al azar a paso de física y nunca debe salir del recinto
const bot = await p.evaluate((modo) => {
  const j = window.__juego; const r = j.fiestas.recinto; const dentroDe = j.fiestas.dentroDe;
  const zonas = modo === 'plaza' ? [r.plaza.borde] : [r.plaza.borde, r.calle.borde];
  let semilla = 12345; const azar = () => { semilla = (semilla * 1664525 + 1013904223) >>> 0; return semilla / 4294967296; };
  const salidas = modo === 'plaza' ? [[178, 336]] : [[178, 336], [120, 318.5], [60, 297.5], [25, 288]];
  let fuera = 0; let pasos = 0; let peor = null; let recorrido = 0; const visitado = { minX: 1e9, maxX: -1e9 };
  for (const [sx, sz] of salidas) {
    j.peaton.activa(sx, sz, azar() * 6.28);
    j.colisiones.fuerza({ x: sx, z: sz });
    let g = azar() * 6.28; let ant = j.peaton.estado().posicion;
    for (let i = 0; i < 9000; i++) {
      if (i % 90 === 0) { g = azar() * 6.28; j.peaton.mira((g - 0) / 0.0024 * 0, 0, 0, 0); j.peaton.activa(ant.x, ant.z, g); }
      j.peaton.paso({ avance: 1, lateral: 0, correr: true }, 1 / 60);
      j.fisica.mundo.step();
      const q = j.peaton.estado().posicion;
      recorrido += Math.hypot(q.x - ant.x, q.z - ant.z); ant = q; pasos++;
      if (i % 30 === 0) j.colisiones.fuerza({ x: q.x, z: q.z });
      visitado.minX = Math.min(visitado.minX, q.x); visitado.maxX = Math.max(visitado.maxX, q.x);
      if (!zonas.some((z) => dentroDe(z, q.x, q.z))) { fuera++; peor = peor ?? [q.x, q.z]; }
    }
  }
  return { pasos, fuera, peor, recorrido: Math.round(recorrido), visitado };
}, modo);
console.log('BOT', JSON.stringify(bot));
// Salir: el pueblo como antes
await p.evaluate(() => window.__juego.saleFiestas());
await p.waitForFunction(() => !window.__juego.modoFiestas, null, { timeout: 60000 });
await p.waitForTimeout(1500);
const despues = await cuenta();
console.log('DESPUES', JSON.stringify(despues));
console.log('IGUAL', JSON.stringify(antes) === JSON.stringify(despues));
console.log('RESTOS', JSON.stringify(await p.evaluate(() => { const j = window.__juego; const n = []; j.escena.traverse((o) => { if (o.name.startsWith('fiestas_')) n.push(o.name); }); return n; })));
if (movil) console.log('TACTIL', JSON.stringify(await p.evaluate(() => ({ tactil: !document.getElementById('tactil').hidden, bajar: !document.querySelector('[data-pulsar="bajar"]').hidden }))));
console.log('ERRORES', JSON.stringify(errores.slice(0, 8)));
await b.close();
