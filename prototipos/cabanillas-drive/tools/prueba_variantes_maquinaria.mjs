// Comprueba en navegador el catálogo de maquinaria, la selección dinámica y el traslado de aperos.
// Uso: node tools/prueba_variantes_maquinaria.mjs [bajo|medio|alto]
import { createRequire } from 'node:module';
const requiere = createRequire(process.env.PLAYWRIGHT_RAIZ ? `${process.env.PLAYWRIGHT_RAIZ}/` : import.meta.url);
const { chromium } = requiere('playwright');
const calidad = process.argv[2] ?? 'bajo';
const puerto = process.env.PUERTO ?? '5173';
const b = await chromium.launch({ channel: process.env.CANAL, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1100, height: 620 } });
const errores = [];
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
p.on('pageerror', (e) => errores.push(`PAGEERROR ${e.message}`));
const fotogramas = (n = 8) => p.evaluate((k) => new Promise((r) => {
  let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);
const exige = (condicion, mensaje) => { if (!condicion) throw new Error(mensaje); console.log(`  bien  ${mensaje}`); };
const pulsa = async (texto) => {
  const pulsado = await p.evaluate((t) => {
    const b = [...document.querySelectorAll('#menu-cope button')].find((x) => x.textContent.includes(t));
    if (!b) return false;
    b.click();
    return true;
  }, texto);
  exige(pulsado, `aparece la opción «${texto}»`);
  await fotogramas();
};

try {
  await p.goto(`http://localhost:${puerto}/?calidad=${calidad}&personaje=0&hora=dia&debug=1&agricultura`);
  await p.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 300000 });
  await p.evaluate(() => document.getElementById('jugar').click());
  await p.waitForFunction(() => window.__juego.agricultura, null, { timeout: 120000 });
  await p.evaluate(() => window.__juego.agricultura.entra());

  const catalogo = await p.evaluate(() => [...document.querySelectorAll('#menu-cope button')].map((x) => x.textContent));
  for (const nombre of ['Fendt 516 Vario', 'John Deere 6R 250', 'New Holland T7.300', 'Case IH Magnum 400',
    'New Holland CX7.90', 'CLAAS LEXION 7700']) {
    exige(catalogo.some((x) => x.includes(nombre)), `el menú ofrece ${nombre}`);
  }
  const aperoSeleccionado = await p.evaluate(() => {
    const etiqueta = [...document.querySelectorAll('#menu-cope label')].find((x) => x.textContent.includes('Cultivador'));
    if (!etiqueta) return false;
    etiqueta.querySelector('input').click();
    return true;
  });
  exige(aperoSeleccionado, 'se puede elegir el cultivador para el tractor');
  await pulsa('Coger Fendt 516 Vario');
  let estado = await p.evaluate(() => {
    const j = window.__juego; const m = j.agricultura;
    return { modelo: m.tractor.config.modelo, activo: j.coche === m.tractor, apero: m.enganche.apero?.id };
  });
  exige(estado.modelo === 'tractor_fendt_516' && estado.activo && estado.apero === 'cultivador',
    'selecciona el Fendt y engancha el cultivador al vehículo activo');

  await p.evaluate(() => { window.__engancheFendt = window.__juego.agricultura.enganche; });
  await p.evaluate(() => window.__juego.agricultura.entra());
  await pulsa('Cambiar a Case IH Magnum 400');
  estado = await p.evaluate(() => {
    const j = window.__juego; const m = j.agricultura;
    return { modelo: m.tractor.config.modelo, activo: j.coche === m.tractor, apero: m.enganche.apero?.id };
  });
  exige(estado.modelo === 'tractor_case_magnum_400' && estado.activo && estado.apero === 'cultivador',
    'cambia al Case IH conservando el apero');
  exige(await p.evaluate(() => window.__engancheFendt.apero === null), 'el apero deja de estar enlazado al tractor anterior');

  await p.evaluate(() => window.__juego.agricultura.dejaTractor());
  await fotogramas();
  await p.evaluate(() => window.__juego.agricultura.entra());
  await pulsa('Coger CLAAS LEXION 7700');
  estado = await p.evaluate(() => {
    const j = window.__juego; const m = j.agricultura;
    return { modelo: m.cosechadora.maquina.config.modelo, activo: j.coche === m.cosechadora.maquina,
      actual: j.coche.config.modelo, menuVisible: !document.getElementById('menu-cope').hidden };
  });
  exige(estado.modelo === 'cosechadora_claas_lexion7700' && estado.activo, 'selecciona y conduce la CLAAS LEXION 7700');
  await p.evaluate(() => window.__juego.agricultura.entra());
  await pulsa('Cambiar a New Holland CX7.90');
  estado = await p.evaluate(() => {
    const j = window.__juego; const m = j.agricultura;
    return { modelo: m.cosechadora.maquina.config.modelo, activo: j.coche === m.cosechadora.maquina };
  });
  exige(estado.modelo === 'cosechadora_nh_cx790' && estado.activo, 'cambia y conduce la New Holland CX7.90');
  exige(errores.length === 0, `sin errores de consola${errores.length ? `: ${errores.join(' | ')}` : ''}`);
} finally {
  await b.close();
}
