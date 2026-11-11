// Elementos singulares modelados a mano (datos en src/datos/singulares.js): el campanario de la
// Parroquia de la Asunción, el pino piñonero de la entrada y la fachada este y la terraza de
// la Sala de Cultura. Texturas procedurales en <canvas> (ladrillo, bloque, celosía, rótulo) con
// relieve (bumpMap) y UV en metros; materiales PBR con luz, como los edificios.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SINGULARES, ZONAS_SIN_MUROS } from '../datos/singulares.js';
import { enZonaCasas } from '../datos/casas.js';
import { registraEstatico } from '../fisica/fisica.js';

// ---------- Texturas de canvas
export function lienzo(lado) {
  const c = document.createElement('canvas');
  c.width = c.height = lado;
  return [c, c.getContext('2d')];
}

export function texturas(color, bump, metros, anisotropia = 8) {
  const map = new THREE.CanvasTexture(color);
  map.colorSpace = THREE.SRGBColorSpace;
  const bumpMap = bump ? new THREE.CanvasTexture(bump) : null;
  for (const t of [map, bumpMap].filter(Boolean)) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / metros, 1 / metros);
    t.anisotropy = anisotropia;
  }
  return { map, bumpMap };
}

// Aparejo de soga: ladrillo de 24 × 5 cm con llaga de 1 cm (el lienzo cubre 1,2 × 1,2 m)
export function texturaLadrillo(base, mortero = '#cfc6b4') {
  const lado = 1024;
  const m = 1.2;
  const px = lado / m;
  const [c, g] = lienzo(lado);
  const [cb, gb] = lienzo(lado);
  g.fillStyle = mortero; g.fillRect(0, 0, lado, lado);
  gb.fillStyle = '#000'; gb.fillRect(0, 0, lado, lado);
  const alto = 0.06 * px; const largo = 0.25 * px; const junta = 0.01 * px;
  const col = new THREE.Color(base);
  let fila = 0;
  for (let y = 0; y < lado; y += alto, fila++) {
    for (let x = -(fila % 2) * largo / 2; x < lado; x += largo) {
      const v = 0.9 + Math.random() * 0.18;
      const t = col.clone().offsetHSL((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.08, 0).multiplyScalar(v);
      g.fillStyle = `#${t.getHexString()}`;
      g.fillRect(x + junta / 2, y + junta / 2, largo - junta, alto - junta);
      gb.fillStyle = '#d0d0d0';
      gb.fillRect(x + junta / 2, y + junta / 2, largo - junta, alto - junta);
    }
  }
  // Grano fino
  const ruido = g.getImageData(0, 0, lado, lado);
  for (let i = 0; i < ruido.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    ruido.data[i] += n; ruido.data[i + 1] += n; ruido.data[i + 2] += n;
  }
  g.putImageData(ruido, 0, 0);
  return texturas(c, cb, m);
}

// Bloque de hormigón blanco de 40 × 20 cm (Sala de Cultura): el lienzo cubre 1,6 × 1,6 m
function texturaBloque() {
  const lado = 1024;
  const m = 1.6;
  const px = lado / m;
  const [c, g] = lienzo(lado);
  const [cb, gb] = lienzo(lado);
  g.fillStyle = '#b9b6ae'; g.fillRect(0, 0, lado, lado);
  gb.fillStyle = '#202020'; gb.fillRect(0, 0, lado, lado);
  const alto = 0.2 * px; const largo = 0.4 * px; const junta = 0.012 * px;
  let fila = 0;
  for (let y = 0; y < lado; y += alto, fila++) {
    for (let x = -(fila % 2) * largo / 2; x < lado; x += largo) {
      const v = Math.round(232 + Math.random() * 14);
      g.fillStyle = `rgb(${v},${v - 2},${v - 7})`;
      g.fillRect(x + junta / 2, y + junta / 2, largo - junta, alto - junta);
      gb.fillStyle = '#c8c8c8';
      gb.fillRect(x + junta / 2, y + junta / 2, largo - junta, alto - junta);
    }
  }
  const ruido = g.getImageData(0, 0, lado, lado);
  for (let i = 0; i < ruido.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 10;
    ruido.data[i] += n; ruido.data[i + 1] += n; ruido.data[i + 2] += n;
  }
  g.putImageData(ruido, 0, 0);
  return texturas(c, cb, m);
}

// Celosía de rombos (rejas plegables de la Sala) sobre vidrio oscuro, con transparencia
function texturaCelosia() {
  const [c, g] = lienzo(256);
  g.fillStyle = 'rgba(20,24,28,0.92)'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#d8d8d4'; g.lineWidth = 5;
  for (let i = -256; i <= 512; i += 32) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke();
    g.beginPath(); g.moveTo(i, 256); g.lineTo(i + 256, 0); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function texturaPavés() {
  const [c, g] = lienzo(128);
  g.fillStyle = '#7f8c93'; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 32) for (let x = 0; x < 128; x += 32) {
    const v = 150 + Math.random() * 40;
    g.fillStyle = `rgb(${v - 20},${v},${v + 12})`;
    g.fillRect(x + 3, y + 3, 26, 26);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function texturaRotulo(texto) {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 192;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = '#3b3d3f';
  g.font = "600 150px 'Century Gothic', 'Futura', 'Avenir', 'Segoe UI', sans-serif";
  g.textBaseline = 'middle';
  g.letterSpacing = '18px';
  g.fillText(texto, 10, 100);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ---------- Utilidades de geometría
// Caja con UV en metros (para texturas que se repiten por metros)
export function caja(sx, sy, sz, x, y, z) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  const uv = g.attributes.uv;
  const escala = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
  for (let cara = 0; cara < 6; cara++) {
    for (let k = 0; k < 4; k++) {
      const i = cara * 4 + k;
      uv.setXY(i, uv.getX(i) * escala[cara][0], uv.getY(i) * escala[cara][1]);
    }
  }
  return g.translate(x, y, z);
}

// Grupo orientado: +x local a lo largo de a→b, origen en a (y = 0 en «y0»)
export function marco(a, b, y0) {
  const ex = b[0] - a[0];
  const ez = b[1] - a[1];
  const largo = Math.hypot(ex, ez);
  const grupo = new THREE.Group();
  grupo.position.set(a[0], y0, a[1]);
  grupo.rotation.y = Math.atan2(-ez / largo, ex / largo);
  return { grupo, largo };
}

export function sombras(obj, proyecta = true) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = proyecta; o.receiveShadow = true; } });
  return obj;
}

