// Material del terreno: la ortofoto tal cual (sin luz, ya trae la del día del vuelo) más:
// - las sombras 3D del juego. Una sombra solo oscurece lo que en la foto está al sol: donde la
//   foto ya tiene su sombra pintada (coincide, porque el sol es el mismo) no se oscurece dos veces.
// - detalle de cerca (tools/11_suelo.py): grano de asfalto, baldosa en las aceras y tierra en
//   los caminos, multiplicado sobre el color de la foto y desvanecido con la distancia.
import * as THREE from 'three';

const FUERZA_SOMBRA = 0.55;                 // cuánto oscurece una sombra 3D el suelo soleado
const LUZ_SOMBRA_PINTADA = [0.035, 0.12];   // luminancia lineal: por debajo, ya es sombra en la foto
const DETALLE_HASTA_M = 45;

export async function cargaDetalleSuelo(ruta, renderer) {
  const meta = await fetch(`${ruta}suelo.json`).then((r) => (r.ok ? r.json() : null));
  if (!meta) return null;
  const cargador = new THREE.TextureLoader();
  const [tipos, asfalto, baldosa, tierra] = await Promise.all(
    ['tipos', 'asfalto', 'baldosa', 'tierra'].map((n) => cargador.loadAsync(`${ruta}${n}.png`)));
  const anisotropia = renderer.capabilities.getMaxAnisotropy();
  for (const t of [asfalto, baldosa, tierra]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = anisotropia;
  }
  return { meta, tipos, asfalto, baldosa, tierra };
}

export function materialSuelo(mapa, nombre, detalle = null) {
  // Lambert negro + emisivo = la foto sin iluminar, pero con los datos de sombras disponibles
  const material = new THREE.MeshLambertMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: mapa, name: nombre });
  material.onBeforeCompile = (shader) => {
    if (detalle) {
      const { meta } = detalle;
      Object.assign(shader.uniforms, {
        uTipos: { value: detalle.tipos },
        uAsfalto: { value: detalle.asfalto },
        uBaldosa: { value: detalle.baldosa },
        uTierra: { value: detalle.tierra },
        uZona: { value: new THREE.Vector4(meta.x0, meta.z0, meta.columnas * meta.paso_m, meta.filas * meta.paso_m) },
        uMetros: { value: new THREE.Vector3(meta.metros_textura.asfalto, meta.metros_textura.baldosa, meta.metros_textura.tierra) },
      });
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          varying vec3 vMundo;`)
        .replace('#include <project_vertex>', `#include <project_vertex>
          vMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vMundo;
          uniform sampler2D uTipos, uAsfalto, uBaldosa, uTierra;
          uniform vec4 uZona;
          uniform vec3 uMetros;`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          {
            float cerca = 1.0 - smoothstep(${(DETALLE_HASTA_M * 0.45).toFixed(1)}, ${DETALLE_HASTA_M.toFixed(1)}, distance(vMundo, cameraPosition));
            if (cerca > 0.0) {
              vec2 uvTipos = vec2((vMundo.x - uZona.x) / uZona.z, 1.0 - (vMundo.z - uZona.y) / uZona.w);
              vec3 tipo = texture2D(uTipos, uvTipos).rgb;
              float d = 1.0;
              d = mix(d, texture2D(uAsfalto, vMundo.xz / uMetros.x).r * 2.0, tipo.r);
              d = mix(d, texture2D(uBaldosa, vMundo.xz / uMetros.y).r * 2.0, tipo.g);
              d = mix(d, texture2D(uTierra, vMundo.xz / uMetros.z).r * 2.0, tipo.b);
              totalEmissiveRadiance *= mix(1.0, d, cerca);
            }
          }`);
    }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <shadowmap_pars_fragment>', `#include <shadowmap_pars_fragment>
        #include <shadowmask_pars_fragment>`)
      .replace('#include <opaque_fragment>', `
        {
          float luzFoto = dot(totalEmissiveRadiance, vec3(0.2126, 0.7152, 0.0722));
          float soleado = smoothstep(${LUZ_SOMBRA_PINTADA[0]}, ${LUZ_SOMBRA_PINTADA[1]}, luzFoto);
          float sombra = 1.0 - getShadowMask();
          outgoingLight *= 1.0 - ${FUERZA_SOMBRA.toFixed(3)} * sombra * soleado;
        }
        #include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => (detalle ? 'suelo_ortofoto_detalle' : 'suelo_ortofoto');
  return material;
}

// Pone el detalle de cerca a las mallas del terreno ya cargadas
export function aplicaDetalleSuelo(mallas, detalle) {
  if (!detalle) return;
  for (const m of mallas) {
    const anterior = m.material;
    m.material = materialSuelo(anterior.emissiveMap, anterior.name, detalle);
    anterior.dispose();
  }
}
