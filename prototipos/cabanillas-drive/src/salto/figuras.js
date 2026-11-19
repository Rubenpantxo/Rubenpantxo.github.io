// Figuras provisionales del salto (S0): avión, personaje y paracaídas con primitivas.
// En S2 se cambian por el avión de Blender, la persona de MakeHuman y la lona de verdad.
import * as THREE from 'three';
import { SALTO } from '../config/salto.js';

function material(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05 });
}

// Avión mirando hacia −Z (su morro), con las hélices como hijos para girarlas
export function creaAvion() {
  const A = SALTO.avion;
  const grupo = new THREE.Group();
  grupo.name = 'salto_avion';
  const gris = material(0x8a9198);
  const oscuro = material(0x3b4148);
  const fuselaje = new THREE.Mesh(new THREE.BoxGeometry(A.fuselajeM, A.fuselajeM, A.largoM), gris);
  const morro = new THREE.Mesh(new THREE.ConeGeometry(A.fuselajeM * 0.62, 5, 4, 1).rotateY(Math.PI / 4).rotateX(-Math.PI / 2), gris);
  morro.position.z = -A.largoM / 2 - 2.5;
  const alas = new THREE.Mesh(new THREE.BoxGeometry(A.envergaduraM, 0.5, 5), gris);
  alas.position.set(0, A.fuselajeM / 2, -2);
  const cola = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 4), gris);
  cola.position.set(0, A.fuselajeM / 2 + 3, A.largoM / 2 - 2);
  const estabilizador = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 3), gris);
  estabilizador.position.set(0, A.fuselajeM / 2 + 1, A.largoM / 2 - 1.5);
  grupo.add(fuselaje, morro, alas, cola, estabilizador);
  const helices = [];
  for (const x of [-11, -5.5, 5.5, 11]) {
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 4, 8).rotateX(Math.PI / 2), oscuro);
    motor.position.set(x, A.fuselajeM / 2 - 0.4, -4.5);
    const helice = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 0.12), oscuro);
    helice.position.set(x, A.fuselajeM / 2 - 0.4, -6.6);
    helice.name = 'helice';
    helices.push(helice);
    grupo.add(motor, helice);
  }
  grupo.userData.helices = helices;
  return grupo;
}

// Personaje: una cápsula con un «pecho» claro para saber hacia dónde mira. De pie, mirando a −Z;
// los pies en y = 0
export function creaPersonaje() {
  const grupo = new THREE.Group();
  grupo.name = 'salto_personaje';
  const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.15, 4, 10), material(0xd96c1f));
  cuerpo.position.y = 0.875;
  const pecho = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.08), material(0xf2e6c9));
  pecho.position.set(0, 1.25, -0.29);
  grupo.add(cuerpo, pecho);
  return grupo;
}

// Paracaídas: una lona en arco encima del personaje (grupo con origen en los hombros).
// «inflado» de 0 (plegado) a 1 (abierto)
export function creaParacaidas() {
  const grupo = new THREE.Group();
  grupo.name = 'salto_paracaidas';
  const ancho = 7.5;
  const fondo = 3;
  const geo = new THREE.PlaneGeometry(ancho, fondo, 16, 2).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colores = [];
  const rojo = new THREE.Color(0xc8102e);
  const blanco = new THREE.Color(0xf4f4f0);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setY(i, -0.09 * x * x);                       // arco
    const franja = Math.floor((x + ancho / 2) / (ancho / 6)) % 2;
    const c = franja ? blanco : rojo;
    colores.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
  geo.computeVertexNormals();
  const lona = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }));
  lona.position.y = 5.5;
  // Cuerdas: de los extremos y el centro de la lona a los hombros
  const puntos = [];
  for (const x of [-ancho / 2, -ancho / 4, 0, ancho / 4, ancho / 2]) {
    for (const z of [-fondo / 2, fondo / 2]) {
      puntos.push(x, 5.5 - 0.09 * x * x, z, Math.sign(x) * 0.2, 0, 0);
    }
  }
  const geoCuerdas = new THREE.BufferGeometry();
  geoCuerdas.setAttribute('position', new THREE.Float32BufferAttribute(puntos, 3));
  const cuerdas = new THREE.LineSegments(geoCuerdas, new THREE.LineBasicMaterial({ color: 0x30343a }));
  grupo.add(lona, cuerdas);
  grupo.userData.ponInflado = (k) => {
    const s = Math.max(0.02, k);
    lona.scale.set(0.15 + 0.85 * s, s, 0.3 + 0.7 * s);
    lona.position.y = 1.5 + 4 * s;
    cuerdas.scale.set(0.15 + 0.85 * s, (1.5 + 4 * s) / 5.5, 0.3 + 0.7 * s);
  };
  grupo.userData.ponInflado(0);
  return grupo;
}

// Libera geometrías y materiales de una figura
export function liberaFigura(raiz) {
  raiz.removeFromParent();
  raiz.traverse((o) => {
    o.geometry?.dispose();
    if (o.material) for (const m of [o.material].flat()) m.dispose();
  });
}
