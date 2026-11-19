// Modelos del salto (de Rubén, modelos/salto/ → npm run salto → public/assets/salto/):
// - avion.glb: avión de carga con rampa trasera abierta y cuatro hélices (nodos Helice_1…4).
// - mochila_paracaidas.glb: mochila con arnés, solapas (Solapa_Izq, Solapa_Der, Solapa_Inf),
//   pilotillo, bandas, cuerdas y cúpula de 9 celdas. Viene exportada ABIERTA (solapas giradas,
//   cúpula desplegada): esa es la pose final de la apertura; la cerrada es la de las solapas sin
//   girar y todo lo demás recogido dentro de la mochila.
// Si un modelo no carga, salto.js usa las figuras provisionales de figuras.js.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { SALTO } from '../config/salto.js';

const suave = (t) => t * t * (3 - 2 * t);
const tramo = (k, a, b) => suave(THREE.MathUtils.clamp((k - a) / (b - a), 0, 1));

export async function cargaModelosSalto(ruta = SALTO.modelos.ruta) {
  const cargador = new GLTFLoader();
  cargador.setMeshoptDecoder(MeshoptDecoder);
  const carga = (archivo) => cargador.loadAsync(`${ruta}${archivo}`).then((g) => g.scene).catch((error) => {
    console.warn(`[salto] sin ${archivo}: se usa la figura provisional`, error?.message ?? error);
    return null;
  });
  const [avion, mochila] = await Promise.all([carga(SALTO.modelos.avion), carga(SALTO.modelos.mochila)]);
  return { avion, mochila };
}

// Avión listo para la escena (una copia del modelo): las hélices giran sobre su eje (el de
// avance del avión, visto desde cada hélice)
export function preparaAvion(modelo) {
  const avion = modelo.clone(true);
  avion.name = 'salto_avion';
  avion.updateMatrixWorld(true);
  const raizInversa = new THREE.Quaternion();
  const helices = [];
  avion.traverse((o) => {
    if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; }
    if (!/^Helice_\d+$/.test(o.name)) return;
    // Eje de avance (−Z del avión) en los ejes propios de la hélice
    o.getWorldQuaternion(raizInversa).invert();
    const eje = new THREE.Vector3(0, 0, -1).applyQuaternion(raizInversa).normalize();
    helices.push({ nodo: o, eje });
  });
  avion.userData.giraHelices = (angulo) => { for (const h of helices) h.nodo.rotateOnAxis(h.eje, angulo); };
  avion.userData.helices = helices.length;
  return avion;
}

// Mochila-paracaídas para la espalda del personaje (una copia del modelo). Devuelve el grupo con:
//   userData.ponApertura(k): 0 = cerrada en la espalda … 1 = cúpula desplegada (la pose del GLB)
//   userData.ponPliegue(k): 0 = abierta … 1 = lona caída y plegada (al aterrizar)
export function preparaMochila(modelo) {
  const mochila = modelo.clone(true);
  mochila.name = 'salto_mochila';
  const nodo = (nombre) => mochila.getObjectByName(nombre);
  mochila.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });

  // Solapas: de sin girar (cerrada) al giro de la pose abierta. Si el modelo viene cerrado (el que
  // genera tools/build_activos_salto.py), el giro de apertura sale de la configuración
  const solapas = Object.entries(SALTO.modelos.aperturaSolapas).map(([nombre, [x, y, z, grados]]) => {
    const n = nodo(nombre);
    if (!n) return null;
    const cerrada = new THREE.Quaternion();
    const vieneAbierta = n.quaternion.angleTo(cerrada) > 0.2;
    const abierta = vieneAbierta ? n.quaternion.clone()
      : new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(x, y, z), THREE.MathUtils.degToRad(grados));
    return { n, abierta, cerrada };
  }).filter(Boolean);

  // Lo que sale de la mochila: bandas, cuerdas y cúpula, dentro de un grupo que crece desde ella
  const despliegue = new THREE.Group();
  despliegue.name = 'despliegue';
  mochila.add(despliegue);
  for (const nombre of ['Bandas_Elevadores', 'Cuerdas_Suspension', 'Cupula_Paracaidas']) {
    const n = nodo(nombre);
    if (n) despliegue.attach(n);
  }
  const cupula = nodo('Cupula_Paracaidas');
  const escalaCupula = cupula ? cupula.scale.clone() : null;
  // Pilotillo: del interior de la mochila a su sitio, por encima de la cúpula
  const pilotillo = nodo('Pilotillo');
  const pilotilloArriba = pilotillo ? pilotillo.position.clone() : null;
  const pilotilloDentro = new THREE.Vector3(0, 0.1, 0.1);

  mochila.userData.ponApertura = (k) => {
    for (const s of solapas) s.n.quaternion.slerpQuaternions(s.cerrada, s.abierta, tramo(k, 0, 0.18));
    if (pilotillo) {
      const kp = tramo(k, 0.05, 0.4);
      pilotillo.visible = kp > 0.01;
      pilotillo.position.lerpVectors(pilotilloDentro, pilotilloArriba, kp);
      pilotillo.scale.setScalar(0.15 + 0.85 * kp);
    }
    // La lona sale estrecha y estirada hacia arriba y luego se abre a lo ancho
    const alto = tramo(k, 0.15, 0.7);
    const ancho = tramo(k, 0.45, 1);
    despliegue.visible = alto > 0.01;
    despliegue.scale.set(0.08 + 0.92 * Math.max(alto * 0.35, ancho), Math.max(0.02, alto), 0.15 + 0.85 * ancho);
    if (cupula) cupula.scale.copy(escalaCupula);
  };
  mochila.userData.ponPliegue = (k) => {
    const e = suave(THREE.MathUtils.clamp(k, 0, 1));
    despliegue.scale.set(1 - 0.6 * e, Math.max(0.02, 1 - e), 1 - 0.3 * e);
    despliegue.rotation.x = 0.9 * e;                    // cae hacia atrás
    if (pilotillo) { pilotillo.visible = e < 0.6; pilotillo.position.y = THREE.MathUtils.lerp(pilotilloArriba.y, 0.3, e); }
  };
  mochila.userData.ponApertura(0);
  return mochila;
}
