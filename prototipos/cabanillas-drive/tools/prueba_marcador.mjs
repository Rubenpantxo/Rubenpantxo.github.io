// Prueba del marcador dentro del juego (F4), en un navegador sin ventana: un quiebro a tiempo
// suma puntos y un pase, las teclas (o los botones táctiles) se encienden con la vaca a distancia
// buena, la cogida quita vida y puntos, y el marcador escribe todo ello. Saca capturas de pantalla.
// Hace falta el servidor de desarrollo (npm run dev) y Playwright (PLAYWRIGHT_RAIZ si no está en el proyecto).
// Uso: node tools/prueba_marcador.mjs <carpeta de capturas> [bajo|medio|alto] [movil|no]
// Sin mozos (?mozos=0): aquí se mide la vaca contra el jugador solo.
import { createRequire } from 'node:module';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const S = process.argv[2];
const calidad = process.argv[3] ?? 'bajo';
const movil = process.argv[4] === 'movil';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const contexto = await b.newContext(movil ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } : { viewport: { width: 1100, height: 620 } });
const p = await contexto.newPage();
const errores = [];
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
p.on('pageerror', (e) => errores.push('PAGEERROR ' + e.message));
// Pinta un fotograma (marcador incluido) y hace la captura de la página entera, con el HUD
const foto = async (nombre) => {
  await p.evaluate(() => {
    const j = window.__juego;
    const v = j.fiestas.vacas[0].posicion(); const q = j.fiestas.personaje.posicion();
    // La cámara, detrás del jugador mirando a la vaca (aquí no corre el bucle del juego, que es quien la asienta)
    j.fiestas.camaraJugador.reinicia(Math.atan2(-(v.x - q.x), -(v.z - q.z)));
    for (let i = 0; i < 40; i++) j.fiestas.fotograma(0.016, { dx: 0, dy: 0 }, { giro: 0 });
    window.__render.render();
    // El bucle del juego sigue pintando mientras se hace la captura: se fija este fotograma debajo del marcador
    let fijo = document.getElementById('fotograma-fijo');
    if (!fijo) {
      fijo = Object.assign(document.createElement('img'), { id: 'fotograma-fijo' });
      fijo.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:4';
      document.body.append(fijo);
    }
    fijo.src = j.renderer.domElement.toDataURL('image/jpeg', 0.9);
  });
  await p.screenshot({ path: `${S}/f4_${nombre}${movil ? '_movil' : ''}.jpg`, quality: 85, timeout: 120000 });
};
await p.goto(`http://localhost:5173/?calidad=${calidad}&debug=1&capa=colorada&mozos=0`);
await p.waitForFunction(() => window.__juego, null, { timeout: 240000 });
await p.evaluate(() => document.getElementById('jugar').click());
await p.waitForTimeout(1000);
await p.evaluate(() => window.__juego.entraFiestas('plaza'));
await p.waitForFunction(() => window.__juego.modoFiestas && window.__juego.fiestas.vacas.length, null, { timeout: 60000 });
await p.waitForTimeout(1200);
await p.evaluate(() => {
  const j = window.__juego;
  j.ponPausa(true);
  j.fiestas.mostrarHud(true);
  window.__t = {
    quieto: { avance: 0, lateral: 0, correr: false, conJoystick: false, giro: 0 },
    pasos(n, cada = null) {
      for (let i = 0; i < n; i++) {
        j.fiestas.paso(this.quieto, 1 / 60);
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
    // Lo que hay escrito en el marcador
    lee() {
      j.fiestas.fotograma(0.016, { dx: 0, dy: 0 }, { giro: 0 });
      const h = document.getElementById('hud-fiestas');
      const cifras = [...h.querySelectorAll('.cifra b')].map((e) => e.textContent);
      const barras = [...h.querySelectorAll('.barra i')].map((e) => e.style.width);
      return { puntos: cifras[0], tiempo: cifras[1], pases: cifras[2], vida: barras[0], energia: barras[1], fuerza: barras[2],
        vaca: h.querySelector('.vaca-hace').textContent, aviso: h.querySelector('.aviso').hidden ? null : h.querySelector('.aviso').textContent,
        encendidas: [...h.querySelectorAll('.tecla.listo')].map((e) => e.textContent),
        botones: [...document.querySelectorAll('.botones-fiestas .listo')].map((e) => e.textContent) };
    },
  };
});
// Sale del corral; quiebro a tiempo
await p.evaluate(() => {
  const j = window.__juego; const t = window.__t; const vaca = j.fiestas.vacas[0];
  t.pon(170, 332.5, -1.2);
  t.pasos(60 * 12, () => vaca.estado !== 'corral' && vaca.estado !== 'saliendo');
  t.pon(170, 332.5, -1.2);
  vaca.pon(183.5, 337, Math.atan2(170 - 183.5, 332.5 - 337), 'fija', 0.3);
  window.__r = {};
  // Hasta que la vaca está a distancia de quiebro
  t.pasos(60 * 6, () => j.fiestas.recortes.listos({ ...j.fiestas.personaje.posicion(), seguro: false }, vaca).quiebro
    && Math.hypot(vaca.cuernos().x - j.fiestas.personaje.posicion().x, vaca.cuernos().z - j.fiestas.personaje.posicion().z) < 3.2);
  window.__r.viene = t.lee();
});
await foto('viene');
const res = await p.evaluate(() => {
  const j = window.__juego; const t = window.__t; const vaca = j.fiestas.vacas[0]; const m = j.fiestas.recortes; const r = window.__r;
  j.fiestas.personaje.pide('quiebro');
  t.pasos(60 * 4, () => m.historial.length > 0);
  r.quiebro = { hecho: m.historial[0], ritmo: m.ritmo, pantalla: t.lee() };
  return r;
});
await foto('ole');
const res2 = await p.evaluate(() => {
  const j = window.__juego; const t = window.__t; const vaca = j.fiestas.vacas[0]; const m = j.fiestas.recortes; const r = {};
  // Quieto: cogida
  t.pasos(90);
  t.pon(170, 332.5, -1.2);
  vaca.pon(183.5, 337, Math.atan2(170 - 183.5, 332.5 - 337), 'fija', 0.3);
  t.pasos(60 * 6, () => m.cogidas > 0);
  t.pasos(25);
  r.cogida = { hecho: m.historial.at(-1), pantalla: t.lee() };
  return r;
});
await foto('cogida');
console.log('VIENE', JSON.stringify(res.viene));
console.log('QUIEBRO', JSON.stringify(res.quiebro));
console.log('COGIDA', JSON.stringify(res2.cogida));
// Salir deja la pantalla limpia
const salida = await p.evaluate(async () => {
  const j = window.__juego;
  j.ponPausa(false);
  await j.saleFiestas();
  return { hud: Boolean(document.getElementById('hud-fiestas')), encendidos: document.querySelectorAll('.botones-fiestas .listo').length };
});
console.log('SALIDA', JSON.stringify(salida));
console.log('ERRORES', JSON.stringify(errores.slice(0, 8)));
await b.close();
