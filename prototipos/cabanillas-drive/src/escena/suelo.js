// Material del terreno. Fuera de calles y caminos, la ortofoto tal cual (sin luz, ya trae la del
// día del vuelo). En calzadas, aceras y caminos de tierra (tools/11_suelo.py: tipos.png) la foto
// se sustituye por un suelo procedural, porque a ras de suelo la foto es borrosa y sus rayas
// pintadas, difusas, no casan con las marcas viales 3D (marcas.js):
// - calzada: asfalto (árido de ambientCG + parches, rodadas, grietas selladas y suciedad junto
//   al bordillo), algo más oscuro que la foto (la bruma del vuelo aclara el asfalto)
// - acera: cemento fratasado con juntas cada 1,5 m alineadas con la calle (direccion.png)
// - camino de tierra: el color de la foto muy suavizado (de lejos se ve como en la foto) con
//   grano, guijarros, dos rodadas y algo de hierba en el centro
// Además, las sombras 3D del juego: sobre la foto solo oscurecen lo que en la foto está al sol
// (donde ya tiene su sombra pintada no se oscurece dos veces); sobre el suelo procedural,
// siempre (no trae sombras pintadas).
import * as THREE from 'three';

const FUERZA_SOMBRA = 0.55;                 // cuánto oscurece una sombra 3D el suelo soleado
const LUZ_SOMBRA_PINTADA = [0.035, 0.12];   // luminancia lineal: por debajo, ya es sombra en la foto
// Tono de cada suelo respecto al color medido en la foto (suelo.json, colores_srgb)
const AJUSTE = {
  calzada: 0.44,     // la foto aclara mucho el asfalto: brea gris oscura
  acera: 0.95,       // cemento gris claro
};
const RANGO_BORDILLO_M = 3.0;               // bordillo.png: −3…+3 m (RANGO_BORDILLO_M de 11_suelo.py)
const ASFALTO_POR_DEFECTO = [86, 85, 82];
const CEMENTO_POR_DEFECTO = [178, 173, 160];

// Luz del terreno, común a todas sus mallas (la mueve el ciclo de día, cicloDia.js): la foto
// como emisivo multiplicado por «emisivo», y de noche además como color difuso que recibe la
// luz de la luna y de los faros
export const LUZ_SUELO = {
  emisivo: { value: new THREE.Color(1, 1, 1) },
  factor: { value: 1 },
  difuso: { value: 0 },
};

export async function cargaDetalleSuelo(ruta, renderer) {
  const meta = await fetch(`${ruta}suelo.json`).then((r) => (r.ok ? r.json() : null));
  if (!meta) return null;
  const cargador = new THREE.TextureLoader();
  const [tipos, direccion, asfalto, baldosa, tierra] = await Promise.all(
    ['tipos', 'direccion', 'asfalto', 'baldosa', 'tierra'].map((n) => cargador.loadAsync(`${ruta}${n}.png`)));
  const anisotropia = renderer.capabilities.getMaxAnisotropy();
  for (const t of [asfalto, baldosa, tierra]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = anisotropia;
  }
  // La dirección no se interpola entre píxeles vecinos de vías distintas (ángulos sin sentido)
  direccion.magFilter = THREE.NearestFilter;
  direccion.minFilter = THREE.NearestFilter;
  direccion.generateMipmaps = false;
  // Distancia al bordillo (11_suelo.py): sin mipmaps, que mezclarían los dos lados del bordillo
  const bordillo = await cargador.loadAsync(`${ruta}bordillo.png`).catch(() => null);
  if (bordillo) {
    bordillo.generateMipmaps = false;
    bordillo.minFilter = THREE.LinearFilter;
  }
  return { meta, tipos, direccion, asfalto, baldosa, tierra, bordillo };
}

// Color sRGB de la foto × ajuste → lineal
function colorSuelo(srgb, ajuste) {
  const c = new THREE.Color().setRGB(srgb[0] / 255, srgb[1] / 255, srgb[2] / 255, THREE.SRGBColorSpace);
  return c.multiplyScalar(ajuste);
}

