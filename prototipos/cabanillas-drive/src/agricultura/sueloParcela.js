// Material del suelo de una parcela activa (PLAN_AGRICULTURA.md §5.3). La malla se apoya 3 cm sobre
// el terreno y es transparente: donde no se ha hecho nada no se dibuja y se ve la ortofoto de
// debajo tal cual. Donde se ha trabajado, el estado de las máscaras manda:
//   arado      tierra oscura volteada, surcos de vertedera en la dirección de la pasada, terrones
//   gradeado   tierra más clara, mullida y lisa, con surcos finos
//   abonado    moteado de granulado blanco-grisáceo
//   sembrado   líneas de siembra cada 17 cm en la dirección de la pasada; desde A6, el cultivo que
//              nace y cubre el suelo con su color (de lejos es lo único que se ve de él)
//   húmedo     más oscuro y algo más saturado; charcos con el color del cielo donde está encharcado
//   cosechado  rastrojo claro y hileras de paja
//   rodadas    huellas de rueda hundidas
// El relieve (surcos, terrones, rodadas) no lleva mapa de normales: se calcula la altura en el
// shader y se sombrea con el sol del juego, porque el suelo no recibe luz (la foto ya la trae).
// Sigue la luz del terreno (LUZ_SUELO): de noche oscurece igual que la ortofoto.
import * as THREE from 'three';
import { LUZ_SUELO } from '../escena/suelo.js';
import { GLSL_CRECIMIENTO, uniformesCultivo } from './crecimiento.js';

// Colores en sRGB (se pasan a lineal): tierra de la Ribera, clara y caliza
const COLORES = {
  arado: [104, 84, 64],
  gradeado: [150, 128, 101],
  abono: [226, 224, 214],
  surcoSiembra: [96, 80, 62],
  rastrojo: [196, 176, 128],
  paja: [214, 190, 132],
  humedo: [26, 20, 14],
  charco: [122, 140, 152],
};
const PARAMETROS = {
  surcoAradoM: 0.36,         // anchura de cada tira que voltea la vertedera
  surcoGradeoM: 0.12,
  lineaSiembraM: 0.17,       // separación de las líneas de cereal
  hileraPajaM: 6.0,          // la cosechadora deja una hilera cada pasada de cabezal
  alturaArado: 0.09,         // metros de relieve (para el sombreado)
  alturaGradeo: 0.025,
  oscurecerHumedo: 0.55,     // cuánto oscurece la tierra mojada (0…1)
};

const lineal = (srgb) => new THREE.Color().setRGB(srgb[0] / 255, srgb[1] / 255, srgb[2] / 255, THREE.SRGBColorSpace);

