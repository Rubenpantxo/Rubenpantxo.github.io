/* ============================================
   FIGHTER RENDERER
   Luchadores procedurales articulados en canvas
   + escenario de barrio estilo PS1 (colores planos,
   dithering sutil, sin suavizado).
   Lo consume scenes/battle.js a través de:
     init(canvas, charP1, charP2)
     frame(p1, p2, { paused })
     hit(id, type, blocked)  -> FX de impacto
     shake(mag)              -> screen shake
     getScreenPos(id)        -> coords de página (para hit-effect DOM / Particles)
     destroy()
   ============================================ */

const FighterRenderer = (() => {

  // ---- Estado del módulo ----
  let canvas = null, ctx = null;
  let W = 0, H = 0, dpr = 1;
  let bg = null;            // canvas offscreen con el escenario pintado
  let groundY = 0;          // línea de suelo (px css)
  let S = 0;                // altura aproximada del luchador (px css)
  let animTime = 0;         // reloj de animación (s), se congela en pausa
  let lastTs = 0;
  let shakeMag = 0;
  let fx = [];              // partículas internas (chispas, polvo, anillos, estrellas)
  let rts = null;           // runtimes por id: { p1: {...}, p2: {...} }
  let onResize = null;

  const OUTLINE = '#150c20';

  // ---- Utilidades ----
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function easeOut(t) { return 1 - (1 - t) * (1 - t); }
  function easeIn(t) { return t * t; }

  // PRNG determinista (seed = id del personaje)
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

  function hexToRgb(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // Mezcla dos colores hex (t = 0..1)
  function mix(c1, c2, t) {
    const a = hexToRgb(c1), b = hexToRgb(c2);
    return 'rgb(' + Math.round(lerp(a[0], b[0], t)) + ',' +
      Math.round(lerp(a[1], b[1], t)) + ',' + Math.round(lerp(a[2], b[2], t)) + ')';
  }
  // Aclara (amt>0) u oscurece (amt<0) un hex
  function shade(hex, amt) {
    return mix(hex, amt > 0 ? '#ffffff' : '#000000', Math.abs(amt));
  }

  /* ============================================
     APARIENCIA PROCEDURAL POR PERSONAJE
     seed = id -> tono de piel, peinado, ropa, pantalón...
     style/nombre -> accesorio característico
     ============================================ */
  function buildAppearance(ch) {
    const rnd = mulberry32(ch.id * 9301 + 49297);
    const skins = ['#f2c79a', '#e3b07e', '#c98c5a', '#a96c3f', '#7d4e2a', '#5c3a1e'];
    const hairCs = ['#181818', '#33231a', '#5b3a1c', '#7a5230', '#23282e', '#3e2723'];
    const pantsCs = ['#2b3a52', '#34343c', '#4a3a2a', '#23282e', '#41304b', '#2e4434'];
    const shoeCs = ['#e8e8e8', '#22252a', '#b03030', '#caa84a'];
    const hairTs = ['short', 'afro', 'ponytail', 'mohawk', 'long', 'short'];
    const clothes = ['shirt', 'hoodie', 'vest'];

    const app = {
      accent: ch.accent,
      skin: pick(rnd, skins),
      hairC: pick(rnd, hairCs),
      pants: pick(rnd, pantsCs),
      shoe: pick(rnd, shoeCs),
      hairT: pick(rnd, hairTs),
      clothing: pick(rnd, clothes),
      shirtCol: '#e9e4d8',
      detail: {
        gloves: false, chain: false, spray: false, cap: false, cane: false,
        headband: false, beret: false, scarf: false, wrench: false,
        goldChain: false, beard: false
      }
    };

    const st = (ch.style || '').toUpperCase();
    const nm = (ch.name || '').toUpperCase();
    const d = app.detail;

    // Detalle característico según estilo de lucha / nombre
    if (st.includes('BOX')) { d.gloves = true; app.clothing = 'vest'; }                       // guantes de boxeo
    if (st.includes('TAG') || st.includes('RANGE')) d.chain = true;                           // cadena en la mano
    if (st.includes('RHYTHM') || nm.includes('RAPERO')) {                                     // gorra + cadena de oro
      d.cap = true; d.goldChain = true; app.clothing = 'hoodie';
    }
    if (st.includes('VETERAN') || nm.includes('VIEJO')) {                                     // bastón, boina y barba
      d.cane = true; d.beret = true; d.beard = true;
      app.hairC = '#cfcfcf'; app.hairT = 'short'; app.clothing = 'vest';
    }
    if (st.includes('KICK')) { d.headband = true; app.clothing = 'shirt'; }                   // cinta de kickboxer
    if (st.includes('TECH') || nm.includes('MECANICO') || nm.includes('MECÁNICO')) {          // llave inglesa + gorra
      d.wrench = true; d.cap = true; app.clothing = 'shirt';
    }
    if (nm.includes('GRAFFITERA')) { d.spray = true; app.hairT = 'ponytail'; app.clothing = 'hoodie'; } // spray
    if (st.includes('GRAB')) { d.scarf = true; }                                              // pañuelo de matriarca
    if (nm.includes('CABALLERO')) { app.hairT = 'short'; app.hairC = '#101014'; app.clothing = 'hoodie'; }
    // Toque de coleta para las luchadoras sin pañuelo
    if ((nm.includes('SULIMA') || nm.includes('REINA') || nm.includes('PATAI')) && !d.scarf) {
      app.hairT = 'ponytail';
    }
    return app;
  }

  /* ============================================
     INIT / RESIZE / DESTROY
     ============================================ */
  function makeRuntime(ch, slot) {
    return {
      ch,
      app: buildAppearance(ch),
      px: 0, prevPx: null,
      facing: slot === 1 ? 1 : -1,
      state: 'idle', stateStart: 0,
      attackType: 'punch',
      walkPhase: 0, moveTimer: 0,
      phase: (ch.id * 0.77) % (Math.PI * 2),   // desfase de respiración
      koDust: false,
      celebrateStart: -1
    };
  }

  function init(canvasEl, chP1, chP2) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    rts = { p1: makeRuntime(chP1, 1), p2: makeRuntime(chP2, 2) };
    fx = [];
    shakeMag = 0;
    animTime = 0;
    lastTs = 0;
    onResize = () => resize();
    window.addEventListener('resize', onResize);
    resize();
  }

  function resize() {
    if (!canvas || !canvas.parentElement) return;
    const r = canvas.parentElement.getBoundingClientRect(); // la .arena
    W = Math.max(1, Math.floor(r.width));
    H = Math.max(1, Math.floor(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    groundY = H - Math.max(H * 0.13, 24);
    // Luchadores grandes: ~52% de la altura de la arena
    S = clamp(H * 0.52, 100, 380);
    paintBackground();
  }

  function destroy() {
    if (onResize) window.removeEventListener('resize', onResize);
    onResize = null;
    canvas = null; ctx = null; bg = null;
    fx = []; rts = null;
  }

  /* ============================================
     ESCENARIO DE BARRIO (pintado una vez en offscreen)
     ============================================ */
  function paintBackground() {
    bg = document.createElement('canvas');
    bg.width = W * dpr;
    bg.height = H * dpr;
    const b = bg.getContext('2d');
    b.setTransform(dpr, 0, 0, dpr, 0, 0);
    b.imageSmoothingEnabled = false;
    const rng = mulberry32(20240615);
    const hz = groundY;

    // --- Cielo atardecer en bandas planas (look PS1) ---
    const sky = ['#1c1038', '#341a52', '#5c2660', '#8c3260', '#bf4b54', '#e07347', '#f09a4a', '#f8c060'];
    const bandH = hz / sky.length;
    for (let i = 0; i < sky.length; i++) {
      b.fillStyle = sky[i];
      b.fillRect(0, Math.floor(i * bandH), W, Math.ceil(bandH) + 1);
    }
    // Sol bajo con cortes retro
    const sunX = W * 0.74, sunY = hz * 0.62, sunR = Math.max(18, H * 0.085);
    b.fillStyle = '#ffd98a';
    b.beginPath(); b.arc(sunX, sunY, sunR, 0, Math.PI * 2); b.fill();
    b.fillStyle = sky[Math.min(sky.length - 1, Math.floor(sunY / bandH))];
    b.fillRect(sunX - sunR, sunY + sunR * 0.25, sunR * 2, 3);
    b.fillRect(sunX - sunR, sunY + sunR * 0.55, sunR * 2, 4);

    // --- Edificios lejanos (silueta clara) ---
    b.fillStyle = '#4a2358';
    let x = -10;
    while (x < W + 20) {
      const bw = 36 + rng() * 70;
      const bh = hz * (0.22 + rng() * 0.26);
      b.fillRect(x, hz - bh, bw, bh);
      if (rng() < 0.6) b.fillRect(x + bw * 0.3, hz - bh - 10 - rng() * 14, 2, 14 + rng() * 12); // antena
      if (rng() < 0.35) { // depósito de agua
        b.fillRect(x + bw * 0.6, hz - bh - 8, 10, 8);
      }
      // ventanas encendidas
      b.fillStyle = 'rgba(255,210,120,0.85)';
      const cols = Math.floor(bw / 12), rows = Math.floor(bh / 16);
      for (let c = 0; c < cols; c++) for (let r2 = 0; r2 < rows; r2++) {
        if (rng() < 0.18) b.fillRect(x + 4 + c * 12, hz - bh + 5 + r2 * 16, 4, 5);
      }
      b.fillStyle = '#4a2358';
      x += bw + 4 + rng() * 18;
    }

    // --- Edificios cercanos (bloques de barrio, más oscuros) ---
    x = -20;
    while (x < W + 30) {
      const bw = 70 + rng() * 110;
      const bh = hz * (0.34 + rng() * 0.3);
      b.fillStyle = '#2b1540';
      b.fillRect(x, hz - bh, bw, bh);
      b.fillStyle = '#1f0e30';
      b.fillRect(x, hz - bh, bw, 5); // cornisa
      // ventanas con persianas
      const cols = Math.floor((bw - 14) / 22), rows = Math.floor((bh - 16) / 26);
      for (let c = 0; c < cols; c++) for (let r2 = 0; r2 < rows; r2++) {
        const wx = x + 9 + c * 22, wy = hz - bh + 12 + r2 * 26;
        const lit = rng() < 0.22;
        b.fillStyle = lit ? '#ffcf6e' : '#16092a';
        b.fillRect(wx, wy, 12, 14);
        if (rng() < 0.5) { // persiana medio bajada
          b.fillStyle = '#3c2a50';
          const ph = 3 + Math.floor(rng() * 9);
          b.fillRect(wx, wy, 12, ph);
          b.fillStyle = 'rgba(0,0,0,0.3)';
          for (let l = 2; l < ph; l += 3) b.fillRect(wx, wy + l, 12, 1);
        }
      }
      if (rng() < 0.5) { b.fillStyle = '#1f0e30'; b.fillRect(x + bw * 0.4, hz - bh - 14, 3, 14); } // antena
      x += bw + 8 + rng() * 26;
    }

    // --- Muro con graffiti (detrás de los luchadores) ---
    const wallH = Math.max(34, H * 0.15);
    const wallY = hz - wallH;
    b.fillStyle = '#5d4a42';
    b.fillRect(0, wallY, W, wallH);
    b.fillStyle = '#6e5a50';
    b.fillRect(0, wallY, W, 4); // remate superior
    // juntas de ladrillo
    b.strokeStyle = 'rgba(0,0,0,0.18)';
    b.lineWidth = 1;
    for (let yy = wallY + 10; yy < hz; yy += 9) {
      b.beginPath(); b.moveTo(0, yy); b.lineTo(W, yy); b.stroke();
    }
    for (let xx = (rng() * 20) | 0; xx < W; xx += 26) {
      const off = ((xx / 26) | 0) % 2 ? 4 : 9;
      b.beginPath(); b.moveTo(xx, wallY + off); b.lineTo(xx, hz); b.stroke();
    }
    // graffiti: tag principal con los acentos de los dos personajes
    const acc1 = (rts && rts.p1) ? rts.p1.app.accent : '#ffe600';
    const acc2 = (rts && rts.p2) ? rts.p2.app.accent : '#ff00ff';
    b.save();
    b.translate(W * 0.5, wallY + wallH * 0.55);
    b.rotate(-0.05);
    const fs = Math.max(16, Math.min(30, wallH * 0.5));
    b.font = '900 ' + fs + 'px monospace';
    b.textAlign = 'center';
    b.fillStyle = shade(acc2, -0.2);
    b.fillText('EL BARRIO', 3, 3);
    b.fillStyle = acc1;
    b.fillText('EL BARRIO', 0, 0);
    b.restore();
    // goteos y firmas
    b.fillStyle = acc1;
    for (let i = 0; i < 5; i++) {
      b.fillRect(W * 0.5 - 60 + i * 28 + rng() * 8, wallY + wallH * 0.6, 2, 5 + rng() * 9);
    }
    b.strokeStyle = acc2;
    b.lineWidth = 3;
    b.beginPath();
    b.moveTo(W * 0.12, wallY + wallH * 0.5);
    b.quadraticCurveTo(W * 0.16, wallY + wallH * 0.2, W * 0.2, wallY + wallH * 0.55);
    b.quadraticCurveTo(W * 0.23, wallY + wallH * 0.8, W * 0.26, wallY + wallH * 0.4);
    b.stroke();
    b.strokeStyle = '#e8e8e8';
    b.lineWidth = 2;
    b.beginPath();
    b.arc(W * 0.82, wallY + wallH * 0.5, wallH * 0.22, 0, Math.PI * 2);
    b.stroke();

    // --- Farola ---
    const fpx = W * 0.1;
    const fph = H * 0.4;
    b.fillStyle = '#15101e';
    b.fillRect(fpx - 3, hz - fph, 6, fph);
    b.fillRect(fpx - 3, hz - fph, 30, 5);
    b.fillStyle = '#ffe9a8';
    b.fillRect(fpx + 20, hz - fph + 5, 12, 6);
    // cono de luz sutil
    b.fillStyle = 'rgba(255,230,160,0.08)';
    b.beginPath();
    b.moveTo(fpx + 26, hz - fph + 10);
    b.lineTo(fpx - 14, hz);
    b.lineTo(fpx + 66, hz);
    b.closePath();
    b.fill();

    // --- Suelo: acera + asfalto con perspectiva ---
    const floorH = H - hz;
    b.fillStyle = '#3a3742';
    b.fillRect(0, hz, W, floorH);
    // acera (banda superior con bordillo)
    const sideH = floorH * 0.34;
    b.fillStyle = '#56525e';
    b.fillRect(0, hz, W, sideH);
    b.fillStyle = '#6e6a78';
    b.fillRect(0, hz + sideH - 3, W, 3); // bordillo
    // juntas de losas convergiendo apenas
    b.strokeStyle = 'rgba(0,0,0,0.22)';
    b.lineWidth = 1;
    for (let i = 0; i <= 14; i++) {
      const tx = (i / 14) * W;
      b.beginPath();
      b.moveTo(tx, hz);
      b.lineTo(lerp(tx, W / 2, -0.12), hz + sideH);
      b.stroke();
    }
    // líneas de perspectiva en el asfalto
    b.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i <= 10; i++) {
      const tx = (i / 10) * W;
      b.beginPath();
      b.moveTo(W / 2 + (tx - W / 2) * 0.25, hz + sideH);
      b.lineTo(tx, H);
      b.stroke();
    }
    // pintura vial amarilla desgastada
    b.fillStyle = 'rgba(230,190,60,0.5)';
    for (let i = 0; i < 6; i++) {
      const ww = 26 + rng() * 20;
      b.fillRect(W * 0.08 + i * (W * 0.16), H - floorH * 0.28, ww, 5);
    }
    // grietas
    b.strokeStyle = 'rgba(0,0,0,0.35)';
    b.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      let cx = rng() * W, cy = hz + sideH + rng() * (floorH - sideH);
      b.beginPath(); b.moveTo(cx, cy);
      for (let k2 = 0; k2 < 4; k2++) {
        cx += (rng() - 0.5) * 40; cy += rng() * 12;
        b.lineTo(cx, cy);
      }
      b.stroke();
    }
    // tapa de alcantarilla
    b.fillStyle = '#2c2a33';
    b.beginPath();
    b.ellipse(W * 0.68, hz + floorH * 0.62, 26, 8, 0, 0, Math.PI * 2);
    b.fill();
    b.strokeStyle = 'rgba(255,255,255,0.08)';
    b.stroke();

    // --- Dithering sutil (puntos dispersos, ambiente PS1) ---
    b.fillStyle = 'rgba(0,0,0,0.10)';
    const dots = Math.floor((W * H) / 900);
    for (let i = 0; i < dots; i++) {
      const dx2 = rng() * W, dy2 = hz - 30 + rng() * (H - hz + 30);
      if (((dx2 | 0) + (dy2 | 0)) % 2 === 0) b.fillRect(dx2 | 0, dy2 | 0, 1, 1);
    }
    // oscurecer la base
    b.fillStyle = 'rgba(0,0,0,0.18)';
    b.fillRect(0, H - floorH * 0.25, W, floorH * 0.25);
  }

  /* ============================================
     POSES / ANIMACIONES
     Ángulos: 0 = hacia abajo, positivo = hacia el rival.
     crouch: flexión de piernas (0..1). hipDX/hop/headDX/headDY en unidades S.
     ============================================ */
  function basePose(rt, t) {
    const b = Math.sin(t * 2.3 + rt.phase); // respiración
    return {
      crouch: 0.22 + b * 0.025,
      hipDX: 0,
      torso: 0.10 + b * 0.012,
      headDX: 0, headDY: 0,
      armF: [0.55 + b * 0.05, 2.35 + b * 0.06],  // guardia: puños arriba
      armB: [0.30 + b * 0.04, 2.05],
      legF: [0.30, 0.08],
      legB: [-0.32, -0.50],
      rot: 0, hop: 0, flash: 0
    };
  }

  function poseWalk(pose, rt) {
    const ph = rt.walkPhase;
    const s1 = Math.sin(ph), s2 = Math.sin(ph + Math.PI);
    pose.legF = [s1 * 0.5 + 0.05, s1 * 0.5 + 0.05 - (0.16 + 0.34 * (1 - Math.abs(s1)))];
    pose.legB = [s2 * 0.5 - 0.05, s2 * 0.5 - 0.05 - (0.16 + 0.34 * (1 - Math.abs(s2)))];
    pose.crouch = 0.25 + Math.abs(Math.cos(ph)) * 0.06;
    pose.torso += 0.04;
    pose.armF[0] += s2 * 0.08; // contrabalanceo leve de brazos
    pose.armB[0] += s1 * 0.08;
  }

  function posePunch(pose, ts) {
    const p = clamp(ts / 0.32, 0, 1);
    if (p < 0.28) {                 // anticipación: armar el puño atrás
      const q = easeOut(p / 0.28);
      pose.armF = [lerp(0.55, -0.35, q), lerp(2.35, 0.45, q)];
      pose.torso = lerp(pose.torso, 0.02, q);
      pose.crouch += 0.08 * q;
      pose.hipDX = -0.02 * q;
    } else if (p < 0.55) {          // extensión + lunge del cuerpo
      const q = easeOut(seg(p, 0.28, 0.55));
      pose.armF = [lerp(-0.35, 1.55, q), lerp(0.45, 1.52, q)];
      pose.torso = lerp(0.02, 0.30, q);
      pose.hipDX = lerp(-0.02, 0.10, q);
      pose.armB = [lerp(0.30, -0.25, q), lerp(2.05, 1.20, q)];
      pose.crouch = 0.30;
      pose.legF = [0.45, 0.25];
      pose.legB = [-0.55, -0.85];
    } else {                        // recuperación
      const q = easeOut(seg(p, 0.55, 1));
      pose.armF = [lerp(1.55, 0.55, q), lerp(1.52, 2.35, q)];
      pose.torso = lerp(0.30, 0.10, q);
      pose.hipDX = 0.10 * (1 - q);
      pose.armB = [lerp(-0.25, 0.30, q), lerp(1.20, 2.05, q)];
      pose.legF = [lerp(0.45, 0.30, q), lerp(0.25, 0.08, q)];
      pose.legB = [lerp(-0.55, -0.32, q), lerp(-0.85, -0.50, q)];
    }
  }

  function poseKick(pose, ts) {
    const p = clamp(ts / 0.34, 0, 1);
    pose.legB = [-0.16, -0.38];     // pierna de apoyo plantada
    if (p < 0.25) {                 // anticipación: recoger rodilla
      const q = easeOut(p / 0.25);
      pose.legF = [lerp(0.30, 1.00, q), lerp(0.08, 0.00, q)];
      pose.torso = lerp(pose.torso, -0.06, q);
      pose.crouch += 0.10 * q;
      pose.armF = [lerp(0.55, -0.20, q), lerp(2.35, 1.20, q)];
    } else if (p < 0.55) {          // extensión de la patada
      const q = easeOut(seg(p, 0.25, 0.55));
      pose.legF = [lerp(1.00, 1.52, q), lerp(0.00, 1.46, q)];
      pose.torso = lerp(-0.06, -0.32, q);
      pose.hipDX = 0.06 * q;
      pose.armF = [-0.20, 1.20];
      pose.armB = [lerp(0.30, 0.85, q), lerp(2.05, 1.50, q)];
      pose.crouch = 0.32;
    } else {                        // recuperación
      const q = easeOut(seg(p, 0.55, 1));
      pose.legF = [lerp(1.52, 0.30, q), lerp(1.46, 0.08, q)];
      pose.torso = lerp(-0.32, 0.10, q);
      pose.hipDX = 0.06 * (1 - q);
      pose.armF = [lerp(-0.20, 0.55, q), lerp(1.20, 2.35, q)];
      pose.armB = [lerp(0.85, 0.30, q), lerp(1.50, 2.05, q)];
      pose.crouch = lerp(0.32, 0.22, q);
    }
  }

  function poseBlock(pose) {
    // brazos cruzados delante de la cara, postura cerrada
    pose.crouch = 0.42;
    pose.torso = 0.18;
    pose.armF = [1.05, 2.75];
    pose.armB = [1.30, 2.50];
    pose.legF = [0.22, 0.02];
    pose.legB = [-0.30, -0.52];
    pose.headDX = -0.02;
    pose.headDY = 0.02;
  }

  function poseHurt(pose, ts) {
    const p = clamp(ts / 0.35, 0, 1);
    const k = Math.sin(p * Math.PI);
    pose.torso = 0.10 - 0.55 * k;          // retroceso del torso
    pose.crouch = 0.26 + 0.12 * k;
    pose.hipDX = -0.05 * k;
    pose.headDX = -0.06 * k;
    pose.armF = [0.55 + 0.5 * k, 2.35 - 1.2 * k];
    pose.armB = [0.30 - 0.6 * k, 2.05 - 1.0 * k];
    pose.flash = Math.max(0, 1 - p * 1.8); // flash blanco -> rojo
  }

  function poseKO(pose, ts) {
    const p = clamp(ts / 0.95, 0, 1);
    let r;
    if (p < 0.62) r = easeIn(p / 0.62);
    else r = 1 - 0.12 * Math.sin(seg(p, 0.62, 1) * Math.PI); // rebote al tocar suelo
    pose.rot = -(Math.PI / 2 - 0.06) * r;  // cae hacia atrás
    pose.crouch = lerp(0.22, 0.12, r);
    pose.torso = 0.05;
    pose.armF = [lerp(0.55, 1.15, r), lerp(2.35, 1.30, r)];   // brazos laxos
    pose.armB = [lerp(0.30, -0.55, r), lerp(2.05, -0.30, r)];
    pose.legF = [lerp(0.30, 0.45, r), lerp(0.08, 0.15, r)];
    pose.legB = [-0.25, -0.55];
    pose.headDX = 0.03 * r;                // cabeza vencida
    pose.flash = Math.max(0, 1 - p * 2.5);
  }

  function poseCelebrate(pose, tc) {
    // brazo en alto bombeando + saltitos
    const pump = Math.sin(tc * 7) * 0.18;
    pose.armB = [Math.PI - 0.18 + pump, Math.PI - 0.05 + pump];
    pose.armF = [0.35, 1.00];
    pose.torso = 0.0;
    pose.crouch = 0.18;
    pose.hop = Math.abs(Math.sin(tc * 5)) * 0.045;
    pose.headDY = -0.01;
  }

  function computePose(rt) {
    const t = animTime;
    const ts = t - rt.stateStart;
    const pose = basePose(rt, t);

    if (rt.state === 'idle' && rt.moveTimer > 0) poseWalk(pose, rt);

    switch (rt.state) {
      case 'attacking':
        if (rt.attackType === 'kick') poseKick(pose, ts);
        else posePunch(pose, ts);
        break;
      case 'blocking': poseBlock(pose); break;
      case 'hurt': poseHurt(pose, ts); break;
      case 'ko': poseKO(pose, ts); break;
    }

    // Celebración de ronda (pose de victoria) si no está KO
    if (rt.celebrateStart >= 0 && rt.state !== 'ko' && rt.state !== 'hurt') {
      poseCelebrate(pose, t - rt.celebrateStart);
    }
    return pose;
  }

  /* ============================================
     DIBUJO DEL LUCHADOR ARTICULADO
     ============================================ */
  function drawShadow(rt) {
    const ko = rt.state === 'ko';
    const wSh = S * 0.20 * (ko ? 2.1 : 1);
    const cx = rt.px - (ko ? rt.facing * S * 0.32 : 0);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, groundY + 4, wSh, S * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFighter(rt) {
    const pose = computePose(rt);
    const a = rt.app;

    // Proporciones (fracciones de S)
    const legU = 0.255 * S, legL = 0.235 * S;
    const torsoL = 0.295 * S, headR = 0.10 * S;
    const armU = 0.155 * S, armL = 0.145 * S;
    const lwLeg = 0.075 * S, lwArm = 0.058 * S, lwTorso = 0.17 * S;

    // Esqueleto en espacio local: x+ = hacia el rival, y+ = abajo, suelo en y=0
    const hipH = (legU + legL) * (1 - 0.05 - pose.crouch * 0.16);
    const hip = { x: pose.hipDX * S, y: -hipH };
    const neck = {
      x: hip.x + Math.sin(pose.torso) * torsoL,
      y: hip.y - Math.cos(pose.torso) * torsoL
    };
    const head = {
      x: neck.x + Math.sin(pose.torso) * headR * 0.8 + pose.headDX * S,
      y: neck.y - headR * 0.85 + pose.headDY * S
    };
    const shoulder = { x: lerp(hip.x, neck.x, 0.86), y: lerp(hip.y, neck.y, 0.86) };

    // Cadena de 2 segmentos (cadera->rodilla->pie / hombro->codo->mano)
    function chain2(o, a1, a2, L1, L2) {
      const j = { x: o.x + Math.sin(a1) * L1, y: o.y + Math.cos(a1) * L1 };
      const e = { x: j.x + Math.sin(a2) * L2, y: j.y + Math.cos(a2) * L2 };
      return [j, e];
    }
    const hipF = { x: hip.x + 0.03 * S, y: hip.y };
    const hipB = { x: hip.x - 0.03 * S, y: hip.y };
    const shF = { x: shoulder.x + 0.02 * S, y: shoulder.y };
    const shB = { x: shoulder.x - 0.02 * S, y: shoulder.y };
    const [kneeF, footF] = chain2(hipF, pose.legF[0], pose.legF[1], legU, legL);
    const [kneeB, footB] = chain2(hipB, pose.legB[0], pose.legB[1], legU, legL);
    const [elbF, handF] = chain2(shF, pose.armF[0], pose.armF[1], armU, armL);
    const [elbB, handB] = chain2(shB, pose.armB[0], pose.armB[1], armU, armL);

    // Anclar el pie más bajo al suelo (y=0)
    const joints = [hip, neck, head, shoulder, hipF, hipB, shF, shB,
      kneeF, footF, kneeB, footB, elbF, handF, elbB, handB];
    const dy = Math.max(footF.y, footB.y);
    for (const pt of joints) pt.y -= dy;

    // Tintado por flash de daño (blanco -> rojo)
    const fl = pose.flash;
    const C = (col) => fl > 0
      ? mix(col.startsWith('rgb') ? '#dddddd' : col, fl > 0.5 ? '#ffffff' : '#ff5544', clamp(fl * 1.15, 0, 1))
      : col;

    // Colores de mangas según tipo de ropa
    let upArm, loArm;
    if (a.clothing === 'hoodie') { upArm = a.accent; loArm = shade(a.accent, -0.1); } // sudadera: manga larga
    else if (a.clothing === 'vest') { upArm = a.skin; loArm = a.skin; }               // chaleco: sin mangas
    else { upArm = shade(a.accent, -0.08); loArm = a.skin; }                          // camiseta: manga corta

    ctx.save();
    ctx.translate(rt.px, groundY - pose.hop * S);
    ctx.scale(rt.facing, 1);
    if (pose.rot) {
      const pvx = -0.12 * S;                 // pivote en el talón trasero (KO)
      ctx.translate(pvx, 0);
      ctx.rotate(pose.rot);
      ctx.translate(-pvx, 0);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function line(p1, p2) {
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
    // Extremidad con contorno y dos tramos de color (superior/inferior)
    function limb(j0, j1, j2, w, colUp, colLo) {
      ctx.strokeStyle = C(OUTLINE); ctx.lineWidth = w + 0.032 * S;
      ctx.beginPath(); ctx.moveTo(j0.x, j0.y); ctx.lineTo(j1.x, j1.y); ctx.lineTo(j2.x, j2.y); ctx.stroke();
      ctx.strokeStyle = C(colUp); ctx.lineWidth = w;
      line(j0, j1);
      ctx.strokeStyle = C(colLo);
      line(j1, j2);
    }
    function circle(p, r, col) {
      ctx.fillStyle = C(OUTLINE);
      ctx.beginPath(); ctx.arc(p.x, p.y, r + 0.016 * S, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C(col);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }
    function fist(p) {
      if (a.detail.gloves) circle(p, 0.062 * S, a.accent);   // guante de boxeo
      else circle(p, 0.040 * S, a.skin);
    }
    function shoe(p) {
      const tip = { x: p.x + 0.065 * S, y: p.y };
      ctx.strokeStyle = C(OUTLINE); ctx.lineWidth = 0.062 * S + 0.026 * S;
      line({ x: p.x - 0.02 * S, y: p.y }, tip);
      ctx.strokeStyle = C(a.shoe); ctx.lineWidth = 0.062 * S;
      line({ x: p.x - 0.02 * S, y: p.y }, tip);
    }

    // ---- Accesorios de mano trasera (se dibujan con el brazo trasero) ----
    function backHandProps() {
      if (a.detail.chain) {
        // cadena colgando con balanceo
        ctx.fillStyle = C('#c9c9d4');
        for (let i = 1; i <= 5; i++) {
          const sw = Math.sin(animTime * 3.2 + i * 0.8) * 0.012 * S * i * 0.4;
          ctx.beginPath();
          ctx.arc(handB.x - 0.01 * S + sw, handB.y + i * 0.034 * S, 0.013 * S, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (a.detail.cane) {
        // bastón hasta el suelo
        const len = Math.min(Math.max(0, -handB.y), 0.52 * S);
        ctx.strokeStyle = C('#8a5a2a'); ctx.lineWidth = 0.022 * S;
        line(handB, { x: handB.x + 0.03 * S, y: handB.y + len });
      }
      if (a.detail.wrench) {
        // llave inglesa
        ctx.strokeStyle = C('#9aa0aa'); ctx.lineWidth = 0.024 * S;
        line(handB, { x: handB.x + 0.10 * S, y: handB.y - 0.06 * S });
        circle({ x: handB.x + 0.10 * S, y: handB.y - 0.06 * S }, 0.024 * S, '#9aa0aa');
      }
    }
    function frontHandProps() {
      if (a.detail.spray) {
        // bote de spray
        ctx.fillStyle = C(OUTLINE);
        ctx.fillRect(handF.x - 0.030 * S, handF.y - 0.10 * S, 0.060 * S, 0.105 * S);
        ctx.fillStyle = C('#d8d8d8');
        ctx.fillRect(handF.x - 0.024 * S, handF.y - 0.094 * S, 0.048 * S, 0.092 * S);
        ctx.fillStyle = C(a.accent);
        ctx.fillRect(handF.x - 0.018 * S, handF.y - 0.118 * S, 0.036 * S, 0.026 * S);
      }
    }

    // ---- Torso (con variaciones de ropa) ----
    function drawTorso() {
      ctx.strokeStyle = C(OUTLINE); ctx.lineWidth = lwTorso + 0.034 * S;
      line(hip, neck);
      const baseCol = a.clothing === 'vest' ? a.shirtCol : a.accent;
      ctx.strokeStyle = C(baseCol); ctx.lineWidth = lwTorso;
      line(hip, neck);
      if (a.clothing === 'vest') {
        // chaleco abierto sobre camiseta
        const v0 = { x: lerp(hip.x, neck.x, 0.05), y: lerp(hip.y, neck.y, 0.05) };
        const v1 = { x: lerp(hip.x, neck.x, 0.95), y: lerp(hip.y, neck.y, 0.95) };
        ctx.strokeStyle = C(shade(a.accent, -0.22)); ctx.lineWidth = lwTorso * 1.02;
        line(v0, v1);
        ctx.strokeStyle = C(a.shirtCol); ctx.lineWidth = lwTorso * 0.34;
        line(v0, v1);
      }
      if (a.clothing === 'hoodie') {
        // capucha caída tras el cuello + cordones
        ctx.fillStyle = C(shade(a.accent, -0.2));
        ctx.beginPath();
        ctx.arc(neck.x - 0.055 * S, neck.y + 0.01 * S, 0.075 * S, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = C('#f0f0f0'); ctx.lineWidth = 0.010 * S;
        line({ x: neck.x, y: neck.y + 0.03 * S }, { x: neck.x + 0.01 * S, y: neck.y + 0.11 * S });
      }
      if (a.detail.goldChain) {
        ctx.strokeStyle = C('#ffd24a'); ctx.lineWidth = 0.018 * S;
        ctx.beginPath();
        ctx.arc(neck.x, neck.y + 0.045 * S, 0.058 * S, 0.35, Math.PI - 0.35);
        ctx.stroke();
      }
      // cinturón
      ctx.strokeStyle = C(shade(a.pants, -0.35)); ctx.lineWidth = 0.030 * S;
      line({ x: hip.x - 0.065 * S, y: hip.y }, { x: hip.x + 0.065 * S, y: hip.y });
    }

    // ---- Cabeza: cara, pelo/sombrero, ojo, detalles ----
    function drawHead() {
      // cuello
      ctx.strokeStyle = C(OUTLINE); ctx.lineWidth = 0.062 * S + 0.024 * S;
      line(neck, { x: head.x, y: head.y + headR * 0.6 });
      ctx.strokeStyle = C(a.skin); ctx.lineWidth = 0.062 * S;
      line(neck, { x: head.x, y: head.y + headR * 0.6 });

      // pelo "detrás de la cabeza"
      if (a.hairT === 'afro') circle({ x: head.x - 0.01 * S, y: head.y - 0.012 * S }, headR * 1.32, a.hairC);
      if (a.hairT === 'long') {
        ctx.fillStyle = C(a.hairC);
        ctx.beginPath();
        ctx.ellipse(head.x - headR * 0.45, head.y + headR * 0.55, headR * 0.75, headR * 1.25, 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
      if (a.hairT === 'ponytail') {
        // coleta con balanceo
        const sw = Math.sin(animTime * 2.6 + rt.phase) * 0.02 * S;
        ctx.strokeStyle = C(a.hairC); ctx.lineWidth = 0.045 * S;
        ctx.beginPath();
        ctx.moveTo(head.x - headR * 0.8, head.y - headR * 0.2);
        ctx.quadraticCurveTo(head.x - headR * 1.7 + sw, head.y + headR * 0.4,
          head.x - headR * 1.5 + sw * 1.6, head.y + headR * 1.4);
        ctx.stroke();
      }

      // cara
      circle(head, headR, a.skin);

      // pelo encima
      ctx.fillStyle = C(a.hairC);
      if (a.hairT === 'short' || a.hairT === 'long' || a.hairT === 'ponytail') {
        ctx.beginPath();
        ctx.arc(head.x - headR * 0.12, head.y - headR * 0.18, headR * 0.95, Math.PI * 0.95, Math.PI * 2.02);
        ctx.fill();
      }
      if (a.hairT === 'mohawk') {
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(head.x + i * headR * 0.28 - headR * 0.12, head.y - headR * 0.62);
          ctx.lineTo(head.x + i * headR * 0.28, head.y - headR * 1.55);
          ctx.lineTo(head.x + i * headR * 0.28 + headR * 0.12, head.y - headR * 0.62);
          ctx.closePath();
          ctx.fill();
        }
      }
      // 'bald' / afro: nada extra encima

      // sombreros / detalles de cabeza
      if (a.detail.scarf) {
        // pañuelo que cubre la cabeza + nudo
        ctx.fillStyle = C(shade(a.accent, 0.15));
        ctx.beginPath();
        ctx.arc(head.x, head.y - headR * 0.1, headR * 1.04, Math.PI * 0.92, Math.PI * 2.08);
        ctx.fill();
        circle({ x: head.x - headR * 1.0, y: head.y + headR * 0.25 }, headR * 0.22, shade(a.accent, 0.15));
      }
      if (a.detail.cap) {
        // gorra con visera al frente
        ctx.fillStyle = C(shade(a.accent, -0.25));
        ctx.beginPath();
        ctx.arc(head.x, head.y - headR * 0.25, headR * 0.98, Math.PI * 0.98, Math.PI * 2.02);
        ctx.fill();
        ctx.fillRect(head.x, head.y - headR * 0.62, headR * 1.45, headR * 0.26);
      }
      if (a.detail.beret) {
        // boina ladeada
        ctx.fillStyle = C(shade(a.accent, -0.3));
        ctx.beginPath();
        ctx.ellipse(head.x - headR * 0.15, head.y - headR * 0.82, headR * 1.0, headR * 0.42, -0.18, 0, Math.PI * 2);
        ctx.fill();
      }
      if (a.detail.headband) {
        ctx.fillStyle = C(a.accent);
        ctx.fillRect(head.x - headR, head.y - headR * 0.5, headR * 2, headR * 0.26);
        // cintas al viento
        ctx.strokeStyle = C(a.accent); ctx.lineWidth = 0.02 * S;
        const sw = Math.sin(animTime * 4 + rt.phase) * 0.02 * S;
        ctx.beginPath();
        ctx.moveTo(head.x - headR, head.y - headR * 0.36);
        ctx.lineTo(head.x - headR * 1.8 + sw, head.y + headR * 0.1);
        ctx.stroke();
      }
      if (a.detail.beard) {
        ctx.fillStyle = C('#cfcfcf');
        ctx.beginPath();
        ctx.arc(head.x + headR * 0.1, head.y + headR * 0.45, headR * 0.52, -0.3, Math.PI + 0.3);
        ctx.fill();
      }
      // ojo mirando al rival
      ctx.fillStyle = C('#ffffff');
      ctx.fillRect(head.x + headR * 0.30, head.y - headR * 0.18, headR * 0.34, headR * 0.22);
      ctx.fillStyle = C('#161616');
      ctx.fillRect(head.x + headR * 0.48, head.y - headR * 0.16, headR * 0.16, headR * 0.18);
      // ceño
      ctx.strokeStyle = C(OUTLINE); ctx.lineWidth = Math.max(1, 0.014 * S);
      ctx.beginPath();
      ctx.moveTo(head.x + headR * 0.24, head.y - headR * 0.32);
      ctx.lineTo(head.x + headR * 0.66, head.y - headR * 0.24);
      ctx.stroke();
    }

    // ---- Orden de pintado (de atrás hacia delante) ----
    limb(shB, elbB, handB, lwArm, upArm, loArm);   // brazo trasero
    fist(handB);
    backHandProps();
    limb(hipB, kneeB, footB, lwLeg, a.pants, a.pants); // pierna trasera
    shoe(footB);
    drawTorso();
    limb(hipF, kneeF, footF, lwLeg, a.pants, shade(a.pants, 0.08)); // pierna delantera
    shoe(footF);
    drawHead();
    limb(shF, elbF, handF, lwArm, upArm, loArm);   // brazo delantero
    fist(handF);
    frontHandProps();

    ctx.restore();
  }

  /* ============================================
     FX INTERNOS: chispas, estrellas de golpe, polvo, anillos
     ============================================ */
  function spawnDust(x, y, n) {
    for (let i = 0; i < n * 3; i++) {
      fx.push({
        type: 'dust',
        x: x + (Math.random() - 0.5) * 0.12 * S,
        y: y - Math.random() * 4,
        vx: (Math.random() - 0.5) * 36,
        vy: -8 - Math.random() * 26,
        life: 0.45 + Math.random() * 0.35,
        age: 0,
        size: 2 + Math.random() * 4
      });
    }
  }

  function hit(id, type, blocked) {
    if (!rts || !rts[id]) return;
    const rt = rts[id];
    rt.stateStart = animTime; // reinicia la anim de daño (golpes seguidos)
    const x = rt.px + rt.facing * (-0.04 * S);
    const y = groundY - S * (0.55 + Math.random() * 0.15);

    if (blocked) {
      // chispas frías de bloqueo
      fx.push({ type: 'ring', x, y, age: 0, life: 0.25, size: 0.05 * S, grow: 0.5 * S, col: '#7ddcff' });
      for (let i = 0; i < 6; i++) {
        const ang = Math.random() * Math.PI * 2;
        const v = 90 + Math.random() * 120;
        fx.push({ type: 'spark', x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, age: 0, life: 0.25, col: '#9be8ff' });
      }
      return;
    }
    // estrella de impacto + chispas + anillo
    fx.push({
      type: 'star', x, y, age: 0, life: 0.22,
      size: (type === 'kick' ? 0.17 : 0.13) * S,
      rot: Math.random() * Math.PI, col: '#ffffff'
    });
    fx.push({ type: 'ring', x, y, age: 0, life: 0.3, size: 0.04 * S, grow: 0.8 * S, col: '#ffe600' });
    const n = type === 'kick' ? 12 : 9;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const v = 140 + Math.random() * 220;
      fx.push({
        type: 'spark', x, y,
        vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 40,
        age: 0, life: 0.3 + Math.random() * 0.15,
        col: ['#ffe600', '#ff7030', '#ffffff'][i % 3]
      });
    }
  }

  function updateFx(dt, paused) {
    const alive = [];
    for (const p of fx) {
      if (!paused) p.age += dt;
      if (p.age >= p.life) continue;
      const k = p.age / p.life;
      const al = 1 - k;
      ctx.globalAlpha = al;
      if (p.type === 'dust') {
        if (!paused) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 18 * dt; p.vx *= 0.96; }
        ctx.fillStyle = 'rgba(190,178,165,0.55)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + k * 1.6), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'spark') {
        if (!paused) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; }
        ctx.strokeStyle = p.col;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
        ctx.stroke();
      } else if (p.type === 'ring') {
        const r = p.size + p.grow * easeOut(k);
        ctx.strokeStyle = p.col;
        ctx.lineWidth = 3 * al;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'star') {
        // estrella de golpe de 4 puntas (estilo cómic)
        const r1 = p.size * (0.7 + k * 0.8);
        const r2 = r1 * 0.38;
        ctx.fillStyle = p.col;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot + k * 0.6);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const rr = i % 2 === 0 ? r1 : r2;
          const an = (i / 8) * Math.PI * 2;
          if (i === 0) ctx.moveTo(Math.cos(an) * rr, Math.sin(an) * rr);
          else ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      alive.push(p);
    }
    fx = alive;
  }

  /* ============================================
     SINCRONIZACIÓN CON EL ESTADO DE battle.js
     ============================================ */
  function syncRuntime(rt, f, foe, paused, dt) {
    const targetPx = (f.x / 100) * W;
    if (rt.prevPx === null) rt.prevPx = targetPx;
    const dx = targetPx - rt.prevPx;
    rt.px = targetPx;
    rt.prevPx = targetPx;

    // facing dinámico: mirar siempre al rival (no girar si está KO)
    if (f.state !== 'ko') rt.facing = (foe.x >= f.x) ? 1 : -1;

    // detección de caminar por cambio de x
    if (!paused) {
      if (Math.abs(dx) > 0.05 && f.state !== 'ko') {
        rt.walkPhase += dx * 0.045 * rt.facing; // avanza/retrocede el ciclo
        rt.moveTimer = 0.12;
        if (Math.random() < 0.07) spawnDust(rt.px - dx * 3, groundY - 2, 1);
      } else {
        rt.moveTimer = Math.max(0, rt.moveTimer - dt);
      }
    }

    // transiciones de estado
    if (f.state !== rt.state) {
      rt.state = f.state;
      rt.stateStart = animTime;
      rt.attackType = f.attackType || 'punch';
      rt.koDust = false;
    }

    // polvo + sacudida al caer KO
    if (rt.state === 'ko' && !rt.koDust && (animTime - rt.stateStart) > 0.6) {
      rt.koDust = true;
      spawnDust(rt.px - rt.facing * S * 0.4, groundY - 3, 3);
      shakeMag = Math.max(shakeMag, 6);
    }

    // celebración (flag que activa battle.js al ganar la ronda)
    if (f.celebrate && rt.celebrateStart < 0) rt.celebrateStart = animTime;
    if (!f.celebrate) rt.celebrateStart = -1;
  }

  /* ============================================
     FRAME PRINCIPAL (lo llama el gameLoop de battle.js)
     ============================================ */
  function frame(p1, p2, opts = {}) {
    if (!ctx || !canvas || !rts) return;
    const ts = performance.now();
    let dt = lastTs ? (ts - lastTs) / 1000 : 0.016;
    lastTs = ts;
    dt = Math.min(dt, 0.05);
    if (!opts.paused) animTime += dt;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);

    // screen shake
    let sx = 0, sy = 0;
    if (shakeMag > 0.3) {
      if (!opts.paused) {
        sx = (Math.random() - 0.5) * shakeMag;
        sy = (Math.random() - 0.5) * shakeMag * 0.6;
        shakeMag *= 0.86;
      }
    } else shakeMag = 0;

    ctx.save();
    ctx.translate(sx, sy);

    if (bg) ctx.drawImage(bg, 0, 0, W, H);

    syncRuntime(rts.p1, p1, p2, opts.paused, dt);
    syncRuntime(rts.p2, p2, p1, opts.paused, dt);

    drawShadow(rts.p1);
    drawShadow(rts.p2);

    // el que ataca se dibuja por encima
    let order = [rts.p2, rts.p1];
    if (p2.state === 'attacking' && p1.state !== 'attacking') order = [rts.p1, rts.p2];
    for (const rt of order) drawFighter(rt);

    updateFx(dt, opts.paused);

    ctx.restore();
  }

  /* ============================================
     UTILIDADES PARA battle.js
     ============================================ */
  function shake(mag) { shakeMag = Math.max(shakeMag, mag); }

  // Posición (coords de página) del pecho del luchador, para
  // posicionar el hit-effect DOM y las Particles globales.
  function getScreenPos(id) {
    if (!rts || !rts[id] || !canvas) return { x: 0, y: 0 };
    const rt = rts[id];
    const r = canvas.getBoundingClientRect();
    return { x: r.left + rt.px, y: r.top + groundY - S * 0.62 };
  }

  return { init, destroy, frame, hit, shake, getScreenPos, resize };
})();

window.FighterRenderer = FighterRenderer;
