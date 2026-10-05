// Edificios generados en el navegador desde buildings.geojson (Catastro + LiDAR):
// - tejado con su trozo real de ortofoto (atlas tejados.jpg)
// - fachadas procedurales individuales (fachadas.glsl.js) según plantas, estilo y calle
// Se agrupan en los mismos chunks que el terreno (orto.json) para la carga por distancia.
import * as THREE from 'three';
import { GLSL_FACHADA } from './fachadas.glsl.js';

const PALETAS = {
  enfoscado: ['#ece5d4', '#e7d9b9', '#ddc69c', '#f0eadf', '#e9d0b0', '#d8c2a2', '#f2ede3', '#e5caa9', '#e0d6c4'],
  ladrillo: ['#9d5b3d', '#a9674b', '#8f5139', '#b17b59', '#975f46', '#a0705a'],
  piedra: ['#c0af90', '#cabb9e', '#ae9d81'],
  nave: ['#cacdcf', '#d9d7d0', '#b9bdc0', '#e3e1db', '#c4c9c2'],
  hormigon: ['#aaa7a1', '#b9b5ad'],
  porche: ['#d8cdb8', '#bfb39c'],
};
const ESTILOS = { enfoscado: 0, ladrillo: 1, piedra: 2, nave: 3, hormigon: 4, porche: 5 };

// Generador pseudoaleatorio repetible por edificio
function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function areaAnillo(anillo) {
  let s = 0;
  for (let i = 0; i < anillo.length; i++) {
    const [x0, z0] = anillo[i];
    const [x1, z1] = anillo[(i + 1) % anillo.length];
    s += x0 * z1 - x1 * z0;
  }
  return Math.abs(s) / 2;
}

function eligeEstilo(props, area, r) {
  if (props.tipo === 'cobertizo') return 'porche';
  if (['fronton', 'deposito', 'silos'].includes(props.tipo)) return 'hormigon';
  if (props.tipo === 'religioso' || props.tipo === 'ruinas') return 'piedra';
  if (area > 350 && props.plantas <= 1 && props.height >= 5) return 'nave';
  const x = r();
  if (x < 0.55) return 'enfoscado';
  if (x < 0.88) return 'ladrillo';
  return 'piedra';
}

function sinCierre(anillo) {
  const a = anillo.slice();
  const [x0, z0] = a[0];
  const [x1, z1] = a[a.length - 1];
  if (x0 === x1 && z0 === z1) a.pop();
  return a;
}

// Acumulador de vértices de un chunk (muros y tejados en la misma geometría, 2 grupos)
class Chunk {
  constructor() {
    this.muros = { pos: [], nor: [], col: [], uvMuro: [], muro: [], muro2: [] };
    this.tejados = { pos: [], nor: [], uv: [] };
  }

  muro(a, b, base, alto, color, datos, datos2) {
    const [x0, z0] = a;
    const [x1, z1] = b;
    const largo = Math.hypot(x1 - x0, z1 - z0);
    if (largo < 0.05) return;
    // Anillo exterior CCW en (x, z): la normal exterior es la derecha del lado
    const nx = (z1 - z0) / largo;
    const nz = -(x1 - x0) / largo;
    const techo = base + alto;
    let v = [[x0, base, z0, 0, 0], [x1, base, z1, largo, 0], [x1, techo, z1, largo, alto],
      [x0, base, z0, 0, 0], [x1, techo, z1, largo, alto], [x0, techo, z0, 0, alto]];
    // Orden de los vértices para que la cara mire hacia fuera
    const e1 = [v[1][0] - v[0][0], v[1][1] - v[0][1], v[1][2] - v[0][2]];
    const e2 = [v[2][0] - v[0][0], v[2][1] - v[0][1], v[2][2] - v[0][2]];
    const cx = e1[1] * e2[2] - e1[2] * e2[1];
    const cz = e1[0] * e2[1] - e1[1] * e2[0];
    if (cx * nx + cz * nz < 0) v = [v[0], v[2], v[1], v[3], v[5], v[4]];
    const m = this.muros;
    for (const [x, y, z, u, w] of v) {
      m.pos.push(x, y, z);
      m.nor.push(nx, 0, nz);
      m.col.push(color.r, color.g, color.b);
      m.uvMuro.push(u, w);
      m.muro.push(alto, datos[0], largo, datos[1]);
      m.muro2.push(...datos2);
    }
  }

  tejado(anillos, y, uvRect) {
    const contorno = anillos[0].map(([x, z]) => new THREE.Vector2(x, z));
    const huecos = anillos.slice(1).map((a) => a.map(([x, z]) => new THREE.Vector2(x, z)));
    const puntos = contorno.concat(...huecos);
    const caras = THREE.ShapeUtils.triangulateShape(contorno, huecos);
    let xmin = Infinity; let xmax = -Infinity; let zmin = Infinity; let zmax = -Infinity;
    for (const p of contorno) {
      xmin = Math.min(xmin, p.x); xmax = Math.max(xmax, p.x);
      zmin = Math.min(zmin, p.y); zmax = Math.max(zmax, p.y);
    }
    const [u0, v0, u1, v1] = uvRect;
    const t = this.tejados;
    for (let [a, b, c] of caras) {
      const pa = puntos[a]; const pb = puntos[b]; const pc = puntos[c];
      // Normal hacia arriba: componente y de (b − a) × (c − a) positiva
      if ((pb.y - pa.y) * (pc.x - pa.x) - (pb.x - pa.x) * (pc.y - pa.y) < 0) [b, c] = [c, b];
      for (const i of [a, b, c]) {
        const p = puntos[i];
        t.pos.push(p.x, y, p.y);
        t.nor.push(0, 1, 0);
        t.uv.push(u0 + ((p.x - xmin) / (xmax - xmin || 1)) * (u1 - u0),
          v0 + ((p.y - zmin) / (zmax - zmin || 1)) * (v1 - v0));
      }
    }
  }

