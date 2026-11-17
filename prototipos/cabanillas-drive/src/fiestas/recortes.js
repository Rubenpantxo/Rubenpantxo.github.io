// Recortes y puntuación (F4): mira cada embestida de la vaca y lo que hace el jugador mientras,
// y al acabar la embestida la puntúa. No toca ni a la vaca ni al jugador: solo lee. No usa
// Three.js ni el navegador, así que tools/prueba_recortes.mjs lo prueba tal cual.
//   - Pase: la vaca embiste, se cruza con el jugador sin cogerlo y pasa cerca.
//   - Suerte (quiebro, recorte, salto, especial, combo): hecha con la vaca a distancia válida.
//     Vale más cuanto más ceñida pasa la vaca; menos si pasa rozando o si se repite la suerte.
//   - Cogida: quita vida y puntos (leve o fuerte según a qué velocidad venía la vaca).
import { FIESTAS } from '../config/fiestas.js';

const SUERTES = ['quiebro', 'recorte', 'salto', 'especial'];
const NOMBRES = { quiebro: 'Quiebro', recorte: 'Recorte', salto: 'Salto', especial: 'Salto al trascuerno', combo: 'Quiebro de ida y vuelta', pase: 'Pase' };

// «sinFin»: el tiempo y el final los lleva la partida (F5); aquí solo se acaba al quedarse sin vida
export function creaRecortes({ sinFin = false } = {}) {
  const R = FIESTAS.recortes;
  let puntos; let pases; let vida; let tiempo; let acabada; let espera; let cogidas;
  let lance;                 // la embestida en curso: { minimo, suerte, distancia, fuera }
  const lances = new Map();  // una por vaca
  let mostrado = null;       // tiempo que enseña el marcador cuando lo lleva la partida
  let ultimas;               // suertes puntuadas, para la variedad
  let vistoHasta;            // reloj del último suceso del jugador ya leído
  let lenta;                 // segundos de cámara lenta que quedan
  let aviso;                 // { texto, clase, t }
  let consejo; let tConsejo;
  const historial = [];      // lo puntuado en la tanda (para la prueba y el resumen)

  function reinicia() {
    puntos = 0; pases = 0; vida = 1; tiempo = R.tandaS; acabada = null; espera = 0; cogidas = 0;
    lance = null; lances.clear(); mostrado = null; ultimas = []; vistoHasta = -1; lenta = 0; aviso = null; consejo = 0; tConsejo = 0;
    historial.length = 0;
  }
  reinicia();

  const avisa = (texto, clase = '', segundos = R.avisoS) => { aviso = { texto, clase, t: segundos }; };
  const riesgoDe = (minimo) => Math.min(1, Math.max(0, (R.lejosM - minimo) / (R.lejosM - R.cenidoM)));
  const notaDe = (riesgo) => R.notas.find(([minimo]) => riesgo >= minimo)[1];

  // Al acabar la embestida sin cogida
  function puntua() {
    const { minimo, suerte, fuera } = lance;
    if (minimo > R.paseHastaM) return;                    // pasó lejos: ni pase
    pases++;
    const riesgo = riesgoDe(minimo);
    const tipo = suerte ?? 'pase';
    let valor = R.puntos[tipo] * (1 + R.extraRiesgo * riesgo);
    const detalles = [];
    const porAlto = tipo === 'salto' || tipo === 'especial';
    if (suerte && !porAlto && minimo < R.rozadoM) { valor *= R.rozado; detalles.push('rozado'); }
    if (suerte) {
      if (ultimas.at(-1) === tipo) { valor *= R.repetida; detalles.push('repetida'); }
      else if (ultimas.length >= 2 && !ultimas.slice(-2).includes(tipo)) { valor *= R.variada; detalles.push('variada'); }
      ultimas.push(tipo);
    }
    valor = Math.round(valor / 5) * 5;
    puntos += valor;
    const nota = notaDe(riesgo);
    historial.push({ tipo, minimo: +minimo.toFixed(2), riesgo: +riesgo.toFixed(2), nota, puntos: valor, detalles, fuera });
    if (suerte) {
      avisa(`${riesgo >= R.lenta.riesgo ? '¡Olé! ' : ''}${NOMBRES[tipo]} ${nota} +${valor}`, riesgo >= R.lenta.riesgo ? 'ole' : '');
    } else avisa(fuera ? `Fuera de distancia · pase +${valor}` : `Pase +${valor}`);
  }

  // Un paso de física. jugador: { x, z, seguro, sucesos }; vacas: [{ vaca, suceso, cogido }] con lo
  // que devolvió vaca.paso en este paso y si la cogida ha llegado a ser (el jugador no estaba ya
  // por los aires). También vale una sola: { jugador, vaca, suceso, cogido }
  function paso({ jugador, vacas = null, vaca = null, suceso = null, cogido = false }, dt) {
    const lista = vacas ?? (vaca ? [{ vaca, suceso, cogido }] : []);
    if (aviso && (aviso.t -= dt) <= 0) aviso = null;
    if (lenta > 0) lenta -= dt;
    tConsejo += dt;
    if (tConsejo > 9) { tConsejo = 0; consejo = (consejo + 1) % R.consejos.length; }
    if (acabada) {
      if (sinFin) return;
      espera -= dt;
      if (espera <= 0) reinicia();
      return;
    }
    // Suertes nuevas del jugador
    const nuevas = jugador.sucesos.filter((s) => s.t > vistoHasta);
    if (jugador.sucesos.length) vistoHasta = jugador.sucesos.at(-1).t;
    const fuera = lista.filter((v) => v.vaca.estado !== 'corral' && v.vaca.estado !== 'saliendo');
    if (!fuera.length) return;                                   // el reloj corre desde que sale la vaca
    if (!sinFin) tiempo = Math.max(0, tiempo - dt);
    for (const una of fuera) {
      lance = lances.get(una.vaca) ?? null;
      pasoDeVaca(jugador, una.vaca, una.suceso, una.cogido, nuevas);
      if (lance) lances.set(una.vaca, lance); else lances.delete(una.vaca);
    }
    if (vida <= 0 || (!sinFin && tiempo <= 0)) {
      acabada = vida <= 0 ? 'vida' : 'tiempo';
      espera = R.otraTandaS;
      lances.clear();
      if (!sinFin) aviso = { texto: `${vida <= 0 ? 'Sin vida' : 'Fin de la tanda'}: ${puntos} puntos, ${pases} pases`, clase: 'fin', t: R.otraTandaS };
    }
  }

  function pasoDeVaca(jugador, vaca, suceso, cogido, nuevas) {
    const c = vaca.cuernos();
    const distancia = Math.hypot(jugador.x - c.x, jugador.z - c.z);
    // Solo cuentan las embestidas que van al jugador (no las que van a un mozo)
    if (vaca.estado === 'embiste' && !lance && (vaca.persigue ?? 'jugador') === 'jugador') lance = { minimo: Infinity, suerte: null, fuera: false };
    // Cogida (también fuera de una embestida: la manada del encierro)
    if (suceso?.tipo === 'cogida') {
      if (cogido) {
        const fuerte = suceso.velocidad > R.cogida.fuerteMs;
        const G = fuerte ? R.cogida.fuerte : R.cogida.leve;
        vida = Math.max(0, vida - G.vida);
        puntos = Math.max(0, puntos - G.puntos);
        cogidas++;
        ultimas = [];
        historial.push({ tipo: fuerte ? 'cogida fuerte' : 'cogida leve', puntos: -G.puntos, vida: +vida.toFixed(2) });
        avisa(fuerte ? '¡Cogida fuerte!' : '¡Cogida!', 'cogida');
      }
      lance = null;
      return;
    }
    if (!lance) return;
    if (!jugador.seguro) lance.minimo = Math.min(lance.minimo, distancia);
    for (const s of nuevas) {
      const tipo = s.tipo === 'combo' ? 'quiebro' : s.tipo;
      if (!SUERTES.includes(tipo) || vaca.cruzado) continue;
      const [desde, hasta] = R.valida[tipo];
      if (distancia < desde || distancia > hasta) { if (!lance.suerte) lance.fuera = true; continue; }
      // Se queda la que más vale (un combo o un salto convertido en especial sustituyen a lo anterior)
      if (!lance.suerte || R.puntos[s.tipo] > R.puntos[lance.suerte]) { lance.suerte = s.tipo; lance.fuera = false; }
    }
    if (vaca.estado !== 'embiste') {
      if (vaca.cruzado && !jugador.seguro) {
        const antes = historial.length;
        puntua();
        const ultimo = historial.length > antes ? historial.at(-1) : null;
        if (ultimo && ultimo.tipo !== 'pase' && ultimo.riesgo >= R.lenta.riesgo) lenta = R.lenta.duraS;
      }
      lance = null;
    }
  }

  // Qué botones se iluminan: la vaca viene y está a distancia buena para esa suerte
  function listos(jugador, vaca) {
    const r = { quiebro: false, recorte: false, salto: false, especial: false };
    if (acabada || !vaca || vaca.estado !== 'embiste' || vaca.cruzado || jugador.seguro || (vaca.persigue ?? 'jugador') !== 'jugador') return r;
    const c = vaca.cuernos();
    const d = Math.hypot(jugador.x - c.x, jugador.z - c.z);
    for (const s of SUERTES) r[s] = d >= R.valida[s][0] && d <= R.valida[s][1];
    return r;
  }

  return {
    paso,
    listos,
    reinicia,
    get puntos() { return puntos; },
    get pases() { return pases; },
    get vida() { return vida; },
    get tiempo() { return mostrado ?? (sinFin ? Infinity : tiempo); },
    ponTiempo(segundos) { mostrado = segundos; },
    suma(cuantos) { puntos += cuantos; },
    avisa,
    get cogidas() { return cogidas; },
    get acabada() { return acabada; },
    get historial() { return historial; },
    get aviso() { return aviso; },
    get consejo() { return R.consejos[consejo]; },
    // 1 normal; menos durante la cámara lenta
    get ritmo() { return lenta > 0 ? R.lenta.ritmo : 1; },
    textoFuerza(fuerza) { return R.fuerza.find(([minimo]) => fuerza >= minimo)[1]; },
  };
}
