// Prueba de la fase A3 del modo agricultura (PLAN_AGRICULTURA.md): el tractor y la COPE, en un
// navegador sin ventana.
//   1. Con ?agricultura se empieza en el aro de la COPE con el tractor aparcado en el patio.
//   2. E (o «Entrar») abre el menú de la COPE; «Coger el tractor» con otro color: se conduce el
//      tractor y el coche se queda aparcado en el patio.
//   3. El tractor anda hacia delante y hacia atrás sin volcar; cámaras de persecución y de cabina.
//   4. Por la parcela de pruebas (2-700): entra desde su linde y anda por dentro.
//   5. De vuelta en la COPE, «Dejar el tractor» devuelve el coche y deja el tractor en su sitio.
//   6. Sin errores de consola; sin ?agricultura no hay COPE ni se descarga nada del modo.
// Saca capturas. Hace falta el servidor de desarrollo (npm run dev) y Playwright.
// Uso: node tools/prueba_tractor.mjs <carpeta de capturas> [bajo|medio|alto] [movil|no]
// (PUERTO=5180 si el servidor no está en el 5173; CANAL=chrome para usar el Chrome instalado)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const S = process.argv[2];
const calidad = process.argv[3] ?? 'bajo';
const movil = process.argv[4] === 'movil';
const puerto = process.env.PUERTO ?? '5173';
mkdirSync(S, { recursive: true });
const b = await chromium.launch({ channel: process.env.CANAL, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const contexto = await b.newContext(movil
  ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }
  : { viewport: { width: 1100, height: 620 } });
let fallos = 0;
const comprueba = (ok, texto) => { console.log(`  ${ok ? 'bien ' : 'FALLO'}  ${texto}`); if (!ok) fallos++; };
const errores = [];
const sufijo = `${movil ? '_movil' : ''}_${calidad}`;
const fotogramas = (p, n = 3) => p.evaluate((k) => new Promise((r) => {
  let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);
const captura = async (p, nombre) => {
  await fotogramas(p, 3);
  await p.screenshot({ path: `${S}/tractor_${nombre}${sufijo}.jpg`, quality: 85, timeout: 180000 });
  console.log(`  captura ${S}/tractor_${nombre}${sufijo}.jpg`);
};
const estado = (p) => p.evaluate(() => {
  const j = window.__juego;
  const t = j.agricultura?.tractor;
  const pos = (v) => { const e = v.estado(); return { x: e.posicion.x, y: e.posicion.y, z: e.posicion.z, kmh: e.velocidadKmh, volcado: e.volcado }; };
  return {
    llevaTractor: j.coche === t,
    coche: pos(j.cocheJugador),
    tractor: t ? pos(t) : null,
    menu: Boolean(document.getElementById('menu-cope') && !document.getElementById('menu-cope').hidden),
    camara: j.camaraCoche.modo,
  };
});
const dist = (a, [x, z]) => Math.hypot(a.x - x, a.z - z);
async function conduce(p, tecla, n) {
  await p.keyboard.down(tecla);
  await fotogramas(p, n);
  await p.keyboard.up(tecla);
}
async function entrar(p) {
  if (movil) await p.locator('[data-pulsar="entrar"]').dispatchEvent('pointerdown');
  else await p.keyboard.press('KeyE');
  await fotogramas(p, 2);
}
async function paraEn(p, x, z, rumbo) {
  await p.evaluate(({ x, z, rumbo }) => {
    const j = window.__juego;
    const r = (rumbo * Math.PI) / 180;
    j.coche.recoloca(x, j.mundo.terreno.alturaEn(x, z) + 1, z, Math.sin(r), -Math.cos(r));
  }, { x, z, rumbo });
  for (let i = 0; i < 12; i++) {
    await fotogramas(p, 2);
    if (Math.abs((await estado(p)).tractor.kmh) < 0.5) break;
  }
}

// --- 1. Salida en la COPE
const p = await contexto.newPage();
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
p.on('pageerror', (e) => errores.push(`PAGEERROR ${e.message}`));
await p.goto(`http://localhost:${puerto}/?calidad=${calidad}&personaje=0&hora=dia&debug=1&agricultura`);
await p.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 300000 });
await p.evaluate(() => document.getElementById('jugar').click());
await fotogramas(p, 4);
const cope = await p.evaluate(async () => {
  const { AGRICULTURA } = await import('/src/config/agricultura.js');
  const { ENTRADAS } = await import('/src/config/entradas.js');
  return { ...AGRICULTURA.cope, aro: ENTRADAS.find((e) => e.id === 'cope').en };
});
let s = await estado(p);
console.log('1. Salida', JSON.stringify(s));
comprueba(dist(s.coche, cope.aro) < 6, `se empieza en el aro de la COPE (a ${dist(s.coche, cope.aro).toFixed(1)} m)`);
comprueba(s.tractor && dist(s.tractor, cope.sitioTractor) < 2, 'el tractor espera aparcado en el patio');
comprueba(!s.llevaTractor, 'se empieza en el coche');
await captura(p, '1_cope');

// --- 2. Coger el tractor (verde)
await entrar(p);
s = await estado(p);
comprueba(s.menu, 'E (o «Entrar») abre el menú de la COPE');
await captura(p, '2_menu');
await p.evaluate(() => {
  const l = [...document.querySelectorAll('#menu-cope .colores label')].find((x) => x.textContent.includes('Verde'));
  l.querySelector('input').click();
  [...document.querySelectorAll('#menu-cope button')].find((x) => x.textContent.includes('Coger el tractor')).click();
});
await fotogramas(p, 6);
s = await estado(p);
comprueba(s.llevaTractor && !s.menu, 'llevas el tractor');
comprueba(dist(s.coche, cope.sitioCoche) < 2.5, 'el coche queda aparcado en el patio');
const verde = await p.evaluate(() => {
  let c = null;
  window.__juego.agricultura.tractor.modelo.grupo.traverse((o) => { if (o.isMesh && o.material?.name === 'pintura') c = o.material.color.getHexString(); });
  return c;
});
comprueba(verde === '2f6b2a', `pintado de verde (${verde})`);

// --- 3. Andar: adelante, atrás, cámaras
const t0 = s.tractor;
await conduce(p, 'KeyW', 40);
s = await estado(p);
const avance = dist(s.tractor, [t0.x, t0.z]);
console.log('  tras acelerar:', JSON.stringify(s.tractor));
comprueba(avance > 2, `anda hacia delante (${avance.toFixed(1)} m, ${s.tractor.kmh.toFixed(1)} km/h)`);
comprueba(s.tractor.kmh <= 41, 'no pasa de 40 km/h');
comprueba(!s.tractor.volcado, 'no vuelca');
await captura(p, '3_persecucion');
await p.keyboard.press('KeyC');
await fotogramas(p, 3);
s = await estado(p);
comprueba(s.camara === 'capo', 'C: cámara de la cabina');
await captura(p, '4_cabina');
await p.keyboard.press('KeyC');
const t1 = s.tractor;
await conduce(p, 'KeyS', 60);
s = await estado(p);
comprueba(s.tractor.kmh < 0 || dist(s.tractor, [t1.x, t1.z]) > 1, `frena y anda marcha atrás (${s.tractor.kmh.toFixed(1)} km/h)`);

// --- 4. Por la parcela de pruebas
const parcela = await p.evaluate(async () => {
  const r = await fetch('/assets/agricultura/parcelas.json');
  const d = await r.json();
  const q = d.parcelas.find((x) => x.ref === '2-700');
  return { entrada: q.entrada, centro: q.centro, rumbo: q.labor_grados };
});
// Desde fuera de la linde, junto a la entrada, mirando hacia el centro
const { x: ex, z: ez } = parcela.entrada;
const [cx, cz] = parcela.centro;
const l = Math.hypot(cx - ex, cz - ez);
const rumbo = (Math.atan2(cx - ex, -(cz - ez)) * 180) / Math.PI;
await paraEn(p, ex - ((cx - ex) / l) * 6, ez - ((cz - ez) / l) * 6, rumbo);
await conduce(p, 'KeyW', 45);
s = await estado(p);
const dentro = await p.evaluate(({ x, z }) => {
  // ¿Dentro del contorno de la 2-700? (punto en polígono)
  return fetch('/assets/agricultura/parcelas.json').then((r) => r.json()).then((d) => {
    const q = d.parcelas.find((y) => y.ref === '2-700');
    let c = false;
    for (const parte of q.partes) {
      const a = parte[0];
      for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
        if ((a[i][1] > z) !== (a[j][1] > z) && x < ((a[j][0] - a[i][0]) * (z - a[i][1])) / (a[j][1] - a[i][1]) + a[i][0]) c = !c;
      }
    }
    return c;
  });
}, s.tractor);
comprueba(dentro, `entra en la parcela 2-700 (${s.tractor.x.toFixed(1)}, ${s.tractor.z.toFixed(1)})`);
comprueba(!s.tractor.volcado, 'sin volcar en la parcela');
await captura(p, '5_parcela');

