// Modo fiestas: entrar y salir. Al entrar monta el festejo (vallado y ambiente) sobre el mismo
// mundo, con sus colisiones, y pone la hora de «Día»; al salir lo libera todo y deja el pueblo
// como estaba. Quién apaga el tráfico y los peatones y pasa al jugador a pie es juego.js.
// Este módulo y los que importa van en un archivo aparte (import() dinámico): quien solo
// conduce no los descarga.
import { CALIDAD } from '../config/calidad.js';
import { FIESTAS } from '../config/fiestas.js';
import { RECINTO_FIESTAS } from '../datos/fiestas.js';
import { creaAmbiente } from './ambiente.js';
import { creaVallado } from './vallado.js';

export const NOMBRES_MODO = { plaza: 'Vacas en la plaza', calle: 'Vacas en la calle', encierro: 'Encierro' };

function centroide(poligono) {
  let x = 0; let z = 0;
  for (const p of poligono) { x += p[0]; z += p[1]; }
  return [x / poligono.length, z / poligono.length];
}

// Punto del eje a «metros» de su principio y dirección del eje allí
function enEje(eje, metros) {
  let resto = metros;
  for (let i = 0; i + 1 < eje.length; i++) {
    const largo = Math.hypot(eje[i + 1][0] - eje[i][0], eje[i + 1][1] - eje[i][1]);
    const d = [(eje[i + 1][0] - eje[i][0]) / largo, (eje[i + 1][1] - eje[i][1]) / largo];
    if (resto <= largo || i + 2 === eje.length) return { p: [eje[i][0] + d[0] * resto, eje[i][1] + d[1] * resto], d };
    resto -= largo;
  }
  return null;
}

// ¿Está (x, z) dentro del polígono?
function dentroDe(poligono, x, z) {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, zi] = poligono[i]; const [xj, zj] = poligono[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
  }
  return dentro;
}

export function creaModoFiestas({ escena, terreno, fisica, personas, ciclo, farolas }) {
  const recinto = RECINTO_FIESTAS;
  let vallado = null;
  let ambiente = null;
  let modo = null;
  let horaAnterior = null;
  let farolasQuitadas = 0;

  // Fundido a negro
  const velo = document.createElement('div');
  velo.style.cssText = `position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:9;transition:opacity ${FIESTAS.fundidoS}s`;
  document.body.append(velo);
  const espera = (s) => new Promise((r) => { setTimeout(r, s * 1000); });
  async function conFundido(accion) {
    velo.style.opacity = '1';
    await espera(FIESTAS.fundidoS);
    try { accion(); } finally { velo.style.opacity = '0'; }
  }

  // Dónde aparece el jugador: { x, z, guinada } (guiñada 0 = mirando al norte)
  function salida(cual) {
    const mirando = (d) => Math.atan2(-d[0], -d[1]);
    if (cual === 'calle') {
      const { p, d } = enEje(recinto.calle.eje, 45);
      return { x: p[0], z: p[1], guinada: mirando([-d[0], -d[1]]) };       // hacia la plaza
    }
    const c = centroide(recinto.plaza.ruedo);
    const { d } = enEje(recinto.plaza.eje, 5);
    // En la plaza, mirando al tablado; en el encierro, mirando a la puerta
    return { x: c[0], z: c[1], guinada: mirando(cual === 'encierro' ? [-d[0], -d[1]] : d) };
  }

  function monta(cual) {
    modo = cual;
    if (!vallado) {
      vallado = creaVallado(recinto, { terreno, fisica, sombras: CALIDAD.sombras });
      ambiente = creaAmbiente(recinto, {
        terreno, fisica, personas, sitiosGradas: vallado.sitiosGradas, materiales: vallado.materiales, sombras: CALIDAD.sombras,
      });
      escena.add(vallado.raiz, ambiente.raiz);
      // Fuera las farolas que caen en el ruedo o en el recorrido (las de las aceras se quedan)
      farolasQuitadas = farolas?.oculta((x, z) => dentroDe(recinto.plaza.ruedo, x, z) || dentroDe(recinto.calle.recorrido, x, z)) ?? 0;
      // Hora de «Día», sin tocar lo que el jugador tenía elegido (se repone al salir)
      if (ciclo) {
        horaAnterior = ciclo.modo;
        let guardada = null;
        try { guardada = localStorage.getItem('cabanillas.hora'); } catch { /* nada */ }
        ciclo.ponModo('dia');
        try {
          if (guardada === null) localStorage.removeItem('cabanillas.hora');
          else localStorage.setItem('cabanillas.hora', guardada);
        } catch { /* nada */ }
      }
    }
    // Cerrada solo en «Vacas en la plaza»
    vallado.ponPuerta(cual !== 'plaza');
  }

  function desmonta() {
    if (!vallado) return;
    ambiente.libera();
    vallado.libera();
    farolas?.repone();
    vallado = null;
    ambiente = null;
    modo = null;
    if (ciclo && horaAnterior && horaAnterior !== ciclo.modo) ciclo.ponModo(horaAnterior);
    horaAnterior = null;
  }

  return {
    recinto,
    dentroDe,
    get activo() { return modo !== null; },
    get modo() { return modo; },
    get resumen() {
      return vallado ? { modo, puertaAbierta: vallado.puertaAbierta, farolasQuitadas, ...ambiente.resumen } : null;
    },
    salida,
    // «alMontar» se llama con la pantalla en negro, ya montado el festejo (para colocar al jugador)
    entra(cual, alMontar) {
      if (!FIESTAS.modos.includes(cual)) return Promise.resolve(false);
      return conFundido(() => { monta(cual); alMontar?.(salida(cual)); }).then(() => true);
    },
    sale(alDesmontar) {
      if (modo === null) return Promise.resolve(false);
      return conFundido(() => { desmonta(); alDesmontar?.(); }).then(() => true);
    },
    actualiza(dt, camara) {
      ambiente?.actualiza(dt, camara);
    },
  };
}
