// Máquinas del modo agricultura sobre el mismo controlador que el coche (src/vehiculo/coche.js,
// DynamicRayCastVehicleController de Rapier) con su configuración (src/config/maquinaria.js) y su
// modelo (public/assets/maquinaria/, de tools/build_maquinaria.py y npm run maquinaria).
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RUTA_MAQUINARIA } from '../config/maquinaria.js';
import { creaCoche } from '../vehiculo/coche.js';

let manifiesto = null;

// Modelo con la forma que espera preparaCocheJugador: { id, info, escena }
export async function cargaModeloMaquina(id) {
  if (!manifiesto) {
    const r = await fetch(`${RUTA_MAQUINARIA}maquinaria.json`);
    if (!r.ok) throw new Error(`No se pudo leer ${RUTA_MAQUINARIA}maquinaria.json (¿npm run maquinaria?)`);
    manifiesto = await r.json();
  }
  const info = manifiesto[id];
  if (!info) throw new Error(`No hay «${id}» en maquinaria.json`);
  const cargador = new GLTFLoader();
  cargador.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await cargador.loadAsync(`${RUTA_MAQUINARIA}${info.archivo}`);
  gltf.scene.updateMatrixWorld(true);
  return { id, info, escena: gltf.scene };
}

// Una máquina conducible: la interfaz es la del coche (aplicaEntrada, paso, sincroniza, recoloca,
// estado…). config: TRACTOR u otra con su forma
export async function creaMaquina(fisica, escena, config) {
  const modelo = await cargaModeloMaquina(config.modelo);
  const maquina = creaCoche(fisica, escena, modelo, config);
  // Sombras como el coche del jugador
  maquina.modelo.grupo.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  return maquina;
}