// Suelo procedural: deja en sueloProc el color (lineal) y en pesoProc cuánto sustituye a la foto
const GLSL_SUELO = /* glsl */ `
varying vec3 vMundo;
uniform sampler2D uTipos, uDireccion, uAsfalto, uBaldosa, uTierra, uBordillo;
uniform vec4 uZona;
uniform vec3 uMetros;
uniform vec3 uColAsfalto, uColAcera;
vec3 sueloProc = vec3(0.0);
float pesoProc = 0.0;

float azarS(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float ruidoS(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(azarS(i), azarS(i + vec2(1, 0)), f.x), mix(azarS(i + vec2(0, 1)), azarS(i + vec2(1, 1)), f.x), f.y);
}
float fbmS(vec2 p) { return 0.5 * ruidoS(p) + 0.3 * ruidoS(p * 2.07 + 5.3) + 0.2 * ruidoS(p * 4.13 + 1.7); }
// Distancia al borde de la celda de Voronoi (grietas)
float bordeVoronoi(vec2 q) {
  vec2 i = floor(q); vec2 f = fract(q);
  float d1 = 9.0, d2 = 9.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = vec2(azarS(i + g), azarS(i + g + 3.1));
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
  }
  return d2 - d1;
}

void calculaSuelo(vec3 foto) {
  vec2 uvT = vec2((vMundo.x - uZona.x) / uZona.z, (vMundo.z - uZona.y) / uZona.w);
  uvT.y = 1.0 - uvT.y;
  vec2 p = vMundo.xz;
  float da = max(length(fwidth(p)), 1e-4);                   // metros por píxel (antes de ramas)
  vec3 tipo = texture2D(uTipos, uvT).rgb;
  float suma = tipo.r + tipo.g + tipo.b;
  pesoProc = smoothstep(0.15, 0.6, suma);
  if (pesoProc <= 0.0) return;
  tipo /= max(suma, 1e-3);
  // Bordillo nítido: donde hay acera, asfalto y cemento se reparten por la distancia exacta al
  // borde de la calzada (bordillo.png) en vez de por tipos.png, que es borroso (0,5 m/px)
  float dBordillo = 9.0;
#ifdef CON_BORDILLO
  dBordillo = (texture2D(uBordillo, uvT).r * 255.0 - 128.0) / 127.0 * ${RANGO_BORDILLO_M.toFixed(1)};
  float conAcera = smoothstep(0.0, 0.04, tipo.g);
  float enCalzada = smoothstep(-0.6 * da, 0.6 * da, dBordillo);
  float rg = tipo.r + tipo.g;
  tipo.r = mix(tipo.r, rg * enCalzada, conAcera);
  tipo.g = mix(tipo.g, rg * (1.0 - enCalzada), conAcera);
  dBordillo = mix(9.0, dBordillo, conAcera);
#endif
  vec3 dir = texture2D(uDireccion, uvT).rgb;
  float th = 0.5 * atan(dir.g * 2.0 - 1.0, dir.r * 2.0 - 1.0);
  vec2 eje = vec2(cos(th), sin(th));
  vec2 lado = vec2(-eje.y, eje.x);
  float dEje = dir.b * 25.5;
  float s = dot(p, eje);                                     // metros a lo largo de la vía

  // --- Asfalto
  float arido = texture2D(uAsfalto, p / uMetros.x).r * 2.0;
  arido = mix(arido, texture2D(uAsfalto, p / (uMetros.x * 0.37) + 0.31).r * 2.0, 0.4);
  vec3 asf = uColAsfalto * max(1.0 + (arido - 1.0) * 1.8, 0.2);
  asf *= 0.92 + 0.16 * fbmS(p * 1.7);                        // textura a media distancia
  asf *= 0.85 + 0.3 * fbmS(p * 0.09);                        // parches y reasfaltados
  float parche = smoothstep(0.62, 0.66, fbmS(p * 0.05 + 11.0));
  asf *= 1.0 - 0.12 * parche;                                // parche más nuevo, más negro
  float rodada = smoothstep(0.5, 1.0, dEje) * (1.0 - smoothstep(2.2, 2.9, dEje));
  asf *= 1.0 - 0.07 * rodada;                                // pulido de las ruedas
  float bordeCalzada = dBordillo < 8.0 ? 1.0 - smoothstep(0.05, 0.7, dBordillo)   // junto al bordillo
                                       : 1.0 - smoothstep(0.55, 0.95, tipo.r + tipo.b);
  asf = mix(asf, asf * vec3(1.05, 1.0, 0.9) * 1.15, bordeCalzada * 0.6);  // polvo y arena
  // Grietas selladas con betún: pocas, finas (1 cm) y solo de cerca (a media distancia la
  // línea ocuparía el píxel entero y daría una red negra)
  float grieta = 1.0 - smoothstep(0.004, 0.014, bordeVoronoi(p / 3.2) * 3.2);   // metros al borde
  grieta *= smoothstep(0.72, 0.82, ruidoS(p * 0.12 + 4.0)) * (1.0 - smoothstep(0.006, 0.02, da));
  asf = mix(asf, uColAsfalto * 0.5, grieta * 0.6);

  // --- Cemento de la acera
  float grano = texture2D(uAsfalto, p / (uMetros.x * 1.7) + 0.7).r * 2.0;
  vec3 cem = uColAcera * (1.0 + (grano - 1.0) * 0.6);
  cem *= 0.9 + 0.18 * fbmS(p * 0.6 + 2.0);                   // manchas de fraguado
  cem *= 0.95 + 0.1 * fbmS(p * 3.0);
  cem *= 1.0 - 0.025 * ruidoS(vec2(dot(p, lado) * 40.0, s * 1.5));   // fratasado a lo ancho
  cem *= 1.0 - 0.18 * smoothstep(0.7, 0.85, fbmS(p * 0.35 + 7.0)) * ruidoS(p * 2.0);  // manchas
  float junta = 1.0 - smoothstep(0.01, 0.02 + da, abs(fract(s / 1.5 + 0.5) - 0.5) * 1.5);
  cem *= 1.0 - 0.5 * junta * (1.0 - smoothstep(0.03, 0.08, da));

  // --- Camino de tierra: color de la foto suavizado, grano, guijarros, rodadas y hierba
  // La bruma del vuelo lava la tierra: algo más cálida y saturada que la foto
  float luzB = dot(foto, vec3(0.2126, 0.7152, 0.0722));
  vec3 base = max(mix(vec3(luzB), foto, 1.35) * vec3(1.03, 0.98, 0.88), 0.0);
  float suelto = texture2D(uTierra, p / uMetros.z).r * 2.0;
  vec3 tie = base * max(1.0 + (suelto - 1.0) * 1.3, 0.2);
  tie *= 0.88 + 0.24 * fbmS(p * 0.4 + 9.0);
  float guijarro = smoothstep(0.84, 0.9, azarS(floor(p * 9.0))) * (1.0 - smoothstep(0.02, 0.05, da));
  tie = mix(tie, base * mix(0.7, 1.35, azarS(floor(p * 9.0) + 1.3)), guijarro * 0.7);
  float surco = smoothstep(0.4, 0.6, dEje) * (1.0 - smoothstep(0.95, 1.2, dEje));
  tie *= 1.0 - 0.22 * surco * (0.7 + 0.3 * ruidoS(vec2(s * 0.5, 1.0)));   // rodadas compactadas
  tie = mix(tie, tie * 1.12, (1.0 - smoothstep(0.0, 0.45, dEje)) * (1.0 - smoothstep(1.2, 1.5, dEje)));
  float hierba = (1.0 - smoothstep(0.15, 0.35, dEje)) * smoothstep(0.35, 0.65, fbmS(p * 1.3));
  hierba *= smoothstep(0.4, 0.7, ruidoS(vec2(s * 0.08, 3.0)));
  tie = mix(tie, vec3(0.16, 0.18, 0.08) * (0.8 + 0.4 * ruidoS(p * 7.0)), hierba * 0.55);
  float borde = 1.0 - smoothstep(1.3, 1.9, dEje);           // fuera de la caja del camino, hierba seca
  tie = mix(base * (0.95 + 0.1 * fbmS(p * 0.8)), tie, borde);

  sueloProc = asf * tipo.r + cem * tipo.g + tie * tipo.b;
}
`;

