// Prueba de la fase A9 del modo agricultura (PLAN_AGRICULTURA.md): ciclo completo, dinero y guardado.
//   1. Partida nueva: 3 000 €, sin parcelas; el menú de la COPE enseña el dinero y los precios.
//   2. Llenar las tolvas de la abonadora y la sembradora cuesta (kg × precio); sin dinero, solo lo que llega.
//   3. Labrar, abonar y sembrar la 2-700 (el pincel con las mismas labores que los aperos), regarla
//      (tajaderas abiertas y agua en la simulación), pasar días hasta que madure: porcentajes del panel,
//      avisos («pide agua», «ya está maduro») y estado en el menú («Tus parcelas»).
//   4. Cosechar de verdad con la cosechadora (una pasada), descargar la tolva en la COPE y vender:
//      el dinero sube kg × precio de venta.
//   5. Guardado: la partida se escribe sola en localStorage (pocos KB); al recargar la página vuelve el
//      día, el dinero, el grano, la parcela con sus porcentajes y lo sembrado.
//   6. Un escenario de pruebas (?agricultura=cosecha) ni carga ni guarda la partida.
//   7. Minimapa: la capa de parcelas está puesta y el menú y el panel enseñan SIGPAC y regadío.
//   8. Sin errores de consola.
// Uso: node tools/prueba_agricultura.mjs <carpeta de capturas> [bajo|medio|alto] [movil]
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
const opciones = movil
  ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }
  : { viewport: { width: 1100, height: 620 } };
const contexto = await b.newContext(opciones);
let fallos = 0;
const comprueba = (ok, texto) => { console.log(`  ${ok ? 'bien ' : 'FALLO'}  ${texto}`); if (!ok) fallos++; };
const errores = [];
const sufijo = `${movil ? '_movil' : ''}_${calidad}`;
const fotogramas = (p, n = 3) => p.evaluate((k) => new Promise((r) => {
  let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);
const captura = async (p, nombre) => {
  await fotogramas(p, 3);
  await p.screenshot({ path: `${S}/agri_${nombre}${sufijo}.jpg`, quality: 85, timeout: 180000 });
  console.log(`  captura ${S}/agri_${nombre}${sufijo}.jpg`);
};
const vista = async (p, nombre) => {
  await p.evaluate(() => window.__juego.ponPausa(true));
  await fotogramas(p, 45);
  await captura(p, nombre);
  await p.evaluate(() => window.__juego.ponPausa(false));
};
const abre = async (p, url) => {
  p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  p.on('pageerror', (e) => errores.push(`PAGEERROR ${e.message}`));
  await p.goto(url);
  await p.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 300000 });
  await p.evaluate(() => document.getElementById('jugar').click());
  await p.waitForFunction(() => window.__juego.agricultura, null, { timeout: 120000 });
  await fotogramas(p, 10);
};
const URL = `http://localhost:${puerto}/?calidad=${calidad}&personaje=0&hora=dia&debug=1&agricultura`;
const menuTexto = async (p) => {
  await p.evaluate(() => window.__juego.agricultura.entra());
  await fotogramas(p, 3);
  return p.evaluate(() => document.getElementById('menu-cope').innerText);
};
const cierraMenu = (p) => p.evaluate(() => { document.getElementById('menu-cope').hidden = true; });
const num = (t) => Number.parseInt(String(t).replace(/\./g, ''), 10);

const p = await contexto.newPage();
await abre(p, URL);

// --- 1. Partida nueva
let m = await p.evaluate(() => { const a = window.__juego.agricultura; return { dinero: a.economia.dinero, parcelas: a.labranza.parcelas.size, guarda: a.guardaActivo, dia: a.reloj.dia }; });
comprueba(m.dinero === 3000 && m.parcelas === 0 && m.guarda, `partida nueva: ${m.dinero} €, ${m.parcelas} parcelas, el guardado está activo (día ${m.dia})`);
let texto = await menuTexto(p);
comprueba(/Tienes 3\.?000 €/.test(texto) && /semilla 0,45 €\/kg/.test(texto), `el menú de la COPE enseña el dinero y los precios («${texto.split('\n').filter((l) => /Tienes|semilla/.test(l)).join(' ').slice(0, 90)}»)`);
comprueba(/La partida se guarda sola/.test(texto), 'el menú avisa de que la partida se guarda sola');
await vista(p, '1_menu');
await cierraMenu(p);

