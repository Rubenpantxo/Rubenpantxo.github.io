// Prueba automática de la vaca (F3). No necesita navegador: la vaca se mueve en el plano, así que
// se simula aquí con un jugador de mentira que usa las velocidades y el quiebro de config/fiestas.js.
//   1. Cinco minutos suelta con un jugador corriendo por el recinto (plaza cerrada y con la puerta
//      abierta): nunca sale del recinto y nunca se queda atascada.
//   2. Embestidas medidas: quieto (lo coge), quiebro a tiempo (pasa de largo), quiebro demasiado
//      pronto (lo coge), huir en recta (lo alcanza), salto alto (pasa por debajo).
//   3. A salvo: con el jugador en la valla no se arranca.
// Uso: node tools/prueba_vaca.mjs
import { FIESTAS } from '../src/config/fiestas.js';
import { RECINTO_FIESTAS as recinto } from '../src/datos/fiestas.js';
import { bordesDelRecinto, creaVaca } from '../src/fiestas/vaca.js';

const DT = 1 / 60;
const P = FIESTAS.personaje;
let fallos = 0;
const comprueba = (ok, texto) => { console.log(`  ${ok ? 'bien ' : 'FALLO'}  ${texto}`); if (!ok) fallos++; };
const azarCon = (s) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

// --- 1. Cinco minutos sin salirse ni atascarse
function sueltaCincoMinutos(puertaAbierta, semilla) {
  const azar = azarCon(semilla);
  const limites = bordesDelRecinto(recinto, puertaAbierta);
  const vaca = creaVaca({ recinto, terreno: null, puertaAbierta, semilla, alturaSuelo: () => 0, sombras: false });
  const punto = () => {
    for (;;) {
      const zona = limites.zonas[Math.floor(azar() * limites.zonas.length)];
      const a = zona[Math.floor(azar() * zona.length)]; const b = zona[Math.floor(azar() * zona.length)]; const c = zona[Math.floor(azar() * zona.length)];
      const p = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3];
      if (limites.dentro(p[0], p[1])) return p;
    }
  };
  const jugador = { x: 178, z: 336, seguro: false, alto: 0 };
  let meta = punto();
  let fuera = 0; let cogidas = 0; let golpes = 0; let quietoMax = 0; let desde = 0; let ancla = vaca.posicion(); let recorrido = 0; let ant = vaca.posicion();
  const pasos = 5 * 60 * 60 + FIESTAS.vaca.salidaS * 60;
  for (let i = 0; i < pasos; i++) {
    // El jugador corre de un punto a otro (si lo cogen, reaparece en otro sitio)
    const dx = meta[0] - jugador.x; const dz = meta[1] - jugador.z; const d = Math.hypot(dx, dz);
    if (d < 1) meta = punto();
    else if (limites.dentro(jugador.x + (dx / d) * P.correrMs * DT, jugador.z + (dz / d) * P.correrMs * DT)) {
      jugador.x += (dx / d) * P.correrMs * DT; jugador.z += (dz / d) * P.correrMs * DT;
    } else meta = punto();
    const s = vaca.paso(jugador, DT);
    if (s?.tipo === 'cogida') { cogidas++; const p = punto(); jugador.x = p[0]; jugador.z = p[1]; meta = punto(); }
    if (s?.tipo === 'golpe') golpes++;
    const q = vaca.posicion();
    recorrido += Math.hypot(q.x - ant.x, q.z - ant.z); ant = q;
    if (vaca.estado !== 'corral' && vaca.estado !== 'saliendo' && !vaca.dentro) fuera++;
    if (Math.hypot(q.x - ancla.x, q.z - ancla.z) > 1) { ancla = q; desde = i; }
    if (vaca.estado !== 'corral') quietoMax = Math.max(quietoMax, (i - desde) * DT);
  }
  return { fuera, cogidas, golpes, embestidas: vaca.embestidas, quietoMax: +quietoMax.toFixed(1), recorrido: Math.round(recorrido), fuerza: +vaca.fuerza.toFixed(2) };
}
console.log('1. Cinco minutos suelta');
for (const [nombre, abierta] of [['plaza, puerta cerrada', false], ['plaza y calle, puerta abierta', true]]) {
  for (const semilla of [11, 23, 47]) {
    const r = sueltaCincoMinutos(abierta, semilla);
    comprueba(r.fuera === 0 && r.quietoMax < 12 && r.embestidas > 10,
      `${nombre} (semilla ${semilla}): ${r.recorrido} m, ${r.embestidas} embestidas, ${r.cogidas} cogidas, ${r.golpes} remates en la valla, `
      + `parada más larga ${r.quietoMax} s, fuera del recinto ${r.fuera} pasos, acaba con fuerza ${r.fuerza}`);
  }
}

