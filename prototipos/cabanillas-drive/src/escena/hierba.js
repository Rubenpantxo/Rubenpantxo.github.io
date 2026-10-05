// Césped, hierba y rastrojo en 3D alrededor de la cámara (tools/08b_vegetacion_baja.py).
// Mechones (tres tarjetas cruzadas) sembrados por celdas con la densidad del mapa y el color
// de la ortofoto en cada punto; sin luz propia, como el terreno, para que se fundan con él.
// Se desvanecen al acercarse al radio y se resiembran cuando la cámara se mueve.
import * as THREE from 'three';

const CELDA_M = 8;
const DENSIDAD_MIN = 0.3;   // por debajo, bordes y ruido del mapa: sin mechones sueltos en aceras
const CLASES = [
  // canal del mapa, mechones por m² a densidad plena, alto (m), ancho (m), textura
  { canal: 0, porM2: 2.6, alto: [0.25, 0.5], ancho: 0.75, textura: 'mechon_verde.png', brillo: 1.6 },
  { canal: 1, porM2: 0.5, alto: [0.3, 0.55], ancho: 0.6, textura: 'mechon_seco.png', brillo: 1.3 },
];

function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function pixeles(url) {
  const img = await new THREE.ImageLoader().loadAsync(url);
  const lienzo = document.createElement('canvas');
  lienzo.width = img.width;
  lienzo.height = img.height;
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height).data;
}

export async function cargaVegetacion(ruta) {
  const respuesta = await fetch(`${ruta}vegetacion.json`);
  if (!respuesta.ok) throw new Error(`No se pudo leer ${ruta}vegetacion.json`);
  const meta = await respuesta.json();
  const cargador = new THREE.TextureLoader();
  const [densidad, color, ...texturas] = await Promise.all([
    pixeles(`${ruta}densidad.jpg`), pixeles(`${ruta}color.jpg`),
    ...CLASES.map((c) => cargador.loadAsync(`${ruta}${c.textura}`)),
  ]);
  for (const t of texturas) t.colorSpace = THREE.SRGBColorSpace;
  return { meta, densidad, color, texturas };
}

// Tres tarjetas verticales cruzadas a 60°, base en y = 0, 1 × 1
function geometriaMechon() {
  const partes = [0, 1, 2].map((k) => new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0).rotateY((k * Math.PI) / 3));
  const g = new THREE.BufferGeometry();
  const pos = [], uv = [], ind = [];
  for (const p of partes) {
    const base = pos.length / 3;
    pos.push(...p.attributes.position.array);
    uv.push(...p.attributes.uv.array);
    ind.push(...Array.from(p.index.array, (i) => i + base));
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(ind);
  return g;
}

function materialMechon(textura, uniformes) {
  const material = new THREE.MeshBasicMaterial({ map: textura, alphaTest: 0.45, side: THREE.DoubleSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTiempo = uniformes.uTiempo;
    shader.uniforms.uCamara = uniformes.uCamara;
    shader.uniforms.uRadio = uniformes.uRadio;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTiempo;
        uniform vec3 uCamara;
        uniform float uRadio;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec3 base = vec3(instanceMatrix[3]);
          // Desvanecer encogiendo hacia el suelo en el último cuarto del radio
          float d = distance(base.xz, uCamara.xz);
          transformed.y *= 1.0 - smoothstep(uRadio * 0.7, uRadio, d);
          float fase = base.x * 0.7 + base.z * 0.9;
          float k = transformed.y * transformed.y;
          transformed.x += sin(uTiempo * 1.7 + fase) * 0.18 * k;
          transformed.z += cos(uTiempo * 1.3 + fase * 1.2) * 0.12 * k;
        }`);
    // Base algo más oscura: la hierba se cierra y hace sombra abajo
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        diffuseColor.rgb *= mix(0.55, 1.0, smoothstep(0.0, 0.6, vMapUv.y));`);
  };
  material.customProgramCacheKey = () => 'mechon_hierba';
  return material;
}

