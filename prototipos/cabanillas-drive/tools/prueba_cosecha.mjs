// Prueba de la fase A8 del modo agricultura (PLAN_AGRICULTURA.md): cosecha.
//   1. ?agricultura=cosecha empieza en la cosechadora, dentro de la 2-700 sembrada de trigo maduro, y
//      con el tractor y el remolque de grano junto a la entrada.
//   2. Q (o ⬇) baja el cabezal: el molinete gira y la velocidad se limita.
//   3. Una pasada de verdad (W): siega por donde pasa el cabezal (5,4 m), deja rastrojo, el grano va a
//      la tolva según el rendimiento (kg/ha ≈ el del trigo por el vigor de la tierra) y lo verde que se
//      encuentra (una franja sembrada hoy) no lo corta.
//   4. X (o 🌾) saca el tubo; sin remolque debajo no descarga; con el remolque debajo, el grano pasa
//      de la tolva al remolque (lo que sale es lo que entra) y el montón del remolque sube.
//   5. Bajarse de la cosechadora y subir al tractor que está al lado.
//   6. Menú de la COPE con la cosechadora: descargar la tolva (queda apuntado lo entregado).
//   7. Sin errores de consola.
// Uso: node tools/prueba_cosecha.mjs <carpeta de capturas> [bajo|medio|alto] [movil]
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
const captura = async (p, nombre) => {
  await fotogramas(p, 3);
  await p.screenshot({ path: `${S}/cosecha_${nombre}${sufijo}.jpg`, quality: 85, timeout: 180000 });
  console.log(`  captura ${S}/cosecha_${nombre}${sufijo}.jpg`);
};
const vista = async (p, nombre) => {
  await p.evaluate(() => window.__juego.ponPausa(true));
  await fotogramas(p, 45);
  await captura(p, nombre);
  await p.evaluate(() => window.__juego.ponPausa(false));
};
const pulsa = async (p, accion, tecla) => {
  if (movil) await p.locator(`[data-pulsar="${accion}"]`).dispatchEvent('pointerdown');
  else await p.keyboard.press(tecla);
  await fotogramas(p, 2);
};
const estado = (p) => p.evaluate((ref) => {
  const j = window.__juego; const m = j.agricultura; const c = m.cosechadora;
  const e = c.maquina.estado();
  const q = m.labranza.parcelas.get(ref);
  const r = q?.recuento();
  const rem = m.aperos.remolque;
  return {
    enCosechadora: j.coche === c.maquina, enTractor: j.coche === m.tractor,
    x: e.posicion.x, z: e.posicion.z, kmh: e.velocidadKmh,
    bajado: c.cabezalBajado, subida: c.subida, giroTubo: c.giroTubo, tolva: c.tolvaKg, capacidad: c.capacidadKg,
    segando: c.segando, verdes: c.verdes, total: { ...c.total }, rendimiento: c.rendimiento,
    vmax: c.maquina.config.motor.velocidadMaxKmh,
    molinete: c.maquina.piezas.molinete?.rotation.x ?? 0,
    cabezal: c.maquina.piezas.cabezal?.rotation.x ?? 0,
    recuento: r ? { ...r } : null,
    remolque: { carga: rem.carga, capacidad: rem.capacidad, enganchado: m.enganche.apero === rem, cargaY: rem.modelo.getObjectByName('carga')?.position.y },
    hud: document.getElementById('agri-hud')?.hidden === false ? document.getElementById('agri-hud').textContent : '',
    botones: { apero: document.querySelector('[data-pulsar="apero"]')?.hidden === false, descargar: document.querySelector('[data-pulsar="descargar"]')?.hidden === false },
    aviso: j.ultimoAviso ?? '',
  };
}, REF);
async function hasta(p, condicion, maxFotogramas = 400) {
  let s;
  for (let i = 0; i < maxFotogramas; i += 4) {
    await fotogramas(p, 4);
    s = await estado(p);
    if (condicion(s)) return s;
  }
  return s;
}

const p = await contexto.newPage();
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
p.on('pageerror', (e) => errores.push(`PAGEERROR ${e.message}`));
await p.goto(`http://localhost:${puerto}/?calidad=${calidad}&personaje=0&hora=dia&debug=1&agricultura=cosecha&dia=40`);
await p.waitForFunction(() => window.__juego && !document.getElementById('jugar').hidden, null, { timeout: 300000 });
await p.evaluate(() => document.getElementById('jugar').click());
await p.waitForFunction(() => window.__juego.agricultura, null, { timeout: 120000 });
await fotogramas(p, 10);

// --- 1. Arranque
let s = await estado(p);
const piezas = await p.evaluate(() => Object.keys(window.__juego.agricultura.cosechadora.maquina.piezas));
comprueba(s.enCosechadora && ['cabezal', 'molinete', 'tubo_descarga', 'carga'].every((x) => piezas.includes(x)),
  `?agricultura=cosecha empieza en la cosechadora (piezas que se mueven: ${piezas.join(', ')})`);
