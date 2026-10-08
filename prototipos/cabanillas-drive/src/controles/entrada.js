// Entrada unificada: teclado (WASD/flechas, Espacio, R, C, E, Mayús) y táctil (joystick
// izquierdo y botones a la derecha). El juego lee siempre el mismo objeto.
// A pie: avance/lateral (W/S, A/D o joystick), giro con las flechas y mirada con el ratón
// (clic para capturar el puntero) o arrastrando el dedo fuera del joystick.
import { CONTROLES } from '../config/camara.js';

export function creaEntrada(raizTactil) {
  const estado = { acelerador: 0, freno: 0, direccion: 0, frenoMano: false, analogica: false,
    avance: 0, lateral: 0, giro: 0, correr: false };
  const pendientes = { reiniciar: false, camara: false, bajar: false, hora: false };
  const mirada = { dx: 0, dy: 0 };
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
      if (teclas.bajar.includes(e.code)) pendientes.bajar = true;
      if (teclas.hora.includes(e.code)) pendientes.hora = true;
    }
    pulsadas.add(e.code);
  });
  window.addEventListener('keyup', (e) => pulsadas.delete(e.code));
  window.addEventListener('blur', () => pulsadas.clear());

  // --- Táctil
  const tactil = { activo: false, direccion: 0, avance: 0, acelerador: false, freno: false, frenoMano: false };
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
    const dyN = Math.max(-1, Math.min(1, dy / radio));
    tactil.direccion = Math.abs(dx) < zonaMuerta ? 0 : dx;
    tactil.avance = Math.abs(dyN) < zonaMuerta ? 0 : -dyN;
  });
  const sueltaJoystick = (e) => {
    if (e.pointerId !== dedoJoystick) return;
    dedoJoystick = null;
    tactil.direccion = 0;
    tactil.avance = 0;
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

  // --- Mirada: ratón (con el puntero capturado) y arrastre de un dedo sobre la escena
  const lienzo = document.getElementById('escena');
  document.addEventListener('mousemove', (ev) => {
    if (document.pointerLockElement !== lienzo) return;
    mirada.dx += ev.movementX;
    mirada.dy += ev.movementY;
  });
  let dedoMirada = null;
  let ultimoX = 0;
  let ultimoY = 0;
  lienzo.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType !== 'touch' || dedoMirada !== null) return;
    dedoMirada = ev.pointerId;
    ultimoX = ev.clientX;
    ultimoY = ev.clientY;
    captura(lienzo, ev.pointerId);
  });
  lienzo.addEventListener('pointermove', (ev) => {
    if (ev.pointerId !== dedoMirada) return;
    mirada.dx += (ev.clientX - ultimoX) * 1.6;
    mirada.dy += (ev.clientY - ultimoY) * 1.6;
    ultimoX = ev.clientX;
    ultimoY = ev.clientY;
  });
  const sueltaMirada = (ev) => { if (ev.pointerId === dedoMirada) dedoMirada = null; };
  lienzo.addEventListener('pointerup', sueltaMirada);
  lienzo.addEventListener('pointercancel', sueltaMirada);

  // Desplazamiento de la mirada acumulado desde la última llamada (px)
  function consumeMirada() {
    const r = { dx: mirada.dx, dy: mirada.dy };
    mirada.dx = 0;
    mirada.dy = 0;
    return r;
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
    // A pie: A/D de lado y las flechas giran (con el joystick: x de lado, y adelante)
    const pulsada = (c) => pulsadas.has(c);
    estado.avance = (pulsada('KeyW') || pulsada('ArrowUp') ? 1 : 0) - (pulsada('KeyS') || pulsada('ArrowDown') ? 1 : 0)
      || (tactil.activo ? tactil.avance : 0);
    estado.lateral = (pulsada('KeyD') ? 1 : 0) - (pulsada('KeyA') ? 1 : 0) || (tactil.activo ? tactil.direccion : 0);
    estado.giro = (pulsada('ArrowRight') ? 1 : 0) - (pulsada('ArrowLeft') ? 1 : 0);
    estado.correr = algunaDe(teclas.correr) || tactil.acelerador;
    return estado;
  }

  function consume(nombre) {
    const valor = pendientes[nombre];
    pendientes[nombre] = false;
    return valor;
  }

  return { estado, actualiza, consume, consumeMirada };
}
