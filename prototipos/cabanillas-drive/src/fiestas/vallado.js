// Vallado del modo fiestas: vallas de tablones, panel rojo, barandilla de tubo, cierres de
// barrotes, puerta entre plaza y calle, tablado, gradas, burladeros, vallas grises y la manga
// del corral. Todo con primitivas y materiales propios, unido en una malla por material, y con
// su colisión. Las posiciones salen de src/datos/fiestas.js; las medidas, de config/fiestas.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FIESTAS } from '../config/fiestas.js';

// Generador de azar con semilla (el vallado sale siempre igual)
export function azarCon(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cajas agrupadas por material; cada una con un tono propio (color por vértice)
export class Lote {
  constructor(azar) {
    this.grupos = new Map();
    this.azar = azar;
    this.tinte = new THREE.Color();
  }

  // Caja de tamaño (largo, alto, grueso) centrada en (x, y, z), con el largo girado «giro» sobre Y
  caja(material, x, y, z, largo, alto, grueso, giro = 0, variacion = 0) {
    const g = new THREE.BoxGeometry(largo, alto, grueso);
    if (giro) g.rotateY(giro);
    g.translate(x, y, z);
    const k = 1 - variacion * this.azar();
    const n = g.attributes.position.count;
    const colores = new Float32Array(n * 3).fill(k);
    g.setAttribute('color', new THREE.BufferAttribute(colores, 3));
    if (!this.grupos.has(material)) this.grupos.set(material, []);
    this.grupos.get(material).push(g);
  }

  // Barra entre dos puntos del plano a la misma altura
  barra(material, a, b, y, alto, grueso, variacion = 0) {
    const dx = b[0] - a[0]; const dz = b[1] - a[1];
    const largo = Math.hypot(dx, dz);
    if (largo < 1e-3) return;
    this.caja(material, (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, largo, alto, grueso, Math.atan2(-dz, dx), variacion);
  }

  mallas(sombras) {
    const lista = [];
    for (const [material, geometrias] of this.grupos) {
      const malla = new THREE.Mesh(mergeGeometries(geometrias), material);
      geometrias.forEach((g) => g.dispose());
      malla.castShadow = sombras;
      malla.receiveShadow = sombras;
      lista.push(malla);
    }
    return lista;
  }
}

export function materialesFiestas() {
  const v = FIESTAS.valla;
  const m = (color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness, vertexColors: true });
  return {
    rojo: m(v.rojo, 0.6, 0.15),
    madera: m(v.madera, 0.9),
    gris: m(v.gris, 0.45, 0.6),
    blanco: m(FIESTAS.ambulancia.blanco, 0.5),
    naranja: m(FIESTAS.ambulancia.franja, 0.5),
    negro: m(0x1c1c1e, 0.8),
    azul: m(0x2f6fd6, 0.3),
  };
}

export function creaVallado(recinto, { terreno, fisica, sombras = true }) {
  const { RAPIER, mundo } = fisica;
  const V = FIESTAS.valla;
  const azar = azarCon(20261116);
  const mat = materialesFiestas();
  const lote = new Lote(azar);
  const lotePuerta = new Lote(azar);
  const raiz = new THREE.Group();
  raiz.name = 'fiestas_vallado';
  const colisiones = [];
  const suelo = (p) => terreno.alturaEn(p[0], p[1]);
  const punto = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const largoDe = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

  function colision(a, b, { alto = V.altoColisionM, grueso = V.gruesoColisionM } = {}) {
    const largo = largoDe(a, b);
    if (largo < 0.05) return null;
    const giro = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), giro);
    const cx = (a[0] + b[0]) / 2; const cz = (a[1] + b[1]) / 2;
    const y = Math.min(suelo(a), suelo(b));
    const collider = mundo.createCollider(RAPIER.ColliderDesc.cuboid(largo / 2, alto / 2 + 0.5, grueso / 2)
      .setTranslation(cx, y + alto / 2 - 0.5, cz).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }).setFriction(0.4));
    colisiones.push(collider);
    return collider;
  }

  // Postes repartidos entre a y b (incluidos los extremos) y, entre cada dos, lo que pinte «vano»
  function conPostes(l, a, b, paso, ladoPoste, altoPoste, vano) {
    const n = Math.max(1, Math.round(largoDe(a, b) / paso));
    for (let i = 0; i <= n; i++) {
      const p = punto(a, b, i / n);
      l.caja(mat.rojo, p[0], suelo(p) + altoPoste / 2, p[1], ladoPoste, altoPoste, ladoPoste,
        Math.atan2(-(b[1] - a[1]), b[0] - a[0]), 0.12);
      if (i < n) vano(p, punto(a, b, (i + 1) / n));
    }
  }

  function tablones(l, a, b, altoExtra = 0) {
    const t = V.tablones;
    conPostes(l, a, b, t.pasoPosteM, t.posteM, t.altoM + altoExtra, (p, q) => {
      const y = (suelo(p) + suelo(q)) / 2;
      for (const h of t.alturasM) l.barra(mat.madera, p, q, y + h + t.tablonAltoM / 2, t.tablonAltoM, t.tablonGruesoM, 0.3);
      if (altoExtra > 0.3) l.barra(mat.madera, p, q, y + t.altoM + 0.2, t.tablonAltoM, t.tablonGruesoM, 0.3);
    });
  }

  function panel(l, a, b) {
    const t = V.panel;
    conPostes(l, a, b, t.pasoPosteM, t.posteM, t.altoM + 0.05, (p, q) => {
      const y = (suelo(p) + suelo(q)) / 2;
      l.barra(mat.rojo, p, q, y + 0.08 + (t.altoM - 0.08) / 2, t.altoM - 0.08, t.gruesoM, 0.1);
    });
  }

  function tubo(l, a, b, cfg = V.tubo, material = mat.rojo) {
    const n = Math.max(1, Math.round(largoDe(a, b) / cfg.pasoPosteM));
    const alto = cfg.altoM;
    for (let i = 0; i <= n; i++) {
      const p = punto(a, b, i / n);
      l.caja(material, p[0], suelo(p) + alto / 2, p[1], cfg.tuboM, alto, cfg.tuboM, 0, 0.08);
      if (i < n) {
        const q = punto(a, b, (i + 1) / n);
        const y = (suelo(p) + suelo(q)) / 2;
        for (const h of cfg.alturasM) l.barra(material, p, q, y + h - cfg.tuboM / 2, cfg.tuboM, cfg.tuboM, 0.08);
      }
    }
  }

  function barrotes(l, a, b) {
    const t = V.barrotes;
    const y = (suelo(a) + suelo(b)) / 2;
    l.barra(mat.rojo, a, b, y + 0.12, 0.05, 0.05);
    l.barra(mat.rojo, a, b, y + t.altoM - 0.03, 0.05, 0.05);
    const n = Math.max(2, Math.round(largoDe(a, b) / t.pasoM));
    for (let i = 0; i <= n; i++) {
      const p = punto(a, b, i / n);
      const fuerte = i === 0 || i === n;
      l.caja(mat.rojo, p[0], y + t.altoM / 2, p[1], fuerte ? 0.07 : t.barraM, t.altoM, fuerte ? 0.07 : t.barraM, 0, 0.1);
    }
  }

  // --- Tramos de valla
  let puerta = null;
  for (const t of recinto.tramos) {
    if (t.tipo === 'ninguna' || t.largo < 0.1) continue;
    if (t.tipo === 'puerta') { puerta = t; continue; }
    if (t.tipo === 'panel') panel(lote, t.a, t.b);
    else if (t.tipo === 'tubo') tubo(lote, t.a, t.b);
    else tablones(lote, t.a, t.b);
    colision(t.a, t.b);
  }
  for (const c of recinto.cierres) {
    barrotes(lote, c.a, c.b);
    colision(c.a, c.b);
  }

  // --- Gradas: filas que suben desde el frente (a → b) hacia el fondo. Devuelve los sitios
  // donde cabe una persona: { x, y, z, rumbo } mirando al frente
  const sitiosGradas = [];
  function gradas(a, b, fondo, { barandilla = true } = {}) {
    const G = FIESTAS.gradas;
    const ancho = largoDe(a, b);
    const filas = Math.max(1, Math.floor(fondo.largo / G.filaFondoM));
    const giro = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
    const y0 = Math.min(suelo(a), suelo(b));
    const medio = punto(a, b, 0.5);
    const rumbo = Math.atan2(-fondo.dx, -fondo.dz);          // mirando al frente
    for (let i = 0; i < filas; i++) {
      const d0 = i * G.filaFondoM;
      const d1 = i === filas - 1 ? fondo.largo : d0 + G.filaFondoM;
      const h = G.primeraM + i * G.contrahuellaM;
      const cx = medio[0] + fondo.dx * (d0 + d1) / 2;
      const cz = medio[1] + fondo.dz * (d0 + d1) / 2;
      // Estructura roja debajo y tablón de asiento encima
      lote.caja(mat.rojo, cx, y0 + (h - 0.06) / 2, cz, ancho, h - 0.06, d1 - d0, giro, 0.1);
      lote.caja(mat.madera, cx, y0 + h - 0.03, cz, ancho, 0.06, d1 - d0, giro, 0.25);
      const n = Math.floor(ancho / FIESTAS.publico.separacionM);
      for (let k = 0; k < n; k++) {
        const s = punto(a, b, (k + 0.5) / n);
        const dm = (d0 + d1) / 2;
        sitiosGradas.push({ x: s[0] + fondo.dx * dm, y: y0 + h, z: s[1] + fondo.dz * dm, rumbo });
      }
    }
    if (barandilla) {
      const hTope = G.primeraM + (filas - 1) * G.contrahuellaM;
      const a2 = [a[0] + fondo.dx * fondo.largo, a[1] + fondo.dz * fondo.largo];
      const b2 = [b[0] + fondo.dx * fondo.largo, b[1] + fondo.dz * fondo.largo];
      for (const h of [0.5, G.barandillaM]) lote.barra(mat.rojo, a2, b2, y0 + hTope + h, 0.05, 0.05);
      for (const p of [a2, b2, punto(a2, b2, 0.5)]) {
        lote.caja(mat.rojo, p[0], y0 + (hTope + G.barandillaM) / 2, p[1], 0.07, hTope + G.barandillaM, 0.07);
      }
    }
  }
  const vector = (p, q) => {
    const largo = largoDe(p, q);
    return { dx: (q[0] - p[0]) / largo, dz: (q[1] - p[1]) / largo, largo };
  };
  function bloque(esquinas) {
    // Colisión del bloque entero: cuatro caras
    for (let i = 0; i < 4; i++) colision(esquinas[i], esquinas[(i + 1) % 4], { grueso: 0.3 });
  }

  // Tablado: frente en la valla (esquinas 0 → 1), fondo hacia el Ayuntamiento
  const tab = recinto.tablado.esquinas;
  gradas(tab[0], tab[1], vector(tab[0], tab[3]));
  bloque(tab);
  // Gradas a dos aguas del nº 2: la del lado de la plaza sube hacia el oeste; la de la calle, hacia el este
  for (const parte of recinto.gradas.partes) {
    const e = parte.esquinas;
    if (parte.nombre.startsWith('hueco')) continue;
    if (parte.mira === 'este') gradas(e[0], e[3], vector(e[0], e[1]), { barandilla: false });
    else gradas(e[1], e[2], vector(e[1], e[0]), { barandilla: false });
  }
  bloque(recinto.gradas.esquinas);

  // --- Burladeros: panel rojo paralelo a la valla más cercana
  for (const b of recinto.burladeros) {
    const B = V.burladero;
    const t = recinto.tramos.find((x) => x.zona === b.zona && x.lado === b.lado && x.clase === 'fachada');
    const d = vector(t.a, t.b);
    const a = [b.en[0] - d.dx * B.anchoM / 2, b.en[1] - d.dz * B.anchoM / 2];
    const c = [b.en[0] + d.dx * B.anchoM / 2, b.en[1] + d.dz * B.anchoM / 2];
    const y = suelo(b.en);
    lote.barra(mat.rojo, a, c, y + B.altoM / 2, B.altoM, B.gruesoM, 0.08);
    for (const p of [a, c]) lote.caja(mat.rojo, p[0], y + (B.altoM + 0.05) / 2, p[1], 0.09, B.altoM + 0.05, 0.09);
    colision(a, c, { grueso: 0.14 });
  }

  // --- Vallas grises delante de una puerta: frente y dos costados
  for (const r of recinto.refugios) {
    const [f0, f1, s1, s0] = r.esquinas;
    for (const [a, b] of [[s0, s1], [f0, s0], [f1, s1]]) {
      tubo(lote, a, b, V.gris_, mat.gris);
      colision(a, b, { grueso: 0.12 });
    }
  }

  // --- Corral: manga de tablas entre el portón y la valla, y portón rojo en la valla
  {
    const [f0, f1, s1, s0] = recinto.corral.manga;
    for (const [a, b] of [[f0, s0], [f1, s1]]) {
      tablones(lote, a, b, 0.45);
      colision(a, b);
    }
    const y = (suelo(s0) + suelo(s1)) / 2;
    lote.barra(mat.rojo, s0, s1, y + 1.0, 1.9, 0.07, 0.06);
  }

  raiz.add(...lote.mallas(sombras));

  // --- Puerta: hoja de tablones que gira en su extremo norte (b). Cerrada tapa el cierre; abierta
  // queda recogida contra la valla norte de la calle.
  const hoja = new THREE.Group();
  hoja.name = 'fiestas_puerta';
  let colisionPuerta = null;
  const giroCerrada = puerta ? Math.atan2(-(puerta.a[1] - puerta.b[1]), puerta.a[0] - puerta.b[0]) : 0;
  let giroAbierta = giroCerrada;
  if (puerta) {
    const y = suelo(puerta.b);
    const largo = puerta.largo;
    // La hoja se construye a lo largo de +X desde la bisagra
    const t = V.tablones;
    const n = Math.max(1, Math.round(largo / t.pasoPosteM));
    for (let i = 0; i <= n; i++) {
      const x = (largo * i) / n;
      lotePuerta.caja(mat.rojo, x, t.altoM / 2, 0, t.posteM, t.altoM, t.posteM, 0, 0.1);
      if (i < n) {
        const x1 = (largo * (i + 1)) / n;
        for (const h of t.alturasM) lotePuerta.caja(mat.madera, (x + x1) / 2, h + t.tablonAltoM / 2, 0, x1 - x, t.tablonAltoM, t.tablonGruesoM, 0, 0.3);
        // Cruz de San Andrés: lo que la distingue de la valla fija
        const diagonal = Math.hypot(x1 - x, t.altoM - 0.4);
        const g = new THREE.BoxGeometry(diagonal, 0.07, 0.03);
        g.rotateZ(Math.atan2(t.altoM - 0.4, x1 - x));
        g.translate((x + x1) / 2, t.altoM / 2 + 0.05, 0.04);
        g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
        lotePuerta.grupos.get(mat.rojo).push(g);
      }
    }
    hoja.add(...lotePuerta.mallas(sombras));
    hoja.position.set(puerta.b[0], y, puerta.b[1]);
    const norte = recinto.tramos.find((x) => x.zona === 'calle' && x.lado === 'norte');
    const d = vector(norte.a, norte.b);
    // Abierta: paralela a la valla norte de la calle, un palmo por dentro
    giroAbierta = Math.atan2(-d.dz, d.dx) - 0.06;
    colisionPuerta = colision(puerta.a, puerta.b);
    raiz.add(hoja);
  }
  let abierta = false;
  function ponPuerta(valor) {
    abierta = valor;
    hoja.rotation.y = valor ? giroAbierta : giroCerrada;
    colisionPuerta?.setEnabled(!valor);
  }
  ponPuerta(false);

  return {
    raiz,
    sitiosGradas,
    ponPuerta,
    get puertaAbierta() { return abierta; },
    libera() {
      for (const c of colisiones) mundo.removeCollider(c, false);
      colisiones.length = 0;
      raiz.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
      Object.values(mat).forEach((m) => m.dispose());
      raiz.removeFromParent();
    },
    materiales: mat,
  };
}
