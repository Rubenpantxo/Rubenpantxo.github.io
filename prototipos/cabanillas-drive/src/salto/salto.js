// Salto en paracaídas al empezar (PLAN_SALTO.md): máquina de estados de seis fases.
//   avion → salida (0,6 s) → caida → apertura (1,1 s) → planeo → aterrizaje (1,2 s) → fin
// Se encarga del avión, el personaje, el paracaídas, la cámara y el render según la altura.
// El juego (juego.js) le pasa los mandos y, al tocar el suelo, coloca al jugador a pie y el coche.
import * as THREE from 'three';
import { SALTO } from '../config/salto.js';
import { creaRuta } from './ruta.js';
import { alturaApertura, dentroDeZona, pasoApertura, pasoCaida, pasoDesvio, pasoPlaneo, pesoDesvio, prediceAterrizaje } from './caida.js';
import { creaAvion, creaParacaidas, creaPersonaje, liberaFigura } from './figuras.js';
import { preparaAvion, preparaMochila } from './modelos.js';
import { POSTURAS_SALTO, creaPersonaSalto } from './persona.js';
import { creaSonidoSalto } from './sonidoSalto.js';
import { creaCamaraSalto } from './camaraSalto.js';
import { creaAlturaRender } from './alturaRender.js';

const LEJOS = new THREE.Vector3(1e6, 0, 1e6);   // «ningún detalle cerca»
const suave = (t) => t * t * (3 - 2 * t);

