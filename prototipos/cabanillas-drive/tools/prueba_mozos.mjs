// Prueba automática de los mozos (F6). Sin navegador: vacas, manada y mozos de verdad, con el
// jugador subido a la valla (así la vaca solo tiene a los mozos).
//   1. Plaza y calle, 5 minutos: los mozos no salen del recinto, la vaca se les arranca, se
//      suben a la valla y bajan, citan, y la mayoría de las embestidas no acaban en cogida.
//   2. Encierro entero: corren delante de la manada, se apartan a la valla y casi nunca los alcanza.
// Uso: node tools/prueba_mozos.mjs
import { FIESTAS } from '../src/config/fiestas.js';
import { RECINTO_FIESTAS as recinto } from '../src/datos/fiestas.js';
import { creaManada } from '../src/fiestas/manada.js';
import { creaMozos, eligeObjetivos } from '../src/fiestas/mozos.js';
import { bordesDelRecinto, creaCamino, creaVaca } from '../src/fiestas/vaca.js';

const DT = 1 / 60;
let fallos = 0;
const comprueba = (ok, texto) => { console.log(`  ${ok ? 'bien ' : 'FALLO'}  ${texto}`); if (!ok) fallos++; };
const camino = creaCamino(recinto);
const jugador = { id: 'jugador', x: 180, z: 341.5, seguro: true, alto: 1.6, sucesos: [] };

function suelta(modo, semilla, segundos) {
  const abierta = modo !== 'plaza';
  const mozos = creaMozos({ recinto, modo, puertaAbierta: abierta, camino, alturaSuelo: () => 0, cantidad: 7, semilla });
  const vacas = []; let manada = null;
  if (modo === 'encierro') {
    for (let i = 0; i < FIESTAS.partida.encierro.vacas; i++) {
      vacas.push(creaVaca({ recinto, terreno: null, puertaAbierta: true, semilla: semilla + i, alturaSuelo: () => 0, sombras: false, esperaS: 2 + i * 0.9 }));
    }
    manada = creaManada({ vacas, camino, corral: recinto.corral });
  } else vacas.push(creaVaca({ recinto, terreno: null, puertaAbierta: abierta, semilla, alturaSuelo: () => 0, sombras: false, esperaS: 2 }));
  const limites = bordesDelRecinto(recinto, abierta);
  const r = { fuera: 0, cogidas: 0, embestidasAMozos: 0, subidas: 0, citas: 0, corre: 0, maxQuieto: 0, metros: 0 };
  let anteriores = new Map();
  const estadoAntes = new Map(); const quieto = new Map();
  for (let i = 0; i < segundos * 60; i++) {
    if (manada) manada.paso(DT);
    mozos.paso(DT, { vacas, jugador, manada });
    const objetivos = manada ? new Map(vacas.map((v) => [v, jugador])) : eligeObjetivos(vacas, jugador, mozos.objetivos(), anteriores);
    anteriores = new Map([...objetivos].map(([v, o]) => [v, o.id]));
    for (const v of vacas) {
      const o = objetivos.get(v);
      const vivo = o.id === 'jugador' ? o : (mozos.objetivo(o.id) ?? o);
      v.persigue = o.id;
      const antes = v.estado;
      const s = v.paso(vivo, DT);
      if (antes !== 'embiste' && v.estado === 'embiste' && o.id !== 'jugador') r.embestidasAMozos++;
      if (s?.tipo === 'cogida' && o.mozo && mozos.cogida(o.mozo, s.dx, s.dz)) r.cogidas++;
    }
    for (const m of mozos.mozos) {
      const e = estadoAntes.get(m);
      if (e !== m.estado) {
        if (m.estado === 'subido') r.subidas++;
        if (m.estado === 'cita') r.citas++;
        estadoAntes.set(m, m.estado);
      }
      if (m.estado === 'corre') r.corre += DT;
      // Fuera del recinto: solo cuenta en el suelo (arriba de la valla están en la línea)
      if (!['subido', 'subiendo', 'bajando'].includes(m.estado) && !limites.dentro(m.x, m.z)) r.fuera++;
      const q = quieto.get(m) ?? { x: m.x, z: m.z, t: 0 };
      if (Math.hypot(m.x - q.x, m.z - q.z) > 1) quieto.set(m, { x: m.x, z: m.z, t: 0 }); else { q.t += DT; quieto.set(m, q); r.maxQuieto = Math.max(r.maxQuieto, q.t); }
    }
  }
  r.metros = Math.round(mozos.mozos.reduce((a, m) => a + m.metros, 0) / mozos.mozos.length);
  return { r, mozos, vacas, manada };
}

console.log('1. Plaza y calle (5 minutos, 7 mozos)');
for (const [modo, semilla] of [['plaza', 3], ['plaza', 8], ['calle', 5], ['calle', 12]]) {
  const { r } = suelta(modo, semilla, 300);
  const ok = r.fuera === 0 && r.embestidasAMozos >= 8 && r.subidas >= 4 && r.citas >= 3 && r.cogidas <= r.embestidasAMozos * 0.5 && r.metros > 60;
  comprueba(ok, `${modo} (semilla ${semilla}): ${r.embestidasAMozos} embestidas a mozos, ${r.cogidas} cogidas, ${r.subidas} subidas a la valla, `
    + `${r.citas} citas, ${r.metros} m andados de media, ${r.fuera} pasos fuera del recinto`);
}

console.log('2. Encierro (7 mozos)');
for (const semilla of [4, 9]) {
  const { r, manada } = suelta('encierro', semilla, 180);
  comprueba(manada.terminada && r.corre > 40 && r.subidas >= 5 && r.cogidas === 0 && r.fuera === 0,
    `semilla ${semilla}: manada ${manada.terminada ? 'en el corral' : 'sin acabar'}, ${r.corre.toFixed(0)} s·mozo corriendo delante, ${r.subidas} subidas a la valla, ${r.cogidas} cogidas`);
}
console.log(fallos ? `\n${fallos} comprobaciones fallan` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
