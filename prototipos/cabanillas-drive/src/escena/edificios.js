// Edificios generados en el navegador desde buildings.geojson (Catastro + LiDAR):
// - tejado con su forma real del LiDAR (tools/09_tejados.py: faldones, aleros y altura de
//   cada muro siguiendo el borde del tejado) y su trozo real de ortofoto (atlas tejados.jpg)
// - fachadas procedurales individuales (fachadas.glsl.js) según plantas, estilo y calle
// Se agrupan en los mismos chunks que el terreno (orto.json) para la carga por distancia.
import * as THREE from 'three';
import { GLSL_FACHADA, LUCES_FACHADA } from './fachadas.glsl.js';

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

  // Muro cuyo borde superior sigue el tejado: perfil = [t0, y0, t1, y1, …] (t de 0 a 1 en el
  // lado, y absoluta). Para las ventanas cuenta el alero más bajo del lado.
  muroPerfil(a, b, base, perfil, color, datos, datos2) {
    const [x0, z0] = a;
    const [x1, z1] = b;
    const largo = Math.hypot(x1 - x0, z1 - z0);
    if (largo < 0.05) return;
    let alero = Infinity;
    for (let k = 1; k < perfil.length; k += 2) alero = Math.min(alero, perfil[k] - base);
    const nx = (z1 - z0) / largo;
    const nz = -(x1 - x0) / largo;
    const m = this.muros;
    for (let k = 0; k + 3 < perfil.length; k += 2) {
      const [ta, ya, tb, yb] = [perfil[k], perfil[k + 1], perfil[k + 2], perfil[k + 3]];
      if (tb - ta < 1e-4) continue;
      const pa = [x0 + ta * (x1 - x0), z0 + ta * (z1 - z0)];
      const pb = [x0 + tb * (x1 - x0), z0 + tb * (z1 - z0)];
      const ua = ta * largo; const ub = tb * largo;
      // Mismo sentido que muro(): a abajo, b abajo, b arriba / a abajo, b arriba, a arriba
      let v = [[pa[0], base, pa[1], ua, 0], [pb[0], base, pb[1], ub, 0], [pb[0], yb, pb[1], ub, yb - base],
        [pa[0], base, pa[1], ua, 0], [pb[0], yb, pb[1], ub, yb - base], [pa[0], ya, pa[1], ua, ya - base]];
      const e1 = [v[1][0] - v[0][0], v[1][1] - v[0][1], v[1][2] - v[0][2]];
      const e2 = [v[2][0] - v[0][0], v[2][1] - v[0][1], v[2][2] - v[0][2]];
      const cx = e1[1] * e2[2] - e1[2] * e2[1];
      const cz = e1[0] * e2[1] - e1[1] * e2[0];
      if (cx * nx + cz * nz < 0) v = [v[0], v[2], v[1], v[3], v[5], v[4]];
      for (const [x, y, z, u, w] of v) {
        m.pos.push(x, y, z);
        m.nor.push(nx, 0, nz);
        m.col.push(color.r, color.g, color.b);
        m.uvMuro.push(u, w);
        m.muro.push(alero, datos[0], largo, datos[1]);
        m.muro2.push(...datos2);
      }
    }
  }

  // Tejado del LiDAR: triángulos indexados del binario, con la UV del atlas por la huella
  tejadoMalla(tejados, rango, ref, caja, uvRect) {
    const [desde, , desdeIdx, nIdx] = rango;
    if (!nIdx) return;
    const [u0, v0, u1, v1] = uvRect;
    const [xmin, zmin, xmax, zmax] = caja;
    const t = this.tejados;
    const V = tejados.vertices;
    const p = [];
    const ab = new THREE.Vector3();
    const ac = new THREE.Vector3();
    for (let k = 0; k < nIdx; k += 3) {
      for (let j = 0; j < 3; j++) {
        const i = (desde + tejados.indices[desdeIdx + k + j]) * 3;
        p[j] = [ref[0] + V[i] / 100, ref[1] + V[i + 1] / 100, ref[2] + V[i + 2] / 100];
      }
      ab.set(p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]);
      ac.set(p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]);
      ab.cross(ac).normalize();
      for (const [x, y, z] of p) {
        t.pos.push(x, y, z);
        t.nor.push(ab.x, ab.y, ab.z);
        t.uv.push(u0 + ((x - xmin) / (xmax - xmin || 1)) * (u1 - u0),
          v0 + ((z - zmin) / (zmax - zmin || 1)) * (v1 - v0));
      }
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
    shader.uniforms.uVentanasEncendidas = LUCES_FACHADA.encendidas;
    shader.uniforms.uIntensidadVentanas = LUCES_FACHADA.intensidad;
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
roughnessFactor = mix(roughnessFactor, 0.12, vidrioFachada);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += colorLuzFachada * luzFachada * uIntensidadVentanas;`)
      .replace('#include <common>', `#include <common>
