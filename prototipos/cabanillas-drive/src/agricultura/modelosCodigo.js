// Modelos de aperos hechos en código con primitivas (sin Blender), para los que no hay GLB en
// public/assets/maquinaria/. Misma convención que los GLB: Y arriba, el tractor delante (+Z) y el apero
// detrás (−Z), origen en los bulones inferiores del tripuntal. Genéricos, sin marca ni logotipos.
import * as THREE from 'three';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.2, ...extra });

function caja(w, h, l, x, y, z, material, nombre) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), material);
  m.position.set(x, y, z);
  if (nombre) m.name = nombre;
  return m;
}

// Arrancadora de cebolla suspendida: bastidor en A, dos rejas que levantan la cebolla, cinta de
// varillas inclinada, cajón detrás con la cebolla (pieza «carga») y dos ruedas de apoyo.
export function creaArrancadora() {
  const g = new THREE.Group();
  g.name = 'arrancadora';
  const pintura = mat(0x4f6b2c);
  const acero = mat(0x6d747a, { metalness: 0.6, roughness: 0.5 });
  const oscuro = mat(0x2b2f33);
  const goma = mat(0x1d1f21, { roughness: 0.95, metalness: 0 });
  const sueloY = -0.45;
  const ancho = 1.8;

  // Bastidor en A: del enganche a la barra transversal
  for (const s of [-1, 1]) {
    const brazo = caja(0.1, 0.1, 0.8, s * 0.42, 0.05, -0.38, pintura);
    brazo.rotation.y = s * -0.42;
    g.add(brazo);
  }
  g.add(caja(1.9, 0.14, 0.14, 0, 0.1, -0.75, pintura));
  g.add(caja(0.12, 0.7, 0.1, 0, 0.35, -0.12, pintura));            // mástil del tercer punto
  g.add(caja(0.1, 0.1, 0.55, 0, 0.7, -0.35, pintura)).rotation.x = 0.2;

  // Rejas: dos hojas inclinadas junto al suelo
  for (const s of [-1, 1]) {
    const reja = caja(ancho / 2 - 0.05, 0.05, 0.55, s * (ancho / 4), sueloY + 0.1, -1.1, acero, `reja_${s}`);
    reja.rotation.x = -0.35;
    g.add(reja);
    g.add(caja(0.08, 0.5, 0.08, s * (ancho / 4), sueloY + 0.4, -0.85, pintura));    // pata de la reja
  }

  // Cinta: dos laterales inclinados y varillas transversales
  const x0 = -1.25, y0 = sueloY + 0.15;      // pie de la cinta
  const z1 = -2.45, y1 = 0.75;               // lo alto
  const largo = Math.hypot(x0 - z1, y1 - y0);
  const ang = Math.atan2(y1 - y0, -(z1 - x0));
  for (const s of [-1, 1]) {
    const lat = caja(0.06, 0.18, largo, s * (ancho / 2 - 0.05), (y0 + y1) / 2, (x0 + z1) / 2, pintura);
    lat.rotation.x = -ang;
    g.add(lat);
  }
  const cinta = caja(ancho - 0.2, 0.03, largo, 0, (y0 + y1) / 2, (x0 + z1) / 2, oscuro);
  cinta.rotation.x = -ang;
  g.add(cinta);
  const varillas = Math.round(largo / 0.14);
  for (let k = 0; k < varillas; k++) {
    const t = (k + 0.5) / varillas;
    const v = caja(ancho - 0.2, 0.025, 0.03, 0, y0 + (y1 - y0) * t + 0.02, x0 + (z1 - x0) * t, acero);
    v.rotation.x = -ang;
    g.add(v);
  }

  // Cajón con la cebolla
  const zc = -3.1, fondo = 0.25;
  g.add(caja(ancho, 0.06, 1.4, 0, fondo, zc, pintura));                  // suelo
  g.add(caja(0.06, 0.85, 1.4, -ancho / 2, fondo + 0.43, zc, pintura));    // lados
  g.add(caja(0.06, 0.85, 1.4, ancho / 2, fondo + 0.43, zc, pintura));
  g.add(caja(ancho, 0.85, 0.06, 0, fondo + 0.43, zc - 0.7, pintura));     // trasera
  g.add(caja(ancho, 0.4, 0.06, 0, fondo + 0.25, zc + 0.7, pintura));      // delantera, baja: entra la cinta
  g.add(caja(0.14, 0.9, 0.14, -0.7, -0.05, zc + 0.1, acero));              // soportes del cajón
  g.add(caja(0.14, 0.9, 0.14, 0.7, -0.05, zc + 0.1, acero));
  const carga = new THREE.Mesh(
    new THREE.BoxGeometry(ancho - 0.12, 0.8, 1.3).translate(0, 0.4, 0),
    mat(0xc08a3c, { roughness: 0.9, metalness: 0 }),
  );
  carga.name = 'carga';
  carga.position.set(0, fondo + 0.03, zc);
  g.add(carga);

  // Ruedas de apoyo traseras
  const ruedas = [];
  for (const s of [-1, 1]) {
    const rueda = new THREE.Group();
    rueda.name = `rueda_${s}`;
    const neu = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.22, 20), goma);
    neu.rotation.z = Math.PI / 2;
    rueda.add(neu);
    const llanta = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.24, 12), acero);
    llanta.rotation.z = Math.PI / 2;
    rueda.add(llanta);
    rueda.position.set(s * 1.0, sueloY + 0.4, zc + 0.2);
    g.add(rueda);
    g.add(caja(0.08, 0.1, 0.1, s * 0.9, sueloY + 0.4, zc + 0.2, acero));
    ruedas.push(rueda);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  const info = {
    nombre: 'Arrancadora de cebolla de 1,8 m',
    largo: 4.0, ancho: 2.2, alto: 1.7,
    enganche: { inferior: [0, 0, 0], superior: [0, 0.68, 0.075] },
    suelo_y: sueloY, ancho_trabajo: ancho, alto_bulon: 0.45, profundidad: 0.1, trabajo_z: -1.25, reversible: false,
    carga: { objeto: 'carga', y_vacia: fondo + 0.03, y_llena: fondo + 0.03, escala_vacia: 1, escala_vacia_x: 1, escala_y: [0.06, 1] },
    fuente: 'src/agricultura/modelosCodigo.js (modelo propio, genérico, sin marca)',
  };
  return { modelo: g, info };
}

export const MODELOS_CODIGO = { arrancadora: creaArrancadora };
