// Prueba automática de los modos (F5). Sin navegador: las vacas, la manada, el marcador y la
// partida de verdad, con un jugador de mentira. Cada modo se juega de principio a fin.
//   1. Concurso en la plaza: tres rondas con su vaca, cada vaca vuelve al corral, nota final.
//   2. Recorte libre: sin tiempo; se acaba al quedarse sin vida.
//   3. Vacas en la calle: tres vacas de una en una con la puerta abierta; metros corridos delante.
//   4. Encierro: la manada va y vuelve dos veces sin salirse ni desperdigarse y entra al corral;
//      coge a quien se queda en medio y da puntos a quien corre delante.
// Uso: node tools/prueba_modos.mjs
import { FIESTAS } from '../src/config/fiestas.js';
import { PEATON } from '../src/config/peaton.js';
import { RECINTO_FIESTAS as recinto } from '../src/datos/fiestas.js';
import { creaPartida } from '../src/fiestas/partida.js';
import { creaRecortes } from '../src/fiestas/recortes.js';
import { creaCamino, creaVaca } from '../src/fiestas/vaca.js';

const DT = 1 / 60;
const P = FIESTAS.partida;
let fallos = 0;
const comprueba = (ok, texto) => { console.log(`  ${ok ? 'bien ' : 'FALLO'}  ${texto}`); if (!ok) fallos++; };
const azarCon = (s) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const camino = creaCamino(recinto);

// Juega una partida entera. «mueve(j, partida, t)» mueve al jugador de mentira. Devuelve lo medido
function juega(modo, variante, mueve, { semilla = 3, maxS = 900 } = {}) {
  const azar = azarCon(semilla);
  const recortes = creaRecortes({ sinFin: true });
  const todas = []; const capasSoltadas = []; let sueltas = 0; let n = 0;
  const partida = creaPartida({
    modo, variante, recortes, camino, corral: recinto.corral, azar,
    suelta: (o) => {
      const v = creaVaca({ recinto, terreno: null, puertaAbierta: modo !== 'plaza', semilla: semilla + 17 * n++, alturaSuelo: () => 0, sombras: false, ...o });
      todas.push(v); sueltas++;
      capasSoltadas.push(v.capa);
      return v;
    },
    retira: (v) => { todas.splice(todas.indexOf(v), 1); },
  });
  const j = { x: 180, z: 341.5, seguro: true, alto: 1.6, vx: 0, vz: 0, sucesos: [] };
  const m = { fuera: 0, juntasMax: 0, aLaVez: 0, t: 0, turnosVistos: new Set() };
  while (partida.fase !== 'fin' && m.t < maxS) {
    const antes = [j.x, j.z];
    mueve(j, partida, m.t);
    j.vx = (j.x - antes[0]) / DT; j.vz = (j.z - antes[1]) / DT;
    partida.paso(j, DT);
    const lista = todas.map((vaca) => {
      const suceso = vaca.paso(j, DT);
      return { vaca, suceso, cogido: suceso?.tipo === 'cogida' };
    });
    recortes.paso({ jugador: j, vacas: lista }, DT);
    const libres = todas.filter((v) => !['corral', 'saliendo', 'entrando'].includes(v.estado));
    for (const v of libres) if (!v.dentro) m.fuera++;
    m.aLaVez = Math.max(m.aLaVez, libres.length);
    if (partida.manada && libres.length > 1 && libres.every((v) => v.estado === 'guiada')) {
      const ss = libres.map((v) => camino.s(v.posicion().x, v.posicion().z));
      m.juntasMax = Math.max(m.juntasMax, Math.max(...ss) - Math.min(...ss));
    }
    m.turnosVistos.add(partida.turno);
    m.t += DT;
  }
  return { partida, recortes, r: partida.resultado, sueltas, capasSoltadas, ...m };
}
const enLaValla = () => {};
const quietoEnElRuedo = (j) => { j.x = 178; j.z = 336; j.seguro = false; j.alto = 0; };

console.log('0. Movimiento');
comprueba(PEATON.andarMs >= 4 && FIESTAS.personaje.andarMs >= 4.4,
  `velocidad al andar: ${PEATON.andarMs} m/s en el pueblo y ${FIESTAS.personaje.andarMs} m/s en fiestas`);
comprueba(PEATON.correrMs > PEATON.andarMs
  && FIESTAS.personaje.correrMs > FIESTAS.personaje.andarMs
  && FIESTAS.personaje.esprintMs > FIESTAS.personaje.correrMs,
  'correr y esprintar siguen siendo controles separados');