export function creaHierba(vegetacion, terreno, { radio = 60, maxPorClase = 40000 } = {}) {
  const { meta, densidad, color, texturas } = vegetacion;
  const uniformes = { uTiempo: { value: 0 }, uCamara: { value: new THREE.Vector3() }, uRadio: { value: radio } };
  const raiz = new THREE.Group();
  raiz.name = 'hierba';
  const geometria = geometriaMechon();
  const mallas = CLASES.map((c, k) => {
    const m = new THREE.InstancedMesh(geometria, materialMechon(texturas[k], uniformes), maxPorClase);
    m.name = `hierba_${c.textura.replace('.png', '')}`;
    m.frustumCulled = false;
    m.count = 0;
    raiz.add(m);
    return m;
  });

  const muestra = (datos, x, z, canal) => {
    const c = Math.floor((x - meta.x0) / meta.paso_m);
    const f = Math.floor((z - meta.z0) / meta.paso_m);
    if (c < 0 || f < 0 || c >= meta.columnas || f >= meta.filas) return 0;
    return datos[(f * meta.columnas + c) * 4 + canal];
  };

  // Mechones de una celda: [x, y, z, giro, alto, ancho, r, g, b] por clase (se guardan)
  const cache = new Map();
  const colorLineal = new THREE.Color();
  const hsl = {};
  function celda(ci, cj) {
    const clave = `${ci},${cj}`;
    let lista = cache.get(clave);
    if (lista) return lista;
    lista = CLASES.map((clase, k) => {
      const r = azar((ci * 73856093) ^ (cj * 19349663) ^ (k * 83492791));
      const salida = [];
      const intentos = Math.round(CELDA_M * CELDA_M * clase.porM2);
      for (let n = 0; n < intentos; n++) {
        const x = (ci + r()) * CELDA_M;
        const z = (cj + r()) * CELDA_M;
        const d = muestra(densidad, x, z, clase.canal) / 255;
        const giro = r(), altoR = r(), anchoR = r(), prueba = r();
        if (d < DENSIDAD_MIN || prueba >= d) continue;
        colorLineal.setRGB(muestra(color, x, z, 0) / 255, muestra(color, x, z, 1) / 255, muestra(color, x, z, 2) / 255,
          THREE.SRGBColorSpace).multiplyScalar(clase.brillo * (0.85 + 0.3 * anchoR));
        // La foto aérea apaga el color (bruma): algo más de saturación a ras de suelo
        colorLineal.getHSL(hsl);
        colorLineal.setHSL(hsl.h, Math.min(1, hsl.s * 1.4), hsl.l);
        const alto = THREE.MathUtils.lerp(clase.alto[0], clase.alto[1], altoR) * (0.6 + 0.4 * d);
        salida.push(x, terreno.alturaEn(x, z) - 0.03, z, giro * Math.PI * 2, alto, clase.ancho * (0.8 + 0.4 * anchoR),
          colorLineal.r, colorLineal.g, colorLineal.b);
      }
      return salida;
    });
    cache.set(clave, lista);
    if (cache.size > 3000) cache.delete(cache.keys().next().value);
    return lista;
  }

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const eje = new THREE.Vector3(0, 1, 0);
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const c = new THREE.Color();
  const ultima = new THREE.Vector3(Infinity, 0, 0);
  let triangulos = 0;

  function actualiza(posicionCamara) {
    uniformes.uCamara.value.copy(posicionCamara);
    if (ultima.distanceToSquared(posicionCamara) < 16) return triangulos;
    ultima.copy(posicionCamara);
    const cuenta = mallas.map(() => 0);
    const r2 = radio * radio;
    const i0 = Math.floor((posicionCamara.x - radio) / CELDA_M), i1 = Math.floor((posicionCamara.x + radio) / CELDA_M);
    const j0 = Math.floor((posicionCamara.z - radio) / CELDA_M), j1 = Math.floor((posicionCamara.z + radio) / CELDA_M);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const cx = (i + 0.5) * CELDA_M - posicionCamara.x, cz = (j + 0.5) * CELDA_M - posicionCamara.z;
        if (cx * cx + cz * cz > (radio + CELDA_M) ** 2) continue;
        celda(i, j).forEach((lista, k) => {
          const malla = mallas[k];
          for (let n = 0; n < lista.length; n += 9) {
            if (cuenta[k] >= maxPorClase) return;
            const dx = lista[n] - posicionCamara.x, dz = lista[n + 2] - posicionCamara.z;
            if (dx * dx + dz * dz > r2) continue;
            q.setFromAxisAngle(eje, lista[n + 3]);
            m4.compose(p.set(lista[n], lista[n + 1], lista[n + 2]), q, s.set(lista[n + 5], lista[n + 4], lista[n + 5]));
            malla.setMatrixAt(cuenta[k], m4);
            malla.setColorAt(cuenta[k], c.setRGB(lista[n + 6], lista[n + 7], lista[n + 8]));
            cuenta[k]++;
          }
        });
      }
    }
    triangulos = 0;
    mallas.forEach((malla, k) => {
      malla.count = cuenta[k];
      malla.instanceMatrix.needsUpdate = true;
      if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
      triangulos += cuenta[k] * 6;
    });
    return triangulos;
  }

  return {
    raiz,
    actualiza,
    avanza(dt) { uniformes.uTiempo.value += dt; },
    get triangulos() { return triangulos; },
    get mechones() { return mallas.map((m) => m.count); },
  };
}
