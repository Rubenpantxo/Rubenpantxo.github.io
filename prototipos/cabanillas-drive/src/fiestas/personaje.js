// Jugador del modo fiestas en tercera persona: una persona de MakeHuman con cuerpo visible
// sobre la cápsula de juego/peaton.js. Anda, corre y esprinta (con cansancio), hace el quiebro,
// el recorte, el salto y el especial, y se refugia (F) subiéndose a la valla de tablones o
// metiéndose tras un burladero o una valla gris.
//
// Animaciones: solo existen «andar» y «quieto» (tools/build_personas.py). Correr, saltar,
// quebrar y sentarse en la valla se hacen aquí girando huesos encima de esas dos; cuando se
// hagan las animaciones de verdad en Blender (PLAN_FIESTAS.md, F6) se sustituyen.
import * as THREE from 'three';
import { clone as clonaConEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { FIESTAS } from '../config/fiestas.js';
import { sienta } from './ambiente.js';

const EJE_X = new THREE.Vector3(1, 0, 0);
const suave = THREE.MathUtils.smoothstep;
const limita = THREE.MathUtils.clamp;

// Punto más cercano de un segmento, sin acercarse a los extremos más de «margen»
function proyecta(a, b, x, z, margen) {
  const dx = b[0] - a[0]; const dz = b[1] - a[1];
  const largo = Math.hypot(dx, dz);
  const m = Math.min(margen, largo / 2);
  const t = limita(((x - a[0]) * dx + (z - a[1]) * dz) / (largo * largo), m / largo, 1 - m / largo);
  return [a[0] + dx * t, a[1] + dz * t];
}

export function creaPersonaje({ peaton, terreno, recinto, personas, sombras = true }) {
  const P = FIESTAS.personaje;
  const variante = personas.modelos.find((m) => m.id === P.modelo) ?? personas.modelos[0];
  const objeto = clonaConEsqueleto(variante.escena);
  objeto.name = 'fiestas_jugador';
  objeto.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = sombras;
    o.frustumCulled = false;          // el esqueleto se mueve: la caja de la malla no vale
  });
  const mezclador = new THREE.AnimationMixer(objeto);
  const andar = mezclador.clipAction(variante.andar);
  const quieto = mezclador.clipAction(variante.quieto);
  andar.play();
  quieto.play();
  const metrosPorCiclo = personas.metrosPorCiclo ?? 1.39;
  const hueso = (nombre) => objeto.getObjectByName(nombre);
  const H = {
    columna: hueso('spine_01'), pecho: hueso('spine_03'),
    muslo: [hueso('thigh_l'), hueso('thigh_r')], pierna: [hueso('calf_l'), hueso('calf_r')],
    brazo: [hueso('upperarm_l'), hueso('upperarm_r')], antebrazo: [hueso('lowerarm_l'), hueso('lowerarm_r')],
  };

  // Huesos que se retocan a mano. El mezclador de animación solo reescribe un hueso cuando su
  // valor cambia, así que un giro puesto encima se quedaría y se iría sumando fotograma a
  // fotograma: antes de animar se devuelve cada hueso a lo que dejó la animación.
  const retocados = [H.columna, ...H.muslo, ...H.pierna, ...H.brazo, ...H.antebrazo].filter(Boolean)
    .map((h) => ({ h, q: h.quaternion.clone() }));

  // Gira un hueso «rad» sobre el eje transversal del personaje (su X), sin tocar a su padre
  const qObjeto = new THREE.Quaternion();
  const qGiro = new THREE.Quaternion();
  const qA = new THREE.Quaternion();
  const qB = new THREE.Quaternion();
  function gira(h, rad) {
    if (!h || Math.abs(rad) < 1e-4) return;
    objeto.getWorldQuaternion(qObjeto);
    qGiro.setFromAxisAngle(EJE_X, rad);
    qA.copy(qObjeto).multiply(qGiro).multiply(qB.copy(qObjeto).invert());
    qA.multiply(h.getWorldQuaternion(qB));
    h.parent.getWorldQuaternion(qB).invert();
    h.quaternion.copy(qB.multiply(qA));
    h.updateMatrixWorld(true);
  }

  // --- Estado
  let estado = 'libre';              // libre | quiebro | recorte | subiendo | refugiado | bajando
  let tEstado = 0;
  let rumbo = 0;                     // hacia dónde mira el cuerpo: (sin, cos) en (x, z)
  let energia = 1;
  let sinFuelle = false;             // agotado: no esprinta hasta recuperar algo
  let vx = 0; let vz = 0;
  let enAire = false;
  let tAire = 0;
  let saltoEspecial = false;
  let lado = 1;                      // lado del quiebro o del recorte en curso (1 = derecha)
  let ladoSiguiente = 1;
  let finQuiebro = -10;              // reloj del último quiebro (para el combo)
  let rumbo0 = 0;
  let reloj = 0;
  let combo = 0;
  let refugio = null;                // refugio al alcance (pista) o el que se está usando
  let enUso = null;
  const desde = { x: 0, y: 0, z: 0 };
  let sentado = null;                // huesos fijados al sentarse en la valla
  let pide = { quiebro: false, recorte: false, salto: false, especial: false, refugio: false };
  const sucesos = [];                // lo último que ha hecho (para la F4): { tipo, t }
  let balanceo = 0;                  // inclinación lateral que se ve (rad)
  let dirCogida = [1, 0];
  let cogidas = 0;

  const E = P.energia;
  const impulsoDe = (alto) => Math.sqrt(2 * 9.81 * alto);
  const puede = (coste) => energia >= coste;
  const anota = (tipo) => { sucesos.push({ tipo, t: reloj }); if (sucesos.length > 12) sucesos.shift(); };

  // --- Refugios al alcance
  const tablones = recinto.tramos.filter((t) => t.tipo === 'tablones' && t.clase !== 'gradas' && t.largo > 1.2);
  const altoValla = FIESTAS.valla.tablones.alturasM.at(-1) + FIESTAS.valla.tablones.tablonAltoM;
  const burladeros = recinto.burladeros.map((b) => {
    const t = recinto.tramos.find((x) => x.zona === b.zona && x.lado === b.lado && x.clase === 'fachada');
    const p = proyecta(t.a, t.b, b.en[0], b.en[1], 0);
    const d = Math.hypot(p[0] - b.en[0], p[1] - b.en[1]);
    return { en: b.en, n: [(p[0] - b.en[0]) / d, (p[1] - b.en[1]) / d], hueco: d };       // n: hacia la valla
  });
  const grises = recinto.refugios.map((r) => {
    const [f0, f1, s1, s0] = r.esquinas;
    const c = [(f0[0] + f1[0] + s0[0] + s1[0]) / 4, (f0[1] + f1[1] + s0[1] + s1[1]) / 4];
    const d = [(s0[0] + s1[0] - f0[0] - f1[0]) / 2, (s0[1] + s1[1] - f0[1] - f1[1]) / 2];
    const l = Math.hypot(d[0], d[1]);
    return { c, n: [d[0] / l, d[1] / l], fondo: l };                              // n: hacia la calle
  });

  // «lejos»: la valla más cercana esté donde esté (adonde se lleva al jugador tras una cogida)
  function buscaRefugio(x, z, lejos = false) {
    const R = lejos ? { ...P.refugio, vallaM: 500, burladeroM: 0, grisM: 0 } : P.refugio;
    let mejor = null;
    const prueba = (d, alcance, datos) => {
      if (d < alcance && (!mejor || d / alcance < mejor.proporcion)) mejor = { proporcion: d / alcance, ...datos };
    };
    for (const t of tablones) {
      const p = proyecta(t.a, t.b, x, z, 0.45);
      const d = Math.hypot(x - p[0], z - p[1]);
      if (d < 0.05 || d > R.vallaM) continue;
      const n = [(x - p[0]) / d, (z - p[1]) / d];                                // hacia donde está el jugador
      prueba(d, R.vallaM, {
        tipo: 'valla', texto: 'subir a la valla', punto: p, pies: terreno.alturaEn(p[0], p[1]) + altoValla,
        rumbo: Math.atan2(n[0], n[1]), sentado: true, vuelve: [p[0] + n[0] * R.separaM, p[1] + n[1] * R.separaM],
      });
    }
    for (const b of burladeros) {
      const d = Math.hypot(x - b.en[0], z - b.en[1]);
      const punto = [b.en[0] + b.n[0] * b.hueco / 2, b.en[1] + b.n[1] * b.hueco / 2];   // en medio del hueco
      prueba(d, R.burladeroM, {
        tipo: 'burladero', texto: 'meterse en el burladero', punto, pies: terreno.alturaEn(punto[0], punto[1]),
        rumbo: Math.atan2(-b.n[0], -b.n[1]), sentado: false, vuelve: [b.en[0] - b.n[0] * R.separaM, b.en[1] - b.n[1] * R.separaM],
      });
    }
    for (const g of grises) {
      const d = Math.hypot(x - g.c[0], z - g.c[1]);
      prueba(d, R.grisM, {
        tipo: 'gris', texto: 'meterse tras la valla gris', punto: g.c, pies: terreno.alturaEn(g.c[0], g.c[1]),
        rumbo: Math.atan2(g.n[0], g.n[1]), sentado: false,
        vuelve: [g.c[0] + g.n[0] * (g.fondo / 2 + R.separaM), g.c[1] + g.n[1] * (g.fondo / 2 + R.separaM)],
      });
    }
    return mejor;
  }

  function cambia(nuevo) { estado = nuevo; tEstado = 0; }

  // --- Un paso de física. «guinada» es la de la cámara (0 = norte): el movimiento va respecto a ella
  function paso(mandos, guinada, dt) {
    reloj += dt;
    tEstado += dt;
    const pies = peaton.pies();
    const ordenes = pide;
    pide = { quiebro: false, recorte: false, salto: false, especial: false, refugio: false };

    // Cogida (F3): volteo sencillo. Por los aires en la dirección de la vaca y, al caer, a la valla más cercana
    if (estado === 'cogido') {
      const G = FIESTAS.cogida;
      const t = Math.min(1, tEstado / G.vueloS);
      peaton.llevaA(desde.x + dirCogida[0] * G.lejosM * t, desde.y + Math.sin(Math.PI * t) * G.altoM, desde.z + dirCogida[1] * G.lejosM * t);
      vx = 0; vz = 0;
      if (t >= 1) {
        enUso = buscaRefugio(desde.x, desde.z, true);
        Object.assign(desde, peaton.pies());
        enAire = false;
        cambia('subiendo');
      }
      return;
    }
    // Refugio: subir, estar y bajar (la cápsula va sin colisión)
    if (estado === 'subiendo' || estado === 'bajando') {
      const dura = estado === 'subiendo' ? P.refugio.subirS : P.refugio.bajarS;
      const t = Math.min(1, tEstado / dura);
      const k = t * t * (3 - 2 * t);
      const hacia = estado === 'subiendo'
        ? { x: enUso.punto[0], y: enUso.pies, z: enUso.punto[1] }
        : { x: enUso.vuelve[0], y: terreno.alturaEn(enUso.vuelve[0], enUso.vuelve[1]) + FIESTAS.arena.gruesoM, z: enUso.vuelve[1] };
      peaton.llevaA(desde.x + (hacia.x - desde.x) * k, desde.y + (hacia.y - desde.y) * k + Math.sin(Math.PI * t) * 0.3,
        desde.z + (hacia.z - desde.z) * k);
      let giro = (estado === 'subiendo' ? enUso.rumbo : rumbo) - rumbo;
      giro = Math.atan2(Math.sin(giro), Math.cos(giro));
      rumbo += giro * Math.min(1, dt * 14);
      if (t >= 1) {
        if (estado === 'subiendo') {
          cambia('refugiado');
          rumbo = enUso.rumbo;
          anota('refugio');
        } else {
          peaton.ponColision(true);
          enUso = null;
          sentado = null;
          cambia('libre');
        }
      }
      vx = 0; vz = 0;
      return;
    }
    if (estado === 'refugiado') {
      energia = Math.min(1, energia + E.recuperaPorS * E.recuperaRefugio * dt);
      if (energia > E.vuelveEsprint) sinFuelle = false;
      if (ordenes.refugio) {
        Object.assign(desde, { x: enUso.punto[0], y: enUso.pies, z: enUso.punto[1] });
        sentado = null;
        cambia('bajando');
      }
      return;
    }

    // Dirección pedida, respecto a la cámara
    const fx = -Math.sin(guinada); const fz = -Math.cos(guinada);
    let dx = fx * mandos.avance - fz * mandos.lateral;
    let dz = fz * mandos.avance + fx * mandos.lateral;
    let fuerza = Math.hypot(dx, dz);
    if (fuerza > 1e-3) { dx /= fuerza; dz /= fuerza; }
    fuerza = Math.min(1, fuerza);
    const suelo = peaton.enSuelo;
    if (suelo && enAire && tAire > 0.08) { enAire = false; saltoEspecial = false; }
    if (enAire) tAire += dt;
    refugio = suelo ? buscaRefugio(pies.x, pies.z) : null;

    // Hacia la derecha del cuerpo
    const dcx = -Math.cos(rumbo); const dcz = Math.sin(rumbo);
    let impulso = 0;
    let forzar = false;

    if (ordenes.refugio && refugio && suelo && estado === 'libre') {
      enUso = refugio;
      Object.assign(desde, pies);
      peaton.ponColision(false);
      cambia('subiendo');
      vx = 0; vz = 0;
      return;
    }

    // Especial: botón propio, o salto y recorte casi a la vez (uno convierte al otro)
    let especial = ordenes.especial && suelo && estado !== 'quiebro';
    if (ordenes.salto && estado === 'recorte' && tEstado < P.especial.ventanaS && suelo) especial = true;
    if (ordenes.recorte && enAire && !saltoEspecial && tAire < P.especial.ventanaS) { especial = true; forzar = true; }
    if (especial && puede(E.especial)) {
      energia -= E.especial;
      impulso = impulsoDe(P.especial.altoM);
      const f = fuerza > 0.2 ? [dx, dz] : [Math.sin(rumbo), Math.cos(rumbo)];
      const v = Math.max(Math.hypot(vx, vz), P.correrMs) + P.especial.empujeMs;
      vx = f[0] * v; vz = f[1] * v;
      enAire = true; tAire = 0; saltoEspecial = true;
      cambia('libre');
      anota('especial');
    } else if (estado === 'libre' && suelo) {
      if (ordenes.salto && puede(E.salto)) {
        energia -= E.salto;
        impulso = impulsoDe(P.salto.altoM);
        const v = Math.hypot(vx, vz);
        if (v > 0.5) { vx += (vx / v) * P.salto.empujeMs; vz += (vz / v) * P.salto.empujeMs; }
        enAire = true; tAire = 0;
        anota('salto');
      } else if (ordenes.quiebro && puede(E.quiebro)) {
        energia -= E.quiebro;
        const reciente = reloj - finQuiebro < P.quiebro.comboS;
        const pedido = dx * dcx + dz * dcz;                       // palanca hacia un lado del cuerpo
        if (reciente) { lado = -lado; combo++; } else {
          lado = fuerza > 0.3 && Math.abs(pedido) > 0.3 ? Math.sign(pedido) : ladoSiguiente;
          combo = 0;
        }
        ladoSiguiente = -lado;
        cambia('quiebro');
        anota(reciente ? 'combo' : 'quiebro');
      } else if (ordenes.recorte && puede(E.recorte)) {
        energia -= E.recorte;
        const pedido = dx * dcx + dz * dcz;
        lado = fuerza > 0.3 && Math.abs(pedido) > 0.3 ? Math.sign(pedido) : ladoSiguiente;
        ladoSiguiente = -lado;
        rumbo0 = rumbo;
        cambia('recorte');
        anota('recorte');
      }
    } else if (estado === 'quiebro' && ordenes.quiebro && puede(E.quiebro) && tEstado > P.quiebro.duracionS * 0.5) {
      // Segundo quiebro encadenado: de vuelta al otro lado en cuanto acabe este
      pide.quiebro = true;
    }

    if (estado === 'quiebro') {
      const Q = P.quiebro;
      const v = Q.distanciaM / Q.duracionS;
      vx = dcx * lado * v + Math.sin(rumbo) * 1.2;
      vz = dcz * lado * v + Math.cos(rumbo) * 1.2;
      if (tEstado >= Q.duracionS) { finQuiebro = reloj; cambia('libre'); }
    } else if (estado === 'recorte') {
      const R = P.recorte;
      const t = Math.min(1, tEstado / R.duracionS);
      // El cuerpo gira hacia su lado mientras avanza en arco
      rumbo = rumbo0 - lado * R.giroRad * t;
      const hacia = rumbo0 - lado * (0.55 + R.giroRad * 0.45 * t);
      vx = Math.sin(hacia) * R.velocidadMs;
      vz = Math.cos(hacia) * R.velocidadMs;
      if (t >= 1) cambia('libre');
    } else {
      // Andar, correr o esprintar
      const quiereEsprint = mandos.correr || (mandos.conJoystick && fuerza > P.joystickEsprint);
      const esprinta = quiereEsprint && !sinFuelle && fuerza > 0.1;
      let objetivo = 0;
      if (fuerza > 0.05) {
        if (esprinta) objetivo = P.esprintMs;
        else if (mandos.conJoystick && fuerza < P.joystickAndar) objetivo = P.andarMs;
        else objetivo = P.correrMs;
      }
      if (esprinta && suelo) {
        energia -= E.esprintPorS * dt;
        if (energia <= E.minimoEsprint) sinFuelle = true;
      } else {
        energia = Math.min(1, energia + E.recuperaPorS * dt * (objetivo > P.andarMs ? 0.5 : 1));
        if (energia > E.vuelveEsprint) sinFuelle = false;
      }
      // En el aire se conserva el impulso; en el suelo se va a la velocidad pedida
      const k = 1 - Math.exp(-dt * (suelo ? P.aceleracion : 1.5));
      vx += (dx * objetivo - vx) * k;
      vz += (dz * objetivo - vz) * k;
      if (fuerza > 0.05) {
        let giro = Math.atan2(dx, dz) - rumbo;
        giro = Math.atan2(Math.sin(giro), Math.cos(giro));
        rumbo += limita(giro, -P.giroRad * dt, P.giroRad * dt);
      }
    }
    energia = Math.max(0, energia);
    peaton.mueve(vx, vz, dt, impulso, forzar);
  }

  // --- Lo que se ve: una vez por fotograma
  function anima(dt) {
    const pies = peaton.pies();
    const v = Math.hypot(vx, vz);
    const k = limita(v / 1.2, 0, 1);
    andar.setEffectiveWeight(k);
    quieto.setEffectiveWeight(1 - k);
    andar.timeScale = Math.min(P.correr.zancadaMax, Math.max(0.4, v) / (metrosPorCiclo / variante.andar.duration));
    for (const r of retocados) r.h.quaternion.copy(r.q);
    mezclador.update(dt);
    for (const r of retocados) r.q.copy(r.h.quaternion);

    let inclina = 0;
    if (estado === 'quiebro') inclina = lado * P.quiebro.inclinacionRad * Math.sin(Math.PI * Math.min(1, tEstado / P.quiebro.duracionS));
    else if (estado === 'recorte') inclina = lado * P.recorte.inclinacionRad * Math.sin(Math.PI * Math.min(1, tEstado / P.recorte.duracionS));
    balanceo += (inclina - balanceo) * Math.min(1, dt * 22);
    objeto.position.set(pies.x, pies.y, pies.z);
    // En la cogida da una vuelta entera en el aire
    const vuelta = estado === 'cogido' ? Math.min(1, tEstado / FIESTAS.cogida.vueloS) * Math.PI * 2 : 0;
    objeto.rotation.set(vuelta, rumbo, balanceo, 'YXZ');
    if (vuelta) objeto.position.y += 0.9 * Math.sin(vuelta / 2);       // gira sobre la cintura, no sobre los pies
    objeto.updateMatrixWorld(true);

    const enRefugio = estado === 'refugiado' || (estado === 'subiendo' && tEstado > P.refugio.subirS * 0.6);
    if (enRefugio && enUso?.sentado) {
      // Sentado en lo alto de la valla, mirando al ruedo
      if (!sentado) sentado = sienta(objeto);
      if (sentado) {
        for (const [h, q] of sentado.fijados) h.quaternion.copy(q);
        objeto.position.y = pies.y + FIESTAS.publico.sentado.caderaSobreAsientoM - sentado.cadera;
      }
    } else if (enRefugio) {
      // Agachado tras el burladero o la valla gris
      gira(H.columna, 0.3);
      for (const i of [0, 1]) { gira(H.muslo[i], -0.55); gira(H.pierna[i], 0.95); }
    } else if (enAire || estado === 'subiendo' || estado === 'bajando' || estado === 'cogido') {
      // En el aire: piernas recogidas y brazos arriba
      const t = estado === 'libre' ? suave(tAire, 0, 0.12) : 1;
      const alto = saltoEspecial ? 1.25 : 1;
      for (const i of [0, 1]) {
        gira(H.muslo[i], -0.75 * t * alto);
        gira(H.pierna[i], 1.05 * t * alto);
        gira(H.brazo[i], -1.1 * t);
      }
    } else {
      // Correr: tronco echado hacia delante y codos doblados, más cuanto más deprisa
      const c = suave(v, P.andarMs + 0.3, P.esprintMs) * (estado === 'libre' ? 1 : 0.6);
      gira(H.columna, P.correr.inclinacionRad * c + (estado === 'quiebro' ? 0.25 : 0));
      for (const i of [0, 1]) gira(H.antebrazo[i], -P.correr.codoRad * c);
    }
    objeto.updateMatrixWorld(true);
  }

  return {
    objeto,
    paso,
    anima,
    // Coloca al jugador mirando hacia «guinada» (0 = norte) y lo deja como recién llegado
    reinicia(guinada) {
      rumbo = Math.atan2(-Math.sin(guinada), -Math.cos(guinada));
      vx = 0; vz = 0; energia = 1; sinFuelle = false; enAire = false; enUso = null; sentado = null; refugio = null; cogidas = 0;
      peaton.ponColision(true);
      cambia('libre');
    },
    // Acción pedida por el jugador: quiebro | recorte | salto | especial | refugio
    pide(accion) { if (accion in pide) pide[accion] = true; },
    get estado() { return estado; },
    get energia() { return energia; },
    get agotado() { return sinFuelle; },
    get enAire() { return enAire; },
    get rumbo() { return rumbo; },
    get combo() { return combo; },
    get cogidas() { return cogidas; },
    // La vaca lo coge: sale despedido hacia (dx, dz). No hace nada si ya está a salvo o por los aires
    cogida(dx, dz) {
      if (estado === 'cogido' || estado === 'refugiado' || estado === 'subiendo') return false;
      dirCogida = [dx, dz];
      Object.assign(desde, peaton.pies());
      peaton.ponColision(false);
      sentado = null;
      cogidas++;
      cambia('cogido');
      anota('cogida');
      return true;
    },
    // A salvo de las vacas (F3): subido a la valla o tras un burladero
    get seguro() { return estado === 'refugiado' || (estado === 'subiendo' && tEstado > P.refugio.subirS * 0.5); },
    // Refugio al alcance (para el aviso y el botón) o el que se está usando
    get pista() {
      if (estado === 'refugiado') return { texto: 'bajar', bajar: true };
      return estado === 'libre' && refugio ? { texto: refugio.texto, tipo: refugio.tipo } : null;
    },
    get sucesos() { return sucesos; },
    posicion() { return peaton.pies(); },
    velocidad() { return { x: vx, z: vz }; },
    // Para el minimapa y el velocímetro
    paraHud() {
      const p = peaton.pies();
      return { posicion: new THREE.Vector3(p.x, p.y, p.z), adelante: new THREE.Vector3(Math.sin(rumbo), 0, Math.cos(rumbo)),
        velocidadKmh: Math.hypot(vx, vz) * 3.6, volcado: false };
    },
    libera() {
      mezclador.stopAllAction();
      objeto.removeFromParent();
    },
  };
}