// ---------- Campanario
function creaCampanario(datos, terreno, fisica) {
  const [a, b, c] = datos.esquinas;
  const centro = datos.esquinas.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]);
  const sx = Math.hypot(c[0] - b[0], c[1] - b[1]);       // b→c
  const sz = Math.hypot(a[0] - b[0], a[1] - b[1]);       // b→a
  const y0 = terreno.alturaEn(centro[0], centro[1]);
  const grupo = new THREE.Group();
  grupo.name = 'campanario';
  grupo.position.set(centro[0], y0, centro[1]);
  grupo.rotation.y = Math.atan2(-(c[1] - b[1]) / sx, (c[0] - b[0]) / sx);
  const H = datos.alto;
  const ladrillo = texturaLadrillo(datos.ladrillo);
  const matLadrillo = new THREE.MeshStandardMaterial({ ...ladrillo, bumpScale: 1.5, roughness: 0.88 });
  const matLosa = new THREE.MeshStandardMaterial({ color: 0xcdbf9f, roughness: 0.9 });
  const matHierro = new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.45, metalness: 0.6 });
  const pilar = 0.95;
  const hx = sx / 2 - pilar / 2;
  const hz = sz / 2 - pilar / 2;
  const ladrillos = [];
  for (const [px, pz] of [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]]) ladrillos.push(caja(pilar, H, pilar, px, H / 2, pz));
  // Vigas de ladrillo (zunchos) entre pilares bajo cada plataforma y arriba
  const zuncho = (y, alto) => {
    ladrillos.push(caja(sx - 2 * pilar, alto, pilar * 0.8, 0, y, -hz), caja(sx - 2 * pilar, alto, pilar * 0.8, 0, y, hz),
      caja(pilar * 0.8, alto, sz - 2 * pilar, -hx, y, 0), caja(pilar * 0.8, alto, sz - 2 * pilar, hx, y, 0));
  };
  const niveles = [6.0, 11.0, 15.0];
  for (const y of niveles) zuncho(y - 0.45, 0.6);
  // Pie: zócalo de hormigón en cada pilar y suelo de la torre
  const zocalos = [caja(sx - 0.2, 0.16, sz - 0.2, 0, 0.08, 0)];
  for (const [px, pz] of [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]]) zocalos.push(caja(pilar + 0.16, 0.45, pilar + 0.16, px, 0.22, pz));
  grupo.add(new THREE.Mesh(mergeGeometries(zocalos), new THREE.MeshStandardMaterial({ color: 0xb9b3a6, roughness: 0.92 })));
  zuncho(H - 0.5, 1.0);                               // remate
  grupo.add(new THREE.Mesh(mergeGeometries(ladrillos), matLadrillo));
  // Losas, barandillas (la del medio, con aspas) y cubierta
  const losas = [];
  const hierros = [];
  for (const [k, y] of niveles.entries()) {
    losas.push(caja(sx - 0.1, 0.3, sz - 0.1, 0, y - 0.05, 0));
    const lados = [[0, -sz / 2 + 0.05, sx - 2 * pilar, true], [0, sz / 2 - 0.05, sx - 2 * pilar, true],
      [-sx / 2 + 0.05, 0, sz - 2 * pilar, false], [sx / 2 - 0.05, 0, sz - 2 * pilar, false]];
    for (const [cx, cz, largo, enX] of lados) {
      const barra = (lx, ly, lz, x, yy, z) => hierros.push(enX ? caja(lx, ly, lz, x, yy, z) : caja(lz, ly, lx, z, yy, x));
      const u = enX ? cx : cz;
      const v = enX ? cz : cx;
      barra(largo, 0.05, 0.05, u, y + 1.0, v);           // pasamanos
      barra(largo, 0.04, 0.04, u, y + 0.15, v);
      if (k === 1) {
        // Aspas (X) de la plataforma del medio
        const diag = new THREE.BoxGeometry(Math.hypot(largo, 0.85), 0.04, 0.04);
        for (const s of [1, -1]) {
          const d = diag.clone().rotateZ(s * Math.atan2(0.85, largo)).translate(u, y + 0.57, 0);
          if (!enX) d.rotateY(Math.PI / 2);
          d.translate(enX ? 0 : v, 0, enX ? v : 0);
          hierros.push(d);
        }
      } else {
        for (let t = -largo / 2 + 0.12; t < largo / 2; t += 0.12) barra(0.018, 0.85, 0.018, u + t, y + 0.57, v);
      }
    }
  }
  losas.push(caja(sx + 0.2, 0.25, sz + 0.2, 0, H + 0.12, 0));
  grupo.add(new THREE.Mesh(mergeGeometries(losas), matLosa));
  grupo.add(new THREE.Mesh(mergeGeometries(hierros), matHierro));
  // Campana con su yugo
  const perfil = [[0, 0.95], [0.12, 0.93], [0.2, 0.85], [0.24, 0.6], [0.3, 0.3], [0.42, 0.08], [0.45, 0], [0.4, 0.02]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const bronce = new THREE.MeshStandardMaterial({ color: 0x6b5531, roughness: 0.35, metalness: 0.85 });
  const campana = new THREE.Mesh(new THREE.LatheGeometry(perfil, 32), bronce);
  campana.position.set(0, 16.1, 0);
  campana.scale.setScalar(1.15);
  grupo.add(campana);
  const yugo = new THREE.Mesh(caja(sx - 2 * pilar + 0.4, 0.22, 0.22, 0, 17.35, 0), new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.7 }));
  grupo.add(yugo);
  sombras(grupo);
  // Colisión: los cuatro pilares
  if (fisica?.mundo) {
    const { RAPIER, mundo } = fisica;
    grupo.updateMatrixWorld(true);
    for (const [px, pz] of [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]]) {
      const p = new THREE.Vector3(px, H / 2, pz).applyMatrix4(grupo.matrixWorld);
      const q = grupo.quaternion;
      const col = mundo.createCollider(RAPIER.ColliderDesc.cuboid(pilar / 2, H / 2, pilar / 2)
        .setTranslation(p.x, p.y, p.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }));
      registraEstatico(fisica, col, p.x, p.z, pilar);
    }
  }
  return grupo;
}

