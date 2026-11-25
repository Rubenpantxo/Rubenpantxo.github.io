// Acequia y tajaderas del riego (PLAN_AGRICULTURA.md §5.5, fase A7). La acequia de la 2-700 es un
// canal de hormigón estrecho sobre su cajero (se ve en la ortofoto como una línea clara y en el
// LiDAR como el lomo de la linde): aquí, una sección en U que sigue el eje de riego.json con el agua
// corriendo dentro (de la cabecera hacia abajo). En cada boquera, una tajadera (compuerta de chapa
// con su husillo y su volante) que sube al abrirla, y el chorro que cae de la acequia a la parcela.
import * as THREE from 'three';
import { AGRICULTURA } from '../config/agricultura.js';
import { materialAgua } from '../escena/agua.js';

// Puntos cada «paso» metros a lo largo de una polilínea, con su dirección
function remuestrea(eje, paso) {
  const puntos = [];
  for (let i = 0; i < eje.length - 1; i++) {
    const [x0, z0] = eje[i];
    const [x1, z1] = eje[i + 1];
    const l = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(l / paso));
    for (let k = 0; k < n; k++) puntos.push([x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n]);
  }
  puntos.push(eje[eje.length - 1]);
  return puntos.map(([x, z], i) => {
    const [xa, za] = puntos[Math.max(0, i - 1)];
    const [xb, zb] = puntos[Math.min(puntos.length - 1, i + 1)];
    const l = Math.hypot(xb - xa, zb - za) || 1;
    return { x, z, tx: (xb - xa) / l, tz: (zb - za) / l };
  });
}

// Punto de la polilínea más cercano a (x, z): { x, z, tx, tz }
function masCercano(eje, x, z) {
  let mejor = null;
  let d2 = Infinity;
  for (let i = 0; i < eje.length - 1; i++) {
    const [xa, za] = eje[i];
    const [xb, zb] = eje[i + 1];
    const dx = xb - xa;
    const dz = zb - za;
    const l2 = dx * dx + dz * dz || 1e-9;
    const t = Math.min(1, Math.max(0, ((x - xa) * dx + (z - za) * dz) / l2));
    const px = xa + t * dx;
    const pz = za + t * dz;
    const d = (px - x) ** 2 + (pz - z) ** 2;
    if (d < d2) { d2 = d; const l = Math.sqrt(l2); mejor = { x: px, z: pz, tx: dx / l, tz: dz / l }; }
  }
  return mejor;
}

const HORMIGON = new THREE.MeshLambertMaterial({ color: 0xa29d92, side: THREE.DoubleSide, name: 'hormigon_acequia' });
const CHAPA = new THREE.MeshLambertMaterial({ color: 0x5f6870, name: 'chapa_tajadera' });
const OXIDO = new THREE.MeshLambertMaterial({ color: 0x7a4a2a, name: 'oxido_tajadera' });
const SENAL = new THREE.MeshLambertMaterial({ color: 0x1e88e5, emissive: 0x0b2a4a, name: 'senal_tajadera' });

