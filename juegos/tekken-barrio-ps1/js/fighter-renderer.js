/* ============================================
   FIGHTER RENDERER
   Orquesta el combate en canvas: escenario (Stages),
   luchadores detallados (FighterArt), poses/animación
   y efectos de impacto.

   Lo consume scenes/battle.js:
     init(canvas, charP1, charP2, opts)
     frame(p1, p2, { paused })
     hit(id, type, blocked)
     shake(mag)
     getScreenPos(id)
     setBottomInset(px)     -> deja hueco para los controles táctiles
     getStageName()
     destroy()

   Estado esperado de cada luchador (battle.js):
     { id, x (0..100), y (altura, fracción de S), hp,
       state: idle|attacking|blocking|hurt|ko,
       crouching: bool, airborne: bool,
       attackType: punch|kick|airkick, celebrate: bool }
   ============================================ */

const FighterRenderer = (() => {

  const { clamp, lerp, mix, shade, alpha, deep, mulberry32 } = FighterArt;

  let canvas = null, ctx = null;
  let W = 0, H = 0, dpr = 1;
  let groundY = 0, S = 0, bottomInset = 0;
  let stage = null, stageDef = null;
  let animTime = 0, lastTs = 0;
  let shakeMag = 0, flashScreen = 0;
  let fx = [];
  let rts = null;
  let onResize = null;

  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const easeOut = (t) => 1 - (1 - t) * (1 - t);
  const easeIn = (t) => t * t;

  /* ============================================
     RUNTIME POR LUCHADOR
     ============================================ */
  function makeRuntime(ch, slot) {
    return {
      ch,
      app: FighterArt.buildAppearance(ch),
      px: 0, prevPx: null, py: 0,
      facing: slot === 1 ? 1 : -1,
      state: 'idle', stateStart: 0,
      attackType: 'punch',
      crouching: false, airborne: false,
      walkPhase: 0, moveTimer: 0, moveDir: 0,
      phase: (ch.id * 0.77) % (Math.PI * 2),
      koDust: false, landDust: false,
      celebrateStart: -1,
      dirt: 0, hp: 100,
      lastPts: null, trail: null, vy: 0
    };
  }

  function init(canvasEl, chP1, chP2, opts = {}) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    rts = { p1: makeRuntime(chP1, 1), p2: makeRuntime(chP2, 2) };
    fx = [];
    shakeMag = 0; flashScreen = 0;
    animTime = 0; lastTs = 0;
    stageDef = opts.stage ? (typeof opts.stage === 'string' ? Stages.byId(opts.stage) : opts.stage)
      : Stages.pick((chP1.id * 31 + chP2.id * 7 + Date.now()) >>> 0);
    onResize = () => resize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    resize();
  }

  function setBottomInset(px) {
    const v = Math.max(0, px | 0);
    if (v === bottomInset) return;
    bottomInset = v;
    resize();
  }

  function resize() {
    if (!canvas || !canvas.parentElement) return;
    const r = canvas.parentElement.getBoundingClientRect();
    W = Math.max(1, Math.floor(r.width));
    H = Math.max(1, Math.floor(r.height));
    // Resolución adaptativa: limitamos los píxeles reales para que un móvil
    // modesto mantenga los 60fps (el look es pixelado, apenas se nota)
    const want = Math.min(window.devicePixelRatio || 1, 2);
    const MAXPX = 1100000;
    dpr = (W * H * want * want > MAXPX)
      ? Math.max(1, Math.sqrt(MAXPX / (W * H)))
      : want;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);

    // El suelo se sube por encima de los controles táctiles
    const usable = Math.max(120, H - bottomInset);
    groundY = Math.round(usable - Math.max(usable * 0.12, 16));
    // limitada por alto Y ancho: en vertical los luchadores no se estorban
    S = clamp(Math.min(usable * 0.58, W * 0.50), 92, 400);

    stage = Stages.create(stageDef, W, H, groundY, dpr, {
      acc1: rts ? rts.p1.app.accent : '#ffe600',
      acc2: rts ? rts.p2.app.accent : '#ff00ff'
    });
  }

  function destroy() {
    if (onResize) {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    }
    onResize = null;
    canvas = null; ctx = null; stage = null;
    fx = []; rts = null;
  }

  function getStageName() { return stageDef ? stageDef.name : ''; }

  /* ============================================
     POSES
     ============================================ */
  function basePose(rt, t) {
    const lowHp = rt.hp <= 30;
    const rate = lowHp ? 3.4 : 2.3;
    const amp = lowHp ? 1.7 : 1;
    const b = Math.sin(t * rate + rt.phase);
    const p = FighterArt.emptyPose();
    p.crouch = 0.22 + b * 0.026 * amp;
    p.torso = 0.10 + b * 0.013 * amp;
    p.armF = [0.55 + b * 0.05, 2.35 + b * 0.06];
    p.armB = [0.30 + b * 0.04, 2.05];
    p.legF = [0.30, 0.08];
    p.legB = [-0.32, -0.50];
    p.brow = 0.5;
    p.mouth = lowHp ? 0.35 + b * 0.12 : 0.1;
    return p;
  }

  function poseWalk(pose, rt) {
    const ph = rt.walkPhase;
    const s1 = Math.sin(ph), s2 = Math.sin(ph + Math.PI);
    pose.legF = [s1 * 0.5 + 0.05, s1 * 0.5 + 0.05 - (0.16 + 0.34 * (1 - Math.abs(s1)))];
    pose.legB = [s2 * 0.5 - 0.05, s2 * 0.5 - 0.05 - (0.16 + 0.34 * (1 - Math.abs(s2)))];
    pose.crouch = 0.25 + Math.abs(Math.cos(ph)) * 0.06;
    pose.torso += 0.04 * (rt.moveDir >= 0 ? 1 : -0.6);
    pose.armF[0] += s2 * 0.09;
    pose.armB[0] += s1 * 0.09;
    pose.cloth = 0.6;
  }

  function poseCrouch(pose) {
    // agachado: cadera hundida, rodillas flexionadas, pies bajo el cuerpo
    pose.crouch = 0.92;
    pose.torso = 0.26;
    pose.armF = [0.95, 2.60];
    pose.armB = [0.70, 2.35];
    pose.legF = [1.05, -0.62];
    pose.legB = [-1.05, 0.62];
    pose.headDY = 0.014;
    pose.brow = 0.9;
    pose.mouth = 0.2;
  }

  function poseJump(pose, rt, hgt, vy) {
    // salto: rodillas recogidas, brazos equilibrando
    const up = vy < 0;
    pose.noAnchor = true;
    pose.crouch = 0.5;
    pose.torso = up ? -0.1 : 0.16;
    pose.legF = [1.30, 2.50];
    pose.legB = [0.55, 2.05];
    pose.armF = [up ? -0.3 : 0.5, up ? 0.6 : 1.9];
    pose.armB = [up ? 1.5 : 0.9, up ? 2.4 : 2.2];
    pose.cloth = 1;
    pose.brow = 0.7;
    pose.mouth = 0.4;
  }

  function poseAirKick(pose, ts) {
    // patada aérea: pierna extendida en diagonal
    const p = clamp(ts / 0.42, 0, 1);
    pose.noAnchor = true;
    pose.crouch = 0.44;
    pose.torso = -0.22;
    if (p < 0.3) {
      const q = easeOut(p / 0.3);
      pose.legF = [lerp(1.30, 1.45, q), lerp(2.20, 1.30, q)];
    } else {
      pose.legF = [1.45, 1.30];
    }
    pose.legB = [0.5, 1.95];
    pose.armF = [-0.5, 0.4];
    pose.armB = [1.7, 2.5];
    pose.mouth = 0.7;
    pose.brow = 1;
    pose.cloth = 1;
  }

  function posePunch(pose, ts) {
    const p = clamp(ts / 0.32, 0, 1);
    pose.mouth = p < 0.6 ? 0.55 : 0.2;
    pose.brow = 1;
    if (p < 0.28) {
      const q = easeOut(p / 0.28);
      pose.armF = [lerp(0.55, -0.35, q), lerp(2.35, 0.45, q)];
      pose.torso = lerp(pose.torso, 0.02, q);
      pose.crouch += 0.08 * q;
      pose.hipDX = -0.02 * q;
    } else if (p < 0.55) {
      const q = easeOut(seg(p, 0.28, 0.55));
      pose.armF = [lerp(-0.35, 1.55, q), lerp(0.45, 1.52, q)];
      pose.torso = lerp(0.02, 0.30, q);
      pose.hipDX = lerp(-0.02, 0.10, q);
      pose.armB = [lerp(0.30, -0.25, q), lerp(2.05, 1.20, q)];
      pose.crouch = 0.30;
      pose.legF = [0.45, 0.25];
      pose.legB = [-0.55, -0.85];
      pose.cloth = 1;
    } else {
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
    pose.legB = [-0.16, -0.38];
    pose.mouth = p < 0.6 ? 0.65 : 0.2;
    pose.brow = 1;
    if (p < 0.25) {
      const q = easeOut(p / 0.25);
      pose.legF = [lerp(0.30, 1.00, q), lerp(0.08, 0.00, q)];
      pose.torso = lerp(pose.torso, -0.06, q);
      pose.crouch += 0.10 * q;
      pose.armF = [lerp(0.55, -0.20, q), lerp(2.35, 1.20, q)];
    } else if (p < 0.55) {
      const q = easeOut(seg(p, 0.25, 0.55));
      pose.legF = [lerp(1.00, 1.52, q), lerp(0.00, 1.46, q)];
      pose.torso = lerp(-0.06, -0.32, q);
      pose.hipDX = 0.06 * q;
      pose.armF = [-0.20, 1.20];
      pose.armB = [lerp(0.30, 0.85, q), lerp(2.05, 1.50, q)];
      pose.crouch = 0.32;
      pose.cloth = 1;
    } else {
      const q = easeOut(seg(p, 0.55, 1));
      pose.legF = [lerp(1.52, 0.30, q), lerp(1.46, 0.08, q)];
      pose.torso = lerp(-0.32, 0.10, q);
      pose.hipDX = 0.06 * (1 - q);
      pose.armF = [lerp(-0.20, 0.55, q), lerp(1.20, 2.35, q)];
      pose.armB = [lerp(0.85, 0.30, q), lerp(1.50, 2.05, q)];
      pose.crouch = lerp(0.32, 0.22, q);
    }
  }

  function poseBlock(pose, crouching) {
    if (crouching) {
      poseCrouch(pose);
      pose.armF = [1.25, 2.9];
      pose.armB = [1.45, 2.7];
      return;
    }
    pose.crouch = 0.42;
    pose.torso = 0.18;
    pose.armF = [1.05, 2.75];
    pose.armB = [1.30, 2.50];
    pose.legF = [0.22, 0.02];
    pose.legB = [-0.30, -0.52];
    pose.headDX = -0.02;
    pose.headDY = 0.02;
    pose.brow = 1;
    pose.mouth = 0.15;
    pose.eyeClose = 0.35;
  }

  function poseHurt(pose, ts) {
    const p = clamp(ts / 0.35, 0, 1);
    const k = Math.sin(p * Math.PI);
    pose.torso = 0.10 - 0.55 * k;
    pose.crouch = 0.26 + 0.12 * k;
    pose.hipDX = -0.05 * k;
    pose.headDX = -0.06 * k;
    pose.armF = [0.55 + 0.5 * k, 2.35 - 1.2 * k];
    pose.armB = [0.30 - 0.6 * k, 2.05 - 1.0 * k];
    pose.flash = Math.max(0, 1 - p * 1.8);
    pose.mouth = 0.85 * k + 0.15;
    pose.brow = 0.2;
    pose.eyeClose = k * 0.8;
    pose.cloth = 1;
  }

  function poseKO(pose, ts) {
    const p = clamp(ts / 0.95, 0, 1);
    let r;
    if (p < 0.62) r = easeIn(p / 0.62);
    else r = 1 - 0.12 * Math.sin(seg(p, 0.62, 1) * Math.PI);
    pose.rot = -(Math.PI / 2 - 0.06) * r;
    pose.crouch = lerp(0.22, 0.12, r);
    pose.torso = 0.05;
    pose.armF = [lerp(0.55, 1.15, r), lerp(2.35, 1.30, r)];
    pose.armB = [lerp(0.30, -0.55, r), lerp(2.05, -0.30, r)];
    pose.legF = [lerp(0.30, 0.45, r), lerp(0.08, 0.15, r)];
    pose.legB = [-0.25, -0.55];
    pose.headDX = 0.03 * r;
    pose.flash = Math.max(0, 1 - p * 2.5);
    pose.mouth = 0.5;
    pose.eyeClose = 1;
  }

  function poseCelebrate(pose, tc) {
    const pump = Math.sin(tc * 7) * 0.18;
    pose.armB = [Math.PI - 0.18 + pump, Math.PI - 0.05 + pump];
    pose.armF = [0.35, 1.00];
    pose.torso = 0.0;
    pose.crouch = 0.18;
    pose.hop = Math.abs(Math.sin(tc * 5)) * 0.045;
    pose.headDY = -0.01;
    pose.mouth = 0.8;
    pose.brow = 0.1;
  }

  function computePose(rt) {
    const t = animTime;
    const ts = t - rt.stateStart;
    const pose = basePose(rt, t);

    if (rt.state === 'idle' && rt.moveTimer > 0 && !rt.airborne && !rt.crouching) {
      poseWalk(pose, rt);
    }

    if (rt.airborne && rt.state !== 'ko' && rt.state !== 'hurt') {
      if (rt.state === 'attacking') poseAirKick(pose, ts);
      else poseJump(pose, rt, rt.py, rt.vy || 0);
      pose.hop = rt.py;
      if (rt.state === 'blocking') { pose.armF = [1.0, 2.7]; pose.armB = [1.3, 2.5]; }
      return finishPose(rt, pose, t);
    }

    switch (rt.state) {
      case 'attacking':
        if (rt.attackType === 'kick') poseKick(pose, ts);
        else posePunch(pose, ts);
        if (rt.crouching) { pose.crouch = Math.max(pose.crouch, 0.55); pose.headDY = 0.02; }
        break;
      case 'blocking': poseBlock(pose, rt.crouching); break;
      case 'hurt':
        poseHurt(pose, ts);
        if (rt.crouching) pose.crouch += 0.4;
        break;
      case 'ko': poseKO(pose, ts); break;
      default:
        if (rt.crouching) poseCrouch(pose);
    }
    return finishPose(rt, pose, t);
  }

  function finishPose(rt, pose, t) {
    if (rt.celebrateStart >= 0 && rt.state !== 'ko' && rt.state !== 'hurt') {
      poseCelebrate(pose, t - rt.celebrateStart);
    }
    return pose;
  }

  /* ============================================
     SOMBRAS Y SILUETAS
     ============================================ */
  function drawShadow(rt) {
    const ko = rt.state === 'ko';
    const air = clamp(rt.py / 0.45, 0, 1);
    const wSh = S * (ko ? 0.42 : 0.20) * (1 - air * 0.45);
    const a = (ko ? 0.32 : 0.4) * (1 - air * 0.55);
    const cx = rt.px - (ko ? rt.facing * S * 0.32 : 0);
    const ry = S * 0.05 * (1 - air * 0.3);
    ctx.fillStyle = 'rgba(0,0,0,' + (a * 0.75).toFixed(2) + ')';
    ctx.beginPath();
    ctx.ellipse(cx, groundY + 3, wSh, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,' + (a * 0.5).toFixed(2) + ')';
    ctx.beginPath();
    ctx.ellipse(cx, groundY + 3, wSh * 1.35, ry * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ============================================
     FX
     ============================================ */
  function spawnDust(x, y, n) {
    for (let i = 0; i < n * 3; i++) {
      fx.push({
        type: 'dust',
        x: x + (Math.random() - 0.5) * 0.12 * S,
        y: y - Math.random() * 4,
        vx: (Math.random() - 0.5) * 40,
        vy: -8 - Math.random() * 26,
        life: 0.45 + Math.random() * 0.4,
        age: 0,
        size: 2 + Math.random() * 4
      });
    }
  }

  function landDust(rt) {
    spawnDust(rt.px, groundY - 2, 3);
    shakeMag = Math.max(shakeMag, 2.5);
  }

  function hit(id, type, blocked) {
    if (!rts || !rts[id]) return;
    const rt = rts[id];
    rt.stateStart = animTime;
    const pts = rt.lastPts;
    const x = pts ? pts.chest.x : rt.px;
    const y = pts ? pts.chest.y - S * 0.05 : groundY - S * 0.6;

    if (blocked) {
      fx.push({ type: 'ring', x, y, age: 0, life: 0.24, size: 0.04 * S, grow: 0.20 * S, col: '#7ddcff' });
      for (let i = 0; i < 8; i++) {
        const ang = Math.random() * Math.PI * 2;
        const v = 90 + Math.random() * 130;
        fx.push({ type: 'spark', x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, age: 0, life: 0.26, col: '#9be8ff' });
      }
      flashScreen = Math.max(flashScreen, 0.12);
      return;
    }

    const big = (type === 'kick' || type === 'airkick');
    fx.push({
      type: 'star', x, y, age: 0, life: 0.24,
      size: (big ? 0.19 : 0.14) * S,
      rot: Math.random() * Math.PI, col: '#ffffff'
    });
    fx.push({ type: 'ring', x, y, age: 0, life: 0.28, size: 0.03 * S, grow: 0.30 * S, col: '#ffe600' });
    fx.push({ type: 'slash', x, y, age: 0, life: 0.18, size: (big ? 0.4 : 0.3) * S, rot: (Math.random() - 0.5) * 1.2 });
    const n = big ? 14 : 10;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const v = 150 + Math.random() * 230;
      fx.push({
        type: 'spark', x, y,
        vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 40,
        age: 0, life: 0.3 + Math.random() * 0.18,
        col: ['#ffe600', '#ff7030', '#ffffff'][i % 3]
      });
    }
    // gotas de sudor
    for (let i = 0; i < (big ? 6 : 4); i++) {
      const ang = -Math.PI * (0.15 + Math.random() * 0.7);
      const v = 120 + Math.random() * 160;
      fx.push({
        type: 'sweat', x, y: y - S * 0.1,
        vx: Math.cos(ang) * v * rt.facing * -1, vy: Math.sin(ang) * v,
        age: 0, life: 0.5 + Math.random() * 0.3
      });
    }
    flashScreen = Math.max(flashScreen, big ? 0.3 : 0.2);
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
        ctx.fillStyle = 'rgba(196,184,168,0.5)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + k * 1.7), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'spark') {
        if (!paused) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt; }
        ctx.strokeStyle = p.col;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
        ctx.stroke();
      } else if (p.type === 'sweat') {
        if (!paused) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 520 * dt; }
        ctx.fillStyle = 'rgba(200,235,255,0.8)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 2.2, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'ring') {
        const r = p.size + p.grow * easeOut(k);
        ctx.strokeStyle = p.col;
        ctx.lineWidth = 3 * al;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'slash') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = al * 0.85;
        const g = ctx.createLinearGradient(-p.size, 0, p.size, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.9)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        const hh = p.size * 0.1 * (1 - k);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * (1 + k * 0.5), Math.max(1, hh), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'star') {
        const r1 = p.size * (0.7 + k * 0.85);
        const r2 = r1 * 0.36;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot + k * 0.6);
        ctx.fillStyle = k < 0.45 ? '#ffffff' : '#ffe66a';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const rr = i % 2 === 0 ? r1 : r2;
          const an = (i / 10) * Math.PI * 2;
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
     SINCRONIZACIÓN CON battle.js
     ============================================ */
  function syncRuntime(rt, f, foe, paused, dt) {
    const targetPx = (f.x / 100) * W;
    if (rt.prevPx === null) rt.prevPx = targetPx;
    const dx = targetPx - rt.prevPx;
    rt.px = targetPx;
    rt.prevPx = targetPx;
    rt.hp = f.hp;
    rt.dirt = clamp((100 - f.hp) / 130, 0, 0.85);
    rt.vy = f.vy || 0;

    const wasAir = rt.airborne;
    rt.airborne = !!f.airborne;
    rt.py = f.y || 0;
    rt.crouching = !!f.crouching;

    if (wasAir && !rt.airborne && !paused) landDust(rt);

    if (f.state !== 'ko') rt.facing = (foe.x >= f.x) ? 1 : -1;

    if (!paused) {
      if (Math.abs(dx) > 0.05 && f.state !== 'ko' && !rt.airborne) {
        rt.walkPhase += dx * 0.045 * rt.facing;
        rt.moveTimer = 0.12;
        rt.moveDir = dx * rt.facing > 0 ? 1 : -1;
        if (Math.random() < 0.07) spawnDust(rt.px - dx * 3, groundY - 2, 1);
      } else {
        rt.moveTimer = Math.max(0, rt.moveTimer - dt);
      }
    }

    if (f.state !== rt.state) {
      rt.state = f.state;
      rt.stateStart = animTime;
      rt.attackType = f.attackType || 'punch';
      rt.koDust = false;
    } else if (f.state === 'attacking' && f.attackType !== rt.attackType) {
      rt.attackType = f.attackType;
    }

    if (rt.state === 'ko' && !rt.koDust && (animTime - rt.stateStart) > 0.6) {
      rt.koDust = true;
      spawnDust(rt.px - rt.facing * S * 0.4, groundY - 3, 4);
      shakeMag = Math.max(shakeMag, 7);
    }

    if (f.celebrate && rt.celebrateStart < 0) rt.celebrateStart = animTime;
    if (!f.celebrate) rt.celebrateStart = -1;
  }

  /* ============================================
     ESTELAS DE ATAQUE
     Rastro del puño / pie durante el golpe (barato:
     solo guarda posiciones, no redibuja al luchador).
     ============================================ */
  function pushTrail(rt) {
    const pts = rt.lastPts;
    if (!pts) return;
    if (rt.state !== 'attacking') { rt.trail = null; return; }
    const ts = animTime - rt.stateStart;
    if (ts > 0.3) return;
    const kick = rt.attackType !== 'punch';
    const p = kick ? pts.footF : pts.handF;
    if (!rt.trail) rt.trail = [];
    rt.trail.push({ x: p.x, y: p.y });
    if (rt.trail.length > 7) rt.trail.shift();
  }

  function drawTrail(rt) {
    const tr = rt.trail;
    if (!tr || tr.length < 3) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i < tr.length; i++) {
      const a = (i / tr.length) * 0.5;
      ctx.strokeStyle = alpha(i > tr.length - 3 ? '#ffffff' : rt.app.accent, a);
      ctx.lineWidth = S * 0.02 * (i / tr.length) + 1;
      ctx.beginPath();
      ctx.moveTo(tr[i - 1].x, tr[i - 1].y);
      ctx.lineTo(tr[i].x, tr[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ============================================
     FRAME
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

    if (stage) stage.drawBack(ctx, animTime);

    syncRuntime(rts.p1, p1, p2, opts.paused, dt);
    syncRuntime(rts.p2, p2, p1, opts.paused, dt);

    drawShadow(rts.p1);
    drawShadow(rts.p2);

    // el que ataca (o el que está en el aire) se dibuja delante
    let order = [rts.p2, rts.p1];
    if ((p2.state === 'attacking' || p2.airborne) && !(p1.state === 'attacking' || p1.airborne)) {
      order = [rts.p1, rts.p2];
    }
    for (const rt of order) {
      drawTrail(rt);
      const pose = computePose(rt);
      // Al caer KO el cuerpo se tumba: lo separamos del borde para que
      // no se salga de la pantalla en las esquinas
      const drawX = (rt.state === 'ko')
        ? clamp(rt.px, S * 0.48, Math.max(S * 0.48, W - S * 0.48))
        : rt.px;
      rt.lastPts = FighterArt.drawFighter(ctx, {
        app: rt.app, pose,
        x: drawX, groundY, S,
        facing: rt.facing, time: animTime,
        dirt: rt.dirt, lowHp: rt.hp <= 30 && rt.state !== 'ko'
      });
      if (!opts.paused) pushTrail(rt);
    }

    updateFx(dt, opts.paused);

    if (stage) stage.drawFore(ctx, animTime);

    ctx.restore();

    // destello de impacto a pantalla completa
    if (flashScreen > 0.01) {
      ctx.fillStyle = 'rgba(255,255,255,' + (flashScreen * 0.5).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
      if (!opts.paused) flashScreen *= 0.78;
    } else flashScreen = 0;
  }

  /* ============================================
     UTILIDADES
     ============================================ */
  function shake(mag) { shakeMag = Math.max(shakeMag, mag); }

  function getScreenPos(id) {
    if (!rts || !rts[id] || !canvas) return { x: 0, y: 0 };
    const rt = rts[id];
    const r = canvas.getBoundingClientRect();
    const pts = rt.lastPts;
    if (pts) return { x: r.left + (pts.chest.x), y: r.top + pts.chest.y };
    return { x: r.left + rt.px, y: r.top + groundY - S * 0.62 };
  }

  function getGroundY() { return groundY; }

  return {
    init, destroy, frame, hit, shake, getScreenPos, resize,
    setBottomInset, getStageName, getGroundY
  };
})();

window.FighterRenderer = FighterRenderer;