const GLSL = /* glsl */ `
varying vec3 vMundo;
uniform sampler2D uLaboreo, uCultivo, uDentro;
uniform vec4 uMascara;               // ox, oz, ancho en metros, alto en metros
uniform vec2 uTexel;                 // 1/ancho, 1/alto en píxeles de máscara
uniform vec3 uSol;                   // hacia el sol (mundo)
uniform vec3 uColArado, uColGradeo, uColAbono, uColSurco, uColRastrojo, uColPaja, uColHumedo, uColCharco;
uniform float uHayCultivo;
vec4 capaParcela = vec4(0.0);
${GLSL_CRECIMIENTO}

float azarP(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float ruidoP(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(azarP(i), azarP(i + vec2(1, 0)), f.x), mix(azarP(i + vec2(0, 1)), azarP(i + vec2(1, 1)), f.x), f.y);
}
float fbmP(vec2 p) { return 0.5 * ruidoP(p) + 0.3 * ruidoP(p * 2.03 + 3.1) + 0.2 * ruidoP(p * 4.07 + 7.7); }

// «Encima» (over) de una capa con alfa sobre lo que ya hay
void encima(inout vec4 base, vec3 color, float alfa) {
  float a = alfa + base.a * (1.0 - alfa);
  base.rgb = a > 1e-4 ? (color * alfa + base.rgb * base.a * (1.0 - alfa)) / a : base.rgb;
  base.a = a;
}

// Altura del arado: tiras volteadas (perfil asimétrico de vertedera) más terrones
float alturaArado(vec2 p, vec2 eje, vec2 lado, float detalle) {
  float s = dot(p, eje);
  // La tira no es recta ni igual de ancha: la vertedera va y viene con el terreno
  float u = dot(p, lado) / ${PARAMETROS.surcoAradoM.toFixed(3)} + (ruidoP(vec2(s * 0.35, 0.5)) - 0.5) * 0.9;
  float f = fract(u);
  float n = floor(u);
  float tira = pow(sin(3.14159 * pow(f, 0.65)), 0.7) * (0.75 + 0.5 * azarP(vec2(n, 3.0)));
  // Terrones: bultos de 10–30 cm que rompen la tira, y grumos pequeños de cerca
  float terron = smoothstep(0.35, 0.85, ruidoP(p * 4.0 + n * 1.7)) * 0.9 + fbmP(p * 9.0) * 0.4;
  terron += ruidoP(p * 23.0) * 0.35 * detalle;
  return (tira * 0.6 + terron * 0.55) * ${PARAMETROS.alturaArado.toFixed(3)};
}
float alturaGradeo(vec2 p, vec2 eje, vec2 lado, float detalle) {
  float u = dot(p, lado) / ${PARAMETROS.surcoGradeoM.toFixed(3)};
  float raya = 0.5 + 0.5 * sin(6.28318 * u + ruidoP(p * 0.7) * 2.0);
  float grumo = fbmP(p * 14.0) * detalle;
  return (raya * 0.5 * detalle + grumo * 0.6) * ${PARAMETROS.alturaGradeo.toFixed(3)};
}

// Luz difusa de una superficie con esa pendiente (1 = como el suelo llano)
float luzRelieve(vec2 grad) {
  vec3 n = normalize(vec3(-grad.x, 1.0, -grad.y));
  return clamp(dot(n, uSol) / max(uSol.y, 0.25), 0.25, 1.6);
}

void calculaParcela() {
  vec2 p = vMundo.xz;
  vec2 uv = (p - uMascara.xy) / uMascara.zw;
  float dentro = texture2D(uDentro, uv).r;
  if (dentro < 0.002) discard;
  vec4 lab = texture2D(uLaboreo, uv);
  vec4 cul = texture2D(uCultivo, uv);
  float arado = smoothstep(0.15, 0.85, lab.r);
  float gradeo = smoothstep(0.15, 0.85, lab.g);
  float abono = lab.b;
  float th = lab.a * 3.14159265;
  vec2 eje = vec2(cos(th), sin(th));               // dirección de la pasada
  vec2 lado = vec2(-eje.y, eje.x);
  float humedad = cul.r;
  float sembrado = step(0.002, cul.g);
  float cosechado = smoothstep(0.15, 0.85, cul.b);
  float rodada = cul.a;
  float da = max(length(fwidth(p)), 1e-4);         // metros por píxel de pantalla
  float detalle = 1.0 - smoothstep(0.02, 0.09, da);
  float e = 0.03;

  vec4 capa = vec4(0.0);

  // --- Arado: tiras volteadas y terrones, sombreados con el sol
  if (arado > 0.001) {
    float vista = 1.0 - smoothstep(0.08, 0.3, da);  // de lejos, el relieve se funde en color
    float h0 = alturaArado(p, eje, lado, detalle);
    vec2 g = vec2(alturaArado(p + vec2(e, 0.0), eje, lado, detalle) - h0,
                  alturaArado(p + vec2(0.0, e), eje, lado, detalle) - h0) / e;
    float luz = mix(1.0, luzRelieve(g), vista);
    vec3 c = uColArado * (0.8 + 0.4 * fbmP(p * 0.3)) * (0.88 + 0.24 * ruidoP(p * 2.5));
    // Algún resto de paja enterrada a medias
    c = mix(c, uColRastrojo * 0.8, smoothstep(0.93, 0.98, ruidoP(p * 11.0 + 4.0)) * detalle * 0.6);
    c *= mix(0.85, 1.12, h0 / ${PARAMETROS.alturaArado.toFixed(3)} * vista + (1.0 - vista) * 0.5);
    encima(capa, c * luz, arado);
  }
  // --- Gradeado / preparado: más claro y liso
  if (gradeo > 0.001) {
    float vista = 1.0 - smoothstep(0.05, 0.2, da);
    float h0 = alturaGradeo(p, eje, lado, detalle);
    vec2 g = vec2(alturaGradeo(p + vec2(e, 0.0), eje, lado, detalle) - h0,
                  alturaGradeo(p + vec2(0.0, e), eje, lado, detalle) - h0) / e;
    float luz = mix(1.0, luzRelieve(g), vista);
    vec3 c = uColGradeo * (0.9 + 0.2 * fbmP(p * 0.4)) * (0.95 + 0.1 * ruidoP(p * 5.0));
    encima(capa, c * luz, gradeo);
  }
  // --- Siembra: líneas finas en la dirección de la pasada
  if (sembrado > 0.5) {
    float u = dot(p, lado) / ${PARAMETROS.lineaSiembraM.toFixed(3)};
    float dLinea = abs(fract(u) - 0.5) * ${PARAMETROS.lineaSiembraM.toFixed(3)};   // metros a la línea
    float linea = 1.0 - smoothstep(0.012, 0.012 + da * 0.8, dLinea);
    float vista = 1.0 - smoothstep(0.04, 0.12, da);
    float lomo = smoothstep(0.012, 0.035, dLinea) * (1.0 - smoothstep(0.035, 0.06, dLinea));
    encima(capa, uColSurco, linea * 0.75 * vista + 0.12 * (1.0 - vista));
    encima(capa, uColGradeo * 1.15, lomo * 0.25 * vista);
    // El cultivo: de joven, plantitas a lo largo de las líneas; luego cubre el suelo
    float edad = uHayCultivo > 0.5 ? edadSuave(p, 0.5 + (ruidoP(p * 3.0) - 0.5) * 0.4) : -1.0;
    if (edad >= 0.0) {
      Fase f = faseDe(edad);
      float vig = vigorEn(p);
      float cob = clamp(f.cobertura * mix(0.75, 1.05, (vig - 0.45) / 0.67), 0.0, 0.97);
      float fila = 1.0 - smoothstep(0.2, 0.48, abs(fract(u) - 0.5));
      float joven = 1.0 - smoothstep(0.35, 0.8, cob);
      float a = mix(cob, cob * mix(0.3, 2.6, fila) * (0.6 + 0.8 * fbmP(p * 3.0)), joven * vista);
      vec3 c = mix(f.hoja.rgb, f.colEspiga, f.espiga * 0.55) * (0.82 + 0.3 * fbmP(p * 0.45)) * (0.88 + 0.18 * vig);
      // Con el cultivo alto, lo que se ve por abajo (entre el dosel y la linde) es la base en sombra
      c *= mix(1.0, 0.5, smoothstep(0.1, 0.3, f.altura * vig));
      encima(capa, c, clamp(a, 0.0, 0.97));
    }
  }
  // --- Cosechado: rastrojo claro, tallos en líneas e hileras de paja
  if (cosechado > 0.001) {
    float u = dot(p, lado);
    float tallos = 0.5 + 0.5 * sin(6.28318 * u / ${PARAMETROS.lineaSiembraM.toFixed(3)});
    vec3 c = uColRastrojo * (0.85 + 0.25 * fbmP(p * 0.5)) * mix(1.0, 0.8 + 0.3 * tallos, detalle);
    c *= 0.92 + 0.16 * ruidoP(p * 25.0) * detalle;
    float dHilera = abs(fract(u / ${PARAMETROS.hileraPajaM.toFixed(1)}) - 0.5) * ${PARAMETROS.hileraPajaM.toFixed(1)};
    float hilera = 1.0 - smoothstep(0.35, 0.65 + ruidoP(p * 0.8) * 0.3, dHilera);
    vec3 paja = uColPaja * (0.8 + 0.4 * ruidoP(vec2(dot(p, eje) * 3.0, u * 12.0)));
    c = mix(c, paja, hilera * 0.85);
    encima(capa, c, cosechado);
  }
  // --- Abono: granulado moteado (de lejos, un velo claro)
  if (abono > 0.004) {
    vec2 celda = floor(p * 22.0);
    float grano = step(1.0 - 0.28 * abono, azarP(celda)) * (1.0 - smoothstep(0.22, 0.45, length(fract(p * 22.0) - 0.5)));
    float vista = 1.0 - smoothstep(0.01, 0.05, da);
    encima(capa, uColAbono * (0.85 + 0.3 * azarP(celda + 0.5)), grano * vista * 0.95 + abono * 0.18 * (1.0 - vista));
  }
  // --- Rodadas: tierra compactada y hundida (el relieve sale de la propia máscara)
  if (rodada > 0.004) {
    float rx = texture2D(uCultivo, uv + vec2(uTexel.x, 0.0)).a - texture2D(uCultivo, uv - vec2(uTexel.x, 0.0)).a;
    float rz = texture2D(uCultivo, uv + vec2(0.0, uTexel.y)).a - texture2D(uCultivo, uv - vec2(0.0, uTexel.y)).a;
    vec2 g = -vec2(rx, rz) * 0.06 / (2.0 * uMascara.z * uTexel.x);   // 6 cm de hundimiento
    // Dentro de la huella la tierra queda aplastada y lisa: se ve más clara que el arado, con
    // los tacos del neumático en espiga (en la dirección de la huella, de la propia máscara)
    vec2 gm = vec2(rx, rz);
    vec2 lado2 = length(gm) > 0.02 ? normalize(gm) : lado;
    vec2 eje2 = vec2(-lado2.y, lado2.x);
    float taco = step(0.5, fract(dot(p, eje2) / 0.22 + abs(dot(p, lado2)) * 1.6));
    vec3 base = mix(uColGradeo * 0.92, capa.a > 0.01 ? capa.rgb : uColGradeo, 0.35);
    vec3 c = base * (0.9 + 0.12 * taco * detalle) * (0.92 + 0.12 * ruidoP(p * 6.0)) * luzRelieve(g);
    encima(capa, c, smoothstep(0.05, 0.45, rodada) * 0.92);
  }
  // --- Humedad: oscurece lo de debajo (también la foto) y encharca donde hay mucha agua
  if (humedad > 0.004) {
    encima(capa, uColHumedo, smoothstep(0.0, 0.6, humedad) * ${PARAMETROS.oscurecerHumedo.toFixed(2)});
    // Charcos solo en los bajos (ruido lento) y con el agua de sobra: bordes irregulares
    float bajo = fbmP(p * 0.25) * 0.7 + ruidoP(p * 1.3) * 0.3;
    float charco = smoothstep(0.0, 0.05, (humedad - 0.9) * 1.5 + bajo - 0.75);   // ~⅓ encharcado con el agua a tope
    vec3 cielo = mix(uColCharco, uColHumedo * 6.0, 0.25 + 0.25 * ruidoP(p * 0.6)) * (0.9 + 0.2 * ruidoP(p * 0.15));
    encima(capa, cielo, charco * 0.7);
  }

  // Linde: se funde con la ortofoto en los últimos centímetros, con un borde irregular
  float borde = smoothstep(0.0, 1.0, dentro * 1.25 + (ruidoP(p * 2.5) - 0.5) * 0.5);
  capa.a *= borde;
  if (capa.a < 0.003) discard;
  capaParcela = capa;
}
`;