  geometria() {
    const m = this.muros;
    const t = this.tejados;
    const nMuros = m.pos.length / 3;
    const nTejados = t.pos.length / 3;
    const total = nMuros + nTejados;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(total * 3);
    pos.set(m.pos);
    pos.set(t.pos, nMuros * 3);
    const nor = new Float32Array(total * 3);
    nor.set(m.nor);
    nor.set(t.nor, nMuros * 3);
    const col = new Float32Array(total * 3).fill(1);
    col.set(m.col);
    const uv = new Float32Array(total * 2);
    uv.set(t.uv, nMuros * 2);
    const uvMuro = new Float32Array(total * 2);
    uvMuro.set(m.uvMuro);
    const muro = new Float32Array(total * 4);
    muro.set(m.muro);
    const muro2 = new Float32Array(total * 4);
    muro2.set(m.muro2);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('aUvMuro', new THREE.BufferAttribute(uvMuro, 2));
    g.setAttribute('aMuro', new THREE.BufferAttribute(muro, 4));
    g.setAttribute('aMuro2', new THREE.BufferAttribute(muro2, 4));
    g.addGroup(0, nMuros, 0);
    g.addGroup(nMuros, nTejados, 1);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return { geometria: g, triangulos: total / 3 };
  }
}

function materialFachada() {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec2 aUvMuro;
attribute vec4 aMuro;
attribute vec4 aMuro2;
varying vec2 vUvMuro;
varying vec4 vMuro;
varying vec4 vMuro2;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vUvMuro = aUvMuro;
vMuro = aMuro;
vMuro2 = aMuro2;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
${GLSL_FACHADA}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float vidrioFachada = 0.0;
diffuseColor.rgb = fachada(diffuseColor.rgb, vidrioFachada);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 0.12, vidrioFachada);`);
  };
  material.customProgramCacheKey = () => 'fachada-v1';
  return material;
}

export function creaEdificios(geojson, aspecto, atlas, rejilla, { tejadosSinLuz }) {
  const chunks = new Map();
  const { filas, columnas, tx, tz, ancho, alto } = rejilla;
  const color = new THREE.Color();
  let sinAspecto = 0;

  for (const f of geojson.features) {
    const props = f.properties;
    const anillos = f.geometry.coordinates.map(sinCierre).filter((a) => a.length >= 3);
    if (!anillos.length) continue;
    const exterior = anillos[0];
    const area = areaAnillo(exterior);
    const r = azar(props.id * 2654435761);
    const estilo = eligeEstilo(props, area, r);
    const paleta = PALETAS[estilo];
    color.set(paleta[Math.floor(r() * paleta.length)]).convertSRGBToLinear();
    const brillo = 0.94 + r() * 0.1;
    color.multiplyScalar(brillo);

    const info = aspecto.edificios[String(props.id)];
    if (!info) sinAspecto++;
    const aCalle = new Set(info?.calle ?? []);
    const medianeras = new Set(props.medianeras ?? []);
    const semilla = (props.id % 997) + 0.5;

    let cx = 0; let cz = 0;
    for (const [x, z] of exterior) { cx += x; cz += z; }
    cx /= exterior.length; cz /= exterior.length;
    const col = Math.min(Math.max(Math.floor((cx + ancho / 2) / tx), 0), columnas - 1);
    const fila = Math.min(Math.max(Math.floor((cz + alto / 2) / tz), 0), filas - 1);
    const clave = `${fila}_${col}`;
    if (!chunks.has(clave)) chunks.set(clave, new Chunk());
    const chunk = chunks.get(clave);

    anillos.forEach((anillo, k) => {
      for (let i = 0; i < anillo.length; i++) {
        const exteriorYcalle = k === 0 && aCalle.has(i) ? 1 : 0;
        const pegado = k === 0 && medianeras.has(i) ? 1 : 0;
        chunk.muro(anillo[i], anillo[(i + 1) % anillo.length], props.base_y, props.height, color,
          [props.plantas ?? 1, semilla], [exteriorYcalle, pegado, ESTILOS[estilo], i]);
      }
    });
    chunk.tejado(anillos, props.base_y + props.height, info?.uv ?? [0, 0, 0, 0]);
  }

  const fachada = materialFachada();
  const tejado = tejadosSinLuz
    ? new THREE.MeshBasicMaterial({ map: atlas })
    : new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.9 });
  const grupo = new THREE.Group();
  grupo.name = 'edificios';
  const mallas = [];
  let triangulos = 0;
  for (const [clave, chunk] of chunks) {
    const { geometria, triangulos: n } = chunk.geometria();
    const malla = new THREE.Mesh(geometria, [fachada, tejado]);
    malla.name = `edificios_${clave}`;
    grupo.add(malla);
    mallas.push(malla);
    triangulos += n;
  }
  if (sinAspecto) console.warn(`[edificios] ${sinAspecto} edificios sin entrada en edificios_aspecto.json`);
  return { grupo, mallas, triangulos, edificios: geojson.features.length };
}