// --- 2. Comprar: llenar tolvas
m = await p.evaluate(() => {
  const a = window.__juego.agricultura;
  const d0 = a.economia.dinero;
  a.engancha('abonadora', false);
  const d1 = a.economia.dinero; const k1 = a.aperos.abonadora.carga;
  a.engancha('sembradora', false);
  const d2 = a.economia.dinero; const k2 = a.aperos.sembradora.carga;
  // Sin dinero llena lo que llega
  const guardo = a.economia.dinero;
  a.economia.dinero = 45;
  a.aperos.sembradora.gasta(400);
  a.llenaTolva(undefined, true);
  const parcial = { carga: a.aperos.sembradora.carga, dinero: a.economia.dinero };
  a.economia.dinero = guardo;
  a.aperos.sembradora.carga = 400; a.aperos.sembradora.pintaCarga();
  return { d0, d1, d2, k1, k2, parcial };
});
comprueba(Math.abs((m.d0 - m.d1) - m.k1 * 0.45) < 0.01 && m.k1 === 800, `la tolva de abono (${m.k1} kg) cuesta ${(m.d0 - m.d1).toFixed(0)} € (0,45 €/kg)`);
comprueba(Math.abs((m.d1 - m.d2) - m.k2 * 0.45) < 0.01 && m.k2 === 400, `la de semilla de trigo (${m.k2} kg) cuesta ${(m.d1 - m.d2).toFixed(0)} €`);
comprueba(Math.abs(m.parcial.carga - 100) < 0.5 && m.parcial.dinero < 0.01, `con 45 € solo se compran ${m.parcial.carga.toFixed(0)} kg de semilla y se queda sin dinero`);

// --- 3. Ciclo en la parcela: labrar, abonar, sembrar, regar, pasar días
const geo = await p.evaluate(async (ref) => {
  const a = window.__juego.agricultura;
  const { pinta } = await import('/src/agricultura/pincel.js');
  const info = a.registro.porRef(ref);
  const q = a.labranza.activa(info);
  const r = ((info.labor_grados ?? 0) * Math.PI) / 180;
  const e = [Math.sin(r), -Math.cos(r)]; const n = [-e[1], e[0]];
  const [cx, cz] = info.centro;
  const byte = a.reloj.byte;
  for (let t = -80; t <= 80; t += 2.5) {
    const xa = cx - e[0] * 300 + n[0] * t; const za = cz - e[1] * 300 + n[1] * t;
    const xb = cx + e[0] * 300 + n[0] * t; const zb = cz + e[1] * 300 + n[1] * t;
    pinta(q, 'arar', xa, za, xb, zb, 3);
    pinta(q, 'gradear', xa, za, xb, zb, 3);
    pinta(q, 'abonar', xa, za, xb, zb, 3);
    pinta(q, 'sembrar', xa, za, xb, zb, 3, { dia: byte });
  }
  q.siembra = { cultivo: 'trigo', primerDia: a.reloj.dia, ultimoDia: a.reloj.dia };
  q.sube(performance.now(), true);
  return { e, n, c: [cx, cz], sembrado: q.recuento() };
}, REF);
comprueba(geo.sembrado.gradeado > 85 && geo.sembrado.abonado > 85 && geo.sembrado.sembrado > 85,
  `la ${REF} queda labrada ${geo.sembrado.gradeado} %, abonada ${geo.sembrado.abonado} % y sembrada ${geo.sembrado.sembrado} %`);
// Riego: tajaderas abiertas, agua en la simulación y luego se mete en el suelo
const riego = await p.evaluate((ref) => {
  const a = window.__juego.agricultura;
  a.riego.actualiza(0.02);
  const s = a.riego.sitios.get(ref);
  if (!s) return { hay: false };
  a.riego.alterna(ref, 0, true); a.riego.alterna(ref, 1, true);
  a.riego.simula(2400);
  const cubierto = a.riego.estado(ref)?.cubierto ?? 0;
  a.riego.alterna(ref, 0, false); a.riego.alterna(ref, 1, false);
  a.riego.simula(6 * 3600); a.riego.resuelve();
  return { hay: true, cubierto, regado: a.labranza.parcelas.get(ref).recuento().regado };
}, REF);
comprueba(riego.hay && riego.cubierto > 0.9 && riego.regado > 60, `riego: el agua cubre el ${(riego.cubierto * 100).toFixed(0)} % y el suelo queda regado en el ${riego.regado} %`);
// A mitad de ciclo, sin agua nueva: el suelo se seca y avisa
await p.evaluate(() => window.__juego.agricultura.pasaDias(60));
await p.evaluate((g) => {
  const a = window.__juego.agricultura; const t = a.terreno ?? window.__juego.mundo.terreno;
  a.cogeTractor(0, null);
  const [cx, cz] = g.c;
  const y = t.alturaEn(cx, cz) + 1.6;
  a.tractor.recoloca(cx, y, cz, g.e[0], g.e[1]);
}, geo);
let aviso = '';
for (let i = 0; i < 120 && !/pide agua/.test(aviso); i += 4) { await fotogramas(p, 4); aviso = await p.evaluate(() => window.__juego.ultimoAviso); }
comprueba(/pide agua/.test(aviso), `con la parcela seca avisa: «${aviso}»`);
await captura(p, '2_pide_agua');
// Hasta que madure: aviso del día
await p.evaluate(() => window.__juego.agricultura.pasaDias(100));
await p.evaluate(() => window.__juego.agricultura.pasaDias(70));
await fotogramas(p, 3);
aviso = await p.evaluate(() => window.__juego.ultimoAviso);
const dia = await p.evaluate(() => window.__juego.agricultura.reloj.dia);
comprueba(/maduro/.test(aviso), `el día ${dia} avisa de que ha madurado: «${aviso}»`);
texto = await menuTexto(p);
comprueba(/Tus parcelas/.test(texto) && new RegExp(`${REF}.*madura`, 's').test(texto), 'el menú enseña «Tus parcelas» con la 2-700 madura');
await vista(p, '3_menu_parcelas');
await cierraMenu(p);
// Panel con el uso SIGPAC
for (let i = 0; i < 40; i += 4) { await fotogramas(p, 4); }
const panel = await p.evaluate(() => document.getElementById('agri-hud')?.textContent ?? '');
comprueba(/SIGPAC/.test(panel) && /(regadío|secano)/.test(panel), `el panel de la parcela enseña SIGPAC y regadío/secano («${panel.slice(0, 140)}»)`);
await vista(p, '4_panel_minimapa');

