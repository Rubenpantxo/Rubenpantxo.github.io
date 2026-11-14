// Colisiones con la ciudad: cajas alineadas con los ejes (edificios, árboles, pilares, muros)
// guardadas en una rejilla. Misma interfaz que usa la física y la IA:
//  contacts(x, z, r, y)  → empujes { depth, nx, nz } de un círculo de radio r a la altura y
//  blocks(ax, az, bx, bz, y) → ¿corta la línea alguna pared alta (≥ 2 m)?
const GRID = 16;

export class World {
  constructor() { this.grid = new Map(); this.count = 0; }

  // b: { minX, maxX, minZ, maxZ, h (altura, por defecto muy alta) }
  add(b) {
    const box = { h: 50, ...b };
    this.count++;
    for (let gx = Math.floor(box.minX / GRID); gx <= Math.floor(box.maxX / GRID); gx++) {
      for (let gz = Math.floor(box.minZ / GRID); gz <= Math.floor(box.maxZ / GRID); gz++) {
        const k = `${gx},${gz}`;
        if (!this.grid.has(k)) this.grid.set(k, []);
        this.grid.get(k).push(box);
      }
    }
  }

  near(x0, z0, x1, z1) {
    const out = new Set();
    for (let gx = Math.floor(x0 / GRID); gx <= Math.floor(x1 / GRID); gx++) {
      for (let gz = Math.floor(z0 / GRID); gz <= Math.floor(z1 / GRID); gz++) {
        for (const b of this.grid.get(`${gx},${gz}`) ?? []) out.add(b);
      }
    }
    return out;
  }

  contacts(x, z, r, y = 0) {
    const out = [];
    for (const b of this.near(x - r, z - r, x + r, z + r)) {
      if (b.h < y + 0.5) continue;                       // por debajo (se pasa por encima)
      const qx = Math.max(b.minX, Math.min(b.maxX, x)), qz = Math.max(b.minZ, Math.min(b.maxZ, z));
      let dx = x - qx, dz = z - qz;
      const d = Math.hypot(dx, dz);
      if (d >= r) continue;
      if (d < 1e-4) {
        // Centro dentro de la caja: sale por el lado más cercano.
        const sides = [[x - b.minX, -1, 0], [b.maxX - x, 1, 0], [z - b.minZ, 0, -1], [b.maxZ - z, 0, 1]];
        sides.sort((a, c) => a[0] - c[0]);
        out.push({ depth: r + sides[0][0], nx: sides[0][1], nz: sides[0][2] });
        continue;
      }
      dx /= d; dz /= d;
      out.push({ depth: r - d, nx: dx, nz: dz });
    }
    return out;
  }

  // Obstáculos pequeños (pilares, árboles) como objetos a esquivar por la IA: { pos, type.radius }.
  around(x, z, r) {
    const out = [];
    for (const b of this.near(x - r, z - r, x + r, z + r)) {
      const w = b.maxX - b.minX, d = b.maxZ - b.minZ;
      if (w > 3 || d > 3) continue;
      const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
      if (Math.hypot(cx - x, cz - z) > r) continue;
      out.push({ pos: { x: cx, y: 0, z: cz }, type: { radius: Math.max(w, d) / 2 } });
    }
    return out;
  }

  blocks(ax, az, bx, bz, y = 0) {
    for (const b of this.near(Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz))) {
      if (b.h < y + 2) continue;
      if (segmentHitsBox(ax, az, bx, bz, b)) return true;
    }
    return false;
  }
}

// Recorte del segmento contra la caja (método de las franjas).
function segmentHitsBox(ax, az, bx, bz, b) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dz = bz - az;
  for (const [p, d, lo, hi] of [[ax, dx, b.minX, b.maxX], [az, dz, b.minZ, b.maxZ]]) {
    if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return false; continue; }
    let ta = (lo - p) / d, tb = (hi - p) / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}
