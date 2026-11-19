// Persona del salto: la de MakeHuman que hace de jugador en las fiestas (FIESTAS.personaje.modelo),
// con la animación «quieto» de base y, encima, las posturas del salto girando huesos:
//   caida   — en cruz, arqueado, brazos abiertos con los codos doblados y rodillas dobladas
//   picado  — brazos pegados al cuerpo hacia atrás, piernas estiradas
//   frenado — más abierto todavía (S en la caída)
//   colgado — brazos arriba, en los mandos del paracaídas, piernas colgando
//   posarse — rodillas dobladas para tocar el suelo
// El grupo que devuelve mira a −Z (como el resto del salto) con los pies en y = 0.
import * as THREE from 'three';
import { clone as clonaConEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { FIESTAS } from '../config/fiestas.js';
import { SALTO } from '../config/salto.js';
import { EJES, creaCapa, giraHueso } from '../fiestas/pose.js';

// Ángulos (rad). abre: brazo separado del cuerpo hacia el lado (sobre el eje del frente);
// brazoX: hacia delante y arriba (−); codo: doblar (−); musloX: hacia delante (−); rodilla: doblar (+)
export const POSTURAS_SALTO = {
  caida: { columna: -0.3, abre: 1.35, brazoX: -0.35, codo: -1.25, musloX: 0.15, abrePierna: 0.25, rodilla: 1.2 },
  picado: { columna: 0.05, abre: 0.25, brazoX: 0.45, codo: -0.1, musloX: 0, abrePierna: 0.05, rodilla: 0.1 },
  frenado: { columna: -0.45, abre: 1.55, brazoX: -0.55, codo: -0.7, musloX: 0.25, abrePierna: 0.4, rodilla: 0.9 },
  colgado: { columna: 0.05, abre: 0.35, brazoX: -2.6, codo: -0.45, musloX: -0.15, abrePierna: 0.05, rodilla: 0.25 },
  posarse: { columna: 0.25, abre: 0.4, brazoX: -1.9, codo: -0.6, musloX: -0.7, abrePierna: 0.1, rodilla: 1.1 },
};
const CLAVES = Object.keys(POSTURAS_SALTO.caida);

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
    muslos: [hueso('thigh_l'), hueso('thigh_r')], piernas: [hueso('calf_l'), hueso('calf_r')],
    columna: hueso('spine_01'), pecho: hueso('spine_03'),
  };
  // Hacia qué lado (±X de la persona) queda cada brazo y cada pierna, para abrirlos hacia fuera
  grupo.updateMatrixWorld(true);
  const lado = (h) => (h ? Math.sign(objeto.worldToLocal(h.getWorldPosition(new THREE.Vector3())).x) || 1 : 1);
  const ladoBrazo = H.brazos.map(lado);
  const ladoPierna = H.muslos.map(lado);
  // Centro de la espalda (para la mochila): a la altura del pecho, por detrás
  const pecho = H.pecho ? grupo.worldToLocal(H.pecho.getWorldPosition(new THREE.Vector3())) : new THREE.Vector3(0, 1.3, 0);
  grupo.userData.espalda = new THREE.Vector3(0, pecho.y - 0.05, pecho.z + SALTO.persona.fondoEspaldaM);
  grupo.userData.cuerpo = objeto;

  const actual = { ...POSTURAS_SALTO.caida };
  // Un fotograma: «objetivo» es una postura (o la mezcla de dos); «rapidez» (1/s), lo que tarda en llegar
  grupo.userData.actualiza = (dt, objetivo, rapidez = 6) => {
    const k = 1 - Math.exp(-dt * rapidez);
    for (const c of CLAVES) actual[c] += (objetivo[c] - actual[c]) * k;
    capa.antes();
    mezclador.update(dt);
    capa.despues();
    capa.pon(null);                                // vuelve a la postura de la animación
    giraHueso(objeto, H.columna, actual.columna);
    for (const i of [0, 1]) {
      giraHueso(objeto, H.brazos[i], actual.abre * ladoBrazo[i], EJES.z);
      giraHueso(objeto, H.brazos[i], actual.brazoX);
      giraHueso(objeto, H.antebrazos[i], actual.codo);
      giraHueso(objeto, H.muslos[i], actual.abrePierna * ladoPierna[i], EJES.z);
      giraHueso(objeto, H.muslos[i], actual.musloX);
      giraHueso(objeto, H.piernas[i], actual.rodilla);
    }
  };
  grupo.userData.ponPostura = (postura) => { Object.assign(actual, postura); grupo.userData.actualiza(0, postura); };
  return grupo;
}

// Mezcla de dos posturas (k: 0 = a … 1 = b)
export function mezclaPosturasSalto(a, b, k, salida = {}) {
  for (const c of CLAVES) salida[c] = a[c] + (b[c] - a[c]) * k;
  return salida;
}
