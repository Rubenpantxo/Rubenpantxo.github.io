// Red de calles de Bahía Pantxo: cuadrícula de (n+1)×(n+1) cruces unidos por tramos rectos de
// doble sentido con dos carriles por sentido. Da los tramos al tráfico (ambient.js) y rutas por las
// calles a los rivales y a la policía.
export class CityNet {
  // streetC(i): coordenada del eje de la calle i; n: número de manzanas; width: anchura de calzada.
  constructor(streetC, n, width) {
    this.streetC = streetC;
    this.n = n;
    this.width = width;
    this.roads = [];
    let id = 0;
    const road = (a, b) => {
      const mid = [(a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2];
      this.roads.push({ id: id++, pts: [[a[0], 0, a[1]], mid, [b[0], 0, b[1]]], fwd: 2, back: 2, twoWay: true, width, span: [-width / 2, width / 2] });
    };
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        if (i < n) road([streetC(i), streetC(j)], [streetC(i + 1), streetC(j)]);
        if (j < n) road([streetC(i), streetC(j)], [streetC(i), streetC(j + 1)]);
      }
    }
    this.lo = streetC(0);
    this.hi = streetC(n);
  }

  node(i, j) { return [this.streetC(i), this.streetC(j)]; }

  // Punto de calle más cercano: { x, z, a: [i, j], b: [i, j] } (cruces de los extremos del tramo).
  snap(p) {
    const n = this.n, sc = this.streetC;
    const pitch = sc(1) - sc(0);
    const cl = (v) => Math.max(this.lo, Math.min(this.hi, v));
    const idx = (v) => Math.max(0, Math.min(n, Math.round((v - this.lo) / pitch)));
    // Calle vertical más cercana (x fija) y horizontal más cercana (z fija).
    const vi = idx(p.x), hj = idx(p.z);
    const vz = cl(p.z), hx = cl(p.x);
    const dv = Math.hypot(p.x - sc(vi), p.z - vz), dh = Math.hypot(p.z - sc(hj), p.x - hx);
    if (dv <= dh) {
      const j0 = Math.max(0, Math.min(n - 1, Math.floor((vz - this.lo) / pitch)));
      return { x: sc(vi), z: vz, a: [vi, j0], b: [vi, j0 + 1], d: dv };
    }
    const i0 = Math.max(0, Math.min(n - 1, Math.floor((hx - this.lo) / pitch)));
    return { x: hx, z: sc(hj), a: [i0, hj], b: [i0 + 1, hj], d: dh };
  }

  // Cruces de la ruta más corta entre dos puntos (Dijkstra sobre la cuadrícula). Cada giro cuesta
  // TURN metros de más: entre rutas de igual longitud prefiere avenidas rectas a una escalera de giros.
  search(A, B) {
    const TURN = 30;
    const n = this.n, nodeKey = (c) => c[0] * (n + 1) + c[1];
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const key = (c, d) => nodeKey(c) * 5 + d;          // d = 4: recién empezado, sin dirección
    const dist = new Map(), prev = new Map(), open = [];
    const push = (c, d, cost, from) => {
      const k = key(c, d);
      if (dist.has(k) && dist.get(k) <= cost) return;
      dist.set(k, cost); prev.set(k, from); open.push([cost, c, d]);
    };
    for (const c of [A.a, A.b]) {
      const w = this.node(...c);
      push(c, 4, Math.hypot(w[0] - A.x, w[1] - A.z), null);
    }
    const goal = new Set([nodeKey(B.a), nodeKey(B.b)]);
    let best = null, bestCost = Infinity;
    while (open.length) {
      open.sort((p, q) => q[0] - p[0]);
      const [cost, c, d] = open.pop();
      if (cost > dist.get(key(c, d))) continue;
      if (cost >= bestCost) break;
      if (goal.has(nodeKey(c))) {
        const w = this.node(...c);
        const total = cost + Math.hypot(w[0] - B.x, w[1] - B.z);
        if (total < bestCost) { bestCost = total; best = key(c, d); }
      }
      DIRS.forEach(([di, dj], nd) => {
        const m = [c[0] + di, c[1] + dj];
        if (m[0] < 0 || m[1] < 0 || m[0] > n || m[1] > n) return;
        const step = Math.hypot(this.streetC(m[0]) - this.streetC(c[0]), this.streetC(m[1]) - this.streetC(c[1]));
        push(m, nd, cost + step + (d !== 4 && d !== nd ? TURN : 0), key(c, d));
      });
    }
    const chain = [];
    for (let k = best; k !== null && k !== undefined; k = prev.get(k)) {
      const node = Math.floor(k / 5);
      chain.unshift([Math.floor(node / (n + 1)), node % (n + 1)]);
    }
    return chain;
  }

  // Ruta por las calles de p a q como lista de [x, y, z]; offset: metros a la derecha del sentido de
  // la marcha (en las esquinas, el punto de inglete de los dos tramos).
  route(p, q, offset = 0) {
    const A = this.snap(p), B = this.snap(q);
    const sameRoad = A.a[0] === B.a[0] && A.a[1] === B.a[1] && A.b[0] === B.b[0] && A.b[1] === B.b[1];
    const pts = [[A.x, A.z]];
    if (!sameRoad) for (const c of this.search(A, B)) pts.push(this.node(...c));
    pts.push([B.x, B.z]);
    // Sin puntos repetidos ni idas y vueltas sobre el mismo tramo.
    const clean = [pts[0]];
    for (let k = 1; k < pts.length; k++) {
      const a = clean[clean.length - 1];
      if (Math.hypot(pts[k][0] - a[0], pts[k][1] - a[1]) < 1) continue;
      if (clean.length >= 2) {
        const o = clean[clean.length - 2];
        const d1 = [a[0] - o[0], a[1] - o[1]], d2 = [pts[k][0] - a[0], pts[k][1] - a[1]];
        if (d1[0] * d2[0] + d1[1] * d2[1] < -0.5 * Math.hypot(...d1) * Math.hypot(...d2)) { clean.pop(); k--; continue; }
      }
      clean.push(pts[k]);
    }
    return offsetPolyline(clean, offset).map(([x, z]) => [x, 0, z]);
  }
}

