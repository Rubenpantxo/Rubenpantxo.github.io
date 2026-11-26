// Cultivo de una parcela sembrada (PLAN_AGRICULTURA.md §5.4, fase A6): trigo o cebada que nacen,
// crecen, espigan y se secan con la edad de cada píxel (crecimiento.js). Tres niveles:
//   - Lejos: el color en el suelo de la parcela (sueloParcela.js), nada más.
//   - Dosel: la propia malla de la parcela levantada a la altura del cultivo (en el vertex shader),
//     con hojas y espigas y olas de viento por encima y tallos en los bordes, donde acaba lo
//     sembrado (el «escalón»). Se dibuja a cualquier distancia cuando el cultivo pasa de 12 cm.
//   - Cerca de la cámara: matas (dos tarjetas cruzadas con tallos, hojas y espigas) en una rejilla
//     que sigue a la cámara; cada una mira en su sitio la edad, el vigor y la altura del terreno, y
//     se esconde donde no hay nada sembrado. Asoman por encima del dosel, que cerca baja un poco.
// Sin luz propia: siguen la luz del suelo (LUZ_SUELO), como la ortofoto; el dosel recibe sombras.
import * as THREE from 'three';
import { CALIDAD } from '../config/calidad.js';
import { CULTIVOS, MATAS } from '../config/cultivos.js';
import { LUZ_SUELO } from '../escena/suelo.js';
import { GLSL_CRECIMIENTO, uniformesCultivo } from './crecimiento.js';
import { creaGeometria } from './parcela.js';

