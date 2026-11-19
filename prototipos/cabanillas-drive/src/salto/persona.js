// Persona del salto: el personaje del editor (o, si no hay, la persona de MakeHuman que hace de
// jugador en las fiestas) con la animación «quieto» de base y, encima, las posturas del salto.
// Cada postura dice hacia dónde apunta cada tramo del cuerpo (brazo, antebrazo, muslo, pierna) en
// el sistema de la persona de pie (+Y arriba, +Z delante, x hacia fuera del lado de cada miembro),
// y cada hueso se gira lo justo para apuntar ahí. Así vale para cualquier cuerpo y los codos y las
// rodillas se doblan de verdad (antes se giraban sobre un eje fijo y, con los brazos en cruz, el
// codo solo se retorcía).
//   caida   — postura de caja: tripa abajo, arqueado, brazos en W, rodillas dobladas
//   picado  — brazos pegados atrás, piernas estiradas (para bajar más rápido)
//   frenado — más abierto y más arqueado (para frenar)
//   colgado — con el paracaídas: manos arriba en los mandos y piernas colgando
//   posarse — mandos tirados hasta la cadera, piernas juntas y rodillas algo dobladas
// La mochila va pegada a la espalda (se mide la superficie del cuerpo o de la ropa) y sigue al
// pecho cuando el cuerpo se arquea. El grupo mira a −Z (como el resto del salto), pies en y = 0.
import * as THREE from 'three';
import { clone as clonaConEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { FIESTAS } from '../config/fiestas.js';
import { SALTO } from '../config/salto.js';
import { creaCapa, giraHueso } from '../fiestas/pose.js';

// Direcciones [fuera, arriba, delante] de cada tramo y giros (rad) de columna y cabeza (− = atrás)
export const POSTURAS_SALTO = {
  caida: {
    columna: -0.32, cabeza: -0.5,
    brazo: [1, 0.08, -0.2], antebrazo: [0.12, 1, -0.12], muslo: [0.28, -1, -0.3], pierna: [0.1, 0.08, -1],
  },
  picado: {
    columna: 0.05, cabeza: -0.25,
    brazo: [0.32, -1, -0.38], antebrazo: [0.2, -1, -0.45], muslo: [0.07, -1, -0.12], pierna: [0.05, -1, -0.18],
  },
  frenado: {
    columna: -0.48, cabeza: -0.6,
    brazo: [1, 0.35, -0.3], antebrazo: [0.35, 1, -0.25], muslo: [0.45, -1, -0.45], pierna: [0.2, 0.15, -1],
  },
  colgado: {
    columna: 0.04, cabeza: 0.12,
    brazo: [0.22, 1, 0.1], antebrazo: [-0.04, 1, 0.16], muslo: [0.1, -1, 0.16], pierna: [0.06, -1, 0.02],
  },
  // Frenada: mandos tirados hasta la cadera (codos atrás, manos delante de la cadera), piernas
  // juntas un poco adelantadas y rodillas algo dobladas, mirando al suelo
  posarse: {
    columna: 0.08, cabeza: 0.2,
    brazo: [0.28, -1, -0.12], antebrazo: [0.18, -0.55, 0.8], muslo: [0.05, -1, 0.3], pierna: [0.03, -1, -0.08],
  },
};
const CLAVES = Object.keys(POSTURAS_SALTO.caida);
const copia = (p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v]));

// Espalda: lo más de atrás del cuerpo (o de la ropa) a la altura del pecho, en el sistema del objeto
function fondoEspalda(objeto, alturaPecho) {
  const v = new THREE.Vector3();
  let minZ = Infinity;
  objeto.updateMatrixWorld(true);
  objeto.traverse((o) => {
    if (!o.isMesh || /pelo|ojos|cejas|pestanas|sombrero/.test(o.name)) return;
    const pos = o.geometry.attributes.position;
    const paso = Math.max(1, Math.floor(pos.count / 6000));
    for (let i = 0; i < pos.count; i += paso) {
      if (o.isSkinnedMesh) o.getVertexPosition(i, v); else v.fromBufferAttribute(pos, i);
      objeto.worldToLocal(o.localToWorld(v));
      if (Math.abs(v.y - alturaPecho) < 0.07 && Math.abs(v.x) < 0.09 && v.z < minZ) minZ = v.z;
    }
  });
  return Number.isFinite(minZ) ? minZ : null;
}

