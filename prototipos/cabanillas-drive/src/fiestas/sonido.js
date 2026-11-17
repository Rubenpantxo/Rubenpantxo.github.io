// Sonido del modo fiestas (F6). Todo sintetizado aquí con Web Audio, sin grabaciones: al entrar
// se «graban» unos sonidos cortos en un OfflineAudioContext (murmullo de la gente, olé, aplausos,
// «¡uy!», cencerros, pezuñas, pisadas en la arena, golpe en la valla y cohete) y luego se tocan
// cuando hace falta. Los de las vacas y la valla suenan donde ocurren (izquierda, derecha, lejos).
// M o 🔊 lo quitan y lo ponen; se recuerda en el navegador.
import { Vector3 } from 'three';
import { FIESTAS } from '../config/fiestas.js';

const CLAVE = 'cabanillas.sonido';
const TASA = 24000;                   // de sobra para estos sonidos y la mitad de trabajo al grabarlos

function azarCon(semilla) {
  let s = semilla >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Graba «segundos» de sonido con lo que monte «monta(ctx, salida, azar)» y devuelve el AudioBuffer.
// Con «bucle», graba un poco más y funde el final con el principio para que no se note el corte.
async function graba(segundos, monta, { canales = 1, semilla = 1, bucle = 0 } = {}) {
  const ctx = new OfflineAudioContext(canales, Math.ceil((segundos + bucle) * TASA), TASA);
  const azar = azarCon(semilla);
  const salida = ctx.createGain();
  salida.connect(ctx.destination);
  monta(ctx, salida, azar);
  const buffer = await ctx.startRendering();
  let pico = 0;
  for (let c = 0; c < canales; c++) for (const v of buffer.getChannelData(c)) pico = Math.max(pico, Math.abs(v));
  const n = Math.ceil(segundos * TASA);
  const fundido = Math.ceil(bucle * TASA);
  const final = new AudioBuffer({ numberOfChannels: canales, length: n, sampleRate: TASA });
  for (let c = 0; c < canales; c++) {
    const d = buffer.getChannelData(c);
    const o = final.getChannelData(c);
    const k = pico > 0 ? 0.9 / pico : 1;           // normalizado: el volumen se pone al tocarlo
    for (let i = 0; i < n; i++) o[i] = d[i] * k;
    for (let i = 0; i < fundido; i++) { const t = i / fundido; o[i] = (d[i] * t + d[n + i] * (1 - t)) * k; }
  }
  return final;
}

function ruido(ctx, segundos, azar) {
  const b = ctx.createBuffer(1, Math.ceil(segundos * ctx.sampleRate), ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = azar() * 2 - 1;
  return b;
}
function fuenteRuido(ctx, buffer) { const s = ctx.createBufferSource(); s.buffer = buffer; s.loop = true; return s; }
function filtro(ctx, tipo, frecuencia, q = 1) { const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = frecuencia; f.Q.value = q; return f; }
// Golpe seco: ganancia que sube en «ataque» y cae con constante «caida»
function golpeDe(ctx, g, t, pico, caida, ataque = 0.002) {
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(pico, t + ataque);
  g.gain.setTargetAtTime(0, t + ataque, caida);
}

// Una voz: diente de sierra (las cuerdas vocales) por dos filtros (formantes de la vocal) y algo
// de aire. «vocales»: [[t, f1, f2]], «tono»: [[t, hz]], «volumen»: [[t, ganancia]]
function voz(ctx, salida, { tono, vocales, volumen, pan = 0, aire = 0.25, ruidoBuffer }) {
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  for (const [t, f] of tono) o.frequency.linearRampToValueAtTime(f, t);
  o.frequency.setValueAtTime(tono[0][1], 0);
  const n = fuenteRuido(ctx, ruidoBuffer);
  const gAire = ctx.createGain(); gAire.gain.value = aire;
  const f1 = filtro(ctx, 'bandpass', vocales[0][1], 7);
  const f2 = filtro(ctx, 'bandpass', vocales[0][2], 9);
  for (const [t, a, b] of vocales) { f1.frequency.setTargetAtTime(a, t, 0.03); f2.frequency.setTargetAtTime(b, t, 0.03); }
  const g = ctx.createGain(); g.gain.value = 0;
  for (const [t, v] of volumen) g.gain.linearRampToValueAtTime(v, t);
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  o.connect(f1); o.connect(f2); n.connect(gAire); gAire.connect(f1); gAire.connect(f2);
  const g2 = ctx.createGain(); g2.gain.value = 0.55;
  f1.connect(g); f2.connect(g2); g2.connect(g);
  if (p) { p.pan.value = pan; g.connect(p); p.connect(salida); } else g.connect(salida);
  const fin = volumen.at(-1)[0] + 0.05;
  o.start(0); n.start(0); o.stop(fin); n.stop(fin);
}

// --- Los sonidos

// Murmullo de la gente: muchas voces que hablan a ratos (sílabas con su vocal) y un fondo sordo
const murmullo = (segundos) => (ctx, salida, azar) => {
  const rb = ruido(ctx, 2, azar);
  const VOCALES = [[730, 1090], [530, 1840], [270, 2290], [570, 840], [300, 870]];
  for (let v = 0; v < 22; v++) {
    const f0 = 95 + azar() * 140;
    const tono = []; const vocales = []; const volumen = [[0, 0]];
    let t = azar() * 1.5;
    while (t < segundos + 0.5) {
      // Una frase de 4 a 12 sílabas y una pausa
      const silabas = 4 + Math.floor(azar() * 9);
      for (let s = 0; s < silabas && t < segundos + 0.5; s++) {
        const d = 0.11 + azar() * 0.16;
        const [a, b] = VOCALES[Math.floor(azar() * VOCALES.length)];
        vocales.push([t, a * (0.9 + azar() * 0.2), b * (0.9 + azar() * 0.2)]);
        tono.push([t, f0 * (0.85 + azar() * 0.35)]);
        volumen.push([t + 0.02, 0.5 + azar() * 0.5], [t + d * 0.8, 0.35 * azar()], [t + d, 0.05]);
        t += d;
      }
      volumen.push([t + 0.05, 0]);
      t += 0.3 + azar() * 1.6;
    }
    if (!tono.length) continue;
    voz(ctx, salida, { tono, vocales, volumen, pan: azar() * 1.6 - 0.8, aire: 0.35, ruidoBuffer: rb });
  }
  // Fondo: la plaza llena, sorda
  const fondo = fuenteRuido(ctx, rb);
  const f = filtro(ctx, 'lowpass', 520, 0.5);
  const g = ctx.createGain(); g.gain.value = 0.25;
  fondo.connect(f); f.connect(g); g.connect(salida);
  fondo.start(0);
};

// ¡Olé! a coro: «o» y luego «lé» más agudo, cada voz con su retraso
const ole = (ctx, salida, azar) => {
  const rb = ruido(ctx, 2, azar);
  for (let v = 0; v < 26; v++) {
    const f0 = 105 + azar() * 150;
    const t0 = 0.02 + azar() * 0.16;
    const lé = t0 + 0.3 + azar() * 0.06;
    const fin = lé + 0.55 + azar() * 0.6;
    voz(ctx, salida, {
      tono: [[t0, f0], [lé - 0.02, f0 * 0.98], [lé + 0.08, f0 * 1.28], [fin, f0 * 1.12]],
      vocales: [[t0, 520, 860], [lé - 0.05, 380, 1500], [lé + 0.04, 470, 1950]],
      volumen: [[t0, 0], [t0 + 0.05, 0.7], [lé - 0.06, 0.55], [lé - 0.02, 0.2], [lé + 0.06, 1], [fin - 0.25, 0.8], [fin, 0]],
      pan: azar() * 1.6 - 0.8, aire: 0.15, ruidoBuffer: rb,
    });
  }
};

// ¡Uy!: una «u» larga que sube y cae
const uy = (ctx, salida, azar) => {
  const rb = ruido(ctx, 2, azar);
  for (let v = 0; v < 22; v++) {
    const f0 = 120 + azar() * 160;
    const t0 = azar() * 0.15;
    const fin = t0 + 0.9 + azar() * 0.6;
    voz(ctx, salida, {
      tono: [[t0, f0], [t0 + 0.25, f0 * 1.35], [fin, f0 * 0.8]],
      vocales: [[t0, 320, 800], [fin - 0.3, 300, 760], [fin - 0.12, 450, 1700]],
      volumen: [[t0, 0], [t0 + 0.08, 0.9], [fin - 0.3, 0.7], [fin, 0]],
      pan: azar() * 1.6 - 0.8, aire: 0.18, ruidoBuffer: rb,
    });
  }
};

// Aplausos: muchas palmas, cada uno a su ritmo, que se van apagando
const aplauso = (segundos) => (ctx, salida, azar) => {
  const rb = ruido(ctx, 0.1, azar);
  for (let p = 0; p < 30; p++) {
    const ritmo = 0.17 + azar() * 0.1;
    const f = 900 + azar() * 1600;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = azar() * 1.8 - 0.9; pan.connect(salida); }
    for (let t = azar() * 0.3; t < segundos - 0.05; t += ritmo * (0.9 + azar() * 0.2)) {
      const fuerza = Math.min(1, (segundos - t) / (segundos * 0.6));
      if (azar() > 0.2 + fuerza) continue;
      const s = ctx.createBufferSource(); s.buffer = rb;
      const fl = filtro(ctx, 'bandpass', f * (0.9 + azar() * 0.2), 1.3);
      const g = ctx.createGain();
      golpeDe(ctx, g, t, 0.6 * fuerza + 0.1, 0.012);
      s.connect(fl); fl.connect(g); g.connect(pan ?? salida);
      s.start(t); s.stop(t + 0.08);
    }
  }
};

// Cencerro: chapa doblada, parciales que no son armónicos y se apagan pronto
const cencerro = (base) => (ctx, salida, azar) => {
  const parciales = [[1, 1, 0.5], [2.06, 0.65, 0.35], [3.32, 0.5, 0.22], [4.9, 0.32, 0.14], [6.7, 0.2, 0.09]];
  for (const [r, a, d] of parciales) {
    const o = ctx.createOscillator(); o.frequency.value = base * r * (0.995 + azar() * 0.01);
    const g = ctx.createGain(); golpeDe(ctx, g, 0, a, d);
    o.connect(g); g.connect(salida); o.start(0); o.stop(1.2);
  }
  // El badajo
  const s = ctx.createBufferSource(); s.buffer = ruido(ctx, 0.05, azar);
  const fl = filtro(ctx, 'bandpass', 2600, 2); const g = ctx.createGain(); golpeDe(ctx, g, 0, 0.5, 0.006);
  s.connect(fl); fl.connect(g); g.connect(salida); s.start(0);
};

// Pezuña en la arena: golpe sordo
const pezuna = (ctx, salida, azar) => {
  const s = ctx.createBufferSource(); s.buffer = ruido(ctx, 0.2, azar);
  const fl = filtro(ctx, 'lowpass', 320, 0.8); const g = ctx.createGain(); golpeDe(ctx, g, 0, 1, 0.035, 0.004);
  s.connect(fl); fl.connect(g); g.connect(salida); s.start(0);
  const o = ctx.createOscillator(); o.frequency.setValueAtTime(95, 0); o.frequency.exponentialRampToValueAtTime(45, 0.1);
  const g2 = ctx.createGain(); golpeDe(ctx, g2, 0, 0.7, 0.03);
  o.connect(g2); g2.connect(salida); o.start(0); o.stop(0.2);
};

// Pisada en la arena: crujido corto
const pisada = (ctx, salida, azar) => {
  const s = ctx.createBufferSource(); s.buffer = ruido(ctx, 0.15, azar);
  const fl = filtro(ctx, 'bandpass', 1400, 0.7); const g = ctx.createGain(); golpeDe(ctx, g, 0, 1, 0.025, 0.006);
  const fl2 = filtro(ctx, 'lowpass', 180, 0.7); const g2 = ctx.createGain(); golpeDe(ctx, g2, 0, 0.6, 0.02);
  s.connect(fl); fl.connect(g); g.connect(salida); s.connect(fl2); fl2.connect(g2); g2.connect(salida); s.start(0);
};

// Golpe de la vaca en la valla: el porrazo, la madera y los tablones que tiemblan
const golpeValla = (ctx, salida, azar) => {
  const o = ctx.createOscillator(); o.frequency.setValueAtTime(120, 0); o.frequency.exponentialRampToValueAtTime(55, 0.2);
  const g = ctx.createGain(); golpeDe(ctx, g, 0, 1, 0.09);
  o.connect(g); g.connect(salida); o.start(0); o.stop(0.8);
  const rb = ruido(ctx, 0.6, azar);
  const s = ctx.createBufferSource(); s.buffer = rb;
  const fl = filtro(ctx, 'bandpass', 650, 0.9); const g2 = ctx.createGain(); golpeDe(ctx, g2, 0, 0.9, 0.05);
  s.connect(fl); fl.connect(g2); g2.connect(salida); s.start(0);
  for (let i = 0, t = 0.06; i < 7; i++, t += 0.035 + azar() * 0.05) {
    const c = ctx.createBufferSource(); c.buffer = rb;
    const fc = filtro(ctx, 'bandpass', 1200 + azar() * 1500, 3); const gc = ctx.createGain(); golpeDe(ctx, gc, t, 0.45 * (1 - i / 8), 0.008);
    c.connect(fc); fc.connect(gc); gc.connect(salida); c.start(t, azar() * 0.3); c.stop(t + 0.06);
  }
};

// Cohete: el silbido que sube y el estampido, con el eco de las fachadas
const cohete = (ctx, salida, azar) => {
  const rb = ruido(ctx, 4, azar);
  const s = ctx.createBufferSource(); s.buffer = rb;
  const fl = filtro(ctx, 'bandpass', 500, 4);
  fl.frequency.setValueAtTime(500, 0); fl.frequency.exponentialRampToValueAtTime(3800, 1.0);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(0.35, 0.8); g.gain.linearRampToValueAtTime(0, 1.05);
  s.connect(fl); fl.connect(g); g.connect(salida); s.start(0); s.stop(1.1);
  for (const [t, v] of [[1.1, 1], [1.38, 0.35], [1.7, 0.18], [2.05, 0.08]]) {
    const b = ctx.createBufferSource(); b.buffer = rb;
    const fb = filtro(ctx, 'lowpass', t > 1.2 ? 900 : 2200, 0.6); const gb = ctx.createGain(); golpeDe(ctx, gb, t, v, t > 1.2 ? 0.12 : 0.18, 0.001);
    b.connect(fb); fb.connect(gb); gb.connect(salida); b.start(t, azar()); b.stop(t + 1.2);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.4);
    const go = ctx.createGain(); golpeDe(ctx, go, t, v * 0.8, 0.12, 0.001);
    o.connect(go); go.connect(salida); o.start(t); o.stop(t + 0.8);
  }
};