// ---------------------------------------------------------------- textura de las matas
// R: tallos y hojas · G: espigas · B: matiz (claro/oscuro) · A: cubierta. Procedural, sin archivos.
const texturas = new Map();
function texturaMata(id) {
  if (texturas.has(id)) return texturas.get(id);
  const W = 128;
  const H = 256;
  const lienzo = document.createElement('canvas');
  lienzo.width = W;
  lienzo.height = H;
  const ctx = lienzo.getContext('2d');
  let semilla = id === 'cebada' ? 7 : id === 'cebolla' ? 11 : 3;
  const azar = () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };
  const color = (r, g, matiz) => `rgb(${r},${g},${Math.round(60 + matiz * 195)})`;
  if (id === 'cebolla') {
    // Cebolla: hojas tubulares, gruesas y largas, que salen del cuello y se abren y se doblan por arriba
    for (let k = 0; k < 15; k++) {
      const x0 = W * (0.38 + azar() * 0.24);
      const lado = (azar() - 0.5) * 2;
      const alto = H * (0.55 + azar() * 0.4);
      const x1 = x0 + lado * W * (0.1 + azar() * 0.2);
      ctx.strokeStyle = color(255, 0, azar());
      ctx.lineWidth = 4.5 + azar() * 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, H);
      ctx.quadraticCurveTo(x0 + lado * W * 0.03, H - alto * 0.65, x1, H - alto);
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(lienzo);
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 2;
    texturas.set(id, t);
    return t;
  }
  const topeTallo = H * 0.24;            // las espigas ocupan el cuarto de arriba
  // Hojas: láminas curvas desde abajo hacia los lados
  for (let k = 0; k < 14; k++) {
    const x0 = W * (0.3 + azar() * 0.4);
    const lado = azar() < 0.5 ? -1 : 1;
    const alto = H * (0.35 + azar() * 0.4);
    ctx.strokeStyle = color(255, 0, azar());
    ctx.lineWidth = 3 + azar() * 2;
    ctx.beginPath();
    ctx.moveTo(x0, H);
    ctx.quadraticCurveTo(x0 + lado * W * 0.05, H - alto * 0.7, x0 + lado * W * (0.18 + azar() * 0.2), H - alto);
    ctx.stroke();
  }
  // Tallos con su espiga
  for (let k = 0; k < 16; k++) {
    const x0 = W * (0.2 + azar() * 0.6);
    const x1 = x0 + (azar() - 0.5) * W * 0.25;
    const y1 = topeTallo + azar() * H * 0.12;
    ctx.strokeStyle = color(255, 0, azar());
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, H);
    ctx.quadraticCurveTo((x0 + x1) / 2 + (azar() - 0.5) * 8, (H + y1) / 2, x1, y1);
    ctx.stroke();
    if (k > 13) continue;                 // algún tallo sin espiga
    const largo = H * (id === 'cebada' ? 0.11 : 0.13);
    const matiz = azar();
    ctx.fillStyle = color(0, 255, matiz);
    ctx.strokeStyle = color(0, 255, matiz);
    if (id === 'cebada') {
      // Espiga fina con barbas largas
      ctx.beginPath();
      ctx.ellipse(x1, y1 - largo / 2, 2.4, largo / 2, (azar() - 0.5) * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1;
      for (let b = 0; b < 7; b++) {
        const yb = y1 - largo * (0.15 + b * 0.12);
        ctx.beginPath();
        ctx.moveTo(x1, yb);
        ctx.lineTo(x1 + (azar() - 0.5) * 10, yb - H * 0.12);
        ctx.stroke();
      }
    } else {
      // Espiga gruesa de espiguillas alternas
      for (let e = 0; e < 8; e++) {
        const ye = y1 - (e + 0.5) * (largo / 8);
        ctx.beginPath();
        ctx.ellipse(x1 + (e % 2 ? 2 : -2), ye, 3.2, largo / 12, (e % 2 ? 0.5 : -0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1 - largo);
      ctx.lineTo(x1, y1 - largo - 5);
      ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(lienzo);
  t.colorSpace = THREE.NoColorSpace;      // son datos, no color
  t.anisotropy = 2;
  texturas.set(id, t);
  return t;
}

// Dos tarjetas cruzadas de 1 × 1 (base en y = 0), con tres tramos de alto para poder doblarlas
function geometriaMata() {
  const partes = [0, 1].map((k) => new THREE.PlaneGeometry(1, 1, 1, 3).translate(0, 0.5, 0).rotateY((k * Math.PI) / 2 + 0.4));
  const pos = []; const uv = []; const nor = []; const ind = [];
  for (const p of partes) {
    const base = pos.length / 3;
    pos.push(...p.attributes.position.array);
    uv.push(...p.attributes.uv.array);
    nor.push(...p.attributes.normal.array);
    ind.push(...Array.from(p.index.array, (i) => i + base));
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));     // sin normales, Lambert da NaN (negro)
  g.setIndex(ind);
  return g;
}

// Altura del terreno en una rejilla de 1 m sobre la máscara (para apoyar las matas en el vertex shader)
function texturaAltura(parcela, terreno) {
  const paso = 1;
  const ancho = Math.ceil((parcela.ancho * parcela.mpp) / paso) + 2;
  const alto = Math.ceil((parcela.alto * parcela.mpp) / paso) + 2;
  const datos = new Float32Array(ancho * alto);
  for (let j = 0; j < alto; j++) {
    for (let i = 0; i < ancho; i++) datos[j * ancho + i] = terreno.alturaEn(parcela.ox + i * paso, parcela.oz + j * paso);
  }
  const t = new THREE.DataTexture(datos, ancho, alto, THREE.RedFormat, THREE.FloatType);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return { textura: t, rejilla: new THREE.Vector4(parcela.ox, parcela.oz, paso, 0), tam: new THREE.Vector2(ancho, alto) };
}

const GLSL_ALTURA = /* glsl */ `
uniform sampler2D uAltura;
uniform vec4 uAlturaRejilla;      // ox, oz, paso
uniform vec2 uAlturaTam;
float alturaTerreno(vec2 p) {
  vec2 q = (p - uAlturaRejilla.xy) / uAlturaRejilla.z;
  ivec2 i = clamp(ivec2(floor(q)), ivec2(0), ivec2(uAlturaTam) - 2);
  vec2 f = clamp(q - vec2(i), 0.0, 1.0);
  float a = texelFetch(uAltura, i, 0).r;
  float b = texelFetch(uAltura, i + ivec2(1, 0), 0).r;
  float c = texelFetch(uAltura, i + ivec2(0, 1), 0).r;
  float d = texelFetch(uAltura, i + ivec2(1, 1), 0).r;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}`;

const COMUNES = /* glsl */ `
uniform sampler2D uLaboreo, uCultivo;
uniform vec4 uMascara;
uniform vec2 uTexel;
uniform float uTiempo;
uniform vec3 uCamara;
uniform float uRadioMatas;
uniform vec3 uEmisivo;
uniform float uDifuso;
`;

// ---------------------------------------------------------------- materiales
function materialDosel(u) {
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff, name: 'dosel_cultivo' });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u, { uEmisivo: LUZ_SUELO.emisivo, uDifuso: LUZ_SUELO.difuso });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        ${COMUNES}
        ${GLSL_CRECIMIENTO}
        varying vec3 vMundo;
        varying float vSuelo;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec3 w = (modelMatrix * vec4(transformed, 1.0)).xyz;
          vSuelo = w.y;
          float edad = edadSuave(w.xz, 0.5);
          float h = 0.0;
          if (edad >= 0.0) { Fase f = faseDe(edad); h = f.altura * vigorEn(w.xz); }
          // Cerca, donde hay matas, el dosel baja: las matas dan la silueta de arriba
          float d = distance(w.xz, uCamara.xz);
          float baja = uRadioMatas > 0.0 ? mix(0.55, 1.0, smoothstep(uRadioMatas * 0.55, uRadioMatas * 0.95, d)) : 1.0;
          transformed.y += h * baja;
        }`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        ${COMUNES}
        ${GLSL_CRECIMIENTO}
        uniform vec3 uSol;
        uniform float uAlturaMin;
        varying vec3 vMundo;
        varying float vSuelo;
        vec3 colorDosel = vec3(0.0);`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec2 p = vMundo.xz;
          float edad = edadSuave(p, 0.5 + (ruidoC(p * 3.0) - 0.5) * 0.4);    // borde irregular
          if (edad < 0.0) discard;
          Fase f = faseDe(edad);
          float vig = vigorEn(p);
          float h = f.altura * vig;
          if (h < uAlturaMin) discard;
          vec3 nc = cross(dFdx(vMundo), dFdy(vMundo));
          vec3 n = dot(nc, nc) > 1e-12 ? normalize(nc) : vec3(0.0, 1.0, 0.0);
          if (n.y < 0.0) n = -n;
          float da = max(length(fwidth(p)), 1e-4);
          float detalle = 1.0 - smoothstep(0.02, 0.12, da);
          float lado = 1.0 - smoothstep(0.3, 0.7, n.y);        // cara de borde (tallos)
          // Arriba: hojas y espigas, con olas de viento que corren por el campo
          float ola = 0.5 + 0.5 * sin(dot(p, vec2(0.5, 0.32)) - uTiempo * 1.5 + fbmC(p * 0.15) * 4.0);
          float grano = ruidoC(p * 11.0);
          vec3 arriba = mix(f.hoja.rgb, f.colEspiga, f.espiga * (0.45 + 0.55 * grano));
          arriba *= (0.78 + 0.32 * fbmC(p * 0.35)) * (0.85 + 0.25 * fbmC(p * 1.6)) * (0.9 + 0.2 * ola * (0.4 + f.espiga)) * (0.9 + 0.15 * vig);
          // De cerca: hojas en sombra y luz, y entre las líneas de siembra se ve algo de tierra
          arriba *= mix(1.0, 0.72 + 0.45 * ruidoC(p * 9.0) * ruidoC(p * 23.0 + 1.3), detalle);
          ivec2 ip = pixelDe(p);
          float th = ip.x < 0 ? 0.0 : texelFetch(uLaboreo, ip, 0).a * 3.14159265;
          float u = dot(p, vec2(-sin(th), cos(th))) / 0.17;
          float hueco = smoothstep(0.3, 0.5, abs(fract(u) - 0.5)) * (1.0 - f.cobertura) * 2.0;
          arriba = mix(arriba, arriba * 0.5, clamp(hueco, 0.0, 0.6) * detalle);
          // Borde: tallos verticales, más oscuros abajo, espigas en la franja de arriba
          float alto = clamp((vMundo.y - vSuelo) / max(h, 0.05), 0.0, 1.0);
          vec2 t = normalize(vec2(-n.z, n.x) + 1e-4);
          float tallo = 0.75 + 0.35 * step(0.55, fract(dot(p, t) * 18.0 + ruidoC(p * 5.0)));
          vec3 borde = mix(f.hoja.rgb * 0.75, f.colEspiga, f.espiga * smoothstep(0.78, 0.86, alto)) * tallo * mix(0.45, 1.0, alto);
          float luz = clamp(dot(n, uSol) / max(uSol.y, 0.3), 0.35, 1.3);
          colorDosel = mix(arriba, borde * luz, lado);
        }
        diffuseColor = vec4(colorDosel * uDifuso, 1.0);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance = colorDosel * uEmisivo;`)
      .replace('#include <shadowmap_pars_fragment>', `#include <shadowmap_pars_fragment>
        #include <shadowmask_pars_fragment>`)
      .replace('#include <opaque_fragment>', `
        outgoingLight *= 1.0 - 0.5 * (1.0 - getShadowMask());
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'dosel_cultivo_v2';
  return m;
}

function materialMatas(u, textura) {
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff, map: textura, alphaTest: 0.5, side: THREE.DoubleSide, name: 'matas_cultivo' });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u, { uEmisivo: LUZ_SUELO.emisivo, uDifuso: LUZ_SUELO.difuso });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        ${COMUNES}
        ${GLSL_CRECIMIENTO}
        ${GLSL_ALTURA}
        attribute vec2 aCelda;
        uniform vec2 uOrigen;
        uniform float uSeparacion, uAncho;
        varying vec4 vHoja;
        varying vec3 vColEspiga;
        varying float vEspiga, vMatiz;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec2 celda = floor(uOrigen / uSeparacion + 0.5) + aCelda;     // celda del mundo: no baila al moverse
          vec2 base = (celda + (vec2(azarC(celda), azarC(celda + 17.3)) - 0.5) * 0.9) * uSeparacion;
          float d = distance(base, uCamara.xz);
          float edad = d < uRadioMatas ? edadSuave(base, 0.5) : -1.0;
          float h = 0.0;
          Fase f;
          if (edad >= 0.0) {
            f = faseDe(edad);
            h = f.altura * vigorEn(base) * (0.82 + 0.32 * azarC(celda + 3.1));
            h *= 1.0 - smoothstep(uRadioMatas * 0.8, uRadioMatas, d);
          }
          if (h < 0.012) {
            transformed = vec3(0.0, -1e5, 0.0);          // fuera de la vista
            vHoja = vec4(0.0); vColEspiga = vec3(0.0); vEspiga = 0.0; vMatiz = 0.0;
          } else {
            float giro = azarC(celda + 5.7) * 6.2832;
            float c = cos(giro); float s = sin(giro);
            vec3 v = transformed;
            float ancho = uAncho * mix(0.45, 1.0, smoothstep(0.03, 0.35, f.altura));
            v.x *= ancho; v.z *= ancho;
            v.xz = vec2(c * v.x - s * v.z, s * v.x + c * v.z);
            float k = v.y * v.y;                         // 0 abajo … 1 arriba (antes de escalar)
            v.y *= h;
            // Viento y cabeceo de la espiga madura (la cebada se dobla mucho)
            float fase = base.x * 0.7 + base.y * 0.9;
            vec2 viento = vec2(sin(uTiempo * 1.6 + fase), cos(uTiempo * 1.2 + fase * 1.3)) * 0.07 * k * h;
            vec2 dobla = vec2(cos(giro * 1.7), sin(giro * 1.7)) * f.hoja.w * 0.16 * smoothstep(0.55, 1.0, k) * h;
            v.xz += viento + dobla;
            v.y -= length(dobla) * 0.5;
            transformed = vec3(base.x, alturaTerreno(base) + 0.02, base.y) + v;
            vHoja = f.hoja; vColEspiga = f.colEspiga; vEspiga = f.espiga; vMatiz = azarC(celda + 9.1);
          }
        }`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uEmisivo;
        uniform float uDifuso;
        varying vec4 vHoja;
        varying vec3 vColEspiga;
        varying float vEspiga, vMatiz;
        vec3 colorMata = vec3(0.0);`)
      .replace('#include <map_fragment>', `
        vec4 t = texture2D(map, vMapUv);
        float espiga = t.g * smoothstep(0.2, 0.6, vEspiga);
        float a = max(t.r, espiga);
        if (a < 0.5) discard;
        float matiz = 0.65 + 0.5 * t.b;
        vec3 hoja = vHoja.rgb * matiz * mix(0.5, 1.05, smoothstep(0.0, 0.7, vMapUv.y));
        colorMata = mix(hoja, vColEspiga * (0.8 + 0.35 * t.b), step(t.r, espiga)) * (0.9 + 0.2 * vMatiz);
        diffuseColor = vec4(colorMata * uDifuso, 1.0);`)
      .replace('#include <alphatest_fragment>', '')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance = colorMata * uEmisivo;`);
  };
  m.customProgramCacheKey = () => 'matas_cultivo_v2';
  return m;
}

