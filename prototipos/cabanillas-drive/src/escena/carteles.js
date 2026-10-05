// Carteles con datos de OSM:
// - lugares (puntos de interés con nombre): rótulo flotante con icono sobre su sitio
// - placas de calle: el nombre de cada calle en la fachada de la esquina, en cada cruce
//   (todas en una malla instanciada con un atlas de textos: una llamada de dibujo)
import * as THREE from 'three';

const ICONOS = {
  place_of_worship: '⛪', townhall: '🏛️', school: '🏫', clinic: '🏥', hospital: '🏥', library: '📚',
  community_centre: '🎭', bank: '🏦', fuel: '⛽', bus_station: '🚌', pharmacy: '💊', post_office: '📮',
  fountain: '⛲', drinking_water: '🚰', sports_centre: '🏟️', restaurant: '🍽️', bar: '🍺', cafe: '☕',
};
const PLACA = { anchoM: 1.25, altoM: 0.32, alturaM: 3.1, separacionM: 7, distanciaFachadaM: 3.2 };
const FUENTE = '"Segoe UI", system-ui, -apple-system, sans-serif';

function lineasDe(geometria) {
  if (geometria.type === 'LineString') return [geometria.coordinates];
  if (geometria.type === 'MultiLineString') return geometria.coordinates;
  return [];
}

