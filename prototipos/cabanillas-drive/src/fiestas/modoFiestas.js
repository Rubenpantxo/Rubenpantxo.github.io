// Modo fiestas: entrar y salir. Al entrar monta el festejo (vallado y ambiente) sobre el mismo
// mundo, con sus colisiones, y pone la hora de «Día»; al salir lo libera todo y deja el pueblo
// como estaba. Quién apaga el tráfico y los peatones y pasa al jugador a pie es juego.js.
// Este módulo y los que importa van en un archivo aparte (import() dinámico): quien solo
// conduce no los descarga.
import { CALIDAD } from '../config/calidad.js';
import { FIESTAS } from '../config/fiestas.js';
import { RECINTO_FIESTAS } from '../datos/fiestas.js';
import { creaHudFiestas } from '../hud/fiestas.js';
import { creaAmbiente } from './ambiente.js';
import { creaCamaraPersonaje } from './camaraPersonaje.js';
import { creaPersonaje } from './personaje.js';
import { creaRecortes } from './recortes.js';
import { creaVaca } from './vaca.js';
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

export function creaModoFiestas({ escena, terreno, fisica, personas, ciclo, farolas, peaton, camara, avisa = () => {} }) {
  const recinto = RECINTO_FIESTAS;
  let vallado = null;
  let ambiente = null;
  let modo = null;
  let horaAnterior = null;
  let farolasQuitadas = 0;
  let personaje = null;
  let camaraJugador = null;
  let hud = null;
  let vaca = null;               // posición de la vaca más cercana, para la cámara
  let vacas = [];                // por ahora, una (la manada es de la F5)
  let recortes = null;           // puntuación y marcador (F4)
  const parametros = new URLSearchParams(location.search);
  const conVacas = FIESTAS.vaca.activa && parametros.get('vacas') !== '0';
  const ACCIONES = ['quiebro', 'recorte', 'salto', 'especial', 'refugio'];

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
      // El jugador en tercera persona, su cámara y su marcador
      personaje = creaPersonaje({ peaton, terreno, recinto, personas, sombras: CALIDAD.sombras });
      escena.add(personaje.objeto);
      camaraJugador = creaCamaraPersonaje({ camara, fisica, terreno, colliderJugador: peaton.collider, transparentes: vallado.transparentes });
      hud = creaHudFiestas();
      recortes = creaRecortes();
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
    // La vaca: sale del corral a los pocos segundos. Capa con ?capa=colorada|negra|berrenda o al azar
    for (const v of vacas) v.libera();
    vacas = [];
    recortes.reinicia();
    if (conVacas) {
      const capas = FIESTAS.vaca.capas;
      const capa = capas.includes(parametros.get('capa')) ? parametros.get('capa') : capas[Math.floor(Math.random() * capas.length)];
      const una = creaVaca({ recinto, terreno, puertaAbierta: cual !== 'plaza', capa, semilla: Date.now() % 100000, sombras: CALIDAD.sombras });
      escena.add(una.objeto);
      vacas.push(una);
    }
  }

  function desmonta() {
    if (!vallado) return;
    for (const v of vacas) v.libera();
    vacas = [];
    vaca = null;
    personaje.libera();
    hud.quita();
    personaje = null;
    camaraJugador = null;
    hud = null;
    recortes = null;
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
      return conFundido(() => {
        monta(cual);
        const s = salida(cual);
        alMontar?.(s);                 // juego.js pone la cápsula del jugador en su sitio
        personaje.reinicia(s.guinada);
        camaraJugador.reinicia(s.guinada);
      }).then(() => true);
    },
    sale(alDesmontar) {
      if (modo === null) return Promise.resolve(false);
      return conFundido(() => { desmonta(); alDesmontar?.(); }).then(() => true);
    },
    actualiza(dt, camaraEscena) {
      ambiente?.actualiza(dt, camaraEscena);
    },
    get personaje() { return personaje; },
    get camaraJugador() { return camaraJugador; },
    // Acciones pulsadas (teclado o botones táctiles): se llama una vez por fotograma
    atiende(entrada) {
      if (!personaje) return;
      for (const a of ACCIONES) if (entrada.consume(a)) personaje.pide(a);
      if (entrada.consume('camaraFiestas')) personaje.objeto.visible = camaraJugador.cambiaVista() !== 'ojos';
    },
    // Paso de física del jugador
    paso(mandos, dtReal) {
      if (!personaje) return;
      const dt = dtReal * recortes.ritmo;          // cámara lenta en los recortes ceñidos
      personaje.paso(mandos, camaraJugador.guinada, dt);
      if (!vacas.length) return;
      const p = personaje.posicion();
      const suelo = terreno.alturaEn(p.x, p.z) + (dentroDe(recinto.plaza.ruedo, p.x, p.z) ? FIESTAS.arena.gruesoM : 0);
      const objetivo = { x: p.x, z: p.z, seguro: personaje.seguro || personaje.estado === 'cogido', alto: p.y - suelo };
      for (const v of vacas) {
        const suceso = v.paso(objetivo, dt);
        const cogido = suceso?.tipo === 'cogida' && personaje.cogida(suceso.dx, suceso.dz);
        objetivo.sucesos = personaje.sucesos;
        recortes.paso({ jugador: objetivo, vaca: v, suceso, cogido }, dt);
      }
    },
    get vacas() { return vacas; },
    get recortes() { return recortes; },
    // Cámara, animación y marcador: una vez por fotograma
    fotograma(dtReal, mirada, mandos) {
      if (!personaje) return;
      camaraJugador.mira(mirada.dx, mirada.dy, mandos.giro, dtReal);
      const dt = dtReal * recortes.ritmo;
      personaje.anima(dt);
      for (const v of vacas) v.anima(dt);
      if (vacas.length) vaca = vacas[0].estado === 'corral' ? null : vacas[0].posicion();
      const p = personaje.posicion();
      camaraJugador.coloca(p, dtReal, vaca);
      const una = vacas[0] ?? null;
      const yo = { x: p.x, z: p.z, seguro: personaje.seguro };
      const c = una?.cuernos();
      hud.actualiza({
        energia: personaje.energia, agotado: personaje.agotado, pista: personaje.pista, marcador: recortes,
        vaca: una && { estado: una.estado, fuerza: una.fuerza, distancia: Math.hypot(p.x - c.x, p.z - c.z) },
        listos: recortes.listos(yo, una),
      });
    },
    ponVaca(posicion) { vaca = posicion; },
    mostrarHud(visible) { hud?.mostrar(visible); },
    estadoJugador() { return personaje?.paraHud() ?? null; },
  };
}