// zona: { mitadAncho, mitadAlto }; centro: punto del casco {x, z}
// suelo(x, z): altura de lo que hay debajo (terreno o tejado)
// alTocarSuelo(toque, rumbo) → { colocaDestino(objeto3D), fov } : el juego pone al jugador a pie
// alTerminar(omitido): el juego vuelve a su modo normal (omitido: se ha saltado el salto antes de tocar el suelo)
// detalles: funciones (valor) => … para ocultar detalle en lo alto (src/salto/alturaRender.js)
// modelos: { avion, mochila } de modelos.js (null: figuras provisionales)
// buscaCalle(desde {x, y, z}, hasta {x, z}) → {x, z} de la calle adonde desviarse si «hasta» (el
//   aterrizaje previsto) no sirve para posarse, o null (aterrizaje.js, calleDesvio)
export function creaSalto({ escena, camara, terreno, render, zona, centro, semilla, suelo, tactil = false, detalles = [],
  modelos = null, personas = null, conSonido = true, buscaCalle = () => null,
  avisa = () => {}, alTocarSuelo, alTerminar }) {
  const ruta = creaRuta({ semilla, centro, alturaSuelo: terreno.alturaEn(centro.x, centro.z) });
  const camaraSalto = creaCamaraSalto({ camara, terreno });
  const alturaRender = creaAlturaRender({ camara, escena, render, detalles });
  const sonido = conSonido ? creaSonidoSalto() : creaSonidoSalto.nulo;
  const avion = modelos?.avion ? preparaAvion(modelos.avion) : creaAvion();
  // La persona de MakeHuman con sus posturas (o, si no hay personas cargadas, la cápsula)
  const persona = creaPersonaSalto(personas);
  const personaje = persona ?? creaPersonaje();
  const cuerpoVisible = (v) => {
    if (persona) persona.userData.cuerpo.visible = v;
    else for (const h of personaje.children.slice(0, 2)) h.visible = v;
  };
  // Mochila-paracaídas en la espalda (o, sin el modelo, la lona provisional sobre los hombros)
  const mochila = modelos?.mochila ? preparaMochila(modelos.mochila) : null;
  const paracaidas = mochila ? null : creaParacaidas();
  if (mochila) {
    if (persona) mochila.position.copy(persona.userData.espalda);
    else mochila.position.set(...SALTO.modelos.mochilaEnEspalda);
    personaje.add(mochila);
  } else {
    paracaidas.position.y = 1.45;
    paracaidas.visible = false;
    personaje.add(paracaidas);
  }
  // k: 0 = cerrado … 1 = abierto del todo
  const ponApertura = (k) => {
    if (mochila) { mochila.userData.ponApertura(k); return; }
    paracaidas.visible = k > 0;
    paracaidas.userData.ponInflado(k);
  };
  // Al aterrizar: k 0 … 1 = la lona cae y se pliega
  const ponPliegue = (k) => {
    if (mochila) { mochila.userData.ponPliegue(k); return; }
    paracaidas.userData.ponInflado(1 - k);
    paracaidas.position.y = 1.45 - 1.4 * k;
  };
  personaje.visible = false;
  personaje.rotation.order = 'YXZ';
  // Marca en el suelo del punto previsto de aterrizaje
  const marca = new THREE.Mesh(new THREE.RingGeometry(5, 7, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffe000, transparent: true, opacity: 0.8, depthWrite: false }));
  marca.name = 'salto_marca';
  marca.visible = false;
  escena.add(avion, personaje, marca);

  let fase = 'avion';
  let tiempoFase = 0;
  let s = ruta.inicio;                  // recorrido del avión (m desde el punto central)
  const posAvion = ruta.punto(s, new THREE.Vector3());
  const cuerpo = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rumbo: ruta.rumbo };
  const centroCamara = new THREE.Vector3();
  let prevision = { x: 0, z: 0 };
  const focoEdificios = new THREE.Vector3();
  let alturaCamara = SALTO.avion.alturaM;
  let alturaJugador = SALTO.avion.alturaM;
  let inclinacion = 0;
  // Aterrizaje: de la cámara en tercera persona a los ojos del personaje
  const desde = { posicion: new THREE.Vector3(), giro: new THREE.Quaternion(), fov: 60 };
  const destino = new THREE.Object3D();
  let colocaDestino = null;
  let fovDestino = 70;
  let terminado = false;
  // Desvío a la calle en los últimos metros: el objetivo se fija la primera vez que hace falta
  const desvio = { objetivo: null, peso: 0, espera: 0 };

  avion.position.copy(posAvion);
  avion.rotation.y = ruta.rumbo;
  alturaRender.activa();
  let avisado = false;              // el primer aviso, al empezar a jugar (no en la pantalla de inicio)

  function cambia(nueva) {
    fase = nueva;
    tiempoFase = 0;
  }

  function salta() {
    // Por el final de la rampa trasera, con la velocidad del avión
    const atras = SALTO.avion.salidaAtrasM;
    cuerpo.x = posAvion.x - ruta.dx * atras;
    cuerpo.y = posAvion.y - SALTO.avion.salidaBajoM;
    cuerpo.z = posAvion.z - ruta.dz * atras;
    cuerpo.vx = ruta.dx * SALTO.avion.velocidadMs;
    cuerpo.vz = ruta.dz * SALTO.avion.velocidadMs;
    cuerpo.vy = 0;
    cuerpo.rumbo = ruta.rumbo;
    personaje.visible = true;
    camaraSalto.reiniciaMirada();
    cambia('salida');
    avisa(tactil ? 'Joystick: arriba picar, abajo frenar, a los lados girar · 🪂 abrir'
      : 'W picar · S frenar · A y D (o ratón) girar · Espacio: abrir el paracaídas', 6);
  }

  function abre() {
    cambia('apertura');
    sonido.golpe();
  }

  function tocaSuelo() {
    marca.visible = false;
    desde.posicion.copy(camara.position);
    desde.giro.copy(camara.quaternion);
    desde.fov = camara.fov;
    const r = alTocarSuelo({ x: cuerpo.x, z: cuerpo.z }, cuerpo.rumbo);
    colocaDestino = r.colocaDestino;
    fovDestino = r.fov;
    // La lona cae donde ha tocado el suelo y se pliega
    personaje.position.set(cuerpo.x, suelo(cuerpo.x, cuerpo.z), cuerpo.z);
    cambia('aterrizaje');
  }

  function termina(omitido = false) {
    if (terminado) return;
    terminado = true;
    alturaRender.restaura();
    sonido.libera();
    for (const f of [avion, personaje, marca]) liberaFigura(f);
    alTerminar?.(omitido);
  }

  function mueveAvion(dt) {
    if (!avion.parent) return;
    s += SALTO.avion.velocidadMs * dt;
    ruta.punto(s, posAvion);
    avion.position.copy(posAvion);
    if (avion.userData.giraHelices) avion.userData.giraHelices(dt * 40);
    else for (const h of avion.userData.helices) h.rotation.z += dt * 40;
    if (s > ruta.fin && fase !== 'avion') liberaFigura(avion);
  }

  // Postura del personaje provisional: tumbado boca abajo en la caída (más de cabeza al picar),
  // de pie colgado del paracaídas
  function colocaPersonaje(dt, entrada) {
    const k = 1 - Math.exp(-dt * 4);
    const enCaida = fase === 'salida' || fase === 'caida';
    const objetivoX = enCaida ? -Math.PI / 2 - (entrada.avance > 0 ? 0.55 : entrada.avance < 0 ? -0.35 : 0) : 0;
    inclinacion += (-(entrada.lateral ?? 0) * (enCaida ? 0.5 : 0.25) - inclinacion) * k;
    personaje.rotation.x += (objetivoX - personaje.rotation.x) * k;
    personaje.rotation.y = cuerpo.rumbo;
    personaje.rotation.z = inclinacion;
    // En la caída gira alrededor del centro del cuerpo, no de los pies
    const centroY = enCaida ? -0.9 : 0;
    personaje.position.set(cuerpo.x, cuerpo.y + centroY, cuerpo.z);
    if (persona) {
      const a = entrada.avance ?? 0;
      const postura = enCaida ? (a > 0 ? POSTURAS_SALTO.picado : a < 0 ? POSTURAS_SALTO.frenado : POSTURAS_SALTO.caida)
        : alturaJugador < SALTO.persona.alturaPosarseM ? POSTURAS_SALTO.posarse : POSTURAS_SALTO.colgado;
      persona.userData.actualiza(dt, postura, fase === 'apertura' ? 3 : 5);
    }
  }

  // Un fotograma. «entrada»: mandos del juego; «mirada»: px de ratón o dedo; «paracaidas»: pulsado
  function actualiza(dt, entrada, mirada, pulsaParacaidas) {
    if (terminado) return;
    if (!avisado) {
      avisado = true;
      avisa(`✈️ Sobre Cabanillas · ${tactil ? '🪂' : 'Espacio'}: saltar · ${tactil ? 'arrastra para mirar · ☰' : 'clic y ratón: mirar · Esc'}: saltarse el salto`, 8);
    }
    tiempoFase += dt;
    mueveAvion(dt);
    sonido.actualiza({
      velocidad: fase === 'avion' ? 0 : Math.hypot(cuerpo.vx, cuerpo.vy, cuerpo.vz),
      distanciaAvion: !avion.parent ? Infinity : fase === 'avion' ? 0
        : Math.hypot(posAvion.x - cuerpo.x, posAvion.y - cuerpo.y, posAvion.z - cuerpo.z),
      enAvion: fase === 'avion',
    });
    const enAvion = fase === 'avion';
    camaraSalto.mira(mirada.dx, mirada.dy, enAvion);
    // El ratón en horizontal gira el rumbo fuera del avión
    if (!enAvion && fase !== 'aterrizaje') cuerpo.rumbo -= mirada.dx * SALTO.camara.sensibilidad;

    if (fase === 'avion') {
      if (pulsaParacaidas) salta();
      else if (s >= ruta.saltoForzoso) { avisa('¡Fuera! El avión llega al final de la ruta', 3); salta(); }
    }
    if (fase === 'salida' || fase === 'caida' || fase === 'apertura' || fase === 'planeo') {
      const sueloY = suelo(cuerpo.x, cuerpo.z);
      alturaJugador = cuerpo.y - sueloY;
      if (fase === 'salida' || fase === 'caida') {
        pasoCaida(cuerpo, entrada, dt);
        if (fase === 'salida' && tiempoFase >= 0.6) cambia('caida');
        if (pulsaParacaidas) {
          if (alturaJugador <= SALTO.apertura.alturaManualMaxM) abre();
          else avisa(`Aún muy alto: abre por debajo de ${SALTO.apertura.alturaManualMaxM} m`, 2);
        } else if (alturaJugador <= alturaApertura(cuerpo.vy)) {
          abre();
        }
      } else if (fase === 'apertura') {
        pasoApertura(cuerpo, entrada, dt);
        const k = Math.min(1, tiempoFase / SALTO.apertura.duracionS);
        ponApertura(k);
        if (k >= 1) {
          cambia('planeo');
          camaraSalto.reiniciaMirada();
          avisa(tactil ? 'Paracaídas · joystick: velocidad y giro' : 'Paracaídas · W/S velocidad · A y D girar', 4);
        }
      } else {
        pasoPlaneo(cuerpo, entrada, dt, alturaJugador);
        actualizaDesvio(dt);
      }
      dentroDeZona(cuerpo, zona.mitadAncho, zona.mitadAlto, SALTO.aterrizaje.margenZonaM);
      const sueloNuevo = suelo(cuerpo.x, cuerpo.z);
      alturaJugador = cuerpo.y - sueloNuevo;
      // Previsión (para la marca y para cargar antes el detalle de ese sitio)
      prevision = prediceAterrizaje(cuerpo, Math.max(0, alturaJugador), fase === 'planeo' || fase === 'apertura' ? 'planeo' : 'caida');
      marca.visible = true;
      marca.position.set(prevision.x, suelo(prevision.x, prevision.z) + 0.3, prevision.z);
      marca.scale.setScalar(THREE.MathUtils.clamp(alturaJugador / 120, 0.4, 3));
      colocaPersonaje(dt, entrada);
      if (alturaJugador <= 0) {
        cuerpo.y = sueloNuevo;
        tocaSuelo();
      }
    }

    if (fase === 'aterrizaje') {
      const k = Math.min(1, tiempoFase / SALTO.aterrizaje.duracionS);
      ponPliegue(k);
      colocaDestino?.(destino);
      const e = suave(k);
      camara.position.lerpVectors(desde.posicion, destino.position, e);
      camara.quaternion.slerpQuaternions(desde.giro, destino.quaternion, e);
      camara.fov = THREE.MathUtils.lerp(desde.fov, fovDestino, e);
      camara.updateProjectionMatrix();
      if (k >= 0.35) cuerpoVisible(false);
      alturaCamara = camara.position.y - terreno.alturaEn(camara.position.x, camara.position.z);
      alturaRender.actualiza(alturaCamara);
      if (k >= 1) termina();
      return;
    }
    colocaCamara(dt);
  }

  // Por debajo de alturaInicioM: si el aterrizaje previsto cae en un tejado o en el agua, busca
  // la calle (pocas veces por segundo) y, desde entonces, se va desviando hacia ella cada vez más
  function actualizaDesvio(dt) {
    const D = SALTO.planeo.desvio;
    if (alturaJugador > D.alturaInicioM) return;
    if (!desvio.objetivo) {
      desvio.espera -= dt;
      if (desvio.espera > 0) return;
      desvio.espera = D.cadaS;
      desvio.objetivo = buscaCalle(cuerpo, prevision);
      if (!desvio.objetivo) return;
      avisa('Debajo hay un tejado: el paracaídas te lleva a la calle', 3);
    }
    // No baja: al salir del tejado la altura sobre el suelo crece de golpe y no debe devolver el control
    desvio.peso = Math.max(desvio.peso, pesoDesvio(Math.max(0, alturaJugador)));
    pasoDesvio(cuerpo, desvio.objetivo, desvio.peso, dt, Math.max(0, alturaJugador));
  }

  // Cámara (también en pausa, con dt = 0)
  function colocaCamara(dt) {
    if (terminado || fase === 'aterrizaje') return;
    const enAvion = fase === 'avion';
    if (enAvion) centroCamara.copy(posAvion);
    else centroCamara.set(cuerpo.x, cuerpo.y, cuerpo.z);
    const faseCamara = enAvion ? 'avion' : fase === 'planeo' || fase === 'apertura' ? 'planeo' : 'caida';
    camaraSalto.actualiza(dt, faseCamara, centroCamara, enAvion ? ruta.rumbo : cuerpo.rumbo);
    alturaCamara = camara.position.y - terreno.alturaEn(camara.position.x, camara.position.z);
    alturaRender.actualiza(alturaCamara);
  }

  return {
    get activo() { return !terminado; },
    get fase() { return fase; },
    get altura() { return fase === 'avion' ? posAvion.y - terreno.alturaEn(posAvion.x, posAvion.z) : alturaJugador; },
    get alturaCamara() { return alturaCamara; },
    get prevision() { return prevision; },
    get desvio() { return { objetivo: desvio.objetivo, peso: desvio.peso }; },
    // Pruebas: pone al paracaidista planeando a «altura» m sobre (x, z), con rumbo «rumbo»
    ponPlaneo(x, z, altura, rumbo = 0) {
      if (fase !== 'planeo') return false;
      Object.assign(cuerpo, { x, z, y: suelo(x, z) + altura, rumbo, vy: -SALTO.planeo.bajadaMs,
        vx: -Math.sin(rumbo) * SALTO.planeo.avanceMs, vz: -Math.cos(rumbo) * SALTO.planeo.avanceMs });
      Object.assign(desvio, { objetivo: null, peso: 0, espera: 0 });
      return true;
    },
    ruta,
    actualiza,
    colocaCamara,
    sonido,
    ponPausa(valor) { sonido.ponPausa(valor); },
    // Saltarse el salto (pausa, «Conducir», fiestas…): solo antes de tocar el suelo
    get omitible() { return !terminado && fase !== 'aterrizaje'; },
    omite() { if (fase !== 'aterrizaje') termina(true); },
    // Para el HUD (velocímetro y minimapa)
    estadoHud() {
      const enAvion = fase === 'avion';
      const r = enAvion ? ruta.rumbo : cuerpo.rumbo;
      const v = enAvion ? SALTO.avion.velocidadMs : Math.hypot(cuerpo.vx, cuerpo.vy, cuerpo.vz);
      return {
        posicion: enAvion ? posAvion.clone() : new THREE.Vector3(cuerpo.x, cuerpo.y, cuerpo.z),
        adelante: new THREE.Vector3(-Math.sin(r), 0, -Math.cos(r)),
        velocidadKmh: v * 3.6,
        enAvion,
        volcado: false,
        minimapa: this.minimapa(),
      };
    },
    // Minimapa: ruta del avión (mientras vuela), punto de salto forzoso, aterrizaje previsto y radio
    minimapa() {
      const M = SALTO.minimapa;
      const enAvion = fase === 'avion';
      return {
        ruta: avion.parent ? { a: ruta.punto(ruta.inicio, {}), b: ruta.punto(ruta.fin, {}), salto: enAvion ? ruta.punto(ruta.saltoForzoso, {}) : null } : null,
        marca: enAvion || fase === 'aterrizaje' ? null : prevision,
        radioM: enAvion ? M.radioAvionM : Math.max(M.radioMinM, Math.min(M.radioAvionM, alturaJugador * M.radioPorAltura)),
      };
    },
    // Dónde generar el detalle (hierba, árboles 3D, celdas con tejados del LiDAR):
    // bajo la cámara solo si va baja; las celdas del sitio de aterrizaje, desde que se abre
    focoDetalle() { return alturaCamara < SALTO.render.alturaDetalleM ? camara.position : LEJOS; },
    focoEdificios() {
      if (fase === 'apertura' || fase === 'planeo' || fase === 'aterrizaje') return focoEdificios.set(prevision.x, 0, prevision.z);
      return alturaCamara < SALTO.render.alturaDetalleM ? camara.position : LEJOS;
    },
    // Línea de estado: altura y velocidad
    texto() {
      const e = this.estadoHud();
      return `🪂 ${Math.max(0, Math.round(this.altura))} m · ${Math.round(e.velocidadKmh)} km/h`;
    },
  };
}
