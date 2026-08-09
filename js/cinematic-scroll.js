/*!
 * cinematic-scroll.js — motor de timeline para scrolls cinematicos 2.5D.
 *
 * Sin dependencias, sin build step. Regla del motor:
 *   JS calcula progreso -> escribe custom properties -> CSS decide como se ve.
 * Ninguna transform se escribe desde JS: si quieres cambiar la coreografia,
 * edita cinematic.css. Si quieres cambiar el ritmo, edita ESCENAS aqui abajo.
 *
 * Contrato de escena adaptado de cinematic-scroll-prompt-kit
 * (MIT, Copyright (c) 2026 Amir Mushich). Ver CREDITOS.md de la skill.
 */
(function () {
  'use strict';

  /* ============================================================
     1. CONFIGURACION — el unico bloque que se retoca por proyecto
     ============================================================

     Todos los valores son progreso normalizado de la seccion (0 = primer
     fotograma, 1 = ultimo). Dos formas:

       rampa    [inicio, fin]                     -> 0 .. 1
       panel    [entraDe, entraA, saleDe, saleA]  -> 0 .. 1 .. 1 .. 0

     Son direccion de movimiento, no numeros magicos: ajustalos contra la
     referencia visual y el viewport real. Los checkpoints de QA
     (0.18 / 0.27 / 0.44 / 0.58 / 0.74 / 0.90) asumen estos tramos.
  */
  var ESCENAS = {
    intro:       [0.03, 0.18], // el titulo y la copy de apertura se van
    apertura:    [0.15, 0.25], // el primer plano se separa + push-in de camara
    salidaPlano: [0.35, 0.44], // el primer plano sale y revela el panorama limpio
    catalogo:    [0.75, 0.96], // el rail final entra en horizontal
    controles:   [0.91, 1.00], // aparecen los controles del rail

    narrativaA: [0.22, 0.27, 0.35, 0.42], // legible en p = 0.27
    narrativaB: [0.48, 0.56, 0.69, 0.74]  // legible en p = 0.58, mundo refocaliza en 0.74
  };

  var AJUSTES = {
    suavizadoScroll: 0.14,  // inercia del playhead (0 = respuesta directa)
    suavizadoPuntero: 0.09, // inercia del parallax de puntero
    epsilon: 0.0004,        // umbral de convergencia: por debajo, se para el rAF
    decimales: 4            // redondeo antes de escribir en CSS
  };

  /* ============================================================
     2. HELPERS DE TIMELINE
     ============================================================ */

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** Rampa suavizada 0..1: arranca y termina sin tiron. */
  function smoothstep(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }

  /** Progreso lineal de p dentro de [a, b], clampado. */
  function rangeProgress(p, a, b) {
    if (b === a) return p >= b ? 1 : 0;
    return clamp((p - a) / (b - a), 0, 1);
  }

  /** Entrada -> hold -> salida. Devuelve 0..1..1..0 ya suavizado. */
  function segmentInOut(p, entraDe, entraA, saleDe, saleA) {
    var entra = smoothstep(rangeProgress(p, entraDe, entraA));
    var sale = 1 - smoothstep(rangeProgress(p, saleDe, saleA));
    return Math.min(entra, sale);
  }

  /** Resuelve una entrada de ESCENAS (rampa de 2 valores o panel de 4). */
  function valorEscena(def, p) {
    if (def.length === 4) return segmentInOut(p, def[0], def[1], def[2], def[3]);
    return smoothstep(rangeProgress(p, def[0], def[1]));
  }

  /** camelCase -> kebab-case, para el nombre de la custom property. */
  function kebab(nombre) {
    return nombre.replace(/[A-Z]/g, function (c) {
      return '-' + c.toLowerCase();
    });
  }

  function redondear(v) {
    var f = Math.pow(10, AJUSTES.decimales);
    return Math.round(v * f) / f;
  }

  /* ============================================================
     3. INSTANCIA
     ============================================================ */

  function crear(seccion, opciones) {
    opciones = opciones || {};

    var escenas = Object.assign({}, ESCENAS, opciones.escenas);
    var ajustes = Object.assign({}, AJUSTES, opciones.ajustes);

    var escenario = seccion.querySelector('[data-cine-escenario]');
    var mundo = seccion.querySelector('[data-cine-mundo]');
    if (!escenario) {
      console.warn('[cine] falta [data-cine-escenario] dentro de', seccion);
      return null;
    }

    // --- estado -------------------------------------------------
    var geo = { inicio: 0, recorrido: 1 };
    var pObjetivo = 0;
    var pSuave = 0;
    var punteroObjetivo = { x: 0, y: 0 };
    var puntero = { x: 0, y: 0 };
    var visible = true;
    var frameActivo = false;
    var escrito = {};

    var qReducido = window.matchMedia('(prefers-reduced-motion: reduce)');
    var qPunteroBasto = window.matchMedia('(pointer: coarse)');

    // Elementos ligados a una escena. Mientras su escena esta apagada quedan
    // fuera del foco y de las tecnologias de asistencia: opacity: 0 NO basta.
    // Prefijo "!" = logica invertida (visible mientras la escena esta a 0),
    // que es el caso de la copy de apertura: se va cuando --s-intro sube.
    var porEscena = {};
    var escenaActiva = {};
    Array.prototype.forEach.call(seccion.querySelectorAll('[data-cine-escena]'), function (el) {
      var clave = el.getAttribute('data-cine-escena');
      var invertida = clave.charAt(0) === '!';
      if (invertida) clave = clave.slice(1);
      (porEscena[clave] = porEscena[clave] || []).push({ el: el, invertida: invertida });
      el.setAttribute('data-cine-activo', invertida ? 'true' : 'false');
    });

    function reducido() {
      return qReducido.matches;
    }

    /* --- medida: se cachea y solo se recalcula en resize/carga --- */
    function medir() {
      var rect = seccion.getBoundingClientRect();
      var scrollY = window.scrollY || window.pageYOffset || 0;
      geo.inicio = rect.top + scrollY;
      // Recorrido util = alto de la seccion menos el alto del escenario pegado.
      geo.recorrido = Math.max(1, seccion.offsetHeight - escenario.offsetHeight);
    }

    function leerProgreso() {
      var scrollY = window.scrollY || window.pageYOffset || 0;
      return clamp((scrollY - geo.inicio) / geo.recorrido, 0, 1);
    }

    /* --- escritura: unica via de salida del motor --- */
    function escribir(nombre, valor) {
      var v = redondear(valor);
      if (escrito[nombre] === v) return;
      escrito[nombre] = v;
      escenario.style.setProperty(nombre, String(v));
    }

    function pintar(p) {
      escribir('--p', pObjetivo);
      escribir('--p-suave', p);
      escribir('--puntero-x', puntero.x);
      escribir('--puntero-y', puntero.y);

      for (var nombre in escenas) {
        if (!Object.prototype.hasOwnProperty.call(escenas, nombre)) continue;
        var v = valorEscena(escenas[nombre], p);
        escribir('--s-' + kebab(nombre), v);

        var ligados = porEscena[nombre];
        if (ligados) {
          var encendida = v > 0.02;
          if (escenaActiva[nombre] !== encendida) {
            escenaActiva[nombre] = encendida;
            for (var i = 0; i < ligados.length; i++) {
              var activo = ligados[i].invertida ? !encendida : encendida;
              ligados[i].el.setAttribute('data-cine-activo', activo ? 'true' : 'false');
            }
          }
        }
      }

      if (hud) hud.textContent = 'p = ' + p.toFixed(3);
    }

    /* --- bucle: un solo rAF, se detiene al converger --- */
    function frame() {
      frameActivo = false;
      pObjetivo = leerProgreso();

      var difP, difX, difY;
      if (reducido()) {
        pSuave = pObjetivo;
        puntero.x = 0;
        puntero.y = 0;
        difP = difX = difY = 0;
      } else {
        pSuave = lerp(pSuave, pObjetivo, ajustes.suavizadoScroll);
        puntero.x = lerp(puntero.x, punteroObjetivo.x, ajustes.suavizadoPuntero);
        puntero.y = lerp(puntero.y, punteroObjetivo.y, ajustes.suavizadoPuntero);
        difP = Math.abs(pObjetivo - pSuave);
        difX = Math.abs(punteroObjetivo.x - puntero.x);
        difY = Math.abs(punteroObjetivo.y - puntero.y);
      }

      // Si estamos casi en el objetivo, cerramos exacto y dejamos de pedir frames:
      // asi el estado final es determinista y reversible.
      if (difP < ajustes.epsilon) pSuave = pObjetivo;
      if (difX < ajustes.epsilon) puntero.x = punteroObjetivo.x;
      if (difY < ajustes.epsilon) puntero.y = punteroObjetivo.y;

      pintar(pSuave);

      if (visible && (difP >= ajustes.epsilon || difX >= ajustes.epsilon || difY >= ajustes.epsilon)) {
        solicitar();
      }
    }

    function solicitar() {
      if (frameActivo) return;
      frameActivo = true;
      requestAnimationFrame(frame);
    }

    /* --- eventos: solo piden frame, nunca calculan --- */
    function alScroll() {
      if (visible) solicitar();
    }

    function alResize() {
      medir();
      solicitar();
    }

    function alPuntero(ev) {
      if (qPunteroBasto.matches || reducido()) return;
      var rect = escenario.getBoundingClientRect();
      punteroObjetivo.x = clamp(((ev.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
      punteroObjetivo.y = clamp(((ev.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
      solicitar();
    }

    function alSalirPuntero() {
      punteroObjetivo.x = 0;
      punteroObjetivo.y = 0;
      solicitar();
    }

    window.addEventListener('scroll', alScroll, { passive: true });
    window.addEventListener('resize', alResize, { passive: true });
    window.addEventListener('orientationchange', alResize, { passive: true });
    escenario.addEventListener('pointermove', alPuntero, { passive: true });
    escenario.addEventListener('pointerleave', alSalirPuntero, { passive: true });
    qReducido.addEventListener('change', function () {
      escenario.classList.toggle('cine-reducido', reducido());
      solicitar();
    });

    // No animamos cuando el escenario no esta en pantalla.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entradas) {
        visible = entradas[0].isIntersecting;
        if (visible) solicitar();
      }, { rootMargin: '10% 0px' }).observe(escenario);
    }

    /* --- barrera de carga: nada de popping ni saltos --- */
    function revelar() {
      medir();
      escenario.classList.add('cine-listo');
      solicitar();
    }

    var imagenes = mundo ? Array.prototype.slice.call(mundo.querySelectorAll('img')) : [];
    var criticas = imagenes.filter(function (img) {
      return img.loading !== 'lazy';
    });

    Promise.all(
      criticas.map(function (img) {
        if (img.decode) {
          return img.decode().catch(function () {});
        }
        if (img.complete) return Promise.resolve();
        return new Promise(function (res) {
          img.addEventListener('load', res, { once: true });
          img.addEventListener('error', res, { once: true });
        });
      })
    ).then(revelar);

    // Red de seguridad: si un asset se cuelga, no dejamos el escenario oculto.
    setTimeout(function () {
      if (!escenario.classList.contains('cine-listo')) revelar();
    }, 3000);

    /* --- HUD y salto a checkpoint: solo para QA --- */
    var hud = null;
    var params = new URLSearchParams(location.search);

    if (params.has('cineDebug')) {
      hud = document.createElement('div');
      hud.className = 'cine-hud';
      hud.setAttribute('aria-hidden', 'true');
      document.body.appendChild(hud);
    }

    /**
     * Salta a un progreso concreto sin inercia. Es lo que hace que los
     * checkpoints del contrato (0.00, 0.18, 0.27, 0.44, 0.58, 0.74, 0.90, 1.00)
     * sean capturables de forma determinista.
     */
    function seek(p) {
      medir();
      p = clamp(Number(p) || 0, 0, 1);
      window.scrollTo({ top: geo.inicio + geo.recorrido * p, behavior: 'instant' });
      pObjetivo = p;
      pSuave = p;
      puntero.x = puntero.y = punteroObjetivo.x = punteroObjetivo.y = 0;
      pintar(p);
      return p;
    }

    escenario.classList.toggle('cine-reducido', reducido());
    medir();
    pintar(0);

    if (params.has('cineP')) {
      // Tras la barrera de carga, para que la medida ya sea estable.
      var destino = params.get('cineP');
      setTimeout(function () {
        seek(destino);
      }, 60);
    }

    return {
      seccion: seccion,
      escenario: escenario,
      escenas: escenas,
      ajustes: ajustes,
      seek: seek,
      medir: medir,
      progreso: function () {
        return pSuave;
      }
    };
  }

  /* ============================================================
     4. AUTO-ARRANQUE
     ============================================================ */

  var instancias = [];

  function iniciar() {
    var secciones = document.querySelectorAll('[data-cine]');
    Array.prototype.forEach.call(secciones, function (secc) {
      var inst = crear(secc);
      if (inst) instancias.push(inst);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  } else {
    iniciar();
  }

  window.CineScroll = { crear: crear, helpers: { clamp: clamp, lerp: lerp, smoothstep: smoothstep, rangeProgress: rangeProgress, segmentInOut: segmentInOut } };

  // Gancho de QA: window.__cine.seek(0.27)
  window.__cine = {
    get instancias() {
      return instancias;
    },
    seek: function (p, i) {
      var inst = instancias[i || 0];
      return inst ? inst.seek(p) : null;
    },
    progreso: function (i) {
      var inst = instancias[i || 0];
      return inst ? inst.progreso() : null;
    }
  };
})();