// ---------- Plaza alta del campanario: murete con barandilla, escalinata y farola fernandina
const HORMIGON = 0xb8b2a4;

// Pieza recta de a a b (caja de largo |ab|) con su base y alto
function tramo(a, b, ancho, y0, alto) {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return caja(l, alto, ancho, 0, alto / 2, 0)
    .rotateY(Math.atan2(-(b[1] - a[1]), b[0] - a[0]))
    .translate((a[0] + b[0]) / 2, y0, (a[1] + b[1]) / 2);
}

function farolaFernandina(x, z, y0, hierro) {
  const g = new THREE.Group();
  g.position.set(x, y0, z);
  const piezas = [
    new THREE.CylinderGeometry(0.2, 0.26, 0.55, 16).translate(0, 0.27, 0),
    new THREE.CylinderGeometry(0.15, 0.2, 0.25, 16).translate(0, 0.66, 0),
    new THREE.CylinderGeometry(0.06, 0.1, 2.6, 12).translate(0, 2.05, 0),
    new THREE.CylinderGeometry(0.11, 0.07, 0.18, 12).translate(0, 3.4, 0),
    new THREE.BoxGeometry(1.3, 0.06, 0.06).translate(0, 3.45, 0),
  ];
  // Volutas de los brazos (medio aro)
  for (const s of [-1, 1]) piezas.push(new THREE.TorusGeometry(0.22, 0.02, 6, 12, Math.PI).rotateZ(s > 0 ? 0 : Math.PI).translate(s * 0.3, 3.25, 0));
  const vidrio = new THREE.MeshStandardMaterial({ color: 0xf2e6c8, roughness: 0.2, emissive: 0x3a3020, transparent: true, opacity: 0.85 });
  for (const s of [-1, 1]) {
    const lx = s * 0.62;
    piezas.push(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8).translate(lx, 3.52, 0));
    piezas.push(new THREE.CylinderGeometry(0.21, 0.13, 0.08, 4).rotateY(Math.PI / 4).translate(lx, 3.6, 0));     // base
    piezas.push(new THREE.ConeGeometry(0.26, 0.24, 4).rotateY(Math.PI / 4).translate(lx, 4.2, 0));               // sombrero
    piezas.push(new THREE.SphereGeometry(0.05, 8, 6).translate(lx, 4.36, 0));
    for (const [ex, ez] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      piezas.push(new THREE.BoxGeometry(0.02, 0.46, 0.02).translate(lx + ex * 0.15, 3.87, ez * 0.15));
    }
    const cristal = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.44, 4, 1, true).rotateY(Math.PI / 4), vidrio);
    cristal.position.set(lx, 3.87, 0);
    g.add(cristal);
  }
  g.add(new THREE.Mesh(mergeGeometries(piezas.map((p) => p.index ? p.toNonIndexed() : p)), hierro));
  return g;
}

