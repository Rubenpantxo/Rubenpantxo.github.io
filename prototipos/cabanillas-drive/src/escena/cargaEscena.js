// Carga el GLB generado por tools/build_scene.py + gltf-transform (meshopt + WebP).
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { materialSuelo } from './suelo.js';

// Nombre del nodo con prefijo terreno_ / edificios_ (el propio mesh o su grupo padre)
function grupoDe(objeto) {
  for (let o = objeto; o; o = o.parent) {
    if (o.name.startsWith('terreno_')) return 'terreno';
    if (o.name.startsWith('edificios_')) return 'edificios';
  }
  return null;
}

export async function cargaEscena(renderer, ruta, { terrenoSinLuz, alProgresar, liberaImagenes = false } = {}) {
  const cargador = new GLTFLoader();
  cargador.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await cargador.loadAsync(ruta, (e) => {
    if (alProgresar && e.total) alProgresar(e.loaded / e.total);
  });

  const anisotropia = renderer.capabilities.getMaxAnisotropy();
  const terreno = [];
  const edificios = [];
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const grupo = grupoDe(o);
    if (grupo === 'terreno') {
      const mapa = o.material.map;
      if (mapa) mapa.anisotropy = anisotropia; // nitidez de la ortofoto en vistas rasantes
      // En móvil: tras subir la textura a la GPU se suelta la copia decodificada (la ortofoto no
      // cambia nunca, no hace falta volver a subirla)
      if (mapa && liberaImagenes) mapa.onUpdate = () => { mapa.image?.close?.(); };
      if (terrenoSinLuz) {
        const original = o.material;
        o.material = materialSuelo(mapa, original.name);
        original.dispose();
      }
      o.userData.esTerreno = true;
      terreno.push(o);
    } else if (grupo === 'edificios') {
      edificios.push(o);
    }
  });
  gltf.scene.updateMatrixWorld(true);
  return { raiz: gltf.scene, terreno, edificios };
}
