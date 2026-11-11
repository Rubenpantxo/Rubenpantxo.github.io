// Casas modeladas a mano (datos en src/datos/casas.js: San Isidro, San Roque y plaza del Ayuntamiento): fachadas con huecos de verdad
// (ventanas con marco, vidrio, persiana y alféizar; puertas, portones), zócalos, porches,
// terrazas, escaleras, balcones, tejados de teja con aleros, placas solares y chimeneas, vallas
// de murete con forja, setos y árboles de bola. Texturas procedurales en <canvas> con relieve y
// UV en metros; materiales PBR con luz, como los edificios. Todas las casas comparten
// materiales y cada fila se junta en una malla por material.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FILAS_CASAS } from '../datos/casas.js';
import { registraEstatico } from '../fisica/fisica.js';
import { caja, lienzo, sombras, texturaLadrillo, texturas } from './singulares.js';

const GROSOR_FACHADA = 0.25;

// ---------- Texturas de canvas
function azarDe(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function grano(g, lado, fuerza, azar) {
  const im = g.getImageData(0, 0, lado, lado);
  for (let i = 0; i < im.data.length; i += 4) {
    const n = (azar() - 0.5) * fuerza;
    im.data[i] += n; im.data[i + 1] += n; im.data[i + 2] += n;
  }
  g.putImageData(im, 0, 0);
}

function hex(c) { return `#${c.getHexString()}`; }

// Enfoscado neutro (el color lo pone el material): manchas suaves y grano; 2 × 2 m
function texEnfoscado() {
  const lado = 512;
  const azar = azarDe(11);
  const [c, g] = lienzo(lado);
  const [cb, gb] = lienzo(lado);
  g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, lado, lado);
  for (let i = 0; i < 90; i++) {
    const r = 20 + azar() * 70;
    g.fillStyle = azar() > 0.5 ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.04)';
    g.beginPath(); g.arc(azar() * lado, azar() * lado, r, 0, Math.PI * 2); g.fill();
  }
  grano(g, lado, 12, azar);
  gb.fillStyle = '#808080'; gb.fillRect(0, 0, lado, lado);
  grano(gb, lado, 90, azar);
  return texturas(c, cb, 2.0);
}

// Aplacado de piedra irregular a hiladas (beige y ocre), juntas grises; 1,6 × 1,6 m
function texPiedra(tonos = ['#d9c7a5', '#cdb893', '#e2d3b5', '#c9b08a', '#d6c09c', '#bfa889', '#e0cfae', '#c2a985']) {
  const lado = 1024;
  const m = 1.6;
  const px = lado / m;
  const azar = azarDe(23);
  const [c, g] = lienzo(lado);
  const [cb, gb] = lienzo(lado);
  g.fillStyle = '#8f857a'; g.fillRect(0, 0, lado, lado);
  gb.fillStyle = '#000'; gb.fillRect(0, 0, lado, lado);
  const junta = 0.012 * px;
  let y = 0;
  while (y < lado) {
    let alto = (0.08 + azar() * 0.14) * px;
    if (y + alto > lado - 0.06 * px) alto = lado - y;          // la última hilada cierra el lienzo
    let x = -azar() * 0.3 * px;
    while (x < lado) {
      let ancho = (0.18 + azar() * 0.38) * px;
      if (x + ancho > lado - 0.12 * px && x + ancho < lado + 0.12 * px) ancho = lado - x;
      const t = new THREE.Color(tonos[Math.floor(azar() * tonos.length)]).offsetHSL(0, 0, (azar() - 0.5) * 0.06);
      const grad = g.createLinearGradient(0, y, 0, y + alto);
      grad.addColorStop(0, hex(t.clone().multiplyScalar(1.06)));
      grad.addColorStop(1, hex(t.clone().multiplyScalar(0.9)));
      g.fillStyle = grad;
      g.fillRect(x + junta / 2, y + junta / 2, ancho - junta, alto - junta);
      const v = Math.round(150 + azar() * 90);
      gb.fillStyle = `rgb(${v},${v},${v})`;
      gb.fillRect(x + junta / 2, y + junta / 2, ancho - junta, alto - junta);
      x += ancho;
    }
    y += alto;
  }
  grano(g, lado, 22, azar);
  grano(gb, lado, 40, azar);
  return texturas(c, cb, m);
}

// Baldosa cuadrada con junta (terraza roja de barro o gris de exterior)
function texBaldosa(base, junta, lado_m, metros) {
  const lado = 512;
  const px = lado / metros;
  const azar = azarDe(31);
  const [c, g] = lienzo(lado);
  const [cb, gb] = lienzo(lado);
  g.fillStyle = junta; g.fillRect(0, 0, lado, lado);
  gb.fillStyle = '#000'; gb.fillRect(0, 0, lado, lado);
  const n = Math.round(metros / lado_m);
  const t = lado / n;
  const j = 0.006 * px;
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
    g.fillStyle = hex(new THREE.Color(base).offsetHSL(0, 0, (azar() - 0.5) * 0.05));
    g.fillRect(i * t + j, k * t + j, t - 2 * j, t - 2 * j);
    gb.fillStyle = '#c0c0c0'; gb.fillRect(i * t + j, k * t + j, t - 2 * j, t - 2 * j);
  }
  grano(g, lado, 14, azar);
  return texturas(c, cb, metros);
}

function texLiso(base, metros, fuerza, semilla) {
  const lado = 256;
  const azar = azarDe(semilla);
  const [c, g] = lienzo(lado);
  const [cb, gb] = lienzo(lado);
  g.fillStyle = base; g.fillRect(0, 0, lado, lado);
  grano(g, lado, fuerza, azar);
  gb.fillStyle = '#808080'; gb.fillRect(0, 0, lado, lado);
  grano(gb, lado, 60, azar);
  return texturas(c, cb, metros);
}

// Tablas de madera (vertical u horizontal) con veta y juntas oscuras
function texTablas(base, anchoTabla, vertical, semilla) {
  const lado = 512;
  const m = 1.2;
  const px = lado / m;
  const azar = azarDe(semilla);
  const [c, g] = lienzo(lado);
  const [cb, gb] = lienzo(lado);
  const col = new THREE.Color(base);
  const n = Math.round(m / anchoTabla);
  const t = lado / n;
  for (let i = 0; i < n; i++) {
    const tono = col.clone().offsetHSL(0, (azar() - 0.5) * 0.05, (azar() - 0.5) * 0.06);
    g.fillStyle = hex(tono);
    gb.fillStyle = '#b0b0b0';
    if (vertical) { g.fillRect(i * t, 0, t, lado); gb.fillRect(i * t, 0, t, lado); } else { g.fillRect(0, i * t, lado, t); gb.fillRect(0, i * t, lado, t); }
    // veta
    g.strokeStyle = hex(tono.clone().multiplyScalar(0.8));
    g.lineWidth = 1;
    for (let k = 0; k < 7; k++) {
      const o = i * t + azar() * t;
      g.beginPath();
      for (let s = 0; s <= lado; s += 16) {
        const d = Math.sin(s * 0.02 + k * 3.1 + i) * 2.5;
        if (vertical) { if (s === 0) g.moveTo(o + d, s); else g.lineTo(o + d, s); } else if (s === 0) g.moveTo(s, o + d); else g.lineTo(s, o + d);
      }
      g.stroke();
    }
    // junta
    g.fillStyle = hex(col.clone().multiplyScalar(0.35));
    gb.fillStyle = '#000';
    const j = Math.max(2, 0.006 * px);
    if (vertical) { g.fillRect(i * t, 0, j, lado); gb.fillRect(i * t, 0, j, lado); } else { g.fillRect(0, i * t, lado, j); gb.fillRect(0, i * t, lado, j); }
  }
  grano(g, lado, 10, azar);
  return texturas(c, cb, m);
}

// Puerta seccional: paneles horizontales de 50 cm con acanaladuras
function texSeccional(base) {
  const lado = 512;
  const m = 1.0;
  const azar = azarDe(41);
  const [c, g] = lienzo(lado);
  const [cb, gb] = lienzo(lado);
  const col = new THREE.Color(base);
  g.fillStyle = base; g.fillRect(0, 0, lado, lado);
  gb.fillStyle = '#909090'; gb.fillRect(0, 0, lado, lado);
  for (let y = 0; y < lado; y += lado / 2) {
    g.fillStyle = hex(col.clone().multiplyScalar(0.45)); g.fillRect(0, y, lado, 5);
    gb.fillStyle = '#000'; gb.fillRect(0, y, lado, 5);
    for (const f of [0.3, 0.62]) {
      g.fillStyle = hex(col.clone().multiplyScalar(0.8)); g.fillRect(0, y + f * lado / 2, lado, 3);
      gb.fillStyle = '#404040'; gb.fillRect(0, y + f * lado / 2, lado, 3);
    }
  }
  // veta horizontal suave
  g.globalAlpha = 0.15;
  for (let k = 0; k < 120; k++) {
    g.fillStyle = azar() > 0.5 ? '#000' : '#fff';
    g.fillRect(0, azar() * lado, lado, 1);
  }
  g.globalAlpha = 1;
  return texturas(c, cb, m);
}

// Chapa grecada vertical (portón metálico)
function texChapa(base) {
  const lado = 256;
  const [c, g] = lienzo(lado);
  const [cb, gb] = lienzo(lado);
  const col = new THREE.Color(base);
  for (let x = 0; x < lado; x++) {
    const f = 0.5 + 0.5 * Math.sin((x / lado) * Math.PI * 2 * 8);
    g.fillStyle = hex(col.clone().multiplyScalar(0.8 + 0.3 * f)); g.fillRect(x, 0, 1, lado);
    const v = Math.round(60 + 160 * f);
    gb.fillStyle = `rgb(${v},${v},${v})`; gb.fillRect(x, 0, 1, lado);
  }
  return texturas(c, cb, 1.0);
}

