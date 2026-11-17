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

export function creaRecortes() {
  const R = FIESTAS.recortes;
  let puntos; let pases; let vida; let tiempo; let acabada; let espera; let cogidas;
  let lance;                 // la embestida en curso: { minimo, suerte, distancia, fuera }
  let ultimas;               // suertes puntuadas, para la variedad
  let vistoHasta;            // reloj del último suceso del jugador ya leído
  let lenta;                 // segundos de cámara lenta que quedan
  let aviso;                 // { texto, clase, t }
  let consejo; let tConsejo;
  const historial = [];      // lo puntuado en la tanda (para la prueba y el resumen)

  function reinicia() {
    puntos = 0; pases = 0; vida = 1; tiempo = R.tandaS; acabada = null; espera = 0; cogidas = 0;
    lance = null; ultimas = []; vistoHasta = -1; lenta = 0; aviso = null; consejo = 0; tConsejo = 0;
    historial.length = 0;
  }
  reinicia();

  const avisa = (texto, clase = '') => { aviso = { texto, clase, t: R.avisoS }; };
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

  // Un paso de física. jugador: { x, z, seguro, sucesos }; vaca: la de vaca.js (o null); suceso: lo
  // que devolvió vaca.paso en este paso, y si la cogida ha llegado a ser (el jugador no estaba ya por los aires)
  function paso({ jugador, vaca, suceso = null, cogido = false }, dt) {
    if (aviso && (aviso.t -= dt) <= 0) aviso = null;
    if (lenta > 0) lenta -= dt;
    tConsejo += dt;
    if (tConsejo > 9) { tConsejo = 0; consejo = (consejo + 1) % R.consejos.length; }
    if (acabada) {
      espera -= dt;
      if (espera <= 0) reinicia();
      return;
    }
    // Suertes nuevas del jugador
    const nuevas = jugador.sucesos.filter((s) => s.t > vistoHasta);
    if (jugador.sucesos.length) vistoHasta = jugador.sucesos.at(-1).t;
    if (!vaca || vaca.estado === 'corral' || vaca.estado === 'saliendo') return;   // el reloj corre desde que sale
    tiempo = Math.max(0, tiempo - dt);

    const c = vaca.cuernos();
    const distancia = Math.hypot(jugador.x - c.x, jugador.z - c.z);
    if (vaca.estado === 'embiste' && !lance) lance = { minimo: Infinity, suerte: null, fuera: false };
    if (lance) {
      if (!jugador.seguro) lance.minimo = Math.min(lance.minimo, distancia);
      for (const s of nuevas) {
        const tipo = s.tipo === 'combo' ? 'quiebro' : s.tipo;
        if (!SUERTES.includes(tipo) || vaca.cruzado) continue;
        const [desde, hasta] = R.valida[tipo];
        if (distancia < desde || distancia > hasta) { if (!lance.suerte) lance.fuera = true; continue; }
        // Se queda la que más vale (un combo o un salto convertido en especial sustituyen a lo anterior)
        if (!lance.suerte || R.puntos[s.tipo] > R.puntos[lance.suerte]) { lance.suerte = s.tipo; lance.fuera = false; }
      }
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
      } else if (vaca.estado !== 'embiste') {
        if (vaca.cruzado && !jugador.seguro) {
          puntua();
          const ultimo = historial.at(-1);
          if (ultimo && ultimo.tipo !== 'pase' && ultimo.riesgo >= R.lenta.riesgo) lenta = R.lenta.duraS;
        }
        lance = null;
      }
    }
    if (vida <= 0 || tiempo <= 0) {
      acabada = vida <= 0 ? 'vida' : 'tiempo';
      espera = R.otraTandaS;
      lance = null;
      aviso = { texto: `${vida <= 0 ? 'Sin vida' : 'Fin de la tanda'}: ${puntos} puntos, ${pases} pases`, clase: 'fin', t: R.otraTandaS };
    }
  }

  // Qué botones se iluminan: la vaca viene y está a distancia buena para esa suerte
  function listos(jugador, vaca) {
    const r = { quiebro: false, recorte: false, salto: false, especial: false };
    if (acabada || !vaca || vaca.estado !== 'embiste' || vaca.cruzado || jugador.seguro) return r;
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
    get tiempo() { return tiempo; },
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