uniform float uIntensidadVentanas;`);
  };
  material.customProgramCacheKey = () => 'fachada-v2';
  return material;
}

// Datos por edificio que no dependen del nivel de detalle (color, estilo, lados a la calle…)
function preparaEdificio(f, aspecto) {
  const props = f.properties;
  const anillos = f.geometry.coordinates.map(sinCierre).filter((a) => a.length >= 3);
  if (!anillos.length) return null;
  const exterior = anillos[0];
  const r = azar(props.id * 2654435761);
  const estilo = eligeEstilo(props, areaAnillo(exterior), r);
  const paleta = PALETAS[estilo];
  const color = new THREE.Color(paleta[Math.floor(r() * paleta.length)]).convertSRGBToLinear();
  color.multiplyScalar(0.94 + r() * 0.1);
  const info = aspecto.edificios[String(props.id)];
  let cx = 0; let cz = 0;
  let xmin = Infinity; let xmax = -Infinity; let zmin = Infinity; let zmax = -Infinity;
  for (const [x, z] of exterior) {
    cx += x; cz += z;
    xmin = Math.min(xmin, x); xmax = Math.max(xmax, x);
    zmin = Math.min(zmin, z); zmax = Math.max(zmax, z);
  }
  return {
    props, anillos, estilo, color, info,
    aCalle: new Set(info?.calle ?? []),
    medianeras: new Set(props.medianeras ?? []),
    semilla: (props.id % 997) + 0.5,
    centro: [cx / exterior.length, cz / exterior.length],
    caja: [xmin, zmin, xmax, zmax],
  };
}

// Añade un edificio a un chunk: con tejado del LiDAR (detalle) o con techo plano (lejos)
function agregaEdificio(chunk, e, tejados) {
  const { props, anillos } = e;
  const lidar = tejados?.edificios[String(props.id)];
  const perfiles = lidar?.p;
  anillos.forEach((anillo, k) => {
    for (let i = 0; i < anillo.length; i++) {
      const datos = [props.plantas ?? 1, e.semilla];
      const datos2 = [k === 0 && e.aCalle.has(i) ? 1 : 0, k === 0 && e.medianeras.has(i) ? 1 : 0, ESTILOS[e.estilo], i];
      const perfil = perfiles?.[k]?.[i];
      if (perfil && perfil.length >= 4) {
        chunk.muroPerfil(anillo[i], anillo[(i + 1) % anillo.length], props.base_y, perfil, e.color, datos, datos2);
      } else {
        chunk.muro(anillo[i], anillo[(i + 1) % anillo.length], props.base_y, props.height, e.color, datos, datos2);
      }
    }
  });
  const uvRect = e.info?.uv ?? [0, 0, 0, 0];
  if (lidar) {
    chunk.tejadoMalla(tejados, lidar.t, lidar.ref, e.caja, uvRect);
    chunk.tejadoMalla(tejados, lidar.a, lidar.ref, e.caja, uvRect);
    return true;
  }
  chunk.tejado(anillos, props.base_y + props.height, uvRect);
  return false;
}

// Edificios por celdas de «celdaM» metros con dos niveles de detalle:
// - simple (techo plano y un muro recto por lado): todos, desde el principio
// - detalle (tejados y aleros del LiDAR, muros que siguen el tejado): solo las celdas a menos
//   de «distanciaDetalle» de la cámara; se genera al acercarse (una celda por llamada a
//   actualiza) y se libera al alejarse, que en móvil la memoria es escasa
export function creaEdificios(geojson, aspecto, atlas, rejilla, opciones) {
  const {
    tejadosSinLuz, tejados = null, celdaM = 250, distanciaDetalle = Infinity, proyectaSombras = true,
  } = opciones;
  const { ancho, alto } = rejilla;
  const columnas = Math.ceil(ancho / celdaM);
  const celdas = new Map();
  let sinAspecto = 0;
  for (const f of geojson.features) {
    const e = preparaEdificio(f, aspecto);
    if (!e) continue;
    if (!e.info) sinAspecto++;
    const col = Math.max(0, Math.floor((e.centro[0] + ancho / 2) / celdaM));
    const fila = Math.max(0, Math.floor((e.centro[1] + alto / 2) / celdaM));
    const clave = fila * columnas + col;
    if (!celdas.has(clave)) {
      celdas.set(clave, { clave, edificios: [], caja: [Infinity, Infinity, -Infinity, -Infinity], simple: null, detalle: null });
    }
    const c = celdas.get(clave);
    c.edificios.push(e);
    c.caja = [Math.min(c.caja[0], e.caja[0]), Math.min(c.caja[1], e.caja[1]),
      Math.max(c.caja[2], e.caja[2]), Math.max(c.caja[3], e.caja[3])];
  }

  const fachada = materialFachada();
  const tejado = tejadosSinLuz
    ? new THREE.MeshBasicMaterial({ map: atlas })
    : new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.9 });
  const grupo = new THREE.Group();
  grupo.name = 'edificios';
  let conTejadoLidar = 0;

  function construye(celda, conLidar) {
    const chunk = new Chunk();
    let lidar = 0;
    for (const e of celda.edificios) if (agregaEdificio(chunk, e, conLidar ? tejados : null)) lidar++;
    const { geometria, triangulos } = chunk.geometria();
    const malla = new THREE.Mesh(geometria, [fachada, tejado]);
    malla.name = `edificios_${celda.clave}_${conLidar ? 'detalle' : 'simple'}`;
    malla.castShadow = proyectaSombras;
    malla.receiveShadow = true;
    malla.userData.sombrasPropias = true;      // render.configuraSombras no las toca
    grupo.add(malla);
    return { malla, triangulos, lidar };
  }

  for (const celda of celdas.values()) celda.simple = construye(celda, false);
  const conLod = Boolean(tejados);

  const distancia2D = (celda, x, z) => {
    const [x0, z0, x1, z1] = celda.caja;
    return Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
  };

  // Llamar de vez en cuando con la posición de la cámara. «todo»: genera ya todas las
  // celdas cercanas (al cargar, antes de mostrar nada)
  function actualiza(posicion, { todo = false } = {}) {
    if (!conLod) return;
    const pendientes = [];
    for (const celda of celdas.values()) {
      const d = distancia2D(celda, posicion.x, posicion.z);
      const quiere = d < distanciaDetalle;
      if (quiere && !celda.detalle) pendientes.push([d, celda]);
      if (!quiere && celda.detalle && d > distanciaDetalle * 1.5 + 50) {
        grupo.remove(celda.detalle.malla);
        celda.detalle.malla.geometry.dispose();
        conTejadoLidar -= celda.detalle.lidar;
        celda.detalle = null;
      }
      if (celda.detalle) celda.detalle.malla.visible = quiere;
      celda.simple.malla.visible = !(quiere && celda.detalle);
    }
    pendientes.sort((a, b) => a[0] - b[0]);
    for (const [, celda] of todo ? pendientes : pendientes.slice(0, 1)) {
      celda.detalle = construye(celda, true);
      conTejadoLidar += celda.detalle.lidar;
      celda.simple.malla.visible = false;
    }
  }

  if (sinAspecto) console.warn(`[edificios] ${sinAspecto} edificios sin entrada en edificios_aspecto.json`);
  return {
    grupo,
    actualiza,
    edificios: geojson.features.length,
    get mallas() { return grupo.children; },
    get triangulos() {
      let n = 0;
      for (const c of celdas.values()) n += (c.detalle?.malla.visible ? c.detalle.triangulos : c.simple.triangulos);
      return n;
    },
    get conTejadoLidar() { return conTejadoLidar; },
    get celdasDetalle() { return [...celdas.values()].filter((c) => c.detalle).length; },
    celdas: celdas.size,
  };
}