// Lamas de persiana (5 cm) o de contraventana
function texPersiana(base) {
  const lado = 256;
  const m = 0.5;
  const [c, g] = lienzo(lado);
  const [cb, gb] = lienzo(lado);
  const col = new THREE.Color(base);
  const n = 10;
  const t = lado / n;
  for (let i = 0; i < n; i++) {
    const grad = g.createLinearGradient(0, i * t, 0, (i + 1) * t);
    grad.addColorStop(0, hex(col.clone().multiplyScalar(1.08)));
    grad.addColorStop(0.85, hex(col.clone().multiplyScalar(0.9)));
    grad.addColorStop(1, hex(col.clone().multiplyScalar(0.55)));
    g.fillStyle = grad; g.fillRect(0, i * t, lado, t);
    const gr = gb.createLinearGradient(0, i * t, 0, (i + 1) * t);
    gr.addColorStop(0, '#d0d0d0'); gr.addColorStop(0.85, '#909090'); gr.addColorStop(1, '#000');
    gb.fillStyle = gr; gb.fillRect(0, i * t, lado, t);
  }
  return texturas(c, cb, m);
}

// Teja mixta: columnas de 20 cm, hiladas de 25 cm, con la sombra del labio de la hilada de arriba
function texTeja(base, semilla) {
  const lado = 512;
  const azar = azarDe(semilla);
  const [c, g] = lienzo(lado);
  const [cb, gb] = lienzo(lado);
  const col = new THREE.Color(base);
  const cols = 5; const filas = 4;
  const tw = lado / cols; const th = lado / filas;
  for (let f = 0; f < filas; f++) {
    for (let k = 0; k < cols; k++) {
      const x0 = k * tw; const y0 = f * th;
      let tono = col.clone().offsetHSL((azar() - 0.5) * 0.02, (azar() - 0.5) * 0.06 - 0.03, (azar() - 0.5) * 0.08);
      if (azar() < 0.08) tono = tono.multiplyScalar(0.78);                     // teja más vieja
      const grad = g.createLinearGradient(x0, 0, x0 + tw, 0);
      grad.addColorStop(0, hex(tono.clone().multiplyScalar(0.55)));
      grad.addColorStop(0.18, hex(tono.clone().multiplyScalar(0.85)));
      grad.addColorStop(0.5, hex(tono.clone().multiplyScalar(1.05)));
      grad.addColorStop(0.82, hex(tono.clone().multiplyScalar(0.85)));
      grad.addColorStop(1, hex(tono.clone().multiplyScalar(0.5)));
      g.fillStyle = grad; g.fillRect(x0, y0, tw, th);
      const gr = gb.createLinearGradient(x0, 0, x0 + tw, 0);
      gr.addColorStop(0, '#000'); gr.addColorStop(0.5, '#fff'); gr.addColorStop(1, '#000');
      gb.fillStyle = gr; gb.fillRect(x0, y0, tw, th);
      // líquenes y manchas
      for (let s = 0; s < 4; s++) {
        g.fillStyle = azar() > 0.5 ? 'rgba(60,50,30,0.18)' : 'rgba(200,190,150,0.15)';
        g.beginPath(); g.arc(x0 + azar() * tw, y0 + azar() * th, 2 + azar() * 6, 0, Math.PI * 2); g.fill();
      }
    }
    // sombra del labio de la hilada de arriba y canto claro del labio propio
    const sombra = g.createLinearGradient(0, f * th, 0, f * th + th * 0.22);
    sombra.addColorStop(0, 'rgba(20,10,5,0.55)'); sombra.addColorStop(1, 'rgba(20,10,5,0)');
    g.fillStyle = sombra; g.fillRect(0, f * th, lado, th * 0.22);
    g.fillStyle = 'rgba(255,240,220,0.12)'; g.fillRect(0, (f + 1) * th - 5, lado, 5);
    gb.fillStyle = 'rgba(0,0,0,0.6)'; gb.fillRect(0, f * th, lado, th * 0.12);
  }
  grano(g, lado, 14, azar);
  return texturas(c, cb, 1.0);
}

