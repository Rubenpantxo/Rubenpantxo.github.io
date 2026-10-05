// Cielo, luces y niebla comunes a todas las vistas.
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

export function creaEntorno(escena, ajustes) {
  const { sol, niebla } = ajustes;

  const cielo = new Sky();
  cielo.scale.setScalar(20000);
  escena.add(cielo);
  const direccionSol = new THREE.Vector3().setFromSphericalCoords(
    1,
    THREE.MathUtils.degToRad(90 - sol.elevacionGrados),
    THREE.MathUtils.degToRad(sol.azimutGrados),
  );
  const u = cielo.material.uniforms;
  u.turbidity.value = 2;
  u.rayleigh.value = 2.5;
  u.mieCoefficient.value = 0.005;
  u.mieDirectionalG.value = 0.8;
  u.sunPosition.value.copy(direccionSol);

  escena.add(new THREE.HemisphereLight(0xcfe2ff, 0x8a7a5a, 1.1));
  const luzSol = new THREE.DirectionalLight(0xfff4e0, sol.intensidad);
  luzSol.position.copy(direccionSol).multiplyScalar(1000);
  escena.add(luzSol);

  escena.fog = new THREE.Fog(niebla.color, niebla.cerca, niebla.lejos);
  return { cielo, luzSol };
}
