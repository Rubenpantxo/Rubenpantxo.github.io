/*!
 * cinematic-rail.js — rail horizontal accesible para la escena final.
 *
 * Se apoya en scroll nativo con scroll-snap: el swipe tactil y el scroll de
 * trackpad funcionan sin codigo. Este archivo solo anade lo que el navegador
 * no da gratis: botones anterior/siguiente, arrastre con raton, teclado y
 * anuncio de posicion.
 *
 * Markup esperado:
 *   <div data-cine-rail>
 *     <ul class="cine-rail" data-rail-pista> <li>…</li> </ul>
 *     <button data-rail-prev>…</button>
 *     <button data-rail-next>…</button>
 *     <p class="cine-sr" data-rail-estado aria-live="polite"></p>
 *   </div>
 */
(function () {
  'use strict';

  function crearRail(raiz) {
    var pista = raiz.querySelector('[data-rail-pista]');
    if (!pista) return null;

    var btnPrev = raiz.querySelector('[data-rail-prev]');
    var btnNext = raiz.querySelector('[data-rail-next]');
    var estado = raiz.querySelector('[data-rail-estado]');
    var reducido = window.matchMedia('(prefers-reduced-motion: reduce)');

    function items() {
      return Array.prototype.filter.call(pista.children, function (el) {
        return el.getAttribute('aria-hidden') !== 'true';
      });
    }

    function paso() {
      var els = items();
      if (els.length < 2) return pista.clientWidth * 0.8;
      return els[1].getBoundingClientRect().left - els[0].getBoundingClientRect().left;
    }

    function indiceActivo() {
      var els = items();
      var x = pista.scrollLeft;
      var p = paso();
      return Math.max(0, Math.min(els.length - 1, Math.round(x / p)));
    }

    function irA(indice) {
      var els = items();
      indice = Math.max(0, Math.min(els.length - 1, indice));
      pista.scrollTo({
        left: paso() * indice,
        behavior: reducido.matches ? 'instant' : 'smooth'
      });
      // No se anuncia aqui: el evento scroll llamara a sincronizar() cuando la
      // posicion sea la definitiva, asi el anuncio nunca miente.
    }

    // Solo se anuncia despues de la primera interaccion y solo si la posicion
    // cambia: al cargar la pagina, un lector de pantalla no tiene por que oir
    // el estado de un carrusel que nadie ha tocado.
    var interactuado = false;
    var ultimoAnuncio = '';

    /** Primer y ultimo item realmente visibles dentro de la pista. */
    function rangoVisible() {
      var els = items();
      var caja = pista.getBoundingClientRect();
      var dentro = [];
      for (var i = 0; i < els.length; i++) {
        var r = els[i].getBoundingClientRect();
        if (r.right > caja.left + 4 && r.left < caja.right - 4) dentro.push(i);
      }
      return dentro.length ? [dentro[0], dentro[dentro.length - 1]] : [0, 0];
    }

    function anunciar() {
      if (!estado || !interactuado) return;
      var rango = rangoVisible();
      var total = items().length;
      // Cuando se ven varias tarjetas a la vez, decir "elemento 2 de 5" enganaria.
      var texto =
        rango[0] === rango[1]
          ? 'Elemento ' + (rango[0] + 1) + ' de ' + total
          : 'Elementos ' + (rango[0] + 1) + ' a ' + (rango[1] + 1) + ' de ' + total;
      if (texto === ultimoAnuncio) return;
      ultimoAnuncio = texto;
      estado.textContent = texto;
    }

    function sincronizar() {
      // Margen de 2px: el scroll fraccionario no debe deshabilitar el boton.
      if (btnPrev) btnPrev.disabled = pista.scrollLeft <= 2;
      if (btnNext) {
        btnNext.disabled = pista.scrollLeft >= pista.scrollWidth - pista.clientWidth - 2;
      }
      anunciar();
    }

    if (btnPrev) {
      btnPrev.addEventListener('click', function () {
        interactuado = true;
        irA(indiceActivo() - 1);
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', function () {
        interactuado = true;
        irA(indiceActivo() + 1);
      });
    }

    pista.addEventListener('scroll', sincronizar, { passive: true });
    window.addEventListener('resize', sincronizar, { passive: true });

    // Teclado sobre la pista. Las tarjetas siguen siendo enlaces o botones
    // reales, asi que Tab y Enter funcionan por si mismos.
    pista.setAttribute('tabindex', '0');
    pista.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowRight') {
        irA(indiceActivo() + 1);
      } else if (ev.key === 'ArrowLeft') {
        irA(indiceActivo() - 1);
      } else if (ev.key === 'Home') {
        irA(0);
      } else if (ev.key === 'End') {
        irA(items().length - 1);
      } else {
        return;
      }
      interactuado = true;
      ev.preventDefault();
    });

    /* --- arrastre con raton (el tactil ya lo hace el navegador) --- */
    var arrastrando = false;
    var xInicio = 0;
    var scrollInicio = 0;
    var movido = 0;

    pista.addEventListener('pointerdown', function (ev) {
      if (ev.pointerType !== 'mouse' || ev.button !== 0) return;
      interactuado = true;
      arrastrando = true;
      movido = 0;
      xInicio = ev.clientX;
      scrollInicio = pista.scrollLeft;
      pista.style.scrollSnapType = 'none';
    });

    pista.addEventListener('pointermove', function (ev) {
      if (!arrastrando) return;
      var d = ev.clientX - xInicio;
      movido = Math.abs(d);
      pista.scrollLeft = scrollInicio - d;
    });

    function terminarArrastre() {
      if (!arrastrando) return;
      arrastrando = false;
      pista.style.scrollSnapType = '';
      irA(indiceActivo());
    }

    pista.addEventListener('pointerup', terminarArrastre);
    pista.addEventListener('pointercancel', terminarArrastre);
    pista.addEventListener('pointerleave', terminarArrastre);

    // Un arrastre no debe acabar navegando a la tarjeta que hay debajo.
    pista.addEventListener(
      'click',
      function (ev) {
        if (movido > 6) {
          ev.preventDefault();
          ev.stopPropagation();
        }
        movido = 0;
      },
      true
    );

    sincronizar();
    return { raiz: raiz, irA: irA, indiceActivo: indiceActivo };
  }

  function iniciar() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cine-rail]'), crearRail);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  } else {
    iniciar();
  }

  window.CineRail = { crear: crearRail };
})();
