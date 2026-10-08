// Tubería de render según la calidad (src/config/calidad.js):
// - sombras del sol en una caja que sigue a la cámara (con el paso del mapa de sombras fijo
//   para que no tiemblen al moverse)
// - oclusión ambiental N8AO + antialias SMAA + tono y sRGB (OutputPass); sin AO, render directo
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { N8AOPass } from 'n8ao';

// Lo que no proyecta ni recibe sombras: cielo, hierba e impostores (lejos o diminutos)
const SIN_SOMBRA = new Set(['cielo', 'hierba', 'arboles_impostores', 'coches_genericos', 'carteles']);

export function configuraSombras(raiz) {
  raiz.traverse((o) => {
    if (SIN_SOMBRA.has(o.name)) {
      o.traverse((h) => { h.castShadow = false; h.receiveShadow = false; h.userData.sinSombra = true; });
      return;
    }
    if (!o.isMesh || o.userData.sinSombra || o.userData.sombrasPropias) return;
    if (o.userData.esTerreno) {          // el terreno solo recibe (material de suelo.js)
      o.receiveShadow = true;
      return;
    }
    o.castShadow = true;
    o.receiveShadow = true;
  });
}

export function creaRender(renderer, escena, camara, luzSol, calidad) {
  renderer.shadowMap.enabled = calidad.sombras;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const direccion = luzSol.position.clone().normalize();
  if (calidad.sombras) {
    luzSol.castShadow = true;
    const s = luzSol.shadow;
    s.mapSize.set(calidad.mapaSombras, calidad.mapaSombras);
    const r = calidad.radioSombras;
    Object.assign(s.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 800 });
    s.camera.updateProjectionMatrix();
    s.bias = -0.0004;
    s.normalBias = 0.04;
    s.radius = 2;
  }

  let compositor = null;
  let ao = null;
  if (calidad.ao) {
    compositor = new EffectComposer(renderer);
    ao = new N8AOPass(escena, camara, Math.max(1, window.innerWidth), Math.max(1, window.innerHeight));
    ao.setQualityMode(calidad.aoMediaResolucion ? 'Low' : 'Medium');   // antes: fija muestras y resolución
    Object.assign(ao.configuration, {
      aoRadius: 3.0, distanceFalloff: 1.0, intensity: 4.5, gammaCorrection: false,
      halfRes: calidad.aoMediaResolucion,
    });
    compositor.addPass(ao);
    compositor.addPass(new OutputPass());
    compositor.addPass(new SMAAPass());
  }

  // La caja de sombras se centra algo por delante de la cámara, sobre el suelo, y se mueve a
  // saltos de un texel de sombra (sin parpadeo de bordes)
  const centro = new THREE.Vector3();
  const delante = new THREE.Vector3();
  const vista = new THREE.Matrix4();
  const local = new THREE.Vector3();
  function sigueCamara() {
    if (!calidad.sombras) return;
    camara.getWorldDirection(delante);
    delante.y = 0;
    if (delante.lengthSq() > 1e-6) delante.normalize();
    centro.copy(camara.position).addScaledVector(delante, calidad.radioSombras * 0.45);
    const texel = (2 * calidad.radioSombras) / calidad.mapaSombras;
    vista.lookAt(direccion, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
    local.copy(centro).applyMatrix4(vista.clone().invert());
    local.x = Math.round(local.x / texel) * texel;
    local.y = Math.round(local.y / texel) * texel;
    centro.copy(local).applyMatrix4(vista);
    luzSol.target.position.copy(centro);
    luzSol.position.copy(centro).addScaledVector(direccion, 400);
    luzSol.target.updateMatrixWorld();
    luzSol.updateMatrixWorld();
  }

  return {
    render() {
      sigueCamara();
      if (compositor) compositor.render();
      else renderer.render(escena, camara);
    },
    redimensiona(ancho, alto) {
      if (compositor) compositor.setSize(ancho, alto);
    },
    ponProporcionPixeles(proporcion) {
      if (!window.innerWidth || !window.innerHeight) return;
      renderer.setPixelRatio(proporcion);
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (compositor) {
        compositor.setPixelRatio(proporcion);
        compositor.setSize(window.innerWidth, window.innerHeight);
      }
    },
    ao,
    direccion,          // hacia el sol (o la luna): la mueve el ciclo de día
  };
}
