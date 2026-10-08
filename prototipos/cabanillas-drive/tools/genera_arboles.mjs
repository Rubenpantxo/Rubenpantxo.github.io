// Paso R1.2b — Modelos de árbol del juego.
//
// Frondosas, pinos, cipreses y chopos con EZ-Tree (@dgreenheck/ez-tree, MIT), recortados a
// un presupuesto de triángulos; palmeras construidas aquí (tronco + hojas pinnadas). Todas
// se normalizan a 1 m de alto con la base del tronco en el origen: el juego las escala a la
// altura y al radio de copa medidos en el LiDAR (public/assets/arboles.json).
//
// Requiere tools/texturas_arboles.py. Salidas:
//   data/processed/arboles_raw.glb
//   public/assets/arboles/arboles.glb        (meshopt + WebP)
//   public/assets/arboles/arboles_modelos.json
// Uso: npm run arboles
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// EZ-Tree carga sus propias texturas con el ImageLoader de three al importarse. En Node basta
// un documento falso: aquí se usan las texturas preparadas por texturas_arboles.py.
const imagenFalsa = () => ({ addEventListener() {}, removeEventListener() {}, setAttribute() {}, style: {} });
globalThis.document ??= { createElementNS: imagenFalsa, createElement: imagenFalsa };
const THREE = await import('three');
const { Tree, TreePreset } = await import('@dgreenheck/ez-tree');
const { Document, NodeIO } = await import('@gltf-transform/core');

const raiz = resolve(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(join(raiz, 'config.json'), 'utf8'));
const procesados = join(raiz, config.processed_dir ?? 'data/processed');
const dirTexturas = join(procesados, 'arboles_tex');
const destino = join(raiz, config.assets_dir ?? 'public/assets', 'arboles');

const TRIANGULOS_MAX = 3500;

// Cada variante: preset de EZ-Tree de partida + cambios. «hojas» (racimos) y «corteza» son las
// texturas de arboles_tex; «tinte» multiplica el color de la hoja.
const VARIANTES = [
  // Frondosas de calle, plaza y jardín (plátano, morera, olmo, almez…): copa redonda y densa
  { id: 'frondosa_a', tipo: 'frondosa', preset: 'Oak Medium', hojas: 'racimo_oak', corteza: 'oak', tinte: 0xb4c49c,
    cambios: { seed: 4101, branch: { children: { 0: 5, 1: 3, 2: 2 }, start: { 1: 0.5 },
      sections: { 0: 5, 1: 3, 2: 2, 3: 1 }, segments: { 0: 6, 1: 4, 2: 3, 3: 3 } },
      leaves: { count: 4, size: 9, sizeVariance: 0.3, angle: 50 } } },
  { id: 'frondosa_b', tipo: 'frondosa', preset: 'Ash Medium', hojas: 'racimo_ash', corteza: 'oak', tinte: 0xc4d0a8,
    cambios: { seed: 4202, branch: { children: { 0: 6, 1: 3, 2: 2 }, start: { 1: 0.4 },
      sections: { 0: 5, 1: 3, 2: 2, 3: 1 }, segments: { 0: 6, 1: 4, 2: 3, 3: 3 } },
      leaves: { count: 4, size: 9, sizeVariance: 0.3 } } },
  // Árbol pequeño o frutal de huerta (olivo, almendro, granado…)
  { id: 'frondosa_baja', tipo: 'frondosa', preset: 'Oak Small', hojas: 'racimo_oak', corteza: 'oak', tinte: 0x9cac8c,
    cambios: { seed: 4303, branch: { sections: { 0: 6, 1: 3, 2: 2, 3: 1 }, segments: { 0: 6, 1: 4, 2: 3, 3: 3 } },
      leaves: { count: 4, size: 5, sizeVariance: 0.3 } } },
  // Pino carrasco: tronco limpio y copa irregular aparasolada
  { id: 'pino_a', tipo: 'conifera', preset: 'Ash Medium', hojas: 'racimo_pine', corteza: 'pine', tinte: 0xb0bca0,
    cambios: { seed: 5101, bark: { textureScale: { x: 1, y: 2 } },
      branch: { angle: { 1: 40, 2: 55, 3: 50 }, children: { 0: 6, 1: 3, 2: 2 }, start: { 1: 0.5, 2: 0.2, 3: 0 },
        sections: { 0: 5, 1: 3, 2: 2, 3: 1 }, segments: { 0: 6, 1: 4, 2: 3, 3: 3 },
        gnarliness: { 0: 0.06, 1: 0.3, 2: 0.25, 3: 0.1 } },
      leaves: { count: 4, size: 8, sizeVariance: 0.3, angle: 30 } } },
  { id: 'pino_b', tipo: 'conifera', preset: 'Oak Medium', hojas: 'racimo_pine', corteza: 'pine', tinte: 0xa8b498,
    cambios: { seed: 5202, bark: { textureScale: { x: 1, y: 2 } },
      branch: { children: { 0: 5, 1: 3, 2: 2 }, start: { 1: 0.55 }, sections: { 0: 5, 1: 3, 2: 2, 3: 1 },
        segments: { 0: 6, 1: 4, 2: 3, 3: 3 } },
      leaves: { count: 4, size: 8.5, sizeVariance: 0.3, angle: 30 } } },
  // Ciprés: columna estrecha y oscura
  { id: 'cipres', tipo: 'cipres', preset: 'Pine Medium', hojas: 'racimo_pine', corteza: 'pine', tinte: 0x7c8c6c,
    cambios: { seed: 6101, branch: { children: { 0: 40 }, angle: { 1: 30 }, length: { 0: 50, 1: 6 },
      sections: { 0: 8, 1: 2 }, segments: { 0: 6, 1: 3 }, start: { 1: 0.05 } },
      leaves: { count: 4, size: 5.5, sizeVariance: 0.25, angle: 15 } } },
  // Chopo: alto y estrecho, corteza clara
  { id: 'chopo', tipo: 'chopo', preset: 'Aspen Large', hojas: 'racimo_ash', corteza: 'birch', tinte: 0xc8d8b0,
    cambios: { seed: 7101, branch: { angle: { 1: 28, 2: 40 }, children: { 0: 14, 1: 4 },
      sections: { 0: 7, 1: 3, 2: 2 }, segments: { 0: 6, 1: 4, 2: 3 } },
      leaves: { count: 4, size: 8, sizeVariance: 0.3 } } },
  // Palmeras (tipo Phoenix): construidas por creaPalmera()
  { id: 'palmera_a', tipo: 'palmera', palmera: { semilla: 11, hojas: 22, troncoAlto: 0.7, largoHoja: 0.5, curva: 0.05 } },
  { id: 'palmera_b', tipo: 'palmera', palmera: { semilla: 23, hojas: 18, troncoAlto: 0.62, largoHoja: 0.55, curva: -0.03 } },
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

function mezcla(destino, origen) {
  for (const [k, v] of Object.entries(origen)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) mezcla(destino[k] ??= {}, v);
    else destino[k] = v;
  }
  return destino;
}

