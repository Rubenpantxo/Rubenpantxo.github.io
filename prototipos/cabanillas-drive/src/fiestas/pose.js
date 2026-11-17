// Posturas hechas girando huesos encima de las dos animaciones que hay («andar» y «quieto»,
// tools/build_personas.py): sentarse, aplaudir, levantar los brazos, apoyarse en la valla,
// llevarse las manos a la cabeza, correr. Las usan el público, los mozos y el jugador.
//
// El mezclador de animación solo reescribe un hueso cuando su valor cambia, así que un giro
// puesto encima se iría sumando fotograma a fotograma. Por eso cada persona guarda la postura
// que dejó la animación («base») y, antes de cada fotograma, vuelve a ella y pone los giros encima.
import * as THREE from 'three';
import { FIESTAS } from '../config/fiestas.js';

export const EJES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const NOMBRES = {
  columna: 'spine_01', pecho: 'spine_03', cabeza: 'head',
  musloI: 'thigh_l', musloD: 'thigh_r', piernaI: 'calf_l', piernaD: 'calf_r',
  brazoI: 'upperarm_l', brazoD: 'upperarm_r', antebrazoI: 'lowerarm_l', antebrazoD: 'lowerarm_r',
};

const qObjeto = new THREE.Quaternion();
const qGiro = new THREE.Quaternion();
const qA = new THREE.Quaternion();
const qB = new THREE.Quaternion();

// Gira el hueso «rad» sobre un eje del cuerpo de la persona (x: de lado a lado, y: vertical,
// z: hacia delante), sin tocar a su padre
export function giraHueso(objeto, h, rad, eje = EJES.x) {
  if (!h || Math.abs(rad) < 1e-4) return;
  objeto.getWorldQuaternion(qObjeto);
  qGiro.setFromAxisAngle(eje, rad);
  qA.copy(qObjeto).multiply(qGiro).multiply(qB.copy(qObjeto).invert());
  qA.multiply(h.getWorldQuaternion(qB));
  h.parent.getWorldQuaternion(qB).invert();
  h.quaternion.copy(qB.multiply(qA));
  h.updateMatrixWorld(true);
}

// Sienta a una persona doblando los huesos de su postura de quieto: muslos hacia delante,
// piernas colgando y antebrazos sobre los muslos. Devuelve los huesos tocados con su giro, para
// volver a ponerlos después de cada paso de la animación, y la altura de la cadera.
export function sienta(objeto) {
  const S = FIESTAS.publico.sentado;
  objeto.updateMatrixWorld(true);
  const qO = objeto.getWorldQuaternion(new THREE.Quaternion());
  const giro = (rad) => qO.clone().multiply(new THREE.Quaternion().setFromAxisAngle(EJES.x, rad)).multiply(qO.clone().invert());
  const mundo = (h) => h.getWorldQuaternion(new THREE.Quaternion());
  const fijados = [];
  let cadera = null;
  const pon = (hueso, rad, desde = mundo(hueso)) => {
    hueso.quaternion.copy(mundo(hueso.parent).invert().multiply(giro(rad).multiply(desde)));
    hueso.updateMatrixWorld(true);
    fijados.push([hueso, hueso.quaternion.clone()]);
  };
  for (const lado of ['l', 'r']) {
    const muslo = objeto.getObjectByName(`thigh_${lado}`);
    const pierna = objeto.getObjectByName(`calf_${lado}`);
    const brazo = objeto.getObjectByName(`upperarm_${lado}`);
    const antebrazo = objeto.getObjectByName(`lowerarm_${lado}`);
    if (!muslo || !pierna) return null;
    cadera ??= muslo.getWorldPosition(new THREE.Vector3()).y - objeto.position.y;
    const piernaDePie = mundo(pierna);
    pon(muslo, -S.musloRad);
    pon(pierna, S.piernaRad, piernaDePie);          // la pierna, casi vertical como de pie
    if (brazo && antebrazo) {
      const antebrazoDePie = mundo(antebrazo);
      pon(brazo, -S.brazoRad);
      pon(antebrazo, -S.antebrazoRad, antebrazoDePie);
    }
  }
  return { fijados, cadera };
}

// Postura: ángulos (rad) que se suman a la animación. brazo*/antebrazo*: [izquierdo, derecho].
//   columna: hacia delante (+) · brazoX: brazo hacia delante y arriba (−) · brazoY: hacia dentro
//   (+) · antebrazoX: doblar el codo (−) · antebrazoY: antebrazo hacia dentro (+)
export const POSTURA_NULA = { columna: 0, brazoX: [0, 0], brazoY: [0, 0], antebrazoX: [0, 0], antebrazoY: [0, 0] };
export function mezclaPosturas(a, b, k, salida = { brazoX: [0, 0], brazoY: [0, 0], antebrazoX: [0, 0], antebrazoY: [0, 0] }) {
  salida.columna = a.columna + (b.columna - a.columna) * k;
  for (const c of ['brazoX', 'brazoY', 'antebrazoX', 'antebrazoY']) {
    for (const i of [0, 1]) salida[c][i] = a[c][i] + (b[c][i] - a[c][i]) * k;
  }
  return salida;
}

