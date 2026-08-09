/*
  copiar-color.js — un clic en una muestra copia su hexadecimal.

  Sin dependencias. Usa el portapapeles moderno cuando esta disponible y cae
  a un textarea temporal cuando no (Safari antiguo, http sin cifrar). Si las
  dos vias fallan se dice, en lugar de fingir que ha funcionado.
*/
(function () {
  'use strict';

  var AVISO_MS = 1600;
  var temporizador = null;

  function estado(texto) {
    var region = document.querySelector('[data-copiar-estado]');
    if (region) region.textContent = texto;
  }

  /** Copia de emergencia para navegadores sin API de portapapeles. */
  function copiaAntigua(texto) {
    var caja = document.createElement('textarea');
    caja.value = texto;
    caja.setAttribute('readonly', '');
    caja.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(caja);
    caja.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(caja);
    return ok;
  }

  /**
   * Ultimo recurso: si el navegador no deja escribir en el portapapeles
   * (documento sin foco, http sin cifrar, permiso denegado), al menos se
   * deja el codigo seleccionado para que un Ctrl+C lo resuelva.
   */
  function seleccionar(boton) {
    var valor = boton.querySelector('.pl-color__hex b');
    if (!valor || !window.getSelection || !document.createRange) return false;
    var rango = document.createRange();
    rango.selectNodeContents(valor);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(rango);
    return true;
  }

  function marcar(boton, ok, hex) {
    if (temporizador) {
      clearTimeout(temporizador);
      var previo = document.querySelector('.esta-copiado');
      if (previo) previo.classList.remove('esta-copiado');
    }
    if (!ok) {
      estado(
        seleccionar(boton)
          ? hex + ' seleccionado: el navegador no deja copiar solo, pulsa Control+C'
          : 'No se ha podido copiar ' + hex + '.'
      );
      return;
    }
    boton.classList.add('esta-copiado');
    estado(hex + ' copiado al portapapeles');
    temporizador = setTimeout(function () {
      boton.classList.remove('esta-copiado');
      temporizador = null;
    }, AVISO_MS);
  }

  document.addEventListener('click', function (ev) {
    var boton = ev.target.closest && ev.target.closest('.pl-color');
    if (!boton) return;
    var hex = boton.getAttribute('data-hex');
    if (!hex) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(hex).then(
        function () { marcar(boton, true, hex); },
        function () { marcar(boton, copiaAntigua(hex), hex); }
      );
    } else {
      marcar(boton, copiaAntigua(hex), hex);
    }
  });
})();