const triangulos = (g) => g.index.count / 3;

// Árbol de EZ-Tree dentro del presupuesto: si se pasa, menos hojas y más grandes
function arbolEzTree(variante) {
  const opciones = mezcla(structuredClone(TreePreset[variante.preset]), variante.cambios);
  const arbol = new Tree();
  for (let intento = 0; intento < 12; intento++) {
    arbol.options.copy(opciones);
    arbol.generate();
    const total = triangulos(arbol.branchesMesh.geometry) + triangulos(arbol.leavesMesh.geometry);
    if (total <= TRIANGULOS_MAX || opciones.leaves.count <= 3) break;
    const n = opciones.leaves.count;
    opciones.leaves.count = n - 1;
    opciones.leaves.size *= Math.sqrt(n / (n - 1));
  }
  const tronco = arbol.branchesMesh.geometry;
  // La textura de corteza se repite según textureScale (EZ-Tree lo hace con texture.repeat)
  const escala = opciones.bark.textureScale ?? { x: 1, y: 1 };
  const uv = tronco.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * escala.x, uv.getY(i) / escala.y);
  return { tronco, hojas: arbol.leavesMesh.geometry };
}

// Palmera: tronco anillado algo curvo y una corona de hojas pinnadas en V que se arquean
function creaPalmera({ semilla, hojas: nHojas, troncoAlto, largoHoja, curva }) {
  const r = azar(semilla);
  const pos = [], nor = [], uvs = [], ind = [];
  // Tronco (alto total ≈ 1)
  const secciones = 12, lados = 9;
  const radio = (t) => 0.034 * (1 - 0.25 * t) + 0.012 * Math.max(0, 1 - t * 6);   // ensanche en la base
  const eje = (t) => new THREE.Vector3(curva * t * t, t * troncoAlto, 0);
  for (let i = 0; i <= secciones; i++) {
    const t = i / secciones;
    const c = eje(t);
    const anillo = 1 + 0.06 * Math.sin(t * 60);       // relieve de los anillos
    for (let j = 0; j <= lados; j++) {
      const a = (j / lados) * Math.PI * 2;
      const n = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      pos.push(...c.clone().addScaledVector(n, radio(t) * anillo).toArray());
      nor.push(...n.toArray());
      uvs.push(j / lados, (t * troncoAlto) / 0.22);
    }
  }
  for (let i = 0; i < secciones; i++) {
    for (let j = 0; j < lados; j++) {
      const a = i * (lados + 1) + j, b = a + lados + 1;
      ind.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const tronco = geometria(pos, nor, uvs, ind);

  // Hojas
  const hp = [], hn = [], hu = [], hi = [];
  const cima = eje(1);
  const segmentos = 8;
  const arriba = new THREE.Vector3(0, 1, 0);
  for (let k = 0; k < nHojas; k++) {
    const azimut = k * 2.39996 + r() * 0.4;              // ángulo áureo: reparto sin huecos
    const edad = k / (nHojas - 1);                       // 0 = joven (alta), 1 = vieja (caída)
    const elevacion = THREE.MathUtils.degToRad(62 - 72 * edad + (r() - 0.5) * 14);
    const largo = largoHoja * (0.85 + 0.25 * r()) * (1 - 0.15 * (1 - edad));
    const dir = new THREE.Vector3(Math.cos(azimut) * Math.cos(elevacion), Math.sin(elevacion),
      Math.sin(azimut) * Math.cos(elevacion));
    const lado = new THREE.Vector3().crossVectors(arriba, dir).normalize();
    const caida = 0.22 + 0.3 * edad;                     // cuánto se arquea hacia abajo
    const pliegue = THREE.MathUtils.degToRad(28);        // hoja en V
    const ancho = largo * 0.5;
    const base = hp.length / 3;
    for (let s = 0; s <= segmentos; s++) {
      const t = s / segmentos;
      const p = cima.clone().addScaledVector(dir, largo * t).addScaledVector(arriba, -caida * largo * t * t);
      const tangente = dir.clone().addScaledVector(arriba, -2 * caida * t).normalize();
      const normal = new THREE.Vector3().crossVectors(lado, tangente).normalize();
      for (const signo of [-1, 0, 1]) {
        const v = p.clone();
        if (signo) v.addScaledVector(lado, signo * Math.cos(pliegue) * ancho / 2).addScaledVector(normal, -Math.sin(pliegue) * ancho / 2);
        hp.push(...v.toArray());
        hn.push(...normal.toArray());
        hu.push(t, 0.5 + signo * 0.5);
      }
    }
    for (let s = 0; s < segmentos; s++) {
      const a = base + s * 3, b = a + 3;
      hi.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
    }
  }
  return { tronco, hojas: geometria(hp, hn, hu, hi) };
}

function geometria(pos, nor, uvs, ind) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(ind);
  return g;
}

// Alto 1 con la base en el origen; normales de las hojas hacia fuera de la copa (iluminación
// de volumen en vez de tarjetas planas)
function normaliza({ tronco, hojas }, esPalmera) {
  const caja = new THREE.Box3().setFromBufferAttribute(tronco.attributes.position)
    .union(new THREE.Box3().setFromBufferAttribute(hojas.attributes.position));
  const s = 1 / caja.max.y;
  tronco.scale(s, s, s);
  hojas.scale(s, s, s);
  const p = hojas.attributes.position;
  const centro = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) centro.add(new THREE.Vector3().fromBufferAttribute(p, i));
  centro.divideScalar(p.count);
  if (esPalmera) centro.y -= 0.08;
  const n = hojas.attributes.normal;
  const v = new THREE.Vector3();
  const radial = [];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    radial.push(Math.hypot(v.x, v.z));
    const hacia = v.clone().sub(centro).normalize();
    const original = new THREE.Vector3().fromBufferAttribute(n, i);
    const mezcla = esPalmera ? 0.5 : 0.8;
    hacia.multiplyScalar(mezcla).addScaledVector(original, 1 - mezcla).normalize();
    n.setXYZ(i, hacia.x, hacia.y, hacia.z);
  }
  radial.sort((a, b) => a - b);
  const pt = tronco.attributes.position;
  let radioTronco = 0;
  for (let i = 0; i < pt.count; i++) if (pt.getY(i) < 0.02) radioTronco = Math.max(radioTronco, Math.hypot(pt.getX(i), pt.getZ(i)));
  let copaBase = 1;
  for (let i = 0; i < p.count; i++) copaBase = Math.min(copaBase, p.getY(i));
  return {
    radio: radial[Math.floor(radial.length * 0.95)],
    radioTronco: Math.max(radioTronco, 0.01),
    copaBase,
  };
}

