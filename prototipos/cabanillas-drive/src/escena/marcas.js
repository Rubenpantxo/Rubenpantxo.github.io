// Marcas viales y bordillos (tools/16_marcas_viales.py → assets/osm/marcas.json): pasos de cebra,
// ejes discontinuos, bordes de la carretera, líneas de STOP y ceda el paso, y el bordillo donde
// acaba la calzada. La pintura va pegada al terreno (unos centímetros por encima) y se apaga de
// noche como la ortofoto; el bordillo es un listón de hormigón de 15 cm.
// Badenes: los pasos «elevados» (los de la travesía) son pasos sobreelevados: meseta con la
// cebra de franjas con punta y dos rampas; la malla lleva el material del suelo que tiene debajo
// (asfalto procedural, suelo.js) y una colisión convexa para que el coche lo note.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { registraEstatico } from '../fisica/fisica.js';

const SOBRE_SUELO = 0.035;
const PINTURA = 0xe8e6dc;
const BORDILLO = { ancho: 0.16, alto: 0.12, color: 0xb8b3a6 };
const RAYA = { ancho: 0.12, trazo: 4, hueco: 6 };      // eje discontinuo
const DETENCION = { stop: 0.4, ceda: 0.4, trazoCeda: 0.8, huecoCeda: 0.4 };
const CEBRA = { franja: 0.5, hueco: 0.5, largo: 3.0 };
// Paso sobreelevado (Orden FOM/3053/2008: 10 cm, meseta de 4 m, rampas de 1–2,5 m)
const BADEN = { alto: 0.1, meseta: 4.0, rampa: 1.5, pasoMalla: 0.25 };

// Altura del badén en (x, z) sobre el terreno (0 fuera de todos)
function creaAlturaBadenes(badenes) {
  const mitadM = BADEN.meseta / 2;
  return (x, z) => {
    let h = 0;
    for (const b of badenes) {
      const qx = x - b.x;
      const qz = z - b.z;
      const a = Math.abs(qx * b.tx + qz * b.tz);          // a lo largo de la calle
      const c = Math.abs(qx * b.dx + qz * b.dz);          // a lo ancho
      if (c > b.largo / 2 || a > mitadM + BADEN.rampa) continue;
      h = Math.max(h, BADEN.alto * Math.min(1, (mitadM + BADEN.rampa - a) / BADEN.rampa));
    }
    return h;
  };
}

