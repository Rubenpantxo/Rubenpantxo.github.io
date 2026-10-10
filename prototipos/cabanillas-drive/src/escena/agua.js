// Agua: material con oleaje animado (normales de varias ondas que se mueven, reflejo del cielo
// por el entorno y brillo del sol), lámina del Canal de Tauste y chorros de la fuente.
// Canal: la lámina va a la cota del agua que da el LiDAR. En el MDT el cauce es una franja
// plana unos 0,5 m más baja que las orillas (el láser no devuelve bien sobre el agua y se
// interpola): el agua se pone justo encima del fondo de cada sección y el terreno de las
// orillas la recorta solo.
import * as THREE from 'three';
import { LUZ_SUELO } from './suelo.js';

const TIEMPO = { value: 0 };
export function avanzaAgua(dt) { TIEMPO.value += dt; }

// Tipos de agua: color, cuánto se mueve y velocidad de la corriente (m/s, a lo largo de «aFlujo»)
export const AGUAS = {
  piscina: { color: 0x2fa6c9, rugosidad: 0.04, olas: 0.05, escala: 1.6, corriente: 0 },
  fuente: { color: 0x3b7f8f, rugosidad: 0.05, olas: 0.09, escala: 3.0, corriente: 0 },
  canal: { color: 0x3e5a3c, rugosidad: 0.07, olas: 0.08, escala: 0.9, corriente: 0.45 },
};