function aMalla(doc, buffer, nombre, g, material) {
  const prim = doc.createPrimitive().setMaterial(material);
  const acc = (tipo, array) => doc.createAccessor().setType(tipo).setArray(array).setBuffer(buffer);
  prim.setAttribute('POSITION', acc('VEC3', new Float32Array(g.attributes.position.array)));
  prim.setAttribute('NORMAL', acc('VEC3', new Float32Array(g.attributes.normal.array)));
  prim.setAttribute('TEXCOORD_0', acc('VEC2', new Float32Array(g.attributes.uv.array)));
  prim.setIndices(acc('SCALAR', new Uint32Array(g.index.array)));
  return doc.createMesh(nombre).addPrimitive(prim);
}

const doc = new Document();
const buffer = doc.createBuffer();
const escena = doc.createScene('arboles');
const texturas = new Map();
const textura = (archivo) => {
  if (!texturas.has(archivo)) {
    texturas.set(archivo, doc.createTexture(archivo).setImage(readFileSync(join(dirTexturas, archivo)))
      .setMimeType(archivo.endsWith('.png') ? 'image/png' : 'image/jpeg'));
  }
  return texturas.get(archivo);
};
const materiales = new Map();
const materialCorteza = (c) => {
  if (!materiales.has(c)) {
    materiales.set(c, doc.createMaterial(`corteza_${c}`).setBaseColorTexture(textura(`corteza_${c}.jpg`))
      .setNormalTexture(textura(`corteza_${c}_normal.png`)).setRoughnessFactor(0.95).setMetallicFactor(0));
  }
  return materiales.get(c);
};
const materialHojas = (v, archivo, tinte) => {
  const c = new THREE.Color(tinte ?? 0xffffff);
  return doc.createMaterial(`hojas_${v}`).setBaseColorTexture(textura(archivo))
    .setBaseColorFactor([c.r, c.g, c.b, 1]).setAlphaMode('MASK').setAlphaCutoff(0.5).setDoubleSided(true)
    .setRoughnessFactor(0.85).setMetallicFactor(0);
};

