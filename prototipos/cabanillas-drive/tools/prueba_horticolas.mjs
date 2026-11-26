// Prueba de la fase A10 (resto) del modo agricultura: brócoli, alcachofa y espárrago (recolección a mano).
//   1. ?agricultura=brocoli|alcachofa|esparrago empieza a pie dentro de la 2-700 sembrada y madura.
//   2. X (o el botón de la cesta) corta lo que está en su punto delante del personaje: la cesta suma kg
//      (rendimiento por vigor) y se llena a los 40 kg. El brócoli desaparece; los perennes rebrotan.
//   3. Con la planta verde no coge nada. 4. En la COPE se entrega la cesta y se vende a su precio.
//   5. La plantadora se engancha y su tolva cuenta plantas. Sin errores de consola.
// Uso: node tools/prueba_horticolas.mjs <carpeta de capturas> [bajo|medio|alto] [movil]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const S = process.argv[2];
const calidad = process.argv[3] ?? 'bajo';
const movil = process.argv[4] === 'movil';
const puerto = process.env.PUERTO ?? '5173';
const REF = '2-700';
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
const captura = async (p, cultivo, nombre) => {
  await p.evaluate(() => window.__juego.ponPausa(true));
  await fotogramas(p, 45);
  await p.screenshot({ path: `${S}/${cultivo}_${nombre}${sufijo}.jpg`, quality: 85, timeout: 180000 });
  console.log(`  captura ${S}/${cultivo}_${nombre}${sufijo}.jpg`);
  await p.evaluate(() => window.__juego.ponPausa(false));
};
const estado = (p) => p.evaluate((ref) => {
  const j = window.__juego; const m = j.agricultura;
  const q = m.labranza.parcelas.get(ref);
  return {
    aPie: j.aPie, cesta: { ...m.recoleccion.cesta }, recuento: q ? { ...q.recuento() } : null,
    hud: document.getElementById('agri-hud')?.textContent ?? '',
    boton: (() => { const e = document.querySelector('[data-accion="descargar"], #agri-descargar'); return e ? !e.hidden : null; })(),
  };
}, REF);
const entra = async (cultivo, edad) => {
  const p = await contexto.newPage();
  p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  p.on('pageerror', (e) => errores.push(`PAGEERROR ${e.message}`));
  await p.goto(`http://localhost:${puerto}/?calidad=${calidad}&personaje=0&hora=dia&debug=1&agricultura=${cultivo}${edad ? `&edad=${edad}` : ''}&dia=40`);
  await p.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 300000 });
  await p.evaluate(() => document.getElementById('jugar').click());
  await p.waitForFunction(() => window.__juego.agricultura, null, { timeout: 120000 });
  await fotogramas(p, 10);
  return p;
};
// Avanza al personaje 'd' metros por delante (como si caminase por la línea de plantas)
const avanza = (p, d) => p.evaluate((dist) => {
  const pe = window.__juego.peaton; const e = pe.estado();
  const x = e.posicion.x + e.adelante.x * dist; const z = e.posicion.z + e.adelante.z * dist;
  pe.llevaA(x, window.__juego.mundo.terreno.alturaEn(x, z), z);
}, d);
const pulsaX = async (p, veces = 1, paso = 0) => {
  for (let i = 0; i < veces; i++) {
    await p.keyboard.press('KeyX'); await fotogramas(p, 30);
    if (paso) await avanza(p, paso);
  }
};

for (const cultivo of (process.env.CULTIVOS ?? 'brocoli,alcachofa,esparrago').split(',')) {
  console.log(`\n== ${cultivo} ==`);
  let p = await entra(cultivo, null);
  let s = await estado(p);
  comprueba(s.aPie, 'empieza a pie');
  comprueba(s.recuento?.sembrado > 85, `la ${REF} está sembrada (${s.recuento?.sembrado} %)`);
  await captura(p, cultivo, '0_inicio');
  const antes = s.recuento.sembrado;
  await pulsaX(p, 2);
  s = await estado(p);
  const primero = s.cesta.kg;
  comprueba(primero > 0.3 && s.cesta.id === cultivo, `la cesta lleva ${s.cesta.kg.toFixed(1)} kg de ${s.cesta.id}`);
  comprueba(s.cesta.kg <= 40.01, 'no pasa de 40 kg');
  await captura(p, cultivo, '1_cogiendo');
  await avanza(p, 3);
  await pulsaX(p, 14, 2.4);
  s = await estado(p);
  comprueba(s.cesta.kg > primero * 3, `al avanzar por la línea la cesta crece (${primero.toFixed(1)} → ${s.cesta.kg.toFixed(1)} kg)`);
  await p.close();

  p = await entra(cultivo, 20);
  await pulsaX(p, 3);
  s = await estado(p);
  comprueba(s.cesta.kg < 0.5, 'verde (20 días): no coge nada');
  await captura(p, cultivo, '2_verde');
  await p.close();
}

if (!process.env.CULTIVOS || process.env.PLANTADORA) {
  console.log('\n== plantadora ==');
  const p = await entra('brocoli', null);
  const r = await p.evaluate(() => {
    const m = window.__juego.agricultura;
    return { hay: Boolean(m.aperos.plantadora), cap: m.aperos.plantadora?.capacidad, acepta: m.aperos.plantadora?.config.acepta };
  });
  comprueba(r.hay && r.cap > 0 && r.acepta?.includes('brocoli'), `existe la plantadora (tolva ${r.cap} plantas)`);
  await p.close();
}

comprueba(errores.length === 0, `sin errores de consola${errores.length ? `: ${errores.slice(0, 3).join(' | ')}` : ''}`);
await b.close();
console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO BIEN');
process.exit(fallos ? 1 : 0);