// Placas: fotovoltaica (celdas) y colector térmico (tubos); UV 0..1 por placa
function texPlaca(tipo) {
  const [c, g] = lienzo(256);
  g.fillStyle = '#b7bcc0'; g.fillRect(0, 0, 256, 256);
  if (tipo === 'fv') {
    g.fillStyle = '#16202c'; g.fillRect(6, 6, 244, 244);
    for (let i = 0; i < 6; i++) for (let k = 0; k < 10; k++) {
      g.fillStyle = (i + k) % 2 ? '#1c2838' : '#1a2534';
      g.fillRect(8 + i * 40.3, 8 + k * 24.2, 38.5, 22.5);
    }
    g.fillStyle = 'rgba(160,175,195,0.25)';
    for (let i = 0; i < 6; i++) g.fillRect(8 + i * 40.3 + 19, 8, 1, 240);
  } else {
    g.fillStyle = '#2b3946'; g.fillRect(6, 6, 244, 244);
    for (let i = 0; i < 14; i++) {
      const grad = g.createLinearGradient(10 + i * 17, 0, 10 + i * 17 + 14, 0);
      grad.addColorStop(0, '#22303c'); grad.addColorStop(0.5, '#6d7f8d'); grad.addColorStop(1, '#22303c');
      g.fillStyle = grad; g.fillRect(10 + i * 17, 10, 14, 236);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Sillares o placas a hiladas regulares (aplacado, sillería imitada en el revoco, losas)
function texSillar(tonos, ancho, alto, metros, junta, colorJunta, semilla, opciones = {}) {
  const lado = 1024;
  const px = lado / metros;
  const azar = azarDe(semilla);
  const [c, g] = lienzo(lado);
  const [cb, gb] = lienzo(lado);
  g.fillStyle = colorJunta; g.fillRect(0, 0, lado, lado);
  gb.fillStyle = '#000'; gb.fillRect(0, 0, lado, lado);
  const filas = Math.round(metros / alto); const th = lado / filas;
  const cols = Math.round(metros / ancho); const tw = lado / cols;
  const j = junta * px;
  for (let f = 0; f < filas; f++) {
    const desfase = opciones.aJunta ? 0 : (f % 2) * tw / 2;
    for (let k = -1; k < cols; k++) {
      const x = k * tw + desfase; const y = f * th;
      const t = new THREE.Color(tonos[Math.floor(azar() * tonos.length)]).offsetHSL(0, 0, (azar() - 0.5) * (opciones.variacion ?? 0.05));
      g.fillStyle = hex(t);
      g.fillRect(x + j / 2, y + j / 2, tw - j, th - j);
      const v = Math.round(170 + azar() * 60);
      gb.fillStyle = `rgb(${v},${v},${v})`; gb.fillRect(x + j / 2, y + j / 2, tw - j, th - j);
      if (opciones.vetas) {
        g.strokeStyle = opciones.vetas; g.lineWidth = 1 + azar() * 1.5; g.globalAlpha = 0.6;
        for (let s = 0; s < 3; s++) {
          g.beginPath();
          let xx = x + azar() * tw; let yy = y;
          g.moveTo(xx, yy);
          for (let p = 0; p < 6; p++) { xx += (azar() - 0.5) * tw * 0.5; yy += th / 6; g.lineTo(xx, yy); }
          g.stroke();
        }
        g.globalAlpha = 1;
      }
    }
  }
  grano(g, lado, opciones.grano ?? 14, azar);
  if (opciones.motas) {
    for (let i = 0; i < 30000; i++) {
      g.fillStyle = azar() > 0.5 ? opciones.motas[0] : opciones.motas[1];
      g.fillRect(azar() * lado, azar() * lado, 2, 2);
    }
  }
  return texturas(c, cb, metros);
}

// Cal vieja: blanco con churretes y manchas de humedad
function texCal() {
  const lado = 512;
  const azar = azarDe(71);
  const [c, g] = lienzo(lado);
  const [cb, gb] = lienzo(lado);
  g.fillStyle = '#f0eee8'; g.fillRect(0, 0, lado, lado);
  for (let i = 0; i < 140; i++) {
    const r = 10 + azar() * 60;
    g.fillStyle = azar() > 0.4 ? 'rgba(120,105,80,0.06)' : 'rgba(255,255,255,0.08)';
    g.beginPath(); g.ellipse(azar() * lado, azar() * lado, r, r * (0.5 + azar()), 0, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 40; i++) {
    const x = azar() * lado; const y = azar() * lado;
    const grad = g.createLinearGradient(0, y, 0, y + 120);
    grad.addColorStop(0, 'rgba(90,80,60,0.12)'); grad.addColorStop(1, 'rgba(90,80,60,0)');
    g.fillStyle = grad; g.fillRect(x, y, 3 + azar() * 6, 120);
  }
  grano(g, lado, 18, azar);
  gb.fillStyle = '#808080'; gb.fillRect(0, 0, lado, lado);
  grano(gb, lado, 120, azar);
  return texturas(c, cb, 2.0);
}

// Cortina de tiras de colores (puerta de verano)
function texCortina() {
  const [c, g] = lienzo(256);
  const tonos = ['#6b4a7a', '#c9b48a', '#7d6b5c', '#e2d6c0', '#4f5f78', '#a7808a', '#d8c7a8'];
  const azar = azarDe(83);
  for (let x = 0; x < 256; x += 6) { g.fillStyle = tonos[Math.floor(azar() * tonos.length)]; g.fillRect(x, 0, 6, 256); }
  g.fillStyle = 'rgba(0,0,0,0.25)';
  for (let x = 0; x < 256; x += 6) g.fillRect(x, 0, 1, 256);
  return texturas(c, null, 1.0);
}

// Hojas de seto o de copa
function texHojas(base, flores) {
  const lado = 256;
  const azar = azarDe(57);
  const [c, g] = lienzo(lado);
  const [cb, gb] = lienzo(lado);
  const col = new THREE.Color(base);
  g.fillStyle = hex(col.clone().multiplyScalar(0.55)); g.fillRect(0, 0, lado, lado);
  gb.fillStyle = '#000'; gb.fillRect(0, 0, lado, lado);
  for (let i = 0; i < 2200; i++) {
    const x = azar() * lado; const y = azar() * lado;
    const l = 0.7 + azar() * 0.6;
    g.fillStyle = hex(col.clone().offsetHSL((azar() - 0.5) * 0.05, 0, (azar() - 0.5) * 0.1).multiplyScalar(l));
    g.beginPath(); g.ellipse(x, y, 2 + azar() * 2.5, 1.2 + azar() * 1.5, azar() * Math.PI, 0, Math.PI * 2); g.fill();
    const v = Math.round(120 + l * 100);
    gb.fillStyle = `rgb(${v},${v},${v})`;
    gb.beginPath(); gb.ellipse(x, y, 2.5, 1.6, 0, 0, Math.PI * 2); gb.fill();
  }
  if (flores) {
    for (let i = 0; i < 500; i++) {
      g.fillStyle = hex(new THREE.Color(flores).offsetHSL(0, 0, (azar() - 0.5) * 0.15));
      g.beginPath(); g.arc(azar() * lado, azar() * lado, 1 + azar() * 1.6, 0, Math.PI * 2); g.fill();
    }
  }
  return texturas(c, cb, 1.0);
}

// ---------- Materiales (compartidos por todas las casas)
const MATERIALES = new Map();
function material(clave, color) {
  const k = color ? `${clave}|${color}` : clave;
  if (MATERIALES.has(k)) return MATERIALES.get(k);
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
  const conTex = (t, o) => std({ map: t.map, bumpMap: t.bumpMap, ...o });
  let m;
  switch (clave) {
    case 'enfoscado': m = conTex(texEnfoscado(), { color: color ?? '#f1efe9', bumpScale: 0.4, roughness: 0.93 }); break;
    case 'enfoscadoGris': m = conTex(texEnfoscado(), { color: '#b9b5ae', bumpScale: 0.4, roughness: 0.93 }); break;
    case 'enfoscadoCrema': m = conTex(texEnfoscado(), { color: '#e8dfcb', bumpScale: 0.4, roughness: 0.93 }); break;
    case 'blanco': m = std({ color: '#f3f2ee', roughness: 0.6 }); break;
    case 'ladrilloCrema': m = conTex(texturaLadrillo('#d6bb92', '#e2d9c6'), { bumpScale: 1.0, roughness: 0.88 }); break;
    case 'ladrilloClaro': m = conTex(texturaLadrillo('#e4d6bd', '#eee7d8'), { bumpScale: 0.9, roughness: 0.88 }); break;
    case 'ladrilloRojo': m = conTex(texturaLadrillo('#b8714a', '#d9ccb6'), { bumpScale: 1.0, roughness: 0.88 }); break;
    case 'ladrilloRustico': m = conTex(texturaLadrillo('#9d5d3f', '#c8b79e'), { bumpScale: 1.2, roughness: 0.9 }); break;
    case 'piedra': m = conTex(texPiedra(), { bumpScale: 1.6, roughness: 0.9 }); break;
    case 'marmol': m = conTex(texLiso('#e8e5dd', 1.0, 10, 3), { bumpScale: 0.2, roughness: 0.45 }); break;
    case 'hormigon': m = conTex(texLiso('#b8b3a9', 1.5, 24, 5), { bumpScale: 0.6, roughness: 0.95 }); break;
    case 'baldosaRoja': m = conTex(texBaldosa('#a65a3d', '#7c5a48', 0.3, 1.2), { bumpScale: 0.6, roughness: 0.8 }); break;
    case 'baldosaGris': m = conTex(texBaldosa('#bdb8ae', '#8e8a83', 0.4, 1.6), { bumpScale: 0.6, roughness: 0.85 }); break;
    case 'madera': m = conTex(texTablas('#8d5c37', 0.12, false, 7), { bumpScale: 0.6, roughness: 0.7 }); break;
    case 'puertaMadera': m = conTex(texTablas('#6a4127', 0.1, true, 9), { bumpScale: 0.6, roughness: 0.6 }); break;
    case 'tablas': m = conTex(texTablas(color, 0.12, true, 13), { bumpScale: 0.8, roughness: 0.7 }); break;
    case 'seccional': m = conTex(texSeccional(color), { bumpScale: 0.8, roughness: 0.6 }); break;
    case 'chapa': m = conTex(texChapa(color), { bumpScale: 0.8, roughness: 0.45, metalness: 0.4 }); break;
    case 'persiana': m = conTex(texPersiana(color), { bumpScale: 0.6, roughness: 0.6 }); break;
    case 'teja': m = conTex(texTeja(color, parseInt(color.slice(1), 16)), { bumpScale: 2.2, roughness: 0.82 }); break;
    case 'seto': m = conTex(texHojas(color ?? '#4a6b2c'), { bumpScale: 1.5, roughness: 0.95 }); break;
    case 'flores': m = conTex(texHojas('#7d8c34', color), { bumpScale: 1.5, roughness: 0.95 }); break;
    case 'fv': m = std({ map: texPlaca('fv'), roughness: 0.25, metalness: 0.3 }); break;
    case 'termico': m = std({ map: texPlaca('termico'), roughness: 0.3, metalness: 0.3 }); break;
    case 'vidrio': m = std({ color: '#1f272d', roughness: 0.06, metalness: 0.7 }); break;
    case 'vidrioCortina': m = std({ color: '#b9b6ad', roughness: 0.3, metalness: 0.2 }); break;
    case 'marcoMadera': m = std({ color: '#6b4529', roughness: 0.6 }); break;
    case 'aluminio': m = std({ color: '#8f9294', roughness: 0.4, metalness: 0.6 }); break;
    case 'hierroNegro': m = std({ color: '#1b1c1e', roughness: 0.5, metalness: 0.5 }); break;
    case 'hierroBlanco': m = std({ color: '#efefec', roughness: 0.5, metalness: 0.2 }); break;
    case 'hierroRojo': m = std({ color: '#a3241e', roughness: 0.5, metalness: 0.3 }); break;
    case 'hierroGranate': m = std({ color: '#7f3a28', roughness: 0.6, metalness: 0.3 }); break;
    case 'plastico': m = std({ color: '#ecebe6', roughness: 0.5 }); break;
    case 'negro': m = std({ color: '#26282a', roughness: 0.7 }); break;
    case 'tierra': m = std({ color: '#5a4a38', roughness: 1 }); break;
    case 'ladrilloMarron': m = conTex(texturaLadrillo('#b47a4e', '#cdb79a'), { bumpScale: 1.0, roughness: 0.88 }); break;
    case 'ladrilloTostado': m = conTex(texturaLadrillo('#b98d66', '#cdbba0'), { bumpScale: 1.0, roughness: 0.88 }); break;
    case 'ladrilloAmarillo': m = conTex(texturaLadrillo('#dbb67a', '#e4d6b8'), { bumpScale: 1.0, roughness: 0.88 }); break;
    case 'ladrilloRosa': m = conTex(texturaLadrillo('#d7a487', '#e6d5c4'), { bumpScale: 1.0, roughness: 0.88 }); break;
    case 'piedraGris': m = conTex(texPiedra(['#8d8a84', '#9b978f', '#7f7c77', '#a6a198', '#8a857c', '#77736d']), { bumpScale: 1.6, roughness: 0.9 }); break;
    case 'azulejoMarron': m = conTex(texSillar(['#8a5a3c', '#946446', '#7f5236', '#9a6a4a'], 0.2, 0.2, 1.2, 0.006, '#d8cfc0', 107,
      { aJunta: true, variacion: 0.06, grano: 8 }), { bumpScale: 0.3, roughness: 0.3, metalness: 0.05 }); break;
    case 'travertino': m = conTex(texSillar(['#d9cbb0', '#d2c3a6', '#ddd0b6'], 0.6, 0.4, 1.8, 0.004, '#c2b394', 109,
      { vetas: '#b8a57f', variacion: 0.03, grano: 10 }), { bumpScale: 0.3, roughness: 0.5 }); break;
    case 'ladrilloRayado': m = conTex(texSillar(['#d9bc8d', '#d3b484', '#dec493', '#cfae7c'], 0.25, 0.055, 1.0, 0.012, '#a88d68', 91, { grano: 26 }),
      { bumpScale: 1.4, roughness: 0.9 }); break;
    case 'sillar': m = conTex(texSillar(['#e3d5b8', '#e6d9bd', '#dfd0b1'], 0.6, 0.3, 1.8, 0.012, '#b9a98a', 93, { variacion: 0.03 }),
      { bumpScale: 0.8, roughness: 0.9 }); break;
    case 'sillarClaro': m = conTex(texSillar(['#e9dcc3', '#e4d5ba', '#ecdfc8'], 0.8, 0.4, 1.6, 0.01, '#c9b99c', 95, { variacion: 0.03 }),
      { bumpScale: 0.6, roughness: 0.85 }); break;
    case 'sillarPiedra': m = conTex(texSillar(['#d8c6a2', '#cdb994', '#e0cfad', '#c4ae88', '#d3bf9b'], 0.42, 0.21, 1.68, 0.014, '#8f8574', 97,
      { variacion: 0.08, grano: 34 }), { bumpScale: 1.8, roughness: 0.92 }); break;
    case 'marmolNegro': m = conTex(texSillar(['#2c3433', '#323b3a', '#283030', '#36403e'], 0.6, 0.6, 1.8, 0.006, '#151918', 99,
      { vetas: '#8e9a98', variacion: 0.05, grano: 8 }), { bumpScale: 0.2, roughness: 0.25, metalness: 0.1 }); break;
    case 'pizarra': m = conTex(texSillar(['#3c4652', '#4a4f55', '#59524a', '#6b5a48', '#333b45', '#7a6a55'], 0.35, 0.22, 1.4, 0.01, '#23272b', 101,
      { variacion: 0.1, grano: 20 }), { bumpScale: 1.2, roughness: 0.6 }); break;
    case 'granito': m = conTex(texSillar(['#8f8c88', '#9a9792', '#86837f'], 0.6, 0.4, 1.8, 0.008, '#5f5d5a', 103,
      { variacion: 0.03, grano: 30, motas: ['#2b2a28', '#d8d6d0'] }), { bumpScale: 0.5, roughness: 0.6 }); break;
    case 'piedraRosa': m = conTex(texSillar(['#d6a99a', '#d0a090', '#dbb1a2'], 0.6, 0.95, 1.8, 0.012, '#f2efe8', 105,
      { variacion: 0.04, aJunta: true, grano: 16 }), { bumpScale: 0.4, roughness: 0.55 }); break;
    case 'uralita': m = conTex(texChapa('#cfc4ad'), { bumpScale: 1.2, roughness: 0.8 }); break;
    case 'cal': m = conTex(texCal(), { bumpScale: 0.8, roughness: 0.95 }); break;
    case 'cortina': m = std({ map: texCortina().map, roughness: 0.9, side: THREE.DoubleSide }); break;
    case 'negra': m = std({ color: '#202224', roughness: 0.45, metalness: 0.4 }); break;
    case 'oscuro': m = std({ color: '#4b423b', roughness: 0.8 }); break;
    case 'sombra': m = std({ color: '#2a2622', roughness: 1 }); break;
    case 'rotulo': {
      const [c, g] = lienzo(1024);
      c.height = 192;
      g.clearRect(0, 0, 1024, 192);
      const [texto, colorTexto, fuente] = color.split('|');
      g.fillStyle = colorTexto;
      g.font = fuente;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(texto, 512, 100);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      m = std({ map: t, transparent: true, alphaTest: 0.35, roughness: 0.5, metalness: 0.2 });
      break;
    }
    case 'tronco': m = std({ color: '#5c4a3a', roughness: 0.95 }); break;
    default: throw new Error(`casas.js: material desconocido «${clave}»`);
  }
  m.name = `casa_${k}`;
  MATERIALES.set(k, m);
  return m;
}

const PERSIANA = { madera: '#6f4a2e', blanca: '#e4e2dc', gris: '#3d4043', crema: '#cdbf9f' };
const CONTRA = { madera: '#7a4f2c', blanca: '#f1f0ec' };
const HIERRO = { negro: 'hierroNegro', blanco: 'hierroBlanco', rojo: 'hierroRojo', granate: 'hierroGranate' };

// ---------- Geometría en coordenadas de la fila: x = u, y, z = −w
class Lote {
  constructor() { this.porMaterial = new Map(); this.y0 = 0; }
  pon(mat, geo) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    for (const nombre of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(nombre)) g.deleteAttribute(nombre);
    g.translate(0, this.y0, 0);
    if (!this.porMaterial.has(mat)) this.porMaterial.set(mat, []);
    this.porMaterial.get(mat).push(g);
  }
  // Caja de u0..u1, y0..y1, w0..w1 (UV en metros)
  caja(mat, u0, u1, y0, y1, w0, w1) {
    if (u1 - u0 < 1e-3 || y1 - y0 < 1e-3 || w1 - w0 < 1e-3) return;
    this.pon(mat, caja(u1 - u0, y1 - y0, w1 - w0, (u0 + u1) / 2, (y0 + y1) / 2, -(w0 + w1) / 2));
  }
  // Barra de sección s entre dos puntos (u, y, w)
  barra(mat, a, b, s) {
    const pa = new THREE.Vector3(a[0], a[1], -a[2]);
    const pb = new THREE.Vector3(b[0], b[1], -b[2]);
    const d = pb.clone().sub(pa);
    const l = d.length();
    if (l < 1e-3) return;
    const g = new THREE.BoxGeometry(s, s, l);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize()));
    g.translate((pa.x + pb.x) / 2, (pa.y + pb.y) / 2, (pa.z + pb.z) / 2);
    this.pon(mat, g);
  }
  mallas() {
    const salida = [];
    for (const [mat, geos] of this.porMaterial) {
      const m = new THREE.Mesh(mergeGeometries(geos), mat);
      m.name = mat.name;
      salida.push(m);
    }
    return salida;
  }
}

// Fachada con huecos: placa de u0..u1 × y0..y1 con la cara a la calle en w y grosor hacia dentro
function placaConHuecos(lote, mat, u0, u1, y0, y1, w, grosor, huecos) {
  const forma = new THREE.Shape([[u0, y0], [u1, y0], [u1, y1], [u0, y1]].map((p) => new THREE.Vector2(...p)));
  for (const h of huecos) {
    const a = Math.max(h.u[0], u0 + 0.03); const b = Math.min(h.u[1], u1 - 0.03);
    const c = Math.max(h.y[0], y0 + 0.03); const d = Math.min(h.y[1], y1 - 0.03);
    if (b - a < 0.05 || d - c < 0.05) continue;
    if (h.t === 'a') {
      // arco de medio punto
      const r = (b - a) / 2;
      const p = new THREE.Path();
      p.moveTo(a, c); p.lineTo(b, c); p.lineTo(b, d - r);
      p.absarc((a + b) / 2, d - r, r, 0, Math.PI, false);
      p.lineTo(a, c);
      forma.holes.push(p);
    } else forma.holes.push(new THREE.Path([[a, c], [a, d], [b, d], [b, c]].map((q) => new THREE.Vector2(...q))));
  }
  const g = new THREE.ExtrudeGeometry(forma, { depth: grosor, bevelEnabled: false });
  g.translate(0, 0, -w - grosor);
  lote.pon(mat, g);
}

function ventana(lote, h, f) {
  const [u0, u1] = h.u; const [y0, y1] = h.y;
  const ancho = u1 - u0; const alto = y1 - y0;
  const marco = h.marco === 'blanco' ? material('blanco') : h.marco === 'aluminio' ? material('aluminio')
    : h.marco === 'negro' ? material('negra') : material('marcoMadera');
  const vid = material(h.cortina ? 'vidrioCortina' : 'vidrio');
  lote.caja(vid, u0, u1, y0, y1, f + 0.13, f + 0.14);
  const e = 0.06;
  lote.caja(marco, u0, u1, y1 - e, y1, f + 0.09, f + 0.15);
  lote.caja(marco, u0, u1, y0, y0 + e, f + 0.09, f + 0.15);
  lote.caja(marco, u0, u0 + e, y0, y1, f + 0.09, f + 0.15);
  lote.caja(marco, u1 - e, u1, y0, y1, f + 0.09, f + 0.15);
  if (ancho > 0.85) lote.caja(marco, (u0 + u1) / 2 - 0.035, (u0 + u1) / 2 + 0.035, y0, y1, f + 0.1, f + 0.15);
  if (alto > 1.6 && !h.sinTravesano) lote.caja(marco, u0, u1, y0 + alto * 0.62 - 0.03, y0 + alto * 0.62 + 0.03, f + 0.1, f + 0.15);
  const p = Math.min(1, h.persiana ?? 0);
  if (p > 0) lote.caja(material('persiana', PERSIANA[h.colorPersiana ?? 'madera']), u0, u1, y1 - alto * p, y1, f + 0.05, f + 0.08);
  // Alféizar (en las puertas balconeras, que llegan al suelo, solo un umbral)
  lote.caja(material('marmol'), u0 - 0.06, u1 + 0.06, y0 - 0.05, y0, f - 0.05, f + 0.12);
  if (h.contra) {
    const cm = material('persiana', CONTRA[h.contra]);
    lote.caja(cm, u0 - ancho / 2 - 0.02, u0 - 0.02, y0, y1, f - 0.035, f - 0.005);
    lote.caja(cm, u1 + 0.02, u1 + ancho / 2 + 0.02, y0, y1, f - 0.035, f - 0.005);
  }
  if (h.reja) {
    const hm = material(HIERRO[h.colorReja ?? 'negro']);
    if (h.reja === 'tijera') {
      // persiana de tijera de comercio: rombos de pletina, metida en el hueco
      const wr = f + 0.04; const paso = 0.24;
      for (const s of [1, -1]) {
        for (let k = -alto; k < ancho + alto; k += paso) {
          // recta u − u0 = s·(y − y0) + k, recortada al hueco
          const pts = [];
          for (const y of [y0, y1]) { const u = u0 + k + s * (y - y0); if (u >= u0 - 1e-6 && u <= u1 + 1e-6) pts.push([u, y]); }
          for (const u of [u0, u1]) { const y = y0 + (u - u0 - k) / s; if (y > y0 && y < y1) pts.push([u, y]); }
          if (pts.length >= 2) lote.barra(hm, [pts[0][0], pts[0][1], wr], [pts[1][0], pts[1][1], wr], 0.018);
        }
      }
      for (let u = u0 + 0.06; u < u1; u += paso / 2) lote.caja(hm, u - 0.01, u + 0.01, y0, y1, wr - 0.01, wr + 0.01);
      lote.caja(hm, u0, u1, y1 - 0.08, y1, wr - 0.02, wr + 0.02);
    } else {
      const wr = f - 0.07;
      for (let u = u0 + 0.08; u < u1 - 0.04; u += 0.12) lote.caja(hm, u - 0.008, u + 0.008, y0, y1, wr - 0.01, wr + 0.006);
      for (const y of [y0 + 0.1, y1 - 0.1]) lote.caja(hm, u0, u1, y - 0.012, y + 0.012, wr - 0.015, wr + 0.01);
      if (h.reja === 'ornamental') {
        const n = Math.max(1, Math.round(ancho / 0.45));
        for (let i = 0; i < n; i++) {
          const u = u0 + (i + 0.5) * ancho / n;
          for (const y of [y0 + alto * 0.3, y0 + alto * 0.7]) {
            lote.pon(hm, new THREE.TorusGeometry(Math.min(0.16, ancho / n / 2.4), 0.012, 6, 20).translate(u, y, -(wr - 0.002)));
          }
        }
      }
    }
  }
}

// Arco abierto (logia, granero): fondo oscuro detrás del hueco y antepecho
function arcoAbierto(lote, h, f) {
  lote.caja(material('sombra'), h.u[0], h.u[1], h.y[0], h.y[1], f + 0.24, f + 0.26);
  lote.caja(material('marmol'), h.u[0] - 0.04, h.u[1] + 0.04, h.y[0] - 0.05, h.y[0], f - 0.04, f + 0.24);
}

function puerta(lote, h, f) {
  const [u0, u1] = h.u; const [y0, y1] = h.y;
  const hoja = h.mat === 'blanca' ? material('blanco') : h.mat === 'negra' ? material('negra') : material('puertaMadera');
  const hojas = h.hojas ?? 1;
  if (h.cortina) {
    lote.caja(material('puertaMadera'), u0, u1, y0, y1, f + 0.2, f + 0.24);
    lote.caja(material('cortina'), u0 + 0.02, u1 - 0.02, y0 + 0.03, y1 - 0.04, f + 0.06, f + 0.08);
    lote.caja(material('marcoMadera'), u0, u1, y1 - 0.06, y1, f + 0.04, f + 0.1);
  } else if (h.vidrio) {
    const e = 0.09;
    lote.caja(material('vidrioCortina'), u0, u1, y0, y1, f + 0.13, f + 0.14);
    lote.caja(hoja, u0, u1, y1 - e, y1, f + 0.09, f + 0.15);
    lote.caja(hoja, u0, u1, y0, y0 + 0.25, f + 0.09, f + 0.15);
    lote.caja(hoja, u0, u0 + e, y0, y1, f + 0.09, f + 0.15);
    lote.caja(hoja, u1 - e, u1, y0, y1, f + 0.09, f + 0.15);
    lote.caja(hoja, (u0 + u1) / 2 - 0.04, (u0 + u1) / 2 + 0.04, y0, y1, f + 0.1, f + 0.15);
  } else {
    lote.caja(hoja, u0, u1, y0, y1, f + 0.1, f + 0.16);
    const a = (u1 - u0) / hojas;
    for (let i = 0; i < hojas; i++) {
      const b0 = u0 + i * a + 0.12; const b1 = u0 + (i + 1) * a - 0.12;
      for (const [c0, c1] of [[y0 + 0.2, y0 + (y1 - y0) * 0.45], [y0 + (y1 - y0) * 0.52, y1 - 0.2]]) lote.caja(hoja, b0, b1, c0, c1, f + 0.085, f + 0.1);
      if (i > 0) lote.caja(material('negro'), u0 + i * a - 0.008, u0 + i * a + 0.008, y0, y1, f + 0.08, f + 0.1);
    }
  }
  const pomo = hojas > 1 ? (u0 + u1) / 2 + 0.08 : u1 - 0.12;
  lote.caja(material('aluminio'), pomo - 0.06, pomo + 0.06, y0 + 1.0, y0 + 1.03, f + 0.04, f + 0.08);
  lote.caja(material('marmol'), u0 - 0.04, u1 + 0.04, y0 - 0.03, y0, f - 0.06, f + 0.16);
}

function garaje(lote, h, f) {
  const [u0, u1] = h.u; const [y0, y1] = h.y;
  const m = material(h.tipo ?? 'tablas', h.color ?? '#6b4128');
  lote.caja(m, u0, u1, y0, y1, f + 0.1, f + 0.15);
  if ((h.tipo ?? 'tablas') === 'tablas') {
    lote.caja(material('negro'), (u0 + u1) / 2 - 0.01, (u0 + u1) / 2 + 0.01, y0, y1, f + 0.09, f + 0.1);
    for (const s of [-1, 1]) lote.caja(material('hierroNegro'), (u0 + u1) / 2 + s * 0.12 - 0.015, (u0 + u1) / 2 + s * 0.12 + 0.015, y0 + 0.95, y0 + 1.15, f + 0.06, f + 0.09);
  }
}

// ---------- Elementos de la casa
function cuerpo(lote, c) {
  const m = material(c.mat, c.color);
  const mf = c.matFachada ? material(c.matFachada, c.color) : m;
  const [u0, u1] = c.u; const [f, fondo] = c.w;
  const base = c.desde ?? -0.5;
  const huecos = c.huecos ?? [];
  if (mf === m) placaConHuecos(lote, mf, u0, u1, base, c.alto, f, GROSOR_FACHADA, huecos);
  else {
    // Fachada de otro material (porche de ladrillo rústico, aplacado): los cantos, del cuerpo
    placaConHuecos(lote, mf, u0 + 0.02, u1 - 0.02, base, c.alto, f, GROSOR_FACHADA, huecos);
    lote.caja(m, u0, u0 + 0.02, base, c.alto, f, f + GROSOR_FACHADA);
    lote.caja(m, u1 - 0.02, u1, base, c.alto, f, f + GROSOR_FACHADA);
  }
  lote.caja(m, u0, u1, base, c.alto, f + GROSOR_FACHADA, fondo);
  for (const h of huecos) {
    if (h.t === 'v') ventana(lote, h, f);
    else if (h.t === 'p') puerta(lote, h, f);
    else if (h.t === 'g') garaje(lote, h, f);
    else if (h.t === 'a') arcoAbierto(lote, h, f);
    if (h.recercado) {
      // recercado del hueco en la fachada (marco de revoco u obra de otro color, algo saliente)
      const rm = material(h.recercado.mat ?? 'enfoscadoGris', h.recercado.color);
      const a = h.recercado.ancho ?? 0.15; const [p0, p1] = h.u; const [q0, q1] = h.y;
      const w0 = f - (h.recercado.vuelo ?? 0.04);
      lote.caja(rm, p0 - a, p1 + a, q1, q1 + a, w0, f + 0.01);
      if (q0 > base + 0.05) lote.caja(rm, p0 - a, p1 + a, q0 - a, q0, w0, f + 0.01);
      lote.caja(rm, p0 - a, p0, q0, q1, w0, f + 0.01);
      lote.caja(rm, p1, p1 + a, q0, q1, w0, f + 0.01);
    }
  }
  if (c.zocalo) {
    const zm = material(c.zocalo.mat);
    let a = u0;
    const cortes = huecos.filter((h) => h.y[0] < c.zocalo.alto).map((h) => [h.u[0] - 0.02, h.u[1] + 0.02]).sort((p, q) => p[0] - q[0]);
    for (const [c0, c1] of [...cortes, [u1, u1]]) {
      lote.caja(zm, a, Math.min(c0, u1), -0.3, c.zocalo.alto, f - 0.03, f);
      a = Math.max(a, c1);
    }
    // bajo las ventanas que entran en el zócalo, el zócalo sigue hasta el alféizar
    for (const h of huecos) {
      if (h.y[0] >= 0.3 && h.y[0] < c.zocalo.alto) lote.caja(zm, h.u[0] - 0.02, h.u[1] + 0.02, -0.3, h.y[0] - 0.05, f - 0.03, f);
    }
  }
}

function porche(lote, p) {
  const [u0, u1] = p.u; const [w0, w1] = p.w;
  if (!p.sinTecho) lote.caja(material(p.techoMat ?? 'madera'), u0, u1, p.techo, p.techo + 0.1, w0, w1);
  if (p.dintel) lote.caja(material(p.dintel.mat, p.dintel.color), u0, u1, p.techo, p.dintel.hasta, w0, w0 + 0.25);
  for (const pi of p.pilares ?? []) {
    const a = pi.ancho / 2;
    const arriba = pi.alto ?? p.techo;
    if (pi.t === 'columna') {
      const g = new THREE.CylinderGeometry(a, a, arriba - p.suelo - 0.3, 20).translate(pi.u, (arriba + p.suelo) / 2, -pi.w);
      lote.pon(material('blanco'), g);
      lote.caja(material('blanco'), pi.u - a - 0.05, pi.u + a + 0.05, p.suelo, p.suelo + 0.15, pi.w - a - 0.05, pi.w + a + 0.05);
      lote.caja(material('blanco'), pi.u - a - 0.05, pi.u + a + 0.05, arriba - 0.15, arriba, pi.w - a - 0.05, pi.w + a + 0.05);
    } else {
      const mat = pi.t === 'piedra' ? material('piedra') : pi.t === 'ladrillo' ? material('ladrilloCrema') : material('enfoscado', '#f3f2ee');
      lote.caja(mat, pi.u - a, pi.u + a, pi.t === 'piedra' ? -0.3 : p.suelo, arriba, pi.w - a, pi.w + a);
    }
  }
}

function plataforma(lote, p) {
  const [u0, u1] = p.u; const [w0, w1] = p.w;
  lote.caja(material(p.lateral ?? 'hormigon'), u0, u1, -0.4, p.y - 0.03, w0, w1);
  lote.caja(material(p.mat), u0, u1, p.y - 0.03, p.y, w0 - 0.03, w1);
}

function escalera(lote, e) {
  const [u0, u1] = e.u; const [w0, w1] = e.w; const [y0, y1] = e.y;
  const n = e.peldanos;
  const h = (y1 - y0) / n; const d = (w1 - w0) / n;
  const m = material(e.mat);
  for (let i = 0; i < n; i++) lote.caja(m, u0, u1, -0.3, y0 + (i + 1) * h, w0 + i * d, w1);
  if (e.laterales) {
    const lm = material(e.laterales);
    const perfil = new THREE.Shape([[w0, -0.3], [w1, -0.3], [w1, y1 + 0.3], [w0, y0 + h + 0.3]].map((p) => new THREE.Vector2(...p)));
    for (const ua of [u0 - 0.15, u1]) {
      const g = new THREE.ExtrudeGeometry(perfil, { depth: 0.15, bevelEnabled: false }).rotateY(Math.PI / 2).translate(ua, 0, 0);
      // rotateY(90°): x' = z (0..0,15) y z' = −x (−w): la cara del perfil queda en el plano u = ua
      lote.pon(lm, g);
    }
  }
  if (e.barandilla) {
    const hm = material(HIERRO[e.barandilla.color]);
    e.barandilla.lados.forEach((si, k) => {
      if (!si) return;
      const u = k === 0 ? u0 + 0.05 : u1 - 0.05;
      for (let i = 0; i < n; i++) lote.caja(hm, u - 0.012, u + 0.012, y0 + (i + 1) * h, y0 + (i + 1) * h + 0.9, w0 + (i + 0.5) * d - 0.012, w0 + (i + 0.5) * d + 0.012);
      lote.barra(hm, [u, y0 + h + 0.9, w0 + 0.5 * d], [u, y1 + 0.9, w1], 0.045);
      lote.barra(hm, [u, y0 + h + 0.2, w0 + 0.5 * d], [u, y1 + 0.2, w1], 0.03);
    });
  }
}

// Barandilla recta de p0 a p1 (u, w), sobre yBase y de alto «alto»
function barandilla(lote, p0, p1, yBase, alto, color, tipo = 'barrotes') {
  const hm = material(HIERRO[color]);
  const l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  if (l < 0.05) return;
  const pt = (t, y) => [p0[0] + (p1[0] - p0[0]) * t, y, p0[1] + (p1[1] - p0[1]) * t];
  lote.barra(hm, pt(0, yBase + alto), pt(1, yBase + alto), 0.045);
  lote.barra(hm, pt(0, yBase + 0.06), pt(1, yBase + 0.06), 0.03);
  const n = Math.max(1, Math.round(l / 0.11));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    lote.barra(hm, pt(t, yBase + 0.04), pt(t, yBase + alto), 0.016);
  }
  if (tipo === 'ornamental') {
    // aros entre los barrotes, a media altura, cada 0,6 m
    const n2 = Math.max(1, Math.round(l / 0.6));
    const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    const r = Math.min(0.17, alto * 0.22);
    for (let i = 0; i < n2; i++) {
      const [u, y, w] = pt((i + 0.5) / n2, yBase + alto * 0.52);
      lote.pon(hm, new THREE.TorusGeometry(r, 0.012, 6, 20).rotateY(ang).translate(u, y, -w));
    }
    lote.barra(hm, pt(0, yBase + alto * 0.18), pt(1, yBase + alto * 0.18), 0.022);
  }
  if (tipo === 'cruces') {
    const paneles = Math.max(1, Math.round(l / 1.0));
    for (let i = 0; i < paneles; i++) {
      const a = i / paneles; const b = (i + 1) / paneles;
      lote.barra(hm, pt(a + 0.02, yBase + 0.12), pt(b - 0.02, yBase + alto - 0.06), 0.022);
      lote.barra(hm, pt(a + 0.02, yBase + alto - 0.06), pt(b - 0.02, yBase + 0.12), 0.022);
    }
  }
}