// --- 4. Cosecha de verdad y venta
const cosecha = await p.evaluate(async ({ ref, e }) => {
  const a = window.__juego.agricultura;
  const info = a.registro.porRef(ref);
  const [cx, cz] = info.centro;
  const anillo = info.partes[0][0];
  const dentro = (x, z) => {
    let c = false;
    for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
      if ((anillo[i][1] > z) !== (anillo[j][1] > z) && x < ((anillo[j][0] - anillo[i][0]) * (z - anillo[i][1])) / (anillo[j][1] - anillo[i][1]) + anillo[i][0]) c = !c;
    }
    return c;
  };
  let min = 0;
  for (let sv = -300; sv <= 0; sv += 0.5) if (dentro(cx + e[0] * sv, cz + e[1] * sv)) { min = sv; break; }
  a.cogeCosechadora();
  const rumbo = (Math.atan2(e[0], -e[1]) * 180) / Math.PI;
  const r = (rumbo * Math.PI) / 180;
  const c = a.cosechadora.maquina;
  const { alturaLibre, altoCaja } = c.config.chasis;
  const x = cx + e[0] * (min + 5.5); const z = cz + e[1] * (min + 5.5);
  c.recoloca(x, window.__juego.mundo.terreno.alturaEn(x, z) + alturaLibre + altoCaja / 2 + 0.12, z, Math.sin(r), -Math.cos(r));
  return { x, z };
}, { ref: REF, e: geo.e });
await fotogramas(p, 20);
await p.evaluate(() => window.__juego.agricultura.cosechadora.ponCabezal(true));
await p.waitForFunction(() => window.__juego.agricultura.cosechadora.subida < 0.05, null, { timeout: 120000 });
await p.keyboard.down('KeyW');
let s = null;
for (let i = 0; i < 2000; i += 4) {
  await fotogramas(p, 4);
  s = await p.evaluate((c0) => {
    const a = window.__juego.agricultura; const c = a.cosechadora; const e = c.maquina.estado();
    return { d: Math.hypot(e.posicion.x - c0.x, e.posicion.z - c0.z), tolva: c.tolvaKg, segando: c.segando };
  }, cosecha);
  if (s.d > 40) break;
}
await captura(p, '5_cosechando');
await p.keyboard.up('KeyW');
await fotogramas(p, 30);
const kgTolva = await p.evaluate(() => window.__juego.agricultura.cosechadora.tolvaKg);
comprueba(s.d > 30 && kgTolva > 100 && kgTolva < 400, `la cosechadora siega ${s.d.toFixed(0)} m y lleva ${kgTolva.toFixed(0)} kg de trigo en la tolva (~${((kgTolva / (s.d * 5.4)) * 10000).toFixed(0)} kg/ha)`);
const venta = await p.evaluate(async () => {
  const a = window.__juego.agricultura;
  await a.entra();
  const d0 = a.economia.dinero;
  const kg = a.cosechadora.tolvaKg;
  // El botón de descargar la tolva y luego el de vender, tal cual los pulsa el jugador
  [...document.querySelectorAll('#menu-cope button')].find((x) => /Descargar la tolva/.test(x.textContent)).click();
  await new Promise((r) => setTimeout(r, 100));
  const grano = { ...a.granero };
  await a.entra();
  const botones = [...document.querySelectorAll('#menu-cope button')].map((x) => x.textContent);
  [...document.querySelectorAll('#menu-cope button')].find((x) => /Vender/.test(x.textContent)).click();
  return { d0, d1: a.economia.dinero, kg, grano, botones, quedaGrano: a.granero.trigo };
});
comprueba(Math.abs(venta.grano.trigo - venta.kg) < 1, `descargar la tolva en la COPE apunta ${venta.grano.trigo.toFixed(0)} kg de trigo entregados`);
comprueba(venta.botones.some((x) => /Vender .* kg de trigo/.test(x)), `aparece el botón «${venta.botones.find((x) => /Vender/.test(x))?.replace(/\s+/g, ' ')}»`);
comprueba(Math.abs((venta.d1 - venta.d0) - venta.kg * 0.25) < 0.5 && venta.quedaGrano === 0,
  `vender ${venta.kg.toFixed(0)} kg de trigo da ${(venta.d1 - venta.d0).toFixed(0)} € (0,25 €/kg) y vacía el granero`);
