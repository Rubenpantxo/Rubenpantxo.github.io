// Carga todo el mundo de Cabanillas: terreno (datos + GLB) y edificios generados.
import * as THREE from 'three';
import { cargaTerreno } from '../datos/terreno.js';
import { cargaEscena } from './cargaEscena.js';
import { creaEdificios } from './edificios.js';

async function json(ruta) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) throw new Error(`No se pudo leer ${ruta}`);
  return respuesta.json();
}

export async function cargaMundo(renderer, ajustes, { alProgresar } = {}) {
  const cargadorTexturas = new THREE.TextureLoader();
  const [terreno, modelo, orto, geoEdificios, aspecto, atlas] = await Promise.all([
    cargaTerreno(ajustes.rutaTerreno),
    cargaEscena(renderer, ajustes.rutaGlb, { terrenoSinLuz: ajustes.terrenoSinLuz, alProgresar }),
    json(ajustes.rutaOrto),
    json(ajustes.rutaEdificios),
    json(ajustes.rutaAspecto),
    cargadorTexturas.loadAsync(ajustes.rutaAtlasTejados),
  ]);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const rejilla = {
    filas: orto.filas,
    columnas: orto.columnas,
    tx: orto.tesela_m[0],
    tz: orto.tesela_m[1],
    ancho: terreno.meta['tamaño_x_m'],
    alto: terreno.meta['tamaño_z_m'],
  };
  const edificios = creaEdificios(geoEdificios, aspecto, atlas, rejilla, { tejadosSinLuz: ajustes.tejadosSinLuz });

  const raiz = new THREE.Group();
  raiz.name = 'mundo';
  raiz.add(modelo.raiz, edificios.grupo);
  raiz.updateMatrixWorld(true);
  return { raiz, terreno, mallasTerreno: modelo.terreno, edificios, geoEdificios, rejilla };
}
