// Ajustes de la interfaz (pestaña «Ajustes» de la pantalla de controles): esquina del minimapa,
// minimapa girando con el coche, joystick fijo y visible o que aparece al tocar, y posición de
// los botones táctiles (se arrastran a mano). Se guardan en el navegador si se puede.
const CLAVE = 'cabanillas.ajustes';
const POR_DEFECTO = { esquinaMinimapa: 'auto', minimapaGira: true, joystickFijo: false, botones: {} };

let ajustes = { ...POR_DEFECTO };
try { ajustes = { ...POR_DEFECTO, ...JSON.parse(localStorage.getItem(CLAVE) ?? '{}') }; } catch { /* sin almacenamiento */ }

export function leeAjustes() { return ajustes; }

function guarda() {
  try { localStorage.setItem(CLAVE, JSON.stringify(ajustes)); } catch { /* nada */ }
  window.dispatchEvent(new CustomEvent('cabanillas:ajustes', { detail: ajustes }));
}

// Botones táctiles que se pueden mover: su posición es el centro, en fracción de la ventana
const MOVIBLES = '#tactil [data-mantener], #tactil [data-pulsar], #tactil .joystick-base';
const idDe = (el) => el.dataset.mantener ?? el.dataset.pulsar ?? 'joystick';

function colocaBotones() {
  for (const el of document.querySelectorAll(MOVIBLES)) {
    const esJoystick = el.classList.contains('joystick-base');
    // El joystick que aparece al tocar no tiene sitio fijo
    const p = esJoystick && !ajustes.joystickFijo ? null : ajustes.botones[idDe(el)];
    if (!p) {
      el.style.position = el.style.left = el.style.top = el.style.margin = '';
      if (esJoystick) el.style.transform = '';
      continue;
    }
    el.style.position = 'fixed';
    el.style.left = `${p.x * 100}vw`;
    el.style.top = `${p.y * 100}vh`;
    el.style.margin = '0';
    el.style.transform = 'translate(-50%, -50%)';
  }
}

function aplica() {
  const raiz = document.documentElement;
  raiz.dataset.minimapa = ajustes.esquinaMinimapa;
  raiz.dataset.joystick = ajustes.joystickFijo ? 'fijo' : 'flotante';
  colocaBotones();
}

export function creaAjustes({ alEditar }) {
  const panel = document.querySelector('.vista[data-vista="ajustes"]');
  const esquina = panel.querySelector('[data-ajuste="esquinaMinimapa"]');
  const gira = panel.querySelector('[data-ajuste="minimapaGira"]');
  const joystick = panel.querySelector('[data-ajuste="joystickFijo"]');
  const pinta = () => {
    esquina.value = ajustes.esquinaMinimapa;
    gira.checked = ajustes.minimapaGira;
    joystick.checked = ajustes.joystickFijo;
  };
  esquina.addEventListener('change', () => { ajustes.esquinaMinimapa = esquina.value; aplica(); guarda(); });
  gira.addEventListener('change', () => { ajustes.minimapaGira = gira.checked; guarda(); });
  joystick.addEventListener('change', () => { ajustes.joystickFijo = joystick.checked; aplica(); guarda(); });
  panel.querySelector('[data-restablecer]').addEventListener('click', () => {
    ajustes = { ...POR_DEFECTO, botones: {} };
    pinta();
    aplica();
    guarda();
  });

  // --- Mover botones: la pausa se oculta, se ven los mandos táctiles y se arrastran
  const barra = document.getElementById('editar-botones');
  const tactil = document.getElementById('tactil');
  let tactilOculto = true;
  let arrastre = null;
  const alPulsar = (e) => {
    const el = e.target.closest(MOVIBLES.replaceAll('#tactil ', ''));
    if (!el || !tactil.classList.contains('editando')) return;
    e.preventDefault();
    e.stopPropagation();
    const r = el.getBoundingClientRect();
    arrastre = { el, id: e.pointerId, dx: e.clientX - (r.left + r.width / 2), dy: e.clientY - (r.top + r.height / 2) };
    try { el.setPointerCapture(e.pointerId); } catch { /* nada */ }
  };
  const alMover = (e) => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    e.preventDefault();
    const x = Math.min(0.97, Math.max(0.03, (e.clientX - arrastre.dx) / window.innerWidth));
    const y = Math.min(0.97, Math.max(0.03, (e.clientY - arrastre.dy) / window.innerHeight));
    ajustes.botones[idDe(arrastre.el)] = { x, y };
    colocaBotones();
  };
  const alSoltar = (e) => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    arrastre = null;
    guarda();
  };
  tactil.addEventListener('pointerdown', alPulsar, true);
  tactil.addEventListener('pointermove', alMover, true);
  tactil.addEventListener('pointerup', alSoltar, true);
  tactil.addEventListener('pointercancel', alSoltar, true);

  function editando(si) {
    if (si) tactilOculto = tactil.hidden;
    tactil.hidden = si ? false : tactilOculto;
    tactil.classList.toggle('editando', si);
    barra.hidden = !si;
    alEditar(si);
  }
  panel.querySelector('[data-mover-botones]').addEventListener('click', () => editando(true));
  barra.querySelector('[data-listo]').addEventListener('click', () => editando(false));
  barra.querySelector('[data-restablecer-botones]').addEventListener('click', () => {
    ajustes.botones = {};
    colocaBotones();
    guarda();
  });

  pinta();
  aplica();
}

aplica();