// Desplaza una polilínea a la derecha de su sentido (derecha de (dx, dz) = (−dz, dx)).
export function offsetPolyline(pts, o) {
  if (!o || pts.length < 2) return pts;
  const dirs = [];
  for (let k = 1; k < pts.length; k++) {
    const dx = pts[k][0] - pts[k - 1][0], dz = pts[k][1] - pts[k - 1][1];
    const L = Math.hypot(dx, dz) || 1;
    dirs.push([dx / L, dz / L]);
  }
  return pts.map((p, k) => {
    const a = dirs[Math.max(0, k - 1)], b = dirs[Math.min(dirs.length - 1, k)];
    let rx = -(a[1] + b[1]), rz = a[0] + b[0];
    const len = Math.hypot(rx, rz);
    if (len < 1e-3) { rx = -a[1]; rz = a[0]; } else { rx /= len; rz /= len; }
    // Inglete: en un giro de 90° el punto queda a o·√2 del cruce.
    const cos = rx * -a[1] + rz * a[0];
    const m = o / Math.max(0.5, cos);
    return [p[0] + rx * m, p[1] + rz * m];
  });
}

// Trazada densa para la IA: une los puntos dados por las calles (carril derecho a offset metros).
export function densifyPath(net, path, loop = false, offset = 4.5) {
  const out = [];
  const n = path.length;
  const pairs = loop ? n : n - 1;
  for (let k = 0; k < pairs; k++) {
    const p = path[k], q = path[(k + 1) % n];
    const r = net.route(p, q, offset);
    const from = out.length ? 1 : 0;
    for (const v of r.slice(from)) {
      const last = out[out.length - 1];
      if (last && Math.hypot(v[0] - last.x, v[2] - last.z) < 4) continue;
      out.push({ x: v[0], y: v[1], z: v[2], side: 0, target: -1, brake: 0 });
    }
  }
  if (loop && out.length > 2 && Math.hypot(out[0].x - out[out.length - 1].x, out[0].z - out[out.length - 1].z) < 4) out.pop();
  return out;
}
