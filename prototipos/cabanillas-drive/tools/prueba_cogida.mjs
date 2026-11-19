// Prueba de la vaca dentro del juego (F3), en un navegador sin ventana: la vaca sale del corral,
// embiste al jugador de verdad, lo coge si se queda quieto (volteo y a la valla), no lo coge si
// hace el quiebro a tiempo, y no se arranca mientras está subido. Saca capturas de las tres capas.
// Hace falta el servidor de desarrollo (npm run dev) y Playwright (PLAYWRIGHT_RAIZ si no está en el proyecto).
// Uso: node tools/prueba_cogida.mjs <carpeta de capturas> [bajo|medio|alto] [colorada|negra|berrenda]
// Sin mozos (?mozos=0): aquí se mide la vaca contra el jugador solo.
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const S = process.argv[2];
const calidad = process.argv[3] ?? 'bajo';
const capa = process.argv[4] ?? 'colorada';
const b = await chromium.launch({ channel: process.env.CANAL, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 1100, height: 620 } })).newPage();
const errores = [];
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
p.on('pageerror', (e) => errores.push('PAGEERROR ' + e.message));
const foto = async (nombre) => {
  const url = await p.evaluate(() => {
    const j = window.__juego;
    j.fiestas.fotograma(0.016, { dx: 0, dy: 0 }, { giro: 0 });
    window.__render.render();
    return j.renderer.domElement.toDataURL('image/jpeg', 0.85);
  });
  writeFileSync(`${S}/f3_${nombre}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
};
await p.goto(`http://localhost:${process.env.PUERTO ?? '5173'}/?salto=0&personaje=0&calidad=${calidad}&debug=1&capa=${capa}&mozos=0`);
await p.waitForFunction(() => window.__juego, null, { timeout: 240000 });
await p.evaluate(() => document.getElementById('jugar').click());
await p.waitForTimeout(1000);
await p.evaluate(() => window.__juego.entraFiestas('plaza'));
await p.waitForFunction(() => window.__juego.modoFiestas && window.__juego.fiestas.vacas.length, null, { timeout: 60000 });
await p.waitForTimeout(1200);
await p.evaluate(() => {
  const j = window.__juego;
  j.ponPausa(true);
  window.__t = {
    quieto: { avance: 0, lateral: 0, correr: false, conJoystick: false, giro: 0 },
    pasos(n, mandos = this.quieto, cada = null) {
      for (let i = 0; i < n; i++) {
        j.fiestas.paso(mandos, 1 / 60);
        j.fisica.mundo.step();
        if (i % 20 === 0) { const q = j.fiestas.personaje.posicion(); j.colisiones.fuerza({ x: q.x, z: q.z }); }
        if (cada && cada(i)) return i;
      }
      return n;
    },
    pon(x, z, guinada = 0) {
      j.peaton.activa(x, z, guinada);
      j.colisiones.fuerza({ x, z });
      j.fiestas.personaje.reinicia(guinada);
      j.fiestas.camaraJugador.reinicia(guinada);
      this.pasos(3);
    },
  };
});
const res = await p.evaluate(() => {
  const j = window.__juego; const t = window.__t; const vaca = j.fiestas.vacas[0]; const pj = () => j.fiestas.personaje;
  const r = { capa: vaca.capa };
  // Sale del corral
  t.pon(170, 332.5, -1.2);
  const n = t.pasos(60 * 12, t.quieto, () => vaca.estado !== 'corral' && vaca.estado !== 'saliendo');
  r.sale = { segundos: +(n / 60).toFixed(1), estado: vaca.estado, dentro: vaca.dentro };
  // Quieto: la vaca, a 14 m, embiste y lo coge; acaba subido a la valla
  const cara = (x, z) => Math.atan2(170 - x, 332.5 - z);
  t.pon(170, 332.5, -1.2);
  vaca.pon(183.5, 337, cara(183.5, 337), 'fija', 0.3);
  t.pasos(60 * 6, t.quieto, () => pj().cogidas > 0);
  const trasGolpe = pj().estado;
  t.pasos(120);
  r.quieto = { cogidas: pj().cogidas, alCogerlo: trasGolpe, acaba: pj().estado, seguro: pj().seguro };
  // Subido: no se arranca en 20 s
  const antes = vaca.embestidas;
  t.pasos(60 * 20);
  r.subido = { embestidasMientras: vaca.embestidas - antes, estadoVaca: vaca.estado };
  // Quiebro a tiempo: no lo coge
  t.pon(170, 332.5, -1.2);
  vaca.pon(183.5, 337, cara(183.5, 337), 'fija', 0.3);
  let hecho = false;
  t.pasos(60 * 6, t.quieto, () => {
    const q = vaca.posicion(); const s = pj().posicion();
    if (!hecho && vaca.estado === 'embiste' && Math.hypot(q.x - s.x, q.z - s.z) < 3.2) { pj().pide('quiebro'); hecho = true; }
    return vaca.sucesos.at(-1)?.tipo === 'pasa' || pj().cogidas > 0;
  });
  r.quiebro = { hecho, cogidas: pj().cogidas, vaca: vaca.sucesos.at(-1)?.tipo };
  return r;
});
console.log('VACA', JSON.stringify(res));
// Capturas: la vaca parada mirando, embistiendo y la cogida en el aire
await p.evaluate(() => { const j = window.__juego; const t = window.__t; const v = j.fiestas.vacas[0];
  t.pon(176, 334.5, -1.25); v.pon(181.5, 336.4, Math.atan2(176 - 181.5, 334.5 - 336.4), 'fija', 30); t.pasos(20); });
await foto(`${capa}_fija`);
await p.evaluate(() => { const j = window.__juego; const t = window.__t; const v = j.fiestas.vacas[0];
  t.pon(172, 333, -1.25); v.pon(186, 338, Math.atan2(172 - 186, 333 - 338), 'fija', 0.2); t.pasos(75); });
await foto(`${capa}_embiste`);
if (capa === 'colorada') {
  await p.evaluate(() => { const j = window.__juego; const t = window.__t; const pj = j.fiestas.personaje;
    t.pasos(200, t.quieto, () => pj.estado === 'cogido'); t.pasos(22); });
  await foto('cogida');
}
console.log('ERRORES', JSON.stringify(errores.slice(0, 8)));
await b.close();
