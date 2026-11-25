// Crecimiento de los cultivos (PLAN_AGRICULTURA.md §5.4, fase A6).
//
// Reloj agrícola: cuenta días de cultivo con el juego en marcha (AGRICULTURA.reloj: una hora de
// juego por día) y se pueden pasar días. Cada píxel sembrado guarda en la máscara de cultivo (canal
// G) el día en que se sembró, como (día mod 255) + 1; su edad es (hoy − siembra) mod 255. Para que
// un cultivo que se queda sin cosechar no «vuelva a nacer» al dar la vuelta, cada día se topa la
// edad de lo viejo (envejece).
//
// Todo el aspecto sale de la edad, en los shaders: no hay que rehacer geometría al pasar el tiempo.
// Aquí están también el trozo de GLSL común (curva del cultivo, edad, vigor, ruido) y su espejo en
// JavaScript (para el panel y, en A8, el rendimiento).
import * as THREE from 'three';
import { AGRICULTURA } from '../config/agricultura.js';
import { CULTIVOS } from '../config/cultivos.js';

export const PUNTOS = 10;
const EDAD_MAX = 250;               // a partir de aquí la edad se topa (no da la vuelta a los 255)

// ---------------------------------------------------------------- reloj
export function creaReloj({ dia = AGRICULTURA.reloj.diaInicial, segundosPorDia = AGRICULTURA.reloj.segundosPorDia } = {}) {
  const uHoy = { value: 0 };
  let hoy = dia;                     // días (con fracción) desde el principio de la partida
  const oyentes = new Set();
  const pon = (d) => {
    const antes = Math.floor(hoy);
    hoy = Math.max(0, d);
    uHoy.value = hoy % 255;
    if (Math.floor(hoy) !== antes) for (const f of oyentes) f(Math.floor(hoy), Math.floor(hoy) - antes);
  };
  pon(dia);
  return {
    uHoy,
    get hoy() { return hoy; },
    get dia() { return Math.floor(hoy); },
    // Lo que falta del día (0…1) y en segundos de juego
    get fraccion() { return hoy - Math.floor(hoy); },
    get segundosParaManana() { return (1 - (hoy - Math.floor(hoy))) * segundosPorDia; },
    // Byte que se guarda al sembrar hoy
    get byte() { return (Math.floor(hoy) % 255) + 1; },
    avanza(dt) { pon(hoy + dt / segundosPorDia); },
    pasaDias(n) { pon(Math.floor(hoy) + n + (hoy - Math.floor(hoy))); },
    pon,
    // f(díaNuevo, díasQueHanPasado) cada vez que cambia el día
    alCambiarDia(f) { oyentes.add(f); return () => oyentes.delete(f); },
  };
}

// Edad (días) de un píxel con ese byte de siembra (0 = sin sembrar → null)
export const edadDe = (byte, hoy) => (byte ? (((hoy - (byte - 1)) % 255) + 255) % 255 : null);

// Topa la edad de lo sembrado hace más de EDAD_MAX días. Se llama cada vez que cambia el día con
// los días que han pasado: la edad de antes (ya topada, así que sin dar la vuelta) más esos días
// es la de verdad aunque se pasen cientos de días de golpe.
export function envejece(parcela, hoy, pasados = 1) {
  const { cultivo, interior } = parcela;
  const dia = Math.floor(hoy);
  const antes = dia - pasados;
  let n = 0;
  for (let k = 0; k < interior.length; k++) {
    const b = cultivo[k * 4 + 1];
    if (!b) continue;
    const edad = ((((antes - (b - 1)) % 255) + 255) % 255) + pasados;
    if (edad > EDAD_MAX) { cultivo[k * 4 + 1] = (((dia - EDAD_MAX) % 255) + 255) % 255 + 1; n++; }
  }
  if (n) parcela.marcaCambio(0, 0, parcela.ancho - 1, parcela.alto - 1);
  return n;
}