export function materialSuelo(mapa, nombre, detalle = null) {
  // Lambert negro + emisivo = la foto sin iluminar, pero con los datos de sombras disponibles
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, map: mapa, emissive: 0xffffff, emissiveMap: mapa, name: nombre });
  material.userData.esSuelo = true;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uEmisivo: LUZ_SUELO.emisivo, uFactorLuz: LUZ_SUELO.factor, uDifuso: LUZ_SUELO.difuso });
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uEmisivo;
        uniform float uFactorLuz, uDifuso;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        DETALLE_SUELO_COLOR
        diffuseColor.rgb *= uDifuso;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        DETALLE_SUELO_EMISIVO
        totalEmissiveRadiance *= uEmisivo;`);
    let pesoSombra = '0.0';
    if (detalle) {
      const { meta } = detalle;
      const col = meta.colores_srgb ?? {};
      Object.assign(shader.uniforms, {
        uTipos: { value: detalle.tipos },
        uDireccion: { value: detalle.direccion },
        uAsfalto: { value: detalle.asfalto },
        uBaldosa: { value: detalle.baldosa },
        uTierra: { value: detalle.tierra },
        uBordillo: { value: detalle.bordillo },
        uZona: { value: new THREE.Vector4(meta.x0, meta.z0, meta.columnas * meta.paso_m, meta.filas * meta.paso_m) },
        uMetros: { value: new THREE.Vector3(meta.metros_textura.asfalto, meta.metros_textura.baldosa, meta.metros_textura.tierra) },
        uColAsfalto: { value: colorSuelo(col.calzada ? col.calzada : ASFALTO_POR_DEFECTO, col.calzada ? AJUSTE.calzada : 1) },
        uColAcera: { value: colorSuelo(col.acera ? col.acera : CEMENTO_POR_DEFECTO, col.acera ? AJUSTE.acera : 1) },
      });
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          varying vec3 vMundo;`)
        .replace('#include <project_vertex>', `#include <project_vertex>
          vMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          ${detalle.bordillo ? '#define CON_BORDILLO' : ''}
          ${GLSL_SUELO}`)
        // La tierra toma el color de la foto muy suavizado (mip alto): sin lo borroso de cerca
        .replace('DETALLE_SUELO_COLOR', `calculaSuelo(texture(map, vMapUv, 5.0).rgb);
          diffuseColor.rgb = mix(diffuseColor.rgb, sueloProc, pesoProc);`)
        .replace('DETALLE_SUELO_EMISIVO', 'totalEmissiveRadiance = mix(totalEmissiveRadiance, sueloProc, pesoProc);');
      pesoSombra = 'pesoProc';
    } else {
      shader.fragmentShader = shader.fragmentShader
        .replace('DETALLE_SUELO_COLOR', '').replace('DETALLE_SUELO_EMISIVO', '');
    }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <shadowmap_pars_fragment>', `#include <shadowmap_pars_fragment>
        #include <shadowmask_pars_fragment>`)
      .replace('#include <opaque_fragment>', `
        {
          float luzFoto = dot(totalEmissiveRadiance, vec3(0.2126, 0.7152, 0.0722)) / max(uFactorLuz, 0.02);
          float soleado = mix(smoothstep(${LUZ_SOMBRA_PINTADA[0]}, ${LUZ_SOMBRA_PINTADA[1]}, luzFoto), 1.0, ${pesoSombra});
          float sombra = 1.0 - getShadowMask();
          outgoingLight *= 1.0 - ${FUERZA_SOMBRA.toFixed(3)} * min(uFactorLuz, 1.0) * sombra * soleado;
        }
        #include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => (detalle ? `suelo_procedural_v3${detalle.bordillo ? '_bordillo' : ''}` : 'suelo_ortofoto_dia');
  return material;
}

// Pone el suelo procedural a las mallas del terreno ya cargadas
export function aplicaDetalleSuelo(mallas, detalle) {
  if (!detalle) return;
  for (const m of mallas) {
    const anterior = m.material;
    m.material = materialSuelo(anterior.emissiveMap, anterior.name, detalle);
    anterior.dispose();
  }
}
