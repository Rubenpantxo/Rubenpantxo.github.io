// Modelos de los vehículos, hechos con primitivas (todos miran a +Z).
const THREE = window.THREE;

// Coches jugables y rivales: spec = { type: coupe|muscle|van|bus, color, L, W }.
export function buildCarMesh(spec) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: spec.color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1c2128 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const L = spec.L, W = spec.W;
  const wheels = [], frontWheels = [];
  function wheel(x, z, r) {
    const geo = new THREE.CylinderGeometry(r, r, 0.32, 10);
    geo.rotateZ(Math.PI / 2);
    const m = new THREE.Mesh(geo, darkMat);
    const grp = new THREE.Group();
    grp.position.set(x, r, z); grp.add(m); g.add(grp);
    wheels.push(m);
    return grp;
  }
  if (spec.type === 'bus') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, 1.9, L), bodyMat);
    body.position.y = 1.35; g.add(body);
    const win = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, 0.55, L * 0.86), glassMat);
    win.position.y = 1.95; g.add(win);
    for (const z of [L * 0.38, 0, -L * 0.38]) { wheel(-W / 2, z, 0.42); wheel(W / 2, z, 0.42); }
  } else if (spec.type === 'van') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, 1.5, L), bodyMat);
    body.position.y = 1.05; g.add(body);
    const win = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, 0.5, L * 0.3), glassMat);
    win.position.set(0, 1.55, L * 0.28); g.add(win);
    frontWheels.push(wheel(-W / 2, L * 0.32, 0.36), wheel(W / 2, L * 0.32, 0.36));
    wheel(-W / 2, -L * 0.32, 0.36); wheel(W / 2, -L * 0.32, 0.36);
  } else {
    const lowY = spec.type === 'coupe' ? 0.55 : 0.62;
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, lowY, L), bodyMat);
    body.position.y = 0.45 + lowY / 2 - 0.27; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(W * 0.84, 0.5, L * (spec.type === 'coupe' ? 0.46 : 0.38)), glassMat);
    cab.position.set(0, 0.45 + lowY - 0.1, spec.type === 'coupe' ? -0.15 : -0.4); g.add(cab);
    if (spec.type === 'coupe') {
      const spo = new THREE.Mesh(new THREE.BoxGeometry(W * 0.92, 0.08, 0.42), bodyMat);
      spo.position.set(0, 1.02, -L / 2 + 0.25); g.add(spo);
    } else {
      const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.9), darkMat);
      scoop.position.set(0, 0.45 + lowY + 0.05, L * 0.22); g.add(scoop);
    }
    frontWheels.push(wheel(-W / 2, L * 0.3, 0.34), wheel(W / 2, L * 0.3, 0.34));
    wheel(-W / 2, -L * 0.3, 0.34); wheel(W / 2, -L * 0.3, 0.34);
  }
  lights(g, spec);
  const rearMat = g.userData.rearMat;
  return { group: g, wheels, frontWheels, rearMat };
}

function lights(g, spec) {
  const L = spec.L, W = spec.W;
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff3b0, emissive: 0x888044 });
  const rearMat = new THREE.MeshLambertMaterial({ color: 0x801818, emissive: 0x300404 });
  const hy = spec.type === 'bus' ? 1.2 : (spec.type === 'van' ? 0.95 : 0.62);
  for (const x of [-W * 0.32, W * 0.32]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.1), headMat);
    h.position.set(x, hy, L / 2 + 0.02); g.add(h);
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.1), rearMat);
    r.position.set(x, hy, -L / 2 - 0.02); g.add(r);
  }
  g.userData.rearMat = rearMat;
}

// Tráfico: turismo, taxi, furgoneta o autobús.
const TRAFFIC_COLORS = [0xcfd2d6, 0x7b8794, 0x314158, 0x7c2d2d, 0x274e13, 0x5b4a82, 0xd9c8a9, 0x8a8f2a, 0x22313f];
export function buildTrafficMesh(kind) {
  const color = kind === 'taxi' ? 0xe8b714 : kind === 'bus' ? 0x2f6db5 : TRAFFIC_COLORS[(Math.random() * TRAFFIC_COLORS.length) | 0];
  if (kind === 'bus') return buildCarMesh({ type: 'bus', color, L: 10, W: 2.5 });
  if (kind === 'van') return buildCarMesh({ type: 'van', color, L: 4.8, W: 2.0 });
  const g = new THREE.Group();
  const bMat = new THREE.MeshLambertMaterial({ color });
  const dMat = new THREE.MeshLambertMaterial({ color: 0x1c2128 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 4.3), bMat);
  body.position.y = 0.75; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.1), new THREE.MeshLambertMaterial({ color: 0x2c3e50 }));
  cab.position.set(0, 1.35, -0.2); g.add(cab);
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.3), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x444444 }));
    sign.position.set(0, 1.75, -0.2); g.add(sign);
  }
  const wheels = [], frontWheels = [];
  for (const z of [1.45, -1.45]) for (const x of [-0.95, 0.95]) {
    const grp = new THREE.Group();
    grp.position.set(x, 0.31, z);
    const geo = new THREE.CylinderGeometry(0.31, 0.31, 0.3, 10);
    geo.rotateZ(Math.PI / 2);
    const w = new THREE.Mesh(geo, dMat);
    grp.add(w); g.add(grp);
    wheels.push(w);
    if (z > 0) frontWheels.push(grp);
  }
  lights(g, { L: 4.3, W: 1.9, type: 'sedan' });
  return { group: g, wheels, frontWheels, rearMat: g.userData.rearMat };
}

// Coche patrulla: blanco y negro con barra de luces (roja y azul alternas en persecución).
export function buildCopMesh() {
  const parts = buildCarMesh({ type: 'muscle', color: 0xf2f2f2, L: 4.6, W: 1.95 });
  const g = parts.group;
  const black = new THREE.MeshLambertMaterial({ color: 0x15181d });
  for (const z of [1.5, -1.6]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.97, 0.5, 1.2), black);
    panel.position.set(0, 0.55, z); g.add(panel);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.3), black);
  bar.position.set(0, 1.22, -0.4); g.add(bar);
  parts.siren = [0xff2020, 0x2050ff].map((color, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.28), new THREE.MeshBasicMaterial({ color }));
    m.position.set(i ? 0.32 : -0.32, 1.33, -0.4);
    m.visible = false;
    g.add(m);
    return m;
  });
  return parts;
}
