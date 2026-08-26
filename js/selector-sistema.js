/**
 * SELECTOR DE SISTEMA DE DISENO
 *
 * Cambia en vivo los tres ejes de una pagina — paleta, tipografia y elementos —
 * escribiendo tres atributos en <html>. El CSS (servicios/sistemas/tema.css)
 * hace todo lo demas.
 *
 * De donde sale el estado, en este orden:
 *   1. la URL          ?paleta=…&tipo=…&elem=…   (para mandarle un enlace a alguien)
 *   2. localStorage    lo ultimo que eligio quien mira
 *   3. el HTML         los data-* que trae la pagina de serie
 *
 * El paso 3 es el que importa: cada pagina declara su combinacion por defecto
 * en el propio <html>, asi que se ve bien aunque este script no llegue a correr.
 *
 * Necesita, antes que el:
 *   <link rel="stylesheet" href="…/sistemas/tema.css">
 *   <script src="…/sistemas/tema-datos.js"></script>
 */
(function () {
  'use strict';

  var CAT = window.SD_CATALOGO;
  if (!CAT) return; // sin catalogo no hay nada que ofrecer

  var EJES = [
    { attr: 'data-paleta', param: 'paleta', clave: 'sd-paleta', lista: 'paletas', titulo: 'Paleta de colores' },
    { attr: 'data-tipo', param: 'tipo', clave: 'sd-tipo', lista: 'tipografias', titulo: 'Tipografía' },
    { attr: 'data-elem', param: 'elem', clave: 'sd-elem', lista: 'elementos', titulo: 'Elementos' }
  ];

  var raiz = document.documentElement;
  // Una pagina que trata SOBRE un sistema concreto — la ficha de Neon, por
  // ejemplo — no debe heredar lo que se eligio en otra pagina: se abriria con
  // una paleta que no es la suya. El selector sigue funcionando; lo que no hace
  // es leer ni escribir la memoria. Un enlace con parametros si manda.
  var MEMORIA = raiz.getAttribute('data-tema-memoria') !== 'no';
  // La combinacion con la que nacio la pagina: es a la que vuelve "Restaurar".
  var ORIGINAL = {};
  EJES.forEach(function (e) { ORIGINAL[e.param] = raiz.getAttribute(e.attr) || CAT[e.lista][0].id; });

  /* ---------- fuentes ---------- */
  var fuentesPuestas = {};
  function cargarFuente(google) {
    if (!google || fuentesPuestas[google]) return;
    fuentesPuestas[google] = true;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + google + '&display=swap';
    document.head.appendChild(l);
  }

  function cargarTodasLasFuentes() {
    CAT.tipografias.forEach(function (t) { cargarFuente(t.google); });
  }

  /* ---------- estado ---------- */
  function leerEstado() {
    var url = new URLSearchParams(location.search);
    var estado = {};
    EJES.forEach(function (e) {
      var valido = function (id) { return CAT[e.lista].some(function (o) { return o.id === id; }); };
      var deUrl = url.get(e.param);
      var deDisco = null;
      if (MEMORIA) {
        try { deDisco = localStorage.getItem(e.clave); } catch (err) { /* modo privado */ }
      }
      estado[e.param] = (valido(deUrl) && deUrl) || (valido(deDisco) && deDisco) || ORIGINAL[e.param];
    });
    return estado;
  }

  function aplicar(estado, guardar, olvidar) {
    EJES.forEach(function (e) {
      raiz.setAttribute(e.attr, estado[e.param]);
      if (!guardar || !MEMORIA) return;
      try {
        // Restaurar borra la memoria en vez de grabar el valor por defecto:
        // si lo grabase, seguiria pisando a las demas paginas.
        if (olvidar) localStorage.removeItem(e.clave);
        else localStorage.setItem(e.clave, estado[e.param]);
      } catch (err) { /* modo privado */ }
    });
    var t = buscar('tipografias', estado.tipo);
    if (t) cargarFuente(t.google);

    if (guardar) {
      var url = new URL(location.href);
      EJES.forEach(function (e) {
        // Si coincide con lo que trae la pagina, fuera de la URL: no ensuciamos
        // el enlace con lo que ya es el valor por defecto.
        if (estado[e.param] === ORIGINAL[e.param]) url.searchParams.delete(e.param);
        else url.searchParams.set(e.param, estado[e.param]);
      });
      history.replaceState(null, '', url);
    }
    actual = estado;
    pintarSeleccion();
    anunciar();
  }

  function buscar(lista, id) {
    var arr = CAT[lista] || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }

  var actual = leerEstado();
  aplicar(actual, false);

  /* ---------- cromado del panel ----------
     A proposito NO usa las variables --sd-*: si el panel se tematizara con la
     paleta elegida, probar una paleta oscura dejaria el propio selector
     ilegible y estarias eligiendo a ciegas. */
  var CSS = [
    '.sdx-abrir{position:fixed;right:16px;bottom:16px;z-index:9998;display:inline-flex;align-items:center;gap:8px;',
    'padding:11px 16px;border:1px solid #3a3a40;border-radius:999px;background:#17171b;color:#f4f4f6;',
    'font:600 13px/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 24px rgb(0 0 0/.35)}',
    '.sdx-abrir:hover{background:#202027;border-color:#55555e}',
    '.sdx-abrir i{display:block;width:12px;height:12px;border-radius:50%;background:conic-gradient(#e7335a,#c8f04c,#38e1d4,#c67139,#e7335a)}',
    '.sdx-panel{position:fixed;inset:auto 12px 12px auto;z-index:9999;width:min(30rem,calc(100vw - 24px));',
    'max-height:min(38rem,calc(100vh - 24px));overflow:auto;padding:18px;border:1px solid #3a3a40;border-radius:16px;',
    'background:#0f0f12;color:#f4f4f6;font:14px/1.5 ui-sans-serif,system-ui,sans-serif;box-shadow:0 20px 60px rgb(0 0 0/.55)}',
    '.sdx-panel[hidden]{display:none}',
    '.sdx-cab{display:flex;align-items:baseline;gap:10px;margin-bottom:4px}',
    '.sdx-cab h2{margin:0;font-size:15px;font-weight:700}',
    '.sdx-cerrar{margin-left:auto;width:30px;height:30px;border:1px solid #3a3a40;border-radius:8px;background:transparent;color:#c9c9d1;font-size:16px;cursor:pointer}',
    '.sdx-cerrar:hover{background:#202027;color:#fff}',
    '.sdx-pie-cab{margin:0 0 14px;font-size:12px;color:#9a9aa4}',
    '.sdx-grupo{margin-bottom:18px}',
    '.sdx-grupo>h3{margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8e8e99}',
    '.sdx-rejilla{display:grid;grid-template-columns:repeat(auto-fill,minmax(8.5rem,1fr));gap:8px;margin:0;padding:0;list-style:none}',
    '.sdx-op{display:grid;gap:6px;width:100%;padding:9px;border:1px solid #33333a;border-radius:10px;background:#17171b;',
    'color:#e9e9ee;font:inherit;text-align:left;cursor:pointer}',
    '.sdx-op:hover{border-color:#5a5a66}',
    '.sdx-op[aria-pressed="true"]{border-color:#8fd63f;box-shadow:inset 0 0 0 1px #8fd63f}',
    '.sdx-op b{font-size:12px;font-weight:600}',
    '.sdx-op small{font-size:10.5px;color:#8e8e99;line-height:1.35}',
    '.sdx-tiras{display:flex;gap:3px;height:20px}',
    '.sdx-tiras span{flex:1;border-radius:4px;box-shadow:inset 0 0 0 1px rgb(255 255 255/.12)}',
    '.sdx-muestra{display:block;padding:6px 8px;border-radius:6px;background:#000;font-size:15px;line-height:1.1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.sdx-forma{display:flex;align-items:center;gap:6px;height:26px}',
    '.sdx-forma i{display:block;width:34px;height:18px;background:#8fd63f}',
    '.sdx-forma u{display:block;flex:1;height:18px;border:1px solid #55555e;text-decoration:none}',
    '.sdx-presets{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}',
    '.sdx-preset{padding:6px 11px;border:1px solid #33333a;border-radius:999px;background:#17171b;color:#d7d7de;font:600 12px/1 inherit;cursor:pointer}',
    '.sdx-preset:hover{border-color:#5a5a66;color:#fff}',
    '.sdx-preset[aria-pressed="true"]{border-color:#8fd63f;color:#c8f04c}',
    '.sdx-acciones{display:flex;gap:8px;align-items:center;border-top:1px solid #2a2a30;padding-top:12px}',
    '.sdx-accion{padding:8px 12px;border:1px solid #33333a;border-radius:8px;background:transparent;color:#d7d7de;font:600 12px/1 inherit;cursor:pointer}',
    '.sdx-accion:hover{background:#202027;color:#fff}',
    '.sdx-estado{margin-left:auto;font-size:11px;color:#8e8e99}',
    '.sdx-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}',
    '.sdx-panel :focus-visible,.sdx-abrir:focus-visible{outline:2px solid #8fd63f;outline-offset:2px}',
    '@media (max-width:640px){.sdx-panel{inset:auto 8px 8px 8px;width:auto}}'
  ].join('');

  var hoja = document.createElement('style');
  hoja.textContent = CSS;
  document.head.appendChild(hoja);

  /* ---------- interfaz ---------- */
  var abrir = document.createElement('button');
  abrir.type = 'button';
  abrir.className = 'sdx-abrir';
  abrir.innerHTML = '<i aria-hidden="true"></i> Cambiar el diseño';
  abrir.setAttribute('aria-expanded', 'false');

  var panel = document.createElement('div');
  panel.className = 'sdx-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('aria-label', 'Elegir paleta, tipografía y elementos');

  function opcionPaleta(o) {
    return '<span class="sdx-tiras" aria-hidden="true">'
      + o.muestras.map(function (c) { return '<span style="background:' + c + '"></span>'; }).join('')
      + '</span><b>' + esc(o.nombre) + '</b><small>' + esc(o.banda) + '</small>';
  }

  function opcionTipo(o) {
    var est = 'font-family:' + o.display + ';font-weight:' + o.peso
      + ';letter-spacing:' + o.tracking + ';text-transform:' + o.caja;
    return '<span class="sdx-muestra" style="' + est + '" aria-hidden="true">' + esc(o.muestra) + '</span>'
      + '<b>' + esc(o.nombre) + '</b>';
  }

  function opcionElem(o) {
    return '<span class="sdx-forma" aria-hidden="true">'
      + '<i style="border-radius:' + o.radioBoton + '"></i>'
      + '<u style="border-radius:' + o.radio + '"></u></span>'
      + '<b>' + esc(o.nombre) + '</b><small>radio ' + esc(o.radio) + ' · densidad ' + o.densidad + '</small>';
  }

  var PINTA = { paletas: opcionPaleta, tipografias: opcionTipo, elementos: opcionElem };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var html = ''
    + '<div class="sdx-cab"><h2>Cambiar el diseño</h2>'
    + '<button type="button" class="sdx-cerrar" aria-label="Cerrar">&times;</button></div>'
    + '<p class="sdx-pie-cab">Los tres ejes son independientes. Combina el color de uno con la letra de otro y la forma de un tercero.</p>'
    + '<div class="sdx-grupo"><h3>Combinaciones de partida</h3><ul class="sdx-presets" data-presets></ul></div>';

  EJES.forEach(function (e) {
    html += '<div class="sdx-grupo"><h3>' + e.titulo + '</h3>'
      + '<ul class="sdx-rejilla" data-eje="' + e.param + '"></ul></div>';
  });

  html += '<div class="sdx-acciones">'
    + '<button type="button" class="sdx-accion" data-restaurar>Restaurar el original</button>'
    + '<button type="button" class="sdx-accion" data-copiar>Copiar el enlace</button>'
    + '<span class="sdx-estado" data-estado></span></div>'
    + '<p class="sdx-sr" role="status" aria-live="polite" data-vivo></p>';

  panel.innerHTML = html;

  // Opciones de cada eje
  EJES.forEach(function (e) {
    var ul = panel.querySelector('[data-eje="' + e.param + '"]');
    CAT[e.lista].forEach(function (o) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sdx-op';
      b.dataset.param = e.param;
      b.dataset.valor = o.id;
      b.title = o.nota || o.nombre;
      b.innerHTML = PINTA[e.lista](o);
      li.appendChild(b);
      ul.appendChild(li);
    });
  });

  // Presets
  var ulPresets = panel.querySelector('[data-presets]');
  CAT.presets.forEach(function (p) {
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sdx-preset';
    b.dataset.preset = p.id;
    b.textContent = p.nombre;
    b.title = p.titular || '';
    li.appendChild(b);
    ulPresets.appendChild(li);
  });

  document.body.appendChild(abrir);
  document.body.appendChild(panel);

  /* ---------- pintar el estado ---------- */
  function pintarSeleccion() {
    // aplicar() se llama una vez antes de construir el panel, para que la
    // pagina se pinte cuanto antes. Aun no hay nada que marcar.
    if (!panel || !panel.isConnected) return;
    panel.querySelectorAll('.sdx-op').forEach(function (b) {
      b.setAttribute('aria-pressed', String(actual[b.dataset.param] === b.dataset.valor));
    });
    panel.querySelectorAll('.sdx-preset').forEach(function (b) {
      var p = buscar('presets', b.dataset.preset);
      var igual = p && p.paleta === actual.paleta && p.tipo === actual.tipo && p.elem === actual.elem;
      b.setAttribute('aria-pressed', String(!!igual));
    });
    var est = panel.querySelector('[data-estado]');
    if (est) {
      var p = CAT.presets.filter(function (x) {
        return x.paleta === actual.paleta && x.tipo === actual.tipo && x.elem === actual.elem;
      })[0];
      est.textContent = p ? p.nombre : 'Combinación propia';
    }
  }

  function anunciar() {
    if (!panel) return;
    var vivo = panel.querySelector('[data-vivo]');
    if (!vivo) return;
    var p = buscar('paletas', actual.paleta);
    var t = buscar('tipografias', actual.tipo);
    var e = buscar('elementos', actual.elem);
    vivo.textContent = 'Diseño: ' + (p ? p.nombre : '') + ', ' + (t ? t.nombre : '') + ', ' + (e ? e.nombre : '') + '.';
  }

  /* ---------- eventos ---------- */
  panel.addEventListener('click', function (ev) {
    var b = ev.target.closest('button');
    if (!b) return;

    if (b.classList.contains('sdx-cerrar')) return cerrar();

    if (b.dataset.param) {
      var nuevo = Object.assign({}, actual);
      nuevo[b.dataset.param] = b.dataset.valor;
      return aplicar(nuevo, true);
    }

    if (b.dataset.preset) {
      var p = buscar('presets', b.dataset.preset);
      if (p) aplicar({ paleta: p.paleta, tipo: p.tipo, elem: p.elem }, true);
      return;
    }

    if (b.hasAttribute('data-restaurar')) {
      return aplicar(Object.assign({}, ORIGINAL), true, true);
    }

    if (b.hasAttribute('data-copiar')) {
      var url = new URL(location.href);
      EJES.forEach(function (e) { url.searchParams.set(e.param, actual[e.param]); });
      var decir = function (txt) {
        var est = panel.querySelector('[data-estado]');
        if (est) { est.textContent = txt; setTimeout(pintarSeleccion, 2000); }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url.toString())
          .then(function () { decir('Enlace copiado'); })
          .catch(function () { decir('No se pudo copiar'); });
      } else {
        decir('Copia la URL de la barra');
      }
    }
  });

  function mostrar() {
    cargarTodasLasFuentes();
    panel.hidden = false;
    abrir.setAttribute('aria-expanded', 'true');
    pintarSeleccion();
    var primero = panel.querySelector('.sdx-cerrar');
    if (primero) primero.focus();
    document.addEventListener('keydown', escapar);
  }

  function cerrar() {
    panel.hidden = true;
    abrir.setAttribute('aria-expanded', 'false');
    abrir.focus();
    document.removeEventListener('keydown', escapar);
  }

  function escapar(ev) { if (ev.key === 'Escape') cerrar(); }

  abrir.addEventListener('click', function () {
    if (panel.hidden) mostrar(); else cerrar();
  });

  // Que se pueda pilotar desde fuera, p. ej. desde el configurador.
  window.SD_TEMA = {
    estado: function () { return Object.assign({}, actual); },
    aplicar: function (parcial) { aplicar(Object.assign({}, actual, parcial), true); },
    original: function () { return Object.assign({}, ORIGINAL); }
  };
})();