console.log('1. Concurso en la plaza');
{
  const a = juega('plaza', 'concurso', enLaValla);
  comprueba(a.r?.motivo === 'completo' && a.sueltas === P.concurso.rondas && a.aLaVez === 1 && a.fuera === 0,
    `subido a la valla: ${a.sueltas} vacas de una en una, acaba por «${a.r?.motivo}» a los ${a.t.toFixed(0)} s, fuera del recinto ${a.fuera} pasos`);
  comprueba(a.r?.nota === 0 && a.r.puntos === 0, `nota ${a.r?.nota} con ${a.r?.puntos} puntos`);
  const b = juega('plaza', 'concurso', quietoEnElRuedo);
  comprueba(b.r?.motivo === 'vida' && b.r.cogidas >= 3, `quieto en el ruedo: acaba por «${b.r?.motivo}» con ${b.r?.cogidas} cogidas a los ${b.t.toFixed(0)} s`);
}

console.log('2. Recorte libre');
{
  const a = juega('plaza', 'libre', enLaValla, { maxS: 300 });
  comprueba(a.partida.fase === 'jugando' && a.recortes.tiempo === Infinity, `subido a la valla 300 s: sigue jugando, sin tiempo (${a.recortes.tiempo})`);
  const r = a.partida.abandona();
  comprueba(r.motivo === 'abandono', `al dejarlo: resultado por «${r.motivo}», ${r.puntos} puntos`);
  const b = juega('plaza', 'libre', quietoEnElRuedo);
  comprueba(b.r?.motivo === 'vida', `quieto en el ruedo: acaba por «${b.r?.motivo}» a los ${b.t.toFixed(0)} s`);
}

console.log('3. Vacas en la calle');
{
  const a = juega('calle', null, enLaValla);
  comprueba(a.r?.motivo === 'completo' && a.sueltas === P.calle.vacas && a.aLaVez === 1 && a.fuera === 0,
    `subido a la valla: ${a.sueltas} vacas de una en una, acaba por «${a.r?.motivo}» a los ${a.t.toFixed(0)} s, fuera del recinto ${a.fuera} pasos`);
  // Corre calle abajo por el eje cuando la vaca se le arranca; al llegar al final, a la valla
  let s = camino.s(...recinto.puerta.a) - 25;
  const corre = (j, partida) => {
    const v = partida.vacas[0];
    j.alto = 0;
    if (s < 12) { j.seguro = true; return; }
    j.seguro = false;
    if (v?.estado === 'embiste') s -= FIESTAS.personaje.esprintMs * DT;
    [j.x, j.z] = camino.punto(s);
  };
  const b = juega('calle', null, corre);
  comprueba(b.r?.metros > 20 && b.r.puntos + 300 * b.r.cogidas >= b.r.metros * P.calle.puntosPorMetro - 5,
    `corriendo delante calle abajo: ${b.r?.metros} m corridos delante, ${b.r?.puntos} puntos, ${b.r?.cogidas} cogidas, acaba por «${b.r?.motivo}»`);
}

console.log('4. Encierro');
{
  const a = juega('encierro', null, enLaValla);
  comprueba(a.r?.motivo === 'completo' && a.sueltas === P.encierro.vacas && a.fuera === 0,
    `subido a la valla: ${a.sueltas} vacas, ${a.partida.manada.tramo} tramos de ${a.partida.manada.tramos}, acaba por «${a.r?.motivo}» a los ${a.t.toFixed(0)} s, fuera del recinto ${a.fuera} pasos`);
  comprueba(a.aLaVez === P.encierro.vacas && a.juntasMax < 16, `van juntas: ${a.aLaVez} a la vez, la manada se estira como mucho ${a.juntasMax.toFixed(1)} m`);
  comprueba(new Set(a.capasSoltadas).size === FIESTAS.vaca.capas.length,
    `la manada combina capas: ${[...new Set(a.capasSoltadas)].join(', ')}`);
  // En medio de la calle, quieto
  const medio = camino.punto(camino.s(...recinto.puerta.a) - 30);
  const b = juega('encierro', null, (j) => { j.x = medio[0]; j.z = medio[1]; j.seguro = false; j.alto = 0; });
  comprueba(b.r?.cogidas >= 1, `quieto en medio de la calle: ${b.r?.cogidas} cogidas, vida ${b.r?.vida.toFixed(2)}, acaba por «${b.r?.motivo}»`);
  // Corre delante de la manada calle abajo y se sube a la valla al final
  let s = camino.s(...recinto.puerta.a) - 12;
  const c = juega('encierro', null, (j, partida) => {
    const f = partida.manada.frente();
    j.alto = 0;
    if (s < 16 || (f && f.sentido > 0)) { j.seguro = true; return; }
    j.seguro = false;
    if (f && f.s - s < 9) s -= FIESTAS.personaje.esprintMs * DT;       // arranca cuando las tiene a 9 m
    [j.x, j.z] = camino.punto(s);
  });
  comprueba(c.r?.segundos >= 8 && c.r.cogidas === 0 && c.r.puntos > 100,
    `corriendo delante en la primera carrera: ${c.r?.segundos} s delante, ${c.r?.puntos} puntos, ${c.r?.cogidas} cogidas`);
}
console.log(fallos ? `\n${fallos} comprobaciones fallan` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