function creaPlazaCampanario(datos, terreno, fisica) {
  const raiz = new THREE.Group();
  raiz.name = 'plaza_campanario';
  const centro = datos.esquinas.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]);
  const yPlaza = terreno.alturaEn(centro[0], centro[1]);
  const matHormigon = new THREE.MeshStandardMaterial({ color: HORMIGON, roughness: 0.92 });
  const hierro = new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.45, metalness: 0.6 });
  const hormigon = [];
  const barras = [];
  const colisiones = [];
  // Murete: de la acera (fuera) a 10 cm sobre la plaza, por tramos de 1 m; barandilla encima
  for (const [a, b] of datos.murete) {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / l; const uz = (b[1] - a[1]) / l;
    let nx = -uz; let nz = ux;                                  // hacia fuera (lejos de la torre)
    const mx = (a[0] + b[0]) / 2; const mz = (a[1] + b[1]) / 2;
    if ((mx - centro[0]) * nx + (mz - centro[1]) * nz < 0) { nx = -nx; nz = -nz; }
    const n = Math.max(1, Math.round(l));
    for (let i = 0; i < n; i++) {
      const p0 = [a[0] + ux * l * i / n, a[1] + uz * l * i / n];
      const p1 = [a[0] + ux * l * (i + 1) / n, a[1] + uz * l * (i + 1) / n];
      const pm = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
      const calle = terreno.alturaEn(pm[0] + nx * 0.8, pm[1] + nz * 0.8);
      const dentro = Math.max(terreno.alturaEn(pm[0] - nx * 0.8, pm[1] - nz * 0.8), yPlaza - 0.4);
      const tope = Math.max(dentro + 0.1, calle + 0.45);
      hormigon.push(tramo(p0, p1, 0.3, calle - 0.3, tope - calle + 0.3));
      hormigon.push(tramo(p0, p1, 0.36, tope, 0.06));               // albardilla
      barras.push(tramo(p0, p1, 0.05, tope + 1.0, 0.05), tramo(p0, p1, 0.035, tope + 0.12, 0.035));
      for (let t = 0.06; t < 1; t += 0.12) {
        const q = [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
        barras.push(new THREE.BoxGeometry(0.016, 0.9, 0.016).translate(q[0], tope + 0.57, q[1]));
      }
      barras.push(new THREE.BoxGeometry(0.05, 1.04, 0.05).translate(p0[0], tope + 0.52, p0[1]));
      colisiones.push({ p: pm, l: l / n, ang: Math.atan2(ux, uz), y: (calle + tope) / 2, alto: tope - calle + 1.1 });
    }
  }
  // Escalinata al sur: peldaños de la plaza alta a la de la iglesia
  const e = datos.escalinata;
  const yAbajo = terreno.alturaEn(e.x, e.z + e.peldanos * e.huella + 0.5);
  const contra = Math.max(0.08, (yPlaza - yAbajo) / (e.peldanos + 1));
  for (let i = 0; i < e.peldanos; i++) {
    const z0 = e.z + i * e.huella;
    const y = yPlaza - (i + 1) * contra;
    const base = Math.min(y, terreno.alturaEn(e.x, z0 + e.huella)) - 0.3;
    hormigon.push(caja(e.ancho, y - base, e.huella + 0.02, e.x, base + (y - base) / 2, z0 + e.huella / 2));
    hormigon.push(caja(e.ancho, 0.03, 0.05, e.x, y + 0.015, z0 + 0.025));   // canto del peldaño
  }
  raiz.add(new THREE.Mesh(mergeGeometries(hormigon), matHormigon));
  raiz.add(new THREE.Mesh(mergeGeometries(barras), hierro));
  const [fx, fz] = datos.farola;
  raiz.add(farolaFernandina(fx, fz, terreno.alturaEn(fx, fz), hierro));
  sombras(raiz);
  if (fisica?.mundo) {
    const { RAPIER, mundo } = fisica;
    for (const c of colisiones) {
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.ang);
      const col = mundo.createCollider(RAPIER.ColliderDesc.cuboid(0.18, c.alto / 2, c.l / 2)
        .setTranslation(c.p[0], c.y + 0.5, c.p[1]).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }));
      registraEstatico(fisica, col, c.p[0], c.p[1], c.l / 2);
    }
    const col = mundo.createCollider(RAPIER.ColliderDesc.cylinder(2, 0.22).setTranslation(fx, terreno.alturaEn(fx, fz) + 2, fz));
    registraEstatico(fisica, col, fx, fz, 0.3);
  }
  return raiz;
}

