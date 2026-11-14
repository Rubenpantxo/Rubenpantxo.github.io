// Enrutado ortogonal de cables sobre la rejilla.
//
// A* sobre los nodos de la rejilla con estado (nodo, dirección) para poder
// penalizar los giros. Los cuerpos de las piezas no bloquean (un puente real
// puede pasar por encima de una placa) pero cuestan, igual que pisar el pad
// de otro pin o correr encima de un cable de otra red. El resultado son
// trazados limpios, con pocas esquinas y sin solapes engañosos.

import { U, VEC, DIRS, cajaParte, posPin } from './modelo.js';

const COSTE_GIRO = 3;
const COSTE_CUERPO = 9;
const COSTE_PAD = 40;
const COSTE_SOLAPE = 14;
const COSTE_CRUCE = 2;
const MAX_NODOS = 40000;
const MARGEN = 8;

// Trazado directo en Z: barato, para arrastres y como alternativa.
export function rutaSimple(a, b) {
    const s = 2 * U;
    const p1 = { x: a.x + VEC[a.dir][0] * s, y: a.y + VEC[a.dir][1] * s };
    const p2 = { x: b.x + VEC[b.dir][0] * s, y: b.y + VEC[b.dir][1] * s };
    const horizontal = a.dir === 'izq' || a.dir === 'der';
    const codo = horizontal ? { x: p1.x, y: p2.y } : { x: p2.x, y: p1.y };
    return simplificar([a, p1, codo, p2, b].map(p => [p.x, p.y]));
}

export function simplificar(puntos) {
    const out = [];
    for (const p of puntos) {
        const n = out.length;
        if (n && out[n - 1][0] === p[0] && out[n - 1][1] === p[1]) continue;
        if (n >= 2) {
            const [ax, ay] = out[n - 2], [bx, by] = out[n - 1];
            if ((ax === bx && bx === p[0]) || (ay === by && by === p[1])) { out[n - 1] = p; continue; }
        }
        out.push(p);
    }
    return out;
}

class Monticulo {
    constructor() { this.k = []; this.v = []; }
    get vacio() { return this.k.length === 0; }
    meter(clave, valor) {
        const k = this.k, v = this.v;
        let i = k.length;
        k.push(clave); v.push(valor);
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (k[p] <= clave) break;
            k[i] = k[p]; v[i] = v[p]; i = p;
        }
        k[i] = clave; v[i] = valor;
    }
    sacar() {
        const k = this.k, v = this.v;
        const cima = v[0];
        const uk = k.pop(), uv = v.pop();
        const n = k.length;
        if (n) {
            let i = 0;
            for (;;) {
                let h = 2 * i + 1;
                if (h >= n) break;
                if (h + 1 < n && k[h + 1] < k[h]) h++;
                if (k[h] >= uk) break;
                k[i] = k[h]; v[i] = v[h]; i = h;
            }
            k[i] = uk; v[i] = uv;
        }
        return cima;
    }
}