// --- Rótulo de un lugar (sprite con su textura)
function rotulo(nombre, tipo) {
  const icono = ICONOS[tipo] ?? '📍';
  const lienzo = document.createElement('canvas');
  const ctx = lienzo.getContext('2d');
  const alto = 96;
  ctx.font = `600 44px ${FUENTE}`;
  const ancho = Math.ceil(ctx.measureText(nombre).width) + 120;
  lienzo.width = ancho;
  lienzo.height = alto + 24;
  ctx.font = `600 44px ${FUENTE}`;
  ctx.fillStyle = 'rgba(16, 22, 30, 0.86)';
  ctx.beginPath();
  ctx.roundRect(2, 2, ancho - 4, alto - 4, 26);
  ctx.fill();
  ctx.strokeStyle = '#ffd54a';
  ctx.lineWidth = 4;
  ctx.stroke();
  // Pico hacia abajo, señalando el sitio
  ctx.beginPath();
  ctx.moveTo(ancho / 2 - 16, alto - 4);
  ctx.lineTo(ancho / 2, alto + 20);
  ctx.lineTo(ancho / 2 + 16, alto - 4);
  ctx.fillStyle = 'rgba(16, 22, 30, 0.86)';
  ctx.fill();
  ctx.textBaseline = 'middle';
  ctx.font = `44px ${FUENTE}`;
  ctx.fillText(icono, 22, alto / 2 + 2);
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 44px ${FUENTE}`;
  ctx.fillText(nombre, 86, alto / 2 + 2);
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;
  const material = new THREE.SpriteMaterial({ map: textura, transparent: true, depthWrite: false, fog: true });
  const sprite = new THREE.Sprite(material);
  const escala = 0.028;                      // m por px: unos 2–3,5 m de ancho según el nombre
  sprite.scale.set(lienzo.width * escala, lienzo.height * escala, 1);
  sprite.center.set(0.5, 0);
  return sprite;
}

// --- Atlas con los nombres de las calles (una casilla de 512×128 por nombre)
function atlasPlacas(nombres) {
  const cw = 512;
  const ch = 128;
  const columnas = 4;
  const filas = Math.ceil(nombres.length / columnas);
  const lienzo = document.createElement('canvas');
  lienzo.width = cw * columnas;
  lienzo.height = THREE.MathUtils.ceilPowerOfTwo(ch * filas);
  const ctx = lienzo.getContext('2d');
  const casillas = new Map();
  nombres.forEach((nombre, i) => {
    const x = (i % columnas) * cw;
    const y = Math.floor(i / columnas) * ch;
    ctx.fillStyle = '#f6f4ee';
    ctx.fillRect(x, y, cw, ch);
    ctx.strokeStyle = '#1f3d6b';
    ctx.lineWidth = 10;
    ctx.strokeRect(x + 9, y + 9, cw - 18, ch - 18);
    ctx.fillStyle = '#1f3d6b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let tam = 52;
    do {
      ctx.font = `700 ${tam}px ${FUENTE}`;
      tam -= 2;
    } while (ctx.measureText(nombre).width > cw - 56 && tam > 18);
    ctx.fillText(nombre, x + cw / 2, y + ch / 2 + 3);
    casillas.set(nombre, [x / lienzo.width, 1 - (y + ch) / lienzo.height]);
  });
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 8;
  return { textura, casillas, tam: new THREE.Vector2(cw / lienzo.width, ch / lienzo.height) };
}

// Índice de las paredes de los edificios (lados de las huellas) por celdas de 20 m
function indiceParedes(edificios) {
  const celda = 20;
  const mapa = new Map();
  for (const f of edificios.features) {
    const { base_y: base, height } = f.properties;
    for (const anillo of f.geometry.coordinates) {
      for (let i = 0; i + 1 < anillo.length; i++) {
        const [x0, z0] = anillo[i];
        const [x1, z1] = anillo[i + 1];
        if (Math.hypot(x1 - x0, z1 - z0) < 1.2) continue;
        const pared = { x0, z0, x1, z1, base, alto: height };
        const cx0 = Math.floor(Math.min(x0, x1) / celda); const cx1 = Math.floor(Math.max(x0, x1) / celda);
        const cz0 = Math.floor(Math.min(z0, z1) / celda); const cz1 = Math.floor(Math.max(z0, z1) / celda);
        for (let a = cx0; a <= cx1; a++) {
          for (let b = cz0; b <= cz1; b++) {
            const k = `${a},${b}`;
            if (!mapa.has(k)) mapa.set(k, []);
            mapa.get(k).push(pared);
          }
        }
      }
    }
  }
  return (x, z) => mapa.get(`${Math.floor(x / celda)},${Math.floor(z / celda)}`) ?? [];
}

export function creaCarteles({ poi, calles, edificios, terreno }) {
  const raiz = new THREE.Group();
  raiz.name = 'carteles';
  const paredesCerca = indiceParedes(edificios);

  // ¿Sobre qué edificio cae un punto? (para poner el rótulo por encima del tejado)
  const alturaTecho = (x, z) => {
    let techo = terreno.alturaEn(x, z);
    for (const f of edificios.features) {
      const anillo = f.geometry.coordinates[0];
      let dentro = false;
      for (let i = 0, k = anillo.length - 1; i < anillo.length; k = i++) {
        const [xi, zi] = anillo[i];
        const [xk, zk] = anillo[k];
        if ((zi > z) !== (zk > z) && x < ((xk - xi) * (z - zi)) / (zk - zi) + xi) dentro = !dentro;
      }
      if (dentro) techo = Math.max(techo, f.properties.base_y + f.properties.height);
    }
    return techo;
  };

  // --- Lugares
  const lugares = [];
  for (const f of poi?.features ?? []) {
    const { nombre, tipo } = f.properties;
    if (!nombre || f.geometry.type !== 'Point') continue;
    const [x, z] = f.geometry.coordinates;
    const y = Math.max(alturaTecho(x, z) + 2.5, terreno.alturaEn(x, z) + 7);
    const sprite = rotulo(nombre, tipo);
    sprite.position.set(x, y, z);
    sprite.name = `lugar_${nombre}`;
    raiz.add(sprite);
    lugares.push({ nombre, tipo, icono: ICONOS[tipo] ?? '📍', x, z, sprite });
  }

  // --- Placas de calle: en cada cruce, por cada calle con nombre que sale de él, una placa en
  // la fachada de su derecha unos metros calle adentro (si hay fachada; si no, ninguna)
  const incidencias = new Map();          // vértice → [{ nombre, dx, dz }]
  const clave = (x, z) => `${Math.round(x * 10)},${Math.round(z * 10)}`;
  for (const f of calles.features) {
    const nombre = f.properties.nombre;
    for (const linea of lineasDe(f.geometry)) {
      linea.forEach(([x, z], i) => {
        const k = clave(x, z);
        if (!incidencias.has(k)) incidencias.set(k, { x, z, salidas: [] });
        const v = incidencias.get(k);
        for (const j of [i - 1, i + 1]) {
          if (j < 0 || j >= linea.length) continue;
          const dx = linea[j][0] - x;
          const dz = linea[j][1] - z;
          const largo = Math.hypot(dx, dz);
          if (largo > 0.5) v.salidas.push({ nombre, dx: dx / largo, dz: dz / largo, largo });
        }
      });
    }
  }
  const placas = [];
  for (const v of incidencias.values()) {
    if (v.salidas.length < 3) continue;                 // solo cruces
    for (const s of v.salidas) {
      if (!s.nombre || s.nombre.length < 4) continue;
      const avance = Math.min(PLACA.separacionM, s.largo * 0.6);
      // Lado derecho de la calle según se entra en ella desde el cruce
      const px = v.x + s.dx * avance - s.dz * PLACA.distanciaFachadaM;
      const pz = v.z + s.dz * avance + s.dx * PLACA.distanciaFachadaM;
      // Pared más cercana, paralela a la calle y a menos de 3 m
      let mejor = null;
      for (const p of paredesCerca(px, pz)) {
        const ex = p.x1 - p.x0;
        const ez = p.z1 - p.z0;
        const l2 = ex * ex + ez * ez;
        const t = THREE.MathUtils.clamp(((px - p.x0) * ex + (pz - p.z0) * ez) / l2, 0.1, 0.9);
        const qx = p.x0 + ex * t;
        const qz = p.z0 + ez * t;
        const d = Math.hypot(px - qx, pz - qz);
        const paralela = Math.abs((ex * s.dx + ez * s.dz) / Math.sqrt(l2));
        if (d < 3 && paralela > 0.8 && (!mejor || d < mejor.d)) mejor = { d, qx, qz, ex, ez, l: Math.sqrt(l2), p };
      }
      if (!mejor) continue;
      // Normal de la pared hacia la calle
      let nx = mejor.ez / mejor.l;
      let nz = -mejor.ex / mejor.l;
      if ((v.x - mejor.qx) * nx + (v.z - mejor.qz) * nz < 0) { nx = -nx; nz = -nz; }
      if (placas.some((o) => o.nombre === s.nombre && Math.hypot(o.x - mejor.qx, o.z - mejor.qz) < 25)) continue;
      const suelo = terreno.alturaEn(mejor.qx, mejor.qz);
      const y = Math.min(suelo + PLACA.alturaM, mejor.p.base + mejor.p.alto - 0.4);
      placas.push({ nombre: s.nombre, x: mejor.qx + nx * 0.06, y, z: mejor.qz + nz * 0.06, nx, nz });
    }
  }

  let mallaPlacas = null;
  if (placas.length) {
    const nombres = [...new Set(placas.map((p) => p.nombre))];
    const atlas = atlasPlacas(nombres);
    const geometria = new THREE.PlaneGeometry(PLACA.anchoM, PLACA.altoM);
    geometria.setAttribute('aCasilla', new THREE.InstancedBufferAttribute(new Float32Array(placas.length * 2), 2));
    const material = new THREE.MeshLambertMaterial({ map: atlas.textura });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTamCasilla = { value: atlas.tam };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          attribute vec2 aCasilla;
          uniform vec2 uTamCasilla;`)
        .replace('#include <uv_vertex>', `#include <uv_vertex>
          vMapUv = vMapUv * uTamCasilla + aCasilla;`);
    };
    material.customProgramCacheKey = () => 'placas_calle';
    mallaPlacas = new THREE.InstancedMesh(geometria, material, placas.length);
    mallaPlacas.name = 'placas_calle';
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const casillas = geometria.attributes.aCasilla;
    placas.forEach((p, i) => {
      // El plano mira a +Z: girarlo para que mire a la calle (normal de la pared)
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(p.nx, p.nz));
      m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(1, 1, 1));
      mallaPlacas.setMatrixAt(i, m);
      const [u, w] = atlas.casillas.get(p.nombre);
      casillas.setXY(i, u, w);
    });
    mallaPlacas.computeBoundingSphere();
    raiz.add(mallaPlacas);
  }

  // Los rótulos de lugares se desvanecen de lejos (y no tapan el horizonte)
  function actualiza(posicionCamara) {
    for (const l of lugares) {
      const d = Math.hypot(l.x - posicionCamara.x, l.z - posicionCamara.z);
      const opacidad = THREE.MathUtils.clamp((420 - d) / 120, 0, 1);
      l.sprite.visible = opacidad > 0.01;
      l.sprite.material.opacity = opacidad;
    }
  }

  return { raiz, lugares, placas: placas.length, actualiza };
}
