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
 *
 * Arriba de todo van los SISTEMAS, como los UI Kits de UIverse: cada uno de
 * los nueve sistemas de la casa con cuatro de sus componentes (kits/, que
 * genera generar-kits.mjs). Se montan y se copian igual que las piezas de
 * UIverse, porque tienen el mismo formato.
 */
(function () {
  'use strict';

  var IDX = window.SD_UIVERSE;
  if (!IDX) return;
  var TOK = window.SD_TOKENIZADOS || {};
  var KITS = window.SD_KITS || [];

  var BASE = 'uiverse/';

  /* ---------- el elemento a medida ----------
     Cada pieza se pinta dentro de un lienzo centrado y luego se escala para
     que quepa entera en la casilla. Sin esto, las tarjetas y formularios de
     300-400 px se salian por la derecha y cada fila crecia a su aire. El
     lienzo tiene un ancho maximo para que los textos sin ancho fijo partan
     linea en vez de estirarse en una sola. Los patrones no son una pieza sino
     una textura: esos rellenan la casilla entera.
     color-scheme va en claro porque asi se disenaron: si heredaran el oscuro
     de esta pagina, los campos sin fondo propio saldrian grises. */
  var CSS_BASE = ':host{display:block;position:relative;overflow:hidden;color-scheme:light;'
    + 'font-family:var(--sd-font,ui-sans-serif,system-ui,sans-serif);color:var(--sd-ink,#e9e9ee)}'
    + ':host([cargando]){opacity:.35}'
    + '.sd-lienzo{position:absolute;left:50%;top:50%;width:max-content;max-width:22rem;'
    + 'transform:translate(-50%,-50%) translate(var(--sd-dx,0px),var(--sd-dy,0px)) scale(var(--sd-escala,1));'
    + 'transform-origin:center}'
    + ':host([relleno]) .sd-lienzo{inset:0;width:auto;max-width:none;transform:none}'
    + ':host([relleno]) .sd-lienzo>*{width:100%!important;height:100%!important;'
    + 'min-height:0!important;max-height:none!important;margin:0!important}';

  // Hueco que se deja entre la pieza y el borde de la casilla.
  var AIRE = 16;
  // Lo que queda a mas de esto del lienzo es un truco de ocultacion
  // (top: -9999px y parecidos), no parte de lo que se ve.
  var LEJOS = 1500;

  // Muchas piezas traen un envoltorio a pantalla completa (height: 100vh)
  // pensado para su pagina de demo. Dentro de una casilla eso estira la fila
  // hasta el alto de la ventana, asi que se neutraliza.
  function sinPantallaCompleta(css) {
    return css.replace(/:\s*100v[hw]\s*(?=[;}!])/g, ':auto');
  }

  function cortar(a, b) {
    return {
      l: Math.max(a.l, b.l), t: Math.max(a.t, b.t),
      r: Math.min(a.r, b.r), b: Math.min(a.b, b.b)
    };
  }

  // La caja de lo que se ve de verdad. No basta con el tamano del lienzo:
  // hay piezas hechas enteras con position: absolute (el lienzo mide 0) y
  // piezas con ancho fijo mayor que el lienzo. Se recorre el arbol sumando
  // cajas y recortando por los padres con overflow oculto.
  function cajaVisible(lienzo) {
    var base = lienzo.getBoundingClientRect();
    var cx0 = base.left + base.width / 2;
    var cy0 = base.top + base.height / 2;
    var u = null;
    var infinito = { l: -Infinity, t: -Infinity, r: Infinity, b: Infinity };

    (function visitar(el, recorte) {
      var cs = getComputedStyle(el);
      if (cs.display === 'none') return;
      var q = el.getBoundingClientRect();
      var c = { l: q.left, t: q.top, r: q.right, b: q.bottom };
      var v = cortar(c, recorte);
      var lejos = Math.abs((v.l + v.r) / 2 - cx0) > LEJOS
        || Math.abs((v.t + v.b) / 2 - cy0) > LEJOS;
      if (el !== lienzo && cs.visibility !== 'hidden' && v.r - v.l > 0.5
        && v.b - v.t > 0.5 && !lejos) {
        u = u ? { l: Math.min(u.l, v.l), t: Math.min(u.t, v.t),
          r: Math.max(u.r, v.r), b: Math.max(u.b, v.b) } : v;
      }
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        recorte = cortar(recorte, c);
      }
      for (var i = 0; i < el.children.length; i++) visitar(el.children[i], recorte);
    })(lienzo, infinito);

    if (!u) return null;
    return {
      w: u.r - u.l, h: u.b - u.t,
      dx: (u.l + u.r) / 2 - cx0, dy: (u.t + u.b) / 2 - cy0
    };
  }

  // Escala la pieza para que quepa entera, sin agrandarla nunca, y la
  // recoloca para que lo visible quede en el centro de la casilla.
  function ajustar(host) {
    var raiz = host.shadowRoot;
    var lienzo = raiz && raiz.querySelector('.sd-lienzo');
    if (!lienzo || host.hasAttribute('relleno')) return;
    var an = host.clientWidth - AIRE * 2;
    var al = host.clientHeight - AIRE * 2;
    if (an <= 0 || al <= 0) return; // oculta por un filtro: se mide luego
    // Se mide siempre sin escalar, para que reajustar no arrastre errores.
    lienzo.style.setProperty('--sd-escala', '1');
    lienzo.style.setProperty('--sd-dx', '0px');
    lienzo.style.setProperty('--sd-dy', '0px');
    var caja = cajaVisible(lienzo);
    if (!caja || !caja.w || !caja.h) return;
    var k = Math.min(1, an / caja.w, al / caja.h);
    lienzo.style.setProperty('--sd-escala', k.toFixed(3));
    lienzo.style.setProperty('--sd-dx', (-caja.dx * k).toFixed(1) + 'px');
    lienzo.style.setProperty('--sd-dy', (-caja.dy * k).toFixed(1) + 'px');
  }

  function reajustarTodo() {
    document.querySelectorAll('sd-uiverse[data-montado]').forEach(ajustar);
  }

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
      raiz.innerHTML = '<style>' + CSS_BASE + '\n' + sinPantallaCompleta(t.css) + '</style>'
        + '<div class="sd-lienzo">' + p.markup + '</div>';
      host.removeAttribute('cargando');
      ajustar(host);
      // Y otra vez cuando acabe una animacion de entrada: medida a mitad de un
      // deslizamiento, la pieza quedaba descentrada para siempre.
      var repetir = null;
      raiz.addEventListener('animationend', function () {
        clearTimeout(repetir);
        repetir = setTimeout(function () { ajustar(host); }, 60);
      });
      // Otra vez cuando lleguen las fuentes, que cambian el ancho del texto.
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { ajustar(host); });
      }
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
  var pedidoAjuste = null;
  addEventListener('resize', function () {
    pedirRevision();
    clearTimeout(pedidoAjuste);
    pedidoAjuste = setTimeout(reajustarTodo, 120);
  });

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
    return pieza({
      cat: e.cat,
      ruta: BASE + e.cat + '/' + e.archivo,
      archivo: e.archivo,
      busca: e.tags + ' ' + e.autor + ' ' + titulos[e.cat],
      pie: '<span class="gl-autor">' + esc(e.autor) + '</span>'
        + (e.tags ? '<span class="gl-tags">' + esc(e.tags) + '</span>' : ''),
      relleno: e.cat === 'patrones'
    });
  }

  function pieza(o) {
    var li = document.createElement('li');
    li.className = 'gl-pieza';
    li.dataset.cat = o.cat;
    li.dataset.busca = o.busca.toLowerCase();
    if (o.fondo) li.style.setProperty('--gl-fondo-pieza', o.fondo);

    var host = document.createElement('sd-uiverse');
    host.setAttribute('src', o.ruta);
    host.setAttribute('archivo', o.archivo);
    host.setAttribute('cargando', '');
    if (o.relleno) host.setAttribute('relleno', '');
    host.className = 'gl-muestra';

    var pie = document.createElement('div');
    pie.className = 'gl-pie';
    pie.innerHTML = o.pie + '<button class="gl-copiar" type="button">Copiar código</button>';

    li.appendChild(host);
    li.appendChild(pie);
    pendientes.push(host);
    return li;
  }

  /* ---------- los sistemas, como UI Kits ---------- */
  // Las fuentes van en el documento y no dentro de cada pieza: Chrome ignora
  // @font-face dentro de un shadow root, pero las del documento si le llegan.
  var fuentes = {};
  KITS.forEach(function (k) {
    if (!k.google || fuentes[k.google]) return;
    fuentes[k.google] = true;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + k.google + '&display=swap';
    document.head.appendChild(l);
  });

  if (KITS.length) {
    var secK = document.createElement('section');
    secK.className = 'gl-seccion';
    secK.id = 'sistemas';
    secK.innerHTML = '<h2>Sistemas <span>' + KITS.length + '</span></h2>'
      + '<p class="gl-nota">Los nueve sistemas de la casa, cada uno con su kit de ocho componentes. '
      + 'Aquí van cuatro por sistema; el resto está en su ficha. Se copian igual que los demás: '
      + 'HTML y CSS, con las variables del sistema dentro.</p>';

    KITS.forEach(function (k) {
      var bloque = document.createElement('div');
      bloque.className = 'gl-kit';
      var porId = {};
      k.componentes.forEach(function (c) { porId[c.id] = c; });

      bloque.innerHTML = '<div class="gl-kit__cab">'
        + '<span class="gl-kit__colores" aria-hidden="true">'
        + k.colores.map(function (c) { return '<span style="background:' + esc(c) + '"></span>'; }).join('')
        + '</span>'
        + '<div class="gl-kit__texto"><h3>' + esc(k.nombre) + '</h3>'
        + '<p>' + esc(k.titular) + '</p>'
        + '<p class="gl-kit__rasgo">' + esc(k.rasgo) + '</p></div>'
        + '<div class="gl-kit__acciones">'
        + '<a class="gl-kit__btn gl-kit__btn--pri" href="' + esc(k.ficha) + '">Ver el sistema</a>'
        + '<a class="gl-kit__btn" href="' + esc(k.ficha) + '#componentes">Sus '
        + k.componentes.length + ' componentes</a>'
        + '</div></div>';

      var ul = document.createElement('ul');
      ul.className = 'gl-rejilla gl-rejilla--kit';
      k.destacados.forEach(function (id) {
        var c = porId[id];
        if (!c) return;
        ul.appendChild(pieza({
          cat: 'sistemas',
          ruta: 'kits/' + k.id + '/' + c.archivo,
          archivo: k.id + '/' + c.archivo,
          busca: k.nombre + ' ' + c.nombre + ' ' + k.rasgo + ' ' + (k.piel || '') + ' sistema',
          pie: '<span class="gl-autor gl-autor--kit">' + esc(c.nombre) + '</span>'
            + '<span class="gl-tags">' + esc(k.nombre) + ' · ' + esc(k.rasgo) + '</span>',
          fondo: k.colores[1]
        }));
      });
      bloque.appendChild(ul);
      secK.appendChild(bloque);
    });
    lista.appendChild(secK);
  }

  /* ---------- las piezas de UIverse ---------- */
  var separador = document.createElement('p');
  separador.className = 'gl-separador';
  separador.textContent = 'Elementos sueltos de UIverse';
  if (KITS.length) lista.appendChild(separador);

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
    if (KITS.length) mk('sistemas', 'Sistemas');
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
    document.querySelectorAll('.gl-kit').forEach(function (k) {
      k.hidden = !k.querySelector('.gl-pieza:not([hidden])');
    });
    document.querySelectorAll('.gl-seccion').forEach(function (sec) {
      sec.hidden = !sec.querySelector('.gl-pieza:not([hidden])');
    });
    separador.hidden = !document.querySelector('.gl-seccion:not(#sistemas):not([hidden])');
    pedirRevision();
    // Lo que estaba oculto por el filtro no se pudo medir: se mide ahora.
    reajustarTodo();
    if (contador) {
      var total = document.querySelectorAll('.gl-pieza').length;
      contador.textContent = vistos === total
        ? vistos + ' elementos'
        : vistos + ' de ' + total;
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
