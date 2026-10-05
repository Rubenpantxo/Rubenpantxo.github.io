// Cielo, sol, reflejos y niebla comunes a todas las vistas.
// El sol es el del día de la ortofoto (tools/10_sol.py → assets/sol.json): así las sombras 3D
// caen donde la foto ya tiene las suyas.
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

// Dirección hacia el sol: acimut desde el norte en sentido horario (norte = −Z, este = +X)
export function direccionSol(acimutGrados, elevacionGrados) {
  const a = THREE.MathUtils.degToRad(acimutGrados);
  const e = THREE.MathUtils.degToRad(elevacionGrados);
  return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
}

function ajustaCielo(cielo, direccion) {
  const u = cielo.material.uniforms;
  u.turbidity.value = 3;
  u.rayleigh.value = 1.6;
  u.mieCoefficient.value = 0.005;
  u.mieDirectionalG.value = 0.8;
  u.sunPosition.value.copy(direccion);
}

// Cielo fotográfico (tools/12_cielo.py, HDRI CC0 de Poly Haven): fondo, reflejos y luz
// ambiente. Se gira para que su sol quede en el acimut del sol de la ortofoto. Sin él, se
// queda el cielo calculado (Sky).
export async function cargaCielo(ruta, renderer, escena, direccion) {
  const info = await fetch(`${ruta}cielo.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!info) return false;
  const textura = await new THREE.TextureLoader().loadAsync(`${ruta}cielo.jpg`);
  textura.mapping = THREE.EquirectangularReflectionMapping;
  textura.colorSpace = THREE.SRGBColorSpace;
  // En la textura, el ángulo horizontal es atan(z, x); el giro lleva el sol de la foto al del
  // juego (comprobado mirando hacia el sol: el giro se aplica a la dirección de consulta)
  const anguloFoto = (info.u_sol - 0.5) * Math.PI * 2;
  const giro = anguloFoto - Math.atan2(direccion.z, direccion.x);
  escena.background = textura;
  escena.backgroundRotation.set(0, giro, 0);
  const pmrem = new THREE.PMREMGenerator(renderer);
  escena.environment = pmrem.fromEquirectangular(textura).texture;
  escena.environmentRotation.set(0, giro, 0);
  escena.environmentIntensity = 0.75;
  pmrem.dispose();
  const [r, g, b] = info.color_horizonte_srgb;
  escena.fog?.color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
  const cielo = escena.getObjectByName('cielo');
  if (cielo) cielo.visible = false;
  escena.userData.cieloFoto = true;
  escena.userData.giroCieloBase = anguloFoto;
  return true;
}

// Reflejos (y luz ambiente de los materiales PBR) sacados del cielo calculado, con un suelo
// del color medio del terreno. Si ya hay cielo fotográfico, no hace nada.
export function creaReflejos(renderer, escena, intensidad = 0.6) {
  if (escena.userData.cieloFoto) return;
  const cielo = escena.getObjectByName('cielo');
  const fuente = new THREE.Scene();
  const copia = new Sky();
  copia.scale.setScalar(1000);
  ajustaCielo(copia, cielo ? cielo.material.uniforms.sunPosition.value : new THREE.Vector3(0, 1, 0));
  fuente.add(copia);
  const suelo = new THREE.Mesh(new THREE.CircleGeometry(900, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x6e624f, side: THREE.DoubleSide }));
  suelo.position.y = -2;
  fuente.add(suelo);
  const pmrem = new THREE.PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(fuente, 0.02).texture;
  escena.environmentIntensity = intensidad;
  pmrem.dispose();
}

export function creaEntorno(escena, ajustes, sol) {
  const { niebla } = ajustes;
  const direccion = sol
    ? direccionSol(sol.acimut_grados, sol.elevacion_grados)
    : direccionSol(ajustes.sol.acimutGrados, ajustes.sol.elevacionGrados);

  const cielo = new Sky();
  cielo.name = 'cielo';
  cielo.scale.setScalar(20000);
  ajustaCielo(cielo, direccion);
  escena.add(cielo);

  escena.add(new THREE.HemisphereLight(0xcfe2ff, 0x8a7a5a, 0.9));
  const luzSol = new THREE.DirectionalLight(0xfff1dc, ajustes.sol.intensidad);
  luzSol.name = 'sol';
  luzSol.position.copy(direccion).multiplyScalar(1000);
  escena.add(luzSol, luzSol.target);

  escena.fog = new THREE.Fog(niebla.color, niebla.cerca, niebla.lejos);
  return { cielo, luzSol, direccion };
}
