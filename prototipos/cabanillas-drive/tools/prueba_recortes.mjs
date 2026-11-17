// Prueba automática de la puntuación (F4). Sin navegador: la vaca de verdad (vaca.js), el
// marcador de verdad (recortes.js) y un jugador de mentira con las medidas de config/fiestas.js.
// Tabla de casos con lo que se espera de cada uno; luego, las reglas de variedad, vida y tiempo.
// Uso: node tools/prueba_recortes.mjs
import { FIESTAS } from '../src/config/fiestas.js';
import { RECINTO_FIESTAS as recinto } from '../src/datos/fiestas.js';
import { creaRecortes } from '../src/fiestas/recortes.js';
import { creaVaca } from '../src/fiestas/vaca.js';

const DT = 1 / 60;
const P = FIESTAS.personaje;
const R = FIESTAS.recortes;
let fallos = 0;
let reloj = 0;                   // el del jugador: sigue de una embestida a otra
const comprueba = (ok, texto) => { console.log(`  ${ok ? 'bien ' : 'FALLO'}  ${texto}`); if (!ok) fallos++; };

// Una embestida: vaca al oeste del ruedo, jugador 15 m al este. «reaccion» mueve al jugador y
// apunta sus suertes en j.sucesos, como hace personaje.js
function embestida(marcador, reaccion, semilla = 5) {
  const vaca = creaVaca({ recinto, terreno: null, puertaAbierta: false, semilla, alturaSuelo: () => 0, sombras: false });
  const a = [166, 331.2]; const b = [180.4, 336.0];
  vaca.pon(a[0], a[1], Math.atan2(b[0] - a[0], b[1] - a[1]), 'fija', 0.3);
  const j = { x: b[0], z: b[1], seguro: false, alto: 0, fase: null, vy: 0, sucesos: [], reloj };
  const antes = marcador.historial.length;
  let listos = 0;
  for (let i = 0; i < 60 * 9; i++) {
    j.reloj += DT; reloj = j.reloj;
    const c = vaca.cuernos();
    reaccion(j, vaca.posicion(), Math.hypot(c.x - j.x, c.z - j.z), vaca);
    if (Object.values(marcador.listos(j, vaca)).some(Boolean)) listos++;
    const suceso = vaca.paso(j, DT);
    marcador.paso({ jugador: j, vaca, suceso, cogido: suceso?.tipo === 'cogida' }, DT);
    if (marcador.historial.length > antes || marcador.acabada) break;
    if (['pasa', 'golpe', 'desiste'].includes(vaca.sucesos.at(-1)?.tipo) && vaca.estado !== 'embiste') break;
  }
  return { hecho: marcador.historial[antes] ?? null, listos };
}
const anota = (j, tipo) => j.sucesos.push({ tipo, t: j.reloj });
// Quiebro lateral con la vaca (sus cuernos) a «distancia»; «metros» es lo que se aparta
function quiebroA(distancia, metros = P.quiebro.distanciaM, tipo = 'quiebro') {
  return (j, q, d) => {
    if (j.fase === null && d < distancia) {
      const l = Math.hypot(j.x - q.x, j.z - q.z);
      j.fase = { t: 0, dx: -(j.z - q.z) / l, dz: (j.x - q.x) / l };
      anota(j, tipo);
    }
    if (j.fase && j.fase.t < P.quiebro.duracionS) {
      const v = metros / P.quiebro.duracionS;
      j.x += j.fase.dx * v * DT; j.z += j.fase.dz * v * DT; j.fase.t += DT;
    }
  };
}
function saltoA(distancia, alto, tipo) {
  return (j, q, d) => {
    if (j.fase === null && d < distancia) { j.fase = 1; j.vy = Math.sqrt(2 * 9.81 * alto); anota(j, tipo); }
    if (j.fase) { j.alto = Math.max(0, j.alto + j.vy * DT); j.vy -= 9.81 * DT; }
  };
}
// Apartarse andando de lado, sin hacer ninguna suerte
const apartarse = (j, q, d) => {
  if (d < 9) { const l = Math.hypot(j.x - q.x, j.z - q.z); j.x += -(j.z - q.z) / l * P.correrMs * DT; j.z += (j.x - q.x) / l * P.correrMs * DT; }
};

