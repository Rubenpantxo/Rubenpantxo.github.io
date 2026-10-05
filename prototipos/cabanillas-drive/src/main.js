// Cabanillas Drive — arranque. Por defecto el juego; con ?visor, el visor de comprobación;
// con ?arboles, la galería de modelos de árbol.
// Convención: 1 unidad = 1 m, Y arriba, norte = −Z.
import * as THREE from 'three';
import { CALIDAD } from './config/calidad.js';
import { CAMARA } from './config/camara.js';
import { ESCENA } from './config/escena.js';
import { creaEntorno } from './escena/entorno.js';
import { iniciaJuego } from './juego/juego.js';
import { iniciaVisor } from './visor/visor.js';
import { iniciaVisorArboles } from './visor/visorArboles.js';

const parametros = new URLSearchParams(location.search);
const ui = {
  panel: document.getElementById('panel'),
  estado: document.getElementById('estado'),
  velocidad: document.getElementById('velocidad'),
  ayuda: document.getElementById('ayuda'),
  tactil: document.getElementById('tactil'),
  mostrarFps: parametros.has('debug'),
};

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('escena'), antialias: CALIDAD.antialias });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, CALIDAD.pixelRatioMax));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.75;

const escena = new THREE.Scene();
creaEntorno(escena, ESCENA);
const camara = new THREE.PerspectiveCamera(
  CAMARA.persecucion.fov, window.innerWidth / window.innerHeight, CALIDAD.camaraCerca, CALIDAD.camaraLejos,
);

window.addEventListener('resize', () => {
  camara.aspect = window.innerWidth / window.innerHeight;
  camara.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const modo = parametros.has('visor') ? iniciaVisor : parametros.has('arboles') ? iniciaVisorArboles : iniciaJuego;
const reloj = new THREE.Clock();
let actualiza = () => {};
renderer.setAnimationLoop(() => {
  const dt = Math.min(reloj.getDelta(), 0.1);
  actualiza(dt);
  renderer.render(escena, camara);
});

modo({ renderer, escena, camara, ui })
  .then((m) => { actualiza = m.actualiza; })
  .catch((error) => {
    ui.estado.textContent = `Error: ${error.message}`;
    console.error(error);
  });
