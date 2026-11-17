// Modo fiestas: entrar y salir. Al entrar monta el festejo (vallado y ambiente) sobre el mismo
// mundo, con sus colisiones, y pone la hora de «Día»; al salir lo libera todo y deja el pueblo
// como estaba. Quién apaga el tráfico y los peatones y pasa al jugador a pie es juego.js.
// Este módulo y los que importa van en un archivo aparte (import() dinámico): quien solo
// conduce no los descarga.
import { CALIDAD } from '../config/calidad.js';
import { FIESTAS } from '../config/fiestas.js';
import { RECINTO_FIESTAS } from '../datos/fiestas.js';
import { creaHudFiestas } from '../hud/fiestas.js';
import { apuntaMarca, creaMenuFiestas } from '../hud/menuFiestas.js';
import { creaAmbiente } from './ambiente.js';
import { creaCamaraPersonaje } from './camaraPersonaje.js';
import { creaPersonaje } from './personaje.js';
import { creaMozos, eligeObjetivos } from './mozos.js';
import { creaPartida } from './partida.js';
import { creaRecortes } from './recortes.js';
import { creaSonido } from './sonido.js';
import { creaCamino, creaVaca } from './vaca.js';
import { creaVallado } from './vallado.js';

export const NOMBRES_MODO = { plaza: 'Vacas en la plaza', concurso: 'Concurso en la plaza', calle: 'Vacas en la calle', encierro: 'Encierro',
  menu: 'Menú' };
// Lo que se pide al entrar → modo (dónde y con qué puerta) y variante
const ENTRADAS = {
  menu: { modo: 'plaza', variante: null },
  plaza: { modo: 'plaza', variante: 'libre' },
  concurso: { modo: 'plaza', variante: 'concurso' },
  calle: { modo: 'calle', variante: 'libre' },
  encierro: { modo: 'encierro', variante: 'libre' },
};
const QUIETO = { avance: 0, lateral: 0, correr: false, conJoystick: false, giro: 0 };

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