// ---------- Pino piñonero
// Penacho de acículas: haces de agujas en abanico desde el centro (canvas con transparencia)
function texturaAciculas() {
  const [c, g] = lienzo(256);
  g.clearRect(0, 0, 256, 256);
  let s = 3;
  const azar = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 420; i++) {
    const ang = azar() * Math.PI * 2;
    const largo = 40 + azar() * 80;
    const x0 = 128 + (azar() - 0.5) * 40;
    const y0 = 128 + (azar() - 0.5) * 40;
    const v = 70 + azar() * 90;
    g.strokeStyle = `rgba(${v * 0.45 | 0},${v | 0},${v * 0.35 | 0},0.95)`;
    g.lineWidth = 1.2 + azar() * 1.6;
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo(x0 + Math.cos(ang + 0.3) * largo * 0.5, y0 + Math.sin(ang + 0.3) * largo * 0.5,
      x0 + Math.cos(ang) * largo, y0 + Math.sin(ang) * largo);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Penachos sobre la superficie de la copa, un poco hacia fuera y mirando hacia fuera: rompen el
// contorno liso y dan el aspecto mullido de la copa del piñonero (más por arriba y el borde)
function penachosPino(copa, azar) {
  const pos = copa.attributes.position;
  const nrm = copa.attributes.normal;
  const idx = copa.index.array;
  const n = 2600;
  const mapa = texturaAciculas();
  const material = new THREE.MeshStandardMaterial({ map: mapa, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9 });
  const malla = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.7, 1.7), material, n);
  malla.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: mapa, alphaTest: 0.45 });
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const z = new THREE.Vector3(0, 0, 1);
  const a = new THREE.Vector3(); const b = new THREE.Vector3(); const c = new THREE.Vector3();
  const p = new THREE.Vector3(); const no = new THREE.Vector3();
  const giro = new THREE.Quaternion();
  const color = new THREE.Color();
  const triangulos = idx.length / 3;
  let puestos = 0;
  for (let intento = 0; puestos < n && intento < n * 4; intento++) {
    const t = Math.floor(azar() * triangulos) * 3;
    a.fromBufferAttribute(pos, idx[t]); b.fromBufferAttribute(pos, idx[t + 1]); c.fromBufferAttribute(pos, idx[t + 2]);
    no.fromBufferAttribute(nrm, idx[t]).normalize();
    if (no.y < -0.3 && azar() < 0.7) continue;                 // por debajo, menos penachos
    let u = azar(); let v = azar();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    p.copy(a).addScaledVector(b.sub(a), u).addScaledVector(c.sub(a), v).addScaledVector(no, 0.15 + azar() * 0.35);
    q.setFromUnitVectors(z, no);
    giro.setFromAxisAngle(no, azar() * Math.PI * 2);
    q.premultiply(giro);
    const escala = 0.7 + azar() * 0.7;
    m4.compose(p, q, new THREE.Vector3(escala, escala, escala));
    malla.setMatrixAt(puestos, m4);
    const arriba = THREE.MathUtils.clamp(no.y * 0.5 + 0.5, 0, 1);
    color.setRGB(0.55 + 0.35 * arriba, 0.6 + 0.4 * arriba, 0.5 + 0.3 * arriba).multiplyScalar(0.8 + azar() * 0.35);
    malla.setColorAt(puestos, color);
    puestos++;
  }
  malla.count = puestos;
  malla.instanceMatrix.needsUpdate = true;
  if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
  malla.name = 'pino_penachos';
  return malla;
}