export function creaAcequia(datos, terreno) {
  const A = AGRICULTURA.riego.acequia;
  const raiz = new THREE.Group();
  raiz.name = 'acequia';
  const secciones = remuestrea(datos.acequia, A.pasoM);
  // Cota del fondo: el terreno en el eje (con su cajero), suavizada y siempre bajando aguas abajo
  let base = secciones.map((s) => terreno.alturaEn(s.x, s.z));
  base = base.map((_, i) => {
    let s = 0; let n = 0;
    for (let k = Math.max(0, i - 3); k <= Math.min(base.length - 1, i + 3); k++) { s += base[k]; n++; }
    return s / n;
  });
  for (let i = 1; i < base.length; i++) base[i] = Math.min(base[i], base[i - 1] - 0.0005);
  const w = A.anchoM / 2;
  const p = A.paredM;
  const H = A.altoM;
  // Perfil de la U (lateral, altura) y sus caras
  const perfil = [[-w - p, -0.15], [-w - p, H], [-w, H], [-w, 0.06], [w, 0.06], [w, H], [w + p, H], [w + p, -0.15]];
  const pos = [];
  const idx = [];
  for (let e = 0; e < perfil.length - 1; e++) {
    const inicio = pos.length / 3;
    for (let i = 0; i < secciones.length; i++) {
      const s = secciones[i];
      const nx = -s.tz;
      const nz = s.tx;
      for (const [u, v] of [perfil[e], perfil[e + 1]]) pos.push(s.x + nx * u, base[i] + v, s.z + nz * u);
    }
    for (let i = 0; i < secciones.length - 1; i++) {
      const a = inicio + i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const canal = new THREE.Mesh(geo, HORMIGON);
  canal.name = 'canal_acequia';
  canal.castShadow = true;
  canal.receiveShadow = true;
  raiz.add(canal);
  // Agua: una cinta dentro de la U que corre aguas abajo
  const posA = [];
  const flujo = [];
  const idxA = [];
  for (let i = 0; i < secciones.length; i++) {
    const s = secciones[i];
    const nx = -s.tz;
    const nz = s.tx;
    for (const u of [-w, w]) { posA.push(s.x + nx * u, base[i] + A.laminaM, s.z + nz * u); flujo.push(s.tx, s.tz); }
    if (i) { const a = (i - 1) * 2; idxA.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geoA = new THREE.BufferGeometry();
  geoA.setAttribute('position', new THREE.Float32BufferAttribute(posA, 3));
  geoA.setAttribute('aFlujo', new THREE.Float32BufferAttribute(flujo, 2));
  geoA.setIndex(idxA);
  geoA.computeVertexNormals();
  const agua = new THREE.Mesh(geoA, materialAgua('canal'));
  agua.name = 'agua_acequia';
  agua.receiveShadow = true;
  raiz.add(agua);

  // Tajaderas
  const tajaderas = datos.boqueras.map(({ x, z }, indice) => {
    const c = masCercano(datos.acequia, x, z);
    // Hacia la parcela
    let nx = -c.tz;
    let nz = c.tx;
    if ((x - c.x) * nx + (z - c.z) * nz < 0) { nx = -nx; nz = -nz; }
    // Cota de la acequia en ese punto
    let k = 0; let d2 = Infinity;
    secciones.forEach((s, i) => { const d = (s.x - c.x) ** 2 + (s.z - c.z) ** 2; if (d < d2) { d2 = d; k = i; } });
    const y0 = base[k];
    const grupo = new THREE.Group();
    grupo.name = `tajadera_B${indice + 1}`;
    grupo.position.set(c.x + nx * (w + p + 0.02), y0, c.z + nz * (w + p + 0.02));
    grupo.rotation.y = Math.atan2(nx, nz);          // +Z del grupo: hacia la parcela
    const caja = (sx, sy, sz, mat, px, py, pz) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
      m.position.set(px, py, pz);
      m.castShadow = true;
      grupo.add(m);
      return m;
    };
    // Marco: dos guías y el travesaño de arriba
    caja(0.05, H + 0.5, 0.05, CHAPA, -0.26, (H + 0.5) / 2 - 0.05, 0);
    caja(0.05, H + 0.5, 0.05, CHAPA, 0.26, (H + 0.5) / 2 - 0.05, 0);
    caja(0.57, 0.06, 0.07, CHAPA, 0, H + 0.42, 0);
    // Compuerta (sube al abrir)
    const compuerta = new THREE.Group();
    grupo.add(compuerta);
    const chapa = new THREE.Mesh(new THREE.BoxGeometry(0.46, H - 0.02, 0.025), OXIDO);
    chapa.position.set(0, (H - 0.02) / 2 + 0.04, 0.03);
    chapa.castShadow = true;
    compuerta.add(chapa);
    // Husillo y volante
    const husillo = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 8), CHAPA);
    husillo.position.set(0, H + 0.15, 0.03);
    compuerta.add(husillo);
    const volante = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.015, 6, 18), CHAPA);
    volante.rotation.x = Math.PI / 2;
    volante.position.set(0, H + 0.62, 0.03);
    grupo.add(volante);
    // Poste con una placa azul para verla de lejos
    caja(0.06, 1.5, 0.06, CHAPA, 0.55, 0.65, -0.1);
    caja(0.32, 0.32, 0.02, SENAL, 0.55, 1.35, -0.08);
    raiz.add(grupo);
    // Chorro de la acequia a la parcela (se ve con la tajadera abierta)
    const ini = new THREE.Vector3(c.x + nx * (w + p + 0.05), y0 + 0.06, c.z + nz * (w + p + 0.05));
    const fin = new THREE.Vector3(x, terreno.alturaEn(x, z) + 0.03, z);
    const posC = [];
    const flujoC = [];
    const idxC = [];
    const tramos = 10;
    const dx = fin.x - ini.x;
    const dz = fin.z - ini.z;
    const l = Math.hypot(dx, dz) || 1;
    for (let i = 0; i <= tramos; i++) {
      const t = i / tramos;
      const px = ini.x + dx * t;
      const pz = ini.z + dz * t;
      // Cae del borde y corre por el suelo (siempre por encima del terreno)
      const py = Math.max(terreno.alturaEn(px, pz) + 0.035, ini.y + (fin.y - ini.y) * Math.min(1, t * 1.6) - 0.08 * Math.sin(t * Math.PI));
      const ancho = 0.18 + 0.25 * t;
      for (const s of [-1, 1]) { posC.push(px - (dz / l) * ancho * s, py, pz + (dx / l) * ancho * s); flujoC.push(dx / l, dz / l); }
      if (i) { const a = (i - 1) * 2; idxC.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const geoC = new THREE.BufferGeometry();
    geoC.setAttribute('position', new THREE.Float32BufferAttribute(posC, 3));
    geoC.setAttribute('aFlujo', new THREE.Float32BufferAttribute(flujoC, 2));
    geoC.setIndex(idxC);
    geoC.computeVertexNormals();
    const chorro = new THREE.Mesh(geoC, agua.material);
    chorro.name = `chorro_B${indice + 1}`;
    chorro.visible = false;
    raiz.add(chorro);
    return {
      indice, nombre: `B${indice + 1}`, x: grupo.position.x, z: grupo.position.z, compuerta, chorro,
      abierta: 0,          // 0…1 (animación)
      objetivo: 0,
    };
  });

  return {
    raiz, tajaderas,
    pon(indice, abierta) { const t = tajaderas[indice]; if (t) t.objetivo = abierta ? 1 : 0; },
    actualiza(dt) {
      for (const t of tajaderas) {
        if (t.abierta !== t.objetivo) {
          t.abierta += Math.sign(t.objetivo - t.abierta) * Math.min(Math.abs(t.objetivo - t.abierta), dt / 1.2);
          t.compuerta.position.y = t.abierta * (H - 0.1);
        }
        t.chorro.visible = t.abierta > 0.15;
      }
    },
    libera() {
      raiz.removeFromParent();
      raiz.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
      agua.material.dispose();
    },
  };
}
