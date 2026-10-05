// Cabanillas Drive — fase 2: visor de comprobación de la escena.
// Carga el GLB (terreno + edificios), dibuja encima las calles de OSM y compara el
// terreno del GLB con terrain.f32. Convención: 1 unidad = 1 m, Y arriba, norte = −Z.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CALIDAD } from './config/calidad.js';
import { ESCENA } from './config/escena.js';
import { cargaTerreno } from './datos/terreno.js';
import { cargaEscena } from './escena/cargaEscena.js';
import { creaEntorno } from './escena/entorno.js';
import { compruebaTerreno } from './visor/comprobacion.js';
import { cargaGeoJSON, lineasSobreTerreno } from './visor/lineas.js';

const lienzo = document.getElementById('escena');
const estado = document.getElementById('estado');
const textoComprobacion = document.getElementById('comprobacion');
const botonCalles = document.getElementById('botonCalles');

const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: CALIDAD.antialias });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, CALIDAD.pixelRatioMax));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.75;

const escena = new THREE.Scene();
creaEntorno(escena, ESCENA);

const camara = new THREE.PerspectiveCamera(
  ESCENA.camara.fov, window.innerWidth / window.innerHeight, CALIDAD.camaraCerca, CALIDAD.camaraLejos,
);
camara.position.set(...ESCENA.camara.posicion);

const controles = new OrbitControls(camara, lienzo);
controles.target.set(...ESCENA.camara.objetivo);
controles.enableDamping = true;
controles.maxPolarAngle = Math.PI / 2 - 0.03;
controles.minDistance = 5;
controles.maxDistance = ESCENA.camara.distanciaMax;

let calles = null;
function alternaCalles() {
  if (!calles) return;
  calles.visible = !calles.visible;
  botonCalles.setAttribute('aria-pressed', String(calles.visible));
}
botonCalles.addEventListener('click', alternaCalles);
window.addEventListener('keydown', (e) => {
  if (e.key === 'l' || e.key === 'L') alternaCalles();
});

async function inicia() {
  const [terreno, modelo, geoCalles] = await Promise.all([
    cargaTerreno(ESCENA.rutaTerreno),
    cargaEscena(renderer, ESCENA.rutaGlb, {
      terrenoSinLuz: ESCENA.terrenoSinLuz,
      alProgresar: (f) => { estado.textContent = `Cargando escena… ${Math.round(f * 100)} %`; },
    }),
    cargaGeoJSON(ESCENA.rutaCalles),
  ]);
  escena.add(modelo.raiz);
  calles = lineasSobreTerreno(geoCalles, terreno, ESCENA.calles);
  escena.add(calles);

  const triangulos = (mallas) => mallas.reduce((s, m) => s + (m.geometry.index?.count ?? 0) / 3, 0);
  estado.textContent = `Terreno ${Math.round(triangulos(modelo.terreno) / 1000)} k triángulos · `
    + `edificios ${Math.round(triangulos(modelo.edificios) / 1000)} k · ${geoCalles.features.length} calles OSM`;

  // Se deja pintar un fotograma antes de lanzar los rayos
  requestAnimationFrame(() => {
    const r = compruebaTerreno(modelo.terreno, terreno, ESCENA.puntosComprobacion);
    textoComprobacion.textContent = `GLB vs terrain.f32 (${r.puntos} puntos): media ${(r.media * 100).toFixed(1)} cm · `
      + `p95 ${(r.p95 * 100).toFixed(1)} cm · máx ${(r.maxima * 100).toFixed(1)} cm`;
    console.info('[comprobación]', r);
  });
}

inicia().catch((error) => {
  estado.textContent = `Error: ${error.message}`;
  console.error(error);
});

window.addEventListener('resize', () => {
  camara.aspect = window.innerWidth / window.innerHeight;
  camara.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  controles.update();
  renderer.render(escena, camara);
});
