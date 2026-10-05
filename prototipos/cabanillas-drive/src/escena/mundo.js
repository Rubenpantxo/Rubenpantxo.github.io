// Carga todo el mundo de Cabanillas: terreno (datos + GLB) y edificios generados.
import * as THREE from 'three';
import { cargaTerreno } from '../datos/terreno.js';
import { cargaEscena } from './cargaEscena.js';
import { CALIDAD } from '../config/calidad.js';
import { creaEdificios } from './edificios.js';
import { aplicaDetalleSuelo, cargaDetalleSuelo } from './suelo.js';

// Tejados del LiDAR (tools/09_tejados.py): índice JSON + binario con vértices e índices
async function cargaTejados(ruta) {
  const indice = await json(`${ruta}tejados.json`);
  const respuesta = await fetch(`${ruta}${indice.binario.archivo}`);
  if (!respuesta.ok) throw new Error(`No se pudo leer ${indice.binario.archivo}`);
  const datos = await respuesta.arrayBuffer();
  const { vertices, indices } = indice.binario;
  return {
    edificios: indice.edificios,
    vertices: new Int16Array(datos, 0, vertices * 3),
    indices: new Uint16Array(datos, vertices * 6, indices),
  };
}

async function json(ruta) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) throw new Error(`No se pudo leer ${ruta}`);
  return respuesta.json();
}

export async function cargaMundo(renderer, ajustes, { alProgresar } = {}) {
  const cargadorTexturas = new THREE.TextureLoader();
  const [terreno, modelo, orto, geoEdificios, aspecto, atlas, tejados, detalleSuelo] = await Promise.all([
    cargaTerreno(ajustes.rutaTerreno),
    cargaEscena(renderer, ajustes.rutaGlb, { terrenoSinLuz: ajustes.terrenoSinLuz, alProgresar }),
    json(ajustes.rutaOrto),
    json(ajustes.rutaEdificios),
    json(ajustes.rutaAspecto),
    cargadorTexturas.loadAsync(ajustes.rutaAtlasTejados),
    cargaTejados(ajustes.rutaTejados),
    CALIDAD.detalleSuelo ? cargaDetalleSuelo(ajustes.rutaSuelo, renderer) : null,
  ]);
  aplicaDetalleSuelo(modelo.terreno, detalleSuelo);
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
  const edificios = creaEdificios(geoEdificios, aspecto, atlas, rejilla, { tejadosSinLuz: ajustes.tejadosSinLuz, tejados });

  const raiz = new THREE.Group();
  raiz.name = 'mundo';
  raiz.add(modelo.raiz, edificios.grupo);
  raiz.updateMatrixWorld(true);
  return { raiz, terreno, mallasTerreno: modelo.terreno, edificios, geoEdificios, rejilla };
}
