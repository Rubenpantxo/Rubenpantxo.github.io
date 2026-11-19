// Prueba del menú de fiestas y de los modos dentro del juego (F5), en un navegador sin ventana:
// menú → concurso (con las rondas acortadas) → resultados → repetir → dejar la partida → menú →
// encierro (la manada en la calle) → volver al pueblo. Saca capturas.
// Hace falta el servidor de desarrollo (npm run dev) y Playwright (PLAYWRIGHT_RAIZ si no está en el proyecto).
// Uso: node tools/prueba_menu.mjs <carpeta de capturas> [bajo|medio|alto] [movil|no]
import { createRequire } from 'node:module';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const S = process.argv[2];
const calidad = process.argv[3] ?? 'bajo';
const movil = process.argv[4] === 'movil';
const b = await chromium.launch({ channel: process.env.CANAL, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const contexto = await b.newContext(movil ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } : { viewport: { width: 1100, height: 620 } });
const p = await contexto.newPage();
const errores = [];
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
p.on('pageerror', (e) => errores.push('PAGEERROR ' + e.message));
let fallos = 0;
const comprueba = (ok, texto) => { console.log(`  ${ok ? 'bien ' : 'FALLO'}  ${texto}`); if (!ok) fallos++; };
const foto = async (nombre, mirar = null) => {
  await p.evaluate((hacia) => {
    const j = window.__juego;
    if (hacia) {
      const q = j.fiestas.personaje.posicion();
      j.fiestas.camaraJugador.reinicia(Math.atan2(-(hacia[0] - q.x), -(hacia[1] - q.z)));
    }
    for (let i = 0; i < 40; i++) j.fiestas.fotograma(0.016, { dx: 0, dy: 0 }, { giro: 0 });
    window.__render.render();
    let fijo = document.getElementById('fotograma-fijo');
    if (!fijo) {
      fijo = Object.assign(document.createElement('img'), { id: 'fotograma-fijo' });
      fijo.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:4';
      document.body.append(fijo);
    }
    fijo.src = j.renderer.domElement.toDataURL('image/jpeg', 0.9);
  }, mirar);
  await p.screenshot({ path: `${S}/f5_${nombre}${movil ? '_movil' : ''}.jpg`, quality: 85, timeout: 120000 });
};
// Pulsa un botón del menú por su texto y espera a que acabe el fundido
const pulsa = async (texto) => {
  await p.evaluate((t) => [...document.querySelectorAll('#menu-fiestas button')].find((x) => x.textContent.includes(t)).click(), texto);
  await p.waitForTimeout(1500);
};
const menu = () => p.evaluate(() => {
  const m = document.getElementById('menu-fiestas');
  return { visible: Boolean(m) && getComputedStyle(m).display !== 'none', titulo: m?.querySelector('h2')?.firstChild.textContent ?? null,
    botones: m ? [...m.querySelectorAll('button')].map((x) => x.querySelector('b')?.textContent ?? x.textContent) : [],
    cifras: m ? [...m.querySelectorAll('.cifras div')].map((x) => `${x.querySelector('span').textContent} ${x.querySelector('b').textContent}`) : [],
    record: m?.querySelector('.record')?.textContent ?? null };
});
await p.goto(`http://localhost:${process.env.PUERTO ?? '5173'}/?salto=0&personaje=0&calidad=${calidad}&debug=1`);
await p.waitForFunction(() => window.__juego, null, { timeout: 240000 });
await p.evaluate(() => { try { localStorage.removeItem('cabanillas.fiestas.marcas'); } catch { /* nada */ } document.getElementById('jugar').click(); });
await p.waitForTimeout(1000);
await p.evaluate(async () => {
  // Rondas cortas, para jugarlas enteras aquí
  const { FIESTAS } = await import('/src/config/fiestas.js');
  FIESTAS.partida.concurso.rondaS = 4;
  FIESTAS.vaca.salidaS = 1; FIESTAS.partida.salidaSiguienteS = 0.5;
  window.__FIESTAS = FIESTAS;
  await window.__juego.entraFiestas('menu');
});
await p.waitForFunction(() => window.__juego.modoFiestas, null, { timeout: 60000 });
await p.waitForTimeout(1200);
await p.evaluate(() => {
  const j = window.__juego;
  j.ponPausa(true);
  j.fiestas.mostrarHud(true);
  window.__t = {
    quieto: { avance: 0, lateral: 0, correr: false, conJoystick: false, giro: 0 },
    pasos(n, cada = null, mandos = this.quieto) {
      for (let i = 0; i < n; i++) {
        j.fiestas.paso(mandos, 1 / 60);
        j.fisica.mundo.step();
        if (i % 20 === 0) { const q = j.fiestas.personaje.posicion(); j.colisiones.fuerza({ x: q.x, z: q.z }); }
        if (cada && cada(i)) return i;
      }
      return n;
    },
    // Sube al jugador a la valla más cercana (para que no lo cojan)
    aSalvo() { j.fiestas.personaje.cogida(0, 1); this.pasos(150); },
  };
});

console.log('1. Menú');
let m = await menu();
const quieto = await p.evaluate(() => {
  const j = window.__juego; const a = j.fiestas.personaje.posicion();
  window.__t.pasos(60, null, { avance: 1, lateral: 0, correr: true, conJoystick: false, giro: 0 });
  const c = j.fiestas.personaje.posicion();
  return { movido: Math.hypot(c.x - a.x, c.z - a.z), vacas: j.fiestas.vacas.length, partida: Boolean(j.fiestas.partida) };
});
comprueba(m.visible && m.botones.length === 5, `menú a la vista: ${m.botones.join(' · ')}`);
comprueba(quieto.movido < 0.3 && quieto.vacas === 0 && !quieto.partida, `con el menú delante el jugador no se mueve (${quieto.movido.toFixed(2)} m) y no hay vacas`);
await foto('menu');

console.log('2. Concurso');
await pulsa('Concurso');
let e = await p.evaluate(() => { const f = window.__juego.fiestas;
  return { entrada: f.entrada, turnos: f.partida?.turnos, puerta: f.resumen.puertaAbierta, vacas: f.vacas.length }; });
m = await menu();
comprueba(!m.visible && e.entrada === 'concurso' && e.turnos === 3 && !e.puerta && e.vacas === 1, `empieza: ${JSON.stringify(e)}`);
const fin = await p.evaluate(() => {
  const j = window.__juego; const t = window.__t;
  t.aSalvo();
  const vistos = new Set();
  const n = t.pasos(60 * 150, () => { if (j.fiestas.partida) vistos.add(j.fiestas.partida.turno); return j.fiestas.menu.visible; });
  return { segundos: Math.round(n / 60), rondas: [...vistos], vacas: j.fiestas.vacas.length };
});
m = await menu();
comprueba(m.visible && m.titulo === 'Concurso' && fin.rondas.length === 3 && fin.vacas === 0,
  `tres rondas y resultados a los ${fin.segundos} s: ${m.cifras.join(' · ')} · ${m.record} · botones ${m.botones.join(' / ')}`);
await foto('resultados');

console.log('3. Repetir, dejar la partida y volver al menú');
await pulsa('Repetir');
e = await p.evaluate(() => { const f = window.__juego.fiestas; const r = { partida: Boolean(f.partida), menu: f.menu.visible }; f.abandona(); return r; });
m = await menu();
comprueba(e.partida && !e.menu && m.visible && m.titulo === 'Concurso', `repite (partida ${e.partida}) y al dejarla salen los resultados (${m.cifras[0]})`);
await pulsa('Menú de fiestas');
m = await menu();
comprueba(m.visible && m.titulo === 'Fiestas de Cabanillas', `de vuelta al menú: ${m.titulo}`);

console.log('4. Vacas en la calle y encierro');
await pulsa('Vacas en la calle');
e = await p.evaluate(() => { const f = window.__juego.fiestas; return { entrada: f.entrada, turnos: f.partida?.turnos, puerta: f.resumen.puertaAbierta }; });
comprueba(e.entrada === 'calle' && e.turnos === 3 && e.puerta, `calle: ${JSON.stringify(e)}`);
await p.evaluate(() => window.__juego.fiestas.abandona());
await pulsa('Menú de fiestas');
await pulsa('Encierro');
const enc = await p.evaluate(() => {
  const j = window.__juego; const t = window.__t; const f = j.fiestas;
  const antes = f.vacas.length;
  t.aSalvo();
  // Hasta que la manada pasa por delante del jugador
  const q = f.personaje.posicion();
  t.pasos(60 * 60, () => f.vacas.filter((v) => v.estado === 'guiada').length === 6
    && Math.min(...f.vacas.map((v) => Math.hypot(v.posicion().x - q.x, v.posicion().z - q.z))) < 7);
  const guiadas = f.vacas.filter((v) => v.estado === 'guiada');
  const c = guiadas.reduce((s, v) => [s[0] + v.posicion().x / guiadas.length, s[1] + v.posicion().z / guiadas.length], [0, 0]);
  return { vacas: antes, guiadas: guiadas.length, puerta: f.resumen.puertaAbierta, centro: c, dentro: f.vacas.every((v) => v.dentro) };
});
comprueba(enc.vacas === 6 && enc.guiadas === 6 && enc.puerta && enc.dentro, `encierro: ${enc.vacas} vacas, ${enc.guiadas} en manada, puerta abierta ${enc.puerta}, todas dentro ${enc.dentro}`);
await foto('encierro', enc.centro);

console.log('5. Volver al pueblo');
await p.evaluate(() => { const j = window.__juego; j.fiestas.abandona(); j.ponPausa(false); });
await pulsa('Volver al pueblo');
await p.waitForTimeout(1500);
const fuera = await p.evaluate(() => ({ modo: window.__juego.modoFiestas, menu: Boolean(document.getElementById('menu-fiestas')),
  hud: Boolean(document.getElementById('hud-fiestas')), marcas: localStorage.getItem('cabanillas.fiestas.marcas') }));
comprueba(fuera.modo === null && !fuera.menu && !fuera.hud, `fuera de fiestas: ${JSON.stringify(fuera)}`);
comprueba(errores.length === 0, `errores de consola: ${JSON.stringify(errores.slice(0, 6))}`);
console.log(fallos ? `\n${fallos} comprobaciones fallan` : '\nTodo bien');
await b.close();
process.exit(fallos ? 1 : 0);