// Prepara el plano de costes del documento y devuelve una función que traza
// cables uno a uno, anotando por dónde pasa cada red para separar las demás.
export function crearEnrutador(doc, catalogo) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const cajas = [];
    for (const p of doc.partes) {
        const def = catalogo.get(p.tipo);
        if (!def) continue;
        const c = cajaParte(p, def);
        cajas.push({ p, def, c });
        x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y);
        x1 = Math.max(x1, c.x + c.w); y1 = Math.max(y1, c.y + c.h);
    }
    if (!cajas.length) return () => null;
    const ox = Math.round(x0 / U) - MARGEN, oy = Math.round(y0 / U) - MARGEN;
    const W = Math.round(x1 / U) - ox + MARGEN + 1, H = Math.round(y1 / U) - oy + MARGEN + 1;
    const base = new Uint8Array(W * H);
    for (const { p, def, c } of cajas) {
        const cx0 = c.x / U - ox, cy0 = c.y / U - oy, cx1 = cx0 + c.w / U, cy1 = cy0 + c.h / U;
        for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) base[y * W + x] = COSTE_CUERPO;
        for (const pin of def.pines) {
            const q = posPin(p, def, pin);
            base[(q.y / U - oy) * W + (q.x / U - ox)] = COSTE_PAD;
        }
    }
    // Ocupación por cables ya trazados: red que corre en horizontal/vertical.
    const ocH = new Int32Array(W * H), ocV = new Int32Array(W * H);

    return function trazar(a, b, red = 0) {
        const ax = a.x / U - ox, ay = a.y / U - oy, bx = b.x / U - ox, by = b.y / U - oy;
        const da = DIRS.indexOf(a.dir), db = DIRS.indexOf(b.dir);
        // Se sale un nodo en la dirección del pin y se llega igual al destino.
        const sx = ax + VEC[a.dir][0], sy = ay + VEC[a.dir][1];
        const tx = bx + VEC[b.dir][0], ty = by + VEC[b.dir][1];
        const dentro = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
        if (!dentro(sx, sy) || !dentro(tx, ty)) return null;
        if (sx === tx && sy === ty) return anotar([[ax, ay], [sx, sy], [bx, by]]);

        const g = new Float32Array(W * H * 4).fill(Infinity);
        const de = new Int32Array(W * H * 4).fill(-1);
        const cola = new Monticulo();
        const ini = (sy * W + sx) * 4 + da;
        g[ini] = 0;
        cola.meter(Math.abs(sx - tx) + Math.abs(sy - ty), ini);
        const llegada = (db + 2) % 4; // se entra al destino en sentido contrario a su salida
        let fin = -1, vistos = 0;

        while (!cola.vacio) {
            const e = cola.sacar();
            const d = e & 3, nodo = e >> 2, x = nodo % W, y = (nodo - x) / W;
            if (x === tx && y === ty) { fin = e; break; }
            if (++vistos > MAX_NODOS) break;
            const ge = g[e];
            for (let nd = 0; nd < 4; nd++) {
                if (nd === ((d + 2) & 3)) continue; // sin media vuelta
                const nx = x + VEC[DIRS[nd]][0], ny = y + VEC[DIRS[nd]][1];
                if (!dentro(nx, ny)) continue;
                const ni = ny * W + nx;
                let c = 1 + base[ni] + (nd === d ? 0 : COSTE_GIRO);
                const horizontal = nd & 1;
                const mia = horizontal ? ocH[ni] : ocV[ni], otra = horizontal ? ocV[ni] : ocH[ni];
                if (mia) c += mia === red ? -0.4 : COSTE_SOLAPE;
                if (otra && otra !== red) c += COSTE_CRUCE;
                if (nx === tx && ny === ty) {
                    if (nd !== llegada) c += COSTE_GIRO;
                    c -= base[ni]; // el nodo de llegada no penaliza
                }
                const ng = ge + c, ne = ni * 4 + nd;
                if (ng < g[ne]) {
                    g[ne] = ng; de[ne] = e;
                    cola.meter(ng + Math.abs(nx - tx) + Math.abs(ny - ty), ne);
                }
            }
        }
        if (fin < 0) return null;
        const puntos = [[bx, by]];
        for (let e = fin; e >= 0; e = de[e]) { const n = e >> 2; puntos.push([n % W, (n - n % W) / W]); }
        puntos.push([ax, ay]);
        puntos.reverse();
        return anotar(puntos);

        function anotar(nodos) {
            for (let i = 1; i < nodos.length; i++) {
                const [px, py] = nodos[i - 1], [qx, qy] = nodos[i];
                const oc = py === qy ? ocH : ocV;
                oc[py * W + px] = red; oc[qy * W + qx] = red;
            }
            return simplificar(nodos.map(([x, y]) => [(x + ox) * U, (y + oy) * U]));
        }
    };
}

// Trazado en formato de atributo `d` con esquinas redondeadas.
export function caminoSvg(puntos, radio = 4) {
    if (!puntos || puntos.length < 2) return '';
    let d = `M${puntos[0][0]} ${puntos[0][1]}`;
    for (let i = 1; i < puntos.length - 1; i++) {
        const [px, py] = puntos[i - 1], [x, y] = puntos[i], [nx, ny] = puntos[i + 1];
        const l1 = Math.hypot(x - px, y - py), l2 = Math.hypot(nx - x, ny - y);
        const r = Math.min(radio, l1 / 2, l2 / 2);
        const ex = x - (x - px) / l1 * r, ey = y - (y - py) / l1 * r;
        const sx = x + (nx - x) / l2 * r, sy = y + (ny - y) / l2 * r;
        d += ` L${ex} ${ey} Q${x} ${y} ${sx} ${sy}`;
    }
    const u = puntos[puntos.length - 1];
    return d + ` L${u[0]} ${u[1]}`;
}

export function longitudRuta(puntos) {
    let l = 0;
    for (let i = 1; i < puntos.length; i++) l += Math.abs(puntos[i][0] - puntos[i - 1][0]) + Math.abs(puntos[i][1] - puntos[i - 1][1]);
    return l;
}