// ---------------------------------------------------------------- curva del cultivo
const lineal = (c) => new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace);

// Uniformes de un cultivo (se comparten entre todas sus parcelas)
const cacheUniformes = new Map();
export function uniformesCultivo(id) {
  if (cacheUniformes.has(id)) return cacheUniformes.get(id);
  const def = CULTIVOS[id];
  const curva = [];
  const hoja = [];
  const espiga = [];
  for (let i = 0; i < PUNTOS; i++) {
    const p = def.curva[Math.min(i, def.curva.length - 1)];
    const extra = Math.max(0, i - def.curva.length + 1) * 1000;     // relleno: más allá de todo
    curva.push(new THREE.Vector4(p[0] + extra, p[1], p[2], p[3]));
    const h = lineal(p[4]);
    hoja.push(new THREE.Vector4(h.r, h.g, h.b, p[6]));
    const e = lineal(p[5]);
    espiga.push(new THREE.Vector3(e.r, e.g, e.b));
  }
  const u = { uCurva: { value: curva }, uHoja: { value: hoja }, uEspiga: { value: espiga } };
  cacheUniformes.set(id, u);
  return u;
}

// Lo mismo en JavaScript: { altura, cobertura, espiga, etapa, madura }
export function faseDe(id, edad) {
  const def = CULTIVOS[id];
  const c = def.curva;
  let k = 0;
  for (let i = 1; i < c.length; i++) if (edad >= c[i][0]) k = i;
  const k1 = Math.min(k + 1, c.length - 1);
  const t = k1 === k ? 0 : Math.min(1, Math.max(0, (edad - c[k][0]) / (c[k1][0] - c[k][0])));
  let etapa = c[0][7];
  for (let i = 0; i <= k; i++) if (c[i][7]) etapa = c[i][7];
  // La siguiente etapa con nombre (para el panel)
  let siguiente = null;
  for (let i = k + 1; i < c.length; i++) if (c[i][7]) { siguiente = { etapa: c[i][7], enDias: Math.max(0, Math.ceil(c[i][0] - edad)) }; break; }
  return {
    altura: c[k][1] + (c[k1][1] - c[k][1]) * t,
    cobertura: c[k][2] + (c[k1][2] - c[k][2]) * t,
    espiga: c[k][3] + (c[k1][3] - c[k][3]) * t,
    etapa, siguiente, madura: edad >= def.madura,
  };
}

