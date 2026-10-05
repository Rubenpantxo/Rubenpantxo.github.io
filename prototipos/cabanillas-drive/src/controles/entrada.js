// Entrada unificada: teclado (WASD/flechas, Espacio, R, C) y táctil (joystick izquierdo
// para la dirección y botones a la derecha). El juego lee siempre el mismo objeto.
import { CONTROLES } from '../config/camara.js';

export function creaEntrada(raizTactil) {
  const estado = { acelerador: 0, freno: 0, direccion: 0, frenoMano: false, analogica: false };
  const pendientes = { reiniciar: false, camara: false };
  const pulsadas = new Set();
  const teclas = CONTROLES.teclas;
  const algunaDe = (lista) => lista.some((c) => pulsadas.has(c));
  const todasLasTeclas = new Set(Object.values(teclas).flat());

  // --- Teclado
  window.addEventListener('keydown', (e) => {
    if (!todasLasTeclas.has(e.code)) return;
    e.preventDefault();
    if (!e.repeat) {
      if (teclas.reiniciar.includes(e.code)) pendientes.reiniciar = true;
      if (teclas.camara.includes(e.code)) pendientes.camara = true;
    }
    pulsadas.add(e.code);
  });
  window.addEventListener('keyup', (e) => pulsadas.delete(e.code));
  window.addEventListener('blur', () => pulsadas.clear());

  // --- Táctil
  const tactil = { activo: false, direccion: 0, acelerador: false, freno: false, frenoMano: false };
  const zona = raizTactil.querySelector('.zona-joystick');
  const base = raizTactil.querySelector('.joystick-base');
  const mando = raizTactil.querySelector('.joystick-mando');
  const { radio, zonaMuerta } = CONTROLES.joystick;
  let dedoJoystick = null;
  let origenX = 0;
  let origenY = 0;

  // Algunos navegadores lanzan error al capturar un puntero que ya no está activo
  function captura(elemento, id) {
    try {
      elemento.setPointerCapture(id);
    } catch {
      // sin captura el control sigue funcionando mientras el dedo no salga del elemento
    }
  }

  function muestraTactil() {
    if (tactil.activo) return;
    tactil.activo = true;
    raizTactil.hidden = false;
  }
  if (window.matchMedia('(pointer: coarse)').matches) muestraTactil();
  window.addEventListener('touchstart', muestraTactil, { passive: true, once: true });

  zona.addEventListener('pointerdown', (e) => {
    if (dedoJoystick !== null) return;
    dedoJoystick = e.pointerId;
    captura(zona, e.pointerId);
    origenX = e.clientX;
    origenY = e.clientY;
    base.style.transform = `translate(${origenX - radio}px, ${origenY - radio}px)`;
    mando.style.transform = 'translate(0px, 0px)';
    base.hidden = false;
  });
  zona.addEventListener('pointermove', (e) => {
    if (e.pointerId !== dedoJoystick) return;
    let dx = e.clientX - origenX;
    const dy = e.clientY - origenY;
    const largo = Math.hypot(dx, dy);
    const escala = largo > radio ? radio / largo : 1;
    mando.style.transform = `translate(${dx * escala}px, ${dy * escala}px)`;
    dx = Math.max(-1, Math.min(1, dx / radio));
    tactil.direccion = Math.abs(dx) < zonaMuerta ? 0 : dx;
  });
  const sueltaJoystick = (e) => {
    if (e.pointerId !== dedoJoystick) return;
    dedoJoystick = null;
    tactil.direccion = 0;
    base.hidden = true;
  };
  zona.addEventListener('pointerup', sueltaJoystick);
  zona.addEventListener('pointercancel', sueltaJoystick);

  // Botones mantenidos (acelerar, frenar, freno de mano) y de pulsación (cámara, reiniciar)
  for (const boton of raizTactil.querySelectorAll('[data-mantener]')) {
    const accion = boton.dataset.mantener;
    const pon = (valor) => (e) => {
      e.preventDefault();
      tactil[accion] = valor;
      boton.classList.toggle('pulsado', valor);
    };
    boton.addEventListener('pointerdown', (e) => { captura(boton, e.pointerId); pon(true)(e); });
    boton.addEventListener('pointerup', pon(false));
    boton.addEventListener('pointercancel', pon(false));
    boton.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  for (const boton of raizTactil.querySelectorAll('[data-pulsar]')) {
    boton.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      pendientes[boton.dataset.pulsar] = true;
    });
  }

  // Combina ambas fuentes; se llama una vez por fotograma
  function actualiza() {
    const derecha = algunaDe(teclas.derecha) ? 1 : 0;
    const izquierda = algunaDe(teclas.izquierda) ? 1 : 0;
    const direccionTeclado = derecha - izquierda;
    const usaJoystick = tactil.activo && tactil.direccion !== 0;
    estado.direccion = usaJoystick ? tactil.direccion : direccionTeclado;
    estado.analogica = usaJoystick;
    estado.acelerador = algunaDe(teclas.acelerar) || tactil.acelerador ? 1 : 0;
    estado.freno = algunaDe(teclas.frenar) || tactil.freno ? 1 : 0;
    estado.frenoMano = algunaDe(teclas.frenoMano) || tactil.frenoMano;
    return estado;
  }

  function consume(nombre) {
    const valor = pendientes[nombre];
    pendientes[nombre] = false;
    return valor;
  }

  return { estado, actualiza, consume };
}