// --- 5. Dejar el tractor en la COPE
await paraEn(p, cope.aro[0], cope.aro[1], 180);
await entrar(p);
s = await estado(p);
comprueba(s.menu, 'en el aro con el tractor se abre el menú');
await p.evaluate(() => [...document.querySelectorAll('#menu-cope button')].find((x) => x.textContent.includes('Dejar el tractor')).click());
await fotogramas(p, 6);
s = await estado(p);
comprueba(!s.llevaTractor, 'vuelves al coche');
comprueba(dist(s.tractor, cope.sitioTractor) < 2.5, 'el tractor vuelve a su sitio del patio');
await conduce(p, 'KeyW', 20);
s = await estado(p);
comprueba(Math.abs(s.coche.kmh) > 1 && dist(s.tractor, cope.sitioTractor) < 2.5, 'se conduce el coche y el tractor se queda');
comprueba(errores.length === 0, `sin errores en la consola${errores.length ? `: ${errores.slice(0, 5).join(' | ')}` : ''}`);
await p.close();

// --- 6. Sin ?agricultura
const q = await contexto.newPage();
const pedidos = [];
q.on('request', (r) => { if (/src\/agricultura\/|assets\/agricultura|assets\/maquinaria|menuCope/.test(r.url())) pedidos.push(r.url()); });
await q.goto(`http://localhost:${puerto}/?calidad=${calidad}&personaje=0&salto=0`);
await q.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 300000 });
const lugares = await q.evaluate(() => window.__juego.lugares.map((x) => x.nombre));
comprueba(!lugares.some((x) => x.includes('COPE')), 'sin ?agricultura no está la COPE en «Ir a…»');
comprueba(pedidos.length === 0, `sin ?agricultura no se descarga nada del modo${pedidos.length ? `: ${pedidos.join(', ')}` : ''}`);
await q.close();

await b.close();
console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
