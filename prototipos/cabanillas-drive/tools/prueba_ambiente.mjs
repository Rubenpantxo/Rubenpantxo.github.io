// Prueba del ambiente de fiestas dentro del juego (F6), en un navegador sin ventana:
//   - el sonido se prepara (todo sintetizado) y suena: cohete, cencerros, pezuñas, pisadas,
//     olé, aplausos, «¡uy!», golpe en la valla; M lo quita y lo pone; en la pausa calla
//   - hay mozos, la vaca se les arranca a ellos también, y suben a la valla
//   - el público tiene gente sentada en la valla y apoyada, y reacciona al recorte y a la cogida
//   - en el encierro, los mozos corren delante de la manada
// Saca capturas. Hace falta el servidor de desarrollo (npm run dev) y Playwright.
// Uso: node tools/prueba_ambiente.mjs <carpeta de capturas> [bajo|medio|alto] [movil|no]
import { createRequire } from 'node:module';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const S = process.argv[2];
const calidad = process.argv[3] ?? 'bajo';
const movil = process.argv[4] === 'movil';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
  '--autoplay-policy=no-user-gesture-required'] });
const contexto = await b.newContext(movil ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } : { viewport: { width: 1100, height: 620 } });
const p = await contexto.newPage();
const errores = [];
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
p.on('pageerror', (e) => errores.push('PAGEERROR ' + e.message));
let fallos = 0;
const comprueba = (ok, texto) => { console.log(`  ${ok ? 'bien ' : 'FALLO'}  ${texto}`); if (!ok) fallos++; };
// Captura: la cámara desde «desde» mirando a «hacia» ([x, metros sobre el suelo, z]), o la del juego
const foto = async (nombre, vista = null) => {
  await p.evaluate((v) => {
    const j = window.__juego;
    for (let i = 0; i < 3; i++) j.fiestas.fotograma(0.016, { dx: 0, dy: 0 }, { giro: 0 });
    if (v) {
      // Alturas sobre el suelo
      const alto = (x, z) => j.mundo.terreno.alturaEn(x, z);
      j.camara.position.set(v.desde[0], alto(v.desde[0], v.desde[2]) + v.desde[1], v.desde[2]);
      j.camara.lookAt(v.hacia[0], alto(v.hacia[0], v.hacia[2]) + v.hacia[1], v.hacia[2]);
      j.camara.updateMatrixWorld(true);
      j.fiestas.actualiza(0.016, j.camara);
    }
    window.__render.render();
    let fijo = document.getElementById('fotograma-fijo');
    if (!fijo) {
      fijo = Object.assign(document.createElement('img'), { id: 'fotograma-fijo' });
      fijo.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:4';
      document.body.append(fijo);
    }
    fijo.src = j.renderer.domElement.toDataURL('image/jpeg', 0.9);
  }, vista);
  await p.screenshot({ path: `${S}/f6_${nombre}${movil ? '_movil' : ''}.jpg`, quality: 85, timeout: 120000 });
};
await p.goto(`http://localhost:5173/?calidad=${calidad}&debug=1&capa=colorada`);
await p.waitForFunction(() => window.__juego, null, { timeout: 240000 });
await p.evaluate(() => { try { localStorage.removeItem('cabanillas.sonido'); } catch { /* nada */ } document.getElementById('jugar').click(); });
await p.waitForTimeout(1000);
await p.evaluate(async () => {
  const { FIESTAS } = await import('/src/config/fiestas.js');
  FIESTAS.vaca.salidaS = 1;
  await window.__juego.entraFiestas('plaza');
});
await p.waitForFunction(() => window.__juego.modoFiestas && window.__juego.fiestas.vacas.length, null, { timeout: 60000 });
const listo = await p.evaluate(() => window.__juego.fiestas.sonido.listo);
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
        if (i % 3 === 0) { j.fiestas.fotograma(3 / 60, { dx: 0, dy: 0 }, { giro: 0 }); j.fiestas.actualiza(3 / 60, j.camara); }
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
    aSalvo() { j.fiestas.personaje.cogida(0, 1); this.pasos(150); },
  };
});

console.log('1. Montaje');
const montaje = await p.evaluate(() => {
  const f = window.__juego.fiestas;
  return { sonido: f.sonido.estado, mozos: f.mozos?.mozos.length ?? 0, reparto: f.resumen.reparto };
});
comprueba(listo === true && montaje.sonido === 'running', `sonido preparado (${listo}) y en marcha («${montaje.sonido}»)`);
comprueba(montaje.mozos >= 2, `${montaje.mozos} mozos en la plaza`);
comprueba(montaje.reparto.valla > 0 && (montaje.reparto.apoyados > 0 || montaje.reparto.aceras < 10), `público: ${JSON.stringify(montaje.reparto)}`);

