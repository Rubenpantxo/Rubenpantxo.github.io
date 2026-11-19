// Sonido del salto (PLAN_SALTO.md, S3), hecho con WebAudio sin archivos:
// - motor del avión: tres osciladores graves con el batir de las hélices; fuerte dentro y se
//   aleja (baja con la distancia) al saltar
// - viento: ruido filtrado cuyo volumen y tono suben con la velocidad
// - golpe de tela al abrirse el paracaídas
// Respeta el sonido quitado (la misma preferencia que las fiestas; M lo cambia) y la pausa.
import { SALTO } from '../config/salto.js';

const CLAVE = 'cabanillas.sonido';
const NULO = { actualiza() {}, golpe() {}, alterna() { return false; }, ponPausa() {}, libera() {}, get activo() { return false; }, cuenta: {} };

export function creaSonidoSalto() {
  const Contexto = window.AudioContext ?? window.webkitAudioContext;
  if (!Contexto) return NULO;
  const S = SALTO.sonido;
  let activo = true;
  try { activo = localStorage.getItem(CLAVE) !== 'no'; } catch { /* sin almacenamiento */ }
  let enPausa = false;
  const cuenta = { golpe: 0 };
  const ctx = new Contexto();
  const maestro = ctx.createGain();
  maestro.gain.value = activo ? S.volumen : 0;
  maestro.connect(ctx.destination);
  const despierta = () => { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); };
  for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, despierta, { capture: true });
  despierta();

  // Ruido blanco en bucle (2 s): viento y golpe de tela
  const ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const datos = ruido.getChannelData(0);
  for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;

  // Viento
  const viento = ctx.createBufferSource();
  viento.buffer = ruido;
  viento.loop = true;
  const filtroViento = ctx.createBiquadFilter();
  filtroViento.type = 'bandpass';
  filtroViento.Q.value = 0.6;
  filtroViento.frequency.value = 400;
  const volViento = ctx.createGain();
  volViento.gain.value = 0;
  viento.connect(filtroViento).connect(volViento).connect(maestro);
  viento.start();

  // Motor: dos dientes de sierra casi iguales (batido) y una octava baja, pasados por un paso bajo;
  // el batir de las hélices es una modulación del volumen
  const filtroMotor = ctx.createBiquadFilter();
  filtroMotor.type = 'lowpass';
  filtroMotor.frequency.value = 520;
  const batido = ctx.createGain();
  batido.gain.value = 0.65;
  const volMotor = ctx.createGain();
  volMotor.gain.value = 0;
  filtroMotor.connect(batido).connect(volMotor).connect(maestro);
  const osciladores = [[S.motorHz, 'sawtooth', 0.5], [S.motorHz * 1.013, 'sawtooth', 0.5], [S.motorHz / 2, 'square', 0.35]]
    .map(([hz, tipo, g]) => {
      const o = ctx.createOscillator();
      o.type = tipo;
      o.frequency.value = hz;
      const v = ctx.createGain();
      v.gain.value = g;
      o.connect(v).connect(filtroMotor);
      o.start();
      return o;
    });
  const helices = ctx.createOscillator();
  helices.frequency.value = S.helicesHz;
  const fondoBatido = ctx.createGain();
  fondoBatido.gain.value = 0.3;
  helices.connect(fondoBatido).connect(batido.gain);
  helices.start();

  const suave = (param, valor, t = 0.25) => param.setTargetAtTime(valor, ctx.currentTime, t);
  const aplicaVolumen = () => suave(maestro.gain, activo && !enPausa ? S.volumen : 0, 0.08);
  let libre = false;

  return {
    cuenta,
    get activo() { return activo; },
    // velocidad (m/s) del jugador; distanciaAvion (m, Infinity si ya no está); enAvion
    actualiza({ velocidad, distanciaAvion, enAvion }) {
      if (libre) return;
      const v = Math.max(0, velocidad);
      const kv = Math.min(1, v / S.vientoMaxMs);
      suave(volViento.gain, enAvion ? S.vientoAvion : S.vientoMin + (S.vientoMax - S.vientoMin) * kv ** 1.4);
      suave(filtroViento.frequency, enAvion ? 350 : 250 + 1400 * kv);
      const lejos = Number.isFinite(distanciaAvion) ? S.motorRefM / (S.motorRefM + Math.max(0, distanciaAvion)) : 0;
      suave(volMotor.gain, enAvion ? S.motorDentro : S.motorDentro * lejos, 0.4);
    },
    // Golpe de tela: un soplo de ruido grave que se apaga rápido (y un segundo, más flojo)
    golpe() {
      if (libre || !activo || enPausa) return;
      cuenta.golpe++;
      for (const [retraso, fuerza] of [[0, 1], [0.18, 0.45]]) {
        const s = ctx.createBufferSource();
        s.buffer = ruido;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 700;
        const g = ctx.createGain();
        const t0 = ctx.currentTime + retraso;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(S.golpe * fuerza, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
        s.connect(f).connect(g).connect(maestro);
        s.start(t0, Math.random());
        s.stop(t0 + 0.5);
      }
    },
    alterna() {
      activo = !activo;
      try { localStorage.setItem(CLAVE, activo ? 'si' : 'no'); } catch { /* sin almacenamiento */ }
      aplicaVolumen();
      return activo;
    },
    ponPausa(valor) { enPausa = valor; aplicaVolumen(); },
    libera() {
      if (libre) return;
      libre = true;
      suave(maestro.gain, 0, 0.3);
      for (const ev of ['pointerdown', 'keydown', 'touchend']) window.removeEventListener(ev, despierta, { capture: true });
      setTimeout(() => {
        for (const o of [...osciladores, helices, viento]) { try { o.stop(); } catch { /* ya parado */ } }
        ctx.close().catch(() => {});
      }, 1500);
    },
  };
}

// Sin sonido (para quien no lo quiera crear)
creaSonidoSalto.nulo = NULO;
