// Pantallas de inicio, pausa, controles y créditos (marcado en index.html).
// Estados: «inicio» (cargando o esperando a Jugar) → «jugando» ⇄ «pausa» o «mapa» (minimapa
// ampliado, también en pausa). Esc o P pausan; Esc o el minimapa cierran el mapa.
import { CALIDAD } from '../config/calidad.js';
import { DIA } from '../config/dia.js';
import { creaAjustes } from './ajustes.js';
import { estadoDescargas, marcaAvance } from './progresoCarga.js';

// Sin noticias de la carga durante este tiempo, se ofrece recargar o bajar la calidad
const MS_ATASCO = 25000;

export function creaPantallas({ alCambiar }) {
  const $ = (id) => document.getElementById(id);
  const inicio = $('inicio');
  const pausa = $('pausa');
  const controles = $('controles');
  const creditos = $('creditos');
  const mapa = $('mapa');
  const jugar = $('jugar');
  const barra = $('barra-carga');
  const textoCarga = $('estado-carga');
  const atasco = inicio.querySelector('.atasco');
  let estado = 'inicio';
  let cargando = true;
  let etapa = '';
  let fraccion = 0;
  let preparando = false;

  const cambia = (nuevo) => {
    estado = nuevo;
    inicio.hidden = nuevo !== 'inicio';
    pausa.hidden = nuevo !== 'pausa';
    mapa.hidden = nuevo !== 'mapa';
    if (nuevo !== 'pausa') controles.hidden = true;
    alCambiar(nuevo);
  };

  // Progreso: las descargas llenan la barra hasta el 85 %; el resto, preparar física y HUD
  const mb = (b) => (b / 1048576).toLocaleString('es-ES', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  function pintaCarga() {
    if (!cargando) return;
    const { recibido, total, msSinAvance } = estadoDescargas(CALIDAD.descargaEstimadaMB * 1048576);
    const error = etapa.startsWith('Error') || etapa.startsWith('La gráfica');
    let texto = etapa;
    let f = total ? 0.85 * Math.min(1, recibido / total) : 0;
    if (/física/i.test(etapa)) preparando = true;   // lo grande ya ha llegado; quedan detalles
    if (preparando) f = Math.max(f, 0.9);
    else if (!error && recibido < total) texto = `Descargando ${mb(recibido)} de ${mb(total)} MB`;
    fraccion = Math.max(fraccion, f);
    barra.style.width = `${Math.round(fraccion * 100)}%`;
    if (!error && msSinAvance > MS_ATASCO) texto = 'La carga va muy lenta o se ha atascado';
    textoCarga.textContent = texto || (preparando ? 'Casi listo…' : 'Cargando…');
    atasco.hidden = !(error || msSinAvance > MS_ATASCO);
  }
  const reloj = setInterval(pintaCarga, 250);
  // Lo que escribe el juego durante la carga («Preparando la física…», errores) pasa por aquí
  const etapaCarga = {
    get textContent() { return etapa; },
    set textContent(t) { etapa = String(t ?? ''); marcaAvance(); pintaCarga(); },
  };
  inicio.querySelectorAll('[data-recarga]').forEach((b) => b.addEventListener('click', () => {
    const p = new URLSearchParams(location.search);
    if (b.dataset.recarga) p.set('calidad', b.dataset.recarga);
    location.search = p.toString();
  }));

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
  window.addEventListener('cabanillas:mapa', () => { if (estado === 'jugando') cambia('mapa'); });
  $('mapa-cerrar').addEventListener('click', () => cambia('jugando'));

  // Controles: pestañas teclado / táctil (empieza por la del aparato)
  const pestanas = controles.querySelectorAll('[role="tab"]');
  const muestraVista = (vista) => {
    pestanas.forEach((p) => p.setAttribute('aria-selected', String(p.dataset.vista === vista)));
    controles.querySelectorAll('.vista').forEach((v) => { v.hidden = v.dataset.vista !== vista; });
  };
  pestanas.forEach((p) => p.addEventListener('click', () => muestraVista(p.dataset.vista)));
  muestraVista(matchMedia('(pointer: coarse)').matches ? 'tactil' : 'teclado');

  // Ajustes: al mover los botones táctiles se apartan la pausa y los controles
  creaAjustes({
    alEditar(si) {
      controles.hidden = si;
      pausa.hidden = si || estado !== 'pausa';
    },
  });

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
    if (!controles.hidden) { controles.hidden = true; return; }
    if (estado === 'mapa') { cambia('jugando'); return; }
    if (estado === 'jugando') cambia('pausa');
    else if (estado === 'pausa') cambia('jugando');
  });

  // Hora del día: las opciones están desde el principio (antes esperaban al cielo y el
  // desplegable salía vacío); lo elegido antes de que exista el ciclo se aplica al crearlo
  const selectoresHora = document.querySelectorAll('[data-hora]');
  let ciclo = null;
  let horaPendiente = null;
  for (const sel of selectoresHora) {
    for (const [valor, { nombre }] of Object.entries(DIA.modos)) {
      const o = document.createElement('option');
      o.value = valor;
      o.textContent = nombre;
      sel.append(o);
    }
    sel.value = modoGuardado();
    sel.addEventListener('change', () => {
      if (ciclo) ciclo.ponModo(sel.value);
      else horaPendiente = sel.value;
      const modo = ciclo?.modo ?? sel.value;
      selectoresHora.forEach((s) => { s.value = modo; });
    });
  }
  function ponHoras(c) {
    ciclo = c;
    if (horaPendiente) ciclo.ponModo(horaPendiente);
    selectoresHora.forEach((s) => { s.value = ciclo.modo; });
    // Al abrir la pausa, el selector refleja el modo
    new MutationObserver(() => selectoresHora.forEach((s) => { s.value = ciclo.modo; }))
      .observe(pausa, { attributes: true, attributeFilter: ['hidden'] });
  }

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
    ponHoras,
    get estado() { return estado; },
    textoCarga: etapaCarga,
    listo() {
      cargando = false;
      clearInterval(reloj);
      inicio.querySelector('.carga').hidden = true;
      jugar.hidden = false;
      jugar.focus();
    },
    // Visores de comprobación: sin pantalla de inicio
    omite() {
      cargando = false;
      clearInterval(reloj);
      inicio.hidden = true;
      estado = 'jugando';
    },
  };
}

// Mismo criterio que cicloDia.js: ?hora= o lo último elegido
function modoGuardado() {
  let p = new URLSearchParams(location.search).get('hora');
  try { p ??= localStorage.getItem('cabanillas.hora'); } catch { /* nada */ }
  return p && DIA.modos[p] ? p : DIA.modoInicial;
}
