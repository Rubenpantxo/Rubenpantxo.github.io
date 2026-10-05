// Galería de modelos de árbol (?arboles): todas las variantes en fila, a su tamaño típico,
// con la luz del juego. Para ajustar tools/genera_arboles.mjs.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ESCENA } from '../config/escena.js';
import { cargaModelosArboles, creaArboles } from '../escena/arboles.js';
import { creaReflejos } from '../escena/entorno.js';

const ALTURA_TIPICA = { frondosa: 8, conifera: 10, cipres: 9, chopo: 18, palmera: 6 };

export async function iniciaVisorArboles({ renderer, escena, camara, ui }) {
  creaReflejos(renderer, escena);
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0xb8a888 }));
  escena.add(suelo);
  const modelos = await cargaModelosArboles(ESCENA.rutaModelosArboles);
  const ids = Object.keys(modelos.modelos);
  const tipos = Object.keys(modelos.manifiesto.porTipo);
  // Dos filas: delante el modelo a su tamaño típico, detrás el impostor (forzado a lejos)
  const datos = { tipos, arboles: [] };
  ids.forEach((id, i) => {
    const { info } = modelos.modelos[id];
    const h = ALTURA_TIPICA[info.tipo] ?? 8;
    const x = (i - (ids.length - 1) / 2) * 14;
    for (const z of [0, -60]) datos.arboles.push([x, z, h, info.radio * h, tipos.indexOf(info.tipo), 90, 110, 70]);
  });
  const terreno = { alturaEn: () => 0 };
  // Elige siempre la variante de su posición: se reemplaza la elección por la de la fila
  const arboles = creaArboles(renderer, modelos, datos, terreno, { variantes: ids.flatMap((id) => [id, id]), entorno: escena });
  escena.add(arboles.raiz);

  camara.position.set(0, 9, 45);
  const controles = new OrbitControls(camara, renderer.domElement);
  controles.target.set(0, 5, -5);
  controles.enableDamping = true;
  ui.estado.textContent = ids.join(' · ');

  // Fila delantera en 3D y trasera en impostor (con la cámara hacia el frente)
  function actualiza(dt) {
    controles.update();
    arboles.avanza(dt);
    arboles.actualiza(camara.position, Math.max(5, camara.position.z + 40));
  }
  if (import.meta.env.DEV) window.__arboles = { THREE, renderer, camara, escena, arboles, controles };
  return { actualiza };
}
