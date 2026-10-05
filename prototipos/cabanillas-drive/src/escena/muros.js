// Muros y vallas de parcela (tools/13_muros.py: OSM + LiDAR en los linderos del Catastro).
// - Muros: tira con dos caras, remate y testeros; la base y el remate siguen el terreno. Acabado
//   procedural por muro (bloque de hormigón, ladrillo, enfoscado, mampostería, hormigón en los
//   de contención), elegido al azar de forma repetible: el LiDAR da dónde y cuánto miden, no de qué son.
// - Vallas: postes cada 2,5 m y malla de simple torsión dibujada en el shader (sin texturas).
// Todo en una malla por tipo; colisión con cajas de hasta 6 m (gestor de colisiones).
import * as THREE from 'three';
import { registraEstatico } from '../fisica/fisica.js';

const GROSOR = { muro: 0.25, contencion: 0.4 };
const PASO_TERRENO_M = 2;          // se parte cada tramo para seguir el terreno
const ENTERRADO_M = 0.25;
const SEPARACION_POSTES_M = 2.5;
const TROZO_COLISION_M = 6;

const GLSL_COMUN = /* glsl */ `
varying vec2 vUvM;
varying float vSemillaM;
varying float vTipoM;
float azarM(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float ruidoM(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(azarM(i), azarM(i + vec2(1, 0)), f.x), mix(azarM(i + vec2(0, 1)), azarM(i + vec2(1, 1)), f.x), f.y);
}
`;

// Acabados: 0 bloque de hormigón · 1 ladrillo · 2 enfoscado · 3 mampostería · 4 hormigón
const GLSL_MURO = /* glsl */ `
vec3 acabadoMuro(vec3 base) {
  vec2 p = vUvM;
  vec2 aa = max(fwidth(p), vec2(0.002));
  float lejos = smoothstep(0.03, 0.1, max(aa.x, aa.y));
  float s = vSemillaM;
  float tipo = vTipoM;
  vec3 c;
  if (tipo < 0.5) {                                  // bloque 40 × 20
    float fila = floor(p.y / 0.2);
    vec2 b = vec2(p.x / 0.4 + 0.5 * mod(fila, 2.0), p.y / 0.2);
    vec2 f = fract(b);
    float junta = max(1.0 - smoothstep(0.0, 0.025 + aa.x * 2.5, f.x), 1.0 - smoothstep(0.0, 0.05 + aa.y * 5.0, f.y));
    float tono = mix(0.5, 0.66, azarM(vec2(s, 3.0))) * (0.94 + 0.12 * azarM(floor(b) + s));
    c = vec3(tono) * vec3(1.0, 0.98, 0.95);
    c = mix(c, c * 0.72, junta * (1.0 - lejos));
  } else if (tipo < 1.5) {                           // ladrillo
    float fila = floor(p.y / 0.065);
    vec2 b = vec2(p.x / 0.25 + 0.5 * mod(fila, 2.0), p.y / 0.065);
    vec2 f = fract(b);
    float junta = max(1.0 - smoothstep(0.0, 0.05, f.x), 1.0 - smoothstep(0.0, 0.16, f.y)) * (1.0 - lejos);
    vec3 roj = mix(vec3(0.55, 0.25, 0.15), vec3(0.7, 0.42, 0.26), azarM(vec2(s, 7.0)));
    c = roj * (0.85 + 0.3 * azarM(floor(b) + s * 1.7));
    c = mix(c, vec3(0.6, 0.57, 0.52), junta * 0.7);
  } else if (tipo < 2.5) {                           // enfoscado o encalado
    float t = azarM(vec2(s, 11.0));
    c = t < 0.35 ? vec3(0.86, 0.84, 0.79) : (t < 0.7 ? vec3(0.8, 0.7, 0.55) : vec3(0.72, 0.66, 0.58));
    c *= 0.93 + 0.1 * ruidoM(p * vec2(1.3, 2.0) + s) + 0.04 * ruidoM(p * 9.0) * (1.0 - lejos);
    float pie = 1.0 - smoothstep(0.1, 0.6 + 0.3 * ruidoM(vec2(p.x * 0.8, s)), p.y);
    c *= 1.0 - 0.22 * pie;                           // humedad y salpicaduras al pie
  } else if (tipo < 3.5) {                           // mampostería (piedras irregulares)
    vec2 q = p / vec2(0.42, 0.3);
    vec2 i = floor(q); vec2 f = fract(q);
    float d1 = 9.0, d2 = 9.0, id = 0.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = vec2(azarM(i + g + s), azarM(i + g + s + 5.3)) * 0.8 + 0.1;
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; id = azarM(i + g + 2.1); } else if (d < d2) { d2 = d; }
    }
    float mortero = (1.0 - smoothstep(0.05, 0.14, d2 - d1)) * (1.0 - lejos);
    vec3 piedra = mix(vec3(0.62, 0.56, 0.47), vec3(0.75, 0.7, 0.6), id) * (0.85 + 0.25 * azarM(vec2(id, s)));
    c = mix(piedra, vec3(0.7, 0.67, 0.6), mortero);
  } else {                                           // hormigón con encofrado
    float tabla = smoothstep(0.0, 0.02 + aa.y * 2.0, abs(fract(p.y / 0.5) - 0.5) * 2.0 - 0.96);
    c = vec3(0.6, 0.59, 0.56) * (0.92 + 0.1 * ruidoM(p * vec2(0.7, 3.0) + s)) * (1.0 - 0.1 * tabla * (1.0 - lejos));
  }
  return c;
}
`;

