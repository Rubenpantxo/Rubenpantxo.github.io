// Marcas viales y bordillos (tools/16_marcas_viales.py → assets/osm/marcas.json): pasos de cebra,
// ejes discontinuos, bordes de la carretera, líneas de STOP y ceda el paso, y el bordillo donde
// acaba la calzada. La pintura va pegada al terreno (unos centímetros por encima) y se apaga de
// noche como la ortofoto; el bordillo es un listón de hormigón de 15 cm.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const SOBRE_SUELO = 0.035;
const PINTURA = 0xe8e6dc;
const BORDILLO = { ancho: 0.16, alto: 0.12, color: 0xb8b3a6 };
const RAYA = { ancho: 0.12, trazo: 4, hueco: 6 };      // eje discontinuo
const DETENCION = { stop: 0.4, ceda: 0.4, trazoCeda: 0.8, huecoCeda: 0.4 };
const CEBRA = { franja: 0.5, hueco: 0.5, largo: 3.0 };

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
    const n = Math.max(1, Math.ceil(l));
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

export function creaMarcas(datos, terreno) {
  const raiz = new THREE.Group();
  raiz.name = 'marcas_viales';
  if (!datos) return { raiz };
  const pintura = [];
  for (const eje of datos.ejes ?? []) pintura.push(cinta(eje, RAYA.ancho, terreno, [RAYA.trazo, RAYA.hueco]));
  for (const borde of datos.bordes ?? []) pintura.push(cinta(borde, RAYA.ancho * 1.25, terreno));
  for (const d of datos.detenciones ?? []) {
    pintura.push(d.tipo === 'stop'
      ? cinta(d.p, DETENCION.stop, terreno)
      : cinta(d.p, DETENCION.ceda, terreno, [DETENCION.trazoCeda, DETENCION.huecoCeda]));
  }
  // Paso de cebra: franjas a lo largo de la calle, repartidas a lo ancho de la calzada
  for (const p of datos.pasos ?? []) {
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
      color: PINTURA, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
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
  return { raiz, cantidad: { pasos: datos.pasos?.length ?? 0, bordillos: bordillos.length } };
}