// Malla del badén: rejilla sobre la calzada, con el material y la UV del terreno de debajo
function mallaBaden(b, terreno, mallasTerreno, altura) {
  const largoA = BADEN.meseta / 2 + BADEN.rampa;
  const na = Math.ceil((2 * largoA) / BADEN.pasoMalla);
  const nc = Math.max(2, Math.ceil(b.largo / 0.5));
  const pos = [];
  const uv = [];
  const idx = [];
  // La UV de la ortofoto es lineal en (x, z): basta con tres rayos para sacarla
  const rayo = new THREE.Raycaster();
  const toca = (x, z) => {
    rayo.set(new THREE.Vector3(x, terreno.alturaEn(x, z) + 50, z), new THREE.Vector3(0, -1, 0));
    return rayo.intersectObjects(mallasTerreno, false)[0];
  };
  const i0 = toca(b.x, b.z);
  const ix = toca(b.x + 1, b.z);
  const iz = toca(b.x, b.z + 1);
  if (!i0?.uv || !ix?.uv || !iz?.uv || ix.object !== i0.object || iz.object !== i0.object) return null;
  const { material } = i0.object;
  const uvEn = (x, z) => [i0.uv.x + (ix.uv.x - i0.uv.x) * (x - b.x) + (iz.uv.x - i0.uv.x) * (z - b.z),
    i0.uv.y + (ix.uv.y - i0.uv.y) * (x - b.x) + (iz.uv.y - i0.uv.y) * (z - b.z)];
  for (let i = 0; i <= na; i++) {
    const a = -largoA + (2 * largoA * i) / na;
    for (let j = 0; j <= nc; j++) {
      const c = -b.largo / 2 + (b.largo * j) / nc;
      const x = b.x + b.tx * a + b.dx * c;
      const z = b.z + b.tz * a + b.dz * c;
      pos.push(x, terreno.alturaEn(x, z) + altura(x, z) + 0.004, z);
      uv.push(...uvEn(x, z));
      if (i > 0 && j > 0) {
        const k = i * (nc + 1) + j;
        const k0 = k - (nc + 1);
        idx.push(k0 - 1, k - 1, k, k0 - 1, k, k0);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();   // (a lo largo) × (a lo ancho) apunta hacia arriba: t × d = +y
  const malla = new THREE.Mesh(g, material);
  malla.name = 'baden';
  malla.receiveShadow = true;
  return malla;
}

// Colisión: prisma convexo (meseta y rampas sobre una base 30 cm por debajo del terreno)
function colisionBaden(b, terreno, fisica) {
  const { RAPIER, mundo } = fisica;
  const largoA = BADEN.meseta / 2 + BADEN.rampa;
  const puntos = [];
  for (const c of [-b.largo / 2, b.largo / 2]) {
    for (const [a, h] of [[-largoA, 0], [-BADEN.meseta / 2, BADEN.alto], [BADEN.meseta / 2, BADEN.alto], [largoA, 0]]) {
      const x = b.x + b.tx * a + b.dx * c;
      const z = b.z + b.tz * a + b.dz * c;
      const y = terreno.alturaEn(x, z);
      puntos.push(x, y + h, z, x, y - 0.3, z);
    }
  }
  const desc = RAPIER.ColliderDesc.convexHull(new Float32Array(puntos));
  if (!desc) return;
  const collider = mundo.createCollider(desc.setFriction(1.0));
  registraEstatico(fisica, collider, b.x, b.z, Math.hypot(largoA, b.largo / 2));
}

// Marcas del paso sobreelevado de la travesía (como el real, foto de la calle Ramón y Cajal):
// franjas de cebra con punta de flecha en un extremo y, en el carril de cada sentido, una línea
// de detención continua antes del paso. Sin dientes de sierra.
const CEBRA_BADEN = { franja: 0.55, hueco: 0.55, cuerpo: [-1.25, 1.5], punta: 0.6, detencion: 0.3, antes: 2.7 };

function marcasBaden(b, suelo) {
  const pos = [];
  const p = (a, c) => {
    const x = b.x + b.tx * a + b.dx * c;
    const z = b.z + b.tz * a + b.dz * c;
    return [x, suelo.alturaEn(x, z) + SOBRE_SUELO * 0.6, z];
  };
  const quad = (a0, a1, c0, c1) => {
    // Partido a lo largo cada 0,3 m para seguir la meseta y el arranque de la rampa
    const n = Math.max(1, Math.ceil((a1 - a0) / 0.3));
    for (let i = 0; i < n; i++) {
      const u0 = a0 + ((a1 - a0) * i) / n;
      const u1 = a0 + ((a1 - a0) * (i + 1)) / n;
      pos.push(...p(u0, c0), ...p(u1, c0), ...p(u1, c1), ...p(u0, c0), ...p(u1, c1), ...p(u0, c1));
    }
  };
  const { franja, hueco, cuerpo, punta } = CEBRA_BADEN;
  const n = Math.max(2, Math.floor((b.largo - 0.6) / (franja + hueco)) + 1);
  const ocupa = n * franja + (n - 1) * hueco;
  for (let i = 0; i < n; i++) {
    const c0 = -ocupa / 2 + i * (franja + hueco);
    const c1 = c0 + franja;
    quad(cuerpo[0], cuerpo[1], c0, c1);
    pos.push(...p(cuerpo[0], c0), ...p(cuerpo[0], c1), ...p(cuerpo[0] - punta, (c0 + c1) / 2));   // punta
  }
  // Líneas de detención: el tráfico que va hacia +t circula por su derecha (−d)
  const w = CEBRA_BADEN.detencion / 2;
  const m = b.largo / 2 - 0.15;
  quad(-CEBRA_BADEN.antes - w, -CEBRA_BADEN.antes + w, -m, -0.1);
  quad(CEBRA_BADEN.antes - w, CEBRA_BADEN.antes + w, 0.1, m);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex([...Array(pos.length / 3).keys()]);   // con índice, como las cintas (para fusionarlas)
  return g;
}

export async function cargaMarcas(ruta) {
  return fetch(ruta).then((r) => (r.ok ? r.json() : null)).catch(() => null);
}

// Cinta de ancho fijo sobre una polilínea, a ras del terreno. trozos = [trazo, hueco] para discontinua
function cinta(puntos, ancho, terreno, trozos = null) {
  const geos = [];
  const pos = [];
  const idx = [];
  let recorrido = 0;
  const pinta = (a, b) => {
    // Trozo recto de a a b subdividido cada metro para seguir el relieve
    const [x0, z0] = a;
    const [x1, z1] = b;
    const l = Math.hypot(x1 - x0, z1 - z0);
    if (l < 0.05) return;
    const nx = (-(z1 - z0) / l) * (ancho / 2);
    const nz = ((x1 - x0) / l) * (ancho / 2);
    const n = Math.max(1, Math.ceil(l / 0.5));          // cada 0,5 m: sigue también los badenes
    const base = pos.length / 3;
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const z = z0 + ((z1 - z0) * i) / n;
      for (const s of [-1, 1]) {
        const px = x + nx * s;
        const pz = z + nz * s;
        pos.push(px, terreno.alturaEn(px, pz) + SOBRE_SUELO, pz);
      }
      if (i > 0) {
        const k = base + (i - 1) * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
  };
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i];
    const b = puntos[i + 1];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (!trozos) { pinta(a, b); continue; }
    // Discontinua: el patrón sigue de un tramo al siguiente
    const [trazo, hueco] = trozos;
    const ciclo = trazo + hueco;
    let t = 0;
    while (t < l) {
      const fase = (recorrido + t) % ciclo;
      const fin = Math.min(l, t + (fase < trazo ? trazo - fase : ciclo - fase));
      if (fase < trazo) {
        const f0 = t / l;
        const f1 = fin / l;
        pinta([a[0] + (b[0] - a[0]) * f0, a[1] + (b[1] - a[1]) * f0], [a[0] + (b[0] - a[0]) * f1, a[1] + (b[1] - a[1]) * f1]);
      }
      t = fin + 1e-4;
    }
    recorrido += l;
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  geos.push(g);
  return g;
}

// Listón del bordillo: cara de arriba y las dos caras laterales, siguiendo el terreno
function liston(puntos, terreno) {
  const pos = [];
  const { ancho, alto } = BORDILLO;
  const tri = (a, b, c) => pos.push(...a, ...b, ...c);
  for (let i = 0; i < puntos.length - 1; i++) {
    const [x0, z0] = puntos[i];
    const [x1, z1] = puntos[i + 1];
    const l = Math.hypot(x1 - x0, z1 - z0);
    if (l < 0.02) continue;
    const n = Math.max(1, Math.ceil(l / 1.5));
    const nx = (-(z1 - z0) / l) * (ancho / 2);
    const nz = ((x1 - x0) / l) * (ancho / 2);
    for (let k = 0; k < n; k++) {
      const p = (f) => [x0 + (x1 - x0) * f, z0 + (z1 - z0) * f];
      const [ax, az] = p(k / n);
      const [bx, bz] = p((k + 1) / n);
      const ya = terreno.alturaEn(ax, az);
      const yb = terreno.alturaEn(bx, bz);
      const v = (x, y, z) => [x, y, z];
      const aI = v(ax - nx, ya + alto, az - nz);
      const aD = v(ax + nx, ya + alto, az + nz);
      const bI = v(bx - nx, yb + alto, bz - nz);
      const bD = v(bx + nx, yb + alto, bz + nz);
      tri(aI, bD, aD); tri(aI, bI, bD);
      const aIs = v(ax - nx, ya - 0.05, az - nz);
      const bIs = v(bx - nx, yb - 0.05, bz - nz);
      const aDs = v(ax + nx, ya - 0.05, az + nz);
      const bDs = v(bx + nx, yb - 0.05, bz + nz);
      tri(aIs, bI, aI); tri(aIs, bIs, bI);
      tri(aDs, aD, bD); tri(aDs, bD, bDs);
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

export function creaMarcas(datos, terrenoBase, { mallasTerreno = [], fisica = null } = {}) {
  const raiz = new THREE.Group();
  raiz.name = 'marcas_viales';
  if (!datos) return { raiz };
  // Badenes: la pintura (ejes, bordes y cebras) se apoya en el suelo con los badenes encima
  const badenes = (datos.pasos ?? []).filter((p) => p.elevado)
    .map((p) => ({ x: p.x, z: p.z, dx: p.dx, dz: p.dz, tx: -p.dz, tz: p.dx, largo: p.largo + 0.3 }));
  const altura = creaAlturaBadenes(badenes);
  const terreno = { alturaEn: (x, z) => terrenoBase.alturaEn(x, z) + altura(x, z) };
  for (const b of badenes) {
    const malla = mallaBaden(b, terrenoBase, mallasTerreno, altura);
    if (malla) raiz.add(malla);
    if (fisica?.mundo) colisionBaden(b, terrenoBase, fisica);
  }
  const pintura = badenes.map((b) => marcasBaden(b, terreno));
  for (const eje of datos.ejes ?? []) pintura.push(cinta(eje, RAYA.ancho, terreno, [RAYA.trazo, RAYA.hueco]));
  for (const borde of datos.bordes ?? []) pintura.push(cinta(borde, RAYA.ancho * 1.25, terreno));
  for (const d of datos.detenciones ?? []) {
    pintura.push(d.tipo === 'stop'
      ? cinta(d.p, DETENCION.stop, terreno)
      : cinta(d.p, DETENCION.ceda, terreno, [DETENCION.trazoCeda, DETENCION.huecoCeda]));
  }
  // Paso de cebra: franjas a lo largo de la calle, repartidas a lo ancho de la calzada
  for (const p of datos.pasos ?? []) {
    if (p.elevado) continue;               // el de los badenes va en marcasBaden
    const n = Math.max(2, Math.floor((p.largo - 0.3) / (CEBRA.franja + CEBRA.hueco)) + 1);
    const ocupa = n * CEBRA.franja + (n - 1) * CEBRA.hueco;
    const tx = -p.dz;                      // dirección de la calle
    const tz = p.dx;
    for (let i = 0; i < n; i++) {
      const s = -ocupa / 2 + CEBRA.franja / 2 + i * (CEBRA.franja + CEBRA.hueco);
      const cx = p.x + p.dx * s;
      const cz = p.z + p.dz * s;
      pintura.push(cinta([[cx - tx * CEBRA.largo / 2, cz - tz * CEBRA.largo / 2], [cx + tx * CEBRA.largo / 2, cz + tz * CEBRA.largo / 2]],
        CEBRA.franja, terreno));
    }
  }
  const geos = pintura.filter(Boolean);
  if (geos.length) {
    // MeshBasic: el ciclo de día la apaga de noche como la foto (cicloDia.js)
    const malla = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshBasicMaterial({
      color: PINTURA, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide,
    }));
    malla.name = 'marcas_pintura';
    malla.userData.sinSombra = true;
    malla.renderOrder = 1;
    raiz.add(malla);
  }
  const bordillos = (datos.bordillos ?? []).map((b) => liston(b, terreno)).filter(Boolean);
  if (bordillos.length) {
    const malla = new THREE.Mesh(mergeGeometries(bordillos), new THREE.MeshStandardMaterial({ color: BORDILLO.color, roughness: 0.9 }));
    malla.name = 'bordillos';
    malla.receiveShadow = true;
    raiz.add(malla);
  }
  return { raiz, alturaBadenes: altura, cantidad: { pasos: datos.pasos?.length ?? 0, badenes: badenes.length, bordillos: bordillos.length } };
}
