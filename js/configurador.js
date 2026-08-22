/**
 * CONFIGURADOR DE SISTEMAS DE DISENO
 *
 * Pinta los tres catalogos y aplica la combinacion elegida a #lienzo.
 *
 * A diferencia del selector flotante (selector-sistema.js), aqui los atributos
 * NO van en <html> sino en el lienzo de muestra: la herramienta con la que
 * eliges tiene que quedarse quieta mientras la muestra cambia. tema.css usa
 * selectores de atributo sueltos, no :root, asi que funciona en cualquier
 * elemento.
 *
 * Estado, en este orden: la URL, luego la memoria, luego lo que trae el HTML.
 */
(function () {
  'use strict';

  var CAT = window.SD_CATALOGO;
  var lienzo = document.getElementById('lienzo');
  if (!CAT || !lienzo) return;

  var EJES = [
    { param: 'paleta', attr: 'data-paleta', clave: 'sd-paleta', lista: 'paletas' },
    { param: 'tipo', attr: 'data-tipo', clave: 'sd-tipo', lista: 'tipografias' },
    { param: 'elem', attr: 'data-elem', clave: 'sd-elem', lista: 'elementos' }
  ];

  var ORIGINAL = {};
  EJES.forEach(function (e) { ORIGINAL[e.param] = lienzo.getAttribute(e.attr) || CAT[e.lista][0].id; });

  var $ = function (sel) { return document.querySelector(sel); };
  var esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  /* ---------- fuentes ---------- */
  // Se cargan todas de golpe: las muestras de cada tipografia se pintan en su
  // propia fuente, asi que si no estan cargadas el catalogo miente.
  var puestas = {};
  CAT.tipografias.forEach(function (t) {
    if (!t.google || puestas[t.google]) return;
    puestas[t.google] = true;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + t.google + '&display=swap';
    document.head.appendChild(l);
  });

  /* ---------- estado ---------- */
  function buscar(lista, id) {
    var a = CAT[lista] || [];
    for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
    return null;
  }

  function leer() {
    var url = new URLSearchParams(location.search);
    var s = {};
    EJES.forEach(function (e) {
      var vale = function (id) { return !!buscar(e.lista, id); };
      var u = url.get(e.param);
      var d = null;
      try { d = localStorage.getItem(e.clave); } catch (err) { /* modo privado */ }
      s[e.param] = (vale(u) && u) || (vale(d) && d) || ORIGINAL[e.param];
    });
    return s;
  }

  var actual = leer();

  function aplicar(estado, olvidar) {
    actual = estado;
    EJES.forEach(function (e) {
      lienzo.setAttribute(e.attr, estado[e.param]);
      try {
        if (olvidar) localStorage.removeItem(e.clave);
        else localStorage.setItem(e.clave, estado[e.param]);
      } catch (err) { /* modo privado */ }
    });

    var url = new URL(location.href);
    EJES.forEach(function (e) {
      if (olvidar) url.searchParams.delete(e.param);
      else url.searchParams.set(e.param, estado[e.param]);
    });
    history.replaceState(null, '', url);

    pintar();
  }

  /* ---------- catalogos ---------- */
  function tarjetaPaleta(o) {
    return '<span class="cfg-tiras" aria-hidden="true">'
      + o.muestras.map(function (c) { return '<span style="background:' + c + '"></span>'; }).join('')
      + '</span><b>' + esc(o.nombre) + '</b><small>Banda ' + esc(o.banda) + '</small>';
  }

  function tarjetaTipo(o) {
    var est = 'font-family:' + o.display + ';font-weight:' + o.peso
      + ';letter-spacing:' + o.tracking + ';text-transform:' + o.caja;
    return '<span class="cfg-letra" style="' + est + '" aria-hidden="true">' + esc(o.muestra) + '</span>'
      + '<b>' + esc(o.nombre) + '</b>'
      + '<small>' + (o.google ? 'Google Fonts' : 'Pila del sistema') + '</small>';
  }

  function tarjetaElem(o) {
    return '<span class="cfg-forma" aria-hidden="true">'
      + '<i style="border-radius:' + o.radioBoton + '"></i>'
      + '<u style="border-radius:' + o.radio + '"></u></span>'
      + '<b>' + esc(o.nombre) + '</b>'
      + '<small>radio ' + esc(o.radio) + ' · densidad ' + o.densidad + '</small>';
  }

  var PINTA = { paleta: tarjetaPaleta, tipo: tarjetaTipo, elem: tarjetaElem };

  EJES.forEach(function (e) {
    var ul = document.querySelector('[data-eje="' + e.param + '"]');
    if (!ul) return;
    CAT[e.lista].forEach(function (o) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cfg-op';
      b.dataset.param = e.param;
      b.dataset.valor = o.id;
      b.title = o.nota || o.nombre;
      b.innerHTML = PINTA[e.param](o);
      li.appendChild(b);
      ul.appendChild(li);
    });
  });

  var ulP = $('[data-presets]');
  if (ulP) {
    ulP.innerHTML = '';
    CAT.presets.forEach(function (p) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cfg-preset';
      b.dataset.preset = p.id;
      b.textContent = p.nombre;
      b.title = p.titular || '';
      li.appendChild(b);
      ulP.appendChild(li);
    });
  }

  var cuenta = $('[data-cuenta]');
  if (cuenta) {
    cuenta.textContent = (CAT.paletas.length * CAT.tipografias.length * CAT.elementos.length)
      + ' combinaciones';
  }

  /* ---------- pintar el estado ---------- */
  function presetActual() {
    for (var i = 0; i < CAT.presets.length; i++) {
      var p = CAT.presets[i];
      if (p.paleta === actual.paleta && p.tipo === actual.tipo && p.elem === actual.elem) return p;
    }
    return null;
  }

  function pintar() {
    document.querySelectorAll('.cfg-op').forEach(function (b) {
      b.setAttribute('aria-pressed', String(actual[b.dataset.param] === b.dataset.valor));
    });
    var p = presetActual();
    document.querySelectorAll('.cfg-preset').forEach(function (b) {
      b.setAttribute('aria-pressed', String(!!p && p.id === b.dataset.preset));
    });

    var pal = buscar('paletas', actual.paleta);
    var tip = buscar('tipografias', actual.tipo);
    var ele = buscar('elementos', actual.elem);

    var res = $('[data-resumen]');
    if (res) {
      res.innerHTML = 'paleta <b>' + esc(pal.nombre) + '</b><br>'
        + 'tipografía <b>' + esc(tip.nombre) + '</b><br>'
        + 'elementos <b>' + esc(ele.nombre) + '</b>'
        + (p ? '<br>= el sistema <b>' + esc(p.nombre) + '</b>' : '<br>= una combinación tuya');
    }

    // El enlace a la ficha solo tiene sentido cuando la combinacion ES un
    // sistema del catalogo; si la has tocado, no hay ficha que ver.
    var ficha = $('[data-ficha]');
    if (ficha) {
      if (p) {
        ficha.hidden = false;
        ficha.href = p.ficha;
        ficha.textContent = 'Ver la ficha de ' + p.nombre;
      } else {
        ficha.hidden = true;
      }
    }

    var vivo = $('[data-vivo]');
    if (vivo) vivo.textContent = 'Muestra: ' + pal.nombre + ', ' + tip.nombre + ', ' + ele.nombre + '.';
  }

  /* ---------- eventos ---------- */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('button, a[data-ficha]');
    if (!b) return;

    if (b.dataset.param) {
      var n = Object.assign({}, actual);
      n[b.dataset.param] = b.dataset.valor;
      return aplicar(n);
    }

    if (b.dataset.preset) {
      var p = buscar('presets', b.dataset.preset);
      if (p) aplicar({ paleta: p.paleta, tipo: p.tipo, elem: p.elem });
      return;
    }

    if (b.hasAttribute('data-reset')) return aplicar(Object.assign({}, ORIGINAL), true);

    if (b.hasAttribute('data-azar')) {
      var al = function (lista) {
        var a = CAT[lista];
        return a[Math.floor(Math.random() * a.length)].id;
      };
      return aplicar({ paleta: al('paletas'), tipo: al('tipografias'), elem: al('elementos') });
    }

    if (b.hasAttribute('data-copiar')) {
      var url = new URL(location.href);
      EJES.forEach(function (e) { url.searchParams.set(e.param, actual[e.param]); });
      var avisar = function (txt) {
        var a = $('[data-aviso]');
        if (!a) return;
        a.textContent = txt;
        setTimeout(function () { a.textContent = ''; }, 2500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url.toString())
          .then(function () { avisar('Enlace copiado'); })
          .catch(function () { avisar('No se pudo copiar'); });
      } else {
        avisar('Copia la URL de la barra');
      }
    }
  });

  aplicar(actual, false);
})();
