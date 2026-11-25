// Máquinas del modo agricultura sobre el mismo controlador que el coche (src/vehiculo/coche.js,
// DynamicRayCastVehicleController de Rapier) con su configuración (src/config/maquinaria.js) y su
// modelo (public/assets/maquinaria/, de tools/build_maquinaria.py y npm run maquinaria).
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RUTA_MAQUINARIA } from '../config/maquinaria.js';
import { creaCoche } from '../vehiculo/coche.js';
import { leeManifiesto } from './aperos.js';

// Modelo con la forma que espera preparaCocheJugador: { id, info, escena }
export async function cargaModeloMaquina(id) {
  const info = (await leeManifiesto())[id];
  if (!info) throw new Error(`No hay «${id}» en maquinaria.json`);
  const cargador = new GLTFLoader();
  cargador.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await cargador.loadAsync(`${RUTA_MAQUINARIA}${info.archivo}`);
  gltf.scene.updateMatrixWorld(true);
  return { id, info, escena: gltf.scene };
}

// Una máquina conducible: la interfaz es la del coche (aplicaEntrada, paso, sincroniza, recoloca,
// estado…). config: TRACTOR u otra con su forma
// Si el modelo tiene brazos del tripuntal, se apartan antes (preparaCocheJugador une las piezas
// por material) y quedan en maquina.tripuntal: { nodo, matrizPadre } para moverlos (enganche.js).
// maquina.base es el modelo con el suelo en y = 0 (donde se cuelgan brazos y aperos).
export async function creaMaquina(fisica, escena, config) {
  const modelo = await cargaModeloMaquina(config.modelo);
  const brazos = modelo.escena.getObjectByName('brazos_tripuntal');
  let tripuntal = null;
  if (brazos) {
    tripuntal = { nodo: brazos, matrizPadre: brazos.parent.matrixWorld.clone() };
    brazos.removeFromParent();
  }
  const maquina = creaCoche(fisica, escena, modelo, config);
  maquina.base = maquina.modelo.grupo.children[0];
  maquina.tripuntal = tripuntal;
  // Sombras como el coche del jugador
  maquina.modelo.grupo.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  return maquina;
}
