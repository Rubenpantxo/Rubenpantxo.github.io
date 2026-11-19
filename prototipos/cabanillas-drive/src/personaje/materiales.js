// Materiales del personaje:
//   - piel: PBR con dispersión bajo la superficie aproximada (la luz «entra» rojiza en el borde de
//     la sombra, como en la piel de verdad), tono continuo (melanina) y micro-relieve de poros
//   - pelo y ropa: el color se cambia conservando el dibujo de la textura (luminancia × color)
//   - ojos: iris con córnea brillante (barniz)
import * as THREE from 'three';
import { PERSONAJE } from '../config/personaje.js';

const cargador = new THREE.TextureLoader();
const cache = new Map();

// Luminancia media de la textura (para que al recolorear salga el color elegido de media)
function luminanciaMedia(imagen) {
  try {
    const c = document.createElement('canvas');
    c.width = 32; c.height = 32;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(imagen, 0, 0, 32, 32);
    const d = g.getImageData(0, 0, 32, 32).data;
    let s = 0; let w = 0;
    const lineal = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3] / 255;
      if (a < 0.3) continue;
      s += a * (0.2126 * lineal(d[i]) + 0.7152 * lineal(d[i + 1]) + 0.0722 * lineal(d[i + 2]));
      w += a;
    }
    return w ? s / w : 0.5;
  } catch { return 0.5; }
}

export function textura(nombre, { color = true, maxLado = 4096 } = {}) {
  const url = `${PERSONAJE.ruta}tex/${nombre}`;
  if (!cache.has(url)) {
    cache.set(url, cargador.loadAsync(url).then((t) => {
      t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = 8;
      t.userData.luminancia = color ? luminanciaMedia(t.image) : 0.5;
      if (t.image?.width > maxLado) t.userData.reducir = maxLado;
      return t;
    }));
  }
  return cache.get(url);
}

// Relieve de poros: ruido de alta frecuencia hecho en un lienzo (se repite muchas veces en la UV)
let poros = null;
function texturaPoros() {
  if (poros) return poros;
  const lado = 256;
  const c = document.createElement('canvas');
  c.width = lado; c.height = lado;
  const g = c.getContext('2d');
  const img = g.createImageData(lado, lado);
  const alto = new Float32Array(lado * lado);
  let semilla = 7;
  const azar = () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };
  for (let i = 0; i < alto.length; i++) alto[i] = azar();
  // Suaviza un poco (poros redondeados) y deriva a normales
  const h = (x, y) => alto[((y + lado) % lado) * lado + ((x + lado) % lado)];
  const s = new Float32Array(lado * lado);
  for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) {
    s[y * lado + x] = (h(x, y) * 4 + h(x + 1, y) + h(x - 1, y) + h(x, y + 1) + h(x, y - 1)) / 8;
  }
  const hs = (x, y) => s[((y + lado) % lado) * lado + ((x + lado) % lado)];
  for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) {
    const dx = (hs(x + 1, y) - hs(x - 1, y)) * 1.6;
    const dy = (hs(x, y + 1) - hs(x, y - 1)) * 1.6;
    const l = Math.hypot(dx, dy, 1);
    const i = (y * lado + x) * 4;
    img.data[i] = ((-dx / l) * 0.5 + 0.5) * 255;
    img.data[i + 1] = ((-dy / l) * 0.5 + 0.5) * 255;
    img.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  poros = new THREE.CanvasTexture(c);
  poros.wrapS = poros.wrapT = THREE.RepeatWrapping;
  poros.repeat.set(48, 48);
  poros.colorSpace = THREE.NoColorSpace;
  return poros;
}

// --- Piel
const SSS_PARS = THREE.ShaderChunk.lights_physical_pars_fragment.replace(
  'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
  `reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
  #ifdef PIEL_SSS
  {
    float nl = dot( geometryNormal, directLight.direction );
    float envuelta = saturate( ( nl + uSssAncho ) / ( 1.0 + uSssAncho ) ) - saturate( nl );
    reflectedLight.directDiffuse += max( envuelta, 0.0 ) * directLight.color * uSssColor * BRDF_Lambert( material.diffuseColor );
  }
  #endif`,
);
if (SSS_PARS === THREE.ShaderChunk.lights_physical_pars_fragment) {
  console.warn('[personaje] no se ha podido añadir la dispersión de la piel (cambió el shader de three)');
}

