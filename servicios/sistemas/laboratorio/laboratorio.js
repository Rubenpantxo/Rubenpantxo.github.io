/* ============================================================
   LABORATORIO DE UI KITS
   ------------------------------------------------------------
   - Lee kits/index.json y pinta una miniatura por kit.
   - Cambiar de kit = cambiar data-kit en el contenedor de la escena.
     El CSS de cada kit se pide solo al elegirlo (salvo el de por defecto).
   - «Me quedo con este» guarda el kit en sessionStorage ('sv:kit') y
     avisa con dos eventos para el briefing (zona 6):
        document → CustomEvent 'sv:kit'
        window y document → CustomEvent 'servicios:kit-elegido'
     detail = { id, nombre, direccion, colorMarca, modo }
   Para añadir un kit no hace falta tocar este archivo: ver LEEME.md.
   ============================================================ */
(function () {
  'use strict';

  const CLAVE = 'sv:kit';
  const $ = (s, r = document) => r.querySelector(s);

  const estado = {
    indice: null,
    kits: [],
    activo: null,
    comparado: null,
    comparando: false,
    modo: 'claro',
    escena: 'tienda',
    colorMarca: null,
    favorito: null,
  };

  const cacheFichas = new Map();
  const cacheCss = new Map();
  const cargasCss = new Map();

  const escenaA = $('#escena-a');
  const escenaB = $('#escena-b');

  // ---------- utilidades ----------
  function evento(nombre, parametros) {
    try { if (typeof window.rpEvento === 'function') window.rpEvento(nombre, parametros || {}); } catch (e) { /* sin analítica */ }
  }
  function anunciar(texto) { $('#anuncio').textContent = texto; }
  function leerFavorito() {
    try { return JSON.parse(sessionStorage.getItem(CLAVE) || 'null'); } catch (e) { return null; }
  }
  function guardarFavorito(dato) {
    try { sessionStorage.setItem(CLAVE, JSON.stringify(dato)); } catch (e) { /* almacenamiento bloqueado: el evento sigue saliendo */ }
  }
  const kitPorId = id => estado.kits.find(k => k.id === id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- carga perezosa del CSS y las fuentes de un kit ----------
  function asegurarKit(kit) {
    if (cargasCss.has(kit.id)) return cargasCss.get(kit.id);
    const promesa = new Promise(resolve => {
      if (kit.fuentes && !document.querySelector(`link[data-fuentes-kit="${kit.id}"]`)) {
        const f = document.createElement('link');
        f.rel = 'stylesheet';
        f.href = 'https://fonts.googleapis.com/css2?' + kit.fuentes + '&display=swap';
        f.dataset.fuentesKit = kit.id;
        document.head.appendChild(f);
      }
      const existente = document.querySelector(`link[data-css-kit="${kit.id}"]`);
      if (existente) { resolve(); return; }
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'kits/' + kit.css;
      l.dataset.cssKit = kit.id;
      l.onload = () => resolve();
      l.onerror = () => { anunciar('No se ha podido cargar el kit ' + kit.nombre + '.'); resolve(); };
      document.head.appendChild(l);
    });
    cargasCss.set(kit.id, promesa);
    return promesa;
  }

  // ---------- miniaturas ----------
  function miniatura(kit) {
    if (kit.miniatura) return `<span class="lab-mini"><img src="kits/${esc(kit.miniatura)}" alt="" loading="lazy"></span>`;
    const m = kit.muestra || {};
    const sombras = {
      solida: `4px 4px 0 ${m.texto}`,
      difusa: '0 10px 24px -8px rgb(0 0 0 / .35)',
      canto: `4px 4px 0 ${m.texto}33, 8px 8px 0 ${m.texto}22`,
      suave: '0 2px 8px rgb(0 0 0 / .08)',
      ninguna: 'none',
    };
    const borde = m.borde || 1;
    const estilo = [
      `--m-fondo:${m.fondo}`, `--m-superficie:${m.superficie}`, `--m-accion:${m.accion}`,
      `--m-acento:${m.acento}`, `--m-texto:${m.texto}`, `--m-radio:${m.radio || 0}px`,
      `--m-borde:${borde}px`, `--m-linea:${borde >= 2 ? m.texto : m.texto + '33'}`,
      `--m-linea-boton:${borde >= 2 ? m.texto : 'transparent'}`,
      `--m-sombra:${sombras[m.sombra] || 'none'}`,
    ].join(';');
    return `<span class="lab-mini" style="${esc(estilo)}" aria-hidden="true"><span class="lab-mini-tarjeta"><span class="lab-mini-linea"></span><span class="lab-mini-linea lab-mini-linea--corta"></span><span class="lab-mini-pie"><span class="lab-mini-boton"></span><span class="lab-mini-punto"></span></span></span></span>`;
  }

  function pintarMuestras() {
    const caja = $('#muestras');
    caja.innerHTML = estado.kits.map(k => `
      <button type="button" class="lab-muestra" role="radio" aria-checked="false" data-kit-id="${esc(k.id)}" tabindex="-1" data-evento="lab_kit_cambio" data-evento-kit="${esc(k.id)}">
        ${miniatura(k)}
        <span class="lab-muestra-nombre">${esc(k.nombre)}<span class="lab-muestra-dir">${esc(k.direccion || '')}</span></span>
        <span class="lab-muestra-fav" hidden>★ Tu elección</span>
      </button>`).join('');
    caja.addEventListener('click', e => {
      const b = e.target.closest('[data-kit-id]');
      if (b) elegirKit(b.dataset.kitId, true);
    });
    radiogrupo(caja, '[data-kit-id]', b => elegirKit(b.dataset.kitId, true));
  }

  function marcarMuestras() {
    document.querySelectorAll('.lab-muestra').forEach(b => {
      const activo = b.dataset.kitId === estado.activo;
      if (activo && b.getAttribute('aria-checked') !== 'true') {
        // En móvil la fila se desliza: deja visible la miniatura elegida
        const caja = b.parentElement;
        const izq = b.offsetLeft - caja.offsetLeft;
        if (izq < caja.scrollLeft || izq + b.offsetWidth > caja.scrollLeft + caja.clientWidth) {
          caja.scrollTo({ left: izq - 16, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        }
      }
      b.setAttribute('aria-checked', String(activo));
      b.tabIndex = activo ? 0 : -1;
      b.querySelector('.lab-muestra-fav').hidden = !(estado.favorito && estado.favorito.id === b.dataset.kitId);
    });
  }

  // Flechas para moverse en un grupo de radios hechos con botones
  function radiogrupo(caja, selector, alElegir) {
    caja.addEventListener('keydown', e => {
      const teclas = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (!(e.key in teclas) && e.key !== 'Home' && e.key !== 'End') return;
      const items = [...caja.querySelectorAll(selector)];
      let i = items.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      if (e.key === 'Home') i = 0;
      else if (e.key === 'End') i = items.length - 1;
      else i = (i + teclas[e.key] + items.length) % items.length;
      items[i].focus();
      alElegir(items[i]);
    });
  }

  // ---------- escenas ----------
  function pintarEscena(el) {
    const t = document.getElementById('escena-' + estado.escena);
    el.innerHTML = t.innerHTML.replace(/\{\{id\}\}/g, el.id);
    if (estado.comparando) {
      const kit = kitPorId(el.dataset.kit);
      const r = document.createElement('span');
      r.className = 'lab-escena-rotulo';
      r.textContent = kit ? kit.nombre : '';
      el.prepend(r);
    }
  }
  function pintarEscenas() {
    pintarEscena(escenaA);
    if (estado.comparando) pintarEscena(escenaB);
  }

  // ---------- cambio de kit ----------
  async function elegirKit(id, porUsuario) {
    const kit = kitPorId(id);
    if (!kit) return;
    await asegurarKit(kit);
    estado.activo = id;
    escenaA.dataset.kit = id;
    if (estado.comparando && estado.comparado === id) {
      estado.comparado = siguienteKit(id);
      await aplicarComparado();
    }
    if (estado.comparando) { pintarEscenas(); rellenarComparar(); }
    marcarMuestras();
    aplicarColorMarca();
    if (!estado.colorMarca) {
      const rgb = colorDe(escenaA, '--color-accion').rgb;
      $('#color-marca').value = '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
    }
    await pintarFicha(kit);
    if (porUsuario) {
      anunciar('Kit ' + kit.nombre + ' aplicado.');
      try { history.replaceState(null, '', '?kit=' + encodeURIComponent(id)); } catch (e) { /* file:// */ }
    }
  }

  function siguienteKit(id) {
    const i = estado.kits.findIndex(k => k.id === id);
    return estado.kits[(i + 1) % estado.kits.length].id;
  }

  // ---------- comparación ----------
  function rellenarComparar() {
    const sel = $('#comparar-con');
    sel.innerHTML = estado.kits.filter(k => k.id !== estado.activo)
      .map(k => `<option value="${esc(k.id)}"${k.id === estado.comparado ? ' selected' : ''}>${esc(k.nombre)} · ${esc(k.direccion || '')}</option>`).join('');
  }
  async function aplicarComparado() {
    const kit = kitPorId(estado.comparado);
    await asegurarKit(kit);
    escenaB.dataset.kit = kit.id;
    aplicarColorMarca();
  }
  async function alternarComparar() {
    estado.comparando = !estado.comparando;
    $('#comparar').setAttribute('aria-pressed', String(estado.comparando));
    $('#comparar-con-envoltura').hidden = !estado.comparando;
    $('#escenario').dataset.comparando = String(estado.comparando);
    escenaB.hidden = !estado.comparando;
    if (estado.comparando) {
      if (!estado.comparado || estado.comparado === estado.activo) estado.comparado = siguienteKit(estado.activo);
      rellenarComparar();
      await aplicarComparado();
      evento('lab_comparar', { kit: estado.activo, con: estado.comparado });
    }
    pintarEscenas();
  }

  // ---------- modo claro / oscuro ----------
  function alternarModo() {
    estado.modo = estado.modo === 'claro' ? 'oscuro' : 'claro';
    escenaA.dataset.modo = escenaB.dataset.modo = estado.modo;
    $('#modo').setAttribute('aria-pressed', String(estado.modo === 'oscuro'));
    aplicarColorMarca();
    actualizarContraste();
  }

  // ---------- color de marca ----------
  function luminancia([r, g, b]) {
    const c = [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  }
  function ratio(a, b) {
    const la = luminancia(a), lb = luminancia(b);
    return (Math.max(la, lb) + .05) / (Math.min(la, lb) + .05);
  }
  function hexARgb(h) {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function aplicarColorMarca() {
    [escenaA, escenaB].forEach(el => {
      if (!estado.colorMarca) {
        el.style.removeProperty('--color-accion');
        el.style.removeProperty('--color-sobre-accion');
        return;
      }
      const rgb = hexARgb(estado.colorMarca);
      const sobre = ratio(rgb, [255, 255, 255]) >= ratio(rgb, [17, 17, 17]) ? '#ffffff' : '#111111';
      el.style.setProperty('--color-accion', estado.colorMarca);
      el.style.setProperty('--color-sobre-accion', sobre);
    });
    $('#color-quitar').hidden = !estado.colorMarca;
    actualizarContraste();
  }

  // ---------- contraste medido en vivo ----------
  function colorDe(el, token) {
    const p = document.createElement('span');
    p.style.color = `var(${token})`;
    p.hidden = true;
    el.appendChild(p);
    const c = getComputedStyle(p).color;
    p.remove();
    return parseColor(c);
  }
  function parseColor(c) {
    let m = c.match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?/);
    if (m) {
      let a = m[4] === undefined ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
      return { rgb: [+m[1], +m[2], +m[3]], a };
    }
    m = c.match(/color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.]+))?/);
    if (m) return { rgb: [m[1], m[2], m[3]].map(v => Math.round(Math.min(1, Math.max(0, +v)) * 255)), a: m[4] === undefined ? 1 : +m[4] };
    return { rgb: [0, 0, 0], a: 1 };
  }
  function sobre(c, base) {
    return c.rgb.map((v, i) => Math.round(v * c.a + base[i] * (1 - c.a)));
  }
  function actualizarContraste() {
    const el = escenaA;
    const fondo = colorDe(el, '--color-fondo-solido').rgb;
    const sup = sobre(colorDe(el, '--color-superficie'), fondo);
    const pares = [
      ['Texto sobre fondo', sobre(colorDe(el, '--color-texto'), fondo), fondo],
      ['Texto sobre tarjeta', sobre(colorDe(el, '--color-texto'), sup), sup],
      ['Texto secundario', sobre(colorDe(el, '--color-texto-suave'), sup), sup],
      ['Botón principal', colorDe(el, '--color-sobre-accion').rgb, sobre(colorDe(el, '--color-accion'), sup)],
      ['Etiqueta', colorDe(el, '--color-sobre-acento').rgb, sobre(colorDe(el, '--color-acento'), sup)],
    ];
    $('#ficha-contraste').innerHTML = pares.map(([n, a, b]) => {
      const r = ratio(a, b);
      const ok = r >= 4.5;
      return `<li><span>${n}</span><span class="${ok ? 'ok' : 'mal'}">${r.toFixed(1)}:1 ${ok ? 'AA ✓' : 'bajo'}</span></li>`;
    }).join('');
  }

  // ---------- ficha ----------
  async function cargarFicha(kit) {
    if (cacheFichas.has(kit.id)) return cacheFichas.get(kit.id);
    let f = null;
    try { f = await (await fetch('kits/' + kit.ficha)).json(); } catch (e) { f = null; }
    f = f || { nombre: kit.nombre, direccion: kit.direccion, lema: kit.descripcion, sectores: kit.sectores || [] };
    cacheFichas.set(kit.id, f);
    return f;
  }
  async function pintarFicha(kit) {
    const f = await cargarFicha(kit);
    if (estado.activo !== kit.id) return;
    $('#ficha-direccion').textContent = f.direccion || kit.direccion || '';
    $('#ficha-nombre').textContent = f.nombre || kit.nombre;
    $('#ficha-lema').textContent = f.lema || kit.descripcion || '';
    $('#ficha-personalidad').textContent = f.personalidad || '—';
    $('#ficha-para').textContent = f.paraQuien || '—';
    $('#ficha-sectores').innerHTML = (f.sectores || kit.sectores || []).map(s => `<li>${esc(s)}</li>`).join('');
    const t = f.tipografia || {};
    $('#ficha-tipo').innerHTML = [['Titulares', t.titulos], ['Texto', t.texto], ['Datos', t.mono]]
      .filter(x => x[1]).map(([n, v]) => `${n}: <b>${esc(v)}</b>`).join(' · ') || '—';
    $('#ficha-paleta').innerHTML = (f.paleta || []).map(c => `<li><span style="background:${esc(c.valor)}"></span>${esc(c.nombre)}</li>`).join('');
    const r = f.rasgos || {};
    $('#ficha-rasgos').innerHTML = [['Bordes', r.bordes], ['Sombras', r.sombras], ['Movimiento', r.movimiento]]
      .filter(x => x[1]).map(([n, v]) => `<li><b>${n}:</b> ${esc(v)}</li>`).join('');
    $('#ficha-ejemplo').textContent = f.ejemplo || '—';
    $('#ficha-accesibilidad').textContent = f.accesibilidad || '';
    const ref = f.referencia || {};
    const conRef = ref.enlace && /^https?:\/\//.test(ref.enlace);
    $('#ficha-ref-fila').hidden = !conRef;
    if (conRef) $('#ficha-ref').innerHTML = `<a href="${esc(ref.enlace)}" target="_blank" rel="noopener">${esc([ref.biblioteca, ref.pieza].filter(Boolean).join(' · ') || 'Ver referencia')} ↗</a>`;
    pintarElegido();
    actualizarContraste();
    if ($('#codigo').open) pintarCodigo();
  }

  // ---------- «Me quedo con este» ----------
  function pintarElegido() {
    const b = $('#elegir');
    const es = estado.favorito && estado.favorito.id === estado.activo;
    b.setAttribute('aria-pressed', String(!!es));
    b.textContent = es ? 'Es tu elección' : 'Me quedo con este';
    b.dataset.eventoKit = estado.activo;
    const p = $('#elegido');
    if (estado.favorito) {
      p.hidden = false;
      p.innerHTML = `Has elegido <b>${esc(estado.favorito.nombre)}</b>. Irá con tu mensaje: <a href="../../../index.html#contacto" data-evento="quiero_una_asi" data-evento-origen="laboratorio_ficha">cuéntame tu idea →</a>`;
    } else p.hidden = true;
  }
  function elegirFavorito() {
    const kit = kitPorId(estado.activo);
    const detail = { id: kit.id, nombre: kit.nombre, direccion: kit.direccion || '', colorMarca: estado.colorMarca, modo: estado.modo };
    estado.favorito = detail;
    guardarFavorito(detail);
    document.dispatchEvent(new CustomEvent('sv:kit', { detail }));
    const ev = () => new CustomEvent('servicios:kit-elegido', { detail });
    window.dispatchEvent(ev());
    document.dispatchEvent(ev());
    marcarMuestras();
    pintarElegido();
    anunciar('Guardado: ' + kit.nombre + ' es tu kit. Llegará con tu mensaje.');
  }

  // ---------- código y exportación ----------
  async function textoCss(kit) {
    if (cacheCss.has(kit.id)) return cacheCss.get(kit.id);
    let t = '';
    try { t = await (await fetch('kits/' + kit.css)).text(); } catch (e) { t = '/* No se ha podido leer el CSS del kit. */'; }
    cacheCss.set(kit.id, t);
    return t;
  }
  async function pintarCodigo() {
    const kit = kitPorId(estado.activo);
    $('#codigo-css').textContent = await textoCss(kit);
  }

  // Formato Design Tokens (W3C DTCG), el que importan Tokens Studio y Figma
  const FAMILIAS = [
    ['color', /^--color-/, 'color'],
    ['fuente', /^--fuente-/, 'fontFamily'],
    ['peso', /^--peso-/, 'fontWeight'],
    ['texto', /^--texto-/, 'dimension'],
    ['espacio', /^--espacio-/, 'dimension'],
    ['radio', /^--radio-/, 'dimension'],
    ['borde', /^--borde-/, null],
    ['sombra', /^--sombra-/, 'shadow'],
    ['duracion', /^--duracion-/, 'duration'],
    ['curva', /^--curva/, 'cubicBezier'],
    ['boton', /^--boton-/, null],
    ['tarjeta', /^--tarjeta-/, null],
    ['campo', /^--campo-/, null],
    ['etiqueta', /^--etiqueta-/, null],
  ];
  function nombresDeTokens() {
    const nombres = new Set();
    for (const hoja of document.styleSheets) {
      let reglas;
      try { reglas = hoja.cssRules; } catch (e) { continue; }
      for (const r of reglas || []) {
        if (!r.style || !/data-kit/.test(r.selectorText || '')) continue;
        for (const p of r.style) if (p.startsWith('--') && !p.startsWith('--p-')) nombres.add(p);
      }
    }
    return [...nombres].sort();
  }
  function descargarJson() {
    const kit = kitPorId(estado.activo);
    const cs = getComputedStyle(escenaA);
    const salida = { $description: `UI Kit «${kit.nombre}» (${kit.direccion || ''}), modo ${estado.modo}. Exportado desde rubenpantxo.com/servicios/sistemas/laboratorio/` };
    for (const nombre of nombresDeTokens()) {
      const familia = FAMILIAS.find(f => f[1].test(nombre));
      if (!familia) continue;
      const valor = cs.getPropertyValue(nombre).trim();
      if (!valor) continue;
      const clave = nombre.replace(familia[1], '').replace(/^-/, '') || familia[0];
      salida[familia[0]] = salida[familia[0]] || {};
      const token = { $value: valor };
      if (familia[2]) token.$type = familia[2];
      salida[familia[0]][clave] = token;
    }
    const blob = new Blob([JSON.stringify(salida, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tokens-${kit.id}-${estado.modo}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    anunciar('Descargados los tokens de ' + kit.nombre + '.');
  }
  async function copiarCss() {
    const t = await textoCss(kitPorId(estado.activo));
    try { await navigator.clipboard.writeText(t); anunciar('CSS copiado.'); } catch (e) { anunciar('No se ha podido copiar: selecciona el texto a mano.'); }
  }

  // ---------- arranque ----------
  function conectarControles() {
    const escenas = $('#escenas');
    const elegirEscena = b => {
      estado.escena = b.dataset.escena;
      escenas.querySelectorAll('button').forEach(x => { x.setAttribute('aria-checked', String(x === b)); x.tabIndex = x === b ? 0 : -1; });
      pintarEscenas();
    };
    escenas.querySelectorAll('button').forEach((b, i) => { b.tabIndex = i === 0 ? 0 : -1; b.addEventListener('click', () => elegirEscena(b)); });
    radiogrupo(escenas, 'button', elegirEscena);

    $('#modo').addEventListener('click', alternarModo);
    $('#comparar').addEventListener('click', alternarComparar);
    $('#comparar-con').addEventListener('change', async e => {
      estado.comparado = e.target.value;
      await aplicarComparado();
      pintarEscenas();
    });

    const color = $('#color-marca');
    let avisado = false;
    color.addEventListener('input', () => {
      estado.colorMarca = color.value;
      aplicarColorMarca();
      if (!avisado) { avisado = true; evento('lab_color_marca', { kit: estado.activo }); }
    });
    $('#color-quitar').addEventListener('click', () => { estado.colorMarca = null; aplicarColorMarca(); anunciar('Vuelve el color original del kit.'); });

    $('#elegir').addEventListener('click', elegirFavorito);
    $('#codigo').addEventListener('toggle', e => { if (e.target.open) pintarCodigo(); });
    $('#descargar-json').addEventListener('click', descargarJson);
    $('#copiar-css').addEventListener('click', copiarCss);

    // Los botones de la escena son de muestra: no envían nada
    document.addEventListener('submit', e => { if (e.target.closest('.lab-escena')) e.preventDefault(); });
  }

  async function iniciar() {
    conectarControles();
    try {
      estado.indice = await (await fetch('kits/index.json')).json();
    } catch (e) {
      anunciar('No se ha podido leer la lista de kits.');
      pintarEscenas();
      return;
    }
    estado.kits = (estado.indice.kits || []).filter(k => k && k.id && k.css).sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
    estado.favorito = leerFavorito();
    pintarMuestras();
    // Orden de preferencia: ?kit= en la URL, el favorito de esta sesión, el de por defecto
    let pedido = null;
    try { pedido = new URLSearchParams(location.search).get('kit'); } catch (e) { /* sin URL */ }
    const inicial = [pedido, estado.favorito && estado.favorito.id, estado.indice.porDefecto, estado.kits[0] && estado.kits[0].id]
      .find(id => id && kitPorId(id));
    pintarEscenas();
    if (inicial) await elegirKit(inicial, false);
  }

  window.ServiciosKits = {
    favorito: () => estado.favorito || leerFavorito(),
    activo: () => estado.activo,
    kits: () => estado.kits.slice(),
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