function balcon(lote, b) {
  const [u0, u1] = b.u;
  const w0 = b.w - b.vuelo;
  const alto = b.alto ?? 1.0;
  lote.caja(material(b.canto ?? 'blanco', b.canto === 'enfoscado' ? '#f3f2ee' : undefined), u0, u1, b.y - (b.grueso ?? 0.18), b.y, w0, b.w);
  const y = b.y;
  if (b.antepecho) {
    // antepecho macizo (placa de uralita, fábrica) en vez de barandilla
    const m = material(b.antepecho);
    lote.caja(m, u0, u1, y, y + alto, w0, w0 + 0.05);
    lote.caja(m, u0, u0 + 0.05, y, y + alto, w0, b.w);
    lote.caja(m, u1 - 0.05, u1, y, y + alto, w0, b.w);
    lote.caja(material('aluminio'), u0, u1, y + alto, y + alto + 0.04, w0 - 0.01, w0 + 0.07);
    return;
  }
  if (b.curvo) {
    // barandilla de barriga: el frente se abomba hacia la calle
    const n = 10; const bomba = Math.min(0.3, b.vuelo * 0.6);
    let prev = [u0 + 0.03, b.w];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = [u0 + 0.03 + (u1 - u0 - 0.06) * t, w0 + 0.05 - bomba * Math.sin(Math.PI * t) * (i === 0 || i === n ? 0 : 1)];
      barandilla(lote, prev, p, y, alto, b.color, b.tipo);
      prev = p;
    }
    barandilla(lote, prev, [u1 - 0.03, b.w], y, alto, b.color, b.tipo);
    return;
  }
  barandilla(lote, [u0 + 0.03, w0 + 0.05], [u1 - 0.03, w0 + 0.05], y, alto, b.color, b.tipo);
  barandilla(lote, [u0 + 0.03, w0 + 0.05], [u0 + 0.03, b.w], y, alto, b.color, b.tipo);
  barandilla(lote, [u1 - 0.03, w0 + 0.05], [u1 - 0.03, b.w], y, alto, b.color, b.tipo);
}

