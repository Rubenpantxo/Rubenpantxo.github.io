/* ============================================================
   JENGA — torre de madera interactiva de la página principal.
   Arrastra un bloque para sacarlo: cuantos más quites, más
   inestable se vuelve la torre… hasta que se derrumba.
   ============================================================ */
(() => {
    'use strict';

    const canvas = document.getElementById('jenga-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('jenga-status');
    const resetBtn = document.getElementById('jenga-reset');

    // ---------- Constantes del juego ----------
    const LAYERS = 16;          // pisos de la torre
    const BL = 150, BW = 50, BH = 32;   // largo, ancho y alto del bloque (unidades de mundo)
    const PROJX = 0.46, PROJY = -0.26;  // proyección oblicua del eje de profundidad
    const PULL_LIMIT = BL * 0.62;       // distancia de arrastre para extraer
    const GRAV = 0.55;

    // ---------- Estado ----------
    let blocks = [];        // bloques vivos en la torre
    let flying = [];        // bloques extraídos o en derrumbe (cuerpos libres)
    let removed = 0;
    let best = parseInt(localStorage.getItem('jenga-best') || '0');
    let collapsed = false;
    let lean = 0;           // inclinación permanente acumulada (px por piso)
    let wobble = 0;         // nerviosismo actual de la torre (0..1)
    let shake = 0;          // sacudida puntual al tirar
    let drag = null;        // { block, sx, sy }
    let hoverB = null;
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
        blocks = []; flying = [];
        removed = 0; collapsed = false; lean = 0; wobble = 0; shake = 0; drag = null;
        let id = 0;
        for (let k = 0; k < LAYERS; k++) {
            const along = k % 2 === 0;   // true: eje largo en X; false: eje largo en profundidad
            for (let s = 0; s < 3; s++) {
                const r = rng(k * 31 + s * 7 + 5);
                blocks.push({
                    id: id++, layer: k, slot: s, along,
                    out: 0,                       // desplazamiento de extracción
                    tone: 58 + r() * 14,          // luminosidad de la madera
                    hue: 30 + r() * 9,
                    grain: 2 + Math.floor(r() * 3),
                    gone: false
                });
            }
        }
        updateStatus();
        hideOverlay();
    }

    // ---------- Geometría y proyección ----------
    function layerBlocks(k) { return blocks.filter(b => b.layer === k && !b.gone); }
    function topLayer() {
        for (let k = LAYERS - 1; k >= 0; k--) if (layerBlocks(k).length) return k;
        return -1;
    }

    // posición 3D del centro del bloque (x lateral, y altura, z profundidad)
    function blockCenter(b) {
        const off = (b.slot - 1) * BW;
        let x = 0, z = 0;
        if (b.along) { z = off; x = b.out; }
        else { x = off; z = b.out; }
        return { x, y: (b.layer + 0.5) * BH, z };
    }

    // proyección oblicua al lienzo, con vaivén e inclinación de la torre:
    // pantalla = (x + z*PROJX, -(y - z*PROJY))
    function P(x, y, z, layer) {
        const sway = collapsed ? 0 : (Math.sin(t * 0.045 + layer * 0.35) * wobble * 6 + Math.sin(t * 0.31) * shake * 4) * (layer / LAYERS);
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
            // f = frente (z-), b = fondo (z+); l/r = izquierda/derecha; b/t = abajo/arriba
            flb: P(c.x - hx, y0, c.z - hz, b.layer), frb: P(c.x + hx, y0, c.z - hz, b.layer),
            flt: P(c.x - hx, y1, c.z - hz, b.layer), frt: P(c.x + hx, y1, c.z - hz, b.layer),
            blb: P(c.x - hx, y0, c.z + hz, b.layer), brb: P(c.x + hx, y0, c.z + hz, b.layer),
            blt: P(c.x - hx, y1, c.z + hz, b.layer), brt: P(c.x + hx, y1, c.z + hz, b.layer)
        };
    }

    // ---------- Dibujo ----------
    function woodFront(b, x0, y0, w, h) {
        const g = rng(b.id * 977 + 11);
        ctx.fillStyle = `hsl(${b.hue},42%,${b.tone}%)`;
        ctx.fillRect(x0, y0, w, h);
        // vetas
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
        // cara superior (más clara)
        quad(q.flt, q.frt, q.brt, q.blt, `hsl(${hue},40%,${Math.min(88, L + 14)}%)`);
        // cara derecha (sombra)
        quad(q.frb, q.brb, q.brt, q.frt, `hsl(${hue},44%,${L - 16}%)`);
        // cara frontal con vetas
        const x0 = q.flb.x, y1 = q.flt.y;
        woodFront(b, x0, y1, q.frb.x - q.flb.x, q.flb.y - q.flt.y);
        ctx.strokeStyle = highlight ? 'rgba(255,170,40,0.95)' : 'rgba(70,42,12,0.4)';
        ctx.lineWidth = highlight ? 2.5 : 1;
        ctx.strokeRect(x0, y1, q.frb.x - q.flb.x, q.flb.y - q.flt.y);
        if (!b.along) {
            // testa del bloque: anillos de crecimiento
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

    function blockPath(b) {
        // silueta para detección de puntero (frente + cara superior)
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
        // sombra de la torre
        ctx.fillStyle = 'rgba(40,20,5,0.25)';
        ctx.beginPath();
        ctx.ellipse(W / 2 + lean * LAYERS * scale * 0.4, tableY + 8, BL * 0.62 * scale, 16, 0, 0, 7);
        ctx.fill();

        // bloques de la torre: de abajo arriba, fondo antes que frente
        const sorted = [...blocks].filter(b => !b.gone).sort((a, b2) => {
            if (a.layer !== b2.layer) return a.layer - b2.layer;
            const za = blockCenter(a).z, zb = blockCenter(b2).z;
            return zb - za;
        });
        for (const b of sorted) drawBlock(b, b === hoverB || (drag && b === drag.block));

        // cuerpos libres (extraídos / derrumbe)
        for (const f of flying) {
            ctx.save();
            ctx.translate(f.px, f.py);
            ctx.rotate(f.rot);
            const w = f.w * scale, h = f.h * scale;
            ctx.fillStyle = `hsl(${f.hue},42%,${f.tone}%)`;
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.strokeStyle = 'rgba(70,42,12,0.45)';
            ctx.strokeRect(-w / 2, -h / 2, w, h);
            ctx.restore();
        }
    }

    // ---------- Estabilidad ----------
    // Devuelve la "debilidad" de un piso según los huecos que tiene
    function layerWeakness(k) {
        const rem = layerBlocks(k).map(b => b.slot);
        if (k > topLayer() - 1 && k === topLayer()) return 0; // el piso superior no soporta nada
        if (rem.length === 3) return 0;
        if (rem.length === 2) return rem.includes(1) ? 0.08 : 0.04;  // dos apoyos: sólido
        if (rem.length === 1) return rem[0] === 1 ? 0.22 : 0.55;     // solo centro: equilibrista; solo lado: peligro
        return 1; // piso vacío con peso encima → caída
    }

    function evaluateStability(pulledLayer) {
        let acc = 0;
        const top = topLayer();
        for (let k = 0; k < top; k++) {
            const wkn = layerWeakness(k);
            if (wkn >= 1) return { collapse: true, at: k };
            // los pisos bajos soportan más peso: pesan más en la cuenta
            acc += wkn * (1 - k / (top + 1)) * 1.6;
        }
        // algo de mala suerte cuando la torre ya está tocada
        const risk = acc + removed * 0.012;
        if (risk > 1.45 + Math.random() * 0.5) {
            return { collapse: true, at: Math.max(0, pulledLayer - 1) };
        }
        return { collapse: false, instability: Math.min(1, risk / 1.6) };
    }

    function triggerCollapse(fromLayer) {
        collapsed = true;
        // todos los bloques desde el piso que falla salen volando
        for (const b of blocks) {
            if (b.gone || b.layer < fromLayer) continue;
            b.gone = true;
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
        if (removed > best) {
            best = removed;
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
        if (!collapsed) wobble = Math.max(wobble * 0.999, 0);
    }

    // ---------- Interacción ----------
    function pickBlock(mx, my) {
        const sorted = [...blocks].filter(b => !b.gone).sort((a, b2) => {
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

    canvas.addEventListener('pointerdown', e => {
        if (collapsed) return;
        const { x, y } = pointerPos(e);
        const b = pickBlock(x, y);
        if (!b) return;
        if (b.layer >= topLayer()) {
            // el piso de arriba no se toca: sacudida de aviso
            shake = 1.2;
            return;
        }
        drag = { block: b, sx: x, sy: y };
        canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
    });

    canvas.addEventListener('pointermove', e => {
        const { x, y } = pointerPos(e);
        if (!drag) {
            const b = collapsed ? null : pickBlock(x, y);
            hoverB = (b && b.layer < topLayer()) ? b : null;
            canvas.style.cursor = hoverB ? 'grab' : 'default';
            return;
        }
        const b = drag.block;
        const dx = x - drag.sx, dy = y - drag.sy;
        // proyectar el arrastre sobre el eje largo del bloque
        let pull;
        if (b.along) pull = dx / scale;
        else pull = (dx * PROJX + dy * PROJY) / (PROJX * PROJX + PROJY * PROJY) / scale;
        b.out = Math.max(-PULL_LIMIT * 1.1, Math.min(PULL_LIMIT * 1.1, pull));
        // la fricción menea la torre
        wobble = Math.min(1, Math.abs(b.out) / PULL_LIMIT * 0.5 + layerWeakness(b.layer) * 1.4);
        if (Math.abs(b.out) >= PULL_LIMIT) finishPull(b);
    });

    function finishPull(b) {
        drag = null;
        b.gone = true;
        removed++;
        const c = blockCenter(b);
        const p = P(c.x, c.y, c.z, b.layer);
        const dir = Math.sign(b.out) || 1;
        flying.push({
            px: p.x, py: p.y,
            vx: dir * (5 + Math.random() * 3), vy: -2.5,
            rot: 0, vr: dir * 0.12,
            w: b.along ? BL : BW, h: BH,
            hue: b.hue, tone: b.tone, rest: false
        });
        shake = 1;
        updateStatus();
        const st = evaluateStability(b.layer);
        if (st.collapse) {
            setTimeout(() => triggerCollapse(st.at), 350 + Math.random() * 500);
        } else {
            wobble = st.instability;
            // inclinación permanente si un piso queda apoyado en un solo lado
            const rem = layerBlocks(b.layer).map(x => x.slot);
            if (rem.length === 1 && rem[0] !== 1) {
                lean += (rem[0] === 0 ? -1 : 1) * 0.55;
            }
        }
    }

    canvas.addEventListener('pointerup', () => {
        if (drag) { drag.block.out = 0; drag = null; }
    });
    canvas.addEventListener('pointercancel', () => {
        if (drag) { drag.block.out = 0; drag = null; }
    });

    // ---------- UI ----------
    function updateStatus() {
        if (statusEl) statusEl.innerHTML =
            `🧱 Retirados: <b>${removed}</b> · 🏆 Récord: <b>${Math.max(best, removed)}</b>`;
    }
    function showOverlay() {
        const ov = document.getElementById('jenga-over');
        if (ov) {
            document.getElementById('jenga-over-score').textContent =
                removed + (removed === 1 ? ' bloque retirado' : ' bloques retirados');
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
        scale = Math.min(wCss / 420, hCss / (LAYERS * BH + 140));
        baseX = W / 2 - (BL * PROJX * scale) / 4;
        baseY = H - 60;
    }
    window.addEventListener('resize', resize);
    resize();
    buildTower();

    (function loop() {
        t++;
        physics();
        draw();
        requestAnimationFrame(loop);
    })();
})();
