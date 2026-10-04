// Cabanillas Drive — fase 0: escena mínima para comprobar el andamiaje.
// Convención: 1 unidad = 1 m, Y arriba, norte = −Z.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { CALIDAD } from './config/calidad.js';

const lienzo = document.getElementById('escena');

const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: CALIDAD.antialias });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, CALIDAD.pixelRatioMax));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.6;
renderer.shadowMap.enabled = CALIDAD.sombras;

const escena = new THREE.Scene();

const camara = new THREE.PerspectiveCamera(
  55, window.innerWidth / window.innerHeight, CALIDAD.camaraCerca, CALIDAD.camaraLejos,
);
camara.position.set(30, 10, 40);

// Cielo físico y sol
const cielo = new Sky();
cielo.scale.setScalar(10000);
escena.add(cielo);

const sol = new THREE.Vector3().setFromSphericalCoords(
  1, THREE.MathUtils.degToRad(90 - 35), THREE.MathUtils.degToRad(200),
);
const uniformesCielo = cielo.material.uniforms;
uniformesCielo.turbidity.value = 2;
uniformesCielo.rayleigh.value = 2.5;
uniformesCielo.mieCoefficient.value = 0.005;
uniformesCielo.mieDirectionalG.value = 0.8;
uniformesCielo.sunPosition.value.copy(sol);

// Luces: ambiente hemisférico + direccional alineada con el sol del cielo
escena.add(new THREE.HemisphereLight(0xbfd8ff, 0x8a7a5a, 0.9));

const luzSol = new THREE.DirectionalLight(0xffffff, 2.2);
luzSol.position.copy(sol).multiplyScalar(200);
luzSol.castShadow = CALIDAD.sombras;
luzSol.shadow.mapSize.setScalar(CALIDAD.tamanoMapaSombras);
Object.assign(luzSol.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 500 });
escena.add(luzSol);

// Niebla suave para que el borde del suelo se funda con el horizonte
escena.fog = new THREE.Fog(0xc9d6e3, 400, 1400);

// Suelo provisional: plano gris de 3 × 3 km (el tamaño aproximado de la zona real)
const suelo = new THREE.Mesh(
  new THREE.PlaneGeometry(3000, 3000),
  new THREE.MeshStandardMaterial({ color: 0x8c8c8c, roughness: 0.95 }),
);
suelo.rotation.x = -Math.PI / 2;
suelo.receiveShadow = true;
escena.add(suelo);

// Cubo de referencia de 4 m para tener escala y una sombra visible
const cubo = new THREE.Mesh(
  new THREE.BoxGeometry(4, 4, 4),
  new THREE.MeshStandardMaterial({ color: 0xd9b77e, roughness: 0.8 }),
);
cubo.position.y = 2;
cubo.castShadow = true;
escena.add(cubo);

// Cámara orbital (ratón y táctil)
const controles = new OrbitControls(camara, lienzo);
controles.target.set(0, 4, 0);
controles.enableDamping = true;
controles.maxPolarAngle = Math.PI / 2 - 0.05; // no bajar por debajo del suelo
controles.minDistance = 5;
controles.maxDistance = 600;

function alRedimensionar() {
  camara.aspect = window.innerWidth / window.innerHeight;
  camara.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', alRedimensionar);

renderer.setAnimationLoop(() => {
  controles.update();
  renderer.render(escena, camara);
});