// Tejado de faldones delante y detrás (cumbrera paralela a la calle), con limatesas opcionales
// en los extremos, alero con sofito y cornisa, placas, lucernarios y chimeneas
function tejado(lote, t) {
  const tan = Math.tan((t.pendiente * Math.PI) / 180);
  const cos = Math.cos((t.pendiente * Math.PI) / 180);
  const [vf, vb] = t.vuelo; const [vl, vr] = t.vueloLado ?? [0, 0];
  const [u0, u1] = t.u; const [w0, w1] = t.w;
  const U0 = u0 - vl; const U1 = u1 + vr; const W0 = w0 - vf; const W1 = w1 + vb;
  const wm = (w0 + w1) / 2;
  const yr = t.alero + (wm - w0) * tan;
  const yf = t.alero - vf * tan; const yb = t.alero - vb * tan;
  const [c0, c1] = t.caderas ?? [false, false];
  let R0 = c0 ? U0 + (wm - W0) : U0;
  let R1 = c1 ? U1 - (wm - W0) : U1;
  if (R0 > R1) R0 = R1 = (U0 + U1) / 2;
  const pos = []; const uv = [];
  // vértices (u, y, w) → (x, y, z = −w); uv en metros (a lo largo del alero, subiendo el faldón)
  const tri = (a, b, c, ua, ub, uc) => {
    for (const p of [a, b, c]) pos.push(p[0], p[1], -p[2]);
    uv.push(...ua, ...ub, ...uc);
  };
  const quad = (a, b, c, d, ua, ub, uc, ud) => { tri(a, b, c, ua, ub, uc); tri(a, c, d, ua, uc, ud); };
  const sF = (p) => [p[0], (p[2] - W0) / cos];
  const sB = (p) => [-p[0], (W1 - p[2]) / cos];
  const fa = [U0, yf, W0]; const fb = [U1, yf, W0]; const rb = [R1, yr, wm]; const ra = [R0, yr, wm];
  const ba = [U1, yb, W1]; const bb = [U0, yb, W1];
  quad(fa, fb, rb, ra, sF(fa), sF(fb), sF(rb), sF(ra));
  quad(ba, bb, ra, rb, sB(ba), sB(bb), sB(ra), sB(rb));
  if (c0) { const s = (p) => [p[2], (p[0] - U0) / cos]; tri(bb, fa, ra, s(bb), s(fa), s(ra)); }
  if (c1) { const s = (p) => [-p[2], (U1 - p[0]) / cos]; tri(fb, ba, rb, s(fb), s(ba), s(rb)); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  lote.pon(material('teja', t.teja), g);
  // Hastiales de los extremos sin limatesa (pared hasta la cumbrera)
  const pinon = material(t.pinon ?? 'enfoscado', t.pinon ? undefined : '#f1efe9');
  for (const [hay, u, s] of [[!c0, u0, 1], [!c1, u1, -1]]) {
    if (!hay) continue;
    const forma = new THREE.Shape([[w0, t.alero - 0.02], [w1, t.alero - 0.02], [wm, yr - 0.05]].map((p) => new THREE.Vector2(...p)));
    const gp = new THREE.ExtrudeGeometry(forma, { depth: 0.2, bevelEnabled: false }).rotateY(Math.PI / 2).translate(s > 0 ? u : u - 0.2, 0, 0);
    lote.pon(pinon, gp);
  }
  // Alero: sofito horizontal y cornisa
  const sof = t.sofito === 'madera' ? material('madera') : t.sofito === 'oscuro' ? material('oscuro') : material('blanco');
  if (t.canecillos) {
    // canecillos de madera bajo el alero, con su tablazón
    const paso = t.canecillos.paso ?? 0.5;
    const cm = material('marcoMadera');
    for (let u = U0 + paso / 2; u < U1; u += paso) {
      lote.caja(cm, u - 0.05, u + 0.05, yf - 0.22, yf - 0.05, W0 + 0.08, w0);
      lote.caja(cm, u - 0.05, u + 0.05, yf - 0.16, yf - 0.05, W0 + 0.03, W0 + 0.08);
    }
  }
  lote.caja(sof, U0, U1, yf - 0.05, yf, W0, w0);
  lote.caja(sof, U0, U1, yb - 0.05, yb, w1, W1);
  const cornisa = t.cornisa ?? 0.18;
  lote.caja(material('blanco'), U0, U1, yf - cornisa, yf + 0.04, W0, W0 + 0.05);
  // Canalón
  const can = new THREE.CylinderGeometry(0.06, 0.06, U1 - U0, 10, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI);
  lote.pon(material('aluminio'), can.translate((U0 + U1) / 2, yf - 0.02, -(W0 - 0.05)));
  // Sobre el faldón delantero: base de una pieza en (u, w) con su eje bajando por el faldón
  const enFaldon = (u, w, sobre) => {
    const y = yf + (w - W0) * tan + sobre;
    const n = new THREE.Vector3(0, cos, Math.sin((t.pendiente * Math.PI) / 180));   // normal del faldón (hacia la calle y arriba)
    const abajo = new THREE.Vector3(0, -Math.sin((t.pendiente * Math.PI) / 180), cos);
    const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), n, abajo).setPosition(u, y, -w);
    return m;
  };
  for (const pa of t.paneles ?? []) {
    const [a, b] = pa.u; const [c, d] = pa.w;
    const largo = pa.tipo === 'termico' ? 2.0 : 1.7;
    const ancho = pa.tipo === 'termico' ? 1.0 : 1.03;
    const nu = Math.max(1, Math.floor((b - a) / (ancho + 0.03)));
    const nw = Math.max(1, Math.floor(((d - c) / cos) / (largo + 0.03)));
    const m = material(pa.tipo);
    for (let i = 0; i < nu; i++) for (let k = 0; k < nw; k++) {
      const u = a + (i + 0.5) * (b - a) / nu;
      const w = c + (k + 0.5) * (d - c) / nw;
      // Solo sobre el faldón delantero: ni pasada la cumbrera ni sobre los faldones de las limatesas
      const arriba = w + (largo / 2) * cos;
      const limite = Math.min(wm, c0 ? W0 + (u - ancho / 2 - U0) : Infinity, c1 ? W0 + (U1 - u - ancho / 2) : Infinity);
      if (arriba > limite - 0.1) continue;
      const geo = new THREE.BoxGeometry(ancho, 0.04, largo);
      geo.applyMatrix4(enFaldon(u, w, 0.12));
      lote.pon(m, geo);
    }
  }
  for (const v of t.velux ?? []) {
    const u = (v.u[0] + v.u[1]) / 2; const w = (v.w[0] + v.w[1]) / 2;
    const l = (v.w[1] - v.w[0]) / cos; const a = v.u[1] - v.u[0];
    const marcoV = new THREE.BoxGeometry(a + 0.1, 0.1, l + 0.1).applyMatrix4(enFaldon(u, w, 0.03));
    lote.pon(material('blanco'), marcoV);
    lote.pon(material('vidrio'), new THREE.BoxGeometry(a - 0.1, 0.03, l - 0.1).applyMatrix4(enFaldon(u, w, 0.08)));
  }
  for (const ch of t.chimeneas ?? []) {
    const yTej = ch.w <= wm ? yf + (ch.w - W0) * tan : yb + (W1 - ch.w) * tan;
    const m = material(ch.mat, ch.mat === 'enfoscado' ? '#f1efe9' : undefined);
    lote.caja(m, ch.u - 0.25, ch.u + 0.25, yTej - 0.4, yTej + ch.alto, ch.w - 0.25, ch.w + 0.25);
    lote.caja(material('hormigon'), ch.u - 0.32, ch.u + 0.32, yTej + ch.alto, yTej + ch.alto + 0.06, ch.w - 0.32, ch.w + 0.32);
    lote.caja(m, ch.u - 0.12, ch.u + 0.12, yTej + ch.alto + 0.06, yTej + ch.alto + 0.26, ch.w - 0.12, ch.w + 0.12);
    lote.caja(material('hormigon'), ch.u - 0.22, ch.u + 0.22, yTej + ch.alto + 0.26, yTej + ch.alto + 0.31, ch.w - 0.22, ch.w + 0.22);
    if (ch.antena) {
      const hm = material('aluminio');
      lote.barra(hm, [ch.u + 0.3, yTej + ch.alto - 0.3, ch.w], [ch.u + 0.3, yTej + ch.alto + 2.0, ch.w], 0.04);
      for (let k = 0; k < 6; k++) lote.barra(hm, [ch.u + 0.3 - 0.3 + k * 0.1, yTej + ch.alto + 1.7, ch.w - 0.5], [ch.u + 0.3 - 0.3 + k * 0.1, yTej + ch.alto + 1.7, ch.w + 0.5], 0.015);
    }
  }
}