function creaPino(datos, terreno, fisica) {
  const y0 = terreno.alturaEn(datos.x, datos.z);
  const grupo = new THREE.Group();
  grupo.name = 'pino_centenario';
  grupo.position.set(datos.x, y0 - 0.1, datos.z);
  let s = 7;
  const azar = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const corteza = new THREE.MeshStandardMaterial({ color: 0x5b4a3c, roughness: 0.95 });
  // Tronco inclinado (como el real) que se abre en tres brazos bajo la copa
  const alto = datos.alto;
  const tronco = new THREE.CatmullRomCurve3([[0, 0, 0], [0.5, 2.5, 0.2], [1.3, 5.2, 0.4], [2.0, 7.6, 0.5]]
    .map((p) => new THREE.Vector3(...p)));
  const ramas = [tronco];
  const cruz = new THREE.Vector3(2.0, 7.6, 0.5);
  for (const [dx, dy, dz] of [[4.5, 4.0, 2.2], [-3.2, 4.4, 1.2], [2.2, 4.6, -3.6], [-0.8, 4.2, -2.4]]) {
    ramas.push(new THREE.CatmullRomCurve3([cruz.clone(), cruz.clone().add(new THREE.Vector3(dx * 0.45, dy * 0.6, dz * 0.45)),
      cruz.clone().add(new THREE.Vector3(dx, dy, dz))]));
  }
  const geoRamas = ramas.map((c, i) => {
    const g = new THREE.TubeGeometry(c, 12, i === 0 ? 0.5 : 0.24, 10, false);
    if (i === 0) {
      // Más grueso al pie
      const p = g.attributes.position;
      const v = new THREE.Vector3();
      for (let k = 0; k < p.count; k++) {
        v.fromBufferAttribute(p, k);
        const t = THREE.MathUtils.clamp(v.y / 7.6, 0, 1);
        const eje = c.getPoint(t);
        v.sub(eje).multiplyScalar(1.25 - 0.55 * t).add(eje);
        p.setXYZ(k, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
    }
    return g;
  });
  grupo.add(new THREE.Mesh(mergeGeometries(geoRamas), corteza));
  // Copa en parasol: lóbulos achatados de acículas, más claros arriba y oscuros por debajo
  const lobulos = [];
  const centroCopa = new THREE.Vector3(1.4, alto - 2.6, -0.2);
  const n = 16;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + azar() * 0.4;
    const r = i < 4 ? azar() * 3 : 3 + azar() * (datos.radioCopa - 6.5);
    const radio = 2.8 + azar() * 2.2;
    const g = new THREE.IcosahedronGeometry(radio, 3);
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    for (let k = 0; k < p.count; k++) {
      v.fromBufferAttribute(p, k);
      // Ondulado del borde y aplanado: copa ancha y poco alta
      const rug = 1 + 0.12 * Math.sin(v.x * 2.1 + i) * Math.cos(v.z * 1.9 - i) + 0.08 * Math.sin(v.y * 3.3 + i * 2);
      v.multiplyScalar(rug);
      v.y *= v.y < 0 ? 0.28 : 0.42;
      p.setXYZ(k, v.x, v.y, v.z);
    }
    g.translate(centroCopa.x + Math.cos(ang) * r, centroCopa.y + (azar() - 0.5) * 1.0 - r * 0.05, centroCopa.z + Math.sin(ang) * r);
    lobulos.push(g);
  }
  // Volumen interior con normales suaves (los icosaedros vienen sin índice: se sueldan antes)
  const copa = mergeGeometries(lobulos.map((g) => {
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');                  // las de cara impedirían soldar
    const s = mergeVertices(g);
    s.computeVertexNormals();
    return s;
  }));
  const colores = new Float32Array(copa.attributes.position.count * 3);
  const tono = new THREE.Color();
  const nrm = copa.attributes.normal;
  for (let k = 0; k < nrm.count; k++) {
    const arriba = THREE.MathUtils.clamp(nrm.getY(k) * 0.5 + 0.5, 0, 1);
    tono.setRGB(0.05 + 0.05 * arriba, 0.1 + 0.08 * arriba, 0.045 + 0.03 * arriba);
    colores.set([tono.r, tono.g, tono.b], k * 3);
  }
  copa.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  const matCopa = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  grupo.add(new THREE.Mesh(copa, matCopa));
  grupo.add(penachosPino(copa, azar));
  sombras(grupo);
  if (fisica?.mundo) {
    const { RAPIER, mundo } = fisica;
    const col = mundo.createCollider(RAPIER.ColliderDesc.cylinder(3, 0.6).setTranslation(datos.x + 0.4, y0 + 3, datos.z + 0.1));
    registraEstatico(fisica, col, datos.x, datos.z, 0.6);
  }
  return grupo;
}

// ---------- Sala de Cultura
function creaSalaCultura(datos, terreno) {
  const raiz = new THREE.Group();
  raiz.name = 'sala_cultura';
  const [a, b] = datos.fachada;
  const y0 = terreno.alturaEn((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  const { grupo, largo: L } = marco(a, b, y0);
  raiz.add(grupo);
  const H = datos.alto;
  const bloque = texturaBloque();
  const matBloque = new THREE.MeshStandardMaterial({ ...bloque, bumpScale: 1.2, roughness: 0.85 });
  // +z local mira hacia dentro del edificio (la fachada exterior está en z = 0)
  // Frente con el arco rebajado y los tres óculos
  const frente = new THREE.Shape([[0, 0], [L, 0], [L, H], [0, H]].map((p) => new THREE.Vector2(...p)));
  const a0 = 2.1; const a1 = L - 0.7; const arranque = 1.4; const flecha = 3.2;
  const cuerda = a1 - a0;
  const rArco = (cuerda * cuerda / 4 + flecha * flecha) / (2 * flecha);
  const cy = arranque + flecha - rArco;
  const hueco = new THREE.Path();
  hueco.moveTo(a0, 0);
  hueco.lineTo(a0, arranque);
  const ang0 = Math.atan2(arranque - cy, a0 - (a0 + a1) / 2);
  const ang1 = Math.atan2(arranque - cy, a1 - (a0 + a1) / 2);
  hueco.absarc((a0 + a1) / 2, cy, rArco, ang0, ang1, true);
  hueco.lineTo(a1, 0);
  hueco.lineTo(a0, 0);
  frente.holes.push(hueco);
  for (const u of [3.0, 6.2, 9.4]) {
    if (u > L - 0.6) continue;
    const o = new THREE.Path();
    o.absarc(u, H - 0.75, 0.32, 0, Math.PI * 2, false);
    frente.holes.push(o);
  }
  const geoFrente = new THREE.ExtrudeGeometry(frente, { depth: 0.35, bevelEnabled: false });
  geoFrente.translate(0, 0, -0.02);
  grupo.add(new THREE.Mesh(geoFrente, matBloque));
  // Cornisa clara arriba y los costados del pórtico, techo y fondo
  const piezas = [caja(L + 0.1, 0.25, 0.5, L / 2, H + 0.1, 0.2), caja(0.3, H, datos.fondoPortico, 0.15, H / 2, datos.fondoPortico / 2),
    caja(0.3, H, datos.fondoPortico, L - 0.15, H / 2, datos.fondoPortico / 2),
    caja(L, 0.3, datos.fondoPortico, L / 2, H - 0.15, datos.fondoPortico / 2),
    caja(L, H, 0.2, L / 2, H / 2, datos.fondoPortico + 0.05)];
  grupo.add(new THREE.Mesh(mergeGeometries(piezas), matBloque));
  // Óculos: vidrio oscuro al fondo de cada hueco
  const vidrio = new THREE.MeshStandardMaterial({ color: 0x1a2025, roughness: 0.15, metalness: 0.3 });
  for (const u of [3.0, 6.2, 9.4]) {
    if (u > L - 0.6) continue;
    const o = new THREE.Mesh(new THREE.CircleGeometry(0.32, 24), vidrio);
    o.position.set(u, H - 0.75, 0.3);
    o.rotation.y = Math.PI;
    grupo.add(o);
  }
  // Fondo del pórtico: tres puertas de celosía plegable
  const celosia = texturaCelosia();
  celosia.repeat.set(1.5, 3);
  const matCelosia = new THREE.MeshStandardMaterial({ map: celosia, roughness: 0.4, metalness: 0.5 });
  const anchoPuerta = Math.min(1.9, (cuerda - 1.2) / 3);
  for (let k = 0; k < 3; k++) {
    const u = a0 + 0.6 + anchoPuerta / 2 + k * (anchoPuerta + 0.3);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(anchoPuerta, 3.1), matCelosia);
    p.position.set(u, 1.55, datos.fondoPortico - 0.06);
    p.rotation.y = Math.PI;
    grupo.add(p);
  }
  // Columna de pavés a la izquierda del arco
  const pav = texturaPavés();
  pav.repeat.set(1, 18);
  const pavés = new THREE.Mesh(new THREE.PlaneGeometry(0.55, H - 1.0), new THREE.MeshStandardMaterial({ map: pav, roughness: 0.2 }));
  pavés.position.set(1.15, (H - 1.0) / 2 + 0.1, -0.03);
  pavés.rotation.y = Math.PI;
  grupo.add(pavés);
  // Rótulo
  const rotulo = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 0.6), new THREE.MeshStandardMaterial({
    map: texturaRotulo('SALA DE CULTURA'), transparent: true, alphaTest: 0.3, roughness: 0.6, metalness: 0.2,
  }));
  rotulo.position.set(L - 0.6 - 3.2, arranque + flecha + 0.55, -0.04);
  rotulo.rotation.y = Math.PI;
  grupo.add(rotulo);
  // Dos barricas de vino a la entrada
  const barrica = new THREE.MeshStandardMaterial({ color: 0x7a4a2a, roughness: 0.7 });
  for (const u of [a0 + 0.6, a1 - 0.5]) {
    const g = new THREE.CylinderGeometry(0.33, 0.33, 0.9, 16);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const f = 1 + 0.12 * Math.cos((p.getY(k) / 0.45) * Math.PI / 2);
      p.setX(k, p.getX(k) * f); p.setZ(k, p.getZ(k) * f);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, barrica);
    m.position.set(u, 0.45, 0.7);
    grupo.add(m);
  }
  sombras(grupo);

  // Terraza al sur con pérgola, sobre pilares en el talud del canal
  const [t0, t1] = datos.terraza;
  const yT = y0 + 0.1;
  const { grupo: terraza, largo: LT } = marco(t0, t1, yT);
  raiz.add(terraza);
  const F = datos.fondoTerraza;
  const matSuelo = new THREE.MeshStandardMaterial({ color: 0xcfcac0, roughness: 0.9 });
  const matHierro = new THREE.MeshStandardMaterial({ color: 0x2c2f31, roughness: 0.5, metalness: 0.6 });
  const matLona = new THREE.MeshStandardMaterial({ color: 0x1d2022, roughness: 0.8, side: THREE.DoubleSide });
  // −z local = hacia el canal (fuera)
  const losa = caja(LT, 0.3, F, LT / 2, -0.15, -F / 2);
  const pilares = [];
  const hierro = [];
  terraza.updateMatrixWorld(true);
  const enMundo = (u, w) => new THREE.Vector3(u, 0, w).applyMatrix4(terraza.matrixWorld);
  for (let u = 0.3; u <= LT - 0.2; u += 3.2) {
    const p = enMundo(u, -F + 0.3);
    const suelo = terreno.alturaEn(p.x, p.z) - yT;
    const alto = -suelo;
    if (alto > 0.3) pilares.push(caja(0.35, alto, 0.35, u, suelo + alto / 2 - 0.3, -F + 0.3));
  }
  // Barandilla del borde y de los extremos: pasamanos, barrotes y malla
  const barandilla = (u0, w0, u1, w1) => {
    const l = Math.hypot(u1 - u0, w1 - w0);
    const ang = Math.atan2(-(w1 - w0), u1 - u0);
    const pon = (g) => g.rotateY(ang).translate(u0, 0, w0);
    hierro.push(pon(caja(l, 0.05, 0.05, l / 2, 1.0, 0)), pon(caja(l, 0.04, 0.04, l / 2, 0.1, 0)));
    for (let t = 0.05; t <= l; t += 0.11) hierro.push(pon(caja(0.016, 0.9, 0.016, t, 0.55, 0)));
    for (let t = 0; t <= l; t += 2) hierro.push(pon(caja(0.06, 1.05, 0.06, t, 0.52, 0)));
  };
  barandilla(0, -F, LT, -F);
  barandilla(0, 0, 0, -F);
  barandilla(LT, 0, LT, -F);
  // Pérgola: postes en el borde y lona oscura a 3,2 m
  for (let u = 0.2; u <= LT; u += 4.2) hierro.push(caja(0.09, 3.2, 0.09, u, 1.6, -F + 0.15));
  hierro.push(caja(LT, 0.12, 0.12, LT / 2, 3.2, -F + 0.15), caja(LT, 0.12, 0.12, LT / 2, 3.2, -0.1));
  for (let u = 0.2; u <= LT; u += 2.1) hierro.push(caja(0.08, 0.08, F, u, 3.2, -F / 2));
  terraza.add(new THREE.Mesh(mergeGeometries([losa, ...pilares]), matSuelo));
  terraza.add(new THREE.Mesh(mergeGeometries(hierro), matHierro));
  const lona = new THREE.Mesh(new THREE.PlaneGeometry(LT, F).rotateX(-Math.PI / 2).translate(LT / 2, 3.28, -F / 2), matLona);
  terraza.add(lona);
  sombras(terraza);
  return raiz;
}

