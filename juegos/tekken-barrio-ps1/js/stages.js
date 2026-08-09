/* ============================================
   STAGES
   Escenarios de barrio con capas (cielo, skyline,
   fondo cercano, suelo y primer plano) y elementos
   animados: neones, público, ropa tendida, coches,
   palomas, vapor, lluvia...

   API:
     Stages.LIST                       -> catálogo
     Stages.pick(seed)                 -> definición pseudoaleatoria
     Stages.create(def, W, H, groundY, dpr) -> instancia
        inst.drawBack(ctx, t)   detrás de los luchadores
        inst.drawFore(ctx, t)   delante de los luchadores
        inst.name / inst.def
   ============================================ */

const Stages = (() => {

  const { mix, shade, alpha, deep, mulberry32, clamp, lerp } = FighterArt;

  /* ---------- catálogo ---------- */
  const LIST = [
    {
      id: 'plaza', name: 'PLAZA DEL BARRIO', mood: 'sunset',
      sky: ['#20123c', '#3a1a55', '#63265f', '#94355e', '#c74e4f', '#e8763f', '#f6a244', '#fbc865'],
      far: '#4b2358', near: '#2c1541', nearTop: '#1f0e30',
      wall: '#6a5147', wallTop: '#7d6155', win: '#ffcf6e',
      side: '#5b5663', asphalt: '#3c3944', light: '#ffd9a0', lightAmt: 0.1,
      hasSun: true, hasCrowd: true, hasLaundry: true, hasCars: true, hasBirds: true,
      graffiti: 'EL BARRIO'
    },
    {
      id: 'azotea', name: 'AZOTEA DE MADRUGADA', mood: 'night',
      sky: ['#04060f', '#080d1c', '#0e1730', '#152142', '#1d2c54', '#283a67', '#35496f', '#465a7d'],
      far: '#101a33', near: '#0b1226', nearTop: '#070c1a',
      wall: '#4c5263', wallTop: '#737d94', win: '#ffe08a',
      side: '#262a33', asphalt: '#1c1f26', light: '#9fc6ff', lightAmt: 0.16,
      hasStars: true, hasMoon: true, hasTanks: true, hasLaundry: true,
      hasPlane: true, hasNeon: true, graffiti: 'AZOTEA'
    },
    {
      id: 'mercado', name: 'MERCADO DE LA ESQUINA', mood: 'day',
      sky: ['#7fc4ee', '#93cff2', '#a8daf4', '#bde3f6', '#d0ebf8', '#e2f2fa', '#f0f8fc', '#fbfdff'],
      far: '#9aa6b8', near: '#7d8496', nearTop: '#6b7385',
      wall: '#c8b394', wallTop: '#dcc7a6', win: '#5b6b7a',
      side: '#b4ac9e', asphalt: '#8e8880', light: '#fff3d0', lightAmt: 0.06,
      hasSun: false, hasCrowd: true, hasStalls: true, hasBulbs: true, hasBirds: true,
      graffiti: 'MERCADO'
    },
    {
      id: 'callejon', name: 'CALLEJÓN NEÓN', mood: 'night',
      sky: ['#0a0616', '#120a22', '#1a0e2e', '#22123a', '#2a1745', '#331c50', '#3c225b', '#452866'],
      far: '#2a1445', near: '#1b0d2e', nearTop: '#140921',
      wall: '#584963', wallTop: '#7a6588', win: '#ff7bd0',
      side: '#2a2433', asphalt: '#1c1826', light: '#ff5ecf', lightAmt: 0.2,
      hasNeon: true, hasRain: true, hasSteam: true, hasFireEscape: true, hasBins: true,
      graffiti: 'RESPETO'
    },
    {
      id: 'taller', name: 'TALLER DEL MECÁNICO', mood: 'indoor',
      sky: ['#1a1a20', '#20201f', '#26251f', '#2c2a20', '#322f22', '#383424', '#3d3826', '#423c28'],
      far: '#33302a', near: '#2a2722', nearTop: '#211f1b',
      wall: '#5c5348', wallTop: '#6d6355', win: '#ffd27a',
      side: '#43403c', asphalt: '#333031', light: '#ffe3a8', lightAmt: 0.12,
      hasLamps: true, hasTools: true, hasTires: true, hasShutter: true, hasSparks: true,
      graffiti: 'TALLER'
    }
  ];

  /* ---------- caché de halos (mucho más rápido que un gradiente por frame) ---------- */
  const glowCache = new Map();
  function glow(col, r) {
    const key = col + '|' + (r | 0);
    let cv = glowCache.get(key);
    if (cv) return cv;
    const d = Math.max(4, (r | 0) * 2);
    cv = document.createElement('canvas');
    cv.width = d; cv.height = d;
    const g2 = cv.getContext('2d');
    const rg = g2.createRadialGradient(d / 2, d / 2, 1, d / 2, d / 2, d / 2);
    rg.addColorStop(0, alpha(col, 0.55));
    rg.addColorStop(0.45, alpha(col, 0.18));
    rg.addColorStop(1, alpha(col, 0));
    g2.fillStyle = rg;
    g2.fillRect(0, 0, d, d);
    if (glowCache.size > 24) glowCache.clear();
    glowCache.set(key, cv);
    return cv;
  }
  function drawGlow(ctx, col, x, y, r, a) {
    const cv = glow(col, r);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.drawImage(cv, x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  function pick(seed) {
    const rnd = mulberry32((seed || Date.now()) >>> 0);
    return LIST[Math.floor(rnd() * LIST.length) % LIST.length];
  }
  function byId(id) { return LIST.find((s) => s.id === id) || LIST[0]; }

  /* ============================================
     PINTORES COMPARTIDOS (capa estática)
     ============================================ */
  function paintSky(b, W, hz, d, rnd) {
    const bands = d.sky;
    const bandH = hz / bands.length;
    for (let i = 0; i < bands.length; i++) {
      b.fillStyle = bands[i];
      b.fillRect(0, Math.floor(i * bandH), W, Math.ceil(bandH) + 1);
    }
    // banda de transición con dithering (look PS1)
    for (let i = 1; i < bands.length; i++) {
      b.fillStyle = bands[i - 1];
      const y0 = Math.floor(i * bandH);
      for (let x = 0; x < W; x += 2) {
        if ((x >> 1) % 2 === 0) b.fillRect(x, y0, 2, 2);
      }
    }

    if (d.hasStars) {
      for (let i = 0; i < 130; i++) {
        const x = rnd() * W, y = rnd() * hz * 0.72;
        const a = 0.25 + rnd() * 0.7;
        b.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
        b.fillRect(x | 0, y | 0, rnd() < 0.15 ? 2 : 1, rnd() < 0.15 ? 2 : 1);
      }
    }
    if (d.hasMoon) {
      const mx = W * 0.78, my = hz * 0.2, mr = Math.max(16, W * 0.035);
      const g = b.createRadialGradient(mx, my, mr * 0.4, mx, my, mr * 3.4);
      g.addColorStop(0, 'rgba(210,230,255,0.5)');
      g.addColorStop(1, 'rgba(210,230,255,0)');
      b.fillStyle = g;
      b.beginPath(); b.arc(mx, my, mr * 3.4, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#e9f1ff';
      b.beginPath(); b.arc(mx, my, mr, 0, Math.PI * 2); b.fill();
      b.fillStyle = 'rgba(150,170,200,0.35)';
      b.beginPath(); b.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.22, 0, Math.PI * 2); b.fill();
      b.beginPath(); b.arc(mx + mr * 0.25, my + mr * 0.3, mr * 0.16, 0, Math.PI * 2); b.fill();
    }
    if (d.hasSun) {
      const sx = W * 0.74, sy = hz * 0.6, sr = Math.max(18, W * 0.05);
      const g = b.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 4);
      g.addColorStop(0, 'rgba(255,200,110,0.45)');
      g.addColorStop(1, 'rgba(255,200,110,0)');
      b.fillStyle = g;
      b.beginPath(); b.arc(sx, sy, sr * 4, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#ffdc92';
      b.beginPath(); b.arc(sx, sy, sr, 0, Math.PI * 2); b.fill();
      // cortes horizontales retro
      const bandH2 = hz / d.sky.length;
      b.fillStyle = d.sky[Math.min(d.sky.length - 1, Math.floor(sy / bandH2))];
      b.fillRect(sx - sr, sy + sr * 0.22, sr * 2, 3);
      b.fillRect(sx - sr, sy + sr * 0.52, sr * 2, 4);
      b.fillRect(sx - sr, sy + sr * 0.78, sr * 2, 5);
    }
    // nubes planas
    const cl = d.mood === 'day' ? 5 : 3;
    for (let i = 0; i < cl; i++) {
      const cx = rnd() * W, cy = hz * (0.08 + rnd() * 0.3);
      const cw = W * (0.12 + rnd() * 0.16), chh = Math.max(6, hz * 0.03);
      b.fillStyle = d.mood === 'day' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.10)';
      b.beginPath();
      b.ellipse(cx, cy, cw * 0.5, chh, 0, 0, Math.PI * 2);
      b.ellipse(cx + cw * 0.24, cy - chh * 0.5, cw * 0.3, chh * 0.8, 0, 0, Math.PI * 2);
      b.ellipse(cx - cw * 0.26, cy + chh * 0.2, cw * 0.26, chh * 0.7, 0, 0, Math.PI * 2);
      b.fill();
    }
  }

  function paintFarSkyline(b, W, hz, d, rnd) {
    b.fillStyle = d.far;
    let x = -14;
    while (x < W + 20) {
      const bw = 34 + rnd() * 74;
      const bh = hz * (0.18 + rnd() * 0.28);
      b.fillStyle = d.far;
      b.fillRect(x, hz - bh, bw, bh);
      b.fillStyle = shade(d.far, -0.18);
      b.fillRect(x, hz - bh, bw, 4);
      if (rnd() < 0.55) b.fillRect(x + bw * 0.3, hz - bh - 10 - rnd() * 16, 2, 16 + rnd() * 12);
      if (rnd() < 0.3) { // depósito
        b.fillRect(x + bw * 0.58, hz - bh - 10, 12, 10);
        b.fillRect(x + bw * 0.6, hz - bh - 14, 8, 4);
      }
      if (rnd() < 0.25) { // antena parabólica
        b.beginPath();
        b.arc(x + bw * 0.2, hz - bh - 6, 5, Math.PI * 0.9, Math.PI * 2.1);
        b.fill();
      }
      // ventanas encendidas
      const cols = Math.floor(bw / 11), rows = Math.floor(bh / 15);
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
        if (rnd() < (d.mood === 'day' ? 0.10 : 0.22)) {
          b.fillStyle = alpha(d.win, 0.55 + rnd() * 0.4);
          b.fillRect(x + 4 + c * 11, hz - bh + 6 + r * 15, 4, 5);
        }
      }
      x += bw + 3 + rnd() * 16;
    }
  }

  function paintNearBuildings(b, W, hz, d, rnd, wallY) {
    let x = -24;
    while (x < W + 30) {
      const bw = 74 + rnd() * 116;
      const bh = (hz - wallY) + (hz * (0.2 + rnd() * 0.26));
      const top = hz - bh;
      b.fillStyle = d.near;
      b.fillRect(x, top, bw, bh);
      b.fillStyle = d.nearTop;
      b.fillRect(x, top, bw, 6);
      b.fillStyle = alpha('#000', 0.18);
      b.fillRect(x + bw - 5, top, 5, bh);

      // ventanas con persianas y balcones
      const cols = Math.max(1, Math.floor((bw - 16) / 24));
      const rows = Math.max(1, Math.floor((bh - 26) / 30));
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
        const wx = x + 10 + c * 24, wy = top + 14 + r * 30;
        if (wy > wallY - 6) continue;
        const lit = rnd() < (d.mood === 'day' ? 0.08 : 0.26);
        b.fillStyle = lit ? alpha(d.win, 0.9) : shade(d.near, -0.35);
        b.fillRect(wx, wy, 13, 16);
        b.fillStyle = alpha('#000', 0.5);
        b.fillRect(wx - 1, wy - 1, 15, 2);
        if (rnd() < 0.45) { // persiana medio bajada
          b.fillStyle = shade(d.near, 0.16);
          const ph = 4 + Math.floor(rnd() * 10);
          b.fillRect(wx, wy, 13, ph);
          b.fillStyle = alpha('#000', 0.3);
          for (let l = 2; l < ph; l += 3) b.fillRect(wx, wy + l, 13, 1);
        }
        if (rnd() < 0.22) { // barandilla de balcón
          b.strokeStyle = alpha('#000', 0.55);
          b.lineWidth = 1;
          b.beginPath();
          b.moveTo(wx - 3, wy + 19); b.lineTo(wx + 16, wy + 19);
          b.stroke();
          for (let k = 0; k < 5; k++) {
            b.beginPath();
            b.moveTo(wx - 2 + k * 4, wy + 16); b.lineTo(wx - 2 + k * 4, wy + 19);
            b.stroke();
          }
        }
        if (rnd() < 0.18) { // aparato de aire acondicionado
          b.fillStyle = shade(d.near, 0.3);
          b.fillRect(wx + 14, wy + 4, 8, 8);
          b.fillStyle = alpha('#000', 0.4);
          b.fillRect(wx + 15, wy + 6, 6, 1);
          b.fillRect(wx + 15, wy + 9, 6, 1);
        }
      }
      // rótulo de comercio
      if (rnd() < 0.5 && wallY - top > 40) {
        const sw = bw * (0.4 + rnd() * 0.4);
        const sy = wallY - 26 - rnd() * 20;
        b.fillStyle = shade(d.near, -0.4);
        b.fillRect(x + 8, sy, sw, 14);
        b.fillStyle = alpha(d.win, 0.75);
        b.fillRect(x + 10, sy + 2, sw - 4, 10);
        b.fillStyle = alpha('#000', 0.5);
        for (let k = 0; k < 5; k++) b.fillRect(x + 14 + k * (sw / 6), sy + 5, sw / 12, 4);
      }
      x += bw + 6 + rnd() * 22;
    }
  }

  function paintWall(b, W, hz, d, rnd, wallY, wallH) {
    // muro base
    const g = b.createLinearGradient(0, wallY, 0, hz);
    g.addColorStop(0, shade(d.wall, 0.12));
    g.addColorStop(0.55, d.wall);
    g.addColorStop(1, deep(d.wall, 0.4));
    b.fillStyle = g;
    b.fillRect(0, wallY, W, wallH);
    // albardilla (remate) con canto iluminado
    b.fillStyle = shade(d.wallTop, 0.25);
    b.fillRect(0, wallY - 4, W, 5);
    b.fillStyle = d.wallTop;
    b.fillRect(0, wallY + 1, W, 6);
    b.fillStyle = alpha('#000', 0.38);
    b.fillRect(0, wallY + 7, W, 3);

    // ladrillos
    b.strokeStyle = 'rgba(0,0,0,0.32)';
    b.lineWidth = 1;
    const bhh = Math.max(7, wallH * 0.09);
    for (let yy = wallY + bhh; yy < hz; yy += bhh) {
      b.beginPath(); b.moveTo(0, yy); b.lineTo(W, yy); b.stroke();
    }
    for (let xx = (rnd() * 20) | 0; xx < W; xx += 26) {
      b.beginPath();
      b.moveTo(xx, wallY + 10); b.lineTo(xx, hz);
      b.stroke();
    }
    // toque de luz en la mitad superior del muro
    const wl = b.createLinearGradient(0, wallY, 0, hz);
    wl.addColorStop(0, 'rgba(255,255,255,0.07)');
    wl.addColorStop(1, 'rgba(0,0,0,0.18)');
    b.fillStyle = wl;
    b.fillRect(0, wallY + 10, W, hz - wallY - 10);
    // manchas de humedad
    for (let i = 0; i < 8; i++) {
      const sx = rnd() * W, sy = wallY + rnd() * wallH * 0.6;
      b.fillStyle = alpha('#000', 0.06 + rnd() * 0.08);
      b.beginPath();
      b.ellipse(sx, sy, 10 + rnd() * 40, 6 + rnd() * 22, 0, 0, Math.PI * 2);
      b.fill();
    }
    // carteles pegados
    for (let i = 0; i < 3; i++) {
      const px = rnd() * (W - 60) + 10, py = wallY + 8 + rnd() * (wallH * 0.35);
      const pw = 26 + rnd() * 22, ph = 30 + rnd() * 16;
      b.save();
      b.translate(px, py);
      b.rotate((rnd() - 0.5) * 0.12);
      b.fillStyle = alpha('#e8e2d0', 0.82);
      b.fillRect(0, 0, pw, ph);
      b.fillStyle = alpha(i % 2 ? '#c03a3a' : '#2b4a8a', 0.85);
      b.fillRect(2, 2, pw - 4, ph * 0.34);
      b.fillStyle = 'rgba(0,0,0,0.4)';
      for (let l = 0; l < 4; l++) b.fillRect(3, ph * 0.42 + l * 5, pw - 8 - (l % 2) * 6, 2);
      b.restore();
    }
  }

  function paintGraffiti(b, W, d, wallY, wallH, acc1, acc2, text) {
    b.save();
    b.translate(W * 0.5, wallY + wallH * 0.52);
    b.rotate(-0.045);
    const fs = clamp(wallH * 0.42, 14, 40);
    b.font = '900 ' + fs + 'px monospace';
    b.textAlign = 'center';
    // relleno con degradado + contorno grueso
    b.lineWidth = fs * 0.28;
    b.strokeStyle = 'rgba(0,0,0,0.6)';
    b.strokeText(text, 0, 0);
    b.lineWidth = fs * 0.16;
    b.strokeStyle = shade(acc2, -0.25);
    b.strokeText(text, 4, 4);
    const g = b.createLinearGradient(0, -fs * 0.6, 0, fs * 0.4);
    g.addColorStop(0, shade(acc1, 0.35));
    g.addColorStop(1, shade(acc1, -0.15));
    b.fillStyle = g;
    b.fillText(text, 0, 0);
    b.restore();

    // goteos
    b.fillStyle = alpha(acc1, 0.8);
    for (let i = 0; i < 7; i++) {
      b.fillRect(W * 0.5 - 70 + i * 24, wallY + wallH * 0.62, 2, 5 + (i % 3) * 8);
    }
    // firma en spray
    b.strokeStyle = acc2;
    b.lineWidth = 3;
    b.beginPath();
    b.moveTo(W * 0.11, wallY + wallH * 0.5);
    b.quadraticCurveTo(W * 0.15, wallY + wallH * 0.18, W * 0.19, wallY + wallH * 0.56);
    b.quadraticCurveTo(W * 0.22, wallY + wallH * 0.82, W * 0.25, wallY + wallH * 0.38);
    b.stroke();
    b.strokeStyle = alpha('#ffffff', 0.7);
    b.lineWidth = 2;
    b.beginPath();
    b.arc(W * 0.85, wallY + wallH * 0.48, wallH * 0.2, 0, Math.PI * 2);
    b.stroke();
    b.beginPath();
    b.moveTo(W * 0.85 - wallH * 0.2, wallY + wallH * 0.48);
    b.lineTo(W * 0.85 + wallH * 0.2, wallY + wallH * 0.48);
    b.stroke();
  }

  function paintFloor(b, W, H, hz, d, rnd) {
    const floorH = H - hz;
    // asfalto con degradado (más claro cerca del muro)
    const g = b.createLinearGradient(0, hz, 0, H);
    g.addColorStop(0, shade(d.asphalt, 0.16));
    g.addColorStop(1, deep(d.asphalt, 0.35));
    b.fillStyle = g;
    b.fillRect(0, hz, W, floorH);

    // acera con bordillo
    const sideH = floorH * 0.32;
    b.fillStyle = d.side;
    b.fillRect(0, hz, W, sideH);
    b.fillStyle = shade(d.side, 0.2);
    b.fillRect(0, hz + sideH - 4, W, 4);
    b.fillStyle = alpha('#000', 0.35);
    b.fillRect(0, hz + sideH, W, 3);
    // losas en perspectiva
    b.strokeStyle = 'rgba(0,0,0,0.22)';
    b.lineWidth = 1;
    for (let i = 0; i <= 16; i++) {
      const tx = (i / 16) * W;
      b.beginPath();
      b.moveTo(tx, hz);
      b.lineTo(lerp(tx, W / 2, -0.14), hz + sideH);
      b.stroke();
    }
    b.beginPath();
    b.moveTo(0, hz + sideH * 0.5); b.lineTo(W, hz + sideH * 0.5); b.stroke();

    // textura de asfalto (granulado)
    for (let i = 0; i < Math.floor((W * floorH) / 260); i++) {
      const x = rnd() * W, y = hz + sideH + rnd() * (floorH - sideH);
      b.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.18)';
      b.fillRect(x | 0, y | 0, 1 + ((rnd() * 2) | 0), 1);
    }
    // líneas de fuga
    b.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i <= 10; i++) {
      const tx = (i / 10) * W;
      b.beginPath();
      b.moveTo(W / 2 + (tx - W / 2) * 0.22, hz + sideH);
      b.lineTo(tx, H);
      b.stroke();
    }
    // pintura vial
    b.fillStyle = 'rgba(228,190,70,0.42)';
    for (let i = 0; i < 6; i++) {
      const ww = 24 + rnd() * 22;
      b.fillRect(W * 0.06 + i * (W * 0.17), H - floorH * 0.26, ww, 5);
    }
    // grietas
    b.strokeStyle = 'rgba(0,0,0,0.42)';
    b.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      let cx = rnd() * W, cy = hz + sideH + rnd() * (floorH - sideH);
      b.beginPath(); b.moveTo(cx, cy);
      for (let k = 0; k < 5; k++) {
        cx += (rnd() - 0.5) * 44; cy += rnd() * 10;
        b.lineTo(cx, cy);
      }
      b.stroke();
    }
    // alcantarilla
    const mx = W * 0.68, my = hz + floorH * 0.66, mr = Math.max(18, W * 0.03);
    b.fillStyle = shade(d.asphalt, -0.35);
    b.beginPath(); b.ellipse(mx, my, mr, mr * 0.3, 0, 0, Math.PI * 2); b.fill();
    b.strokeStyle = 'rgba(255,255,255,0.09)';
    b.beginPath(); b.ellipse(mx, my, mr * 0.82, mr * 0.24, 0, 0, Math.PI * 2); b.stroke();
    for (let i = -2; i <= 2; i++) {
      b.beginPath();
      b.moveTo(mx + i * mr * 0.28, my - mr * 0.18);
      b.lineTo(mx + i * mr * 0.28, my + mr * 0.18);
      b.stroke();
    }
    // sombra de contacto general
    b.fillStyle = 'rgba(0,0,0,0.22)';
    b.fillRect(0, H - floorH * 0.2, W, floorH * 0.2);
  }

  function paintStreetLight(b, W, H, hz, d, x) {
    const fph = H * 0.42;
    b.fillStyle = '#171220';
    b.fillRect(x - 3, hz - fph, 6, fph);
    b.fillRect(x - 3, hz - fph, 34, 5);
    b.fillStyle = shade(d.light, -0.1);
    b.fillRect(x + 22, hz - fph + 5, 14, 7);
    const g = b.createRadialGradient(x + 29, hz - fph + 8, 4, x + 29, hz - fph + 8, H * 0.3);
    g.addColorStop(0, alpha(d.light, 0.35));
    g.addColorStop(1, alpha(d.light, 0));
    b.fillStyle = g;
    b.beginPath();
    b.moveTo(x + 29, hz - fph + 8);
    b.lineTo(x - 30, hz + (H - hz) * 0.5);
    b.lineTo(x + 90, hz + (H - hz) * 0.5);
    b.closePath();
    b.fill();
  }

  function paintProps(b, W, H, hz, d, rnd) {
    const floorH = H - hz;
    const base = hz + floorH * 0.22;
    // contenedores y cajas contra el muro
    function bin(x, s) {
      b.fillStyle = '#2f4a3a';
      b.fillRect(x, base - 34 * s, 30 * s, 34 * s);
      b.fillStyle = '#25392d';
      b.fillRect(x, base - 38 * s, 30 * s, 6 * s);
      b.fillStyle = alpha('#fff', 0.08);
      b.fillRect(x + 3 * s, base - 30 * s, 4 * s, 26 * s);
      b.strokeStyle = 'rgba(0,0,0,0.5)';
      b.lineWidth = 1;
      b.strokeRect(x, base - 38 * s, 30 * s, 38 * s);
      b.fillStyle = 'rgba(0,0,0,0.35)';
      b.beginPath();
      b.ellipse(x + 15 * s, base + 2, 20 * s, 4 * s, 0, 0, Math.PI * 2);
      b.fill();
    }
    function crate(x, y, s) {
      b.fillStyle = '#8a6236';
      b.fillRect(x, y - 20 * s, 26 * s, 20 * s);
      b.strokeStyle = '#5f4423'; b.lineWidth = 2;
      b.strokeRect(x, y - 20 * s, 26 * s, 20 * s);
      b.beginPath();
      b.moveTo(x, y - 20 * s); b.lineTo(x + 26 * s, y);
      b.moveTo(x + 26 * s, y - 20 * s); b.lineTo(x, y);
      b.stroke();
    }
    bin(W * 0.06, 1);
    crate(W * 0.16, base, 1);
    crate(W * 0.165, base - 20, 0.9);
    if (d.hasTires) {
      for (let i = 0; i < 3; i++) {
        const x = W * 0.88, y = base - 12 * i;
        b.strokeStyle = '#22222a'; b.lineWidth = 7;
        b.beginPath(); b.ellipse(x, y, 18, 8, 0, 0, Math.PI * 2); b.stroke();
        b.strokeStyle = '#3a3a44'; b.lineWidth = 2;
        b.beginPath(); b.ellipse(x, y, 18, 8, 0, 0, Math.PI * 2); b.stroke();
      }
    }
    if (d.hasBins) {
      bin(W * 0.8, 1.15);
      b.fillStyle = 'rgba(0,0,0,0.4)';
      b.fillRect(W * 0.78, base - 6, 60, 6);
    }
    if (d.hasStalls) {
      // puesto de mercado con toldo a rayas
      const sx = W * 0.02, sw = W * 0.3, sy = hz - 6;
      b.fillStyle = '#6b4a2a';
      b.fillRect(sx, sy - 40, sw, 8);
      for (let i = 0; i < 8; i++) {
        b.fillStyle = i % 2 ? '#d8433c' : '#f2ece0';
        b.fillRect(sx + (sw / 8) * i, sy - 56, sw / 8, 16);
      }
      b.fillStyle = '#4d3520';
      b.fillRect(sx + 4, sy - 34, 6, 34);
      b.fillRect(sx + sw - 12, sy - 34, 6, 34);
      // fruta
      const cols = ['#e0452e', '#f0a02a', '#8ec03a', '#c8462e'];
      for (let i = 0; i < 22; i++) {
        b.fillStyle = cols[i % cols.length];
        b.beginPath();
        b.arc(sx + 12 + (i % 11) * (sw / 12), sy - 44 + Math.floor(i / 11) * 7, 4, 0, Math.PI * 2);
        b.fill();
      }
    }
    if (d.hasFireEscape) {
      // escalera de incendios
      b.strokeStyle = '#20182c'; b.lineWidth = 3;
      const ex = W * 0.74, top = hz - H * 0.42;
      b.beginPath(); b.moveTo(ex, top); b.lineTo(ex, hz - 40); b.stroke();
      b.beginPath(); b.moveTo(ex + 54, top); b.lineTo(ex + 54, hz - 40); b.stroke();
      for (let y = top; y < hz - 40; y += 16) {
        b.beginPath(); b.moveTo(ex, y); b.lineTo(ex + 54, y); b.stroke();
      }
      b.lineWidth = 5;
      b.beginPath(); b.moveTo(ex - 6, top + 40); b.lineTo(ex + 60, top + 40); b.stroke();
    }
    if (d.hasTanks) {
      // depósito de agua sobre la azotea
      const tx = W * 0.16, ty = hz - 130;
      b.fillStyle = '#4a3a2c';
      b.fillRect(tx, ty, 60, 54);
      b.fillStyle = '#5a4737';
      b.beginPath();
      b.moveTo(tx - 6, ty); b.lineTo(tx + 30, ty - 18); b.lineTo(tx + 66, ty); b.closePath(); b.fill();
      b.strokeStyle = 'rgba(0,0,0,0.5)'; b.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        b.beginPath(); b.moveTo(tx, ty + i * 13); b.lineTo(tx + 60, ty + i * 13); b.stroke();
      }
      b.fillStyle = '#2c2620';
      b.fillRect(tx + 6, ty + 54, 6, 30);
      b.fillRect(tx + 48, ty + 54, 6, 30);
    }
    if (d.hasTools) {
      // panel de herramientas
      const px = W * 0.55, py = hz - 118;
      b.fillStyle = '#4a4038';
      b.fillRect(px, py, 130, 70);
      b.strokeStyle = 'rgba(0,0,0,0.5)'; b.lineWidth = 2;
      b.strokeRect(px, py, 130, 70);
      b.fillStyle = '#9aa0aa';
      for (let i = 0; i < 5; i++) {
        b.fillRect(px + 12 + i * 24, py + 10, 5, 34);
        b.beginPath(); b.arc(px + 14 + i * 24, py + 46, 7, 0, Math.PI * 2); b.fill();
      }
      b.fillStyle = '#c8a24a';
      b.fillRect(px + 96, py + 12, 26, 14);
    }
    if (d.hasShutter) {
      // persiana metálica de garaje
      const sx = W * 0.04, sw = W * 0.38, sh = H * 0.3, sy = hz - sh;
      b.fillStyle = '#6b6157';
      b.fillRect(sx, sy, sw, sh);
      b.fillStyle = 'rgba(0,0,0,0.25)';
      for (let y = sy; y < hz; y += 8) b.fillRect(sx, y, sw, 3);
      b.fillStyle = '#463f38';
      b.fillRect(sx - 5, sy - 8, sw + 10, 10);
      b.fillStyle = alpha('#e04a2a', 0.8);
      b.fillRect(sx + sw * 0.2, sy + sh * 0.3, sw * 0.6, 16);
    }
  }

  /* ============================================
     INSTANCIA DE ESCENARIO
     ============================================ */
  function create(def, W, H, groundY, dpr, opts = {}) {
    const d = def;
    const rnd = mulberry32(1234567 + (d.id.charCodeAt(0) * 977) + (d.id.charCodeAt(1) * 31));
    const hz = groundY;
    const wallH = Math.max(38, H * 0.17);
    const wallY = hz - wallH;

    // ---- capa estática de fondo ----
    const back = document.createElement('canvas');
    back.width = Math.max(1, Math.floor(W * dpr));
    back.height = Math.max(1, Math.floor(H * dpr));
    const b = back.getContext('2d');
    b.setTransform(dpr, 0, 0, dpr, 0, 0);
    b.imageSmoothingEnabled = false;

    paintSky(b, W, hz, d, rnd);
    paintFarSkyline(b, W, hz, d, rnd);
    paintNearBuildings(b, W, hz, d, rnd, wallY);
    paintWall(b, W, hz, d, rnd, wallY, wallH);
    paintGraffiti(b, W, d, wallY, wallH,
      (opts.acc1 || '#ffe600'), (opts.acc2 || '#ff00ff'), d.graffiti || 'BARRIO');
    if (!d.hasShutter) paintStreetLight(b, W, H, hz, d, W * 0.09);
    paintFloor(b, W, H, hz, d, rnd);
    paintProps(b, W, H, hz, d, rnd);

    // atmósfera general (tinte del escenario)
    const amb = b.createLinearGradient(0, 0, 0, H);
    amb.addColorStop(0, alpha(d.light, d.lightAmt * 0.9));
    amb.addColorStop(0.6, alpha(d.light, d.lightAmt * 0.35));
    amb.addColorStop(1, 'rgba(0,0,0,0.25)');
    b.fillStyle = amb;
    b.fillRect(0, 0, W, H);

    /* ---- elementos animados ---- */
    const laundry = [];
    if (d.hasLaundry) {
      for (let i = 0; i < 3; i++) {
        const y = wallY - 54 - i * 40;
        const x0 = W * (0.08 + i * 0.26), x1 = x0 + W * (0.18 + rnd() * 0.12);
        const items = [];
        const n = 3 + Math.floor(rnd() * 3);
        for (let k = 0; k < n; k++) {
          items.push({
            t: (k + 1) / (n + 1),
            w: 8 + rnd() * 8, h: 11 + rnd() * 11,
            col: ['#e8e2d0', '#d84a4a', '#4a7ad8', '#e8c34a', '#5ac878'][(k + i) % 5],
            ph: rnd() * 6.28
          });
        }
        if (y > 10) laundry.push({ x0, x1, y, items });
      }
    }

    const crowd = [];
    if (d.hasCrowd) {
      const n = 5 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        crowd.push({
          x: W * (0.04 + rnd() * 0.92),
          h: wallH * (0.34 + rnd() * 0.2),
          ph: rnd() * 6.28,
          col: rnd() < 0.5 ? '#140d1e' : '#1d1429'
        });
      }
    }

    const neons = [];
    if (d.hasNeon) {
      const words = d.id === 'callejon'
        ? ['BAR', 'KEBAB', '24H', 'PEÑA']
        : ['HOSTAL', 'BAR', 'LOTO'];
      const cols = ['#ff5ecf', '#5ef0ff', '#ffe45e', '#7dff8a'];
      const n = 2 + Math.floor(rnd() * 2);
      for (let i = 0; i < n; i++) {
        neons.push({
          x: W * (0.12 + rnd() * 0.7),
          y: wallY - 20 - rnd() * (H * 0.18),
          text: words[i % words.length],
          col: cols[i % cols.length],
          size: clamp(wallH * 0.3, 10, 22),
          ph: rnd() * 6.28,
          rate: 1.4 + rnd() * 2.6,
          vertical: rnd() < 0.4
        });
      }
    }

    const bulbs = [];
    if (d.hasBulbs) {
      const n = 10;
      for (let i = 0; i < n; i++) {
        bulbs.push({ t: i / (n - 1), ph: i * 0.6 });
      }
    }

    const lamps = [];
    if (d.hasLamps) {
      for (let i = 0; i < 3; i++) {
        lamps.push({ x: W * (0.2 + i * 0.3), y: H * 0.1, len: H * 0.16, ph: i * 1.7 });
      }
    }

    const birds = [];
    if (d.hasBirds) {
      for (let i = 0; i < 4; i++) {
        birds.push({
          x: rnd() * W, y: hz * (0.18 + rnd() * 0.3),
          v: 14 + rnd() * 26, ph: rnd() * 6.28, s: 3 + rnd() * 3
        });
      }
    }

    const rain = [];
    if (d.hasRain) {
      for (let i = 0; i < 90; i++) {
        rain.push({
          x: rnd() * W, y: rnd() * H,
          v: 480 + rnd() * 420, len: 8 + rnd() * 14, a: 0.1 + rnd() * 0.22
        });
      }
    }

    const steam = [];
    if (d.hasSteam) {
      for (let i = 0; i < 14; i++) {
        steam.push({
          x: W * 0.63 + (rnd() - 0.5) * 26,
          y: hz - rnd() * 40,
          r: 8 + rnd() * 16,
          v: 8 + rnd() * 14,
          a: 0.05 + rnd() * 0.08
        });
      }
    }

    let carT = -3 - rnd() * 6;
    let sparkT = 0;

    /* ---- dibujo animado detrás de los luchadores ---- */
    function drawBack(ctx, t) {
      ctx.drawImage(back, 0, 0, W, H);

      // público asomado por encima del muro (recortado: quedan detrás)
      if (crowd.length) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, wallY + 3);
        ctx.clip();
      }
      for (const c of crowd) {
        const bob = Math.sin(t * 3 + c.ph) * wallH * 0.03;
        const y = wallY + wallH * 0.5;
        ctx.fillStyle = c.col;
        ctx.beginPath();
        ctx.ellipse(c.x, y - c.h * 0.5 + bob, c.h * 0.2, c.h * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(c.x, y - c.h + bob, c.h * 0.19, 0, Math.PI * 2);
        ctx.fill();
        // brazos animando
        ctx.strokeStyle = c.col;
        ctx.lineWidth = Math.max(2, c.h * 0.08);
        const sw = Math.sin(t * 6 + c.ph) * 0.5;
        ctx.beginPath();
        ctx.moveTo(c.x - c.h * 0.16, y - c.h * 0.72 + bob);
        ctx.lineTo(c.x - c.h * 0.3, y - c.h * (0.95 + sw * 0.2) + bob);
        ctx.moveTo(c.x + c.h * 0.16, y - c.h * 0.72 + bob);
        ctx.lineTo(c.x + c.h * 0.3, y - c.h * (0.95 - sw * 0.2) + bob);
        ctx.stroke();
      }
      if (crowd.length) ctx.restore();

      // ropa tendida con balanceo
      for (const L of laundry) {
        const sag = Math.sin(t * 0.9) * 3;
        ctx.strokeStyle = 'rgba(20,14,26,0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(L.x0, L.y);
        ctx.quadraticCurveTo((L.x0 + L.x1) / 2, L.y + 10 + sag, L.x1, L.y);
        ctx.stroke();
        for (const it of L.items) {
          const x = lerp(L.x0, L.x1, it.t);
          const yy = L.y + (10 + sag) * (1 - Math.abs(it.t - 0.5) * 2) * 0.6;
          const rot = Math.sin(t * 1.6 + it.ph) * 0.14;
          ctx.save();
          ctx.translate(x, yy);
          ctx.rotate(rot);
          ctx.fillStyle = it.col;
          ctx.fillRect(-it.w / 2, 0, it.w, it.h);
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(-it.w / 2, 0, it.w, 3);
          ctx.restore();
        }
      }

      // neones parpadeantes
      for (const n of neons) {
        const flick = 0.72 + 0.28 * Math.sin(t * n.rate + n.ph)
          + (Math.sin(t * 31 + n.ph) > 0.93 ? -0.5 : 0);
        const a = clamp(flick, 0.15, 1);
        ctx.save();
        ctx.font = '900 ' + n.size + 'px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        drawGlow(ctx, n.col, n.x, n.y, n.size * 3, 0.8 * a);
        // caja del rótulo
        ctx.fillStyle = 'rgba(10,8,16,0.8)';
        if (n.vertical) {
          ctx.fillRect(n.x - n.size * 0.8, n.y - n.size * 0.8,
            n.size * 1.6, n.size * (n.text.length * 1.05));
        } else {
          ctx.fillRect(n.x - n.size * n.text.length * 0.42, n.y - n.size * 0.75,
            n.size * n.text.length * 0.84, n.size * 1.5);
        }
        ctx.fillStyle = alpha(n.col, a);
        if (n.vertical) {
          for (let i = 0; i < n.text.length; i++) {
            ctx.fillText(n.text[i], n.x, n.y + i * n.size * 1.02);
          }
        } else {
          ctx.fillText(n.text, n.x, n.y);
        }
        ctx.restore();
      }

      // guirnalda de bombillas
      if (bulbs.length) {
        const x0 = W * 0.05, x1 = W * 0.95, y0 = hz - wallH - 18;
        ctx.strokeStyle = 'rgba(20,14,26,0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo((x0 + x1) / 2, y0 + 26, x1, y0);
        ctx.stroke();
        for (const bl of bulbs) {
          const x = lerp(x0, x1, bl.t);
          const y = y0 + 26 * (1 - Math.pow(bl.t * 2 - 1, 2)) * 0.75;
          const a = 0.55 + 0.45 * Math.sin(t * 2 + bl.ph);
          drawGlow(ctx, '#ffe296', x, y + 5, 16, a);
          ctx.fillStyle = 'rgba(255,236,180,' + (0.7 + 0.3 * a).toFixed(2) + ')';
          ctx.beginPath(); ctx.arc(x, y + 5, 3.2, 0, Math.PI * 2); ctx.fill();
        }
      }

      // lámparas de taller colgando
      for (const lp of lamps) {
        const sw = Math.sin(t * 1.1 + lp.ph) * 8;
        const bx = lp.x + sw, by = lp.y + lp.len;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(lp.x, lp.y); ctx.lineTo(bx, by); ctx.stroke();
        ctx.fillStyle = '#2a2620';
        ctx.beginPath();
        ctx.moveTo(bx - 14, by); ctx.lineTo(bx + 14, by); ctx.lineTo(bx + 8, by - 10);
        ctx.lineTo(bx - 8, by - 10); ctx.closePath(); ctx.fill();
        drawGlow(ctx, '#ffe3a8', bx, by + 6, 40, 0.7);
        ctx.fillStyle = 'rgba(255,227,168,0.06)';
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - H * 0.16, hz);
        ctx.lineTo(bx + H * 0.16, hz);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffe9b0';
        ctx.beginPath(); ctx.arc(bx, by + 4, 4, 0, Math.PI * 2); ctx.fill();
      }

      // palomas
      for (const bd of birds) {
        bd.x += bd.v * 0.016;
        if (bd.x > W + 20) bd.x = -20;
        const flap = Math.sin(t * 9 + bd.ph);
        ctx.strokeStyle = 'rgba(20,16,26,0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bd.x - bd.s, bd.y - flap * bd.s * 0.7);
        ctx.lineTo(bd.x, bd.y);
        ctx.lineTo(bd.x + bd.s, bd.y - flap * bd.s * 0.7);
        ctx.stroke();
      }

      // coche que pasa por delante del muro (luz en movimiento)
      if (d.hasCars) {
        carT += 0.016;
        if (carT > 9) carT = -4 - Math.random() * 6;
        if (carT > 0 && carT < 5) {
          const p = carT / 5;
          const cx = lerp(-W * 0.2, W * 1.2, p);
          const cy = hz + (H - hz) * 0.12;
          drawGlow(ctx, '#ffe6aa', cx, cy, W * 0.16, 0.55);
          ctx.fillStyle = 'rgba(12,8,18,0.85)';
          ctx.fillRect(cx - 34, cy - 16, 68, 16);
          ctx.fillRect(cx - 22, cy - 26, 40, 12);
          ctx.fillStyle = '#ffe9a8';
          ctx.fillRect(cx + 30, cy - 12, 6, 5);
          ctx.fillStyle = '#e04a3a';
          ctx.fillRect(cx - 36, cy - 12, 5, 5);
        }
      }

      // vapor de alcantarilla
      for (const s of steam) {
        s.y -= s.v * 0.016;
        if (s.y < hz - H * 0.32) { s.y = hz - 4; }
        ctx.fillStyle = 'rgba(210,220,235,' + s.a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(s.x + Math.sin(t + s.r) * 6, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // chispas de soldadura
      if (d.hasSparks) {
        sparkT += 0.016;
        if (sparkT % 3.6 < 0.5) {
          const sx = W * 0.62, sy = hz - 40;
          drawGlow(ctx, '#bee1ff', sx, sy, 60, 0.9);
          ctx.strokeStyle = 'rgba(255,240,200,0.9)';
          ctx.lineWidth = 1.5;
          for (let i = 0; i < 8; i++) {
            const an = Math.PI * (0.6 + Math.random() * 0.8);
            const ln = 10 + Math.random() * 26;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(an) * ln, sy + Math.sin(an) * ln);
            ctx.stroke();
          }
        }
      }
    }

    /* ---- dibujo delante de los luchadores ---- */
    function drawFore(ctx, t) {
      // lluvia (delante para dar profundidad)
      if (rain.length) {
        ctx.strokeStyle = 'rgba(190,215,255,0.5)';
        ctx.lineWidth = 1;
        for (const r of rain) {
          r.y += r.v * 0.016;
          r.x += r.v * 0.0035;
          if (r.y > H) { r.y = -20; r.x = Math.random() * W; }
          ctx.globalAlpha = r.a;
          ctx.beginPath();
          ctx.moveTo(r.x, r.y);
          ctx.lineTo(r.x - r.len * 0.22, r.y - r.len);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      // reflejos húmedos en el asfalto
      if (d.hasRain || d.mood === 'night') {
        const gl = ctx.createLinearGradient(0, hz, 0, H);
        gl.addColorStop(0, alpha(d.light, 0.10));
        gl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gl;
        ctx.fillRect(0, hz, W, H - hz);
      }
      // motas de polvo suspendidas
      ctx.fillStyle = 'rgba(255,240,210,0.22)';
      for (let i = 0; i < 16; i++) {
        const ph = i * 1.7;
        const x = ((i / 16) * W + Math.sin(t * 0.4 + ph) * 30 + W) % W;
        const y = hz - ((t * 6 + i * 40) % (H * 0.5)) - 10;
        ctx.fillRect(x | 0, y | 0, 2, 2);
      }
    }

    return {
      def: d, name: d.name, wallY, wallH,
      drawBack, drawFore
    };
  }

  return { LIST, pick, byId, create };
})();

window.Stages = Stages;