// Valla de la calle en w = 0: murete con albardilla, forja, pilares y cancelas
function valla(lote, v, colisiones) {
  const puertas = v.puertas ?? [];
  for (const tr of v.tramos) {
    const [a, b] = tr.u;
    const cortes = puertas.filter((p) => p.u[1] > a && p.u[0] < b).map((p) => p.u).sort((p, q) => p[0] - q[0]);
    let ini = a;
    const trozos = [];
    for (const [c0, c1] of [...cortes, [b, b]]) {
      if (c0 - ini > 0.02) trozos.push([ini, c0]);
      ini = Math.max(ini, c1);
    }
    const m = material(tr.murete.mat);
    for (const [p0, p1] of trozos) {
      lote.caja(m, p0, p1, -0.3, tr.murete.alto, 0, 0.24);
      lote.caja(material('marmol'), p0, p1, tr.murete.alto, tr.murete.alto + 0.05, -0.02, 0.26);
      if (tr.barandilla) barandilla(lote, [p0, 0.12], [p1, 0.12], tr.murete.alto + 0.05, tr.barandilla.alto, tr.barandilla.color, tr.barandilla.tipo);
      colisiones.push({ u: [p0, p1], w: [0, 0.24], y: [-0.3, tr.murete.alto + 0.05 + (tr.barandilla?.alto ?? 0)] });
    }
  }
  for (const p of v.pilares ?? []) {
    const a = p.ancho / 2;
    lote.caja(material(p.mat), p.u - a, p.u + a, -0.3, p.alto, 0.12 - a, 0.12 + a);
    lote.caja(material('marmol'), p.u - a - 0.03, p.u + a + 0.03, p.alto, p.alto + 0.06, 0.09 - a, 0.15 + a);
  }
  for (const pu of puertas) {
    const [a, b] = pu.u;
    const hm = material(HIERRO[pu.color]);
    const alto = pu.alto;
    for (const y of [0.06, alto]) lote.barra(hm, [a, y, 0.12], [b, y, 0.12], 0.045);
    for (const u of [a + 0.02, b - 0.02]) lote.barra(hm, [u, 0.04, 0.12], [u, alto, 0.12], 0.045);
    if (pu.tipo === 'vehiculo') {
      lote.caja(material(pu.color === 'negro' ? 'hierroBlanco' : 'hierroNegro'), a + 0.03, b - 0.03, 0.06, 0.4, 0.1, 0.14);
      lote.barra(hm, [(a + b) / 2, 0.04, 0.12], [(a + b) / 2, alto, 0.12], 0.04);
      lote.barra(hm, [a, 0.4, 0.12], [b, 0.4, 0.12], 0.035);
    }
    const n = Math.max(2, Math.round((b - a) / 0.11));
    for (let i = 1; i < n; i++) {
      const u = a + (b - a) * i / n;
      lote.barra(hm, [u, pu.tipo === 'vehiculo' ? 0.4 : 0.06, 0.12], [u, alto, 0.12], 0.018);
    }
    lote.barra(hm, [a, alto - 0.25, 0.12], [b, alto - 0.25, 0.12], 0.03);
    colisiones.push({ u: [a, b], w: [0.08, 0.16], y: [0, alto] });
  }
}