// ---------------------------------------------------------------- cultivo de una parcela
export function creaCultivo(parcela, { terreno, reloj, sol = null }) {
  const nivel = CALIDAD.nivel;
  const conf = MATAS[nivel] ?? MATAS.medio;
  const altura = texturaAltura(parcela, terreno);
  let id = parcela.siembra?.cultivo ?? 'trigo';
  const uc = uniformesCultivo(id);
  const u = {
    uLaboreo: { value: parcela.texturas.laboreo },
    uCultivo: { value: parcela.texturas.cultivo },
    uAgua: { value: parcela.texturas.agua },
    uMascara: { value: new THREE.Vector4(parcela.ox, parcela.oz, parcela.ancho * parcela.mpp, parcela.alto * parcela.mpp) },
    uTexel: { value: new THREE.Vector2(1 / parcela.ancho, 1 / parcela.alto) },
    uHoy: reloj.uHoy,
    uCurva: { value: uc.uCurva.value },
    uHoja: { value: uc.uHoja.value },
    uEspiga: { value: uc.uEspiga.value },
    uTiempo: { value: 0 },
    uCamara: { value: new THREE.Vector3() },
    uRadioMatas: { value: conf.radio },
    uSol: { value: new THREE.Vector3(0.3, 0.8, 0.5).normalize() },
    uAlturaMin: { value: MATAS.alturaMinimaDosel },
    uAltura: { value: altura.textura },
    uAlturaRejilla: { value: altura.rejilla },
    uAlturaTam: { value: altura.tam },
    uOrigen: { value: new THREE.Vector2() },
    uSeparacion: { value: conf.separacion },
    uAncho: { value: MATAS.ancho },
  };
  const raiz = new THREE.Group();
  raiz.name = `cultivo_${parcela.ref}`;
  // Dosel: una rejilla como la del suelo de la parcela, más fina en las parcelas pequeñas (el borde
  // de lo sembrado hace menos dientes)
  const area = parcela.info.superficie_ha ?? 1;
  const pasoDosel = area <= MATAS.doselFinoHastaHa && nivel !== 'bajo' ? MATAS.pasoDoselFinoM : null;
  const geoDosel = pasoDosel ? creaGeometria(parcela.info, terreno, parcela.mascara, pasoDosel).geo : parcela.malla.geometry;
  const dosel = new THREE.Mesh(geoDosel, materialDosel(u));
  dosel.name = 'dosel';
  dosel.receiveShadow = true;
  dosel.frustumCulled = false;            // sube con el cultivo: la esfera de la malla se queda corta
  dosel.renderOrder = 3;
  raiz.add(dosel);
  // Matas: rejilla de (2n + 1)² alrededor de la cámara
  const n = Math.ceil(conf.radio / conf.separacion);
  const celdas = new Float32Array((2 * n + 1) ** 2 * 2);
  let k = 0;
  for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) { celdas[k++] = i; celdas[k++] = j; }
  const geo = geometriaMata();
  geo.setAttribute('aCelda', new THREE.InstancedBufferAttribute(celdas, 2));
  geo.instanceCount = (2 * n + 1) ** 2;
  const matas = new THREE.Mesh(geo, materialMatas(u, texturaMata(id)));
  matas.name = 'matas';
  matas.frustumCulled = false;
  raiz.add(matas);
  const [x0, z0, x1, z1] = parcela.info.caja;

  const cultivo = {
    raiz, dosel, matas, uniformes: u, parcela,
    get id() { return id; },
    get instancias() { return geo.instanceCount; },
    // Cambia de cultivo (se siembra otro en la parcela)
    pon(nuevo) {
      if (nuevo === id || !CULTIVOS[nuevo]) return;
      id = nuevo;
      const v = uniformesCultivo(id);
      u.uCurva.value = v.uCurva.value; u.uHoja.value = v.uHoja.value; u.uEspiga.value = v.uEspiga.value;
      matas.material.map = texturaMata(id);
      cultivo.pintaSuelo();
    },
    // El suelo de la parcela enseña el color del cultivo de lejos
    pintaSuelo() {
      const s = parcela.malla.material.userData.uniformes;
      const v = uniformesCultivo(id);
      s.uHayCultivo.value = 1;
      s.uCurva.value = v.uCurva.value; s.uHoja.value = v.uHoja.value; s.uEspiga.value = v.uEspiga.value;
    },
    actualiza(dt, camara) {
      u.uTiempo.value += dt;
      u.uCamara.value.copy(camara.position);
      u.uOrigen.value.set(Math.round(camara.position.x / conf.separacion) * conf.separacion,
        Math.round(camara.position.z / conf.separacion) * conf.separacion);
      if (sol) u.uSol.value.copy(sol.position).sub(sol.target.position).normalize();
      parcela.malla.material.userData.uniformes.uHoy.value = reloj.uHoy.value;
      // Las matas solo si la cámara está cerca de la parcela
      const dx = Math.max(x0 - camara.position.x, 0, camara.position.x - x1);
      const dz = Math.max(z0 - camara.position.z, 0, camara.position.z - z1);
      matas.visible = Math.hypot(dx, dz) < conf.radio;
    },
    libera() {
      raiz.removeFromParent();
      dosel.material.dispose();
      if (geoDosel !== parcela.malla.geometry) geoDosel.dispose();
      matas.material.dispose();
      geo.dispose();
      altura.textura.dispose();
    },
  };
  cultivo.pintaSuelo();
  return cultivo;
}
