// Una partida de un modo de fiestas (F5), de principio a fin: suelta las vacas, lleva el tiempo
// y las rondas, suma los puntos propios del modo y dice cuándo se acaba y con qué resultado.
//   plaza / libre     una vaca, sin tiempo; se acaba al quedarse sin vida (o saliendo)
//   plaza / concurso  rondas con tiempo, cada una con su vaca; nota final sobre 10
//   calle             puerta abierta; las vacas salen de una en una, cada una un tiempo; puntos por
//                     recortes y por metros corridos delante de la vaca
//   encierro          la manada va y vuelve por el recorrido; puntos por segundo corrido delante y cerca
// Los recortes, los pases y las cogidas los puntúa recortes.js en todos los modos.
// No usa Three.js ni el navegador (tools/prueba_modos.mjs la prueba tal cual).
import { FIESTAS } from '../config/fiestas.js';
import { creaManada } from './manada.js';

const ORDINAL = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima'];

// suelta({ esperaS, capa }) crea una vaca en el corral y la devuelve; retira(vaca) la quita
export function creaPartida({ modo, variante = 'libre', recortes, suelta, retira, camino, corral, azar = Math.random }) {
  const P = FIESTAS.partida;
  const capas = FIESTAS.vaca.capas;
  const concurso = modo === 'plaza' && variante === 'concurso';
  const turnos = modo === 'calle' ? P.calle.vacas : concurso ? P.concurso.rondas : 1;
  const duracion = modo === 'calle' ? P.calle.vacaS : concurso ? P.concurso.rondaS : Infinity;
  let turno = 0;
  let vaca = null;                // la del turno (plaza y calle)
  let queda = duracion;
  let fase = 'jugando';           // jugando | recogiendo | fin
  let manada = null;
  let vacas = [];
  let metros = 0; let metrosPagados = 0; let segundos = 0; let puntosDelante = 0;
  let resultado = null;

  function sueltaTurno() {
    vaca = suelta({ esperaS: turno === 0 ? FIESTAS.vaca.salidaS : P.salidaSiguienteS, capa: capas[(turno + Math.floor(azar() * 3)) % capas.length] });
    vacas = [vaca];
    queda = duracion;
    fase = 'jugando';
    if (turnos > 1) recortes.avisa(concurso ? `Ronda ${turno + 1} de ${turnos}` : `Sale la ${ORDINAL[turno]} vaca`, '', 2.5);
  }
  if (modo === 'encierro') {
    for (let i = 0; i < P.encierro.vacas; i++) vacas.push(suelta({ esperaS: FIESTAS.vaca.salidaS + i * P.encierro.cadaS, capa: capas[i % capas.length] }));
    manada = creaManada({ vacas, camino, corral, azar });
    recortes.avisa('¡Encierro! Corre delante de la manada', '', 3.5);
  } else sueltaTurno();
  recortes.ponTiempo(duracion);

  function acaba(motivo) {
    fase = 'fin';
    for (const v of vacas) retira(v);
    vacas = [];
    resultado = {
      modo, variante: modo === 'plaza' ? variante : null, motivo,
      puntos: Math.round(recortes.puntos), pases: recortes.pases, cogidas: recortes.cogidas, vida: recortes.vida,
      metros: modo === 'calle' ? Math.round(metros) : null,
      segundos: modo === 'encierro' ? Math.round(segundos) : null,
      nota: concurso ? Math.min(10, Math.round((recortes.puntos / P.concurso.notaDiez) * 100) / 10) : null,
    };
  }

  // jugador: { x, z, seguro, vx, vz }. Se llama antes del paso de las vacas
  function paso(jugador, dt) {
    if (fase === 'fin') return;
    if (recortes.acabada === 'vida') { acaba('vida'); return; }
    const corre = Math.hypot(jugador.vx, jugador.vz);
    if (manada) {
      const E = P.encierro;
      manada.paso(dt);
      const frente = manada.frente();
      if (frente && !jugador.seguro && corre > E.correMs) {
        const delante = (camino.s(jugador.x, jugador.z) - frente.s) * frente.sentido;
        if (delante > 0 && delante < E.delanteHastaM) {
          segundos += dt;
          puntosDelante += E.puntosPorS * (2 - delante / E.delanteHastaM) * dt;
          const enteros = Math.floor(puntosDelante);
          if (enteros) { recortes.suma(enteros); puntosDelante -= enteros; }
        }
      }
      if (manada.terminada && vacas.every((v) => v.guardada)) acaba('completo');
      return;
    }
    if (fase === 'jugando') {
      if (vaca.estado !== 'corral' && vaca.estado !== 'saliendo') queda -= dt;
      recortes.ponTiempo(Math.max(0, queda));
      if (modo === 'calle' && vaca.estado === 'embiste' && !vaca.cruzado && !jugador.seguro && corre > P.calle.correMs) {
        // Metros corridos delante: la vaca viene detrás y el jugador se aleja de ella
        const q = vaca.posicion();
        const dx = jugador.x - q.x; const dz = jugador.z - q.z; const d = Math.hypot(dx, dz);
        if (d < P.calle.delanteHastaM && dx * jugador.vx + dz * jugador.vz > 0) {
          metros += corre * dt;
          const pagar = Math.floor(metros) - metrosPagados;
          if (pagar > 0) { recortes.suma(pagar * P.calle.puntosPorMetro); metrosPagados += pagar; }
        }
      }
      if (queda <= 0) {
        vaca.recoge();
        fase = 'recogiendo';
        recortes.avisa(turno + 1 < turnos ? 'Se recoge la vaca' : 'Se acabó el tiempo', '', 2.5);
      }
    } else if (fase === 'recogiendo' && vaca.guardada) {
      retira(vaca);
      turno++;
      if (turno < turnos) sueltaTurno(); else { vacas = []; acaba('completo'); }
    }
  }

  return {
    paso,
    get fase() { return fase; },
    get turno() { return turno; },
    get turnos() { return turnos; },
    get vacas() { return vacas; },
    get manada() { return manada; },
    get resultado() { return resultado; },
    get metros() { return metros; },
    get segundos() { return segundos; },
    // El jugador lo deja: resultado con lo que lleve
    abandona() { if (fase !== 'fin') acaba('abandono'); return resultado; },
  };
}
