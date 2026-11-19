// Prueba del salto en paracaídas (PLAN_SALTO.md, S0) en un navegador sin ventana:
//   1. Con ?salto, tras «Jugar» se está en el avión, con los mandos del salto (y el botón 🪂 en táctil).
//   2. Espacio salta; abrir por encima de la altura máxima no abre; el paracaídas se abre solo a
//      una altura razonable; near nunca pasa de 2 m (no recorta al personaje).
//   3. Al tocar el suelo: a pie, en un sitio libre (no en un tejado ni en el agua), con el coche
//      aparcado cerca; near, far y niebla vuelven a los de la calidad; los mandos, a los del pueblo.
//   4. Sin pulsar nada, el avión te tira al final de la ruta.
//   5. Varias rutas al azar (semillas) aterrizan bien.
//   6. Sin ?salto se empieza saltando; «Empezar en la calle», «Ir a las fiestas», «Saltarse el
//      salto» (pausa) y ?salto=0 llevan al juego de siempre.
// El bucle del juego va a menos de 2 FPS sin gráfica: el salto se avanza con
// window.__juego.simulaSalto() (solo en desarrollo), a 30 pasos por segundo sin dibujar.
// Saca capturas de cada fase. Hace falta el servidor de desarrollo (npm run dev) y Playwright.
// Uso: node tools/prueba_salto.mjs <carpeta de capturas> [bajo|medio|alto] [movil|no]
// (PUERTO=5180 si el servidor no está en el 5173; CANAL=chrome para usar el Chrome instalado)
import { createRequire } from 'node:module';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const S = process.argv[2];
const calidad = process.argv[3] ?? 'bajo';
const movil = process.argv[4] === 'movil';
const puerto = process.env.PUERTO ?? '5173';
const b = await chromium.launch({ channel: process.env.CANAL, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const contexto = await b.newContext(movil ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } : { viewport: { width: 1100, height: 620 } });
let fallos = 0;
const comprueba = (ok, texto) => { console.log(`  ${ok ? 'bien ' : 'FALLO'}  ${texto}`); if (!ok) fallos++; };
const errores = [];
async function abre(semilla, boton = 'jugar') {
  const p = await contexto.newPage();
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.location()?.url ?? '')) errores.push(m.text()); });
  p.on('pageerror', (e) => errores.push('PAGEERROR ' + e.message));
  await p.goto(`http://localhost:${puerto}/?calidad=${calidad}&debug=1${semilla === null ? '' : `&salto=${semilla}`}`);
  await p.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 240000 });
  await p.evaluate((id) => document.getElementById(id).click(), boton);
  await p.waitForTimeout(800);
  return p;
}
const fotogramas = (p, n = 3) => p.evaluate((k) => new Promise((r) => {
  let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);
const captura = async (p, nombre) => {
  await fotogramas(p, 2);
  await p.screenshot({ path: `${S}/salto_${nombre}${movil ? '_movil' : ''}.jpg`, quality: 82, timeout: 120000 });
};
// Avanza hasta que se cumpla la condición «hasta» (o se acabe el tiempo), apuntando el near máximo
const avanza = (p, segundos, mandos = {}, hasta = null) => p.evaluate(({ segundos, mandos, hasta }) => {
  const j = window.__juego;
  const condiciones = {
    planeo: (j) => j.salto.fase === 'planeo',
    casiSuelo: (j) => j.salto.altura < 6,
    fueraDelAvion: (j) => j.salto.fase !== 'avion',
  };
  const fin = condiciones[hasta] ?? (() => false);
  let nearMax = j.camara.near;
  let alturaApertura = null;
  for (let t = 0; t < segundos && j.salto.activo && !fin(j); t += 0.1) {
    const antes = j.salto.fase;
    j.simulaSalto(0.1, mandos);
    if (antes !== 'apertura' && j.salto.fase === 'apertura') alturaApertura = j.salto.altura;
    nearMax = Math.max(nearMax, j.camara.near);
  }
  return { fase: j.salto.fase, altura: j.salto.altura, nearMax, alturaApertura };
}, { segundos, mandos, hasta });

console.log('1. En el avión');
const p = await abre(7);
const inicio = await p.evaluate(() => {
  const j = window.__juego;
  return { fase: j.salto?.fase, modo: j.entrada.modo, near: j.camara.near, far: j.camara.far,
    boton: getComputedStyle(document.querySelector('.botones-salto')).display, conducir: getComputedStyle(document.querySelector('.botones')).display };
});
comprueba(inicio.fase === 'avion' && inicio.modo === 'salto', `fase ${inicio.fase}, mandos «${inicio.modo}»`);
comprueba(inicio.near <= 2 && inicio.far >= 3000, `near ${inicio.near.toFixed(2)} m, far ${Math.round(inicio.far)} m`);
if (movil) comprueba(inicio.boton === 'block' && inicio.conducir === 'none', `botón 🪂 ${inicio.boton}, mandos del coche ${inicio.conducir}`);
await avanza(p, 4);
await captura(p, '1_avion');

console.log('2. Salto y caída');
if (movil) await p.tap('[data-pulsar="paracaidas"]');
else await p.keyboard.press('Space');
let r = await avanza(p, 1);
comprueba(r.fase === 'salida' || r.fase === 'caida', `tras pulsar ${movil ? '🪂' : 'Espacio'}: fase ${r.fase}`);
await captura(p, '2_salida');
await p.evaluate(() => window.__juego.simulaSalto(0.1, {}, true));   // abrir muy alto: no debe abrirse
const alto = await p.evaluate(() => window.__juego.salto.fase);
comprueba(alto === 'caida' || alto === 'salida', `abrir a ${Math.round(await p.evaluate(() => window.__juego.salto.altura))} m: sigue en ${alto}`);
r = await avanza(p, 4, { avance: 1 });
await captura(p, '3_picado');
const caida = await avanza(p, 60, {}, 'planeo');
comprueba(caida.alturaApertura !== null && caida.alturaApertura > 55 && caida.alturaApertura < 140,
  `se abre solo a ${caida.alturaApertura?.toFixed(0)} m`);
await captura(p, '4_planeo');
const planeo = await avanza(p, 120, { lateral: 0.3 }, 'casiSuelo');
await captura(p, '5_casi_en_el_suelo');
const final = await avanza(p, 10);
comprueba(Math.max(r.nearMax, caida.nearMax, planeo.nearMax, final.nearMax) <= 2.0001,
  `near máximo en todo el vuelo: ${Math.max(r.nearMax, caida.nearMax, planeo.nearMax, final.nearMax).toFixed(2)} m`);

console.log('3. Aterrizaje');
const suelo = await p.evaluate(() => {
  const j = window.__juego;
  const pe = j.peaton.estado().posicion;
  const co = j.coche.estado().posicion;
  return { activo: j.salto.activo, aPie: j.aPie, modo: j.entrada.modo, valido: j.esSitioValido(pe.x, pe.z),
    coche: Math.hypot(pe.x - co.x, pe.z - co.z), near: j.camara.near, far: j.camara.far, niebla: [j.escena.fog.near, j.escena.fog.far] };
});
comprueba(!suelo.activo && suelo.aPie && suelo.modo === 'pueblo', `salto acabado, a pie, mandos «${suelo.modo}»`);
comprueba(suelo.valido, 'el personaje está en un sitio libre (ni tejado, ni agua, ni dentro de algo)');
comprueba(suelo.coche < 15, `coche aparcado a ${suelo.coche.toFixed(1)} m`);
comprueba(suelo.near === 0.5, `near ${suelo.near} m, far ${suelo.far} m, niebla ${suelo.niebla.map(Math.round).join('–')} m`);
await fotogramas(p, 3);
await captura(p, '6_a_pie');
await p.close();

console.log('4. Salto forzoso');
const q = await abre(3);
const forzoso = await avanza(q, 40, {}, 'fueraDelAvion');
comprueba(forzoso.fase !== 'avion', `sin pulsar nada, el avión te tira (fase ${forzoso.fase})`);
await q.close();

console.log('5. Varias rutas');
for (const semilla of [11, 23, 42, 77, 1234]) {
  const w = await abre(semilla);
  await w.evaluate(() => window.__juego.simulaSalto(6 + Math.random() * 10));
  await w.evaluate(() => window.__juego.simulaSalto(0.1, {}, true));
  await avanza(w, 200, { lateral: 0.2 });
  const v = await w.evaluate(() => {
    const j = window.__juego; const pe = j.peaton.estado().posicion; const co = j.coche.estado().posicion;
    return { activo: j.salto.activo, valido: j.esSitioValido(pe.x, pe.z), coche: Math.hypot(pe.x - co.x, pe.z - co.z), x: pe.x, z: pe.z };
  });
  comprueba(!v.activo && v.valido && v.coche < 15, `semilla ${semilla}: en (${v.x.toFixed(0)}, ${v.z.toFixed(0)}), coche a ${v.coche.toFixed(1)} m`);
  await w.close();
}

console.log('6. Empezar con o sin salto');
const enCoche = (pagina) => pagina.evaluate(() => {
  const j = window.__juego;
  return { salto: Boolean(j.salto?.activo), aPie: j.aPie, modo: j.entrada.modo, near: j.camara.near, fov: Math.round(j.camara.fov),
    trafico: j.trafico.raiz.visible, boton: !document.querySelector('[data-pulsar="bajar"]').hidden };
});
let w = await abre(null);
let e = await w.evaluate(() => ({ salto: window.__juego.salto?.activo, fase: window.__juego.salto?.fase }));
comprueba(e.salto && e.fase === 'avion', `sin ?salto, «Jugar» empieza en el avión (${e.fase})`);
await w.evaluate(() => document.getElementById('boton-menu').click());
await w.waitForTimeout(300);
const visible = await w.evaluate(() => !document.getElementById('omitir-salto').hidden);
await w.evaluate(() => document.getElementById('omitir-salto').click());
await fotogramas(w, 3);
e = await enCoche(w);
comprueba(visible && !e.salto && !e.aPie && e.modo === 'pueblo' && e.near === 0.5 && e.trafico && e.boton,
  `pausa → «Saltarse el salto» (${visible ? 'a la vista' : 'oculto'}): en el coche, mandos «${e.modo}», near ${e.near}, fov ${e.fov}`);
await captura(w, '7_saltado');
await w.close();
w = await abre(null, 'jugar-calle');
await fotogramas(w, 3);
e = await enCoche(w);
comprueba(!e.salto && !e.aPie && e.modo === 'pueblo' && e.trafico, `«Empezar en la calle»: en el coche, sin salto, mandos «${e.modo}»`);
await w.close();
w = await abre(null, 'jugar-fiestas');
await w.waitForFunction(() => window.__juego.fiestas, null, { timeout: 120000 });
await w.waitForTimeout(1500);
e = await w.evaluate(() => ({ salto: Boolean(window.__juego.salto?.activo), menu: !document.getElementById('menu-fiestas')?.hidden, modo: window.__juego.entrada.modo }));
comprueba(!e.salto && e.menu, `«Ir a las fiestas»: sin salto, menú de fiestas ${e.menu ? 'abierto' : 'cerrado'}`);
await w.close();
w = await abre(0);
e = await enCoche(w);
comprueba(!e.salto && !e.aPie && e.modo === 'pueblo', `?salto=0: en el coche, sin salto`);
await w.close();

comprueba(errores.length === 0, `errores de consola: ${errores.length}${errores.length ? ` (${errores.slice(0, 3).join(' | ')})` : ''}`);
await b.close();
console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
