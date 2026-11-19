// Prueba automática del jugador del modo fiestas (F2) en un navegador sin ventana:
//   1. Recorrido: de la plaza al final de la calle y vuelta, corriendo con los mandos.
//   2. Refugios: subirse y bajarse en todos los tramos de valla de tablones, el burladero y la valla gris.
//   3. Suertes: quiebro, combo, recorte, salto y especial (desplazamiento, altura y energía).
//   4. Cámara: se acerca cuando una fachada tapa y gira hacia una vaca que queda fuera de la vista.
//   5. Táctil (con «movil»): joystick y botones de acción.
// Hace falta el servidor de desarrollo (npm run dev) y Playwright (PLAYWRIGHT_RAIZ si no está en el proyecto).
//
// Uso: node tools/prueba_personaje.mjs <carpeta de capturas> [bajo|medio|alto] [movil|no] [sinfotos]
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const S = process.argv[2];
const calidad = process.argv[3] ?? 'bajo';
const movil = process.argv[4] === 'movil';
const sinFotos = process.argv[5] === 'sinfotos';
const soloTactil = process.env.SOLO === 'tactil';      // salta las partes 1 a 4
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext(movil ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 } : { viewport: { width: 1100, height: 620 } });
const p = await ctx.newPage();
const errores = [];
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
p.on('pageerror', (e) => errores.push('PAGEERROR ' + e.message));
const foto = async (nombre) => {
  if (sinFotos) return;
  const url = await p.evaluate(() => {
    const j = window.__juego;
    j.fiestas.fotograma(0.016, { dx: 0, dy: 0 }, { giro: 0 });
    window.__render.render();
    return j.renderer.domElement.toDataURL('image/jpeg', 0.85);
  });
  writeFileSync(`${S}/f2_${nombre}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
};
await p.goto(`http://localhost:5173/?salto=0&calidad=${calidad}&debug=1&vacas=0`);
await p.waitForFunction(() => window.__juego, null, { timeout: 240000 });
await p.evaluate(() => document.getElementById('jugar').click());
await p.waitForTimeout(1000);
await p.evaluate(() => window.__juego.entraFiestas('calle'));
await p.waitForFunction(() => window.__juego.modoFiestas && window.__juego.fiestas.personaje, null, { timeout: 60000 });
await p.waitForTimeout(1200);
// El bucle del juego se para: la prueba da los pasos de física a mano
await p.evaluate(() => {
  const j = window.__juego;
  j.ponPausa(true);
  window.__t = {
    quieto: { avance: 0, lateral: 0, correr: false, conJoystick: false, giro: 0 },
    // Pasos de física con unos mandos
    pasos(n, mandos = this.quieto) {
      for (let i = 0; i < n; i++) {
        j.fiestas.paso(mandos, 1 / 60);
        j.fisica.mundo.step();
        if (i % 20 === 0) { const q = j.fiestas.personaje.posicion(); j.colisiones.fuerza({ x: q.x, z: q.z }); }
      }
    },
    pon(x, z, guinada = 0) {
      j.peaton.activa(x, z, guinada);
      j.colisiones.fuerza({ x, z });
      j.fiestas.personaje.reinicia(guinada);
      j.fiestas.camaraJugador.reinicia(guinada);
      this.pasos(3);
    },
    // Mandos que llevan hacia (x, z) con la cámara donde esté
    hacia(x, z, correr) {
      const q = j.fiestas.personaje.posicion(); const g = j.fiestas.camaraJugador.guinada;
      let dx = x - q.x; let dz = z - q.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const fx = -Math.sin(g); const fz = -Math.cos(g);
      return { avance: dx * fx + dz * fz, lateral: dx * -fz + dz * fx, correr, conJoystick: false, giro: 0 };
    },
  };
});

// 1. Recorrido plaza → final de la calle → plaza
if (!soloTactil) {
const recorrido = await p.evaluate(() => {
  const j = window.__juego; const t = window.__t; const r = j.fiestas.recinto;
  const ida = [[178, 336], r.plaza.eje[0], ...r.calle.eje.slice(1)];
  ida[ida.length - 1] = [16, 285.2];
  const ruta = [...ida.slice(1), ...ida.slice(0, -1).reverse()];
  t.pon(ida[0][0], ida[0][1], 1.2);
  let pasos = 0; let metros = 0; let ant = j.fiestas.personaje.posicion(); const fallos = []; let energiaMin = 1; let vMax = 0;
  for (const [x, z] of ruta) {
    let n = 0;
    for (;;) {
      const q = j.fiestas.personaje.posicion();
      if (Math.hypot(q.x - x, q.z - z) < 1.2) break;
      if (++n > 60 * 40) { fallos.push([x, z, Math.round(q.x), Math.round(q.z)]); break; }
      t.pasos(1, t.hacia(x, z, true));
      const s = j.fiestas.personaje.posicion();
      metros += Math.hypot(s.x - ant.x, s.z - ant.z); ant = s; pasos++;
      energiaMin = Math.min(energiaMin, j.fiestas.personaje.energia);
      const v = j.fiestas.personaje.velocidad(); vMax = Math.max(vMax, Math.hypot(v.x, v.z));
    }
  }
  const fin = j.fiestas.personaje.posicion();
  return { puntos: ruta.length, fallos, metros: Math.round(metros), segundos: Math.round(pasos / 60), vMax: +vMax.toFixed(2),
    energiaMin: +energiaMin.toFixed(2), acaba: [Math.round(fin.x), Math.round(fin.z)] };
});
console.log('RECORRIDO', JSON.stringify(recorrido));

// 2. Refugios: todos los tramos de tablones, burladeros y vallas grises
const refugios = await p.evaluate(() => {
  const j = window.__juego; const t = window.__t; const r = j.fiestas.recinto; const dentroDe = j.fiestas.dentroDe;
  const dentro = (x, z) => dentroDe(r.plaza.ruedo, x, z) || dentroDe(r.calle.recorrido, x, z);
  const casos = [];
  for (const tr of r.tramos) {
    if (tr.tipo !== 'tablones' || tr.clase === 'gradas' || tr.largo <= 1.2) continue;
    const m = [(tr.a[0] + tr.b[0]) / 2, (tr.a[1] + tr.b[1]) / 2];
    const l = Math.hypot(tr.b[0] - tr.a[0], tr.b[1] - tr.a[1]);
    const n = [-(tr.b[1] - tr.a[1]) / l, (tr.b[0] - tr.a[0]) / l];
    const lado = dentro(m[0] + n[0] * 0.9, m[1] + n[1] * 0.9) ? 1 : -1;
    casos.push({ nombre: `tramo ${tr.id}`, x: m[0] + n[0] * 0.9 * lado, z: m[1] + n[1] * 0.9 * lado, tipo: 'valla' });
  }
  const bur = r.burladeros[0];
  casos.push({ nombre: 'burladero', x: bur.en[0] - 0.9, z: bur.en[1] - 1.2, tipo: 'burladero' });
  const g = r.refugios[0].esquinas; const cg = [(g[0][0] + g[1][0] + g[2][0] + g[3][0]) / 4, (g[0][1] + g[1][1] + g[2][1] + g[3][1]) / 4];
  casos.push({ nombre: 'valla gris', x: cg[0] + 0.3, z: cg[1] + 1.9, tipo: 'gris' });
  const fallos = []; let bien = 0;
  for (const c of casos) {
    t.pon(c.x, c.z, 0);
    t.pasos(8);
    const pj = j.fiestas.personaje;
    const suelo = pj.posicion().y;
    const pista = pj.pista;
    if (!pista || pista.tipo !== c.tipo) { fallos.push([c.nombre, 'sin pista', pista?.tipo ?? null]); continue; }
    pj.pide('refugio'); t.pasos(45);
    const arriba = pj.posicion();
    const subio = pj.estado === 'refugiado' && pj.seguro && (c.tipo !== 'valla' || arriba.y - suelo > 1.2);
    pj.pide('refugio'); t.pasos(60);
    const abajo = pj.posicion();
    const bajo = pj.estado === 'libre' && !pj.seguro && dentro(abajo.x, abajo.z) && Math.abs(abajo.y - suelo) < 0.3;
    if (subio && bajo) bien++; else fallos.push([c.nombre, pj.estado, subio, bajo, +(arriba.y - suelo).toFixed(2), +(abajo.y - suelo).toFixed(2)]);
  }
  return { casos: casos.length, bien, fallos };
});
console.log('REFUGIOS', JSON.stringify(refugios));

// 3. Suertes
const suertes = await p.evaluate(() => {
  const j = window.__juego; const t = window.__t; const pj = () => j.fiestas.personaje;
  const res = {};
  const mide = (accion, pasos, previo) => {
    t.pon(178, 336, 0);
    previo?.();
    const a = pj().posicion(); const e0 = pj().energia; let alto = 0;
    pj().pide(accion);
    for (let i = 0; i < pasos; i++) { t.pasos(1); alto = Math.max(alto, pj().posicion().y - a.y); }
    const q = pj().posicion();
    return { metros: +Math.hypot(q.x - a.x, q.z - a.z).toFixed(2), alto: +alto.toFixed(2), energia: +(e0 - pj().energia).toFixed(2),
      estado: pj().estado, ultimo: pj().sucesos.at(-1)?.tipo };
  };
  res.quiebro = mide('quiebro', 40);
  res.recorte = mide('recorte', 50);
  res.salto = mide('salto', 70);
  res.especial = mide('especial', 90);
  // Combo: dos quiebros seguidos, ida y vuelta
  t.pon(178, 336, 0);
  const a = pj().posicion();
  pj().pide('quiebro'); t.pasos(12); pj().pide('quiebro'); t.pasos(10);
  const medio = pj().posicion(); t.pasos(40);
  const fin = pj().posicion();
  res.combo = { ida: +Math.hypot(medio.x - a.x, medio.z - a.z).toFixed(2), finAlOrigen: +Math.hypot(fin.x - a.x, fin.z - a.z).toFixed(2),
    sucesos: pj().sucesos.slice(-2).map((s) => s.tipo) };
  // Salto y recorte casi a la vez = especial
  t.pon(178, 336, 0);
  pj().pide('salto'); t.pasos(4); pj().pide('recorte'); let alto = 0; const y0 = pj().posicion().y;
  for (let i = 0; i < 80; i++) { t.pasos(1); alto = Math.max(alto, pj().posicion().y - y0); }
  res.saltoMasRecorte = { alto: +alto.toFixed(2), sucesos: pj().sucesos.slice(-2).map((s) => s.tipo) };
  // Cansancio: esprint hasta agotarse y recuperación
  t.pon(170, 331, 0);
  let seg = 0; const ida = [190, 339]; const vuelta = [166, 330]; let meta = ida;
  while (!pj().agotado && seg < 40) {
    const q = pj().posicion(); if (Math.hypot(q.x - meta[0], q.z - meta[1]) < 2) meta = meta === ida ? vuelta : ida;
    t.pasos(6, t.hacia(meta[0], meta[1], true)); seg += 0.1;
  }
  const v = pj().velocidad();
  t.pasos(30, t.hacia(meta[0], meta[1], true));
  const v2 = pj().velocidad();
  res.cansancio = { segundosHastaAgotarse: +seg.toFixed(1), velocidadAgotado: +Math.hypot(v2.x, v2.z).toFixed(2), energia: +pj().energia.toFixed(2) };
  t.pasos(60 * 6);
  res.cansancio.energiaTras6s = +pj().energia.toFixed(2);
  return res;
});
console.log('SUERTES', JSON.stringify(suertes));

// 4. Cámara: junto a una fachada se acerca; con una vaca detrás, gira hacia ella
const camara = await p.evaluate(() => {
  const j = window.__juego; const t = window.__t; const c = j.fiestas.camaraJugador;
  const dist = () => { const q = j.fiestas.personaje.posicion(); return Math.hypot(j.camara.position.x - q.x, j.camara.position.z - q.z); };
  const marca = (n) => { for (let i = 0; i < n; i++) j.fiestas.fotograma(1 / 60, { dx: 0, dy: 0 }, { giro: 0 }); };
  t.pon(178, 336, 1.2); marca(60);
  const libre = dist();
  // Mirando al norte, de espaldas a la fachada sur y pegado a la valla: la cámara no cabe detrás
  t.pon(176, 338.9, 0); marca(60);
  const tapada = dist();
  // Una vaca a la espalda
  t.pon(178, 336, 1.2); marca(10);
  const g0 = c.guinada;
  // (la cámara mira al oeste; la vaca, al este)
  j.fiestas.ponVaca({ x: 192, z: 340 });
  marca(180);
  const q = j.fiestas.personaje.posicion();
  let error = Math.atan2(-(192 - q.x), -(340 - q.z)) - c.guinada; error = Math.atan2(Math.sin(error), Math.cos(error));
  j.fiestas.ponVaca(null);
  return { distanciaLibre: +libre.toFixed(2), distanciaTapada: +tapada.toFixed(2), giroHaciaVaca: +(c.guinada - g0).toFixed(2), quedaA: +Math.abs(error).toFixed(2) };
});
console.log('CAMARA', JSON.stringify(camara));

// Capturas
if (!sinFotos) {
  await p.evaluate(() => { const t = window.__t; t.pon(176, 334.5, 1.25); t.pasos(50, { avance: 1, lateral: 0, correr: true, conJoystick: false, giro: 0 }); });
  await foto('corriendo');
  await p.evaluate(() => { const j = window.__juego; const t = window.__t; t.pon(183, 337.5, 1.9); j.fiestas.personaje.pide('salto'); t.pasos(16); });
  await foto('salto');
  await p.evaluate(() => { const j = window.__juego; const t = window.__t; t.pon(184, 342.1, -0.5); t.pasos(6); j.fiestas.personaje.pide('refugio'); t.pasos(45); });
  await foto('en_la_valla');
  await p.evaluate(() => { const j = window.__juego; const t = window.__t; t.pon(120, 318, 1.3); t.pasos(40, { avance: 1, lateral: 0, correr: false, conJoystick: false, giro: 0 }); });
  await foto('calle');
}

}

// 5. Táctil: joystick y botones (eventos de puntero de verdad sobre los mandos). Sin tarjeta
// gráfica un fotograma puede tardar más de un segundo: se espera por fotogramas, no por tiempo
await p.evaluate(() => window.__juego.ponPausa(false));
await p.waitForTimeout(500);
const tactil = await p.evaluate(async () => {
  const j = window.__juego; const t = window.__t;
  const visible = (sel) => { const e = document.querySelector(sel); return Boolean(e) && e.getClientRects().length > 0; };
  const res = { mandosVisibles: !document.getElementById('tactil').hidden, botonesFiestas: visible('.botones-fiestas'), pedales: visible('.botones'),
    acciones: {} };
  t.pon(178, 336, 0);
  const cuadros = async (n) => { for (let i = 0; i < n; i++) await new Promise((r) => { requestAnimationFrame(r); }); };
  const pulsa = (sel) => document.querySelector(sel).dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, pointerType: 'touch', bubbles: true, cancelable: true }));
  for (const a of ['quiebro', 'recorte', 'salto', 'especial']) {
    const antes = j.fiestas.personaje.sucesos.at(-1)?.t ?? -1;
    pulsa(`[data-pulsar="${a}"]`);
    await cuadros(4);
    const ultimo = j.fiestas.personaje.sucesos.at(-1);
    res.acciones[a] = ultimo?.tipo === a && ultimo.t > antes;
    await cuadros(25);
  }
  // Joystick hacia arriba: el jugador avanza hacia donde mira la cámara
  if (res.mandosVisibles) {
    const zona = document.querySelector('.zona-joystick'); const r = zona.getBoundingClientRect();
    const x = r.left + r.width / 2; const y = r.top + r.height / 2;
    const ev = (tipo, dy) => zona.dispatchEvent(new PointerEvent(tipo, { pointerId: 9, pointerType: 'touch', clientX: x, clientY: y + dy, bubbles: true, cancelable: true }));
    const a = j.fiestas.personaje.posicion();
    ev('pointerdown', 0); ev('pointermove', -70);
    await cuadros(20);
    const q = j.fiestas.personaje.posicion();
    ev('pointerup', -70);
    res.joystickMetros = +Math.hypot(q.x - a.x, q.z - a.z).toFixed(1);
  }
  // Botón «Subir»: aparece junto a una valla y sube
  t.pon(184, 342.1, -0.5);
  await cuadros(4);
  res.botonSubir = visible('[data-pulsar="refugio"]');
  pulsa('[data-pulsar="refugio"]');
  await cuadros(14);
  res.velocimetro = visible('#velocimetro');
  res.subeConBoton = j.fiestas.personaje.estado === 'refugiado';
  res.textoBoton = document.querySelector('[data-pulsar="refugio"]').textContent;
  return res;
});
console.log('TACTIL', JSON.stringify(tactil));
if (movil) await p.screenshot({ path: `${S}/f2_movil.png`, timeout: 120000 }).catch((e) => console.log('captura del móvil no disponible:', e.message.split('\n')[0]));

// Salir: los mandos y las teclas vuelven a ser los del coche
await p.evaluate(() => window.__juego.saleFiestas());
await p.waitForFunction(() => !window.__juego.modoFiestas, null, { timeout: 60000 });
await p.waitForTimeout(800);
console.log('SALIDA', JSON.stringify(await p.evaluate(() => {
  const j = window.__juego; const restos = []; j.escena.traverse((o) => { if (o.name.startsWith('fiestas_')) restos.push(o.name); });
  return { restos, hud: Boolean(document.getElementById('hud-fiestas')), modoTeclas: j.entrada.modo, claseTactil: document.getElementById('tactil').className,
    aPie: j.aPie, fov: j.camara.fov };
})));
console.log('ERRORES', JSON.stringify(errores.slice(0, 8)));
await b.close();