export function materialAgua(tipo = 'piscina') {
  const cfg = AGUAS[tipo];
  const material = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: cfg.rugosidad, metalness: 0.0, envMapIntensity: 1.25 });
  material.userData.esAgua = true;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uTiempo: TIEMPO,
      uOlas: { value: cfg.olas },
      uEscala: { value: cfg.escala },
      uCorriente: { value: cfg.corriente },
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec2 aFlujo;
        varying vec3 vMundoAgua;
        varying vec2 vFlujo;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vMundoAgua = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vFlujo = aFlujo;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vMundoAgua;
        varying vec2 vFlujo;
        uniform float uTiempo, uOlas, uEscala, uCorriente;
        // Pendiente de una suma de ondas en direcciones repartidas (derivada analítica)
        vec2 pendienteOlas(vec2 p) {
          vec2 g = vec2(0.0);
          float a = 1.0;
          float f = 1.0;
          for (int i = 0; i < 6; i++) {
            float ang = float(i) * 2.399 + 0.7;
            vec2 d = vec2(cos(ang), sin(ang));
            float fase = dot(d, p) * f + uTiempo * (1.1 + 0.37 * float(i)) * sqrt(f);
            g += d * (a * f * cos(fase));
            a *= 0.62;
            f *= 1.73;
          }
          return g;
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec2 p = vMundoAgua.xz * uEscala;
          // La corriente arrastra el dibujo de las olas aguas abajo
          if (uCorriente > 0.0) p -= vFlujo * uCorriente * uTiempo * uEscala;
          vec2 g = pendienteOlas(p) * 0.6 + pendienteOlas(p * 2.7 + 13.1) * 0.25;
          float lejos = 1.0 - smoothstep(30.0, 160.0, distance(vMundoAgua, cameraPosition));
          vec3 nMundo = normalize(vec3(-g.x * uOlas * lejos, 1.0, -g.y * uOlas * lejos));
          normal = normalize((viewMatrix * vec4(nMundo, 0.0)).xyz);
        }`);
  };
  material.customProgramCacheKey = () => `agua_${tipo}`;
  return material;
}

// Pone a una geometría el atributo de dirección de la corriente (vacío si no hay corriente)
export function conFlujo(geo, dx = 0, dz = 0) {
  const n = geo.attributes.position.count;
  const f = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) f.set([dx, dz], i * 2);
  geo.setAttribute('aFlujo', new THREE.BufferAttribute(f, 2));
  return geo;
}

// --- Canal ------------------------------------------------------------------------------------
const PASO_M = 2;            // separación entre secciones
const BUSCA_FONDO_M = 7;     // a cada lado del eje de OSM se busca el fondo del cauce
const SOBRE_FONDO_M = 0.2;   // la lámina queda esto por encima del fondo del MDT
const BAJO_ORILLA_M = 0.35;  // hasta dónde se extiende: el terreno a esta altura sobre el agua
const MEDIO_ANCHO_MAX = 9;

function suaviza(v, radio) {
  return v.map((_, i) => {
    let s = 0;
    let n = 0;
    for (let k = Math.max(0, i - radio); k <= Math.min(v.length - 1, i + radio); k++) { s += v[k]; n++; }
    return s / n;
  });
}

export function creaCanal(geoAgua, terreno) {
  const raiz = new THREE.Group();
  raiz.name = 'canal';
  // Secciones de todos los canales en celdas de 8 m para saber qué queda bajo el agua
  const celdas = new Map();
  const claveCelda = (x, z) => `${Math.floor(x / 8)},${Math.floor(z / 8)}`;
  for (const f of geoAgua?.features ?? []) {
    if (f.properties.tipo !== 'canal' || f.geometry.type !== 'LineString') continue;
    // Puntos cada PASO_M a lo largo del eje
    const eje = f.geometry.coordinates;
    const puntos = [];
    for (let i = 0; i < eje.length - 1; i++) {
      const [x0, z0] = eje[i];
      const [x1, z1] = eje[i + 1];
      const l = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.max(1, Math.round(l / PASO_M));
      for (let k = 0; k < n; k++) puntos.push([x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n]);
    }
    puntos.push(eje[eje.length - 1]);
    if (puntos.length < 2) continue;

    // Por sección: dirección, centro del cauce (punto más bajo), cota del agua y anchos
    const secciones = puntos.map(([x, z], i) => {
      const [xa, za] = puntos[Math.max(0, i - 1)];
      const [xb, zb] = puntos[Math.min(puntos.length - 1, i + 1)];
      const l = Math.hypot(xb - xa, zb - za) || 1;
      const tx = (xb - xa) / l;
      const tz = (zb - za) / l;
      const nx = -tz;
      const nz = tx;
      let fondo = Infinity;
      let centro = 0;
      for (let t = -BUSCA_FONDO_M; t <= BUSCA_FONDO_M; t += 0.5) {
        const h = terreno.alturaEn(x + nx * t, z + nz * t);
        if (h < fondo) { fondo = h; centro = t; }
      }
      return { x, z, tx, tz, nx, nz, fondo, centro };
    });
    const nivel = suaviza(secciones.map((s) => s.fondo), 6).map((h) => h + SOBRE_FONDO_M);
    const centro = suaviza(secciones.map((s) => s.centro), 4);
    const anchos = secciones.map((s, i) => {
      const lado = (signo) => {
        let t = 0;
        while (t < MEDIO_ANCHO_MAX) {
          const tt = centro[i] + signo * (t + 0.5);
          if (terreno.alturaEn(s.x + s.nx * tt, s.z + s.nz * tt) > nivel[i] + BAJO_ORILLA_M) break;
          t += 0.5;
        }
        return t + 0.6;
      };
      return [lado(-1), lado(1)];
    });
    const izq = suaviza(anchos.map((a) => a[0]), 3);
    const der = suaviza(anchos.map((a) => a[1]), 3);

    secciones.forEach((s, i) => {
      const sec = { ...s, c: centro[i], izq: izq[i], der: der[i], nivel: nivel[i] };
      const k = claveCelda(s.x, s.z);
      if (!celdas.has(k)) celdas.set(k, []);
      celdas.get(k).push(sec);
    });

    const pos = [];
    const flujo = [];
    const indices = [];
    secciones.forEach((s, i) => {
      const c = centro[i];
      for (const t of [c - izq[i], c + der[i]]) {
        pos.push(s.x + s.nx * t, nivel[i], s.z + s.nz * t);
        flujo.push(s.tx, s.tz);
      }
      if (i > 0) {
        const a = (i - 1) * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aFlujo', new THREE.Float32BufferAttribute(flujo, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    // Que la cara mire arriba sea cual sea el sentido del eje
    if (geo.attributes.normal.getY(0) < 0) {
      geo.setIndex(indices.map((_, k) => indices[k - (k % 3) + [0, 2, 1][k % 3]]));
      geo.computeVertexNormals();
    }
    const malla = new THREE.Mesh(geo, materialAgua('canal'));
    malla.name = `canal_${f.properties.nombre ?? f.properties.id}`;
    malla.receiveShadow = true;
    malla.userData.sinSombra = true;
    raiz.add(malla);
  }
  // ¿El punto (x, z) a altura y queda bajo la lámina? (para no sembrar hierba en el agua)
  raiz.userData.bajoAgua = (x, z, y) => {
    const cx = Math.floor(x / 8);
    const cz = Math.floor(z / 8);
    let mejor = null;
    let dMejor = Infinity;
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        for (const s of celdas.get(`${cx + i},${cz + j}`) ?? []) {
          const d = (x - s.x) ** 2 + (z - s.z) ** 2;
          if (d < dMejor) { dMejor = d; mejor = s; }
        }
      }
    }
    if (!mejor || y > mejor.nivel + 0.05) return false;
    const t = (x - mejor.x) * mejor.nx + (z - mejor.z) * mejor.nz;
    return t > mejor.c - mejor.izq - 0.3 && t < mejor.c + mejor.der + 0.3;
  };
  return raiz;
}

// --- Chorros de la fuente -----------------------------------------------------------------------
// Lámina que cae de la taza al pilón: cilindro abierto translúcido con regueros que bajan.
export function materialChorro() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uTiempo: TIEMPO, uLuz: LUZ_SUELO.emisivo },   // de noche se apaga como la foto
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTiempo;
      uniform vec3 uLuz;
      float ruido(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        float columna = floor(vUv.x * 90.0);
        float vel = 1.6 + ruido(vec2(columna, 1.0)) * 1.2;
        float reguero = fract(vUv.y * 3.0 + uTiempo * vel + ruido(vec2(columna, 7.0)));
        float a = smoothstep(0.0, 0.5, reguero) * (0.25 + 0.35 * ruido(vec2(columna, 3.0)));
        a *= smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
        gl_FragColor = vec4(mix(vec3(0.62, 0.78, 0.84), vec3(0.95), reguero * 0.5) * max(uLuz, vec3(0.08)), a);
      }`,
  });
}