console.log('2. Medio minuto con el jugador en la valla');
const suelta = await p.evaluate(() => {
  const j = window.__juego; const t = window.__t; const f = j.fiestas;
  t.aSalvo();
  const aMozos = new Set(); const estados = new Set();
  t.pasos(60 * 30, () => {
    for (const v of f.vacas) if (v.persigue !== 'jugador' && v.estado === 'embiste') aMozos.add(v.persigue);
    for (const m of f.mozos.mozos) estados.add(m.estado);
    return false;
  });
  return { aMozos: [...aMozos], estados: [...estados], cuenta: { ...f.sonido.cuenta } };
});
comprueba(suelta.aMozos.length >= 1, `la vaca se arranca a ${suelta.aMozos.length} mozos distintos`);
comprueba(suelta.estados.includes('subido') && suelta.estados.length >= 4, `estados de los mozos: ${suelta.estados.join(', ')}`);
comprueba(suelta.cuenta.cohete === 1 && suelta.cuenta.cencerro > 10 && suelta.cuenta.pezuna > 5, `sonidos: ${JSON.stringify(suelta.cuenta)}`);
// Un mozo citando o subido, para la foto
const mozo = await p.evaluate(() => {
  const f = window.__juego.fiestas;
  const m = f.mozos.mozos.find((x) => x.estado === 'cita') ?? f.mozos.mozos.find((x) => x.estado === 'subido') ?? f.mozos.mozos[0];
  const v = f.vacas[0].posicion();
  return { m: [m.x, m.z], v: [v.x, v.z], estado: m.estado };
});
const dm = [mozo.m[0] - mozo.v[0], mozo.m[1] - mozo.v[1]]; const lm = Math.hypot(...dm) || 1;
await foto(`mozo_${mozo.estado}`, { desde: [mozo.m[0] + (dm[0] / lm) * 5 + 2, 2.6, mozo.m[1] + (dm[1] / lm) * 5 + 1], hacia: [(mozo.m[0] + mozo.v[0]) / 2, 1.0, (mozo.m[1] + mozo.v[1]) / 2] });

console.log('3. Recorte del jugador: el público reacciona');
const ole = await p.evaluate(() => {
  const j = window.__juego; const t = window.__t; const f = j.fiestas; const vaca = f.vacas[0];
  // Los mozos, a la valla, para que la vaca vaya al jugador
  for (const m of f.mozos.mozos) { m.estado = 'espera'; }
  f.mozos.mozos.length = 0;
  t.pon(170, 332.5, -1.2);
  vaca.pon(183.5, 337, Math.atan2(170 - 183.5, 332.5 - 337), 'fija', 0.3);
  const antes = f.sonido.cuenta.ole ?? 0;
  t.pasos(60 * 6, () => vaca.estado === 'embiste' && Math.hypot(vaca.cuernos().x - f.personaje.posicion().x, vaca.cuernos().z - f.personaje.posicion().z) < 3.2);
  f.personaje.pide('quiebro');
  t.pasos(60 * 3, () => f.recortes.historial.length > 0);
  t.pasos(40);
  return { hecho: f.recortes.historial[0], reaccionando: f.publico.reaccionando, ole: (f.sonido.cuenta.ole ?? 0) - antes };
});
comprueba(ole.hecho?.tipo === 'quiebro' && ole.reaccionando > 5 && ole.ole === 1,
  `quiebro ${ole.hecho?.nota} (+${ole.hecho?.puntos}): ${ole.reaccionando} personas reaccionando, olé ${ole.ole}`);
await foto('ole', { desde: [181, 2.2, 337.5], hacia: [194.5, 2.4, 336] });
await foto('ole_gradas', { desde: [172, 1.7, 332], hacia: [167, 2.4, 343] });

console.log('4. Cogida: ¡uy!');
const uy = await p.evaluate(() => {
  const j = window.__juego; const t = window.__t; const f = j.fiestas; const vaca = f.vacas[0];
  t.pasos(60 * 4);
  t.pon(170, 332.5, -1.2);
  vaca.pon(183.5, 337, Math.atan2(170 - 183.5, 332.5 - 337), 'fija', 0.3);
  const antes = f.sonido.cuenta.uy ?? 0;
  t.pasos(60 * 6, () => f.personaje.cogidas > 0);
  t.pasos(30);
  return { cogidas: f.personaje.cogidas, uy: (f.sonido.cuenta.uy ?? 0) - antes, reaccionando: f.publico.reaccionando };
});
comprueba(uy.cogidas === 1 && uy.uy === 1 && uy.reaccionando > 5, `cogida: «¡uy!» ${uy.uy}, ${uy.reaccionando} personas reaccionando`);
await foto('uy', { desde: [181, 2.2, 337.5], hacia: [194.5, 2.4, 336] });