function murete(lote, mu, colisiones) {
  const [ua, wa] = mu.de; const [ub, wb] = mu.a;
  const y0 = mu.y0 ?? 0;
  if (mu.alto > 0) {
    const l = Math.hypot(ub - ua, wb - wa);
    const g = caja(l, mu.alto + 0.3, 0.22, 0, (mu.alto - 0.3) / 2, 0);
    g.rotateY(Math.atan2(wb - wa, ub - ua));          // eje x de la caja hacia (u, −w)
    g.translate((ua + ub) / 2, 0, -(wa + wb) / 2);
    lote.pon(material(mu.mat), g);
    colisiones.push({ de: mu.de, a: mu.a, y: [-0.3, mu.alto + (mu.barandilla?.alto ?? 0)] });
  }
  if (mu.barandilla) barandilla(lote, mu.de, mu.a, y0 + Math.max(0, mu.alto), mu.barandilla.alto, mu.barandilla.color, mu.barandilla.tipo);
}

// Ruido suave para deformar setos y copas
function ondula(geo, amplitud, escala, semilla) {
  const g = mergeVertices(geo.deleteAttribute('normal').deleteAttribute('uv'), 1e-4);
  const p = g.attributes.position;
  const c = new THREE.Vector3();
  new THREE.Box3().setFromBufferAttribute(p).getCenter(c);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * escala + semilla) * Math.cos(v.z * escala * 1.3 - semilla) * Math.sin(v.y * escala * 0.9 + semilla * 2)
      + 0.5 * Math.sin(v.x * escala * 2.7 + v.y * 1.9 + semilla);
    const d = v.clone().sub(c).normalize();
    v.addScaledVector(d, n * amplitud);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[2 * i] = p.getX(i) + p.getZ(i); uv[2 * i + 1] = p.getY(i); }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

function seto(lote, s, k) {
  const [u0, u1] = s.u; const [w0, w1] = s.w;
  const su = u1 - u0; const sw = w1 - w0;
  const geo = new THREE.BoxGeometry(su, s.alto, sw, Math.ceil(su / 0.25), Math.ceil(s.alto / 0.25), Math.ceil(sw / 0.25));
  // esquinas de arriba redondeadas
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / (s.alto / 2);
    if (y > 0.4) {
      const f = 1 - 0.18 * (y - 0.4);
      p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f);
    }
  }
  const g = ondula(geo, 0.05, 3.1, k * 1.7);
  g.translate((u0 + u1) / 2, s.alto / 2, -(w0 + w1) / 2);
  lote.pon(s.flores ? material('flores', s.flores) : material('seto', s.color), g);
}