comprueba(s.recuento?.sembrado > 85 && /Madura/.test(s.hud), `la ${REF} está sembrada de trigo maduro (${s.recuento?.sembrado} %; panel: «${s.hud.slice(0, 90)}…»)`);
comprueba(s.remolque.enganchado, 'el tractor espera con el remolque de grano enganchado');
if (movil) comprueba(s.botones.apero && s.botones.descargar, 'en el móvil salen los botones ⬇ (cabezal) y 🌾 (tubo)');
await captura(p, '0_inicio');
await vista(p, '0_inicio_vista');

// Lo que se va a segar: el carril de la cosechadora hacia delante. Una franja verde (sembrada hoy)
// a unos 22 m, de lado a lado del carril
const datos = await p.evaluate(async (ref) => {
  const m = window.__juego.agricultura;
  const { pinta } = await import('/src/agricultura/pincel.js');
  const e = m.cosechadora.maquina.estado();
  const f = e.adelante.clone().setY(0).normalize();
  const q = m.labranza.parcelas.get(ref);
  const cx = e.posicion.x + f.x * 26; const cz = e.posicion.z + f.z * 26;
  // Franja de 3 m a lo ancho del carril (perpendicular a la marcha), sembrada hoy
  pinta(q, 'sembrar', cx - f.z * 6, cz + f.x * 6, cx + f.z * 6, cz - f.x * 6, 3, { dia: m.reloj.byte });
  q.sube(performance.now(), true);
  return { f: [f.x, f.z], verde: [cx, cz], x0: e.posicion.x, z0: e.posicion.z };
}, REF);

// --- 2. Cabezal abajo
await pulsa(p, 'apero', 'KeyQ');
s = await hasta(p, (x) => x.subida < 0.05, 200);
const mol0 = s.molinete;
await fotogramas(p, 6);
s = await estado(p);
comprueba(s.bajado && s.subida < 0.05 && Math.abs(s.molinete - mol0) > 0.05 && s.vmax <= 8,
  `${movil ? '⬇' : 'Q'} baja el cabezal (gira ${(s.cabezal).toFixed(2)} rad), el molinete gira y la velocidad se limita a ${s.vmax} km/h`);

// --- 3. Una pasada
await p.keyboard.down('KeyW');
let maxKmh = 0; let vioVerde = false; let segaba = false;
s = await hasta(p, (x) => {
  maxKmh = Math.max(maxKmh, x.kmh);
  vioVerde ||= x.verdes;
  segaba ||= x.segando;
  return Math.hypot(x.x - datos.x0, x.z - datos.z0) > 36;
}, 3000);
await captura(p, '1_segando');
await p.keyboard.up('KeyW');
s = await hasta(p, (x) => Math.abs(x.kmh) < 0.3, 300);
const recorrido = Math.hypot(s.x - datos.x0, s.z - datos.z0);
comprueba(segaba && s.total.m2 > 0, `siega al avanzar (${recorrido.toFixed(0)} m, como mucho ${maxKmh.toFixed(1)} km/h)`);
// Lo segado más la franja verde que deja (3 m), por lo recorrido: el ancho del cabezal (5,4 m, menos el borde suave)
const anchoEfectivo = (s.total.m2 + 3 * 5.4) / Math.max(1, recorrido);
comprueba(anchoEfectivo > 4.6 && anchoEfectivo < 5.6, `la franja segada tiene el ancho del cabezal (${s.total.m2.toFixed(0)} m² en ${recorrido.toFixed(0)} m: ${anchoEfectivo.toFixed(1)} m)`);
const kgHa = (s.total.kg / s.total.m2) * 10000;
comprueba(kgHa > 5800 && kgHa < 7800 && Math.abs(s.tolva - s.total.kg) < 1,
  `el grano va a la tolva: ${s.tolva.toFixed(0)} kg, ${kgHa.toFixed(0)} kg/ha (trigo 6 500 por el vigor de la tierra preparada y abonada)`);
const tras = await p.evaluate(({ ref, verde, f }) => {
  const m = window.__juego.agricultura;
  const q = m.labranza.parcelas.get(ref);
  const pix = (x, z) => {
    const i = Math.floor((x - q.ox) / q.mpp); const j = Math.floor((z - q.oz) / q.mpp);
    const k = (j * q.ancho + i) * 4;
    return { sembrado: q.cultivo[k + 1], cosechado: q.cultivo[k + 2] };
  };
  const e = m.cosechadora.maquina.estado();
  // Detrás de la cosechadora (ya segado) y en la franja verde
  const atras = pix(e.posicion.x - f[0] * 5, e.posicion.z - f[1] * 5);
  const enVerde = pix(verde[0], verde[1]);
  // Al lado del carril (sin segar)
  const lado = pix(e.posicion.x - f[0] * 12 - f[1] * 5, e.posicion.z - f[1] * 12 + f[0] * 5);
  return { atras, enVerde, lado };
}, { ...datos, ref: REF });
comprueba(tras.atras.sembrado === 0 && tras.atras.cosechado === 255, 'detrás queda rastrojo (cosechado)');
comprueba(tras.lado.sembrado > 0, 'al lado del carril el trigo sigue en pie');
comprueba(vioVerde && tras.enVerde.sembrado > 0, 'lo verde (la franja sembrada hoy) no lo siega');
await vista(p, '2_escalon_vista');