// Huesos de una persona y su capa de postura
export function creaCapa(objeto) {
  const H = Object.fromEntries(Object.entries(NOMBRES).map(([k, n]) => [k, objeto.getObjectByName(n) ?? null]));
  const tocados = Object.values(H).filter(Boolean);
  const base = tocados.map((h) => h.quaternion.clone());
  // El lado izquierdo del cuerpo está en −X o en +X según el modelo: se mira una vez
  objeto.updateMatrixWorld(true);
  const pI = H.brazoI ? objeto.worldToLocal(H.brazoI.getWorldPosition(new THREE.Vector3())) : null;
  const signoLado = pI && pI.x < 0 ? -1 : 1;           // multiplica los giros «hacia dentro»
  return {
    H,
    // Antes de que el mezclador anime: vuelve a la postura que él dejó
    antes() { tocados.forEach((h, i) => h.quaternion.copy(base[i])); },
    // Después de animar: esa es la nueva base
    despues() { tocados.forEach((h, i) => base[i].copy(h.quaternion)); },
    // Pone la postura encima de la base (y, si hay, los huesos de sentado)
    pon(postura, fijados = null) {
      tocados.forEach((h, i) => h.quaternion.copy(base[i]));
      if (fijados) for (const [h, q] of fijados) h.quaternion.copy(q);
      objeto.updateMatrixWorld(true);
      if (!postura) return;
      giraHueso(objeto, H.columna, postura.columna);
      const brazos = [H.brazoI, H.brazoD]; const antebrazos = [H.antebrazoI, H.antebrazoD];
      for (const i of [0, 1]) {
        // Girar sobre el eje vertical en positivo lleva lo que apunta adelante hacia +X: hacia dentro
        // es en negativo para el brazo que está en +X
        const dentro = (i === 0 ? -1 : 1) * signoLado;
        giraHueso(objeto, brazos[i], postura.brazoX[i]);
        giraHueso(objeto, brazos[i], postura.brazoY[i] * dentro, EJES.y);
        giraHueso(objeto, antebrazos[i], postura.antebrazoX[i]);
        giraHueso(objeto, antebrazos[i], postura.antebrazoY[i] * dentro, EJES.y);
      }
    },
  };
}

// Posturas del público y los mozos. «t»: segundos desde que empezó (para lo que se mueve)
const P = (columna, bx, by, ax, ay) => ({ columna, brazoX: bx, brazoY: by, antebrazoX: ax, antebrazoY: ay });
export const POSTURAS = {
  // Aplaudir: brazos hacia delante, codos doblados y antebrazos que se juntan y se separan
  aplauso: (t, ritmo = 3.2) => {
    const s = Math.sin(t * ritmo * Math.PI * 2) * 0.16;
    return P(0.04, [-0.6, -0.6], [0.18, 0.18], [-1.35, -1.35], [0.3 + s, 0.3 + s]);
  },
  // ¡Olé!: los dos brazos arriba, con un poco de vaivén
  ole: (t) => {
    const s = Math.sin(t * 7) * 0.12;
    return P(-0.08, [-2.6 + s, -2.6 - s], [-0.15, -0.15], [-0.35, -0.35], [0, 0]);
  },
  // ¡Uy!: las manos a la cabeza y el cuerpo un poco hacia delante
  uy: () => P(0.16, [-2.05, -2.05], [-0.45, -0.45], [-2.2, -2.2], [0.25, 0.25]),
  // Apoyado en la valla: los antebrazos cruzados en el tablón de arriba
  apoyado: () => P(0.22, [-0.85, -0.85], [0.12, 0.12], [-0.95, -0.95], [0.75, 0.75]),
  // Mozo citando a la vaca: un brazo arriba agitándose y el otro abierto
  cita: (t) => {
    const s = Math.sin(t * 9);
    return P(0.06, [-2.4 + s * 0.25, -0.5], [-0.2, -0.6], [-0.5 + s * 0.35, -0.3], [0, 0]);
  },
  // Correr («fuerza» de 0 a 1; «fase»: la del paso de la animación de andar, de 0 a 1): tronco
  // hacia delante, codos a 90° con los antebrazos hacia arriba y algo hacia dentro, y los brazos
  // que van y vienen al revés que las piernas (en «andar», con la fase en 0,25 la pierna izquierda
  // va delante: el brazo izquierdo, detrás)
  corre: (fuerza, fase = 0) => {
    const C = FIESTAS.personaje.correr;
    const s = Math.sin(fase * Math.PI * 2) * C.braceoRad * fuerza;
    return P(C.inclinacionRad * fuerza, [s, -s], [0, 0], [-C.codoRad * fuerza, -C.codoRad * fuerza],
      [C.manoDentroRad * fuerza, C.manoDentroRad * fuerza]);
  },
};