export function creaSingulares(terreno, fisica) {
  const raiz = new THREE.Group();
  raiz.name = 'singulares';
  raiz.add(creaCampanario(SINGULARES.campanario, terreno, fisica));
  raiz.add(creaPlazaCampanario(SINGULARES.campanario, terreno, fisica));
  raiz.add(creaPino(SINGULARES.pino, terreno, fisica));
  raiz.add(creaSalaCultura(SINGULARES.salaCultura, terreno));
  return raiz;
}

// Quita las vallas de muros.json que no existen (al pie del campanario) y los muros y vallas de
// delante de las casas modeladas a mano (los pone casas.js)
export function sinMurosSustituidos(datos) {
  if (!datos?.muros) return datos;
  const fuera = (w) => (w.t === 'valla' && ZONAS_SIN_MUROS.some((zona) =>
    w.p.some(([x, z]) => Math.hypot(x - zona.x, z - zona.z) < zona.radio)))
    || enZonaCasas((w.p[0][0] + w.p[w.p.length - 1][0]) / 2, (w.p[0][1] + w.p[w.p.length - 1][1]) / 2);
  return { ...datos, muros: datos.muros.filter((w) => !fuera(w)) };
}

// Quita del LiDAR el árbol genérico que sustituye el pino modelado y los de delante de las casas
// modeladas a mano (en San Isidro, casas.js pone los árboles de bola de las fotos)
export function sinArbolesSustituidos(datos) {
  const { x, z } = SINGULARES.pino;
  return { ...datos, arboles: datos.arboles.filter(([ax, az]) => Math.hypot(ax - x, az - z) > 3 && !enZonaCasas(ax, az)) };
}