// Devuelve el grupo de la persona o null si no hay personas cargadas
export function creaPersonaSalto(personas) {
  const modelos = personas?.modelos ?? [];
  // El personaje del editor si lo hay; si no, la persona de las fiestas
  const variante = personas?.jugador ?? modelos.find((m) => m.id === FIESTAS.personaje.modelo) ?? modelos[0];
  if (!variante) return null;
  const grupo = new THREE.Group();
  grupo.name = 'salto_personaje';
  const objeto = clonaConEsqueleto(variante.escena);
  objeto.rotation.y = Math.PI;                     // los modelos miran a +Z; el salto, a −Z
  objeto.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = false;
    o.frustumCulled = false;                       // el esqueleto se mueve: la caja de la malla no vale
  });
  grupo.add(objeto);
  const mezclador = new THREE.AnimationMixer(objeto);
  mezclador.clipAction(variante.quieto).play();
  mezclador.update(0);
  const capa = creaCapa(objeto);
  const hueso = (n) => objeto.getObjectByName(n);
  const H = {
    brazos: [hueso('upperarm_l'), hueso('upperarm_r')], antebrazos: [hueso('lowerarm_l'), hueso('lowerarm_r')],
    manos: [hueso('hand_l'), hueso('hand_r')],
    muslos: [hueso('thigh_l'), hueso('thigh_r')], piernas: [hueso('calf_l'), hueso('calf_r')],
    pies: [hueso('foot_l'), hueso('foot_r')],
    columna: hueso('spine_01'), pecho: hueso('spine_03'), cabeza: hueso('head'),
  };
  // Hacia qué lado (±X de la persona) queda cada brazo y cada pierna, para abrirlos hacia fuera
  grupo.updateMatrixWorld(true);
  const lado = (h) => (h ? Math.sign(objeto.worldToLocal(h.getWorldPosition(new THREE.Vector3())).x) || 1 : 1);
  const ladoBrazo = H.brazos.map(lado);
  const ladoPierna = H.muslos.map(lado);
  // Mochila: su cara de delante (el origen del modelo) contra la espalda, un poco bajo el pecho
  const pechoObj = H.pecho ? objeto.worldToLocal(H.pecho.getWorldPosition(new THREE.Vector3())) : new THREE.Vector3(0, 1.3, 0);
  const pecho = grupo.worldToLocal(objeto.localToWorld(pechoObj.clone()));
  const fondo = fondoEspalda(objeto, pechoObj.y - 0.05);
  // El objeto está girado media vuelta: su −Z (la espalda) es +Z del grupo
  const zEspalda = fondo !== null ? -fondo + 0.012 : pecho.z + SALTO.persona.fondoEspaldaM;
  grupo.userData.espalda = new THREE.Vector3(0, pecho.y - 0.05, zEspalda);
  grupo.userData.cuerpo = objeto;
  // Dónde queda ese punto (y el giro del grupo) respecto al pecho, para que la mochila lo siga
  const anclaEnPecho = H.pecho ? H.pecho.worldToLocal(grupo.localToWorld(grupo.userData.espalda.clone())) : null;
  const giroEnPecho = H.pecho ? H.pecho.getWorldQuaternion(new THREE.Quaternion()).invert()
    .multiply(grupo.getWorldQuaternion(new THREE.Quaternion())) : null;

  const actual = copia(POSTURAS_SALTO.caida);
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vD = new THREE.Vector3();
  const qO = new THREE.Quaternion();
  const qG = new THREE.Quaternion();
  const qW = new THREE.Quaternion();
  const qP = new THREE.Quaternion();
  // Gira el hueso h (en el mundo, lo mínimo) para que el tramo hasta «hijo» apunte a dir (objeto)
  function apunta(h, hijo, dir, signo) {
    if (!h || !hijo) return;
    h.getWorldPosition(vA);
    hijo.getWorldPosition(vB);
    const actualDir = vB.sub(vA).normalize();
    vD.set(dir[0] * signo, dir[1], dir[2]).normalize().applyQuaternion(objeto.getWorldQuaternion(qO));
    qG.setFromUnitVectors(actualDir, vD);
    h.getWorldQuaternion(qW).premultiply(qG);
    h.parent.getWorldQuaternion(qP).invert();
    h.quaternion.copy(qP.multiply(qW));
    h.updateMatrixWorld(true);
  }
  // La mochila (la añade salto.js a este grupo) sigue al pecho
  let mochila = null;
  function pegaMochila() {
    mochila ??= grupo.getObjectByName('salto_mochila');
    if (!mochila || !anclaEnPecho) return;
    H.pecho.updateMatrixWorld(true);
    mochila.position.copy(grupo.worldToLocal(H.pecho.localToWorld(vA.copy(anclaEnPecho))));
    mochila.quaternion.copy(grupo.getWorldQuaternion(qO).invert().multiply(H.pecho.getWorldQuaternion(qW)).multiply(giroEnPecho));
  }

  // Un fotograma: «objetivo» es una postura (o la mezcla de dos); «rapidez» (1/s), lo que tarda en llegar
  grupo.userData.actualiza = (dt, objetivo, rapidez = 6) => {
    const k = 1 - Math.exp(-dt * rapidez);
    for (const c of CLAVES) {
      if (Array.isArray(actual[c])) for (let i = 0; i < 3; i++) actual[c][i] += (objetivo[c][i] - actual[c][i]) * k;
      else actual[c] += (objetivo[c] - actual[c]) * k;
    }
    capa.antes();
    mezclador.update(dt);
    capa.despues();
    capa.pon(null);                                // vuelve a la postura de la animación
    objeto.updateMatrixWorld(true);
    giraHueso(objeto, H.columna, actual.columna);
    giraHueso(objeto, H.pecho, actual.columna * 0.5);
    giraHueso(objeto, H.cabeza, actual.cabeza);
    for (const i of [0, 1]) {
      apunta(H.brazos[i], H.antebrazos[i], actual.brazo, ladoBrazo[i]);
      apunta(H.antebrazos[i], H.manos[i], actual.antebrazo, ladoBrazo[i]);
      apunta(H.muslos[i], H.piernas[i], actual.muslo, ladoPierna[i]);
      apunta(H.piernas[i], H.pies[i], actual.pierna, ladoPierna[i]);
    }
    pegaMochila();
  };
  grupo.userData.ponPostura = (postura) => {
    for (const c of CLAVES) actual[c] = Array.isArray(postura[c]) ? [...postura[c]] : postura[c];
    grupo.userData.actualiza(0, postura);
  };
  return grupo;
}

// Mezcla de dos posturas (k: 0 = a … 1 = b)
export function mezclaPosturasSalto(a, b, k, salida = {}) {
  for (const c of CLAVES) {
    salida[c] = Array.isArray(a[c]) ? a[c].map((x, i) => x + (b[c][i] - x) * k) : a[c] + (b[c] - a[c]) * k;
  }
  return salida;
}