console.log('1. Tabla de casos (vaca a 15 m, una embestida cada uno)');
const casos = [
  ['quiebro ceñido (a 2,2 m)', quiebroA(2.2, 1.9), { tipo: 'quiebro', nota: 'ceñido', puntos: [200, 300] }],
  ['quiebro bueno (a 3,5 m)', quiebroA(3.5), { tipo: 'quiebro', puntos: [120, 260] }],
  ['quiebro lejano (a 4,8 m, apartándose 4 m)', quiebroA(4.8, 4.0), { tipo: 'quiebro', nota: 'lejano', puntos: [100, 130] }],
  ['quiebro fuera de distancia (a 11 m)', quiebroA(11), { tipo: 'cogida' }],
  ['salto alto (especial) a 3 m', saltoA(3, P.especial.altoM, 'especial'), { tipo: 'especial', nota: 'ceñido', puntos: [900, 1050] }],
  ['salto a 2,5 m', saltoA(2.5, P.salto.altoM, 'salto'), { tipo: 'salto', nota: 'ceñido', puntos: [550, 620] }],
  ['salto demasiado pronto (a 4,4 m): cae delante', saltoA(4.4, P.salto.altoM, 'salto'), { tipo: 'cogida' }],
  ['quieto', () => {}, { tipo: 'cogida fuerte', puntos: [-R.cogida.fuerte.puntos, -R.cogida.fuerte.puntos] }],
  ['apartarse corriendo, sin suerte', apartarse, { tipo: 'pase', puntos: [20, 60] }],
];
for (const [nombre, reaccion, espera] of casos) {
  const m = creaRecortes();
  const { hecho, listos } = embestida(m, reaccion);
  const ok = hecho && hecho.tipo.startsWith(espera.tipo) && (!espera.nota || hecho.nota === espera.nota)
    && (!espera.puntos || (hecho.puntos >= espera.puntos[0] && hecho.puntos <= espera.puntos[1]));
  comprueba(ok, `${nombre}: ${hecho ? `${hecho.tipo}${hecho.nota ? ` ${hecho.nota}` : ''}, ${hecho.puntos} puntos`
    + `${hecho.minimo !== undefined ? `, pasa a ${hecho.minimo} m` : ''}${hecho.detalles?.length ? ` (${hecho.detalles.join(', ')})` : ''}` : 'nada'}`
    + `; pases ${m.pases}, vida ${m.vida.toFixed(2)}, botones encendidos ${listos} pasos`);
}

console.log('2. Variedad, vida y tiempo');
{
  const m = creaRecortes();
  const a = embestida(m, quiebroA(3.5)).hecho;
  const b = embestida(m, quiebroA(3.5)).hecho;
  comprueba(b.detalles.includes('repetida') && b.puntos < a.puntos, `mismo quiebro dos veces: ${a.puntos} y luego ${b.puntos} (repetida)`);
  const c = embestida(m, saltoA(3, P.especial.altoM, 'especial')).hecho;
  comprueba(c.detalles.includes('variada'), `tras dos quiebros, un especial: ${c.puntos} (${c.detalles.join(', ')})`);
  comprueba(m.pases === 3 && m.puntos === a.puntos + b.puntos + c.puntos, `marcador: ${m.puntos} puntos, ${m.pases} pases`);
}
{
  const m = creaRecortes();
  const q = embestida(m, quiebroA(2.2, 1.9, 'combo')).hecho;
  comprueba(q?.tipo === 'combo' && q.puntos > 500, `quiebro de ida y vuelta ceñido: ${q?.puntos} puntos`);
}
{
  const m = creaRecortes();
  let n = 0;
  while (!m.acabada && n < 10) { embestida(m, () => {}, 5 + n); n++; }
  comprueba(m.acabada === 'vida' && n === Math.ceil(1 / R.cogida.fuerte.vida), `quieto hasta quedarse sin vida: ${n} cogidas fuertes, tanda acabada por «${m.acabada}»`);
  comprueba(m.aviso?.clase === 'fin', `aviso final: «${m.aviso?.texto}»`);
}
{
  const m = creaRecortes();
  const vaca = creaVaca({ recinto, terreno: null, puertaAbierta: false, semilla: 9, alturaSuelo: () => 0, sombras: false });
  const j = { x: 180, z: 341.5, seguro: true, alto: 1.6, sucesos: [] };
  let pasos = 0;
  while (!m.acabada && pasos < 60 * 200) { m.paso({ jugador: j, vaca, suceso: vaca.paso(j, DT) }, DT); pasos++; }
  const s = pasos / 60;
  comprueba(m.acabada === 'tiempo' && Math.abs(s - R.tandaS - FIESTAS.vaca.salidaS) < 1.5 && m.puntos === 0,
    `subido a la valla toda la tanda: acaba por «${m.acabada}» a los ${s.toFixed(0)} s (el reloj corre desde que sale la vaca), ${m.puntos} puntos`);
  for (let i = 0; i < 60 * (R.otraTandaS + 1); i++) m.paso({ jugador: j, vaca, suceso: vaca.paso(j, DT) }, DT);
  comprueba(!m.acabada && m.tiempo > R.tandaS - 2 && m.vida === 1, `a los ${R.otraTandaS} s empieza otra tanda: tiempo ${m.tiempo.toFixed(0)} s, vida ${m.vida}`);
}
console.log(fallos ? `\n${fallos} comprobaciones fallan` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