// Malla de simple torsión: rombos de 5 cm; de lejos, velo semitransparente
const GLSL_VALLA = /* glsl */ `
float alfaValla() {
  vec2 p = vUvM / 0.05;
  vec2 aa = fwidth(p);
  float lejos = smoothstep(0.25, 0.6, max(aa.x, aa.y));
  vec2 d = vec2(p.x + p.y, p.x - p.y);
  vec2 f = abs(fract(d * 0.5) - 0.5) * 2.0;
  vec2 ancho = vec2(0.14) + fwidth(d) * 0.5;
  float hilo = max(1.0 - smoothstep(ancho.x - fwidth(d).x, ancho.x, 1.0 - f.x),
                   1.0 - smoothstep(ancho.y - fwidth(d).y, ancho.y, 1.0 - f.y));
  return mix(hilo, 0.3, lejos);
}
`;

function materialMuro() {
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec2 aUvM;
attribute vec2 aDatosM;
${GLSL_COMUN}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vUvM = aUvM; vSemillaM = aDatosM.x; vTipoM = aDatosM.y;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
${GLSL_COMUN}
${GLSL_MURO}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb = acabadoMuro(diffuseColor.rgb);`);
  };
  material.customProgramCacheKey = () => 'muro-v1';
  return material;
}

function materialValla() {
  const material = new THREE.MeshStandardMaterial({
    color: 0x6f7478, roughness: 0.55, metalness: 0.6, side: THREE.DoubleSide, transparent: true, depthWrite: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec2 aUvM;
attribute vec2 aDatosM;
${GLSL_COMUN}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vUvM = aUvM; vSemillaM = aDatosM.x; vTipoM = aDatosM.y;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
${GLSL_COMUN}
${GLSL_VALLA}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.a *= alfaValla();
if (diffuseColor.a < 0.04) discard;`);
  };
  material.customProgramCacheKey = () => 'valla-v1';
  return material;
}

// Acumulador de una tira de caras
function creaTira() {
  const t = { pos: [], nor: [], uv: [], datos: [], idx: [] };
  t.quad = (a, b, c, d, n, uva, uvb, uvc, uvd, datos) => {
    const i = t.pos.length / 3;
    for (const [p, uv] of [[a, uva], [b, uvb], [c, uvc], [d, uvd]]) {
      t.pos.push(p[0], p[1], p[2]);
      t.nor.push(n[0], n[1], n[2]);
      t.uv.push(uv[0], uv[1]);
      t.datos.push(datos[0], datos[1]);
    }
    t.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  };
  t.geometria = () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(t.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(t.nor, 3));
    g.setAttribute('aUvM', new THREE.Float32BufferAttribute(t.uv, 2));
    g.setAttribute('aDatosM', new THREE.Float32BufferAttribute(t.datos, 2));
    g.setIndex(t.idx);
    g.computeBoundingSphere();
    return g;
  };
  return t;
}