// ---------------------------------------------------------------- GLSL común
// Necesita: uCultivo (máscara), uLaboreo, uMascara (ox, oz, ancho m, alto m), uTexel.
export const GLSL_CRECIMIENTO = /* glsl */ `
uniform float uHoy;
uniform vec4 uCurva[${PUNTOS}];
uniform vec4 uHoja[${PUNTOS}];
uniform vec3 uEspiga[${PUNTOS}];
float azarC(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float ruidoC(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(azarC(i), azarC(i + vec2(1, 0)), f.x), mix(azarC(i + vec2(0, 1)), azarC(i + vec2(1, 1)), f.x), f.y);
}
float fbmC(vec2 p) { return 0.5 * ruidoC(p) + 0.3 * ruidoC(p * 2.03 + 3.1) + 0.2 * ruidoC(p * 4.07 + 7.7); }
// Fase del cultivo a una edad: altura, cobertura, espiga, color de hoja (y cabeceo en .w), color de espiga
struct Fase { float altura; float cobertura; float espiga; vec4 hoja; vec3 colEspiga; };
Fase faseDe(float edad) {
  int k = 0;
  for (int i = 1; i < ${PUNTOS}; i++) { if (edad >= uCurva[i].x) k = i; }
  int k1 = min(k + 1, ${PUNTOS - 1});
  float t = k1 == k ? 0.0 : clamp((edad - uCurva[k].x) / max(uCurva[k1].x - uCurva[k].x, 1e-3), 0.0, 1.0);
  vec4 c = mix(uCurva[k], uCurva[k1], t);
  Fase f;
  f.altura = c.y; f.cobertura = c.z; f.espiga = c.w;
  f.hoja = mix(uHoja[k], uHoja[k1], t);
  f.colEspiga = mix(uEspiga[k], uEspiga[k1], t);
  return f;
}
// Píxel de máscara de un punto (o -1 si cae fuera)
ivec2 pixelDe(vec2 p) {
  vec2 q = (p - uMascara.xy) / uMascara.zw / uTexel;
  ivec2 i = ivec2(floor(q));
  ivec2 n = ivec2(floor(1.0 / uTexel + 0.5));
  return (i.x < 0 || i.y < 0 || i.x >= n.x || i.y >= n.y) ? ivec2(-1) : i;
}
// Edad (días) de lo sembrado en un punto; negativa si no hay nada sembrado
float edadEn(vec2 p) {
  ivec2 i = pixelDe(p);
  if (i.x < 0) return -1.0;
  float b = floor(texelFetch(uCultivo, i, 0).g * 255.0 + 0.5);
  if (b < 0.5) return -1.0;
  return mod(uHoy - (b - 1.0) + 255.0, 255.0);
}
// Edad con el borde de lo sembrado suavizado (sin la escalera de los píxeles): mira los 2 × 2
// píxeles vecinos; dentro si la mezcla de «sembrado sí / no» pasa de «umbral». La edad es la del
// píxel sembrado más cercano. Negativa si no hay nada.
float edadSuave(vec2 p, float umbral) {
  vec2 q = (p - uMascara.xy) / uMascara.zw / uTexel - 0.5;
  ivec2 i0 = ivec2(floor(q));
  vec2 f = q - vec2(i0);
  ivec2 n = ivec2(floor(1.0 / uTexel + 0.5));
  float b00 = 0.0; float b10 = 0.0; float b01 = 0.0; float b11 = 0.0;
  if (i0.x >= 0 && i0.y >= 0 && i0.x + 1 < n.x && i0.y + 1 < n.y) {
    b00 = floor(texelFetch(uCultivo, i0, 0).g * 255.0 + 0.5);
    b10 = floor(texelFetch(uCultivo, i0 + ivec2(1, 0), 0).g * 255.0 + 0.5);
    b01 = floor(texelFetch(uCultivo, i0 + ivec2(0, 1), 0).g * 255.0 + 0.5);
    b11 = floor(texelFetch(uCultivo, i0 + ivec2(1, 1), 0).g * 255.0 + 0.5);
  }
  float s00 = step(0.5, b00); float s10 = step(0.5, b10); float s01 = step(0.5, b01); float s11 = step(0.5, b11);
  float hay = mix(mix(s00, s10, f.x), mix(s01, s11, f.x), f.y);
  if (hay < umbral) return -1.0;
  // El más cercano de los sembrados
  vec2 c = step(0.5, f);
  float b = c.y < 0.5 ? (c.x < 0.5 ? b00 : b10) : (c.x < 0.5 ? b01 : b11);
  if (b < 0.5) b = max(max(b00, b10), max(b01, b11));
  return mod(uHoy - (b - 1.0) + 255.0, 255.0);
}
// Vigor (0,45…1,12): tierra preparada y abonada crece más; rodales más altos y más bajos
float vigorEn(vec2 p) {
  ivec2 i = pixelDe(p);
  vec4 lab = i.x < 0 ? vec4(0.0) : texelFetch(uLaboreo, i, 0);
  float prep = max(smoothstep(0.3, 0.7, lab.r), smoothstep(0.3, 0.7, lab.g));
  return clamp(0.62 + 0.18 * prep + 0.25 * lab.b + 0.24 * (fbmC(p * 0.07) - 0.5), 0.45, 1.12);
}
`;

// Vigor en JavaScript (sin los rodales: para medias)
export function vigorMedio(prep, abono) {
  return Math.min(1.12, Math.max(0.45, 0.62 + 0.18 * prep + 0.25 * abono));
}