export function creaMaterialPiel() {
  const P = PERSONAJE.piel;
  const m = new THREE.MeshPhysicalMaterial({
    roughness: P.rugosidad, metalness: 0, sheen: 0.25, sheenRoughness: 0.55,
    sheenColor: new THREE.Color(1.0, 0.75, 0.68), specularIntensity: 0.55,
    normalMap: texturaPoros(), normalScale: new THREE.Vector2(0.18, 0.18),
  });
  m.name = 'personaje_piel';
  const u = {
    uSssAncho: { value: P.ancho }, uSssColor: { value: new THREE.Color(...P.color) },
    uTono: { value: 0 }, uRubor: { value: 0.3 },
    // Zona resaltada al pasar el ratón en el editor (radio 0: apagada)
    uResaltaCentro: { value: new THREE.Vector3() }, uResaltaRadio: { value: 0 },
    uResaltaColor: { value: new THREE.Color(0.35, 0.75, 1.0) },
  };
  m.userData.uniformes = u;
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.defines = { ...s.defines, PIEL_SSS: '' };
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vResaltaPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvResaltaPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSssAncho; uniform vec3 uSssColor; uniform float uTono; uniform float uRubor;\n'
        + 'varying vec3 vResaltaPos; uniform vec3 uResaltaCentro; uniform float uResaltaRadio; uniform vec3 uResaltaColor;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      if ( uResaltaRadio > 0.0 ) {
        float d = distance( vResaltaPos, uResaltaCentro ) / uResaltaRadio;
        float borde = smoothstep( 1.0, 0.82, d ) * ( 0.35 + 0.65 * smoothstep( 0.55, 0.95, d ) );
        totalEmissiveRadiance += uResaltaColor * borde * 0.22;
      }`)
      .replace('#include <lights_physical_pars_fragment>', SSS_PARS)
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        // Tono: > 0 más melanina (más oscuro y cálido), < 0 más claro
        float t = uTono;
        vec3 melanina = pow( vec3( 0.80, 0.60, 0.46 ), vec3( max( t, 0.0 ) * 2.4 ) );
        vec3 claro = mix( vec3( 1.0 ), vec3( 1.32, 1.24, 1.18 ), max( -t, 0.0 ) );
        diffuseColor.rgb *= melanina * claro;
        // Rubor: un poco más de rojo en la piel (hemoglobina)
        diffuseColor.rgb *= mix( vec3( 1.0 ), vec3( 1.06, 0.97, 0.96 ), uRubor );
      }`);
  };
  m.customProgramCacheKey = () => 'personaje_piel';
  return m;
}

// --- Pelo, cejas, pestañas y ropa: recoloreado por luminancia
function recolorea(m, clave) {
  const u = { uColor: { value: new THREE.Color(1, 1, 1) }, uMezcla: { value: 0 }, uLumRef: { value: 0.5 }, uCanas: { value: 0 } };
  m.userData.uniformes = u;
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uColor; uniform float uMezcla; uniform float uLumRef; uniform float uCanas;')
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        float lum = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
        float rel = lum / max( uLumRef, 1e-3 );
        vec3 tinte = uColor * clamp( pow( rel, 0.85 ), 0.0, 3.0 );
        diffuseColor.rgb = mix( diffuseColor.rgb, tinte, uMezcla );
        // Canas: mechones al azar (por la luminancia) hacia gris claro
        float mecha = smoothstep( 0.35, 0.9, fract( lum * 37.0 ) );
        diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.62, 0.61, 0.6 ) * clamp( rel, 0.4, 1.6 ), uCanas * mix( 0.55, 1.0, mecha ) );
      }`);
  };
  m.customProgramCacheKey = () => `personaje_${clave}`;
  return m;
}

export function ponColor(m, color, mezcla = 1) {
  const u = m.userData.uniformes;
  if (!u) return;
  if (color) u.uColor.value.set(color);   // three pasa el #hex a lineal
  u.uMezcla.value = color ? mezcla : 0;
  if (m.sheenColor && color) m.sheenColor.set(color).lerp(new THREE.Color(1, 1, 1), 0.55);
}

// msaa: el lienzo tiene antialias de verdad. Sin él, alphaToCoverage no recorta nada (three quita el
// «discard» del alphaTest) y las pestañas y el pelo salen como placas opacas
export function creaMaterialPrenda(hueco, texColor, texNormal, { msaa = false } = {}) {
  const pelo = hueco === 'pelo' || hueco === 'cejas' || hueco === 'pestanas';
  const m = new THREE.MeshPhysicalMaterial({
    map: texColor ?? null, normalMap: texNormal ?? null, metalness: 0,
    roughness: pelo ? 0.5 : 0.82, sheen: pelo ? 0.7 : 0.35, sheenRoughness: pelo ? 0.3 : 0.7,
    sheenColor: new THREE.Color(0.6, 0.55, 0.5), side: pelo ? THREE.DoubleSide : THREE.FrontSide,
    alphaTest: pelo ? (hueco === 'pelo' ? 0.42 : 0.28) : 0.5, alphaToCoverage: pelo && msaa,
    specularIntensity: pelo ? 0.6 : 0.3,
  });
  if (hueco === 'cejas' || hueco === 'pestanas') {
    m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -6;
  }
  if (texColor) m.userData.luminancia = texColor.userData.luminancia;
  recolorea(m, pelo ? 'pelo' : 'ropa');
  if (texColor) m.userData.uniformes.uLumRef.value = texColor.userData.luminancia ?? 0.5;
  m.name = `personaje_${hueco}`;
  return m;
}

export function creaMaterialOjos(texIris) {
  const m = new THREE.MeshPhysicalMaterial({
    map: texIris ?? null, roughness: 0.25, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04,
    specularIntensity: 0.8,
    // La córnea (la capa de fuera) usa una zona transparente de la textura: se recorta y el
    // barniz del iris hace de brillo húmedo
    alphaTest: 0.5,
  });
  m.name = 'personaje_ojos';
  return m;
}
