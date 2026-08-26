/**
 * GALERIA DE ELEMENTOS
 *
 * Monta cada elemento de UIverse dentro de un shadow root. Hace falta porque
 * las clases se repiten entre archivos — hay decenas de `.card`, `.btn` y
 * `.radio-input` distintos — y sin aislar, el ultimo cargado pisaria a todos
 * los demas.
 *
 * El shadow root aisla las CLASES pero deja pasar las VARIABLES CSS, asi que
 * un elemento retokenizado (ver uiverse/tokenizados.js) sigue la paleta que
 * tengas puesta sin ningun trabajo extra.
 *
 * Se cargan segun se acercan al viewport: 196 archivos de golpe serian 800 KB.
 */
(function () {
  'use strict';

  var IDX = window.SD_UIVERSE;
  if (!IDX) return;
  var TOK = window.SD_TOKENIZADOS || {};

  var BASE = 'uiverse/';

  /* ---------- el elemento a medida ---------- */
  var CSS_BASE = ':host{display:grid;place-items:center;min-height:7rem;padding:1rem;'
    + 'font-family:var(--sd-font,ui-sans-serif,system-ui,sans-serif);color:var(--sd-ink,#e9e9ee)}'
    + ':host([cargando]){opacity:.35}';

  function partir(texto) {
    var i = texto.indexOf('<style>');
    if (i === -1) return { markup: texto, css: '' };
    return {
      markup: texto.slice(0, i).trim(),
      css: texto.slice(i + 7, texto.lastIndexOf('</style>')).trim()
    };
  }

  // Aplica el mapa de retokenizacion, si lo hay. Se hace al montar y no en el
  // archivo, para que reimportar de UIverse no borre el trabajo.
  function retokenizar(css, archivo) {
    var mapa = TOK[archivo];
    if (!mapa) return { css: css, tokenizado: false };
    Object.keys(mapa).forEach(function (hex) {
      // El lookahead evita que "#fff" se coma el principio de "#ffffff".
      var patron = new RegExp(hex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![0-9a-fA-F])', 'gi');
      css = css.replace(patron, mapa[hex]);
    });
    return { css: css, tokenizado: true };
  }

  var cache = {};

  function montar(host) {
    var ruta = host.getAttribute('src');
    if (!ruta || host.dataset.montado) return;
    host.dataset.montado = '1';

    var pedir = cache[ruta] || (cache[ruta] = fetch(ruta).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }));

    pedir.then(function (texto) {
      var p = partir(texto);
      var t = retokenizar(p.css, host.getAttribute('archivo'));
      var raiz = host.shadowRoot || host.attachShadow({ mode: 'open' });
      raiz.innerHTML = '<style>' + CSS_BASE + '\n' + t.css + '</style>' + p.markup;
      host.removeAttribute('cargando');
      if (t.tokenizado) host.setAttribute('tokenizado', '');
      host.__fuente = texto;
    }).catch(function () {
      host.textContent = 'No se pudo cargar';
      host.removeAttribute('cargando');
    });
  }

  /* ---------- carga perezosa ----------
     A mano, con geometria, en vez de con IntersectionObserver: el observador
     no dispara cuando la pagina no se esta componiendo (una pestana de fondo,
     una vista previa oculta, una impresion), y entonces la galeria se queda en
     blanco para siempre. Un calculo sobre scroll es mas tonto y no falla. */
  var pendientes = [];
  var MARGEN = 400;

  function revisar() {
    if (!pendientes.length) return;
    var alto = window.innerHeight || document.documentElement.clientHeight;
    var quedan = [];
    for (var i = 0; i < pendientes.length; i++) {
      var h = pendientes[i];
      var r = h.getBoundingClientRect();
      if (r.bottom > -MARGEN && r.top < alto + MARGEN) montar(h);
      else quedan.push(h);
    }
    pendientes = quedan;
  }

  // Con setTimeout y no con requestAnimationFrame: rAF tampoco corre cuando la
  // pagina no se compone, que es justo el caso del que veniamos huyendo.
  var pedido = null;
  function pedirRevision() {
    if (pedido) return;
    pedido = setTimeout(function () { pedido = null; revisar(); }, 80);
  }

  addEventListener('scroll', pedirRevision, { passive: true });
  addEventListener('resize', pedirRevision);

  // Red de seguridad. Hay contextos donde ni el observador ni el evento de
  // scroll llegan aunque scrollY si cambie — una vista previa que no se
  // compone, por ejemplo — y sin esto la galeria se quedaria a medias para
  // siempre. El barrido sigue montando SOLO lo que esta a la vista, y se apaga
  // solo cuando ya no queda nada pendiente.
  var barrido = setInterval(function () {
    if (!pendientes.length) return clearInterval(barrido);
    revisar();
  }, 400);

  /* ---------- pintar la galeria ---------- */
  var lista = document.querySelector('[data-galeria]');
  if (!lista) return;

  var esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  var titulos = {};
  IDX.secciones.forEach(function (s) { titulos[s.slug] = s.titulo; });

  function tarjeta(e) {
    var li = document.createElement('li');
    li.className = 'gl-pieza';
    li.dataset.cat = e.cat;
    li.dataset.busca = (e.tags + ' ' + e.autor + ' ' + titulos[e.cat]).toLowerCase();

    var host = document.createElement('sd-uiverse');
    host.setAttribute('src', BASE + e.cat + '/' + e.archivo);
    host.setAttribute('archivo', e.archivo);
    host.setAttribute('cargando', '');
    host.className = 'gl-muestra';

    var pie = document.createElement('div');
    pie.className = 'gl-pie';
    pie.innerHTML = '<span class="gl-autor">' + esc(e.autor) + '</span>'
      + (e.tags ? '<span class="gl-tags">' + esc(e.tags) + '</span>' : '')
      + '<button class="gl-copiar" type="button">Copiar código</button>';

    li.appendChild(host);
    li.appendChild(pie);
    pendientes.push(host);
    return li;
  }

  IDX.secciones.forEach(function (s) {
    var piezas = IDX.elementos.filter(function (e) { return e.cat === s.slug; });
    if (!piezas.length) return;
    var sec = document.createElement('section');
    sec.className = 'gl-seccion';
    sec.id = s.slug;
    sec.innerHTML = '<h2>' + esc(s.titulo) + ' <span>' + piezas.length + '</span></h2>';
    var ul = document.createElement('ul');
    ul.className = 'gl-rejilla';
    piezas.forEach(function (e) { ul.appendChild(tarjeta(e)); });
    sec.appendChild(ul);
    lista.appendChild(sec);
  });

  /* ---------- filtros ---------- */
  var buscador = document.querySelector('[data-buscar]');
  var chips = document.querySelector('[data-chips]');
  var contador = document.querySelector('[data-contador]');
  var catActiva = 'todo';

  if (chips) {
    var mk = function (slug, txt) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'gl-chip';
      b.dataset.cat = slug;
      b.textContent = txt;
      b.setAttribute('aria-pressed', String(slug === 'todo'));
      chips.appendChild(b);
    };
    mk('todo', 'Todo');
    IDX.secciones.forEach(function (s) { mk(s.slug, s.titulo); });
  }

  function filtrar() {
    var q = (buscador && buscador.value || '').trim().toLowerCase();
    var vistos = 0;
    document.querySelectorAll('.gl-pieza').forEach(function (li) {
      var okCat = catActiva === 'todo' || li.dataset.cat === catActiva;
      var okQ = !q || li.dataset.busca.indexOf(q) !== -1;
      var ver = okCat && okQ;
      li.hidden = !ver;
      if (ver) vistos++;
    });
    document.querySelectorAll('.gl-seccion').forEach(function (sec) {
      sec.hidden = !sec.querySelector('.gl-pieza:not([hidden])');
    });
    pedirRevision();
    if (contador) {
      contador.textContent = vistos === IDX.elementos.length
        ? vistos + ' elementos'
        : vistos + ' de ' + IDX.elementos.length;
    }
  }

  if (buscador) buscador.addEventListener('input', filtrar);

  document.addEventListener('click', function (ev) {
    var chip = ev.target.closest('.gl-chip');
    if (chip) {
      catActiva = chip.dataset.cat;
      document.querySelectorAll('.gl-chip').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === chip));
      });
      return filtrar();
    }

    var cop = ev.target.closest('.gl-copiar');
    if (cop) {
      var host = cop.closest('.gl-pieza').querySelector('sd-uiverse');
      var texto = host && host.__fuente;
      if (!texto) { cop.textContent = 'Aún cargando'; return; }
      var decir = function (t) {
        cop.textContent = t;
        setTimeout(function () { cop.textContent = 'Copiar código'; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto)
          .then(function () { decir('Copiado'); })
          .catch(function () { decir('No se pudo'); });
      } else {
        decir('Sin portapapeles');
      }
    }
  });

  filtrar();
  // Primera pasada: monta lo que ya esta a la vista.
  revisar();
})();
