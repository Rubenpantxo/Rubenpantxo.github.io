// Motor diésel del tractor (PLAN_AGRICULTURA.md, fase A4), hecho con WebAudio sin archivos:
// - explosiones: dos dientes de sierra a la frecuencia de encendido (4 cilindros: rpm / 30) y una
//   cuadrada una octava abajo, pasadas por un paso bajo que se abre con el acelerador y la carga
// - traqueteo del gasoil: ruido filtrado, modulado al ritmo de las explosiones
// Con el apero clavado, el motor baja de vueltas, suena más grave y más fuerte (va «tirando»).
// Respeta el sonido quitado (la misma preferencia que fiestas y salto: 'cabanillas.sonido').
const CLAVE = 'cabanillas.sonido';
const NULO = { actualiza() {}, para() {}, alterna() { return false; }, get activo() { return false; }, get rpm() { return 0; } };

export function creaSonidoMotor({ volumen = 0.5 } = {}) {
  const Contexto = typeof window !== 'undefined' ? (window.AudioContext ?? window.webkitAudioContext) : null;
  if (!Contexto) return NULO;
  let activo = true;
  try { activo = localStorage.getItem(CLAVE) !== 'no'; } catch { /* sin almacenamiento */ }
  const ctx = new Contexto();
  const maestro = ctx.createGain();
  maestro.gain.value = 0;
  maestro.connect(ctx.destination);
  const despierta = () => { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); };
  for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, despierta, { capture: true });
  despierta();

  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 280;
  filtro.Q.value = 2.2;
  const pulso = ctx.createGain();          // modulado por las explosiones
  pulso.gain.value = 0.6;
  filtro.connect(pulso).connect(maestro);
  const osciladores = [[1, 'sawtooth', 0.45], [1.012, 'sawtooth', 0.4], [0.5, 'square', 0.3]].map(([f, tipo, g]) => {
    const o = ctx.createOscillator();
    o.type = tipo;
    const v = ctx.createGain();
    v.gain.value = g;
    o.connect(v).connect(filtro);
    o.start();
    return { o, f };
  });
  // Modulación del volumen a la frecuencia de encendido (el «pom-pom» del diésel)
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  const prof = ctx.createGain();
  prof.gain.value = 0.35;
  lfo.connect(prof).connect(pulso.gain);
  lfo.start();
  // Traqueteo: ruido en banda alta, también al ritmo del motor
  const ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const datos = ruido.getChannelData(0);
  for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
  const fuente = ctx.createBufferSource();
  fuente.buffer = ruido;
  fuente.loop = true;
  const banda = ctx.createBiquadFilter();
  banda.type = 'bandpass';
  banda.frequency.value = 2200;
  banda.Q.value = 1.4;
  const volRuido = ctx.createGain();
  volRuido.gain.value = 0.05;
  const modRuido = ctx.createGain();
  modRuido.gain.value = 0.04;
  lfo.connect(modRuido).connect(volRuido.gain);
  fuente.connect(banda).connect(volRuido).connect(maestro);
  fuente.start();

  let rpm = 800;
  let carga = 0;
  let encendido = false;
  return {
    get activo() { return activo; },
    get rpm() { return rpm; },
    // velocidad: km/h; acelerador 0…1; esfuerzo 0…1 (apero clavado tirando)
    actualiza(dt, { velocidadKmh = 0, acelerador = 0, esfuerzo = 0, distancia = 0 }) {
      encendido = true;
      const objetivoRpm = 800 + 1300 * Math.min(1, Math.abs(velocidadKmh) / 40) + 450 * acelerador - 280 * esfuerzo * acelerador;
      rpm += (objetivoRpm - rpm) * Math.min(1, dt * 2.5);
      carga += (Math.max(acelerador * 0.6, esfuerzo) - carga) * Math.min(1, dt * 3);
      const hz = rpm / 30;                   // 4 cilindros, 4 tiempos
      const t = ctx.currentTime;
      for (const { o, f } of osciladores) o.frequency.setTargetAtTime(hz * f, t, 0.05);
      lfo.frequency.setTargetAtTime(hz / 2, t, 0.05);
      filtro.frequency.setTargetAtTime(220 + 420 * carga + rpm * 0.12, t, 0.08);
      volRuido.gain.setTargetAtTime(0.03 + 0.05 * carga, t, 0.1);
      const lejos = 1 / (1 + distancia * 0.08);   // la cámara fuera de la cabina oye algo menos
      maestro.gain.setTargetAtTime(activo ? volumen * (0.32 + 0.4 * carga) * lejos : 0, t, 0.12);
    },
    // Sin tractor (o en pausa): se apaga
    para() {
      if (!encendido) return;
      encendido = false;
      maestro.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    },
    alterna() {
      activo = !activo;
      try { localStorage.setItem(CLAVE, activo ? 'si' : 'no'); } catch { /* sin almacenamiento */ }
      if (!activo) maestro.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      return activo;
    },
  };
}
