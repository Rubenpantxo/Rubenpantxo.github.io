// Cabanillas Drive — arranque. Por defecto el juego; con ?visor, el visor de comprobación;
// con ?arboles, la galería de modelos de árbol.
// Convención: 1 unidad = 1 m, Y arriba, norte = −Z.
import * as THREE from 'three';
import { CALIDAD } from './config/calidad.js';
import { CAMARA } from './config/camara.js';
import { ESCENA } from './config/escena.js';
import { creaEntorno } from './escena/entorno.js';
import { configuraSombras, creaRender } from './escena/render.js';
import { iniciaJuego } from './juego/juego.js';
import { iniciaVisor } from './visor/visor.js';
import { iniciaVisorArboles } from './visor/visorArboles.js';

const parametros = new URLSearchParams(location.search);
if (parametros.has('debug')) console.info(`[calidad] nivel ${CALIDAD.nivel}`, CALIDAD);
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

// Sol del día de la ortofoto (tools/10_sol.py); sin él, el de config/escena.js
const sol = await fetch(ESCENA.rutaSol).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const escena = new THREE.Scene();
const { luzSol } = creaEntorno(escena, ESCENA, sol);
const camara = new THREE.PerspectiveCamera(
  CAMARA.persecucion.fov, window.innerWidth / window.innerHeight, CALIDAD.camaraCerca, CALIDAD.camaraLejos,
);

const render = creaRender(renderer, escena, camara, luzSol, CALIDAD);
if (import.meta.env.DEV) window.__render = render;
window.addEventListener('resize', () => {
  camara.aspect = window.innerWidth / window.innerHeight;
  camara.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render.redimensiona(window.innerWidth, window.innerHeight);
});

const modo = parametros.has('visor') ? iniciaVisor : parametros.has('arboles') ? iniciaVisorArboles : iniciaJuego;
const reloj = new THREE.Clock();
let actualiza = () => {};
renderer.setAnimationLoop(() => {
  const dt = Math.min(reloj.getDelta(), 0.1);
  actualiza(dt);
  render.render();
});

modo({ renderer, escena, camara, ui })
  .then((m) => {
    configuraSombras(escena);
    actualiza = m.actualiza;
  })
  .catch((error) => {
    ui.estado.textContent = `Error: ${error.message}`;
    console.error(error);
  });
