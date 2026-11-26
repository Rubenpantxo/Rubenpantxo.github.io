// Panel «Enviar fallo o idea» (pantalla #reporte de index.html, se abre desde la pausa).
// Lo importante es lo que escribe el jugador: la descripción es obligatoria. El contexto del
// juego (modo, vehículo, posición, calidad, aparato) se añade aparte, solo como ayuda, y el
// jugador puede quitarlo. Se envía por Web3Forms.
import { REPORTES } from '../config/reportes.js';
import { CALIDAD } from '../config/calidad.js';

export function creaReportes({ leeContexto }) {
  const panel = document.getElementById('reporte');
  const form = document.getElementById('reporte-form');
  if (!panel || !form) return;
  const $ = (sel) => form.querySelector(sel);
  const tipo = () => form.elements.tipo.value;
  const categoria = form.elements.categoria;
  const descripcion = form.elements.descripcion;
  const email = form.elements.email;
  const incluir = form.elements.incluirContexto;
  const contador = $('.reporte-contador');
  const vistaContexto = $('.reporte-contexto pre');
  const estado = $('.reporte-estado');
  const enviar = $('button[type="submit"]');
  const etiquetaDescripcion = $('[data-etiqueta-descripcion]');
  const ayudaDescripcion = $('[data-ayuda-descripcion]');

  for (const c of REPORTES.categorias) {
    const o = document.createElement('option');
    o.value = o.textContent = c;
    categoria.append(o);
  }
  descripcion.maxLength = REPORTES.descripcionMax;

  // Los textos de la descripción cambian según sea un fallo o una idea
  const TEXTOS = {
    fallo: {
      etiqueta: '¿Qué ha pasado? *',
      ayuda: 'Cuéntalo con tus palabras: qué estabas haciendo, qué esperabas que pasara y qué pasó.',
      ejemplo: 'Ej.: Iba en el tractor por el camino de la COPE y al girar a la derecha se ha hundido en el suelo.',
    },
    idea: {
      etiqueta: '¿Qué cambiarías o añadirías? *',
      ayuda: 'Cuéntalo con tus palabras: qué te gustaría y por qué mejoraría el juego.',
      ejemplo: 'Ej.: Que en fiestas se pueda subir a la barrera para ver el encierro desde arriba.',
    },
  };
  function ponTextos() {
    const t = TEXTOS[tipo()] ?? TEXTOS.fallo;
    etiquetaDescripcion.textContent = t.etiqueta;
    ayudaDescripcion.textContent = t.ayuda;
    descripcion.placeholder = t.ejemplo;
  }
  form.addEventListener('change', (e) => { if (e.target.name === 'tipo') ponTextos(); });
  ponTextos();

  const pintaContador = () => {
    const n = descripcion.value.trim().length;
    contador.textContent = n < REPORTES.descripcionMin
      ? `Escribe al menos ${REPORTES.descripcionMin} caracteres (llevas ${n})`
      : `${descripcion.value.length} / ${REPORTES.descripcionMax}`;
  };
  descripcion.addEventListener('input', () => { pintaContador(); descripcion.setCustomValidity(''); });
  email.addEventListener('input', () => email.setCustomValidity(''));

  // Contexto: se toma al abrir el panel (es donde estaba el jugador al pausar)
  let contexto = {};
  let abiertoEn = 0;
  const textoContexto = () => Object.entries(contexto).map(([k, v]) => `${k}: ${v}`).join('\n');
  function alAbrir() {
    let delJuego = {};
    try { delJuego = leeContexto() ?? {}; } catch (e) { console.warn('[reportes] contexto', e); }
    contexto = { ...delJuego, ...contextoAparato() };
    vistaContexto.textContent = textoContexto();
    abiertoEn = Date.now();
    pintaContador();
    muestraEstado('');
    setTimeout(() => descripcion.focus(), 0);
  }
  new MutationObserver(() => { if (!panel.hidden) alAbrir(); })
    .observe(panel, { attributes: true, attributeFilter: ['hidden'] });

  function muestraEstado(texto, clase = '') {
    estado.textContent = texto;
    estado.className = `reporte-estado ${clase}`.trim();
  }
  const asunto = () => `[Cabanillas Drive] ${REPORTES.tipos[tipo()] ?? 'Reporte'} · ${categoria.value}`;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = descripcion.value.trim();
    if (texto.length < REPORTES.descripcionMin) {
      descripcion.setCustomValidity(`Cuéntalo un poco más (mínimo ${REPORTES.descripcionMin} caracteres).`);
      descripcion.reportValidity();
      return;
    }
    const correo = email.value.trim();
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
      email.setCustomValidity('Revisa el correo (nombre@dominio.com) o déjalo vacío.');
      email.reportValidity();
      return;
    }
    // Antispam: casilla trampa invisible o envío demasiado rápido → se finge el envío
    if (form.elements.botcheck.checked || Date.now() - abiertoEn < REPORTES.tiempoMinimoMs) {
      terminaBien();
      return;
    }

    const datos = {
      access_key: REPORTES.claveWeb3Forms,
      subject: asunto(),
      from_name: 'Cabanillas Drive',
      Tipo: REPORTES.tipos[tipo()],
      'Categoría': categoria.value,
      'Descripción del jugador': texto,
      ...(correo ? { email: correo, replyto: correo } : {}),
      ...(incluir.checked ? { 'Contexto del juego (automático)': textoContexto() } : {}),
    };
    enviar.disabled = true;
    muestraEstado('Enviando…');
    try {
      const r = await fetch(REPORTES.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(datos),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.success) throw new Error(json.message || `HTTP ${r.status}`);
      terminaBien();
    } catch (error) {
      console.warn('[reportes] no se ha podido enviar', error);
      muestraEstado('No se ha podido enviar (¿sin conexión?). Tu texto sigue aquí: prueba otra vez en un rato.', 'error');
    } finally {
      enviar.disabled = false;
    }
  });

  function terminaBien() {
    descripcion.value = '';
    pintaContador();
    muestraEstado('✅ ¡Gracias! Lo he recibido y lo revisaré.', 'ok');
  }
}

// Datos del aparato: los que más ayudan a reproducir un fallo gráfico o de controles
function contextoAparato() {
  const tactil = matchMedia('(pointer: coarse)').matches;
  return {
    Calidad: CALIDAD.nivel,
    Pantalla: `${innerWidth}×${innerHeight} (×${devicePixelRatio.toFixed(1)})${tactil ? ', táctil' : ''}`,
    Navegador: navigator.userAgent,
    Parámetros: location.search || '(ninguno)',
    Fecha: new Date().toLocaleString('es-ES'),
  };
}
