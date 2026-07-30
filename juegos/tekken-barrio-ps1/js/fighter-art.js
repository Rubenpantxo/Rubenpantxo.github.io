/* ============================================
   FIGHTER ART
   Dibujo detallado de los luchadores: volumen con
   degradados, ropa con pliegues, cara con rasgos,
   accesorios y suciedad de combate.

   API:
     FighterArt.buildAppearance(char)        -> apariencia procedural
     FighterArt.drawFighter(ctx, opts)       -> dibuja y devuelve puntos clave
     FighterArt.emptyPose()                  -> pose neutra
     Portraits.url(char, opts)               -> data URL de retrato (cacheado)
   ============================================ */

const FighterArt = (() => {

  const OUTLINE = '#160d21';
  // Dirección de la luz en espacio local (arriba-delante)
  const LX = 0.40, LY = -0.92;

  /* ---------- utilidades numéricas ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function unit(dx, dy) {
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  }

  /* ---------- utilidades de color ---------- */
  function parseCol(c) {
    if (Array.isArray(c)) return c;
    if (typeof c !== 'string') return [255, 0, 255];
    if (c[0] === '#') {
      let h = c.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      const n = parseInt(h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const m = c.match(/-?\d+(\.\d+)?/g);
    if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
    return [255, 0, 255];
  }
  function rgb(a) {
    return 'rgb(' + (a[0] | 0) + ',' + (a[1] | 0) + ',' + (a[2] | 0) + ')';
  }
  // Los mismos colores se recalculan en cada frame: memorizamos el resultado
  const colMemo = new Map();
  function memo(key, fn) {
    let v = colMemo.get(key);
    if (v !== undefined) return v;
    v = fn();
    if (colMemo.size > 4000) colMemo.clear();
    colMemo.set(key, v);
    return v;
  }
  function mix(c1, c2, t) {
    return memo('m' + c1 + c2 + t.toFixed(3), () => {
      const a = parseCol(c1), b = parseCol(c2);
      return rgb([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]);
    });
  }
  function shade(c, amt) {
    return mix(c, amt > 0 ? '#ffffff' : '#000000', Math.abs(amt));
  }
  function alpha(c, a) {
    return memo('a' + c + a, () => {
      const p = parseCol(c);
      return 'rgba(' + (p[0] | 0) + ',' + (p[1] | 0) + ',' + (p[2] | 0) + ',' + a + ')';
    });
  }
  // Sombra saturada (no gris): mezcla con el complementario oscuro
  function deep(c, amt) {
    return memo('d' + c + amt.toFixed(3), () => {
      const p = parseCol(c);
      return rgb([
        lerp(p[0], p[0] * 0.35 + 18, amt),
        lerp(p[1], p[1] * 0.32 + 12, amt),
        lerp(p[2], p[2] * 0.45 + 34, amt)
      ]);
    });
  }

  /* ---------- PRNG determinista ---------- */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length) % arr.length];

  /* ============================================
     APARIENCIA PROCEDURAL
     ============================================ */
  function buildAppearance(ch) {
    const rnd = mulberry32(ch.id * 9301 + 49297);
    const skins = ['#f4cda4', '#e6b485', '#d09763', '#b3784a', '#8a5730', '#63401f'];
    const hairCs = ['#1a1418', '#33231a', '#5b3a1c', '#7a5230', '#242a30', '#3e2723'];
    const pantsCs = ['#3d5075', '#474751', '#63503a', '#33404a', '#584169', '#3d5c46'];
    const shoeCs = ['#ececec', '#22252a', '#b03030', '#caa84a', '#3a5f9c'];
    const hairTs = ['short', 'afro', 'ponytail', 'mohawk', 'long', 'fade'];
    const clothes = ['shirt', 'hoodie', 'vest', 'tank', 'jacket'];
    const eyes = ['#3a2a1a', '#2c4a6a', '#2f5a3a', '#4a2a2a'];

    const st = (ch.style || '').toUpperCase();
    const nm = (ch.name || '').toUpperCase();
    const s = ch.stats || { power: 6, speed: 6, defense: 6 };

    // Constitución física a partir de las stats
    let build = 'athletic';
    if (s.power >= 8 && s.speed <= 6) build = 'heavy';
    else if (s.speed >= 8 && s.power <= 6) build = 'slim';
    const girth = build === 'heavy' ? 1.2 : (build === 'slim' ? 0.86 : 1);

    const fem = /MATRIARCA|DOÑA|REINA|GRAFFITERA|SULIMA|PATAI/.test(nm);

    const skin = pick(rnd, skins);
    const app = {
      seed: ch.id,
      accent: ch.accent,
      accentDark: shade(ch.accent, -0.34),
      accentLight: shade(ch.accent, 0.28),
      skin,
      skinShadow: deep(skin, 0.45),
      skinLight: shade(skin, 0.22),
      hairC: pick(rnd, hairCs),
      pants: pick(rnd, pantsCs),
      shoe: pick(rnd, shoeCs),
      eye: pick(rnd, eyes),
      hairT: pick(rnd, hairTs),
      clothing: pick(rnd, clothes),
      shirtCol: '#ece7db',
      pattern: pick(rnd, ['none', 'none', 'number', 'stripes', 'logo']),
      number: 1 + Math.floor(rnd() * 98),
      build, girth, fem,
      scale: 0.95 + rnd() * 0.1,
      detail: {
        gloves: false, chain: false, spray: false, cap: false, cane: false,
        headband: false, beret: false, scarf: false, wrench: false,
        goldChain: false, beard: false, earring: false, tape: false,
        apron: false, shades: false, tattoo: false
      }
    };
    app.pantsDark = deep(app.pants, 0.5);
    app.shoeSole = shade(app.shoe, app.shoe === '#ececec' ? -0.55 : 0.35);
    app.hairLight = shade(app.hairC, 0.3);

    const d = app.detail;
    if (rnd() < 0.4) d.tattoo = true;
    if (rnd() < 0.35) d.earring = true;

    // Rasgo característico según estilo de lucha / nombre
    if (st.includes('BOX')) { d.gloves = true; app.clothing = 'tank'; }
    if (st.includes('TAG') || st.includes('RANGE')) d.chain = true;
    if (st.includes('RHYTHM') || nm.includes('RAPERO')) {
      d.cap = true; d.goldChain = true; d.shades = true; app.clothing = 'hoodie';
    }
    if (st.includes('VETERAN') || nm.includes('VIEJO')) {
      d.cane = true; d.beret = true; d.beard = true;
      app.hairC = '#d2d2d2'; app.hairLight = '#f2f2f2'; app.hairT = 'short';
      app.clothing = 'vest'; app.build = 'athletic'; app.girth = 1.02;
    }
    if (st.includes('KICK')) { d.headband = true; d.tape = true; app.clothing = 'tank'; }
    if (st.includes('TECH') || nm.includes('MECANICO') || nm.includes('MECÁNICO')) {
      d.wrench = true; d.cap = true; app.clothing = 'jacket';
    }
    if (nm.includes('GRAFFITERA')) { d.spray = true; app.hairT = 'ponytail'; app.clothing = 'hoodie'; }
    if (st.includes('GRAB') && !nm.includes('MERCADO')) d.scarf = true;
    if (nm.includes('MERCADO')) { d.apron = true; d.scarf = true; app.clothing = 'shirt'; }
    if (nm.includes('CABALLERO')) { app.hairT = 'short'; app.hairC = '#12121a'; app.clothing = 'jacket'; }
    if (nm.includes('SULIMA') || nm.includes('REINA') || nm.includes('PATAI')) {
      if (!d.scarf) app.hairT = 'ponytail';
    }
    if (app.fem && app.clothing === 'vest' && !d.apron) app.clothing = 'tank';
    return app;
  }

  /* ============================================
     POSE NEUTRA
     ============================================ */
  function emptyPose() {
    return {
      crouch: 0.22, hipDX: 0, torso: 0.10,
      headDX: 0, headDY: 0,
      armF: [0.55, 2.35], armB: [0.30, 2.05],
      legF: [0.30, 0.08], legB: [-0.32, -0.50],
      rot: 0, hop: 0, flash: 0,
      mouth: 0.12, brow: 0, air: false, noAnchor: false,
      cloth: 0
    };
  }

  /* ============================================
     ESQUELETO
     ============================================ */
  function buildSkeleton(pose, S, app) {
    const g = app.girth;
    const legU = 0.232 * S, legL = 0.222 * S;
    const torsoL = (app.fem ? 0.300 : 0.312) * S;
    const headR = 0.106 * S;
    const armU = 0.158 * S, armL = 0.150 * S;

    // el agachado hunde de verdad la cadera, no solo dobla las rodillas
    const hipH = (legU + legL) * (1 - 0.04 - pose.crouch * 0.34);
    const hip = { x: pose.hipDX * S, y: -hipH };
    const neck = {
      x: hip.x + Math.sin(pose.torso) * torsoL,
      y: hip.y - Math.cos(pose.torso) * torsoL
    };
    const head = {
      x: neck.x + Math.sin(pose.torso) * headR * 0.86 + pose.headDX * S,
      y: neck.y - headR * 0.92 + pose.headDY * S
    };
    const shoulder = { x: lerp(hip.x, neck.x, 0.88), y: lerp(hip.y, neck.y, 0.88) };

    function chain2(o, a1, a2, L1, L2) {
      const j = { x: o.x + Math.sin(a1) * L1, y: o.y + Math.cos(a1) * L1 };
      const e = { x: j.x + Math.sin(a2) * L2, y: j.y + Math.cos(a2) * L2 };
      return [j, e];
    }
    const spread = 0.030 * S * g;
    const hipF = { x: hip.x + spread, y: hip.y };
    const hipB = { x: hip.x - spread, y: hip.y };
    const shF = { x: shoulder.x + 0.022 * S, y: shoulder.y };
    const shB = { x: shoulder.x - 0.026 * S, y: shoulder.y };
    const [kneeF, footF] = chain2(hipF, pose.legF[0], pose.legF[1], legU, legL);
    const [kneeB, footB] = chain2(hipB, pose.legB[0], pose.legB[1], legU, legL);
    const [elbF, handF] = chain2(shF, pose.armF[0], pose.armF[1], armU, armL);
    const [elbB, handB] = chain2(shB, pose.armB[0], pose.armB[1], armU, armL);

    const sk = {
      hip, neck, head, shoulder, hipF, hipB, shF, shB,
      kneeF, footF, kneeB, footB, elbF, handF, elbB, handB,
      headR, torsoL, legU, legL, armU, armL
    };

    // Anclar el pie más bajo al suelo (salvo en el aire)
    if (!pose.noAnchor) {
      const dy = Math.max(footF.y, footB.y);
      for (const k in sk) {
        const pt = sk[k];
        if (pt && typeof pt === 'object' && 'y' in pt) pt.y -= dy;
      }
    }
    return sk;
  }

  /* ============================================
     PRIMITIVAS DE DIBUJO CON VOLUMEN
     ============================================ */
  // Segmento cónico con degradado perpendicular (aspecto cilíndrico)
  function limbSeg(ctx, p0, p1, w0, w1, col, litAmt, darkAmt, flat) {
    const [ux, uy] = unit(p1.x - p0.x, p1.y - p0.y);
    const nx = -uy, ny = ux;
    const sgn = (nx * LX + ny * LY) >= 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(p0.x + nx * w0 * 0.5, p0.y + ny * w0 * 0.5);
    ctx.lineTo(p1.x + nx * w1 * 0.5, p1.y + ny * w1 * 0.5);
    ctx.lineTo(p1.x - nx * w1 * 0.5, p1.y - ny * w1 * 0.5);
    ctx.lineTo(p0.x - nx * w0 * 0.5, p0.y - ny * w0 * 0.5);
    ctx.closePath();
    if (flat) { ctx.fillStyle = col; ctx.fill(); return; }
    const mx = (p0.x + p1.x) * 0.5, my = (p0.y + p1.y) * 0.5;
    const w = Math.max(w0, w1) * 0.5;
    const g = ctx.createLinearGradient(
      mx + nx * w * sgn, my + ny * w * sgn,
      mx - nx * w * sgn, my - ny * w * sgn
    );
    g.addColorStop(0, shade(col, litAmt));
    g.addColorStop(0.42, col);
    g.addColorStop(1, deep(col, darkAmt));
    ctx.fillStyle = g;
    ctx.fill();
  }

  // Silueta oscura de un segmento cónico (contorno que respeta el grosor)
  function segOutline(ctx, p0, p1, w0, w1) {
    const [ux, uy] = unit(p1.x - p0.x, p1.y - p0.y);
    const nx = -uy, ny = ux;
    ctx.beginPath();
    ctx.moveTo(p0.x + nx * w0 * 0.5, p0.y + ny * w0 * 0.5);
    ctx.lineTo(p1.x + nx * w1 * 0.5, p1.y + ny * w1 * 0.5);
    ctx.arc(p1.x, p1.y, w1 * 0.5, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
    ctx.lineTo(p0.x - nx * w0 * 0.5, p0.y - ny * w0 * 0.5);
    ctx.arc(p0.x, p0.y, w0 * 0.5, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
    ctx.closePath();
    ctx.fill();
  }

  function ball(ctx, p, r, col, litAmt) {
    const g = ctx.createRadialGradient(
      p.x + LX * r * 0.5, p.y + LY * r * 0.5, r * 0.12,
      p.x, p.y, r
    );
    g.addColorStop(0, shade(col, litAmt));
    g.addColorStop(0.55, col);
    g.addColorStop(1, deep(col, 0.45));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
  }

  /* ============================================
     DIBUJO DEL LUCHADOR
     opts: { app, pose, x, groundY, S, facing, time,
             dirt (0..1), lowHp (bool), tint (color|null), tintAmt }
     ============================================ */
  function drawFighter(ctx, o) {
    const app = o.app;
    const pose = o.pose;
    const S = o.S * (app.scale || 1);
    const facing = o.facing || 1;
    const time = o.time || 0;
    const dirt = clamp(o.dirt || 0, 0, 1);
    const g = app.girth;
    const sk = buildSkeleton(pose, S, app);

    // Tinte de daño (blanco -> rojo) aplicado a todos los colores
    const fl = pose.flash || 0;
    const C = fl > 0
      ? (col) => mix(col, fl > 0.7 ? '#ffffff' : '#ff5540', clamp(fl * 0.62, 0, 0.62))
      : (col) => col;

    // Colores de ropa por prenda
    const cl = app.clothing;
    const longSleeve = (cl === 'hoodie' || cl === 'jacket');
    const bareArm = (cl === 'vest' || cl === 'tank');
    const sleeveCol = longSleeve ? app.accent : shade(app.accent, -0.1);
    const torsoCol = (cl === 'vest' || cl === 'tank') ? app.shirtCol : app.accent;

    const wThighU = 0.098 * S * g, wThighL = 0.078 * S * g;
    const wCalfL = 0.058 * S * g;
    const wArmU = 0.068 * S * g, wArmM = 0.056 * S * g, wArmL = 0.048 * S * g;

    ctx.save();
    ctx.translate(o.x, o.groundY - (pose.hop || 0) * S);
    ctx.scale(facing, 1);
    if (pose.rot) {
      const pvx = -0.12 * S;
      ctx.translate(pvx, 0);
      ctx.rotate(pose.rot);
      ctx.translate(-pvx, 0);
    }
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    /* ---- helpers locales ---- */
    const OL = 0.016 * S;              // grosor del contorno
    function outline(pts, w) {
      ctx.fillStyle = C(OUTLINE);
      for (let i = 1; i < pts.length; i++) segOutline(ctx, pts[i - 1], pts[i], w, w);
    }
    // Cada tramo se contornea y se rellena por separado, de dentro
    // hacia fuera: así el antebrazo tapa limpiamente al brazo al doblarse.
    function limb(j0, j1, j2, wA, wB, wC, colUp, colLo, joint, flat) {
      ctx.fillStyle = C(OUTLINE);
      segOutline(ctx, j0, j1, wA + OL, wB + OL);
      limbSeg(ctx, j0, j1, wA, wB, C(colUp), 0.26, 0.4, flat);
      if (joint && !flat) ball(ctx, j1, wB * 0.46, C(colUp), 0.04);   // codo
      ctx.fillStyle = C(OUTLINE);
      segOutline(ctx, j1, j2, wB + OL, wC + OL);
      limbSeg(ctx, j1, j2, wB, wC, C(colLo), 0.26, 0.4, flat);
    }
    function seam(p0, p1, w, col, a) {
      ctx.strokeStyle = alpha(C(col), a);
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    }

    /* ---- pierna ---- */
    function drawLeg(hipP, kneeP, footP, front) {
      const base = front ? app.pants : deep(app.pants, 0.3);
      limb(hipP, kneeP, footP, wThighU, wThighL, wCalfL, base, base, false, !front);
      // dobladillo del pantalón
      const [ux, uy] = unit(footP.x - kneeP.x, footP.y - kneeP.y);
      const cuff = { x: footP.x - ux * 0.055 * S, y: footP.y - uy * 0.055 * S };
      seam({ x: cuff.x - 0.032 * S, y: cuff.y }, { x: cuff.x + 0.032 * S, y: cuff.y },
        0.012 * S, deep(app.pants, 0.6), 0.85);
      // pliegue en la rodilla
      seam(
        { x: kneeP.x - 0.02 * S, y: kneeP.y + 0.012 * S },
        { x: kneeP.x + 0.024 * S, y: kneeP.y + 0.004 * S },
        0.008 * S, '#000000', 0.18);
      drawShoe(footP, front);
    }

    function drawShoe(p, front) {
      const h = 0.044 * S, len = 0.092 * S;
      const back = { x: p.x - 0.024 * S, y: p.y - h * 0.1 };
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(back.x, back.y - h);
      ctx.quadraticCurveTo(back.x + len * 0.5, back.y - h * 1.05, back.x + len * 0.82, back.y - h * 0.72);
      ctx.quadraticCurveTo(back.x + len * 1.02, back.y - h * 0.3, back.x + len * 0.96, back.y + h * 0.12);
      ctx.quadraticCurveTo(back.x + len * 0.4, back.y + h * 0.22, back.x - 0.004 * S, back.y + h * 0.12);
      ctx.closePath();
      ctx.strokeStyle = C(OUTLINE); ctx.lineWidth = 0.018 * S; ctx.stroke();
      const gd = ctx.createLinearGradient(back.x, back.y - h, back.x, back.y + h * 0.2);
      gd.addColorStop(0, shade(C(front ? app.shoe : deep(app.shoe, 0.2)), 0.24));
      gd.addColorStop(1, deep(C(app.shoe), 0.4));
      ctx.fillStyle = gd; ctx.fill();
      // suela
      ctx.fillStyle = C(app.shoeSole);
      ctx.fillRect(back.x - 0.004 * S, back.y + h * 0.02, len * 0.98, h * 0.22);
      ctx.fillStyle = alpha('#000', 0.35);
      ctx.fillRect(back.x - 0.004 * S, back.y + h * 0.2, len * 0.98, 0.008 * S);
      // cordones
      ctx.strokeStyle = alpha(C('#f4f4f4'), 0.8); ctx.lineWidth = 0.008 * S;
      for (let i = 0; i < 3; i++) {
        const xx = back.x + len * (0.34 + i * 0.17);
        ctx.beginPath();
        ctx.moveTo(xx, back.y - h * 0.78);
        ctx.lineTo(xx + 0.014 * S, back.y - h * 0.42);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* ---- brazo ---- */
    function drawArm(shP, elbP, handP, front) {
      const upCol = bareArm ? app.skin : sleeveCol;
      const loCol = longSleeve ? shade(sleeveCol, -0.12) : app.skin;
      const shadeAdj = front ? 0 : 0.16;
      limb(shP, elbP, handP,
        wArmU, wArmM, wArmL,
        front ? upCol : deep(upCol, shadeAdj),
        front ? loCol : deep(loCol, shadeAdj), true, !front);

      if (!longSleeve && !bareArm) {
        // borde de manga corta
        const mid = { x: lerp(shP.x, elbP.x, 0.72), y: lerp(shP.y, elbP.y, 0.72) };
        seam({ x: mid.x - 0.03 * S, y: mid.y }, { x: mid.x + 0.03 * S, y: mid.y },
          0.014 * S, deep(app.accent, 0.55), 0.9);
      }
      if (longSleeve) {
        // puño
        const cf = { x: lerp(elbP.x, handP.x, 0.86), y: lerp(elbP.y, handP.y, 0.86) };
        seam({ x: cf.x - 0.026 * S, y: cf.y }, { x: cf.x + 0.026 * S, y: cf.y },
          0.018 * S, deep(sleeveCol, 0.5), 0.9);
      }
      if (bareArm) {
        // definición de bíceps
        const mid = { x: lerp(shP.x, elbP.x, 0.45), y: lerp(shP.y, elbP.y, 0.45) };
        ctx.strokeStyle = alpha(app.skinShadow, 0.5);
        ctx.lineWidth = 0.009 * S;
        ctx.beginPath();
        ctx.arc(mid.x, mid.y, wArmU * 0.34, -0.7, 0.9);
        ctx.stroke();
        if (app.detail.tattoo && front) {
          ctx.strokeStyle = alpha('#2a3f6a', 0.55);
          ctx.lineWidth = 0.008 * S;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(mid.x, mid.y + i * 0.018 * S - 0.018 * S, wArmU * 0.36, -0.4, 1.1);
            ctx.stroke();
          }
        }
      }
      if (app.detail.tape && !app.detail.gloves) {
        // vendas en la muñeca
        const wr = { x: lerp(elbP.x, handP.x, 0.9), y: lerp(elbP.y, handP.y, 0.9) };
        ctx.strokeStyle = alpha(C('#e8e2d2'), 0.95);
        ctx.lineWidth = 0.013 * S;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(wr.x - 0.026 * S, wr.y + i * 0.014 * S - 0.014 * S);
          ctx.lineTo(wr.x + 0.026 * S, wr.y + i * 0.014 * S - 0.008 * S);
          ctx.stroke();
        }
      }
      drawHand(handP, elbP, front);
    }

    function drawHand(p, elbP, front) {
      const [ux, uy] = unit(p.x - elbP.x, p.y - elbP.y);
      if (app.detail.gloves) {
        const r = 0.064 * S * (front ? 1 : 0.94);
        ctx.fillStyle = C(OUTLINE);
        ctx.beginPath(); ctx.arc(p.x, p.y, r + OL * 0.5, 0, Math.PI * 2); ctx.fill();
        ball(ctx, p, r, C(front ? app.accent : deep(app.accent, 0.18)), 0.3);
        // brillo de cuero + cordón
        ctx.fillStyle = alpha('#ffffff', 0.28);
        ctx.beginPath();
        ctx.ellipse(p.x + r * 0.28, p.y - r * 0.34, r * 0.3, r * 0.18, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = alpha(C('#efe6d0'), 0.9); ctx.lineWidth = 0.012 * S;
        ctx.beginPath();
        ctx.moveTo(p.x - ux * r * 0.9 - uy * r * 0.5, p.y - uy * r * 0.9 + ux * r * 0.5);
        ctx.lineTo(p.x - ux * r * 0.9 + uy * r * 0.5, p.y - uy * r * 0.9 - ux * r * 0.5);
        ctx.stroke();
        return;
      }
      const r = 0.046 * S * g * (front ? 1 : 0.95);
      ctx.fillStyle = C(OUTLINE);
      ctx.beginPath(); ctx.arc(p.x, p.y, r + OL * 0.5, 0, Math.PI * 2); ctx.fill();
      if (front) {
        ball(ctx, p, r, C(app.skin), 0.24);
      } else {
        ctx.fillStyle = C(deep(app.skin, 0.24));
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
        return;
      }
      // nudillos
      ctx.strokeStyle = alpha(app.skinShadow, 0.6);
      ctx.lineWidth = 0.007 * S;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(p.x + ux * r * 0.55 + uy * i * r * 0.5, p.y + uy * r * 0.55 - ux * i * r * 0.5);
        ctx.lineTo(p.x + ux * r * 0.95 + uy * i * r * 0.45, p.y + uy * r * 0.95 - ux * i * r * 0.45);
        ctx.stroke();
      }
      // pulgar
      ctx.fillStyle = C(app.skin);
      ctx.beginPath();
      ctx.ellipse(p.x - uy * r * 0.7, p.y + ux * r * 0.7, r * 0.42, r * 0.28,
        Math.atan2(uy, ux), 0, Math.PI * 2);
      ctx.fill();
    }

    /* ---- torso ---- */
    function torsoPath() {
      const hip = sk.hip, neck = sk.neck;
      const [ux, uy] = unit(neck.x - hip.x, neck.y - hip.y);
      const nx = -uy, ny = ux;             // hacia delante
      const L = Math.hypot(neck.x - hip.x, neck.y - hip.y);
      const hipW = (app.fem ? 0.166 : 0.152) * S * g;
      const waistW = (app.fem ? 0.126 : 0.138) * S * g;
      const chestW = (app.fem ? 0.166 : 0.180) * S * g;
      const shW = (app.fem ? 0.166 : 0.192) * S * g;

      const P = (t, w, side) => ({
        x: hip.x + ux * L * t + nx * w * 0.5 * side,
        y: hip.y + uy * L * t + ny * w * 0.5 * side
      });
      const p = {
        hipF: P(-0.02, hipW, 1), waistF: P(0.34, waistW, 1),
        chestF: P(0.74, chestW, 1), shF: P(1.02, shW, 1),
        shB: P(1.02, shW, -1), chestB: P(0.74, chestW, -1),
        waistB: P(0.34, waistW, -1), hipB: P(-0.02, hipW, -1)
      };
      ctx.beginPath();
      ctx.moveTo(p.hipF.x, p.hipF.y);
      ctx.quadraticCurveTo(p.waistF.x, p.waistF.y, p.chestF.x, p.chestF.y);
      ctx.quadraticCurveTo(
        lerp(p.chestF.x, p.shF.x, 0.7), lerp(p.chestF.y, p.shF.y, 0.7),
        p.shF.x, p.shF.y);
      ctx.quadraticCurveTo(
        lerp(p.shF.x, p.shB.x, 0.5) + ux * 0.02 * S, lerp(p.shF.y, p.shB.y, 0.5) + uy * 0.02 * S,
        p.shB.x, p.shB.y);
      ctx.quadraticCurveTo(p.chestB.x, p.chestB.y, p.waistB.x, p.waistB.y);
      ctx.quadraticCurveTo(
        lerp(p.waistB.x, p.hipB.x, 0.6), lerp(p.waistB.y, p.hipB.y, 0.6),
        p.hipB.x, p.hipB.y);
      ctx.closePath();
      return { p, ux, uy, nx, ny, L };
    }

    function drawTorso() {
      const T = torsoPath();
      // contorno
      ctx.strokeStyle = C(OUTLINE); ctx.lineWidth = 0.026 * S; ctx.stroke();
      // relleno con volumen (luz delante, sombra detrás)
      const gd = ctx.createLinearGradient(
        T.p.chestF.x, T.p.chestF.y, T.p.chestB.x, T.p.chestB.y);
      gd.addColorStop(0, shade(C(torsoCol), 0.2));
      gd.addColorStop(0.45, C(torsoCol));
      gd.addColorStop(1, deep(C(torsoCol), 0.42));
      ctx.fillStyle = gd;
      ctx.fill();

      ctx.save();
      ctx.clip();  // los detalles no se salen del torso

      const mid = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
      const T2 = T;

      if (cl === 'vest' || cl === 'jacket') {
        // prenda abierta: paneles laterales sobre la camiseta
        const col = cl === 'jacket' ? app.accent : shade(app.accent, -0.14);
        ctx.fillStyle = deep(C(col), 0.16);
        ctx.beginPath();
        ctx.moveTo(T2.p.shB.x, T2.p.shB.y);
        ctx.lineTo(T2.p.chestB.x, T2.p.chestB.y);
        ctx.lineTo(T2.p.hipB.x, T2.p.hipB.y);
        ctx.lineTo(T2.p.hipB.x + T2.nx * 0.09 * S, T2.p.hipB.y + T2.ny * 0.09 * S);
        ctx.lineTo(T2.p.shB.x + T2.nx * 0.10 * S, T2.p.shB.y + T2.ny * 0.10 * S);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = C(col);
        ctx.beginPath();
        ctx.moveTo(T2.p.shF.x, T2.p.shF.y);
        ctx.lineTo(T2.p.chestF.x, T2.p.chestF.y);
        ctx.lineTo(T2.p.hipF.x, T2.p.hipF.y);
        ctx.lineTo(T2.p.hipF.x - T2.nx * 0.055 * S, T2.p.hipF.y - T2.ny * 0.055 * S);
        ctx.lineTo(T2.p.shF.x - T2.nx * 0.075 * S, T2.p.shF.y - T2.ny * 0.075 * S);
        ctx.closePath();
        ctx.fill();
        // solapa
        ctx.strokeStyle = alpha('#000', 0.35); ctx.lineWidth = 0.008 * S;
        ctx.beginPath();
        ctx.moveTo(T2.p.shF.x - T2.nx * 0.075 * S, T2.p.shF.y - T2.ny * 0.075 * S);
        ctx.lineTo(T2.p.hipF.x - T2.nx * 0.055 * S, T2.p.hipF.y - T2.ny * 0.055 * S);
        ctx.stroke();
      }

      if (cl === 'tank') {
        // tirantes
        ctx.fillStyle = deep(C(app.shirtCol), 0.12);
        const a = mid(T2.p.shF, T2.p.shB, 0.25), b2 = mid(T2.p.chestF, T2.p.chestB, 0.3);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b2.x, b2.y);
        ctx.lineTo(b2.x + T2.nx * 0.03 * S, b2.y + T2.ny * 0.03 * S);
        ctx.lineTo(a.x + T2.nx * 0.03 * S, a.y + T2.ny * 0.03 * S);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = alpha(C(app.accent), 0.9);
        const hemA = mid(T2.p.hipF, T2.p.waistF, 0.5), hemB = mid(T2.p.hipB, T2.p.waistB, 0.5);
        ctx.fillRect(Math.min(hemA.x, hemB.x), Math.min(hemA.y, hemB.y) - 0.01 * S,
          Math.abs(hemA.x - hemB.x) + 0.02 * S, 0.02 * S);
      }

      if (cl === 'hoodie') {
        // bolsillo canguro + cordones
        const pk = mid(T2.p.waistF, T2.p.waistB, 0.5);
        ctx.strokeStyle = alpha('#000', 0.32); ctx.lineWidth = 0.01 * S;
        ctx.beginPath();
        ctx.arc(pk.x, pk.y + 0.012 * S, 0.062 * S, Math.PI * 0.08, Math.PI * 0.92);
        ctx.stroke();
      }

      if (app.detail.apron) {
        // mandil de mercado
        ctx.fillStyle = alpha('#e9e3cf', 0.95);
        ctx.beginPath();
        ctx.moveTo(T2.p.chestF.x, T2.p.chestF.y);
        ctx.lineTo(T2.p.hipF.x, T2.p.hipF.y);
        ctx.lineTo(T2.p.hipF.x - T2.nx * 0.12 * S, T2.p.hipF.y - T2.ny * 0.12 * S);
        ctx.lineTo(T2.p.chestF.x - T2.nx * 0.085 * S, T2.p.chestF.y - T2.ny * 0.085 * S);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = alpha('#b9b09a', 0.9); ctx.lineWidth = 0.008 * S;
        ctx.stroke();
      }

      // pecho / abdomen: sombras suaves de músculo
      if (cl === 'tank' || cl === 'vest') {
        ctx.strokeStyle = alpha(deep(torsoCol, 0.6), 0.45);
        ctx.lineWidth = 0.008 * S;
        const c0 = mid(T2.p.chestF, T2.p.chestB, 0.42);
        const w0 = mid(T2.p.waistF, T2.p.waistB, 0.42);
        ctx.beginPath(); ctx.moveTo(c0.x, c0.y); ctx.lineTo(w0.x, w0.y); ctx.stroke();
      }

      // patrón de camiseta
      if (cl === 'shirt' || cl === 'hoodie') {
        if (app.pattern === 'stripes') {
          ctx.strokeStyle = alpha(shade(torsoCol, 0.4), 0.5);
          ctx.lineWidth = 0.016 * S;
          for (let i = 0; i < 5; i++) {
            const t = 0.16 + i * 0.16;
            const a = mid(T2.p.hipF, T2.p.chestF, t), b2 = mid(T2.p.hipB, T2.p.chestB, t);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b2.x, b2.y); ctx.stroke();
          }
        } else if (app.pattern === 'number') {
          const c = mid(T2.p.chestF, T2.p.chestB, 0.45);
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.rotate(Math.atan2(T2.uy, T2.ux) + Math.PI / 2);
          ctx.fillStyle = alpha(shade(torsoCol, 0.55), 0.8);
          ctx.font = '900 ' + (0.085 * S) + 'px monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(app.number), 0, 0);
          ctx.restore();
        } else if (app.pattern === 'logo') {
          const c = mid(T2.p.chestF, T2.p.chestB, 0.42);
          ctx.fillStyle = alpha(shade(torsoCol, 0.5), 0.8);
          ctx.beginPath(); ctx.arc(c.x, c.y, 0.03 * S, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = alpha(deep(torsoCol, 0.7), 0.9);
          ctx.beginPath(); ctx.arc(c.x, c.y, 0.014 * S, 0, Math.PI * 2); ctx.fill();
        }
      }

      // pliegues de tela dinámicos
      const sway = Math.sin(time * 3.1 + app.seed) * 0.006 * S + (pose.cloth || 0) * 0.01 * S;
      ctx.strokeStyle = alpha('#000', 0.10);
      ctx.lineWidth = 0.007 * S;
      for (let i = 0; i < 2; i++) {
        const t = 0.26 + i * 0.3;
        const a = mid(T2.p.hipF, T2.p.chestF, t);
        const b2 = mid(T2.p.hipB, T2.p.chestB, t + 0.06);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(
          lerp(a.x, b2.x, 0.5) + sway, lerp(a.y, b2.y, 0.5) + 0.012 * S,
          b2.x, b2.y);
        ctx.stroke();
      }

      // suciedad de combate
      if (dirt > 0.05) {
        const rnd = mulberry32(app.seed * 77 + 13);
        ctx.fillStyle = alpha('#4a3524', 0.4 * dirt);
        const n = Math.floor(2 + dirt * 5);
        for (let i = 0; i < n; i++) {
          const t = rnd(), sd = rnd() > 0.5 ? 1 : -1;
          const a = mid(T2.p.hipF, T2.p.chestF, t);
          const b2 = mid(T2.p.hipB, T2.p.chestB, t);
          const c = mid(a, b2, 0.25 + rnd() * 0.5);
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, 0.03 * S * (0.5 + rnd()), 0.012 * S,
            sd * rnd(), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // cinturón con hebilla
      const bA = { x: T.p.hipF.x, y: T.p.hipF.y };
      const bB = { x: T.p.hipB.x, y: T.p.hipB.y };
      ctx.strokeStyle = C(deep(app.pants, 0.65)); ctx.lineWidth = 0.03 * S;
      ctx.beginPath(); ctx.moveTo(bA.x, bA.y); ctx.lineTo(bB.x, bB.y); ctx.stroke();
      ctx.fillStyle = C('#d8b64a');
      ctx.fillRect(lerp(bA.x, bB.x, 0.34) - 0.014 * S, lerp(bA.y, bB.y, 0.34) - 0.012 * S,
        0.028 * S, 0.024 * S);

      // capucha caída (hoodie)
      if (cl === 'hoodie') {
        ctx.fillStyle = C(deep(app.accent, 0.3));
        ctx.beginPath();
        ctx.ellipse(sk.neck.x - 0.05 * S, sk.neck.y + 0.022 * S,
          0.082 * S, 0.058 * S, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = C(OUTLINE); ctx.lineWidth = 0.012 * S; ctx.stroke();
        ctx.strokeStyle = C('#f2f2f2'); ctx.lineWidth = 0.009 * S;
        ctx.beginPath();
        ctx.moveTo(sk.neck.x + 0.004 * S, sk.neck.y + 0.03 * S);
        ctx.quadraticCurveTo(sk.neck.x + 0.02 * S, sk.neck.y + 0.08 * S,
          sk.neck.x + 0.012 * S, sk.neck.y + 0.115 * S);
        ctx.stroke();
      }
      // cuello de camisa
      if (cl === 'shirt' || cl === 'jacket') {
        ctx.strokeStyle = C(deep(app.accent, 0.45)); ctx.lineWidth = 0.014 * S;
        ctx.beginPath();
        ctx.moveTo(sk.neck.x - 0.045 * S, sk.neck.y + 0.012 * S);
        ctx.quadraticCurveTo(sk.neck.x, sk.neck.y + 0.042 * S,
          sk.neck.x + 0.045 * S, sk.neck.y + 0.008 * S);
        ctx.stroke();
      }
      if (app.detail.goldChain) {
        ctx.strokeStyle = C('#ffd54a'); ctx.lineWidth = 0.017 * S;
        ctx.beginPath();
        ctx.arc(sk.neck.x, sk.neck.y + 0.05 * S, 0.058 * S, 0.3, Math.PI - 0.3);
        ctx.stroke();
        ctx.fillStyle = C('#ffe680');
        ctx.beginPath();
        ctx.arc(sk.neck.x, sk.neck.y + 0.112 * S, 0.017 * S, 0, Math.PI * 2);
        ctx.fill();
      }
      if (app.detail.scarf) {
        ctx.fillStyle = C(shade(app.accent, 0.1));
        ctx.beginPath();
        ctx.ellipse(sk.neck.x, sk.neck.y + 0.026 * S, 0.062 * S, 0.03 * S, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = C(OUTLINE); ctx.lineWidth = 0.01 * S; ctx.stroke();
      }
    }

    /* ---- cabeza ---- */
    function drawHead() {
      const h = sk.head, R = sk.headR;

      // cuello
      const nk = { x: sk.neck.x, y: sk.neck.y };
      const chin = { x: h.x + R * 0.06, y: h.y + R * 0.66 };
      ctx.fillStyle = C(OUTLINE);
      segOutline(ctx, nk, chin, 0.058 * S + OL, 0.05 * S + OL);
      limbSeg(ctx, nk, chin, 0.058 * S, 0.05 * S, C(app.skin), 0.1, 0.5);

      // pelo por detrás
      if (app.hairT === 'afro') {
        ctx.fillStyle = C(app.hairC);
        ctx.beginPath();
        ctx.arc(h.x - R * 0.08, h.y - R * 0.1, R * 1.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = alpha(C(app.hairLight), 0.35);
        ctx.beginPath();
        ctx.arc(h.x + R * 0.2, h.y - R * 0.55, R * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (app.hairT === 'long') {
        ctx.fillStyle = C(app.hairC);
        ctx.beginPath();
        ctx.ellipse(h.x - R * 0.5, h.y + R * 0.6, R * 0.8, R * 1.35, 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
      if (app.hairT === 'ponytail') {
        const sw = Math.sin(time * 2.6 + app.seed) * 0.018 * S;
        ctx.lineCap = 'round';
        ctx.strokeStyle = C(app.hairC);
        ctx.lineWidth = 0.034 * S;
        ctx.beginPath();
        ctx.moveTo(h.x - R * 0.8, h.y - R * 0.2);
        ctx.quadraticCurveTo(h.x - R * 1.5 + sw, h.y + R * 0.3,
          h.x - R * 1.3 + sw * 1.5, h.y + R * 1.15);
        ctx.stroke();
        ctx.strokeStyle = alpha(C(app.hairLight), 0.45);
        ctx.lineWidth = 0.012 * S;
        ctx.beginPath();
        ctx.moveTo(h.x - R * 0.8, h.y - R * 0.26);
        ctx.quadraticCurveTo(h.x - R * 1.5 + sw, h.y + R * 0.24,
          h.x - R * 1.32 + sw * 1.5, h.y + R * 1.0);
        ctx.stroke();
        ctx.strokeStyle = C(app.accent); ctx.lineWidth = 0.016 * S;
        ctx.beginPath();
        ctx.moveTo(h.x - R * 0.95, h.y - R * 0.34);
        ctx.lineTo(h.x - R * 0.8, h.y - R * 0.02);
        ctx.stroke();
      }

      // cráneo + mandíbula (perfil 3/4)
      ctx.beginPath();
      ctx.moveTo(h.x - R * 0.92, h.y - R * 0.1);
      ctx.quadraticCurveTo(h.x - R * 0.85, h.y - R * 1.06, h.x + R * 0.15, h.y - R * 1.0);
      ctx.quadraticCurveTo(h.x + R * 0.95, h.y - R * 0.92, h.x + R * 0.96, h.y - R * 0.1);
      ctx.quadraticCurveTo(h.x + R * 0.96, h.y + R * 0.42, h.x + R * 0.5, h.y + R * 0.76);
      ctx.quadraticCurveTo(h.x + R * 0.1, h.y + R * 0.95, h.x - R * 0.42, h.y + R * 0.62);
      ctx.quadraticCurveTo(h.x - R * 0.92, h.y + R * 0.36, h.x - R * 0.92, h.y - R * 0.1);
      ctx.closePath();
      ctx.strokeStyle = C(OUTLINE); ctx.lineWidth = 0.022 * S; ctx.stroke();
      const hg = ctx.createRadialGradient(
        h.x + R * 0.35, h.y - R * 0.45, R * 0.12,
        h.x, h.y, R * 1.35);
      hg.addColorStop(0, C(app.skinLight));
      hg.addColorStop(0.5, C(app.skin));
      hg.addColorStop(1, C(app.skinShadow));
      ctx.fillStyle = hg;
      ctx.fill();

      ctx.save();
      ctx.clip();
      // nariz + pómulo
      ctx.fillStyle = alpha(app.skinShadow, 0.35);
      ctx.beginPath();
      ctx.moveTo(h.x + R * 0.62, h.y - R * 0.12);
      ctx.lineTo(h.x + R * 0.98, h.y + R * 0.14);
      ctx.lineTo(h.x + R * 0.56, h.y + R * 0.2);
      ctx.closePath(); ctx.fill();
      // sombra bajo la mandíbula
      ctx.fillStyle = alpha(app.skinShadow, 0.4);
      ctx.beginPath();
      ctx.ellipse(h.x - R * 0.1, h.y + R * 0.85, R * 0.8, R * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      // oreja
      ctx.fillStyle = C(shade(app.skin, 0.05));
      ctx.beginPath();
      ctx.ellipse(h.x - R * 0.56, h.y + R * 0.04, R * 0.17, R * 0.23, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = alpha(app.skinShadow, 0.45); ctx.lineWidth = 0.006 * S;
      ctx.beginPath();
      ctx.ellipse(h.x - R * 0.58, h.y + R * 0.04, R * 0.08, R * 0.12, 0.25, 0, Math.PI * 2);
      ctx.stroke();
      if (dirt > 0.35) {
        ctx.fillStyle = alpha('#7a3c34', 0.42 * dirt);
        ctx.beginPath();
        ctx.ellipse(h.x + R * 0.42, h.y - R * 0.52, R * 0.26, R * 0.12, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // pelo encima
      ctx.fillStyle = C(app.hairC);
      if (app.hairT === 'short' || app.hairT === 'long' || app.hairT === 'ponytail' || app.hairT === 'fade') {
        ctx.beginPath();
        ctx.moveTo(h.x - R * 0.95, h.y - R * 0.05);
        ctx.quadraticCurveTo(h.x - R * 1.0, h.y - R * 1.12, h.x + R * 0.2, h.y - R * 1.08);
        ctx.quadraticCurveTo(h.x + R * 0.98, h.y - R * 1.0, h.x + R * 0.94, h.y - R * 0.42);
        ctx.quadraticCurveTo(h.x + R * 0.55, h.y - R * 0.72, h.x - R * 0.1, h.y - R * 0.6);
        ctx.quadraticCurveTo(h.x - R * 0.68, h.y - R * 0.52, h.x - R * 0.95, h.y - R * 0.05);
        ctx.closePath();
        ctx.fill();
        if (app.hairT === 'fade') {
          ctx.fillStyle = alpha(C(app.skin), 0.45);
          ctx.beginPath();
          ctx.ellipse(h.x - R * 0.55, h.y - R * 0.3, R * 0.42, R * 0.3, 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = C(app.hairC);
        }
        // mechones
        ctx.strokeStyle = alpha(C(app.hairLight), 0.5);
        ctx.lineWidth = 0.008 * S;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(h.x - R * 0.6 + i * R * 0.36, h.y - R * 0.95);
          ctx.quadraticCurveTo(
            h.x - R * 0.35 + i * R * 0.36, h.y - R * 0.7,
            h.x - R * 0.5 + i * R * 0.36, h.y - R * 0.55);
          ctx.stroke();
        }
      }
      if (app.hairT === 'mohawk') {
        for (let i = -2; i <= 2; i++) {
          ctx.fillStyle = i % 2 ? C(app.hairC) : C(app.hairLight);
          ctx.beginPath();
          ctx.moveTo(h.x + i * R * 0.26 - R * 0.14, h.y - R * 0.72);
          ctx.lineTo(h.x + i * R * 0.26, h.y - R * 1.62);
          ctx.lineTo(h.x + i * R * 0.26 + R * 0.14, h.y - R * 0.72);
          ctx.closePath();
          ctx.fill();
        }
      }

      // tocados
      const dt = app.detail;
      if (dt.scarf) {
        ctx.fillStyle = C(shade(app.accent, 0.16));
        ctx.beginPath();
        ctx.moveTo(h.x - R * 0.98, h.y - R * 0.05);
        ctx.quadraticCurveTo(h.x - R * 1.0, h.y - R * 1.2, h.x + R * 0.25, h.y - R * 1.12);
        ctx.quadraticCurveTo(h.x + R * 1.02, h.y - R * 1.0, h.x + R * 0.96, h.y - R * 0.3);
        ctx.quadraticCurveTo(h.x + R * 0.2, h.y - R * 0.62, h.x - R * 0.98, h.y - R * 0.05);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = C(OUTLINE); ctx.lineWidth = 0.01 * S; ctx.stroke();
        ctx.fillStyle = alpha('#ffffff', 0.35);
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(h.x - R * 0.6 + i * R * 0.36, h.y - R * 0.85, R * 0.07, 0, Math.PI * 2);
          ctx.fill();
        }
        // nudo
        ctx.fillStyle = C(shade(app.accent, 0.16));
        ctx.beginPath();
        ctx.ellipse(h.x - R * 1.02, h.y + R * 0.2, R * 0.24, R * 0.18, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (dt.cap) {
        ctx.fillStyle = C(deep(app.accent, 0.3));
        ctx.beginPath();
        ctx.moveTo(h.x - R * 1.0, h.y - R * 0.3);
        ctx.quadraticCurveTo(h.x - R * 1.02, h.y - R * 1.28, h.x + R * 0.3, h.y - R * 1.2);
        ctx.quadraticCurveTo(h.x + R * 1.04, h.y - R * 1.1, h.x + R * 1.0, h.y - R * 0.44);
        ctx.lineTo(h.x - R * 1.0, h.y - R * 0.3);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = C(OUTLINE); ctx.lineWidth = 0.012 * S; ctx.stroke();
        // visera
        ctx.fillStyle = C(deep(app.accent, 0.5));
        ctx.beginPath();
        ctx.moveTo(h.x + R * 0.3, h.y - R * 0.5);
        ctx.quadraticCurveTo(h.x + R * 1.7, h.y - R * 0.66, h.x + R * 1.78, h.y - R * 0.3);
        ctx.quadraticCurveTo(h.x + R * 1.2, h.y - R * 0.32, h.x + R * 0.35, h.y - R * 0.3);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = C(OUTLINE); ctx.lineWidth = 0.01 * S; ctx.stroke();
        ctx.fillStyle = alpha(C(app.accentLight), 0.9);
        ctx.beginPath();
        ctx.arc(h.x + R * 0.1, h.y - R * 0.88, R * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      if (dt.beret) {
        ctx.fillStyle = C(deep(app.accent, 0.35));
        ctx.beginPath();
        ctx.ellipse(h.x - R * 0.12, h.y - R * 0.94, R * 1.06, R * 0.42, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = C(OUTLINE); ctx.lineWidth = 0.011 * S; ctx.stroke();
        ctx.fillStyle = C(deep(app.accent, 0.55));
        ctx.beginPath();
        ctx.arc(h.x - R * 0.9, h.y - R * 0.98, R * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      if (dt.headband) {
        ctx.fillStyle = C(app.accent);
        ctx.beginPath();
        ctx.moveTo(h.x - R * 0.98, h.y - R * 0.5);
        ctx.lineTo(h.x + R * 0.96, h.y - R * 0.56);
        ctx.lineTo(h.x + R * 0.96, h.y - R * 0.3);
        ctx.lineTo(h.x - R * 0.98, h.y - R * 0.24);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = alpha('#000', 0.4); ctx.lineWidth = 0.007 * S; ctx.stroke();
        const sw = Math.sin(time * 4.2 + app.seed) * 0.024 * S;
        ctx.strokeStyle = C(app.accent); ctx.lineWidth = 0.017 * S;
        ctx.beginPath();
        ctx.moveTo(h.x - R * 0.95, h.y - R * 0.4);
        ctx.quadraticCurveTo(h.x - R * 1.6, h.y - R * 0.3 + sw,
          h.x - R * 1.9 + sw, h.y + R * 0.18);
        ctx.stroke();
      }
      if (dt.beard) {
        ctx.fillStyle = C('#d6d6d6');
        ctx.beginPath();
        ctx.moveTo(h.x - R * 0.42, h.y + R * 0.3);
        ctx.quadraticCurveTo(h.x - R * 0.2, h.y + R * 1.25, h.x + R * 0.42, h.y + R * 0.95);
        ctx.quadraticCurveTo(h.x + R * 0.86, h.y + R * 0.6, h.x + R * 0.74, h.y + R * 0.22);
        ctx.quadraticCurveTo(h.x + R * 0.2, h.y + R * 0.6, h.x - R * 0.42, h.y + R * 0.3);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = alpha('#8a8a8a', 0.6); ctx.lineWidth = 0.007 * S; ctx.stroke();
      }
      if (dt.earring) {
        ctx.fillStyle = C('#ffd54a');
        ctx.beginPath();
        ctx.arc(h.x - R * 0.52, h.y + R * 0.32, R * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }

      // ojo / gafas / ceja / boca
      const eyeX = h.x + R * 0.42, eyeY = h.y - R * 0.16;
      if (dt.shades) {
        ctx.fillStyle = C('#101014');
        ctx.beginPath();
        ctx.moveTo(h.x - R * 0.1, h.y - R * 0.34);
        ctx.lineTo(h.x + R * 0.98, h.y - R * 0.4);
        ctx.lineTo(h.x + R * 0.94, h.y + R * 0.06);
        ctx.lineTo(h.x - R * 0.1, h.y + R * 0.02);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = alpha('#ffffff', 0.3);
        ctx.beginPath();
        ctx.moveTo(h.x + R * 0.2, h.y - R * 0.32);
        ctx.lineTo(h.x + R * 0.62, h.y - R * 0.36);
        ctx.lineTo(h.x + R * 0.3, h.y - R * 0.02);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = C('#101014'); ctx.lineWidth = 0.008 * S;
        ctx.beginPath();
        ctx.moveTo(h.x - R * 0.1, h.y - R * 0.3);
        ctx.lineTo(h.x - R * 0.62, h.y - R * 0.22);
        ctx.stroke();
      } else {
        const open = 1 - clamp(pose.eyeClose || 0, 0, 1);
        // cuenca
        ctx.fillStyle = alpha(app.skinShadow, 0.5);
        ctx.beginPath();
        ctx.ellipse(eyeX, eyeY, R * 0.3, R * 0.22 * (0.6 + open * 0.4), -0.1, 0, Math.PI * 2);
        ctx.fill();
        // esclerótica
        ctx.fillStyle = C('#f6f2ea');
        ctx.beginPath();
        ctx.ellipse(eyeX, eyeY, R * 0.26, R * 0.17 * open + R * 0.02, -0.1, 0, Math.PI * 2);
        ctx.fill();
        // iris + pupila
        ctx.fillStyle = C(app.eye);
        ctx.beginPath();
        ctx.arc(eyeX + R * 0.1, eyeY, R * 0.12 * Math.max(open, 0.35), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C('#100c14');
        ctx.beginPath();
        ctx.arc(eyeX + R * 0.12, eyeY, R * 0.06 * Math.max(open, 0.35), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = alpha('#ffffff', 0.85);
        ctx.beginPath();
        ctx.arc(eyeX + R * 0.02, eyeY - R * 0.07, R * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
      // ceja (la inclinación depende del gesto)
      const brow = pose.brow || 0;
      ctx.strokeStyle = C(deep(app.hairC, 0.2));
      ctx.lineWidth = 0.016 * S;
      ctx.beginPath();
      ctx.moveTo(h.x + R * 0.14, h.y - R * (0.42 - brow * 0.1));
      ctx.lineTo(h.x + R * 0.78, h.y - R * (0.3 + brow * 0.16));
      ctx.stroke();
      // boca
      const mo = clamp(pose.mouth == null ? 0.12 : pose.mouth, 0, 1);
      ctx.strokeStyle = C(deep(app.skin, 0.72));
      ctx.lineWidth = 0.011 * S;
      if (mo < 0.25) {
        ctx.beginPath();
        ctx.moveTo(h.x + R * 0.42, h.y + R * 0.44);
        ctx.lineTo(h.x + R * 0.76, h.y + R * 0.4);
        ctx.stroke();
      } else {
        ctx.fillStyle = C('#5c2020');
        ctx.beginPath();
        ctx.ellipse(h.x + R * 0.58, h.y + R * 0.44, R * 0.2, R * 0.1 + R * 0.16 * mo, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C('#f2ece0');
        ctx.fillRect(h.x + R * 0.42, h.y + R * (0.36 - mo * 0.06), R * 0.32, R * 0.06);
      }
      // sudor cuando queda poca vida
      if (o.lowHp) {
        const k = (time * 1.7 + app.seed * 0.3) % 1;
        ctx.fillStyle = alpha('#bfe9ff', 0.85 * (1 - k));
        ctx.beginPath();
        ctx.ellipse(h.x + R * 0.5, h.y - R * 0.78 + k * R * 1.6, R * 0.07, R * 0.11, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* ---- accesorios en manos ---- */
    function backHandProps() {
      const hb = sk.handB;
      if (app.detail.chain) {
        for (let i = 1; i <= 6; i++) {
          const sw = Math.sin(time * 3.2 + i * 0.8) * 0.012 * S * i * 0.35;
          const p = { x: hb.x - 0.008 * S + sw, y: hb.y + i * 0.033 * S };
          ctx.strokeStyle = C('#6e6e7a'); ctx.lineWidth = 0.008 * S;
          ctx.beginPath(); ctx.arc(p.x, p.y, 0.014 * S, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = C('#c8ccd8');
          ctx.beginPath(); ctx.arc(p.x, p.y, 0.011 * S, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (app.detail.cane) {
        const len = Math.min(Math.max(0, -hb.y), 0.55 * S);
        const tip = { x: hb.x + 0.035 * S, y: hb.y + len };
        ctx.fillStyle = C(OUTLINE);
        segOutline(ctx, hb, tip, 0.022 * S + OL, 0.019 * S + OL);
        limbSeg(ctx, hb, tip, 0.022 * S, 0.019 * S, C('#8a5a2a'), 0.3, 0.4);
        ctx.strokeStyle = C('#5e3a18'); ctx.lineWidth = 0.014 * S;
        ctx.beginPath();
        ctx.arc(hb.x - 0.012 * S, hb.y - 0.014 * S, 0.026 * S, Math.PI * 0.1, Math.PI * 1.1);
        ctx.stroke();
      }
      if (app.detail.wrench) {
        const tip = { x: hb.x + 0.115 * S, y: hb.y - 0.07 * S };
        ctx.fillStyle = C(OUTLINE);
        segOutline(ctx, hb, tip, 0.024 * S + OL, 0.022 * S + OL);
        limbSeg(ctx, hb, tip, 0.024 * S, 0.022 * S, C('#a7aeb8'), 0.35, 0.4);
        ctx.fillStyle = C('#8d949e');
        ctx.beginPath(); ctx.arc(tip.x, tip.y, 0.028 * S, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C(OUTLINE);
        ctx.beginPath(); ctx.arc(tip.x + 0.008 * S, tip.y - 0.008 * S, 0.012 * S, 0, Math.PI * 2); ctx.fill();
      }
    }
    function frontHandProps() {
      const hf = sk.handF;
      if (app.detail.spray) {
        ctx.fillStyle = C(OUTLINE);
        ctx.fillRect(hf.x - 0.032 * S, hf.y - 0.108 * S, 0.064 * S, 0.112 * S);
        const gd = ctx.createLinearGradient(hf.x - 0.026 * S, 0, hf.x + 0.026 * S, 0);
        gd.addColorStop(0, C('#f0f0f0'));
        gd.addColorStop(0.6, C('#c2c2c8'));
        gd.addColorStop(1, C('#8e8e96'));
        ctx.fillStyle = gd;
        ctx.fillRect(hf.x - 0.026 * S, hf.y - 0.1 * S, 0.052 * S, 0.098 * S);
        ctx.fillStyle = C(app.accent);
        ctx.fillRect(hf.x - 0.026 * S, hf.y - 0.062 * S, 0.052 * S, 0.024 * S);
        ctx.fillStyle = C(app.accentDark);
        ctx.fillRect(hf.x - 0.019 * S, hf.y - 0.126 * S, 0.038 * S, 0.028 * S);
      }
    }

    /* ---- orden de pintado: atrás -> delante ---- */
    drawArm(sk.shB, sk.elbB, sk.handB, false);
    backHandProps();
    drawLeg(sk.hipB, sk.kneeB, sk.footB, false);
    drawTorso();
    drawLeg(sk.hipF, sk.kneeF, sk.footF, true);
    drawHead();
    drawArm(sk.shF, sk.elbF, sk.handF, true);
    frontHandProps();

    ctx.restore();

    // Puntos clave en coordenadas de mundo (para FX del renderer)
    const worldY = o.groundY - (pose.hop || 0) * S;
    const wp = (p) => ({ x: o.x + facing * p.x, y: worldY + p.y });
    return {
      head: wp(sk.head), chest: wp({ x: lerp(sk.hip.x, sk.neck.x, 0.65), y: lerp(sk.hip.y, sk.neck.y, 0.65) }),
      handF: wp(sk.handF), footF: wp(sk.footF), hip: wp(sk.hip),
      headR: sk.headR
    };
  }

  return {
    buildAppearance, drawFighter, emptyPose,
    mix, shade, alpha, deep, mulberry32, clamp, lerp, unit,
    OUTLINE
  };
})();

window.FighterArt = FighterArt;


/* ============================================
   PORTRAITS
   Retratos procedurales cacheados como data URL,
   para sustituir los sprites placeholder.
   ============================================ */
const Portraits = (() => {
  const cache = new Map();

  function stance(app, t) {
    const p = FighterArt.emptyPose();
    p.crouch = 0.24;
    p.torso = 0.12;
    p.armF = [0.62, 2.3];
    p.armB = [0.34, 2.0];
    p.legF = [0.34, 0.06];
    p.legB = [-0.34, -0.52];
    p.brow = 0.6;
    p.mouth = 0.1;
    return p;
  }
  function victoryPose() {
    const p = FighterArt.emptyPose();
    p.crouch = 0.18;
    p.armB = [Math.PI - 0.2, Math.PI - 0.05];
    p.armF = [0.4, 1.05];
    p.torso = 0.02;
    p.mouth = 0.55;
    p.brow = 0.3;
    return p;
  }

  function paint(ctx, W, H, ch, opts) {
    const app = FighterArt.buildAppearance(ch);
    const framing = opts.framing || 'full';
    const acc = ch.accent;

    // fondo: foco + suelo + destellos
    const bg = ctx.createRadialGradient(W * 0.5, H * 0.36, W * 0.05, W * 0.5, H * 0.6, W * 0.78);
    bg.addColorStop(0, FighterArt.mix(acc, '#0b1220', 0.55));
    bg.addColorStop(0.55, '#131c2b');
    bg.addColorStop(1, '#070a11');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // rayos traseros
    ctx.save();
    ctx.translate(W * 0.5, H * 0.42);
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.fillStyle = i % 2 ? acc : '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W * 0.9, -H * 0.09);
      ctx.lineTo(W * 0.9, H * 0.09);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // suelo
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, H * 0.88, W, H * 0.12);
    ctx.fillStyle = FighterArt.alpha(acc, 0.25);
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H * 0.9, W * 0.34, H * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();

    let S, groundY;
    if (framing === 'bust') {
      S = H * 1.55;
      groundY = H * 0.46 + S * 0.86;
    } else {
      S = H * 0.8;
      groundY = H * 0.9;
    }

    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    const pose = opts.pose === 'victory' ? victoryPose() : stance(app);
    // sombra de contacto
    if (framing !== 'bust') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(W * 0.5, groundY + 2, S * 0.2, S * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    FighterArt.drawFighter(ctx, {
      app, pose, x: W * 0.5, groundY, S,
      facing: 1, time: 0.6, dirt: 0, lowHp: false
    });
    ctx.restore();

    // viñeta
    const vg = ctx.createRadialGradient(W * 0.5, H * 0.5, W * 0.3, W * 0.5, H * 0.5, W * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    // marco
    ctx.strokeStyle = FighterArt.alpha(acc, 0.85);
    ctx.lineWidth = Math.max(2, W * 0.016);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
  }

  // Devuelve un data URL PNG (cacheado) con el retrato del personaje
  function url(ch, opts = {}) {
    const w = opts.w || 192, h = opts.h || 192;
    const framing = opts.framing || 'full';
    const pose = opts.pose || 'stance';
    const key = ch.id + ':' + w + 'x' + h + ':' + framing + ':' + pose;
    if (cache.has(key)) return cache.get(key);
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    try {
      paint(ctx, w, h, ch, { framing, pose });
    } catch (e) {
      console.warn('Portrait paint failed', e);
    }
    const data = cv.toDataURL('image/png');
    cache.set(key, data);
    return data;
  }

  // Precalcula los retratos usados por los menús
  function warm() {
    if (!window.CHARACTERS) return;
    CHARACTERS.forEach((c) => {
      url(c, { w: 168, h: 168, framing: 'bust' });
    });
  }

  return { url, warm, paint };
})();

window.Portraits = Portraits;