function arbolBola(lote, a, k) {
  const tronco = a.alto - a.radio * 1.7;
  lote.pon(material('tronco'), new THREE.CylinderGeometry(0.05, 0.07, tronco + 0.3, 8).translate(a.u, tronco / 2, -a.w));
  const copa = ondula(new THREE.IcosahedronGeometry(a.radio, 3), a.radio * 0.07, 4.0, k * 2.3);
  copa.scale(1, 0.92, 1).translate(a.u, a.alto - a.radio, -a.w);
  lote.pon(material('seto', '#55703a'), copa);
  // alcorque
  lote.caja(material('tierra'), a.u - 0.35, a.u + 0.35, 0, 0.03, a.w - 0.35, a.w + 0.35);
}

function jardinera(lote, j, k) {
  const y = j.y ?? 0;
  const a = (j.ancho ?? 0.9) / 2; const alto = j.alto ?? 0.42;
  lote.caja(material(j.mat ?? 'blanco', j.color), j.u - a, j.u + a, y, y + alto, j.w - 0.2, j.w + 0.2);
  const g = ondula(new THREE.BoxGeometry(a * 1.8, 0.3, 0.32, 4, 2, 2), 0.05, 6.0, k);
  lote.pon(j.flores ? material('flores', j.flores) : material('seto', '#5b7a35'), g.translate(j.u, y + alto + 0.13, -j.w));
}

// Cornisa o imposta corrida (vuela hacia la calle desde la fachada en w)
function cornisa(lote, c) {
  const m = material(c.mat ?? 'blanco', c.color);
  lote.caja(m, c.u[0] - (c.vueloLado ?? 0), c.u[1] + (c.vueloLado ?? 0), c.y[0], c.y[1], c.w - c.vuelo, c.w + 0.02);
  if (c.moldura) lote.caja(m, c.u[0], c.u[1], c.y[0] - 0.08, c.y[0], c.w - c.vuelo * 0.5, c.w + 0.02);
}

// Rótulo de letras sobre la fachada
function rotulo(lote, r) {
  const alto = r.y[1] - r.y[0]; const ancho = r.u[1] - r.u[0];
  const fuente = r.fuente ?? "700 140px 'Georgia', 'Times New Roman', serif";
  const m = material('rotulo', `${r.texto}|${r.color ?? '#b3271f'}|${fuente}`);
  const g = new THREE.PlaneGeometry(ancho, alto).translate((r.u[0] + r.u[1]) / 2, (r.y[0] + r.y[1]) / 2, -(r.w - 0.03));
  lote.pon(m, g);
}

function split(lote, s) {
  lote.caja(material('plastico'), s.u - 0.4, s.u + 0.4, s.y, s.y + 0.55, s.w - 0.3, s.w);
  const rejilla = new THREE.CylinderGeometry(0.19, 0.19, 0.02, 24).rotateX(Math.PI / 2).translate(s.u + 0.12, s.y + 0.27, -(s.w - 0.31));
  lote.pon(material('negro'), rejilla);
}

function farol(lote, f) {
  lote.caja(material('hierroNegro'), f.u - 0.09, f.u + 0.09, f.y, f.y + 0.34, f.w - 0.22, f.w - 0.04);
  lote.caja(material('vidrioCortina'), f.u - 0.07, f.u + 0.07, f.y + 0.05, f.y + 0.28, f.w - 0.23, f.w - 0.21);
}

// Pavimento pegado al terreno (patios y entradas), en una malla de 0,5 m
function pavimento(lote, p, enMundo, terreno, y0) {
  const [u0, u1] = p.u; const [w0, w1] = p.w;
  const nu = Math.max(1, Math.ceil((u1 - u0) / 0.5)); const nw = Math.max(1, Math.ceil((w1 - w0) / 0.5));
  const pos = []; const uv = []; const idx = [];
  for (let j = 0; j <= nw; j++) for (let i = 0; i <= nu; i++) {
    const u = u0 + (u1 - u0) * i / nu; const w = w0 + (w1 - w0) * j / nw;
    const [x, z] = enMundo(u, w);
    pos.push(u, terreno.alturaEn(x, z) - y0 + 0.03, -w);
    uv.push(u, w);
  }
  for (let j = 0; j < nw; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i;
    idx.push(a, a + 1, a + nu + 2, a, a + nu + 2, a + nu + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  lote.pon(material(p.mat), g);
}

// ---------- Filas de casas
function creaFila(fila, terreno, fisica) {
  const { origen: O, eje: [ex, ez] } = fila;
  const enMundo = (u, w) => [O[0] + u * ex + w * ez, O[1] + u * ez - w * ex];
  const raiz = new THREE.Group();
  raiz.name = `casas_${fila.nombre}`;
  raiz.position.set(O[0], 0, O[1]);
  raiz.rotation.y = Math.atan2(-ez, ex);
  const lote = new Lote();
  const cajas = [];                                     // colisiones: { u, w, y } en la fila (y sobre y0)
  fila.casas.forEach((casa, k) => {
    const uc = (casa.u[0] + casa.u[1]) / 2;
    const [xa, za] = enMundo(uc, -1.2);
    const y0 = terreno.alturaEn(xa, za);
    lote.y0 = y0;
    const col = [];
    for (const c of casa.cuerpos) {
      cuerpo(lote, c);
      col.push({ u: c.u, w: c.w, y: [c.desde ?? -0.5, c.alto] });
    }
    for (const f of casa.franjas ?? []) lote.caja(material(f.mat, f.color), f.u[0], f.u[1], f.y[0], f.y[1], f.w - f.vuelo, f.w + 0.01);
    for (const c of casa.cornisas ?? []) cornisa(lote, c);
    for (const p of casa.porches ?? []) porche(lote, p);
    for (const c of casa.columnas ?? []) {
      lote.pon(material('blanco'), new THREE.CylinderGeometry(c.radio, c.radio, c.y[1] - c.y[0], 20).translate(c.u, (c.y[0] + c.y[1]) / 2, -c.w));
    }
    for (const p of casa.postes ?? []) lote.barra(material(HIERRO[p.color ?? 'negro']), [p.u, p.y[0], p.w], [p.u, p.y[1], p.w], p.grueso ?? 0.05);
    for (const p of casa.plataformas ?? []) plataforma(lote, p);
    for (const e of casa.escaleras ?? []) escalera(lote, e);
    for (const b of casa.balcones ?? []) balcon(lote, b);
    for (const t of casa.tejados ?? []) tejado(lote, t);
    if (casa.valla) valla(lote, casa.valla, col);
    for (const mu of casa.muretes ?? []) murete(lote, mu, col);
    for (const p of casa.pavimentos ?? []) pavimento(lote, p, enMundo, terreno, y0);
    (casa.setos ?? []).forEach((s, i) => { seto(lote, s, k * 10 + i); col.push({ u: s.u, w: s.w, y: [0, s.alto] }); });
    (casa.jardineras ?? []).forEach((j, i) => jardinera(lote, j, k * 10 + i));
    for (const s of casa.splits ?? []) split(lote, s);
    for (const f of casa.faroles ?? []) farol(lote, f);
    for (const r of casa.rotulos ?? []) rotulo(lote, r);
    for (const c of casa.cajas ?? []) lote.caja(material(c.mat ?? 'plastico', c.color), c.u[0], c.u[1], c.y[0], c.y[1], c.w - (c.fondo ?? 0.12), c.w);
    for (const c of col) cajas.push({ ...c, y0 });
  });
  const arboles = [...(fila.arboles ?? []), ...fila.casas.flatMap((c) => c.arboles ?? [])];
  arboles.forEach((a, k) => {
    const [x, z] = enMundo(a.u, a.w);
    lote.y0 = terreno.alturaEn(x, z);
    arbolBola(lote, a, k);
  });
  for (const m of lote.mallas()) raiz.add(m);
  sombras(raiz);

  if (fisica?.mundo) {
    const { RAPIER, mundo } = fisica;
    const q = raiz.quaternion;
    for (const c of cajas) {
      let cu; let cw; let lu; let lw; let ang = 0;
      if (c.de) {
        cu = (c.de[0] + c.a[0]) / 2; cw = (c.de[1] + c.a[1]) / 2;
        lu = Math.hypot(c.a[0] - c.de[0], c.a[1] - c.de[1]); lw = 0.24;
        ang = Math.atan2(c.a[1] - c.de[1], c.a[0] - c.de[0]);
      } else {
        cu = (c.u[0] + c.u[1]) / 2; cw = (c.w[0] + c.w[1]) / 2; lu = c.u[1] - c.u[0]; lw = c.w[1] - c.w[0];
      }
      const [x, z] = enMundo(cu, cw);
      const alto = c.y[1] - c.y[0];
      const rot = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang));
      const colisor = mundo.createCollider(RAPIER.ColliderDesc.cuboid(lu / 2, alto / 2, lw / 2)
        .setTranslation(x, c.y0 + (c.y[0] + c.y[1]) / 2, z).setRotation({ x: rot.x, y: rot.y, z: rot.z, w: rot.w }));
      registraEstatico(fisica, colisor, x, z, Math.hypot(lu, lw) / 2);
    }
    for (const a of arboles) {
      const [x, z] = enMundo(a.u, a.w);
      const colisor = mundo.createCollider(RAPIER.ColliderDesc.cylinder(1.2, 0.12).setTranslation(x, terreno.alturaEn(x, z) + 1.2, z));
      registraEstatico(fisica, colisor, x, z, 0.3);
    }
  }
  return raiz;
}

export function creaCasas(terreno, fisica) {
  const raiz = new THREE.Group();
  raiz.name = 'casas';
  for (const fila of FILAS_CASAS) raiz.add(creaFila(fila, terreno, fisica));
  return raiz;
}