await cierraMenu(p);

// --- 5. Guardado y carga
const antes = await p.evaluate((ref) => {
  const a = window.__juego.agricultura;
  const q = a.labranza.parcelas.get(ref);
  a.guarda(true);
  const claves = Object.keys(localStorage).filter((k) => k.startsWith('cabdrive.agricultura.partida') || k.startsWith('cabdrive.agricultura.parcela'));
  const bytes = claves.reduce((n, k) => n + k.length + localStorage.getItem(k).length, 0);
  return { dia: a.reloj.dia, dinero: a.economia.dinero, granero: { ...a.granero }, recuento: { ...q.recuento() }, siembra: q.siembra, claves, bytes, mpp: q.mpp, ancho: q.ancho, alto: q.alto };
}, REF);
comprueba(antes.claves.length === 2 && antes.bytes < 120000,
  `guarda ${antes.claves.length} claves en localStorage (${(antes.bytes / 1024).toFixed(1)} KB para una máscara de ${antes.ancho}×${antes.alto})`);
await p.reload();
await p.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 300000 });
await p.evaluate(() => document.getElementById('jugar').click());
await p.waitForFunction(() => window.__juego.agricultura, null, { timeout: 120000 });
await fotogramas(p, 10);
const despues = await p.evaluate((ref) => {
  const a = window.__juego.agricultura;
  const q = a.labranza.parcelas.get(ref);
  return { dia: a.reloj.dia, dinero: a.economia.dinero, granero: { ...a.granero }, recuento: q ? { ...q.recuento() } : null, siembra: q?.siembra ?? null };
}, REF);
comprueba(despues.dia === antes.dia && Math.abs(despues.dinero - antes.dinero) < 0.01, `al recargar vuelve el día ${despues.dia} y el dinero (${despues.dinero.toFixed(0)} €)`);
comprueba(despues.recuento && JSON.stringify(despues.recuento) === JSON.stringify(antes.recuento) && despues.siembra?.cultivo === 'trigo',
  `la ${REF} vuelve igual: sembrada ${despues.recuento?.sembrado} %, cosechada ${despues.recuento?.cosechado} %, abonada ${despues.recuento?.abonado} % (${despues.siembra?.cultivo})`);
// El minimapa lleva la capa de parcelas
const capa = await p.evaluate(async () => {
  const { capaMinimapa } = await import('/src/hud/minimapa.js');
  return typeof capaMinimapa.dibuja === 'function';
});
comprueba(capa, 'el minimapa tiene la capa de parcelas');
// Coloca el tractor sobre la parcela guardada para ver el mapa con su estado
await p.evaluate((g) => {
  const a = window.__juego.agricultura;
  a.cogeTractor(0, null);
  const [cx, cz] = g.c;
  a.tractor.recoloca(cx, window.__juego.mundo.terreno.alturaEn(cx, cz) + 1.6, cz, g.e[0], g.e[1]);
}, geo);
await fotogramas(p, 30);
await vista(p, '6_recargada_minimapa');

// --- 6. Un escenario de pruebas no guarda ni carga
const p2 = await (await b.newContext(opciones)).newPage();
await abre(p2, `${URL}=cosecha`);
await fotogramas(p2, 30);
const esc = await p2.evaluate(() => {
  const a = window.__juego.agricultura;
  a.guarda(true);
  return { guarda: a.guardaActivo, claves: Object.keys(localStorage).filter((k) => k.startsWith('cabdrive.agricultura.partida') || k.startsWith('cabdrive.agricultura.parcela')) };
});
comprueba(!esc.guarda && esc.claves.length === 0, '?agricultura=cosecha ni carga ni guarda la partida');

console.log(errores.length ? `errores de consola:\n${errores.join('\n')}` : 'sin errores de consola');
comprueba(errores.length === 0, 'sin errores de consola');
await b.close();
console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO BIEN');
process.exit(fallos ? 1 : 0);