export function creaModoFiestas({ escena, terreno, fisica, personas, ciclo, farolas, peaton, camara, avisa = () => {}, salir = () => {} }) {
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
  let partida = null;            // el festejo en curso (F5); null en el menú o con ?vacas=0
  let entrada = null;            // lo último que se pidió: menu | plaza | concurso | calle | encierro
  let menu = null;
  let coloca = null;             // de juego.js: pone la cápsula del jugador en la salida
  let cambiando = false;
  let mozos = null;              // F6
  let sonido = null;
  let objetivosAntes = new Map(); // vaca → id de a quién iba
  let seguimiento = new Map();   // vaca → lo que hace falta para los sonidos y las reacciones
  let historialVisto = 0;
  let hayCohete = false;
  let pisadaM = 0;
  let emocion = -1;
  const camino = creaCamino(recinto);
  const sueloEn = (x, z) => terreno.alturaEn(x, z) + (dentroDe(recinto.plaza.ruedo, x, z) ? FIESTAS.arena.gruesoM : 0);
  const conMozos = (p) => p.get('mozos') !== '0';
  const parametros = new URLSearchParams(location.search);
  const conVacas = FIESTAS.vaca.activa && parametros.get('vacas') !== '0';
  const botonSonido = document.querySelector('[data-pulsar="sonido"]');
  const pintaBotonSonido = () => { if (botonSonido) botonSonido.textContent = sonido?.activo ? '🔊' : '🔇'; };
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
    if (cual === 'encierro') {
      // En la calle, cerca de la puerta y de espaldas a la plaza: la manada viene por detrás
      const { p, d } = enEje(recinto.calle.eje, FIESTAS.partida.encierro.salidaJugadorM);
      return { x: p[0], z: p[1], guinada: mirando(d) };
    }
    const c = centroide(recinto.plaza.ruedo);
    const { d } = enEje(recinto.plaza.eje, 5);
    return { x: c[0], z: c[1], guinada: mirando(d) };                      // mirando al tablado
  }

  function monta(pedido) {
    entrada = pedido;
    const { modo: cual, variante } = ENTRADAS[pedido];
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
      recortes = creaRecortes({ sinFin: true });
      menu = creaMenuFiestas();
      sonido = creaSonido();
      pintaBotonSonido();
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
    // Las vacas las suelta y las recoge la partida. Capa con ?capa=colorada|negra|berrenda
    for (const v of vacas) v.libera();
    vacas = [];
    vaca = null;
    recortes.reinicia();
    partida = null;
    quitaMozos();
    objetivosAntes = new Map();
    seguimiento = new Map();
    historialVisto = 0;
    hayCohete = false;
    if (conVacas && variante) {
      const capas = FIESTAS.vaca.capas;
      partida = creaPartida({
        modo: cual, variante, recortes, camino, corral: recinto.corral,
        suelta: (opciones) => {
          const capa = capas.includes(parametros.get('capa')) ? parametros.get('capa') : opciones.capa;
          const una = creaVaca({ recinto, terreno, puertaAbierta: cual !== 'plaza', semilla: Math.floor(Math.random() * 100000),
            sombras: CALIDAD.sombras, ...opciones, capa });
          escena.add(una.objeto);
          vacas.push(una);
          return una;
        },
        retira: (una) => {
          una.libera();
          vacas = vacas.filter((v) => v !== una);
        },
      });
      // Los mozos (F6): en la plaza, menos
      const cuantos = Math.round((FIESTAS.mozos.cantidad[CALIDAD.nivel] ?? FIESTAS.mozos.cantidad.medio) * (cual === 'plaza' ? FIESTAS.mozos.enPlaza : 1));
      if (conMozos(parametros) && cuantos > 0 && personas?.modelos?.length) {
        mozos = creaMozos({ recinto, modo: cual, puertaAbierta: cual !== 'plaza', camino, alturaSuelo: sueloEn, personas, cantidad: cuantos,
          semilla: Math.floor(Math.random() * 100000), sombras: CALIDAD.sombras, excluye: FIESTAS.personaje.modelo, nivel: CALIDAD.nivel });
        escena.add(mozos.grupo);
      }
    }
  }
  function quitaMozos() { mozos?.libera(); mozos = null; }

  // Lo que pasa con cada vaca y lo que provoca: cohete, golpes en la valla, olés a los mozos
  function sigueVaca(v, antes, suceso, objetivo) {
    let t = seguimiento.get(v);
    if (!t) { t = { n: seguimiento.size, cencerro: Math.random(), pezuna: 0, minimo: Infinity }; seguimiento.set(v, t); }
    const q = v.posicion();
    if (antes === 'corral' && v.estado === 'saliendo' && !hayCohete) {
      hayCohete = true;
      sonido?.cohete();
      sonido?.aplauso(0.6);
      ambiente.publico.reacciona('aplauso', 0.75, q.x, q.z);
    }
    if (suceso?.tipo === 'golpe') {
      const fuerza = Math.min(1, suceso.velocidad / FIESTAS.vaca.galopeMs);
      sonido?.golpe({ x: q.x, y: sueloEn(q.x, q.z) + 1, z: q.z }, 0.5 + fuerza * 0.5);
      vallado.vibra(q.x, q.z, Math.sin(v.rumbo), Math.cos(v.rumbo), 0.4 + fuerza * 0.6);
    }
    // Un mozo que la deja pasar cerca: olé
    if (v.estado === 'embiste' && objetivo.mozo) t.minimo = Math.min(t.minimo, Math.hypot(objetivo.x - q.x, objetivo.z - q.z));
    if (antes === 'embiste' && v.estado !== 'embiste') {
      if (objetivo.mozo && suceso?.tipo !== 'cogida' && v.cruzado && t.minimo < 2.4) {
        ambiente.publico.reacciona('ole', 0.45, q.x, q.z);
        sonido?.ole(0.45);
      }
      t.minimo = Infinity;
    }
  }

  // El público y el sonido responden a lo que puntúa el jugador
  function reaccionaAlJugador(p) {
    const h = recortes.historial;
    for (; historialVisto < h.length; historialVisto++) {
      const e = h[historialVisto];
      if (e.tipo.startsWith('cogida')) continue;              // ya respondido al cogerlo
      if (e.tipo === 'pase') {
        if (e.riesgo >= 0.5) { ambiente.publico.reacciona('aplauso', 0.35, p.x, p.z); sonido?.aplauso(0.35); }
      } else if (e.riesgo >= 0.4) {
        const fuerza = 0.5 + 0.5 * e.riesgo;
        ambiente.publico.reacciona('ole', fuerza, p.x, p.z);
        sonido?.ole(fuerza);
        sonido?.aplauso(fuerza * 0.6);
      } else {
        ambiente.publico.reacciona('aplauso', 0.45, p.x, p.z);
        sonido?.aplauso(0.45);
      }
    }
  }

  // Monta lo pedido con la pantalla en negro y deja al jugador en su salida
  function empieza(pedido) {
    if (cambiando) return Promise.resolve(false);
    cambiando = true;
    return conFundido(() => {
      monta(pedido);
      const s = salida(modo);
      coloca?.(s);
      personaje.reinicia(s.guinada);
      camaraJugador.reinicia(s.guinada);
      personaje.objeto.visible = true;
      if (pedido === 'menu') abreMenu(); else menu.oculta();
    }).then(() => true).finally(() => { cambiando = false; });
  }
  function elige(id) {
    if (id === 'salir') { menu.oculta(); salir(); } else empieza(id);
  }
  function abreMenu() { menu.menu(elige); }
  // Fin de la partida: resultados, con la mejor marca
  function termina(resultado) {
    const marca = apuntaMarca(entrada, resultado.puntos);
    partida = null;
    vaca = null;
    quitaMozos();
    if (resultado.motivo !== 'abandono') {
      sonido?.aplauso(0.9);
      const p = personaje.posicion();
      ambiente.publico.reacciona('aplauso', 0.9, p.x, p.z);
    }
    menu.resultados({ ...resultado, id: entrada, ...marca }, {
      repetir: () => empieza(entrada),
      menu: () => empieza('menu'),
      salir: () => elige('salir'),
    });
  }

  // Cencerros y pezuñas de las vacas, pisadas del jugador y el murmullo, que sube con la emoción
  function sonidos(dt, p) {
    if (!sonido) return;
    sonido.escucha(camara);
    let nivel = 0.15;
    for (const v of vacas) {
      if (v.guardada || v.estado === 'corral') continue;
      let t = seguimiento.get(v);
      if (!t) { t = { n: seguimiento.size, cencerro: Math.random(), pezuna: 0, minimo: Infinity }; seguimiento.set(v, t); }
      const q = v.posicion(); const vel = v.velocidad;
      const y = sueloEn(q.x, q.z);
      if (vel > 0.3) {
        t.cencerro += dt * (0.7 + vel * 0.32);
        if (t.cencerro >= 1) { t.cencerro -= 1 + Math.random() * 0.25; sonido.cencerro(t.n, { x: q.x, y: y + 1.1, z: q.z }, Math.min(1, 0.35 + vel / 7)); }
      }
      const lejos = Math.hypot(q.x - camara.position.x, q.z - camara.position.z);
      if (vel > 3 && lejos < 35) {
        t.pezuna += dt * vel * 0.55;
        if (t.pezuna >= 1) { t.pezuna -= 1; sonido.pezuna({ x: q.x, y, z: q.z }, Math.min(1, vel / FIESTAS.vaca.galopeMs)); }
      }
      if (v.estado === 'embiste' && Math.hypot(q.x - p.x, q.z - p.z) < 25) nivel = Math.max(nivel, 0.65);
    }
    if (Math.abs(nivel - emocion) > 0.05) { emocion = nivel; sonido.ambiente(nivel); }
    // Pisadas del jugador en el suelo
    const vj = personaje.velocidad(); const rapidez = Math.hypot(vj.x, vj.z);
    if (personaje.estado !== 'refugiado' && personaje.estado !== 'cogido' && !personaje.enAire && rapidez > 0.6) {
      pisadaM += rapidez * dt;
      if (pisadaM >= Math.max(FIESTAS.sonido.pisadaCadaM, rapidez * 0.3)) { pisadaM = 0; sonido.pisada(Math.min(1, 0.4 + rapidez / 7)); }
    }
  }

  function desmonta() {
    if (!vallado) return;
    for (const v of vacas) v.libera();
    vacas = [];
    vaca = null;
    personaje.libera();
    quitaMozos();
    sonido?.libera();
    sonido = null;
    hud.quita();
    personaje = null;
    camaraJugador = null;
    hud = null;
    menu.quita();
    menu = null;
    partida = null;
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
      if (!FIESTAS.entradas.includes(cual)) return Promise.resolve(false);
      coloca = alMontar;               // juego.js pone la cápsula del jugador en su sitio
      return empieza(cual);
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
      for (const a of ACCIONES) if (entrada.consume(a) && !menu.visible) personaje.pide(a);
      if (entrada.consume('sonido') && sonido) {
        const si = sonido.alterna();
        pintaBotonSonido();
        avisa(si ? 'Sonido: sí' : 'Sonido: no', 1.5);
      }
      if (entrada.consume('camaraFiestas')) personaje.objeto.visible = camaraJugador.cambiaVista() !== 'ojos';
    },
    // Paso de física del jugador
    paso(mandos, dtReal) {
      if (!personaje) return;
      const dt = dtReal * recortes.ritmo;          // cámara lenta en los recortes ceñidos
      personaje.paso(menu.visible ? QUIETO : mandos, camaraJugador.guinada, dt);   // con el menú delante no se mueve
      if (!partida) return;
      const p = personaje.posicion();
      const vel = personaje.velocidad();
      partida.paso({ x: p.x, z: p.z, seguro: personaje.seguro || personaje.estado === 'cogido', vx: vel.x, vz: vel.z }, dt);
      if (partida.resultado) { termina(partida.resultado); return; }
      const objetivo = { id: 'jugador', x: p.x, z: p.z, seguro: personaje.seguro || personaje.estado === 'cogido', alto: p.y - sueloEn(p.x, p.z) };
      mozos?.paso(dt, { vacas, jugador: objetivo, manada: partida.manada });
      // A quién va cada vaca: el jugador o un mozo (en el encierro, la manada va a lo suyo)
      const elegidos = mozos && !partida.manada ? eligeObjetivos(vacas, objetivo, mozos.objetivos(), objetivosAntes) : null;
      const lista = vacas.map((v) => {
        const elegido = elegidos?.get(v);
        const o = !elegido || elegido.id === 'jugador' ? objetivo : (mozos.objetivo(elegido.id) ?? objetivo);
        v.persigue = o.id;
        const antes = v.estado;
        const suceso = v.paso(o, dt);
        let cogido = false;
        if (suceso?.tipo === 'cogida') {
          const q = v.posicion();
          if (o === objetivo) cogido = personaje.cogida(suceso.dx, suceso.dz);
          else if (o.mozo) mozos.cogida(o.mozo, suceso.dx, suceso.dz);
          if (cogido || o.mozo) {
            ambiente.publico.reacciona('uy', o.mozo ? 0.7 : 1, q.x, q.z);
            sonido?.uy(o.mozo ? 0.7 : 1);
          }
        }
        sigueVaca(v, antes, suceso, o);
        return { vaca: v, suceso: o === objetivo ? suceso : null, cogido };
      });
      objetivosAntes = new Map(vacas.map((v) => [v, v.persigue]));
      objetivo.sucesos = personaje.sucesos;
      recortes.paso({ jugador: objetivo, vacas: lista }, dt);
      reaccionaAlJugador(p);
    },
    get vacas() { return vacas; },
    get recortes() { return recortes; },
    get partida() { return partida; },
    get menu() { return menu; },
    get entrada() { return entrada; },
    // Dejar la partida a medias (desde la pausa): enseña el resultado con lo que se lleve
    abandona() { if (partida) termina(partida.abandona()); },
    // Cámara, animación y marcador: una vez por fotograma
    fotograma(dtReal, mirada, mandos) {
      if (!personaje) return;
      camaraJugador.mira(mirada.dx, mirada.dy, mandos.giro, dtReal);
      const dt = dtReal * recortes.ritmo;
      personaje.anima(dt);
      for (const v of vacas) v.anima(dt);
      mozos?.anima(dt, camara);
      vallado.avanza(dt);
      const p = personaje.posicion();
      sonidos(dt, p);
      // La vaca más cercana de las que andan sueltas: para la cámara y para el panel de la vaquilla
      let una = null; let cerca = Infinity;
      for (const v of vacas) {
        if (v.guardada) continue;
        const q = v.posicion();
        const d = (v.estado === 'corral' ? 1000 : 0) + Math.hypot(q.x - p.x, q.z - p.z);
        if (d < cerca) { cerca = d; una = v; }
      }
      if (vacas.length || partida) vaca = una && una.estado !== 'corral' ? una.posicion() : null;
      camaraJugador.coloca(p, dtReal, vaca);
      const yo = { x: p.x, z: p.z, seguro: personaje.seguro };
      const c = una?.cuernos();
      hud.actualiza({
        energia: personaje.energia, agotado: personaje.agotado, pista: personaje.pista, marcador: partida ? recortes : null,
        vaca: una && { estado: una.estado, fuerza: una.fuerza, distancia: Math.hypot(p.x - c.x, p.z - c.z) },
        listos: recortes.listos(yo, una),
      });
    },
    ponVaca(posicion) { vaca = posicion; },
    mostrarHud(visible) { hud?.mostrar(visible); sonido?.silencia(!visible); },
    get mozos() { return mozos; },
    get sonido() { return sonido; },
    get publico() { return ambiente?.publico ?? null; },
    estadoJugador() { return personaje?.paraHud() ?? null; },
  };
}