console.log('5. Golpe en la valla');
const golpe = await p.evaluate(() => {
  const j = window.__juego; const t = window.__t; const f = j.fiestas; const vaca = f.vacas[0];
  t.aSalvo();
  // La vaca, embistiendo de frente contra la valla del sur de la plaza
  t.pon(170, 332.5, -1.2);
  const antes = f.sonido.cuenta.golpe ?? 0;
  const p = f.personaje.posicion();
  vaca.pon(p.x + 1.5, p.z - 6.5, Math.atan2(0.0, 1), 'embiste', 0);
  let n = 0;
  t.pasos(60 * 3, () => { n++; return (f.sonido.cuenta.golpe ?? 0) > antes; });
  const q = vaca.posicion();
  return { golpes: (f.sonido.cuenta.golpe ?? 0) - antes, en: [q.x, q.z], pasos: n };
});
comprueba(golpe.golpes >= 1, `la vaca remata en la valla: ${golpe.golpes} golpe(s) en (${golpe.en.map((v) => v.toFixed(1))})`);
await p.evaluate(() => { const t = window.__t; t.pasos(4); });
await foto('golpe', { desde: [golpe.en[0] + 2.5, 1.9, golpe.en[1] + 6], hacia: [golpe.en[0], 1.0, golpe.en[1]] });

console.log('6. Sonido: M y pausa');
const mute = await p.evaluate(async () => {
  const f = window.__juego.fiestas;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyM' }));
  window.__juego.fiestas.atiende(window.__juego.entrada);
  const apagado = !f.sonido.activo;
  const boton = document.querySelector('[data-pulsar="sonido"]').textContent;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyM' }));
  window.__juego.fiestas.atiende(window.__juego.entrada);
  return { apagado, boton, encendido: f.sonido.activo, guardado: localStorage.getItem('cabanillas.sonido') };
});
comprueba(mute.apagado && mute.boton === '🔇' && mute.encendido && mute.guardado === 'si', `M: ${JSON.stringify(mute)}`);

console.log('7. Encierro');
await p.evaluate(async () => { window.__juego.ponPausa(false); await window.__juego.entraFiestas('encierro'); });
await p.waitForTimeout(1500);
const enc = await p.evaluate(() => {
  const j = window.__juego; const t = window.__t; const f = j.fiestas;
  j.ponPausa(true); j.fiestas.mostrarHud(true);
  t.aSalvo();
  let corriendo = 0;
  t.pasos(60 * 40, () => { const ahora = f.mozos.mozos.filter((m) => m.estado === 'corre' && m.v > 4).length; corriendo = Math.max(corriendo, ahora); return ahora >= 2 && f.vacas.every((v) => v.estado === 'guiada'); });
  const m = f.mozos.mozos.filter((x) => x.estado === 'corre' && x.v > 4);
  const c = m.reduce((s, x) => [s[0] + x.x / m.length, s[1] + x.z / m.length], [0, 0]);
  const v = f.vacas[0].posicion();
  return { mozos: f.mozos.mozos.length, corriendo, c, v: [v.x, v.z] };
});
comprueba(enc.corriendo >= 2, `encierro: ${enc.corriendo} de ${enc.mozos} mozos corriendo delante de la manada a la vez`);
const de = [enc.c[0] - enc.v[0], enc.c[1] - enc.v[1]]; const le = Math.hypot(...de) || 1;
await foto('encierro', { desde: [enc.c[0] + (de[0] / le) * 7, 2.6, enc.c[1] + (de[1] / le) * 7], hacia: [(enc.c[0] + enc.v[0]) / 2, 1.0, (enc.c[1] + enc.v[1]) / 2] });

console.log('8. Volver al pueblo');
const fuera = await p.evaluate(async () => {
  const j = window.__juego;
  j.ponPausa(false);
  await j.saleFiestas();
  return { modo: j.modoFiestas, mozos: Boolean(j.escena?.getObjectByName?.('fiestas_mozos')) };
});
comprueba(fuera.modo === null && !fuera.mozos, `fuera de fiestas: ${JSON.stringify(fuera)}`);
comprueba(errores.length === 0, `errores de consola: ${JSON.stringify(errores.slice(0, 6))}`);
console.log(fallos ? `\n${fallos} comprobaciones fallan` : '\nTodo bien');
await b.close();
process.exit(fallos ? 1 : 0);