// --------------------------------------------------------------------------------------------

export function creaSonido() {
  const S = FIESTAS.sonido;
  const Contexto = window.AudioContext ?? window.webkitAudioContext;
  let activo = true;
  try { activo = localStorage.getItem(CLAVE) !== 'no'; } catch { /* sin almacenamiento */ }
  const cuenta = {};                 // cuántas veces ha sonado cada cosa (para las pruebas)
  if (!Contexto || typeof OfflineAudioContext === 'undefined') {
    return { listo: Promise.resolve(false), get activo() { return false; }, alterna() { return false; }, silencia() {}, escucha() {},
      cencerro() {}, pezuna() {}, pisada() {}, golpe() {}, cohete() {}, ole() {}, aplauso() {}, uy() {}, ambiente() {}, cuenta, libera() {} };
  }
  const ctx = new Contexto();
  const maestro = ctx.createGain();
  const compresor = ctx.createDynamicsCompressor();
  maestro.connect(compresor);
  compresor.connect(ctx.destination);
  let enPausa = false;
  const volumen = () => (activo && !enPausa ? S.volumen : 0);
  maestro.gain.value = volumen();
  const gente = ctx.createGain();            // el murmullo, que sube y baja
  gente.gain.value = 0;
  gente.connect(maestro);

  // El navegador no deja sonar hasta que se toca la página: se intenta en cada toque o tecla
  const despierta = () => { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); };
  for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, despierta, { capture: true });
  despierta();

  const buffers = {};
  const direccion = new Vector3();
  let fondo = null;
  const listo = Promise.all([
    graba(8, murmullo(8), { canales: 2, semilla: 11, bucle: 0.6 }).then((b) => { buffers.murmullo = b; }),
    graba(2.2, ole, { canales: 2, semilla: 21 }).then((b) => { buffers.ole = b; }),
    graba(1.8, uy, { canales: 2, semilla: 31 }).then((b) => { buffers.uy = b; }),
    graba(3.5, aplauso(3.5), { canales: 2, semilla: 41 }).then((b) => { buffers.aplauso = b; }),
    ...S.cencerros.map((hz, i) => graba(1.2, cencerro(hz), { semilla: 50 + i }).then((b) => { (buffers.cencerros ??= [])[i] = b; })),
    graba(0.2, pezuna, { semilla: 61 }).then((b) => { buffers.pezuna = b; }),
    graba(0.15, pisada, { semilla: 71 }).then((b) => { buffers.pisada = b; }),
    graba(0.9, golpeValla, { semilla: 81 }).then((b) => { buffers.golpe = b; }),
    graba(3.2, cohete, { semilla: 91 }).then((b) => { buffers.cohete = b; }),
  ]).then(() => {
    fondo = ctx.createBufferSource();
    fondo.buffer = buffers.murmullo;
    fondo.loop = true;
    fondo.connect(gente);
    fondo.start();
    gente.gain.setTargetAtTime(S.murmullo, ctx.currentTime, 1.5);
    return true;
  }).catch((e) => { console.warn('Sin sonido de fiestas:', e); return false; });

  // Toca un buffer; con «en» = {x, y, z}, suena desde ese sitio
  function toca(nombre, buffer, { ganancia = 1, en = null, tasa = 1 } = {}) {
    if (!buffer || !activo || enPausa || ctx.state !== 'running') return;
    cuenta[nombre] = (cuenta[nombre] ?? 0) + 1;
    const s = ctx.createBufferSource();
    s.buffer = buffer;
    s.playbackRate.value = tasa;
    const g = ctx.createGain();
    g.gain.value = ganancia;
    s.connect(g);
    if (en) {
      const p = ctx.createPanner();
      p.panningModel = 'equalpower';
      p.distanceModel = 'inverse';
      p.refDistance = S.referenciaM;
      p.maxDistance = 120;
      p.rolloffFactor = S.caida;
      if (p.positionX) { p.positionX.value = en.x; p.positionY.value = en.y; p.positionZ.value = en.z; } else p.setPosition(en.x, en.y, en.z);
      g.connect(p);
      p.connect(maestro);
    } else g.connect(maestro);
    s.start();
  }
  // Varía un poco cada golpe para que no suene a lo mismo
  const varia = () => 0.93 + Math.random() * 0.14;

  return {
    listo,
    get activo() { return activo; },
    get estado() { return ctx.state; },
    cuenta,
    // Los sonidos grabados (para tools/escucha_sonidos.mjs)
    get buffers() { return buffers; },
    alterna() {
      activo = !activo;
      try { localStorage.setItem(CLAVE, activo ? 'si' : 'no'); } catch { /* nada */ }
      maestro.gain.setTargetAtTime(volumen(), ctx.currentTime, 0.05);
      despierta();
      return activo;
    },
    // En la pausa, en silencio
    silencia(valor) { enPausa = valor; maestro.gain.setTargetAtTime(volumen(), ctx.currentTime, 0.08); },
    // El oyente es la cámara
    escucha(camara) {
      const l = ctx.listener;
      const p = camara.position;
      const d = camara.getWorldDirection(direccion);
      const a = camara.up;
      if (l.positionX) {
        l.positionX.value = p.x; l.positionY.value = p.y; l.positionZ.value = p.z;
        l.forwardX.value = d.x; l.forwardY.value = d.y; l.forwardZ.value = d.z;
        l.upX.value = a.x; l.upY.value = a.y; l.upZ.value = a.z;
      } else {
        l.setPosition(p.x, p.y, p.z);
        l.setOrientation(d.x, d.y, d.z, a.x, a.y, a.z);
      }
    },
    // El murmullo: «nivel» de 0 a 1 sobre lo normal (sube con la emoción)
    ambiente(nivel) { gente.gain.setTargetAtTime(S.murmullo * (0.6 + nivel), ctx.currentTime, 0.6); },
    cencerro(cual, en, fuerza = 1) {
      const lista = buffers.cencerros ?? [];
      toca('cencerro', lista[cual % Math.max(1, lista.length)], { ganancia: S.cencerro * fuerza, en, tasa: varia() });
    },
    pezuna(en, fuerza = 1) { toca('pezuna', buffers.pezuna, { ganancia: S.pezuna * fuerza, en, tasa: varia() }); },
    pisada(fuerza = 1) { toca('pisada', buffers.pisada, { ganancia: S.pisada * fuerza, tasa: varia() }); },
    golpe(en, fuerza = 1) { toca('golpe', buffers.golpe, { ganancia: S.golpe * fuerza, en, tasa: 0.9 + Math.random() * 0.2 }); },
    cohete() { toca('cohete', buffers.cohete, { ganancia: S.cohete }); },
    ole(fuerza = 1) { toca('ole', buffers.ole, { ganancia: S.ole * fuerza, tasa: 0.95 + Math.random() * 0.1 }); },
    aplauso(fuerza = 1) { toca('aplauso', buffers.aplauso, { ganancia: S.aplauso * fuerza, tasa: 0.95 + Math.random() * 0.1 }); },
    uy(fuerza = 1) { toca('uy', buffers.uy, { ganancia: S.uy * fuerza, tasa: 0.95 + Math.random() * 0.1 }); },
    libera() {
      for (const ev of ['pointerdown', 'keydown', 'touchend']) window.removeEventListener(ev, despierta, { capture: true });
      try { fondo?.stop(); } catch { /* ya parado */ }
      ctx.close().catch(() => {});
    },
  };
}
