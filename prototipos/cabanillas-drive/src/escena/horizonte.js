// Horizonte (PLAN_SALTO.md, S1): anillo de 8 × 8 km de relieve (MDT05) y ortofoto (PNOA) alrededor
// de la zona del juego, con un hueco donde está el terreno de verdad. Lo prepara tools/40_horizonte.py.
// Sin luz (como el terreno: la ortofoto ya trae la luz del día), sin sombras ni colisiones.
// En calidad baja, la mitad de vértices y la textura de 1024 px.
import * as THREE from 'three';
import { CALIDAD } from '../config/calidad.js';

const FALDA_RADIO_M = 15000;

export async function cargaHorizonte(ruta) {
  try {
    const meta = await fetch(`${ruta}horizonte.json`).then((r) => (r.ok ? r.json() : null));
    if (!meta) return null;
    const bajo = CALIDAD.nivel === 'bajo';
    const [alturas, textura] = await Promise.all([
      fetch(`${ruta}horizonte.f32`).then((r) => r.arrayBuffer()).then((b) => new Float32Array(b)),
      new THREE.TextureLoader().loadAsync(`${ruta}${bajo ? meta.texturas.bajo : meta.texturas.alta}`),
    ]);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.anisotropy = 4;
    return creaMalla(meta, alturas, textura, bajo ? 2 : 1);
  } catch (error) {
    console.warn('[horizonte] no se ha podido cargar', error?.message ?? error);
    return null;
  }
}

function creaMalla(meta, alturas, textura, salto) {
  const N = meta.vertices;
  const { lado_m: L, paso_m: paso } = meta;
  const { mitad_x: mx, mitad_z: mz } = meta.hueco;
  const filas = [];
  for (let i = 0; i < N; i += salto) filas.push(i);
  if (filas.at(-1) !== N - 1) filas.push(N - 1);
  const n = filas.length;
  const pos = new Float32Array(n * n * 3);
  const uv = new Float32Array(n * n * 2);
  const dentro = new Uint8Array(n * n);
  for (let a = 0; a < n; a++) {
    for (let b = 0; b < n; b++) {
      const f = filas[a]; const c = filas[b];
      const x = meta.vertice_0.x + c * paso;
      const z = meta.vertice_0.z + f * paso;
      const k = a * n + b;
      pos.set([x, alturas[f * N + c], z], k * 3);
      uv.set([(x - meta.vertice_0.x) / L, 1 - (z - meta.vertice_0.z) / L], k * 2);
      dentro[k] = Math.abs(x) <= mx && Math.abs(z) <= mz ? 1 : 0;
    }
  }
  // Sin triángulos con los tres vértices dentro de la zona o en su borde (ahí está el terreno)
  const indices = [];
  const tri = (p, q, r) => { if (!(dentro[p] && dentro[q] && dentro[r])) indices.push(p, q, r); };
  for (let a = 0; a + 1 < n; a++) {
    for (let b = 0; b + 1 < n; b++) {
      const k = a * n + b;
      tri(k, k + n, k + 1);
      tri(k + 1, k + n, k + n + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  const malla = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: textura, fog: true }));
  malla.name = 'horizonte';
  malla.userData.sinSombra = true;
  malla.userData.triangulos = indices.length / 3;
  // Falda: un suelo liso enorme por debajo, que asoma más allá del anillo. Allí la niebla ya es
  // total, así que se ve del color de la niebla (el del horizonte del cielo) y tapa la mitad de
  // abajo del cielo fotográfico, que si no asoma desde el aire como una franja marrón
  let minimo = Infinity;
  for (let i = 1; i < pos.length; i += 3) minimo = Math.min(minimo, pos[i]);
  const falda = new THREE.Mesh(new THREE.CircleGeometry(FALDA_RADIO_M, 48).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xc9d6e3, fog: true }));
  falda.name = 'horizonte_falda';
  falda.position.y = minimo - 25;
  falda.userData.sinSombra = true;
  malla.add(falda);
  return malla;
}
