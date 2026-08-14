/* ============================================================
   JENGA — torre de madera interactiva de la página principal.

   Física 2.5D real: cada pieza es un cuerpo rígido con posición
   (x, y, z) y giro sobre el eje vertical. Se apoyan unas sobre
   otras, vuelcan si su centro de gravedad queda fuera del apoyo,
   y al derrumbarse la torre el montón queda ahí, amontonado.
   No hay botón de reconstruir: la torre solo vuelve recargando.

   Interacción:
   - Bloques de la torre: se sacan tirando por su eje largo. Si
     los dejas a medias, se quedan así (y la torre lo acusa).
   - Piezas sueltas: se agarran, se arrastran, giran si las
     empujas por una punta, se lanzan y se pueden volver a
     colocar encima de la torre.
   - El pulso importa: si aceleras, la torre tiembla; si te
     pasas, se viene abajo.
   ============================================================ */
(() => {
    'use strict';

    const canvas = document.getElementById('jenga-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ---------- Constantes ----------
    const INIT_LAYERS = 16;
    const BL = 150, BW = 50, BH = 32;    // largo, ancho, alto (unidades de mundo)
    const PROJX = 0.46, PROJY = -0.26;   // proyección oblicua del eje de profundidad
    const PULL_LIMIT = BL * 0.62;        // recorrido para que el bloque salga del todo
    const GRAV = 0.55;
    const SNAP_RADIUS = 120;
    const REST = 0.14;                   // rebote de la madera (poco)
    const FRIC = 0.88;                   // fricción al deslizar apoyado
    const SPEED_CALM = 8;
    const SPEED_BREAK = 26;

    // ---------- Estado ----------
    let bodies = [];        // todas las piezas, siempre las mismas 48
    let hand = null;        // pieza en la mano (referencia a un body)
    let topple = null;      // empuje sostenido del vuelco { cx, cz, from, n }
    let wobble = 0, tremble = 0, shake = 0;
    let drag = null;        // arrastre en curso { body, mode:'tower'|'free', ... }
    let hoverB = null;
    let target = null;      // hueco de destino cuando llevas una pieza
    let handSpeed = 0, handVX = 0, handVY = 0;
    let lastPt = null;
    let topL = 0;
    let t = 0;
    let dpr = 1, W = 0, H = 0, scale = 1, scaleGoal = 1, baseX = 0, baseY = 0;

    function rng(seed) {
        let a = seed >>> 0;
        return () => {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let x = Math.imul(a ^ a >>> 15, 1 | a);
            x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
            return ((x ^ x >>> 14) >>> 0) / 4294967296;
        };
    }

    // ---------- Texturas de madera ----------
    // Cada pieza genera una vez sus tres caras: veta larga, testa y canto
    // superior. Nudos, anillos y motas salen de su semilla: no hay dos iguales.
    const TEX_RES = 2.2;

    function mkCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = Math.round(w * TEX_RES);
        c.height = Math.round(h * TEX_RES);
        const g = c.getContext('2d');
        g.scale(TEX_RES, TEX_RES);
        return [c, g];
    }

    function paintGrainLines(g, r, w, h, hue, tone, n, waviness) {
        for (let i = 0; i < n; i++) {
            const gy = h * (0.08 + 0.84 * r());
            const dark = 14 + r() * 16;
            g.strokeStyle = `hsla(${hue - 6 + r() * 8},${38 + r() * 18}%,${tone - dark}%,${0.16 + r() * 0.22})`;
            g.lineWidth = 0.5 + r() * 1.4;
            g.beginPath();
            g.moveTo(-2, gy);
            let x = 0, y = gy;
            while (x < w + 2) {
                const nx = x + 14 + r() * 22;
                const ny = gy + (r() - 0.5) * h * waviness;
                g.quadraticCurveTo((x + nx) / 2, y + (r() - 0.5) * 3, nx, ny);
                x = nx; y = ny;
            }
            g.stroke();
        }
    }

    function paintKnot(g, r, kx, ky, kr, hue, tone) {
        const core = kr * (0.25 + r() * 0.15);
        for (let i = 5; i >= 0; i--) {
            const rr = core + (kr - core) * i / 5;
            g.strokeStyle = `hsla(${hue - 10},45%,${tone - 26 - i * 2}%,${0.5 - i * 0.06})`;
            g.lineWidth = 0.8;
            g.beginPath();
            g.ellipse(kx, ky, rr * (1.25 + r() * 0.2), rr * (0.85 + r() * 0.2), (r() - 0.5) * 0.6, 0, 7);
            g.stroke();
        }
        g.fillStyle = `hsla(${hue - 14},50%,${tone - 34}%,0.85)`;
        g.beginPath();
        g.ellipse(kx, ky, core, core * 0.8, 0, 0, 7);
        g.fill();
    }

    function paintSpeckle(g, r, w, h, tone, n) {
        for (let i = 0; i < n; i++) {
            const light = r() > 0.5;
            g.fillStyle = light
                ? `hsla(40,40%,${Math.min(92, tone + 18)}%,0.10)`
                : `hsla(28,45%,${tone - 20}%,0.08)`;
            g.fillRect(r() * w, r() * h, 0.6 + r() * 1.6, 0.4 + r() * 0.9);
        }
    }

    function bakeTextures(b) {
        const hue = b.hue, tone = b.tone, sat = b.sat;

        // --- cara larga (frontal / trasera) ---
        {
            const [c, g] = mkCanvas(BL, BH);
            const r = rng(b.seed * 977 + 11);
            const grad = g.createLinearGradient(0, 0, 0, BH);
            grad.addColorStop(0, `hsl(${hue},${sat}%,${Math.min(88, tone + 4)}%)`);
            grad.addColorStop(1, `hsl(${hue},${sat}%,${tone - 4}%)`);
            g.fillStyle = grad;
            g.fillRect(0, 0, BL, BH);
            // bandas anchas de color desigual: madera de distintas tablas
            for (let i = 0; i < 3; i++) {
                g.fillStyle = `hsla(${hue - 4 + r() * 10},${sat}%,${tone + (r() - 0.6) * 14}%,0.18)`;
                const bw = 20 + r() * 60;
                g.fillRect(r() * (BL - bw), 0, bw, BH);
            }
            paintGrainLines(g, r, BL, BH, hue, tone, 5 + Math.floor(r() * 4), 0.14);
            if (r() < 0.3) paintKnot(g, r, BL * (0.15 + r() * 0.7), BH * (0.3 + r() * 0.4), 3.5 + r() * 3.5, hue, tone);
            paintSpeckle(g, r, BL, BH, tone, 50);
            // extremos ligeramente quemados y arista superior con brillo
            const eg = g.createLinearGradient(0, 0, BL, 0);
            eg.addColorStop(0, `hsla(${hue - 8},40%,${tone - 22}%,0.25)`);
            eg.addColorStop(0.06, 'rgba(0,0,0,0)');
            eg.addColorStop(0.94, 'rgba(0,0,0,0)');
            eg.addColorStop(1, `hsla(${hue - 8},40%,${tone - 22}%,0.25)`);
            g.fillStyle = eg;
            g.fillRect(0, 0, BL, BH);
            g.fillStyle = `hsla(45,50%,${Math.min(92, tone + 20)}%,0.30)`;
            g.fillRect(0, 0, BL, 1.4);
            b.texLong = c;
        }

        // --- testa (los dos extremos): anillos de crecimiento ---
        {
            const [c, g] = mkCanvas(BW, BH);
            const r = rng(b.seed * 613 + 29);
            g.fillStyle = `hsl(${hue - 3},${sat}%,${tone - 6}%)`;
            g.fillRect(0, 0, BW, BH);
            const cx = BW * (0.2 + r() * 0.6), cy = BH * (0.25 + r() * 0.5);
            for (let i = 1; i <= 7; i++) {
                g.strokeStyle = `hsla(${hue - 8},42%,${tone - 18 - i}%,${0.32 - i * 0.02})`;
                g.lineWidth = 0.7 + r() * 0.7;
                g.beginPath();
                g.ellipse(cx, cy, i * (3 + r() * 2.2), i * (2 + r() * 1.6), 0, 0, 7);
                g.stroke();
            }
            if (r() < 0.4) { // grieta radial de secado
                g.strokeStyle = `hsla(${hue - 12},40%,${tone - 30}%,0.5)`;
                g.lineWidth = 0.9;
                g.beginPath();
                g.moveTo(cx, cy);
                const a = r() * Math.PI * 2;
                g.lineTo(cx + Math.cos(a) * BW, cy + Math.sin(a) * BH);
                g.stroke();
            }
            paintSpeckle(g, r, BW, BH, tone, 20);
            b.texEnd = c;
        }

        // --- canto superior: veta a lo largo, más clara ---
        {
            const [c, g] = mkCanvas(BL, BW);
            const r = rng(b.seed * 389 + 53);
            g.fillStyle = `hsl(${hue},${sat - 4}%,${Math.min(90, tone + 12)}%)`;
            g.fillRect(0, 0, BL, BW);
            paintGrainLines(g, r, BL, BW, hue, Math.min(88, tone + 10), 6 + Math.floor(r() * 4), 0.10);
            if (r() < 0.22) paintKnot(g, r, BL * (0.2 + r() * 0.6), BW * (0.25 + r() * 0.5), 3 + r() * 3, hue, tone + 6);
            paintSpeckle(g, r, BL, BW, tone + 8, 40);
            b.texTop = c;
        }
    }

    // ---------- Construcción ----------
    function buildTower() {
        bodies = [];
        let id = 0;
        for (let k = 0; k < INIT_LAYERS; k++) {
            const along = k % 2 === 0;
            for (let s = 0; s < 3; s++) {
                const r = rng(k * 31 + s * 7 + 5);
                const off = (s - 1) * BW;
                const b = {
                    id: id++, seed: k * 131 + s * 17 + 7,
                    state: 'tower',           // 'tower' | 'free' | 'hand'
                    layer: k, slot: s, along, out: 0,
                    x: along ? 0 : off, z: along ? off : 0,
                    y: (k + 0.5) * BH,
                    th: along ? 0 : Math.PI / 2,
                    vx: 0, vy: 0, vz: 0, om: 0,
                    tilt: 0, tiltV: 0,
                    asleep: true, rest: 0, supported: false,
                    hue: 30 + r() * 9,
                    sat: 38 + r() * 10,
                    tone: 56 + r() * 16
                };
                bakeTextures(b);
                bodies.push(b);
            }
        }
        refreshTower();
    }

    function towerBlocks() { return bodies.filter(b => b.state === 'tower'); }
    function layerBlocks(k) { return bodies.filter(b => b.state === 'tower' && b.layer === k); }

    function refreshTower() {
        let top = -1;
        for (const b of bodies) if (b.state === 'tower' && b.layer > top) top = b.layer;
        topL = top;
        recomputeScale();
    }

    // posición de mundo de un bloque de torre según su hueco y desplazamiento
    function towerPose(b) {
        const off = (b.slot - 1) * BW;
        if (b.along) { b.x = b.out; b.z = off; b.th = 0; }
        else { b.x = off; b.z = b.out; b.th = Math.PI / 2; }
        b.y = (b.layer + 0.5) * BH;
    }


    // ---------- Proyección ----------
    function swayAt(y) {
        if (topL < 1) return 0;
        const k = y / BH;
        const h = Math.min(1, k / Math.max(1, topL));
        const lento = Math.sin(t * 0.045 + k * 0.35) * wobble * 6;
        const rapido = Math.sin(t * 0.85 + k * 1.15) * tremble * 7;
        const golpe = Math.sin(t * 0.31) * shake * 4;
        return (lento + rapido + golpe) * h;
    }

    function proj(x, y, z) {
        return {
            x: baseX + (x + z * PROJX) * scale,
            y: baseY - (y - z * PROJY) * scale
        };
    }

    // las 8 esquinas del cuerpo en mundo (con giro th), proyectadas
    function bodyCorners(b, sway) {
        const c = Math.cos(b.th), s = Math.sin(b.th);
        const hx = BL / 2, hz = BW / 2, hh = BH / 2;
        const sw = sway === undefined ? 0 : sway;
        // 4 esquinas en planta, orden CCW visto desde arriba
        const pc = [
            [b.x + c * hx - s * hz, b.z + s * hx + c * hz],
            [b.x - c * hx - s * hz, b.z - s * hx + c * hz],
            [b.x - c * hx + s * hz, b.z - s * hx - c * hz],
            [b.x + c * hx + s * hz, b.z + s * hx - c * hz]
        ];
        const lo = [], hi = [];
        for (const [px, pz] of pc) {
            lo.push(proj(px + sw, b.y - hh, pz));
            hi.push(proj(px + sw, b.y + hh, pz));
        }
        return { lo, hi, pc };
    }

    // ---------- Planta: colisiones OBB con giro ----------
    function planCorners(b) {
        const c = Math.cos(b.th), s = Math.sin(b.th);
        const hx = BL / 2, hz = BW / 2;
        return [
            [b.x + c * hx - s * hz, b.z + s * hx + c * hz],
            [b.x - c * hx - s * hz, b.z - s * hx + c * hz],
            [b.x - c * hx + s * hz, b.z - s * hx - c * hz],
            [b.x + c * hx + s * hz, b.z + s * hx - c * hz]
        ];
    }

    // SAT en planta: menor solape y eje entre dos rectángulos girados.
    // Devuelve null si no se tocan.
    function planOverlap(a, b) {
        const ca = planCorners(a), cb = planCorners(b);
        const axes = [
            [Math.cos(a.th), Math.sin(a.th)], [-Math.sin(a.th), Math.cos(a.th)],
            [Math.cos(b.th), Math.sin(b.th)], [-Math.sin(b.th), Math.cos(b.th)]
        ];
        let depth = Infinity, ax = 0, az = 0;
        for (const [ux, uz] of axes) {
            let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
            for (const [px, pz] of ca) { const d = px * ux + pz * uz; if (d < amin) amin = d; if (d > amax) amax = d; }
            for (const [px, pz] of cb) { const d = px * ux + pz * uz; if (d < bmin) bmin = d; if (d > bmax) bmax = d; }
            const o = Math.min(amax, bmax) - Math.max(amin, bmin);
            if (o <= 0) return null;
            if (o < depth) { depth = o; ax = ux; az = uz; }
        }
        // orientar el eje de b hacia a
        const dx = a.x - b.x, dz = a.z - b.z;
        if (dx * ax + dz * az < 0) { ax = -ax; az = -az; }
        // punto de contacto aproximado: centros recortados al otro rectángulo
        const p1 = clampInto(b.x, b.z, a), p2 = clampInto(a.x, a.z, b);
        return { depth, ax, az, cx: (p1[0] + p2[0]) / 2, cz: (p1[1] + p2[1]) / 2 };
    }

    // recorta un punto del plano dentro del rectángulo girado de b
    function clampInto(px, pz, b) {
        const c = Math.cos(b.th), s = Math.sin(b.th);
        const dx = px - b.x, dz = pz - b.z;
        let u = dx * c + dz * s, w = -dx * s + dz * c;
        u = Math.max(-BL / 2, Math.min(BL / 2, u));
        w = Math.max(-BW / 2, Math.min(BW / 2, w));
        return [b.x + u * c - w * s, b.z + u * s + w * c];
    }

    // ---------- Física ----------
    const I_INV = 12 / (BL * BL + BW * BW);   // inversa del momento de inercia en planta

    function wake(b) {
        if (b.state === 'tower') {
            towerPose(b);
            b.state = 'free';
            b.asleep = false;
            b.rest = 0;
        } else if (b.state === 'free') {
            b.asleep = false;
            b.rest = 0;
        }
    }

    function worldHalfW() { return W / (2 * scale) - 40; }

    function physics() {
        const free = bodies.filter(b => b.state === 'free' && !b.asleep);
        if (free.length) {
            // la columna que vuelca sigue acelerando de lado unos instantes:
            // es lo que la despega de la torre y la desparrama por la mesa
            if (topple && topple.n-- > 0) {
                for (const b of free) {
                    const h = b.y / BH - topple.from;
                    if (h <= 0) continue;
                    const k = Math.min(h, 9) * 0.04;
                    b.vx += topple.cx * k;
                    b.vz += topple.cz * k;
                }
            } else topple = null;
            // de abajo arriba: primero se asientan los apoyos
            free.sort((a, b) => a.y - b.y);
            for (const b of free) stepBody(b);
        }
        // pieza dormida cuyo apoyo se marchó por debajo: despierta y cae
        for (const b of bodies) {
            if (b.state !== 'free' || !b.asleep) continue;
            if ((t + b.id) % 4 !== 0) continue;
            if (!hasSupport(b)) {
                wake(b);
                b.tiltV = (Math.random() - 0.5) * 0.03;
            }
        }
        shake *= 0.92;
        if (!drag && !hand) handSpeed *= 0.8;
        tremble += (targetTremble() - tremble) * 0.25;
        wobble = Math.max(wobble * 0.999, 0);
        scale += (scaleGoal - scale) * 0.06;
    }

    function hasSupport(b) {
        const hh = BH / 2;
        if (b.y - hh <= 1) return true;
        const myBot = b.y - hh;
        for (const o of bodies) {
            if (o === b || o.state === 'hand') continue;
            const oTop = o.y + hh;
            if (myBot < oTop - 3.5 || myBot > oTop + 3.5) continue;
            const ov = planOverlap(b, o);
            if (ov && ov.depth > 4) return true;
        }
        return false;
    }

    function stepBody(b) {
        b.vy -= GRAV;
        b.x += b.vx; b.y += b.vy; b.z += b.vz; b.th += b.om;
        b.om *= 0.985;

        const hh = BH / 2;
        let supTop = 0;          // altura del mejor apoyo bajo la pieza
        let supBody = null;
        let supCx = 0, supCz = 0, supN = 0;

        for (const o of bodies) {
            if (o === b || o.state === 'hand') continue;
            const oTop = o.y + hh, oBot = o.y - hh;
            const myBot = b.y - hh, myTop = b.y + hh;
            // ¿solape vertical?
            if (myBot >= oTop - 0.5 || oBot >= myTop - 0.5) {
                // sin solape: ¿posible apoyo justo debajo?
                if (myBot >= oTop - 0.5 && myBot <= oTop + 3 && b.vy <= 0.01) {
                    const ov = planOverlap(b, o);
                    if (ov && ov.depth > 4) {
                        if (oTop > supTop) { supTop = oTop; supBody = o; }
                        supCx += ov.cx; supCz += ov.cz; supN++;
                    }
                }
                continue;
            }
            const ov = planOverlap(b, o);
            if (!ov) continue;
            const vOverlap = Math.min(myTop, oTop) - Math.max(myBot, oBot);
            // cayendo sobre la cara superior del otro: apoyo, no choque lateral
            if (b.vy < -0.2 && vOverlap < BH * 0.55 && b.y > o.y && ov.depth > 4) {
                const vImp = Math.abs(b.vy);
                landOn(b, oTop);
                // golpe fuerte y descentrado: la pieza patina y gira al posarse
                if (vImp > 3) {
                    const dx = b.x - ov.cx, dz = b.z - ov.cz;
                    const d = Math.hypot(dx, dz) || 1;
                    const k = Math.min(1.3, vImp * 0.13);
                    b.vx += dx / d * k;
                    b.vz += dz / d * k;
                    b.om += (Math.random() - 0.5) * 0.05 * Math.min(2, vImp / 4);
                }
                if (oTop > supTop) { supTop = oTop; supBody = o; }
                supCx += ov.cx; supCz += ov.cz; supN++;
                impactOn(o, vImp + 1.5);
                continue;
            }
            // choque lateral: separar y repartir impulso
            sideHit(b, o, ov);
        }

        // suelo
        if (b.y - hh <= 0) {
            const vImp = Math.abs(b.vy);
            landOn(b, 0);
            if (vImp > 4) b.om += (Math.random() - 0.5) * 0.09;
            supTop = Math.max(supTop, 0);
            if (supN === 0) { supCx = b.x; supCz = b.z; supN = 1; }
            supBody = supBody || 'floor';
        }

        b.supported = false;
        if (supBody !== null && b.y - hh <= supTop + 3 && b.vy <= 0.6) {
            b.supported = true;
            // vuelco: centro de gravedad fuera del apoyo → resbala y cae
            const cx = supCx / supN, cz = supCz / supN;
            const dx = b.x - cx, dz = b.z - cz;
            const c = Math.cos(b.th), s = Math.sin(b.th);
            const du = dx * c + dz * s, dw = -dx * s + dz * c;
            if (supBody !== 'floor' && (Math.abs(du) > BL * 0.5 * 0.5 || Math.abs(dw) > BW * 0.5 * 0.8)) {
                b.supported = false;
                const d = Math.hypot(dx, dz) || 1;
                b.vx += dx / d * 0.9; b.vz += dz / d * 0.9;
                b.vy = Math.min(b.vy, 0);
                b.om += (Math.random() - 0.5) * 0.04;
                b.tiltV = (Math.random() - 0.5) * 0.05;
            }
        }

        // tumbo visual mientras vuela; al apoyarse se endereza
        if (!b.supported && b.y - hh > 2) {
            if (Math.abs(b.tiltV) < 0.002) b.tiltV = (Math.random() - 0.5) * 0.045;
            b.tilt = Math.max(-0.55, Math.min(0.55, b.tilt + b.tiltV));
        } else {
            b.tilt *= 0.6; b.tiltV = 0;
        }

        // paredes blandas: que el montón no se salga del lienzo
        const lim = worldHalfW();
        if (b.x < -lim) { b.x = -lim; b.vx = Math.abs(b.vx) * 0.3; }
        if (b.x > lim) { b.x = lim; b.vx = -Math.abs(b.vx) * 0.3; }
        if (b.z < -150) { b.z = -150; b.vz = Math.abs(b.vz) * 0.3; }
        if (b.z > 170) { b.z = 170; b.vz = -Math.abs(b.vz) * 0.3; }

        // sueño: quieta y apoyada unos cuantos fotogramas
        const speed = Math.hypot(b.vx, b.vy, b.vz);
        if (b.supported && speed < 0.12 && Math.abs(b.om) < 0.004) {
            if (++b.rest > 18) { b.asleep = true; b.vx = b.vy = b.vz = b.om = 0; b.tilt *= 0.5; }
        } else b.rest = 0;
    }

    function landOn(b, top) {
        b.y = top + BH / 2;
        b.vy = b.vy < -1.6 ? -b.vy * REST : 0;
        b.vx *= FRIC; b.vz *= FRIC; b.om *= 0.85;
    }

    function sideHit(b, o, ov) {
        const oFree = o.state === 'free';
        const push = ov.depth + 0.1;
        if (oFree) {
            b.x += ov.ax * push / 2; b.z += ov.az * push / 2;
            o.x -= ov.ax * push / 2; o.z -= ov.az * push / 2;
            if (o.asleep) wake(o);
        } else {
            b.x += ov.ax * push; b.z += ov.az * push;
        }
        const ovx = oFree ? o.vx : 0, ovz = oFree ? o.vz : 0;
        const rv = (b.vx - ovx) * ov.ax + (b.vz - ovz) * ov.az;
        if (rv < 0) {
            const j = -(1 + REST) * rv / (oFree ? 2 : 1);
            b.vx += j * ov.ax; b.vz += j * ov.az;
            if (oFree) { o.vx -= j * ov.ax; o.vz -= j * ov.az; }
            // giro por golpe descentrado
            const rx = ov.cx - b.x, rz = ov.cz - b.z;
            b.om += (rx * ov.az - rz * ov.ax) * j * I_INV * 6;
            if (!oFree) impactOn(o, Math.abs(rv));
        }
    }

    // un golpe sobre un bloque que sigue en la torre
    function impactOn(o, force) {
        if (o.state !== 'tower') return;
        if (force > 14) {
            // golpe serio: se desmorona lo que queda desde ahí
            collapseFrom(Math.max(0, o.layer - 1));
        } else if (force > 4) {
            wobble = Math.min(1, wobble + force * 0.03);
            shake = Math.min(1.5, shake + force * 0.05);
        }
    }

    // ---------- Integridad de la torre ----------
    // Tras cada cambio se revisa de abajo arriba: bloque de la torre sin
    // apoyo suficiente (o con el centro de gravedad en el aire) se suelta.
    function checkTowerIntegrity() {
        const tb = towerBlocks().sort((a, b) => a.layer - b.layer);
        const standing = new Set();
        let changed = false;
        for (const b of tb) {
            towerPose(b);
            if (b.layer === 0) { standing.add(b); continue; }
            let n = 0, cx = 0, cz = 0;
            for (const o of tb) {
                if (o.layer !== b.layer - 1 || !standing.has(o)) continue;
                const ov = planOverlap(b, o);
                if (ov && ov.depth > 6) { cx += ov.cx; cz += ov.cz; n++; }
            }
            let ok = n > 0;
            if (ok) {
                const dx = b.x - cx / n, dz = b.z - cz / n;
                const c = Math.cos(b.th), s = Math.sin(b.th);
                const du = dx * c + dz * s, dw = -dx * s + dz * c;
                ok = Math.abs(du) <= BL * 0.5 * 0.72 && Math.abs(dw) <= BW * 0.5 * 1.1;
            }
            if (ok) standing.add(b);
            else {
                wake(b);
                b.vx = (Math.random() - 0.5) * 0.6;
                b.vz = (Math.random() - 0.5) * 0.6;
                changed = true;
            }
        }
        if (changed) refreshTower();
    }

    // Debilidad heurística de un piso: mantiene la tensión del juego
    function layerWeakness(k) {
        const rem = layerBlocks(k);
        if (k === topL) return 0;
        const slots = rem.map(b => b.slot);
        let base;
        if (slots.length === 3) base = 0;
        else if (slots.length === 2) base = slots.includes(1) ? 0.08 : 0.04;
        else if (slots.length === 1) base = slots[0] === 1 ? 0.22 : 0.55;
        else return 1;
        // bloques a medio sacar restan apoyo
        for (const b of rem) base += Math.min(0.3, Math.abs(b.out) / PULL_LIMIT * 0.25);
        return base;
    }

    function evaluateStability(pulledLayer) {
        let acc = 0;
        for (let k = 0; k < topL; k++) {
            const wkn = layerWeakness(k);
            if (wkn >= 1) return { collapse: true, at: k };
            acc += wkn * (1 - k / (topL + 1)) * 1.6;
        }
        const risk = acc + Math.max(0, topL - INIT_LAYERS + 1) * 0.05;
        if (risk > 1.45 + Math.random() * 0.5) {
            return { collapse: true, at: Math.max(0, pulledLayer - 1) };
        }
        return { collapse: false, instability: Math.min(1, risk / 1.6) };
    }

    // ---------- Derrumbe ----------
    // No hay coreografía: se empuja el piso débil y la gravedad hace el resto.
    function collapseFrom(fromLayer) {
        if (topL < 0 || topple) return;
        shake = 1.5;
        if (hand) dropHand(true);
        drag = null; target = null; hoverB = null;

        const dir = Math.random() * Math.PI * 2;
        topple = { cx: Math.cos(dir), cz: Math.sin(dir) * 0.6, from: fromLayer, n: 32 };
        for (const b of towerBlocks()) {
            if (b.layer < fromLayer) continue;   // el muñón de abajo puede quedar en pie
            wake(b);
            const rel = b.layer - fromLayer;
            const a = dir + (Math.random() - 0.5) * 1.6;
            const v = 1 + rel * 0.28 + Math.random() * 1.8;
            b.vx += Math.cos(a) * v;
            b.vz += Math.sin(a) * v * 0.7;
            b.om += (Math.random() - 0.5) * 0.18;
        }
        refreshTower();
    }

    function targetTremble() {
        if (!drag && !hand) return 0;
        if (drag && drag.mode === 'free') return 0;
        const v = handSpeed / Math.max(0.35, scale);
        if (v <= SPEED_CALM) return 0;
        return Math.min(1, (v - SPEED_CALM) / (SPEED_BREAK - SPEED_CALM));
    }

    // ---------- Interacción ----------
    function pointerPos(e) {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function trackSpeed(x, y) {
        const now = performance.now();
        if (lastPt) {
            const dt = Math.max(8, now - lastPt.t);
            const f = 16.7 / dt;
            handVX = handVX * 0.6 + (x - lastPt.x) * f * 0.4;
            handVY = handVY * 0.6 + (y - lastPt.y) * f * 0.4;
            handSpeed = handSpeed * 0.7 + Math.hypot(x - lastPt.x, y - lastPt.y) * f * 0.3;
        }
        lastPt = { x, y, t: now };
    }

    function hullPath(b) {
        const { lo, hi } = bodyCorners(b, b.state === 'tower' ? swayAt(b.y) : 0);
        const pts = lo.concat(hi);
        // envolvente convexa (Andrew) de las 8 esquinas proyectadas
        pts.sort((p, q) => p.x - q.x || p.y - q.y);
        const cross = (o, a2, b2) => (a2.x - o.x) * (b2.y - o.y) - (a2.y - o.y) * (b2.x - o.x);
        const lower = [], upper = [];
        for (const p of pts) {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
            lower.push(p);
        }
        for (let i = pts.length - 1; i >= 0; i--) {
            const p = pts[i];
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
            upper.push(p);
        }
        const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
        const path = new Path2D();
        hull.forEach((p, i) => i ? path.lineTo(p.x, p.y) : path.moveTo(p.x, p.y));
        path.closePath();
        return path;
    }

    function pickBody(mx, my) {
        const sorted = drawOrder().reverse();
        for (const b of sorted) {
            if (b.state === 'hand') continue;
            if (ctx.isPointInPath(hullPath(b), mx * dpr, my * dpr)) return b;
        }
        return null;
    }

    // hueco libre de arriba más cercano al puntero
    function findTarget(x, y) {
        if (topL < 0) return null;
        const arriba = layerBlocks(topL);
        let layer, along, libres;
        if (arriba.length >= 3) {
            layer = topL + 1;
            along = layer % 2 === 0;
            libres = [0, 1, 2];
        } else {
            layer = topL;
            along = layer % 2 === 0;
            const usados = arriba.map(b => b.slot);
            libres = [0, 1, 2].filter(s => usados.indexOf(s) === -1);
        }
        let mejor = null, mejorD = Infinity;
        for (const s of libres) {
            const off = (s - 1) * BW;
            const p = proj(along ? 0 : off, (layer + 0.5) * BH, along ? off : 0);
            const d = Math.hypot(x - p.x, y - p.y);
            if (d < mejorD) { mejorD = d; mejor = { layer, slot: s, along, p }; }
        }
        return mejorD < SNAP_RADIUS * Math.max(0.6, scale) ? mejor : null;
    }

    canvas.addEventListener('pointerdown', e => {
        if (hand) return;
        const { x, y } = pointerPos(e);
        lastPt = null; handSpeed = 0; handVX = 0; handVY = 0;
        trackSpeed(x, y);
        const b = pickBody(x, y);
        if (!b) return;

        if (b.state === 'tower') {
            drag = { body: b, mode: 'tower', sx: x, sy: y, out0: b.out };
        } else {
            // pieza suelta: se agarra donde la pinches (eso decide cómo gira)
            const gx = (x - baseX) / scale - b.z * PROJX;
            const c = Math.cos(b.th), s = Math.sin(b.th);
            const dx = gx - b.x;
            drag = {
                body: b, mode: 'free', sy: y, z0: b.z,
                gu: Math.max(-BL / 2, Math.min(BL / 2, dx * c)),
                gw: Math.max(-BW / 2, Math.min(BW / 2, -dx * s))
            };
            wake(b);
        }
        canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
    });

    canvas.addEventListener('pointermove', e => {
        const { x, y } = pointerPos(e);

        if (hand) {
            trackSpeed(x, y);
            hand.hx = x; hand.hy = y;
            target = findTarget(x, y);
            if (handSpeed / Math.max(0.35, scale) > SPEED_BREAK) collapseFrom(Math.max(0, topL - 2));
            return;
        }

        if (!drag) {
            const b = pickBody(x, y);
            hoverB = b && b.state !== 'hand' ? b : null;
            canvas.style.cursor = hoverB ? 'grab' : 'default';
            return;
        }

        trackSpeed(x, y);

        if (drag.mode === 'tower') {
            const b = drag.body;
            const dx = x - drag.sx, dy = y - drag.sy;
            let pull;
            if (b.along) pull = dx / scale;
            else pull = (dx * PROJX + dy * PROJY) / (PROJX * PROJX + PROJY * PROJY) / scale;
            b.out = Math.max(-PULL_LIMIT * 1.15, Math.min(PULL_LIMIT * 1.15, drag.out0 + pull));
            towerPose(b);
            wobble = Math.min(1, Math.abs(b.out) / PULL_LIMIT * 0.5 + layerWeakness(b.layer) * 1.4);
            if (handSpeed / Math.max(0.35, scale) > SPEED_BREAK) {
                collapseFrom(Math.max(0, b.layer - 1));
                return;
            }
            if (Math.abs(b.out) >= PULL_LIMIT) takeBlock(b);
            return;
        }

        // arrastre de pieza suelta: muelle en planta hacia el puntero.
        // Tirar desde una punta la hace girar, como en la realidad.
        // Si el puntero se va muy por encima de la pieza, la levantas.
        const b = drag.body;
        wake(b);
        const pScr = proj(b.x, b.y + BH / 2, b.z);
        if (pScr.y - y > 55 * Math.max(0.5, scale)) {
            const start = proj(b.x, b.y, b.z);
            b.state = 'hand';
            b.vx = b.vy = b.vz = b.om = 0;
            b.tilt = 0;
            b.px = start.x; b.py = start.y; b.hx = x; b.hy = y;
            hand = b;
            drag = null;
            target = findTarget(x, y);
            return;
        }
        const wz = Math.max(-150, Math.min(170, drag.z0 + (drag.sy - y) / (-PROJY * scale)));
        const wx = (x - baseX) / scale - wz * PROJX;
        const c = Math.cos(b.th), s = Math.sin(b.th);
        const px = b.x + drag.gu * c - drag.gw * s;
        const pz = b.z + drag.gu * s + drag.gw * c;
        const fx = (wx - px) * 0.16;
        const fz = (wz - pz) * 0.10;
        b.vx = (b.vx + fx) * 0.72;
        b.vz = (b.vz + fz) * 0.72;
        const rx = px - b.x, rz = pz - b.z;
        b.om = (b.om + (rx * fz - rz * fx) * I_INV * 14) * 0.7;
    });

    function takeBlock(b) {
        drag = null;
        towerPose(b);
        const p = proj(b.x, b.y, b.z);
        b.state = 'hand';
        b.out = 0;
        b.hx = p.x; b.hy = p.y; b.px = p.x; b.py = p.y;
        hand = b;
        shake = 0.8;
        refreshTower();
        checkTowerIntegrity();
        const st = evaluateStability(b.layer);
        if (st.collapse) {
            setTimeout(() => collapseFrom(st.at), 300 + Math.random() * 400);
        } else {
            wobble = st.instability;
        }
    }

    // soltar la pieza de la mano: encaja arriba o cae con su propia física
    function dropHand(forced) {
        if (!hand) return;
        const rapido = handSpeed / Math.max(0.35, scale);

        if (!forced && target) {
            if (rapido > SPEED_BREAK) { collapseFrom(Math.max(0, topL - 1)); return; }
            const b = hand;
            b.state = 'tower';
            b.layer = target.layer; b.slot = target.slot; b.along = target.along;
            b.out = 0; b.tilt = 0;
            towerPose(b);
            b.asleep = true;
            hand = null; target = null;
            refreshTower();
            shake = 0.6 + Math.min(1, rapido / SPEED_BREAK) * 1.4;
            wobble = Math.min(1, wobble + 0.15 + rapido / SPEED_BREAK * 0.4);
            const st = evaluateStability(b.layer);
            if (st.collapse) setTimeout(() => collapseFrom(st.at), 300 + Math.random() * 400);
            return;
        }

        // al aire: pasa a cuerpo libre con la velocidad de la mano
        const b = hand;
        b.state = 'free';
        b.asleep = false; b.rest = 0;
        b.x = (b.px - baseX) / scale;
        b.z = 0;
        b.y = Math.max(BH / 2, (baseY - b.py) / scale);
        b.vx = handVX / scale * 0.8;
        b.vy = -handVY / scale * 0.5;
        b.vz = (Math.random() - 0.5) * 1.2;
        b.om = (Math.random() - 0.5) * 0.08;
        b.tiltV = (Math.random() - 0.5) * 0.04;
        hand = null; target = null;
        wobble = Math.min(1, wobble + 0.2); shake = 1;
    }

    function endDrag() {
        if (hand) { dropHand(false); return; }
        if (!drag) return;
        if (drag.mode === 'tower') {
            const b = drag.body;
            // se queda como lo dejes, sin volver a su sitio
            b.out = Math.max(-PULL_LIMIT * 0.92, Math.min(PULL_LIMIT * 0.92, b.out));
            towerPose(b);
            drag = null;
            checkTowerIntegrity();
            if (topL >= 0) {
                const st = evaluateStability(b.layer);
                if (st.collapse) setTimeout(() => collapseFrom(st.at), 250 + Math.random() * 400);
                else wobble = Math.max(wobble, st.instability * 0.7);
            }
        } else {
            const b = drag.body;
            drag = null;
            // ¿la sueltas sobre el hueco de arriba? pues colocada
            if (lastPt) {
                const tg = findTarget(lastPt.x, lastPt.y);
                if (tg && Math.abs(b.y - (tg.layer + 0.5) * BH) < BH * 2.5) {
                    b.state = 'tower';
                    b.layer = tg.layer; b.slot = tg.slot; b.along = tg.along;
                    b.out = 0; b.tilt = 0;
                    towerPose(b);
                    b.asleep = true;
                    refreshTower();
                    shake = 0.5;
                }
            }
        }
    }

    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    // ---------- Dibujo ----------
    // Pintor con orden topológico: para cada par de piezas que se solapan
    // en pantalla se decide quién tapa a quién por sus intervalos reales de
    // profundidad y altura. Evita esquinas pintadas encima sin lógica.
    function drawOrder() {
        const list = bodies.filter(b => b.state !== 'hand');
        const n = list.length;
        const info = list.map(b => {
            const pc = planCorners(b);
            let zmin = Infinity, zmax = -Infinity;
            for (const [, pz] of pc) { if (pz < zmin) zmin = pz; if (pz > zmax) zmax = pz; }
            const { lo, hi } = bodyCorners(b, b.state === 'tower' ? swayAt(b.y) : 0);
            let sx0 = Infinity, sy0 = Infinity, sx1 = -Infinity, sy1 = -Infinity;
            for (const p of lo.concat(hi)) {
                if (p.x < sx0) sx0 = p.x; if (p.x > sx1) sx1 = p.x;
                if (p.y < sy0) sy0 = p.y; if (p.y > sy1) sy1 = p.y;
            }
            return { zmin, zmax, ymin: b.y - BH / 2, ymax: b.y + BH / 2, sx0, sy0, sx1, sy1 };
        });
        const adj = Array.from({ length: n }, () => []);
        const indeg = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const A = info[i], B = info[j];
                if (A.sx1 < B.sx0 || B.sx1 < A.sx0 || A.sy1 < B.sy0 || B.sy1 < A.sy0) continue;
                let iFirst;
                if (A.zmin >= B.zmax - 1.5) iFirst = true;        // A queda detrás
                else if (B.zmin >= A.zmax - 1.5) iFirst = false;  // B queda detrás
                else if (A.ymin >= B.ymax - 1.5) iFirst = false;  // A está encima
                else if (B.ymin >= A.ymax - 1.5) iFirst = true;   // B está encima
                else if (planOverlap(list[i], list[j])) iFirst = list[i].y <= list[j].y;
                else iFirst = list[i].z >= list[j].z;
                if (iFirst) { adj[i].push(j); indeg[j]++; }
                else { adj[j].push(i); indeg[i]++; }
            }
        }
        const queue = [];
        for (let i = 0; i < n; i++) if (indeg[i] === 0) queue.push(i);
        queue.sort((a, b) => info[b].zmin - info[a].zmin);
        const order = [];
        const done = new Array(n).fill(false);
        while (queue.length) {
            const i = queue.shift();
            if (done[i]) continue;
            done[i] = true;
            order.push(list[i]);
            for (const j of adj[i]) if (--indeg[j] === 0 && !done[j]) queue.push(j);
        }
        // si quedó algún ciclo raro, se pinta por altura y a correr
        if (order.length < n) {
            const rest = [];
            for (let i = 0; i < n; i++) if (!done[i]) rest.push(i);
            rest.sort((a, b) => list[a].y - list[b].y);
            for (const i of rest) order.push(list[i]);
        }
        return order;
    }

    function faceQuad(p0, p1, p2, p3, tex, shade) {
        // p0..p3 en orden: abajo-izq, abajo-der, arriba-der, arriba-izq
        ctx.save();
        const path = new Path2D();
        path.moveTo(p0.x, p0.y); path.lineTo(p1.x, p1.y);
        path.lineTo(p2.x, p2.y); path.lineTo(p3.x, p3.y);
        path.closePath();
        ctx.clip(path);
        const ux = (p1.x - p0.x) / tex.width, uy = (p1.y - p0.y) / tex.width;
        const vx = (p3.x - p0.x) / tex.height, vy = (p3.y - p0.y) / tex.height;
        ctx.transform(ux, uy, vx, vy, p0.x, p0.y);
        ctx.drawImage(tex, 0, 0);
        ctx.restore();
        if (shade !== 0) {
            ctx.fillStyle = shade > 0
                ? `rgba(255,240,210,${shade})`
                : `rgba(60,32,8,${-shade})`;
            ctx.fill(path);
        }
        ctx.strokeStyle = 'rgba(70,42,12,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke(path);
        return path;
    }

    function drawBody(b, highlight) {
        const sway = b.state === 'tower' ? swayAt(b.y) : 0;
        const { lo, hi, pc } = bodyCorners(b, sway);
        const cScr = proj(b.x + sway, b.y, b.z);

        ctx.save();
        if (b.tilt && b.state === 'free') {
            ctx.translate(cScr.x, cScr.y);
            ctx.rotate(b.tilt);
            ctx.translate(-cScr.x, -cScr.y);
        }
        if (b.state === 'hand') {
            ctx.shadowColor = 'rgba(0,0,0,0.35)';
            ctx.shadowBlur = 16;
            ctx.shadowOffsetY = 8;
        }

        // caras laterales de atrás hacia delante
        const faces = [];
        for (let i = 0; i < 4; i++) {
            const j = (i + 1) % 4;
            const meanZ = (pc[i][1] + pc[j][1]) / 2;
            const long = i % 2 === 1;   // aristas 1-2 y 3-0 son las testas
            faces.push({ i, j, meanZ, long });
        }
        faces.sort((a, f) => f.meanZ - a.meanZ);
        for (const f of faces) {
            // sombreado según orientación de la cara en planta
            const nx = pc[f.j][1] - pc[f.i][1], nz = -(pc[f.j][0] - pc[f.i][0]);
            const nl = Math.hypot(nx, nz) || 1;
            const lit = (nx / nl) * 0.35 + (nz / nl) * -0.8;
            const shade = lit * 0.16 - 0.04;
            faceQuad(
                lo[f.i], lo[f.j], hi[f.j], hi[f.i],
                f.long ? b.texLong : b.texEnd,
                shade
            );
        }
        // cara superior
        const topPath = new Path2D();
        topPath.moveTo(hi[0].x, hi[0].y);
        for (let i = 1; i < 4; i++) topPath.lineTo(hi[i].x, hi[i].y);
        topPath.closePath();
        ctx.save();
        ctx.clip(topPath);
        const ux = (hi[0].x - hi[1].x) / b.texTop.width, uy = (hi[0].y - hi[1].y) / b.texTop.width;
        const vx = (hi[2].x - hi[1].x) / b.texTop.height, vy = (hi[2].y - hi[1].y) / b.texTop.height;
        ctx.transform(ux, uy, vx, vy, hi[1].x, hi[1].y);
        ctx.drawImage(b.texTop, 0, 0);
        ctx.restore();
        ctx.strokeStyle = highlight ? 'rgba(255,170,40,0.95)' : 'rgba(70,42,12,0.4)';
        ctx.lineWidth = highlight ? 2.5 : 1;
        ctx.stroke(topPath);

        ctx.restore();
    }

    function drawTargetGhost() {
        if (!target) return;
        const pulse = 0.35 + Math.sin(t * 0.12) * 0.15;
        const w = (target.along ? BL : BW) * scale;
        const h = BH * scale;
        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(255,190,70,${0.55 + pulse * 0.4})`;
        ctx.fillStyle = `rgba(255,190,70,${pulse * 0.28})`;
        ctx.fillRect(target.p.x - w / 2, target.p.y - h / 2, w, h);
        ctx.strokeRect(target.p.x - w / 2, target.p.y - h / 2, w, h);
        ctx.restore();
    }

    function draw() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        // mesa
        const tableY = baseY + 6 * scale;
        const tg = ctx.createLinearGradient(0, tableY - 30, 0, H);
        tg.addColorStop(0, '#9a6b3d'); tg.addColorStop(1, '#7a5028');
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.ellipse(W / 2, tableY + 14, Math.min(W * 0.46, 340), 40, 0, 0, 7);
        ctx.fill();

        // aviso de pulso
        if (tremble > 0.05) {
            ctx.save();
            ctx.globalAlpha = Math.min(0.55, tremble * 0.6);
            const rg = ctx.createRadialGradient(W / 2, tableY + 6, 10, W / 2, tableY + 6, BL * scale);
            rg.addColorStop(0, 'rgba(220,90,40,0.75)');
            rg.addColorStop(1, 'rgba(220,90,40,0)');
            ctx.fillStyle = rg;
            ctx.beginPath();
            ctx.ellipse(W / 2, tableY + 6, BL * scale, 30 * scale, 0, 0, 7);
            ctx.fill();
            ctx.restore();
        }

        // sombras en el suelo, una por pieza
        for (const b of bodies) {
            if (b.state === 'hand') continue;
            const hgt = Math.max(0, b.y - BH / 2);
            const a = Math.max(0.04, 0.16 - hgt * 0.0004);
            const p = proj(b.x, 0, b.z);
            ctx.fillStyle = `rgba(40,20,5,${a})`;
            ctx.beginPath();
            ctx.ellipse(p.x, tableY + (p.y - baseY) * 0.4, BL * 0.42 * scale, 9 * scale, 0, 0, 7);
            ctx.fill();
        }

        drawTargetGhost();

        for (const b of drawOrder()) {
            if (b.state === 'hand') continue;
            drawBody(b, b === hoverB || (drag && b === drag.body));
        }
        if (hand) drawBody(hand, false);
    }

    // ---------- Tamaño y bucle ----------
    function recomputeScale() {
        const altura = Math.max(INIT_LAYERS, topL + 3);
        scaleGoal = Math.min(W / 420, H / (altura * BH + 140));
        if (!scale) scale = scaleGoal;
        baseX = W / 2 - (BL * PROJX * scaleGoal) / 4;
        baseY = H - 60;
    }

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const wCss = Math.min(rect.width, 680);
        const hCss = Math.min(Math.max(420, window.innerHeight * 0.62), 640);
        dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.style.width = wCss + 'px';
        canvas.style.height = hCss + 'px';
        canvas.width = wCss * dpr;
        canvas.height = hCss * dpr;
        W = wCss; H = hCss;
        recomputeScale();
        scale = scaleGoal;
    }
    window.addEventListener('resize', resize);
    resize();
    buildTower();

    (function loop() {
        t++;
        if (hand) {
            hand.px += (hand.hx - hand.px) * 0.35;
            hand.py += (hand.hy - hand.py) * 0.35;
            hand.x = (hand.px - baseX) / scale;
            hand.y = Math.max(BH / 2, (baseY - hand.py) / scale);
            hand.z = 0;
            hand.tilt = (hand.hx - hand.px) * 0.004;
            hand.th = target ? (target.along ? 0 : Math.PI / 2) : hand.th;
        }
        physics();
        draw();
        requestAnimationFrame(loop);
    })();
})();