const manifiesto = { variantes: {}, porTipo: {} };
for (const v of VARIANTES) {
  const esPalmera = Boolean(v.palmera);
  const geo = esPalmera ? creaPalmera(v.palmera) : arbolEzTree(v);
  const medidas = normaliza(geo, esPalmera);
  const tris = { tronco: triangulos(geo.tronco), hojas: triangulos(geo.hojas) };
  const nodo = doc.createNode(v.id);
  const tronco = aMalla(doc, buffer, `${v.id}_tronco`, geo.tronco, materialCorteza(esPalmera ? 'palmera' : v.corteza));
  const hojas = aMalla(doc, buffer, `${v.id}_hojas`, geo.hojas,
    materialHojas(v.id, esPalmera ? 'hoja_palmera.png' : `${v.hojas}.png`, v.tinte));
  nodo.addChild(doc.createNode(`${v.id}_tronco`).setMesh(tronco));
  nodo.addChild(doc.createNode(`${v.id}_hojas`).setMesh(hojas));
  escena.addChild(nodo);
  manifiesto.variantes[v.id] = { tipo: v.tipo, ...Object.fromEntries(Object.entries(medidas).map(([k, x]) => [k, +x.toFixed(4)])),
    triangulos: tris.tronco + tris.hojas };
  (manifiesto.porTipo[v.tipo] ??= []).push(v.id);
  console.log(`${v.id.padEnd(14)} ${String(tris.tronco).padStart(5)} + ${String(tris.hojas).padStart(5)} triángulos · ` +
    `radio copa ${medidas.radio.toFixed(2)} · tronco ${medidas.radioTronco.toFixed(3)} (alto = 1)`);
}

mkdirSync(destino, { recursive: true });
const bruto = join(procesados, 'arboles_raw.glb');
await new NodeIO().write(bruto, doc);
const salida = join(destino, 'arboles.glb');
execFileSync('npx', ['gltf-transform', 'optimize', bruto, salida, '--compress', 'meshopt', '--texture-compress', 'webp',
  '--texture-size', '512', '--join', 'false', '--palette', 'false', '--instance', 'false', '--simplify', 'false',
  '--flatten', 'false'], { cwd: raiz, stdio: 'pipe', shell: true });
writeFileSync(join(destino, 'arboles_modelos.json'), JSON.stringify(manifiesto, null, 1));
console.log(`${(statSync(bruto).size / 1024).toFixed(0)} KB → ${(statSync(salida).size / 1024).toFixed(0)} KB en ${salida}`);