// Puntos del muro cada PASO_TERRENO_M como mucho, con la distancia acumulada
function densifica(p) {
  const salida = [{ x: p[0][0], z: p[0][1], s: 0 }];
  let s = 0;
  for (let i = 1; i < p.length; i++) {
    const [x0, z0] = p[i - 1];
    const [x1, z1] = p[i];
    const l = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.ceil(l / PASO_TERRENO_M));
    for (let k = 1; k <= n; k++) {
      salida.push({ x: x0 + ((x1 - x0) * k) / n, z: z0 + ((z1 - z0) * k) / n, s: s + (l * k) / n });
    }
    s += l;
  }
  return salida;
}

export async function cargaMuros(ruta) {
  return fetch(ruta).then((r) => (r.ok ? r.json() : null)).catch(() => null);
}

export function creaMuros(datos, terreno, fisica) {
  const raiz = new THREE.Group();
  raiz.name = 'muros';
  if (!datos?.muros?.length) return { raiz, cantidad: 0 };
  const muros = creaTira();
  const vallas = creaTira();
  const postes = [];
  const { RAPIER, mundo } = fisica ?? {};

  datos.muros.forEach((m, n) => {
    const pts = densifica(m.p);
    if (pts.length < 2) return;
    const semilla = (n * 7.31) % 97 + 0.5;
    const suelo = pts.map((q) => terreno.alturaEn(q.x, q.z));
    if (m.t === 'valla') {
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const ya = suelo[i - 1];
        const yb = suelo[i];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const l = Math.hypot(dx, dz) || 1;
        const nrm = [-dz / l, 0, dx / l];
        vallas.quad([a.x, ya, a.z], [b.x, yb, b.z], [b.x, yb + m.h, b.z], [a.x, ya + m.h, a.z], nrm,
          [a.s, 0], [b.s, 0], [b.s, m.h], [a.s, m.h], [semilla, 0]);
      }
      // Postes: en los extremos y cada SEPARACION_POSTES_M
      const largo = pts[pts.length - 1].s;
      const n = Math.max(1, Math.round(largo / SEPARACION_POSTES_M));
      for (let k = 0; k <= n; k++) {
        const s = (largo * k) / n;
        let i = 1;
        while (i < pts.length - 1 && pts[i].s < s) i++;
        const a = pts[i - 1];
        const b = pts[i];
        const t = (s - a.s) / Math.max(b.s - a.s, 1e-6);
        const x = a.x + (b.x - a.x) * t;
        const z = a.z + (b.z - a.z) * t;
        postes.push({ x, z, y: terreno.alturaEn(x, z), h: m.h + 0.05 });
      }
    } else {
      const medio = (GROSOR[m.t] ?? 0.25) / 2;
      const tipo = m.t === 'contencion' ? 4 : Math.floor(((semilla * 13.7) % 1) * 4);   // 0–3
      const datosM = [semilla, tipo];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const l = Math.hypot(dx, dz) || 1;
        const nx = -dz / l * medio;
        const nz = dx / l * medio;
        const ya = suelo[i - 1];
        const yb = suelo[i];
        const ba = ya - ENTERRADO_M;
        const bb = yb - ENTERRADO_M;
        const ta = ya + m.h;
        const tb = yb + m.h;
        // Cara izquierda y derecha
        muros.quad([a.x + nx, ba, a.z + nz], [b.x + nx, bb, b.z + nz], [b.x + nx, tb, b.z + nz], [a.x + nx, ta, a.z + nz],
          [nx / medio, 0, nz / medio], [a.s, -ENTERRADO_M], [b.s, -ENTERRADO_M], [b.s, m.h], [a.s, m.h], datosM);
        muros.quad([b.x - nx, bb, b.z - nz], [a.x - nx, ba, a.z - nz], [a.x - nx, ta, a.z - nz], [b.x - nx, tb, b.z - nz],
          [-nx / medio, 0, -nz / medio], [b.s, -ENTERRADO_M], [a.s, -ENTERRADO_M], [a.s, m.h], [b.s, m.h], datosM);
        // Remate
        muros.quad([a.x + nx, ta, a.z + nz], [b.x + nx, tb, b.z + nz], [b.x - nx, tb, b.z - nz], [a.x - nx, ta, a.z - nz],
          [0, 1, 0], [a.s, m.h], [b.s, m.h], [b.s, m.h + 0.25], [a.s, m.h + 0.25], datosM);
      }
      // Testeros: f hacia fuera del muro; esquinas en sentido antihorario vistas desde fuera
      for (const [k, o] of [[0, 1], [pts.length - 1, pts.length - 2]]) {
        const q = pts[k];
        const dx = q.x - pts[o].x;
        const dz = q.z - pts[o].z;
        const l = Math.hypot(dx, dz) || 1;
        const fx = dx / l;
        const fz = dz / l;
        const nx = -fz * medio;
        const nz = fx * medio;
        const y = suelo[k];
        muros.quad([q.x + nx, y - ENTERRADO_M, q.z + nz], [q.x - nx, y - ENTERRADO_M, q.z - nz], [q.x - nx, y + m.h, q.z - nz],
          [q.x + nx, y + m.h, q.z + nz], [fx, 0, fz], [0, -ENTERRADO_M], [medio * 2, -ENTERRADO_M], [medio * 2, m.h], [0, m.h], datosM);
      }
    }
    // Colisión: cajas de hasta TROZO_COLISION_M siguiendo la línea
    if (mundo) {
      for (let i = 1; i < m.p.length; i++) {
        const [x0, z0] = m.p[i - 1];
        const [x1, z1] = m.p[i];
        const l = Math.hypot(x1 - x0, z1 - z0);
        const trozos = Math.max(1, Math.ceil(l / TROZO_COLISION_M));
        const angulo = Math.atan2(x1 - x0, z1 - z0);
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angulo);
        for (let k = 0; k < trozos; k++) {
          const cx = x0 + ((x1 - x0) * (k + 0.5)) / trozos;
          const cz = z0 + ((z1 - z0) * (k + 0.5)) / trozos;
          const y = terreno.alturaEn(cx, cz);
          const medioLargo = l / trozos / 2;
          const medioGrosor = m.t === 'valla' ? 0.06 : (GROSOR[m.t] ?? 0.25) / 2;
          const collider = mundo.createCollider(RAPIER.ColliderDesc.cuboid(medioGrosor, (m.h + 1) / 2, medioLargo)
            .setTranslation(cx, y + (m.h - 1) / 2, cz).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }).setFriction(0.6));
          registraEstatico(fisica, collider, cx, cz, medioLargo);
        }
      }
    }
  });

  const mallaMuros = new THREE.Mesh(muros.geometria(), materialMuro());
  mallaMuros.name = 'muros_obra';
  raiz.add(mallaMuros);
  if (vallas.pos.length) {
    const mallaVallas = new THREE.Mesh(vallas.geometria(), materialValla());
    mallaVallas.name = 'muros_malla';
    mallaVallas.castShadow = false;
    mallaVallas.userData.sinSombra = true;
    raiz.add(mallaVallas);
    const geoPoste = new THREE.CylinderGeometry(0.03, 0.03, 1, 6).translate(0, 0.5, 0);
    const mallaPostes = new THREE.InstancedMesh(geoPoste, new THREE.MeshStandardMaterial({ color: 0x5d6266, roughness: 0.5, metalness: 0.7 }), postes.length);
    const m4 = new THREE.Matrix4();
    postes.forEach((p, i) => mallaPostes.setMatrixAt(i, m4.makeScale(1, p.h, 1).setPosition(p.x, p.y - 0.1, p.z)));
    mallaPostes.name = 'muros_postes';
    raiz.add(mallaPostes);
  }
  return { raiz, cantidad: datos.muros.length, triangulos: muros.idx.length / 3 + vallas.idx.length / 3 };
}