// --- 2. Embestidas medidas, en el eje largo del ruedo
function embestida(nombre, reaccion) {
  const vaca = creaVaca({ recinto, terreno: null, puertaAbierta: false, semilla: 5, alturaSuelo: () => 0, sombras: false });
  // Vaca al oeste del ruedo mirando al jugador, que está 15 m al este
  const a = [166, 331.2]; const b = [180.4, 336.0];
  vaca.pon(a[0], a[1], Math.atan2(b[0] - a[0], b[1] - a[1]), 'fija', 0.3);
  const j = { x: b[0], z: b[1], seguro: false, alto: 0, t: 0, fase: null, vy: 0 };
  let cogida = false; let minimo = 99; let fin = null;
  for (let i = 0; i < 60 * 9 && !fin; i++) {
    const q = vaca.posicion();
    const d = Math.hypot(q.x - j.x, q.z - j.z);
    if (vaca.estado === 'embiste') minimo = Math.min(minimo, d);
    reaccion(j, q, d, vaca);
    const s = vaca.paso(j, DT);
    if (s?.tipo === 'cogida') { cogida = true; fin = 'cogida'; }
    else if (vaca.sucesos.at(-1)?.tipo === 'pasa' || vaca.sucesos.at(-1)?.tipo === 'golpe' || vaca.sucesos.at(-1)?.tipo === 'desiste') fin = vaca.sucesos.at(-1).tipo;
  }
  return { nombre, cogida, fin, minimo: +minimo.toFixed(2) };
}
// Quiebro del jugador: lateral respecto a la línea de la vaca, con las medidas de config
function quiebroA(distancia) {
  return (j, q, d) => {
    if (j.fase === null && d < distancia) {
      const l = Math.hypot(j.x - q.x, j.z - q.z);
      j.fase = { t: 0, dx: -(j.z - q.z) / l, dz: (j.x - q.x) / l };
    }
    if (j.fase && j.fase.t < P.quiebro.duracionS) {
      const v = P.quiebro.distanciaM / P.quiebro.duracionS;
      j.x += j.fase.dx * v * DT; j.z += j.fase.dz * v * DT; j.fase.t += DT;
    }
  };
}
console.log('2. Embestidas medidas (vaca a 15 m)');
const casos = [
  [embestida('quieto', () => {}), true],
  [embestida('quiebro con la vaca a 3,5 m', quiebroA(3.5)), false],
  [embestida('quiebro con la vaca a 2,5 m', quiebroA(2.5)), false],
  [embestida('quiebro demasiado pronto, a 11 m', quiebroA(11)), true],
  [embestida('huir en recta a esprint', (j, q) => {
    const l = Math.hypot(j.x - q.x, j.z - q.z);
    const nx = j.x + ((j.x - q.x) / l) * P.esprintMs * DT; const nz = j.z + ((j.z - q.z) / l) * P.esprintMs * DT;
    if (nx < 191) { j.x = nx; j.z = nz; }                    // hasta el final del ruedo
  }), true],
  [embestida('salto alto con la vaca a 3 m', (j, q, d) => {
    if (j.fase === null && d < 3) { j.fase = 1; j.vy = Math.sqrt(2 * 9.81 * P.especial.altoM); }
    if (j.fase) { j.alto = Math.max(0, j.alto + j.vy * DT); j.vy -= 9.81 * DT; }
  }), false],
];
for (const [r, esperaCogida] of casos) {
  comprueba(r.cogida === esperaCogida, `${r.nombre}: ${r.cogida ? 'lo coge' : `no lo coge (${r.fin})`}; distancia mínima ${r.minimo} m`);
}

// --- 3. A salvo
console.log('3. Jugador a salvo en la valla');
{
  const vaca = creaVaca({ recinto, terreno: null, puertaAbierta: false, semilla: 9, alturaSuelo: () => 0, sombras: false });
  const j = { x: 180, z: 341.5, seguro: true, alto: 1.6 };
  let cogidas = 0;
  for (let i = 0; i < 60 * 90; i++) if (vaca.paso(j, DT)?.tipo === 'cogida') cogidas++;
  comprueba(vaca.embestidas === 0 && cogidas === 0, `90 s: ${vaca.embestidas} embestidas, ${cogidas} cogidas, estado «${vaca.estado}»`);
}
console.log(fallos ? `\n${fallos} comprobaciones fallan` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
