// Peatones: figura articulada hecha con cajas (cabeza, torso, brazos y piernas con codo y
// rodilla) y animación procedural de caminar y de salto lateral para esquivar coches.
const THREE = window.THREE;

// Fase de paso en [0, 1); cada ciclo avanza `stride` metros.
export const WALK = { from: 0, to: 1, stride: 1.4 };
// Salto: «fotogramas» a 30 por segundo; se aparta `side` metros durante los 16 primeros.
export const DIVE = { from: 0, to: 34, fps: 30, side: 2.4 };

const SKIN = [0xc9a182, 0x8c6346, 0xe2b896, 0x6f4a30, 0xd9b08c];
const TOPS = [0x4a6fa5, 0x7a3b3b, 0x3d6b40, 0x6b5b95, 0x444a52, 0xa3743c, 0xd0d4d8, 0x1f2a44, 0xb5462f];
const PANTS = [0x2b2f36, 0x3a4a66, 0x5b4a3a, 0x6e6e6e, 0x1d1d22, 0x7a6a50];
const HAIR = [0x2a1d14, 0x4a3020, 0x8a6a3a, 0x1a1a1a, 0xb0b0b0];
const pick = (a) => a[(Math.random() * a.length) | 0];

// Tipos de peatón (para variar proporciones y abrigo en invierno).
export function loadPedKinds(winter = false) {
  return [
    { name: 'hombre', h: 1.0, w: 1.0, coat: winter },
    { name: 'mujer', h: 0.94, w: 0.88, coat: winter, skirt: !winter },
    { name: 'alto', h: 1.06, w: 0.95, coat: winter },
  ];
}

const box = (w, h, d, color) => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, -h / 2, 0);          // pivote arriba (hombro, cadera, codo, rodilla)
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color }));
};

export class PedModel {
  constructor(kind) {
    const s = kind.h, w = kind.w;
    const skin = pick(SKIN), top = pick(TOPS), pants = pick(PANTS);
    this.group = new THREE.Group();
    this.root = new THREE.Group();            // cadera
    this.root.position.y = 0.92 * s;
    this.group.add(this.root);
    // Torso y cabeza.
    this.torso = new THREE.Group();
    this.root.add(this.torso);
    const chest = box(0.42 * w, 0.58 * s, 0.24, top);
    chest.position.y = 0.6 * s;
    this.torso.add(chest);
    const head = box(0.22, 0.24, 0.24, skin);
    head.position.y = 0.88 * s;
    this.torso.add(head);
    const hair = box(0.24, 0.08, 0.26, pick(HAIR));
    hair.position.y = 0.9 * s;
    this.torso.add(hair);
    if (kind.coat) {
      const coat = box(0.46 * w, 0.42, 0.28, top);
      coat.position.y = 0.04;
      this.torso.add(coat);
    }
    if (kind.skirt) {
      const skirt = box(0.44 * w, 0.32, 0.28, pants);
      skirt.position.y = 0.04;
      this.torso.add(skirt);
    }
    // Brazos (hombro → codo) y piernas (cadera → rodilla).
    const limb = (x, y, upper, lower, uw, color, color2, parent) => {
      const a = new THREE.Group();
      a.position.set(x, y, 0);
      parent.add(a);
      a.add(box(uw, upper, uw, color));
      const b = new THREE.Group();
      b.position.y = -upper;
      a.add(b);
      b.add(box(uw * 0.9, lower, uw * 0.9, color2));
      return [a, b];
    };
    [this.armL, this.elbowL] = limb(0.27 * w, 0.58 * s, 0.3 * s, 0.28 * s, 0.1, top, skin, this.torso);
    [this.armR, this.elbowR] = limb(-0.27 * w, 0.58 * s, 0.3 * s, 0.28 * s, 0.1, top, skin, this.torso);
    [this.legL, this.kneeL] = limb(0.11 * w, 0, 0.46 * s, 0.46 * s, 0.15, pants, pants, this.root);
    [this.legR, this.kneeR] = limb(-0.11 * w, 0, 0.46 * s, 0.46 * s, 0.15, pants, pants, this.root);
    this.hip = 0.92 * s;
  }

  // name: 'walk' (f = fase 0–1), 'left'/'right' (f = fotograma del salto 0–34).
  pose(name, f) {
    if (name === 'walk') {
      const a = f * Math.PI * 2, sw = Math.sin(a);
      this.legL.rotation.x = sw * 0.5;
      this.legR.rotation.x = -sw * 0.5;
      this.kneeL.rotation.x = Math.max(0, -Math.cos(a)) * 0.6;
      this.kneeR.rotation.x = Math.max(0, Math.cos(a)) * 0.6;
      this.armL.rotation.set(-sw * 0.45, 0, 0.05);
      this.armR.rotation.set(sw * 0.45, 0, -0.05);
      this.elbowL.rotation.x = -0.25;
      this.elbowR.rotation.x = -0.25;
      this.root.position.set(0, this.hip + Math.abs(Math.cos(a)) * 0.04, 0);
      this.root.rotation.set(0, 0, 0);
      this.torso.rotation.set(0.04, sw * 0.08, 0);
      return;
    }
    // Salto lateral: agacharse (0–6), volar tumbado hacia el lado (6–16), caer y levantarse (16–34).
    const side = name === 'right' ? 1 : -1;     // +x del modelo = derecha del peatón
    const t = f / DIVE.to;
    let lean, lift, crouch;
    if (f < 6) { const k = f / 6; lean = 0.2 * k; lift = 0; crouch = 0.25 * k; }
    else if (f < 16) { const k = (f - 6) / 10; lean = 0.2 + 1.1 * k; lift = Math.sin(k * Math.PI) * 0.6; crouch = 0.25 * (1 - k); }
    else if (f < 24) { lean = 1.3; lift = 0; crouch = 0; }
    else { const k = (f - 24) / 10; lean = 1.3 * (1 - k); lift = 0; crouch = 0.3 * Math.sin(k * Math.PI); }
    this.root.position.set(0, this.hip - crouch - (lean > 1 ? 0.55 : lean * 0.4) + lift, 0);
    this.root.rotation.set(0, 0, -side * lean);
    this.torso.rotation.set(0, 0, 0);
    this.armL.rotation.set(-2.6 * Math.min(1, t * 3), 0, 0.3);
    this.armR.rotation.set(-2.6 * Math.min(1, t * 3), 0, -0.3);
    this.elbowL.rotation.x = 0;
    this.elbowR.rotation.x = 0;
    this.legL.rotation.x = -0.3 * crouch * 4;
    this.legR.rotation.x = -0.3 * crouch * 4;
    this.kneeL.rotation.x = crouch * 3;
    this.kneeR.rotation.x = crouch * 3;
  }
}