export function creaMaterialParcela({ texturas, ox, oz, anchoM, altoM, ancho, alto }) {
  const material = new THREE.MeshLambertMaterial({
    color: 0xffffff, emissive: 0xffffff, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, name: 'suelo_parcela',
  });
  const uniformes = {
    uLaboreo: { value: texturas.laboreo },
    uCultivo: { value: texturas.cultivo },
    uDentro: { value: texturas.dentro },
    uMascara: { value: new THREE.Vector4(ox, oz, anchoM, altoM) },
    uTexel: { value: new THREE.Vector2(1 / ancho, 1 / alto) },
    uSol: { value: new THREE.Vector3(0.3, 0.8, 0.5).normalize() },
    uColArado: { value: lineal(COLORES.arado) },
    uColGradeo: { value: lineal(COLORES.gradeado) },
    uColAbono: { value: lineal(COLORES.abono) },
    uColSurco: { value: lineal(COLORES.surcoSiembra) },
    uColRastrojo: { value: lineal(COLORES.rastrojo) },
    uColPaja: { value: lineal(COLORES.paja) },
    uColHumedo: { value: lineal(COLORES.humedo) },
    uColCharco: { value: lineal(COLORES.charco) },
    // Cultivo (A6): los pone cultivo.js con los del cultivo sembrado
    uHayCultivo: { value: 0 },
    uHoy: { value: 0 },
    uCurva: { value: uniformesCultivo('trigo').uCurva.value },
    uHoja: { value: uniformesCultivo('trigo').uHoja.value },
    uEspiga: { value: uniformesCultivo('trigo').uEspiga.value },
  };
  material.userData.uniformes = uniformes;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniformes,
      { uEmisivo: LUZ_SUELO.emisivo, uFactorLuz: LUZ_SUELO.factor, uDifuso: LUZ_SUELO.difuso });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vMundo;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uEmisivo;
        uniform float uFactorLuz, uDifuso;
        ${GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        calculaParcela();
        diffuseColor = vec4(capaParcela.rgb * uDifuso, capaParcela.a);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance = capaParcela.rgb * uEmisivo;`)
      // Sombras 3D del juego como en el suelo procedural (sin sombras pintadas que respetar)
      .replace('#include <shadowmap_pars_fragment>', `#include <shadowmap_pars_fragment>
        #include <shadowmask_pars_fragment>`)
      .replace('#include <opaque_fragment>', `
        outgoingLight *= 1.0 - 0.55 * min(uFactorLuz, 1.0) * (1.0 - getShadowMask());
        #include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => 'suelo_parcela_v2';
  return material;
}
