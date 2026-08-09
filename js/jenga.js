/* ============================================================
   JENGA — torre de madera interactiva de la página principal.

   Mecánica: sacas un bloque guiándolo con el dedo, lo sigues
   llevando en la mano y lo colocas encima de la torre. El pulso
   importa: si aceleras, la torre tiembla; si te pasas, se cae.
   ============================================================ */
(() => {
    'use strict';

    const canvas = document.getElementById('jenga-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('jenga-status');
    const resetBtn = document.getElementById('jenga-reset');

    // ---------- Constantes del juego ----------
    const INIT_LAYERS = 16;             // pisos con los que arranca la torre
    const BL = 150, BW = 50, BH = 32;   // largo, ancho y alto del bloque (unidades de mundo)
    const PROJX = 0.46, PROJY = -0.26;  // proyección oblicua del eje de profundidad
    const PULL_LIMIT = BL * 0.62;       // recorrido necesario para que el bloque salga
    const GRAV = 0.55;
    const SNAP_RADIUS = 120;            // radio de imantado al hueco de arriba

    // Umbrales de pulso, en px de pantalla por fotograma ya normalizados por la escala.
    const SPEED_CALM = 8;               // por debajo: mano firme, no pasa nada
    const SPEED_BREAK = 26;             // por encima: la torre no lo aguanta

    // ---------- Estado ----------
    let blocks = [];        // bloques que forman la torre
    let flying = [];        // cuerpos libres (bloques caídos o derrumbe)
    let held = null;        // bloque que llevas en la mano
    let moves = 0;          // colocaciones logradas
    let best = parseInt(localStorage.getItem('jenga-best') || '0');
    let collapsed = false;
    let lean = 0;           // inclinación permanente acumulada (px por piso)
    let wobble = 0;         // nerviosismo lento de la torre (0..1)
    let tremble = 0;        // vibración rápida por pulso acelerado (0..1)
    let shake = 0;          // sacudida puntual
    let flash = 0;          // destello del derrumbe
    let drag = null;        // { block, sx, sy }
    let hoverB = null;
    let target = null;      // hueco de destino mientras llevas el bloque
    let handSpeed = 0;      // velocidad suavizada del puntero
    let lastPt = null;
    let topL = 0;           // piso más alto ocupado
    let t = 0;
    let dpr = 1, W = 0, H = 0, scale = 1, baseX = 0, baseY = 0;

    function rng(seed) {
        let a = seed >>> 0;
        return () => {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let x = Math.imul(a ^ a >>> 15, 1 | a);
            x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
            return ((x ^ x >>> 14) >>> 0) / 4294967296;
        };
    }

    function buildTower() {
        blocks = []; flying = []; held = null; drag = null; target = null;
        moves = 0; collapsed = false; lean = 0; wobble = 0; tremble = 0; shake = 0; flash = 0;
        let id = 0;
        for (let k = 0; k < INIT_LAYERS; k++) {
            const along = k % 2 === 0;   // true: eje largo en X; false: eje largo en profundidad
            for (let s = 0; s < 3; s++) {
                const r = rng(k * 31 + s * 7 + 5);
                blocks.push({
                    id: id++, layer: k, slot: s, along,
                    out: 0,                       // desplazamiento de extracción
                    tone: 58 + r() * 14,          // luminosidad de la madera
                    hue: 30 + r() * 9,
                    grain: 2 + Math.floor(r() * 3)
                });
            }
        }
        refreshTower();
        updateStatus();
        hideOverlay();
    }

    // ---------- Geometría y proyección ----------
    function layerBlocks(k) {
        const out = [];
        for (const b of blocks) if (b.layer === k) out.push(b);
        return out;
    }

    function refreshTower() {
        let top = 0;
        for (const b of blocks) if (b.layer > top) top = b.layer;
        topL = top;
        recomputeScale();
    }

    // La capa más alta no se toca, y si está a medias tampoco la de debajo:
    // es la regla real del Jenga.
    function canPull(b) {
        if (b.layer >= topL) return false;
        if (layerBlocks(topL).length < 3 && b.layer === topL - 1) return false;
        return true;
    }

    // posición 3D del centro del bloque (x lateral, y altura, z profundidad)
    function blockCenter(b) {
        const off = (b.slot - 1) * BW;
        let x = 0, z = 0;
        if (b.along) { z = off; x = b.out; }
        else { x = off; z = b.out; }
        return { x, y: (b.layer + 0.5) * BH, z };
    }

    // proyección oblicua al lienzo, con vaivén, vibración e inclinación
    function P(x, y, z, layer) {
        let sway = 0;
        if (!collapsed) {
            const h = layer / Math.max(1, topL);
            const lento = Math.sin(t * 0.045 + layer * 0.35) * wobble * 6;
            const rapido = Math.sin(t * 0.85 + layer * 1.15) * tremble * 7;
            const golpe = Math.sin(t * 0.31) * shake * 4;
            sway = (lento + rapido + golpe) * h;
        }
        const tilt = lean * layer;
        return {
            x: baseX + (x + z * PROJX + sway + tilt) * scale,
            y: baseY - (y - z * PROJY) * scale
        };
    }

    // las ocho esquinas proyectadas del bloque
    function corners(b) {
        const c = blockCenter(b);
        const hx = b.along ? BL / 2 : BW / 2;
        const hz = b.along ? BW / 2 : BL / 2;
        const y0 = b.layer * BH, y1 = y0 + BH;
        return {
            flb: P(c.x - hx, y0, c.z - hz, b.layer), frb: P(c.x + hx, y0, c.z - hz, b.layer),
            flt: P(c.x - hx, y1, c.z - hz, b.layer), frt: P(c.x + hx, y1, c.z - hz, b.layer),
            blb: P(c.x - hx, y0, c.z + hz, b.layer), brb: P(c.x + hx, y0, c.z + hz, b.layer),
            blt: P(c.x - hx, y1, c.z + hz, b.layer), brt: P(c.x + hx, y1, c.z + hz, b.layer)
        };
    }

    // centro proyectado de un hueco cualquiera, exista o no bloque
    function slotScreenPos(layer, slot, along) {
        const off = (slot - 1) * BW;
        const x = along ? 0 : off;
        const z = along ? off : 0;
        return P(x, (layer + 0.5) * BH, z, layer);
    }

    // ---------- Dibujo ----------
    function woodFront(b, x0, y0, w, h) {
        const g = rng(b.id * 977 + 11);
        ctx.fillStyle = `hsl(${b.hue},42%,${b.tone}%)`;
        ctx.fillRect(x0, y0, w, h);
        ctx.strokeStyle = `hsla(${b.hue - 8},50%,${b.tone - 22}%,0.22)`;
        ctx.lineWidth = Math.max(1, scale * 1.1);
        for (let i = 0; i < b.grain; i++) {
            const gy = y0 + h * (0.25 + 0.5 * g());
            ctx.beginPath();
            ctx.moveTo(x0 + 2, gy);
            ctx.bezierCurveTo(x0 + w * 0.3, gy - h * 0.12 * g(), x0 + w * 0.7, gy + h * 0.12 * g(), x0 + w - 2, gy);
            ctx.stroke();
        }
    }

    function quad(p1, p2, p3, p4, fill) {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(70,42,12,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    function drawBlock(b, highlight) {
        const q = corners(b);
        const L = b.tone, hue = b.hue;
        quad(q.flt, q.frt, q.brt, q.blt, `hsl(${hue},40%,${Math.min(88, L + 14)}%)`);
        quad(q.frb, q.brb, q.brt, q.frt, `hsl(${hue},44%,${L - 16}%)`);
        const x0 = q.flb.x, y1 = q.flt.y;
        woodFront(b, x0, y1, q.frb.x - q.flb.x, q.flb.y - q.flt.y);
        ctx.strokeStyle = highlight ? 'rgba(255,170,40,0.95)' : 'rgba(70,42,12,0.4)';
        ctx.lineWidth = highlight ? 2.5 : 1;
        ctx.strokeRect(x0, y1, q.frb.x - q.flb.x, q.flb.y - q.flt.y);
        if (!b.along) {
            const cx = (q.flb.x + q.frb.x) / 2, cy = (q.flt.y + q.flb.y) / 2;
            ctx.strokeStyle = `hsla(${hue - 10},45%,${L - 25}%,0.35)`;
            ctx.lineWidth = 1;
            for (let r = 1; r <= 2; r++) {
                ctx.beginPath();
                ctx.ellipse(cx, cy, (q.frb.x - q.flb.x) * 0.16 * r, (q.flb.y - q.flt.y) * 0.16 * r, 0, 0, 7);
                ctx.stroke();
            }
        }
    }

    // bloque suelto dibujado en pantalla (en la mano o cayendo)
    function drawLooseBlock(f, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha === undefined ? 1 : alpha;
        ctx.translate(f.px, f.py);
        ctx.rotate(f.rot);
        const w = f.w * scale, h = f.h * scale;
        // cara superior insinuada, para que no parezca un rectángulo plano
        ctx.fillStyle = `hsl(${f.hue},40%,${Math.min(88, f.tone + 14)}%)`;
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h / 2);
        ctx.lineTo(-w / 2 + 7 * scale, -h / 2 - 5 * scale);
        ctx.lineTo(w / 2 + 7 * scale, -h / 2 - 5 * scale);
        ctx.lineTo(w / 2, -h / 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = `hsl(${f.hue},42%,${f.tone}%)`;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = 'rgba(70,42,12,0.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.restore();
    }

    // silueta del hueco donde caerá el bloque que llevas
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

    function blockPath(b) {
        const q = corners(b);
        const p = new Path2D();
        p.moveTo(q.flb.x, q.flb.y);
        p.lineTo(q.frb.x, q.frb.y);
        p.lineTo(q.frt.x, q.frt.y);
        p.lineTo(q.brt.x, q.brt.y);
        p.lineTo(q.blt.x, q.blt.y);
        p.lineTo(q.flt.x, q.flt.y);
        p.closePath();
        return p;
    }

    function draw() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        // mesa de madera
        const tableY = baseY + 6 * scale;
        const tg = ctx.createLinearGradient(0, tableY - 30, 0, H);
        tg.addColorStop(0, '#9a6b3d'); tg.addColorStop(1, '#7a5028');
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.ellipse(W / 2, tableY + 14, Math.min(W * 0.46, 320), 38, 0, 0, 7);
        ctx.fill();

        // aviso de pulso: halo bajo la torre que se enciende al acelerar
        if (tremble > 0.05 && !collapsed) {
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

        // sombra de la torre
        ctx.fillStyle = 'rgba(40,20,5,0.25)';
        ctx.beginPath();
        ctx.ellipse(W / 2 + lean * topL * scale * 0.4, tableY + 8, BL * 0.62 * scale, 16, 0, 0, 7);
        ctx.fill();

        // hueco de destino, por debajo de los bloques
        drawTargetGhost();

        // bloques de la torre: de abajo arriba, fondo antes que frente
        const sorted = [...blocks].sort((a, b2) => {
            if (a.layer !== b2.layer) return a.layer - b2.layer;
            return blockCenter(b2).z - blockCenter(a).z;
        });
        for (const b of sorted) drawBlock(b, b === hoverB || (drag && b === drag.block));

        // cuerpos libres
        for (const f of flying) drawLooseBlock(f);

        // el bloque que llevas en la mano, siempre por encima
        if (held) {
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.35)';
            ctx.shadowBlur = 16;
            ctx.shadowOffsetY = 8;
            drawLooseBlock(held);
            ctx.restore();
        }

        // destello del derrumbe
        if (flash > 0.01) {
            ctx.fillStyle = `rgba(255,235,200,${flash * 0.5})`;
            ctx.fillRect(0, 0, W, H);
        }
    }

    // ---------- Estabilidad ----------
    // Debilidad de un piso según los huecos que le quedan
    function layerWeakness(k) {
        const rem = layerBlocks(k).map(b => b.slot);
        if (k === topL) return 0;                                    // arriba no soporta nada
        if (rem.length === 3) return 0;
        if (rem.length === 2) return rem.includes(1) ? 0.08 : 0.04;  // dos apoyos: sólido
        if (rem.length === 1) return rem[0] === 1 ? 0.22 : 0.55;     // solo centro: equilibrista
        return 1;                                                    // piso vacío con peso encima
    }

    function evaluateStability(pulledLayer) {
        let acc = 0;
        for (let k = 0; k < topL; k++) {
            const wkn = layerWeakness(k);
            if (wkn >= 1) return { collapse: true, at: k };
            acc += wkn * (1 - k / (topL + 1)) * 1.6;
        }
        // cuanto más alta se pone la torre, menos perdona
        const risk = acc + Math.max(0, topL - INIT_LAYERS + 1) * 0.05;
        if (risk > 1.45 + Math.random() * 0.5) {
            return { collapse: true, at: Math.max(0, pulledLayer - 1) };
        }
        return { collapse: false, instability: Math.min(1, risk / 1.6) };
    }

    function triggerCollapse(fromLayer) {
        if (collapsed) return;
        collapsed = true;
        flash = 1;
        if (held) {   // lo que llevabas en la mano también se te cae
            flying.push({
                px: held.px, py: held.py, vx: (Math.random() - 0.5) * 5, vy: -1,
                rot: held.rot, vr: (Math.random() - 0.5) * 0.3,
                w: held.w, h: held.h, hue: held.hue, tone: held.tone, rest: false
            });
            held = null;
        }
        drag = null; target = null;
        const restantes = [];
        for (const b of blocks) {
            if (b.layer < fromLayer) { restantes.push(b); continue; }
            const c = blockCenter(b);
            const p = P(c.x, c.y, c.z, b.layer);
            flying.push({
                px: p.x, py: p.y,
                vx: (Math.random() - 0.5) * 7 + lean * 18,
                vy: -Math.random() * 3,
                rot: Math.random() * 0.6 - 0.3,
                vr: (Math.random() - 0.5) * 0.25,
                w: b.along ? BL : BW, h: BH,
                hue: b.hue, tone: b.tone,
                rest: false
            });
        }
        blocks = restantes;
        refreshTower();
        if (moves > best) {
            best = moves;
            localStorage.setItem('jenga-best', String(best));
        }
        updateStatus();
        showOverlay();
    }

    function physics() {
        const floorY = baseY + 6 * scale;
        for (const f of flying) {
            if (f.rest) continue;
            f.vy += GRAV;
            f.px += f.vx; f.py += f.vy; f.rot += f.vr;
            if (f.py > floorY - (f.h * scale) / 2) {
                f.py = floorY - (f.h * scale) / 2;
                f.vy *= -0.38;
                f.vx *= 0.7;
                f.vr *= 0.6;
                if (Math.abs(f.vy) < 1.2) { f.vy = 0; f.vx *= 0.8; if (Math.abs(f.vx) < 0.2) f.rest = true; }
            }
            if (f.px < -100) f.px = -100;
            if (f.px > W + 100) f.px = W + 100;
        }
        shake *= 0.92;
        flash *= 0.9;
        // el pulso se olvida solo si sueltas o vas despacio
        if (!drag && !held) handSpeed *= 0.8;
        tremble += (targetTremble() - tremble) * 0.25;
        if (!collapsed) wobble = Math.max(wobble * 0.999, 0);
    }

    // cuánto debería vibrar la torre ahora mismo, según el pulso
    function targetTremble() {
        if (collapsed) return 0;
        if (!drag && !held) return 0;
        const v = handSpeed / Math.max(0.35, scale);
        if (v <= SPEED_CALM) return 0;
        return Math.min(1, (v - SPEED_CALM) / (SPEED_BREAK - SPEED_CALM));
    }

    // ---------- Interacción ----------
    function pickBlock(mx, my) {
        const sorted = [...blocks].sort((a, b2) => {
            if (a.layer !== b2.layer) return b2.layer - a.layer;
            return blockCenter(a).z - blockCenter(b2).z;
        });
        for (const b of sorted) {
            if (ctx.isPointInPath(blockPath(b), mx * dpr, my * dpr)) return b;
        }
        return null;
    }

    function pointerPos(e) {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function trackSpeed(x, y) {
        const now = performance.now();
        if (lastPt) {
            const dt = Math.max(8, now - lastPt.t);
            const d = Math.hypot(x - lastPt.x, y - lastPt.y);
            const inst = d / dt * 16.7;             // px por fotograma
            handSpeed = handSpeed * 0.7 + inst * 0.3;
        }
        lastPt = { x, y, t: now };
    }

    // ¿en qué hueco de arriba encaja lo que llevas?
    function findTarget(x, y) {
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
            const p = slotScreenPos(layer, s, along);
            const d = Math.hypot(x - p.x, y - p.y);
            if (d < mejorD) { mejorD = d; mejor = { layer, slot: s, along, p }; }
        }
        return mejorD < SNAP_RADIUS * Math.max(0.6, scale) ? mejor : null;
    }

    canvas.addEventListener('pointerdown', e => {
        if (collapsed || held) return;
        const { x, y } = pointerPos(e);
        lastPt = null; handSpeed = 0;
        trackSpeed(x, y);
        const b = pickBlock(x, y);
        if (!b) return;
        if (!canPull(b)) {
            shake = 1.2;   // esa no se toca
            return;
        }
        drag = { block: b, sx: x, sy: y };
        canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
    });

    canvas.addEventListener('pointermove', e => {
        const { x, y } = pointerPos(e);

        if (held) {
            trackSpeed(x, y);
            held.tx = x; held.ty = y;
            target = findTarget(x, y);
            if (handSpeed / Math.max(0.35, scale) > SPEED_BREAK) triggerCollapse(Math.max(0, topL - 2));
            return;
        }

        if (!drag) {
            const b = collapsed ? null : pickBlock(x, y);
            hoverB = (b && canPull(b)) ? b : null;
            canvas.style.cursor = hoverB ? 'grab' : 'default';
            return;
        }

        trackSpeed(x, y);
        const b = drag.block;
        const dx = x - drag.sx, dy = y - drag.sy;
        // proyectar el arrastre sobre el eje largo del bloque
        let pull;
        if (b.along) pull = dx / scale;
        else pull = (dx * PROJX + dy * PROJY) / (PROJX * PROJX + PROJY * PROJY) / scale;
        b.out = Math.max(-PULL_LIMIT * 1.15, Math.min(PULL_LIMIT * 1.15, pull));

        // la fricción menea la torre
        wobble = Math.min(1, Math.abs(b.out) / PULL_LIMIT * 0.5 + layerWeakness(b.layer) * 1.4);

        // tirón demasiado brusco: se viene abajo
        if (handSpeed / Math.max(0.35, scale) > SPEED_BREAK) {
            triggerCollapse(Math.max(0, b.layer - 1));
            return;
        }

        if (Math.abs(b.out) >= PULL_LIMIT) takeBlock(b);
    });

    // el bloque sale de la torre y pasa a tu mano
    function takeBlock(b) {
        drag = null;
        const c = blockCenter(b);
        const p = P(c.x, c.y, c.z, b.layer);
        blocks = blocks.filter(x => x !== b);
        held = {
            px: p.x, py: p.y, tx: p.x, ty: p.y, rot: 0,
            w: b.along ? BL : BW, h: BH,
            hue: b.hue, tone: b.tone, grain: b.grain, id: b.id
        };
        shake = 0.8;
        refreshTower();
        const st = evaluateStability(b.layer);
        if (st.collapse) {
            setTimeout(() => triggerCollapse(st.at), 300 + Math.random() * 400);
        } else {
            wobble = st.instability;
            // inclinación permanente si un piso queda apoyado en un solo lado
            const rem = layerBlocks(b.layer).map(x => x.slot);
            if (rem.length === 1 && rem[0] !== 1) {
                lean += (rem[0] === 0 ? -1 : 1) * 0.55;
            }
        }
    }

    // sueltas: o encaja arriba, o se te cae al suelo
    function releaseHeld() {
        if (!held) return;
        const rapido = handSpeed / Math.max(0.35, scale);

        if (target) {
            if (rapido > SPEED_BREAK) { triggerCollapse(Math.max(0, topL - 1)); return; }
            const puesto = target.layer;
            blocks.push({
                id: held.id, layer: target.layer, slot: target.slot, along: target.along,
                out: 0, tone: held.tone, hue: held.hue, grain: held.grain
            });
            moves++;
            held = null; target = null;
            refreshTower();
            updateStatus();
            // posarlo de golpe también sacude la torre
            shake = 0.6 + Math.min(1, rapido / SPEED_BREAK) * 1.4;
            wobble = Math.min(1, wobble + 0.15 + rapido / SPEED_BREAK * 0.4);
            const st = evaluateStability(puesto);
            if (st.collapse) setTimeout(() => triggerCollapse(st.at), 300 + Math.random() * 400);
            return;
        }

        // fuera de sitio: al suelo, y la torre se resiente
        flying.push({
            px: held.px, py: held.py,
            vx: (Math.random() - 0.5) * 3, vy: -1.5,
            rot: held.rot, vr: (Math.random() - 0.5) * 0.2,
            w: held.w, h: held.h, hue: held.hue, tone: held.tone, rest: false
        });
        held = null; target = null;
        wobble = Math.min(1, wobble + 0.2);
        shake = 1;
    }

    canvas.addEventListener('pointerup', () => {
        if (held) { releaseHeld(); return; }
        if (drag) { drag.block.out = 0; drag = null; }
    });
    canvas.addEventListener('pointercancel', () => {
        if (held) { releaseHeld(); return; }
        if (drag) { drag.block.out = 0; drag = null; }
    });

    // ---------- UI ----------
    function updateStatus() {
        if (statusEl) statusEl.innerHTML =
            `🪵 Colocados: <b>${moves}</b> · 🏆 Récord: <b>${Math.max(best, moves)}</b>`;
    }
    function showOverlay() {
        const ov = document.getElementById('jenga-over');
        if (ov) {
            document.getElementById('jenga-over-score').textContent =
                moves + (moves === 1 ? ' bloque colocado' : ' bloques colocados');
            ov.classList.add('show');
        }
    }
    function hideOverlay() {
        const ov = document.getElementById('jenga-over');
        if (ov) ov.classList.remove('show');
    }
    if (resetBtn) resetBtn.addEventListener('click', buildTower);
    const overBtn = document.getElementById('jenga-over-btn');
    if (overBtn) overBtn.addEventListener('click', buildTower);

    // ---------- Tamaño y bucle ----------
    function recomputeScale() {
        // la torre puede crecer por arriba: se encoge la escala para que quepa
        const altura = Math.max(INIT_LAYERS, topL + 3);
        scale = Math.min(W / 420, H / (altura * BH + 140));
        baseX = W / 2 - (BL * PROJX * scale) / 4;
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
    }
    window.addEventListener('resize', resize);
    resize();
    buildTower();

    (function loop() {
        t++;
        // el bloque en la mano persigue al dedo con un punto de inercia
        if (held) {
            held.px += (held.tx - held.px) * 0.35;
            held.py += (held.ty - held.py) * 0.35;
            held.rot = (held.tx - held.px) * 0.004;
        }
        physics();
        draw();
        requestAnimationFrame(loop);
    })();
})();