// --- 4. Tubo y descarga
await p.evaluate(() => window.__juego.agricultura.cosechadora.llenaPara(3200, 'trigo'));
await pulsa(p, 'descargar', 'KeyX');
s = await hasta(p, (x) => x.giroTubo > 0.99, 400);
await fotogramas(p, 6);
const sinRem = await estado(p);
comprueba(sinRem.giroTubo > 0.99 && Math.abs(sinRem.tolva - 3200) < 1, `${movil ? '🌾' : 'X'} saca el tubo; sin remolque debajo no sale grano`);
// Lleva la cosechadora junto al remolque: el tubo, sobre el centro de la caja
await p.evaluate(() => {
  const j = window.__juego; const m = j.agricultura; const c = m.cosechadora;
  const rem = m.aperos.remolque;
  const caja = rem.info.caja;
  for (let k = 0; k < 2; k++) {
    rem.modelo.updateWorldMatrix(true, false);
    const centro = rem.modelo.localToWorld(new (rem.objeto.position.constructor)(caja.centro[0], caja.centro[1], caja.centro[2]));
    const s2 = c.salidaTubo();
    const e = c.maquina.estado();
    const x = e.posicion.x + centro.x - s2.x; const z = e.posicion.z + centro.z - s2.z;
    const { alturaLibre, altoCaja } = c.maquina.config.chasis;
    c.maquina.recoloca(x, j.mundo.terreno.alturaEn(x, z) + alturaLibre + altoCaja / 2 + 0.12, z, e.adelante.x, e.adelante.z);
  }
});
s = await hasta(p, (x) => Math.abs(x.kmh) < 0.2, 100);
const antes = await estado(p);
s = await hasta(p, (x) => x.tolva < antes.tolva - 200, 1200);
await captura(p, '3_descarga');
await vista(p, '3_descarga_vista');
s = await estado(p);
const sale = antes.tolva - s.tolva;
const entra = s.remolque.carga - antes.remolque.carga;
comprueba(sale > 100 && Math.abs(sale - entra) < 1, `con el remolque debajo descarga: sale ${sale.toFixed(0)} kg de la tolva y entran ${entra.toFixed(0)} en el remolque`);
comprueba(s.remolque.cargaY > antes.remolque.cargaY, 'el montón del remolque sube');
await pulsa(p, 'descargar', 'KeyX');

// --- 5. Bajarse y subir al tractor
const cambio = await p.evaluate(async () => {
  const j = window.__juego; const m = j.agricultura;
  const t = m.tractor.estado();
  const f = t.adelante;
  return { tx: t.posicion.x, tz: t.posicion.z, fx: f.x, fz: f.z };
});
await p.keyboard.press('KeyE');          // bajarse de la cosechadora
await fotogramas(p, 6);
await p.evaluate(({ tx, tz, fx, fz }) => {
  const j = window.__juego;
  j.peaton.activa(tx + fz * 2.4, tz - fx * 2.4, 0);       // a la izquierda del tractor (como si hubiera ido andando)
}, cambio);
await fotogramas(p, 6);
await p.keyboard.press('KeyE');
await fotogramas(p, 8);
s = await estado(p);
const aPie = await p.evaluate(() => window.__juego.peaton.activo ?? null);
if (!s.enTractor) console.log('  (a pie:', aPie, ', aviso:', await p.evaluate(() => window.__juego.ultimoAviso), ')');
comprueba(s.enTractor, 'a pie, junto al tractor, E sube al tractor (no a la cosechadora de la que se bajó)');

// --- 6. Menú de la COPE con la cosechadora: descargar la tolva
const menu = await p.evaluate(async () => {
  const j = window.__juego; const m = j.agricultura;
  m.cosechadora.llenaPara(1500, 'trigo');
  j.cambiaVehiculo(m.cosechadora.maquina);
  await m.entra();
  const botones = [...document.querySelectorAll('#menu-cope button')].map((x) => x.textContent);
  [...document.querySelectorAll('#menu-cope button')].find((x) => x.textContent.includes('Descargar la tolva')).click();
  return { botones, tolva: m.cosechadora.tolvaKg, granero: { ...m.granero } };
});
comprueba(menu.botones.some((x) => x.includes('Dejar la cosechadora')) && menu.tolva === 0 && (menu.granero.trigo ?? 0) >= 1500,
  `en la COPE con la cosechadora se descarga la tolva (entregado: ${Math.round(menu.granero.trigo ?? 0)} kg de trigo)`);

comprueba(errores.length === 0, `sin errores en la consola${errores.length ? `: ${errores.slice(0, 5).join(' | ')}` : ''}`);
await p.close();
await b.close();
console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
