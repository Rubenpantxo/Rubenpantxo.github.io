// Pantallas de inicio, pausa y créditos (marcado en index.html).
// Estados: «inicio» (cargando o esperando a Jugar) → «jugando» ⇄ «pausa». Esc o P pausan.
import { CALIDAD } from '../config/calidad.js';

export function creaPantallas({ alCambiar }) {
  const $ = (id) => document.getElementById(id);
  const inicio = $('inicio');
  const pausa = $('pausa');
  const creditos = $('creditos');
  const jugar = $('jugar');
  const barra = $('barra-carga');
  const textoCarga = $('estado-carga');
  let estado = 'inicio';

  const cambia = (nuevo) => {
    estado = nuevo;
    inicio.hidden = nuevo !== 'inicio';
    pausa.hidden = nuevo !== 'pausa';
    alCambiar(nuevo);
  };

  // Progreso: el texto que escribe la carga («Cargando escena… 47 %») mueve la barra
  new MutationObserver(() => {
    const m = /(\d+)\s*%/.exec(textoCarga.textContent);
    if (m) barra.style.width = `${Math.min(100, Number(m[1]))}%`;
  }).observe(textoCarga, { childList: true, characterData: true, subtree: true });

  jugar.addEventListener('click', () => cambia('jugando'));
  document.querySelectorAll('[data-abre]').forEach((b) => b.addEventListener('click', () => {
    $(b.dataset.abre).hidden = false;
    $(b.dataset.abre).querySelector('button')?.focus();
  }));
  document.querySelectorAll('[data-cierra]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.cierra === 'pausa') cambia('jugando');
    else $(b.dataset.cierra).hidden = true;
  }));
  $('boton-menu').addEventListener('click', () => { if (estado === 'jugando') cambia('pausa'); });

  // Calidad: se aplica recargando con ?calidad= (mantiene el resto de parámetros)
  document.querySelectorAll('[data-calidad]').forEach((sel) => {
    sel.value = CALIDAD.nivel;
    sel.addEventListener('change', () => {
      const p = new URLSearchParams(location.search);
      p.set('calidad', sel.value);
      location.search = p.toString();
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape' && e.code !== 'KeyP') return;
    if (!creditos.hidden) { creditos.hidden = true; return; }
    if (estado === 'jugando') cambia('pausa');
    else if (estado === 'pausa') cambia('jugando');
  });

  // «Ir a…»: lista de lugares; al elegir uno se cierra la pausa
  function ponLugares(lugares, alElegir) {
    const sel = $('ir-a');
    for (const l of lugares) {
      const o = document.createElement('option');
      o.value = l.nombre;
      o.textContent = `${l.icono} ${l.nombre}`;
      sel.append(o);
    }
    sel.closest('label').hidden = !lugares.length;
    sel.addEventListener('change', () => {
      if (!sel.value) return;
      alElegir(sel.value);
      sel.value = '';
      cambia('jugando');
    });
  }

  return {
    ponLugares,
    get estado() { return estado; },
    textoCarga,
    listo() {
      barra.style.width = '100%';
      textoCarga.textContent = 'Listo';
      jugar.disabled = false;
      jugar.focus();
    },
    error(mensaje) {
      textoCarga.textContent = mensaje;
    },
    // Visores de comprobación: sin pantalla de inicio
    omite() {
      inicio.hidden = true;
      estado = 'jugando';
    },
  };
}
