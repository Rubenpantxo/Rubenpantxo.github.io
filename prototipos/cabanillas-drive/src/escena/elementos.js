// Elementos de OpenStreetMap (tools/15_osm_elementos.py → assets/osm/elementos.json): bancos,
// mesas de pícnic, fuente, bebedero, aparcabicis, paneles, parada de autobús, hitos kilométricos,
// señales de STOP y ceda el paso, puerta, torre eléctrica, piscinas, porterías, canastas, gradas,
// parques infantiles y números de portal.
// Dónde está cada cosa sale de OSM (y el LiDAR); cómo es, de modelos genéricos hechos aquí con
// piezas simples (un color por pieza, sin texturas salvo letreros). Los repetidos van instanciados.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { registraEstatico } from '../fisica/fisica.js';

const FUENTE = 'system-ui, "Segoe UI", Roboto, sans-serif';
const Y = new THREE.Vector3(0, 1, 0);

// --- Piezas ------------------------------------------------------------------------------------
const colorTmp = new THREE.Color();
function pieza(geo, hex, m4) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (m4) g.applyMatrix4(m4);
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
  colorTmp.set(hex);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([colorTmp.r, colorTmp.g, colorTmp.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
const M = (x, y, z, { ry = 0, rx = 0, rz = 0, s = [1, 1, 1] } = {}) => new THREE.Matrix4().compose(
  new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(...s));
const caja = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cil = (r, h, seg = 8, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg);
const une = (partes) => mergeGeometries(partes);
// Barra entre dos puntos (cilindro)
function barra(a, b, r, hex, seg = 6) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const d = vb.clone().sub(va);
  const g = cil(r, d.length(), seg);
  const q = new THREE.Quaternion().setFromUnitVectors(Y, d.clone().normalize());
  return pieza(g, hex, new THREE.Matrix4().compose(va.add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
}

const MADERA = '#8a5a34';
const HIERRO = '#2b2f2e';
const PIEDRA = '#bcb19a';
const BLANCO = '#f2f2ee';
const GRIS = '#8d9296';

function banco() {
  const p = [];
  for (const x of [-0.75, 0.75]) {
    p.push(pieza(caja(0.06, 0.44, 0.5), HIERRO, M(x, 0.22, -0.02)));
    p.push(pieza(caja(0.05, 0.48, 0.06), HIERRO, M(x, 0.68, -0.24, { rx: -0.2 })));
  }
  for (let i = 0; i < 4; i++) p.push(pieza(caja(1.8, 0.035, 0.09), MADERA, M(0, 0.45, -0.17 + i * 0.11)));
  for (let i = 0; i < 3; i++) p.push(pieza(caja(1.8, 0.09, 0.03), MADERA, M(0, 0.6 + i * 0.12, -0.25 - i * 0.025, { rx: -0.2 })));
  return une(p);
}

function mesa() {
  const p = [pieza(caja(1.8, 0.05, 0.75), MADERA, M(0, 0.74, 0))];
  for (const z of [-0.62, 0.62]) p.push(pieza(caja(1.8, 0.04, 0.28), MADERA, M(0, 0.44, z)));
  for (const x of [-0.7, 0.7]) {
    p.push(pieza(caja(0.06, 0.06, 1.55), MADERA, M(x, 0.42, 0)));
    p.push(barra([x, 0, -0.55], [x, 0.74, 0], 0.035, MADERA));
    p.push(barra([x, 0, 0.55], [x, 0.74, 0], 0.035, MADERA));
  }
  return une(p);
}

function fuente() {
  // Pilón octogonal: fondo bajo, ocho tramos de pretil y el agua dentro
  const pretil = [];
  const r = 1.35;
  const lado = 2 * r * Math.tan(Math.PI / 8);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    pretil.push(pieza(caja(lado + 0.12, 0.55, 0.22), PIEDRA, M(Math.sin(a) * r, 0.275, Math.cos(a) * r, { ry: a })));
  }
  return une([
    ...pretil,
    pieza(cil(1.3, 0.15, 8), PIEDRA, M(0, 0.075, 0, { ry: Math.PI / 8 })),
    pieza(cil(1.28, 0.03, 8), '#3d7f9e', M(0, 0.42, 0, { ry: Math.PI / 8 })),
    pieza(cil(0.2, 1.2, 8), PIEDRA, M(0, 0.9, 0)),
    pieza(cil(0.5, 0.14, 12, 0.3), PIEDRA, M(0, 1.5, 0)),
    pieza(cil(0.42, 0.02, 12), '#3d7f9e', M(0, 1.575, 0)),
    pieza(cil(0.06, 0.35, 6), PIEDRA, M(0, 1.75, 0)),
  ]);
}

function bebedero() {
  return une([
    pieza(cil(0.2, 0.08, 8), '#3a4a3f', M(0, 0.04, 0)),
    pieza(cil(0.09, 0.95, 10), '#2f4a3a', M(0, 0.55, 0)),
    pieza(new THREE.SphereGeometry(0.11, 10, 6), '#2f4a3a', M(0, 1.05, 0)),
    pieza(cil(0.025, 0.18, 6), '#9a9a90', M(0, 0.95, 0.1, { rx: Math.PI / 2 })),
    pieza(caja(0.42, 0.06, 0.32), '#3a4a3f', M(0, 0.12, 0.25)),
  ]);
}

function aparcabicis(plazas) {
  const p = [];
  const n = Math.max(3, Math.min(8, Math.round(plazas / 4)));
  for (let i = 0; i < n; i++) {
    const g = new THREE.TorusGeometry(0.32, 0.022, 6, 12, Math.PI);
    p.push(pieza(g, '#9aa0a4', M(-((n - 1) * 0.6) / 2 + i * 0.6, 0, 0, { ry: Math.PI / 2 })));
  }
  return une(p);
}

function columna(alto, ancho, hex) {
  return [pieza(cil(0.04, alto, 8), hex, M(0, alto / 2, 0)), pieza(caja(ancho, 0.02, 0.02), hex, M(0, alto, 0))];
}

function torre(alto) {
  // Torre de celosía genérica de la altura que mide el LiDAR
  const p = [];
  const base = 0.9 + alto * 0.12;
  const arriba = 0.5;
  const esquinas = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const en = (t, [sx, sz]) => [sx * THREE.MathUtils.lerp(base, arriba, t) / 2, t * alto, sz * THREE.MathUtils.lerp(base, arriba, t) / 2];
  const tramos = Math.max(3, Math.round(alto / 1.6));
  for (let k = 0; k < 4; k++) p.push(barra(en(0, esquinas[k]), en(1, esquinas[k]), 0.05, GRIS, 4));
  for (let i = 0; i < tramos; i++) {
    const t0 = i / tramos;
    const t1 = (i + 1) / tramos;
    for (let k = 0; k < 4; k++) {
      const a = esquinas[k];
      const b = esquinas[(k + 1) % 4];
      p.push(barra(en(t0, a), en(t1, b), 0.025, GRIS, 4));
      p.push(barra(en(t1, a), en(t1, b), 0.025, GRIS, 4));
    }
  }
  p.push(pieza(caja(2.2, 0.12, 0.12), GRIS, M(0, alto - 0.3, 0)));
  for (const x of [-1, 0, 1]) p.push(pieza(cil(0.06, 0.5, 6), '#c9a46b', M(x, alto - 0.6, 0)));
  return une(p);
}

function porteria(ancho, alto, fondo) {
  const p = [];
  const r = 0.06;
  p.push(barra([-ancho / 2, 0, 0], [-ancho / 2, alto, 0], r, BLANCO));
  p.push(barra([ancho / 2, 0, 0], [ancho / 2, alto, 0], r, BLANCO));
  p.push(barra([-ancho / 2, alto, 0], [ancho / 2, alto, 0], r, BLANCO));
  for (const x of [-ancho / 2, ancho / 2]) {
    p.push(barra([x, alto, 0], [x, 0, -fondo], 0.025, GRIS, 4));
    p.push(barra([x, 0, 0], [x, 0, -fondo], 0.025, GRIS, 4));
  }
  p.push(barra([-ancho / 2, 0, -fondo], [ancho / 2, 0, -fondo], 0.025, GRIS, 4));
  return une(p);
}

function canasta() {
  return une([
    pieza(cil(0.08, 3.4, 8), '#3b5f8a', M(0, 1.7, -1.6)),
    barra([0, 3.3, -1.6], [0, 3.3, -0.1], 0.06, '#3b5f8a'),
    pieza(caja(1.8, 1.05, 0.04), BLANCO, M(0, 3.45, 0)),
    pieza(caja(0.59, 0.45, 0.045), '#d14b2a', M(0, 3.3, 0.005)),
    pieza(new THREE.TorusGeometry(0.23, 0.012, 6, 16), '#e8632a', M(0, 3.05, 0.38, { rx: Math.PI / 2 })),
  ]);
}

function columpio() {
  const p = [];
  const alto = 2.2;
  const largo = 2.6;
  for (const x of [-largo / 2, largo / 2]) {
    p.push(barra([x, 0, -0.8], [x, alto, 0], 0.045, '#c0392b'));
    p.push(barra([x, 0, 0.8], [x, alto, 0], 0.045, '#c0392b'));
  }
  p.push(barra([-largo / 2, alto, 0], [largo / 2, alto, 0], 0.05, '#c0392b'));
  for (const x of [-0.6, 0.6]) {
    p.push(barra([x - 0.2, alto, 0], [x - 0.2, 0.45, 0], 0.01, GRIS, 4));
    p.push(barra([x + 0.2, alto, 0], [x + 0.2, 0.45, 0], 0.01, GRIS, 4));
    p.push(pieza(caja(0.45, 0.04, 0.18), '#222', M(x, 0.45, 0)));
  }
  return une(p);
}

function tobogan() {
  const p = [];
  const h = 1.2;
  for (const [x, z] of [[-0.45, -0.45], [0.45, -0.45], [0.45, 0.45], [-0.45, 0.45]]) p.push(pieza(caja(0.08, h + 0.9, 0.08), '#f1c40f', M(x, (h + 0.9) / 2, z)));
  p.push(pieza(caja(1.0, 0.06, 1.0), '#2e86de', M(0, h, 0)));
  p.push(pieza(caja(1.0, 0.5, 0.04), '#27ae60', M(0, h + 0.45, -0.5)));
  const largo = Math.hypot(2.4, h);
  p.push(pieza(caja(0.5, 0.04, largo), '#e74c3c', M(0, h / 2, 0.5 + 1.2, { rx: Math.atan2(h, 2.4) })));
  for (let i = 0; i < 5; i++) p.push(pieza(caja(0.5, 0.04, 0.06), GRIS, M(0, 0.2 + i * 0.22, -0.75)));
  p.push(barra([-0.25, 0, -0.95], [-0.25, h, -0.55], 0.025, GRIS, 4));
  p.push(barra([0.25, 0, -0.95], [0.25, h, -0.55], 0.025, GRIS, 4));
  return une(p);
}

// --- Letreros (texturas de lienzo) --------------------------------------------------------------
function lienzo(ancho, alto, dibuja) {
  const c = document.createElement('canvas');
  c.width = ancho;
  c.height = alto;
  dibuja(c.getContext('2d'), ancho, alto);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function texturaStop() {
  return lienzo(256, 256, (ctx, w) => {
    ctx.translate(w / 2, w / 2);
    const octo = (r) => { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i * Math.PI) / 4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); };
    ctx.fillStyle = '#fff'; octo(128); ctx.fill();
    ctx.fillStyle = '#c8102e'; octo(118); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold 78px ${FUENTE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('STOP', 0, 4);
  });
}

function texturaCeda() {
  return lienzo(256, 256, (ctx) => {
    const tri = (m) => { ctx.beginPath(); ctx.moveTo(128, 256 - m * 1.6); ctx.lineTo(m, 22 + m * 0.6); ctx.lineTo(256 - m, 22 + m * 0.6); ctx.closePath(); };
    ctx.fillStyle = '#fff'; tri(0); ctx.fill();
    ctx.fillStyle = '#c8102e'; tri(6); ctx.fill();
    ctx.fillStyle = '#fff'; tri(46); ctx.fill();
  });
}

function texturaBus() {
  return lienzo(192, 256, (ctx, w, h) => {
    ctx.fillStyle = '#1f5fa8'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#fff';
    ctx.fillRect(46, 60, 100, 70); ctx.fillStyle = '#1f5fa8'; ctx.fillRect(56, 70, 80, 28);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(66, 136, 10, 0, 7); ctx.arc(126, 136, 10, 0, 7); ctx.fill();
    ctx.font = `bold 54px ${FUENTE}`; ctx.textAlign = 'center'; ctx.fillText('BUS', w / 2, 215);
  });
}

function texturaHito(carretera, km) {
  return lienzo(128, 192, (ctx, w, h) => {
    ctx.fillStyle = '#f4f4f0'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c8102e'; ctx.fillRect(0, 0, w, 44);
    ctx.fillStyle = '#fff'; ctx.font = `bold 24px ${FUENTE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(carretera, w / 2, 23);
    ctx.fillStyle = '#111'; ctx.font = `bold 64px ${FUENTE}`; ctx.fillText(km, w / 2, 112);
  });
}

// Plano del pueblo para los paneles informativos (calles y edificios reales)
function texturaPlano(calles, edificios, titulo) {
  return lienzo(512, 384, (ctx, w, h) => {
    ctx.fillStyle = '#efe8d6'; ctx.fillRect(0, 0, w, h);
    const esc = Math.min(w, h - 50) / 1100;
    const px = (x) => w / 2 + x * esc;
    const pz = (z) => 50 + (h - 50) / 2 + z * esc;
    ctx.fillStyle = '#c9b9a0';
    for (const f of edificios?.features ?? []) {
      const a = f.geometry.coordinates[0];
      ctx.beginPath(); a.forEach(([x, z], i) => (i ? ctx.lineTo(px(x), pz(z)) : ctx.moveTo(px(x), pz(z)))); ctx.fill();
    }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (const f of calles?.features ?? []) {
      const lineas = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const l of lineas) { ctx.beginPath(); l.forEach(([x, z], i) => (i ? ctx.lineTo(px(x), pz(z)) : ctx.moveTo(px(x), pz(z)))); ctx.stroke(); }
    }
    ctx.fillStyle = '#2d4a2f'; ctx.fillRect(0, 0, w, 46);
    ctx.fillStyle = '#fff'; ctx.font = `bold 30px ${FUENTE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(titulo, w / 2, 24);
  });
}

// Números de portal: placa esmaltada blanca con borde y número azules
function atlasNumeros(textos) {
  const columnas = 16;
  const filas = Math.ceil(textos.length / columnas);
  const cw = 128;
  const ch = 88;
  const casillas = new Map();
  const textura = lienzo(columnas * cw, Math.max(1, filas) * ch, (ctx) => {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    textos.forEach((t, i) => {
      const x = (i % columnas) * cw;
      const y = Math.floor(i / columnas) * ch;
      ctx.fillStyle = '#f7f7f2'; ctx.beginPath(); ctx.roundRect(x + 4, y + 4, cw - 8, ch - 8, 14); ctx.fill();
      ctx.strokeStyle = '#1d4f91'; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(x + 10, y + 10, cw - 20, ch - 20, 10); ctx.stroke();
      ctx.fillStyle = '#1d4f91'; ctx.font = `bold ${t.length > 3 ? 34 : 50}px ${FUENTE}`;
      ctx.fillText(t, x + cw / 2, y + ch / 2 + 3);
      casillas.set(t, [(i % columnas) / columnas, 1 - (Math.floor(i / columnas) + 1) / Math.max(1, filas)]);
    });
  });
  return { textura, casillas, tam: new THREE.Vector2(1 / columnas, 1 / Math.max(1, filas)) };
}

// --- Montaje -----------------------------------------------------------------------------------
export async function cargaElementos(ruta) {
  return fetch(ruta).then((r) => (r.ok ? r.json() : null)).catch(() => null);
}

export function creaElementos(datos, { terreno, fisica, calles, edificios, muros }) {
  const raiz = new THREE.Group();
  raiz.name = 'elementos_osm';
  if (!datos) return { raiz };
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.05 });
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const uno = new THREE.Vector3(1, 1, 1);
  const { RAPIER, mundo } = fisica ?? {};

  const colision = (x, z, rumbo, [ax, ay, az], y0) => {
    if (!mundo) return;
    const qr = new THREE.Quaternion().setFromAxisAngle(Y, rumbo);
    const c = mundo.createCollider(RAPIER.ColliderDesc.cuboid(ax / 2, ay / 2, az / 2)
      .setTranslation(x, y0 + ay / 2, z).setRotation({ x: qr.x, y: qr.y, z: qr.z, w: qr.w }));
    registraEstatico(fisica, c, x, z, Math.max(ax, az) / 2);
  };

  // Repetidos: una malla instanciada por modelo
  function instancias(nombre, geo, lista, caja, mat = material) {
    if (!lista?.length) return null;
    const malla = new THREE.InstancedMesh(geo, mat, lista.length);
    malla.name = nombre;
    lista.forEach((e, i) => {
      const y = e.y ?? terreno.alturaEn(e.x, e.z);
      q.setFromAxisAngle(Y, e.rumbo ?? 0);
      malla.setMatrixAt(i, m4.compose(new THREE.Vector3(e.x, y, e.z), q, uno));
      if (caja) colision(e.x, e.z, e.rumbo ?? 0, caja, y);
    });
    malla.computeBoundingSphere();
    raiz.add(malla);
    return malla;
  }
  function suelto(nombre, geo, e, caja, mat = material) {
    return instancias(nombre, geo, [e], caja, mat);
  }

  instancias('bancos', banco(), datos.bancos, [1.85, 0.9, 0.6]);
  instancias('mesas_picnic', mesa(), datos.mesas, [1.85, 0.8, 1.6]);
  for (const f of datos.fuentes ?? []) {
    if (f.tipo === 'fuente') suelto('fuente', fuente(), f, [2.6, 0.6, 2.6]);
    else suelto('bebedero', bebedero(), f, [0.3, 1.1, 0.3]);
  }
  for (const a of datos.aparcabicis ?? []) suelto('aparcabicis', aparcabicis(a.plazas), a);
  for (const t of datos.torres ?? []) suelto('torre_electrica', torre(t.alto), t, [1.2, t.alto, 1.2]);

  // Señales: poste instanciado y placa con la cara de la señal delante y gris detrás
  const senales = { stop: [], ceda: [] };
  for (const s of datos.senales ?? []) senales[s.tipo]?.push(s);
  const postes = (datos.senales ?? []).map((s) => ({ ...s }));
  instancias('senales_postes', une(columna(2.25, 0.05, GRIS)), postes, [0.12, 2.2, 0.12]);
  const grisChapa = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.5, metalness: 0.6 });
  for (const [tipo, lista, textura, segmentos, radio] of [
    ['stop', senales.stop, texturaStop(), 8, 0.36], ['ceda', senales.ceda, texturaCeda(), 3, 0.5]]) {
    if (!lista.length) continue;
    const geo = new THREE.CylinderGeometry(radio, radio, 0.02, segmentos, 1, false, segmentos === 8 ? Math.PI / 8 : 0);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, tipo === 'stop' ? 2.05 : 2.0, 0.05);
    // Las UV de la tapa del cilindro, una vez girado de cara, quedan a 90°: se endereza la textura
    textura.center.set(0.5, 0.5);
    textura.rotation = Math.PI / 2;
    const frente = new THREE.MeshStandardMaterial({ map: textura, roughness: 0.45 });
    instancias(`senales_${tipo}`, geo, lista, null, [grisChapa, frente, grisChapa]);
  }

  // Parada, hitos y paneles: pocas unidades, mallas sueltas con su letrero
  for (const p of datos.paradas ?? []) {
    suelto('parada_poste', une(columna(2.7, 0.05, GRIS)), p, [0.12, 2.7, 0.12]);
    const placa = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.6).translate(0, 2.35, 0.05),
      new THREE.MeshStandardMaterial({ map: texturaBus(), roughness: 0.5, side: THREE.DoubleSide }));
    placa.position.set(p.x, terreno.alturaEn(p.x, p.z), p.z);
    placa.rotation.y = p.rumbo;
    placa.name = 'parada_placa';
    raiz.add(placa);
  }
  for (const h of datos.hitos ?? []) {
    const y = terreno.alturaEn(h.x, h.z);
    const cuerpo = new THREE.Mesh(une([pieza(caja(0.4, 0.75, 0.16), '#f2f2ec', M(0, 0.37, 0)), pieza(caja(0.42, 0.12, 0.17), '#c8102e', M(0, 0.78, 0))]), material);
    const cara = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.57).translate(0, 0.42, 0.082),
      new THREE.MeshStandardMaterial({ map: texturaHito(h.texto || '', String(h.km ?? '')), roughness: 0.7 }));
    for (const o of [cuerpo, cara]) { o.position.set(h.x, y, h.z); o.rotation.y = h.rumbo; o.name = 'hito'; raiz.add(o); }
    colision(h.x, h.z, h.rumbo, [0.42, 0.9, 0.2], y);
  }
  const texPlano = (datos.paneles ?? []).length ? texturaPlano(calles, edificios, 'Cabanillas') : null;
  for (const p of datos.paneles ?? []) {
    const y = terreno.alturaEn(p.x, p.z);
    const estructura = new THREE.Mesh(une([
      pieza(caja(0.1, 2.0, 0.1), '#6b4a2f', M(-0.72, 1.0, 0)), pieza(caja(0.1, 2.0, 0.1), '#6b4a2f', M(0.72, 1.0, 0)),
      pieza(caja(1.5, 1.08, 0.06), '#6b4a2f', M(0, 1.4, 0)), pieza(caja(1.7, 0.06, 0.25), '#5a3d26', M(0, 2.0, 0)),
    ]), material);
    const cara = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.98).translate(0, 1.4, 0.035),
      new THREE.MeshStandardMaterial({ map: texPlano, roughness: 0.6 }));
    for (const o of [estructura, cara]) { o.position.set(p.x, y, p.z); o.rotation.y = p.rumbo; o.name = 'panel'; raiz.add(o); }
    colision(p.x, p.z, p.rumbo, [1.6, 2.0, 0.2], y);
  }

  // Puerta: alineada con la valla más cercana
  for (const pu of datos.puertas ?? []) {
    let rumbo = pu.rumbo;
    let mejor = Infinity;
    for (const m of muros?.muros ?? []) {
      for (let i = 1; i < m.p.length; i++) {
        const [x0, z0] = m.p[i - 1];
        const [x1, z1] = m.p[i];
        const d = Math.hypot((x0 + x1) / 2 - pu.x, (z0 + z1) / 2 - pu.z);
        if (d < mejor) { mejor = d; rumbo = Math.atan2(z1 - z0, -(x1 - x0)); }
      }
    }
    const p = [];
    p.push(barra([-0.6, 0, 0], [-0.6, 1.9, 0], 0.03, '#2f4a3a'), barra([0.6, 0, 0], [0.6, 1.9, 0], 0.03, '#2f4a3a'));
    for (const y of [0.1, 1.0, 1.9]) p.push(barra([-0.6, y, 0], [0.6, y, 0], 0.02, '#2f4a3a', 4));
    for (let i = 1; i < 8; i++) p.push(barra([-0.6 + i * 0.15, 0.1, 0], [-0.6 + i * 0.15, 1.9, 0], 0.01, '#2f4a3a', 4));
    suelto('puerta', une(p), { ...pu, rumbo });
  }

  // Piscinas: lámina de agua y borde de piedra
  const agua = [];
  const borde = [];
  for (const pis of datos.piscinas ?? []) {
    const anillo = pis.p;
    const ys = anillo.map(([x, z]) => terreno.alturaEn(x, z));
    const y = Math.max(...ys) + 0.03;
    const forma = new THREE.Shape(anillo.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ShapeGeometry(forma).rotateX(-Math.PI / 2).translate(0, y, 0);
    agua.push(g);
    // Borde: franja de 0,35 m hacia fuera de cada lado
    let area = 0;
    for (let i = 0; i < anillo.length; i++) {
      const [x0, z0] = anillo[i];
      const [x1, z1] = anillo[(i + 1) % anillo.length];
      area += x0 * z1 - x1 * z0;
    }
    const fuera = area > 0 ? -1 : 1;
    for (let i = 0; i < anillo.length; i++) {
      const [x0, z0] = anillo[i];
      const [x1, z1] = anillo[(i + 1) % anillo.length];
      const l = Math.hypot(x1 - x0, z1 - z0) || 1;
      const nx = (-(z1 - z0) / l) * fuera * 0.35;
      const nz = ((x1 - x0) / l) * fuera * 0.35;
      const lado = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x0, y + 0.04, z0), new THREE.Vector3(x1, y + 0.04, z1), new THREE.Vector3(x1 + nx, y + 0.04, z1 + nz),
        new THREE.Vector3(x0, y + 0.04, z0), new THREE.Vector3(x1 + nx, y + 0.04, z1 + nz), new THREE.Vector3(x0 + nx, y + 0.04, z0 + nz),
      ]);
      lado.computeVertexNormals();
      borde.push(pieza(lado, '#e6e1d4'));
    }
  }
  if (agua.length) {
    const malla = new THREE.Mesh(mergeGeometries(agua), new THREE.MeshStandardMaterial({
      color: 0x2a9fd0, roughness: 0.06, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
    malla.name = 'piscinas_agua';
    malla.receiveShadow = true;
    malla.userData.sinSombra = true;
    raiz.add(malla);
    const mb = new THREE.Mesh(mergeGeometries(borde), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }));
    mb.name = 'piscinas_borde';
    raiz.add(mb);
  }

  // Campo de fútbol y pista de baloncesto: porterías y canastas en los lados cortos
  for (const c of datos.canchas ?? []) {
    for (const e of c.extremos) {
      if (c.deporte === 'soccer') {
        const grande = c.largo > 80;
        suelto('porteria', porteria(grande ? 7.32 : 3, grande ? 2.44 : 2, grande ? 2 : 1), { ...e, rumbo: e.rumbo + Math.PI });
        const fx = Math.sin(e.rumbo + Math.PI / 2);
        const fz = Math.cos(e.rumbo + Math.PI / 2);
        for (const s of [-1, 1]) colision(e.x + fx * s * 3.66, e.z + fz * s * 3.66, e.rumbo, [0.15, 2.5, 0.15], terreno.alturaEn(e.x, e.z));
      } else if (c.deporte === 'basketball') {
        const x = e.x + Math.sin(e.rumbo) * 1.2;
        const z = e.z + Math.cos(e.rumbo) * 1.2;
        suelto('canasta', canasta(), { x, z, rumbo: e.rumbo });
        colision(x - Math.sin(e.rumbo) * 1.6, z - Math.cos(e.rumbo) * 1.6, e.rumbo, [0.2, 3.4, 0.2], terreno.alturaEn(x, z));
      }
    }
  }

  // Gradas: escalones que suben alejándose del campo
  for (const g of datos.gradas ?? []) {
    const [a, b, cc, d] = g.p;
    const lados = [[a, b], [b, cc], [cc, d], [d, a]].map(([p0, p1]) => ({ p0, p1, l: Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) }));
    const largos = lados.filter((s) => s.l >= Math.max(...lados.map((t) => t.l)) - 0.01);
    const delante = largos.sort((s, t) => Math.hypot((s.p0[0] + s.p1[0]) / 2 - g.mira[0], (s.p0[1] + s.p1[1]) / 2 - g.mira[1])
      - Math.hypot((t.p0[0] + t.p1[0]) / 2 - g.mira[0], (t.p0[1] + t.p1[1]) / 2 - g.mira[1]))[0];
    const fondo = Math.min(...lados.map((s) => s.l));
    const ux = (delante.p1[0] - delante.p0[0]) / delante.l;
    const uz = (delante.p1[1] - delante.p0[1]) / delante.l;
    const cx = (delante.p0[0] + delante.p1[0]) / 2;
    const cz = (delante.p0[1] + delante.p1[1]) / 2;
    let nx = -uz;
    let nz = ux;
    if ((g.mira[0] - cx) * nx + (g.mira[1] - cz) * nz > 0) { nx = -nx; nz = -nz; }   // hacia atrás
    const filas = Math.max(3, Math.floor(fondo / 0.8));
    const partes = [];
    const y0 = terreno.alturaEn(cx, cz);
    const rumbo = Math.atan2(-nx, -nz);
    for (let i = 0; i < filas; i++) {
      const profundidad = fondo - i * 0.8;
      const alto = (i + 1) * 0.42;
      const mx = cx + nx * (i * 0.8 + profundidad / 2);
      const mz = cz + nz * (i * 0.8 + profundidad / 2);
      partes.push(pieza(caja(delante.l, alto, profundidad), i % 2 ? '#b8b4ac' : '#c4c0b8', M(mx, y0 + alto / 2, mz, { ry: rumbo })));
      colision(mx, mz, rumbo, [delante.l, alto, profundidad], y0);
    }
    const malla = new THREE.Mesh(une(partes), material);
    malla.name = 'gradas';
    raiz.add(malla);
  }

  // Parques infantiles: columpio y tobogán genéricos dentro del recinto mapeado
  for (const j of datos.juegos ?? []) {
    const p = j.p;
    let mejor = { l: 0, ux: 1, uz: 0 };
    for (let i = 0; i < p.length; i++) {
      const [x0, z0] = p[i];
      const [x1, z1] = p[(i + 1) % p.length];
      const l = Math.hypot(x1 - x0, z1 - z0);
      if (l > mejor.l) mejor = { l, ux: (x1 - x0) / l, uz: (z1 - z0) / l };
    }
    const [cx, cz] = j.centro;
    const rumbo = Math.atan2(mejor.uz, -mejor.ux);
    const sep = Math.min(2.5, Math.sqrt(j.area) / 3);
    suelto('columpio', columpio(), { x: cx - mejor.ux * sep, z: cz - mejor.uz * sep, rumbo }, [2.8, 2.2, 1.8]);
    suelto('tobogan', tobogan(), { x: cx + mejor.ux * sep, z: cz + mejor.uz * sep, rumbo }, [1.1, 2.1, 3.4]);
  }

  // Números de portal: placas instanciadas con un atlas de los números que hay
  const portales = datos.portales ?? [];
  if (portales.length) {
    const textos = [...new Set(portales.map((p) => p.texto))];
    const atlas = atlasNumeros(textos);
    const geo = new THREE.PlaneGeometry(0.2, 0.14);
    geo.setAttribute('aCasilla', new THREE.InstancedBufferAttribute(new Float32Array(portales.length * 2), 2));
    const mat = new THREE.MeshLambertMaterial({ map: atlas.textura });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTamCasilla = { value: atlas.tam };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          attribute vec2 aCasilla;
          uniform vec2 uTamCasilla;`)
        .replace('#include <uv_vertex>', `#include <uv_vertex>
          vMapUv = vMapUv * uTamCasilla + aCasilla;`);
    };
    mat.customProgramCacheKey = () => 'numeros_portal';
    const malla = new THREE.InstancedMesh(geo, mat, portales.length);
    malla.name = 'numeros_portal';
    const casillas = geo.attributes.aCasilla;
    portales.forEach((p, i) => {
      q.setFromAxisAngle(Y, p.rumbo);
      malla.setMatrixAt(i, m4.compose(new THREE.Vector3(p.x, p.y, p.z), q, uno));
      casillas.setXY(i, ...atlas.casillas.get(p.texto));
    });
    malla.userData.sinSombra = true;
    malla.computeBoundingSphere();
    raiz.add(malla);
  }

  return { raiz, cantidad: Object.fromEntries(Object.entries(datos).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length])) };
}
