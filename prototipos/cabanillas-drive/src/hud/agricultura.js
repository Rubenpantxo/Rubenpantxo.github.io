// Panel del modo agricultura (PLAN_AGRICULTURA.md §5.7). De momento (A4): con el tractor, qué apero
// lleva y si está bajado, la parcela que pisa y cuánto lleva labrado; y el botón táctil del apero.
// Crecerá en A9 (cultivo, humedad, avisos, minimapa).
const ESTILO = `
#agri-hud { position: fixed; top: calc(max(10px, env(safe-area-inset-top)) + 4px); left: 50%; transform: translateX(-50%);
  z-index: 12; pointer-events: none; text-align: center; color: var(--tinta, #fff); background: var(--fondo-ui, rgba(16,22,30,.72));
  border-radius: 10px; padding: 5px 12px 6px; font: 500 13px system-ui, sans-serif; max-width: min(92vw, 460px); box-sizing: border-box;
  backdrop-filter: blur(4px); line-height: 1.35; }
#agri-hud[hidden] { display: none; }
#agri-hud .apero { font-weight: 700; }
#agri-hud .estado-apero { display: inline-block; margin-left: 6px; padding: 0 6px; border-radius: 6px; font-size: 12px; }
#agri-hud .estado-apero.bajado { background: #4caf50; color: #08210a; }
#agri-hud .estado-apero.subido { background: rgba(255,255,255,.18); }
#agri-hud .parcela { color: var(--tenue, #c9d3de); font-size: 12px; }
#agri-hud .labor { font-weight: 600; }
#agri-hud .barra { display: inline-block; vertical-align: middle; width: 70px; height: 6px; border-radius: 3px;
  background: rgba(255,255,255,.2); overflow: hidden; margin: 0 4px; }
#agri-hud .barra i { display: block; height: 100%; background: var(--acento, #ffd54a); }
#agri-hud .ritmo.bien { color: #8be28f; } #agri-hud .ritmo.rapido { color: #ffb74d; } #agri-hud .ritmo.lento { color: #c9d3de; }
@media (max-width: 640px) { #agri-hud { top: calc(max(8px, env(safe-area-inset-top)) + 2px); font-size: 12px; max-width: 58vw; } }
.boton-tactil.apero { font-size: 22px; }
.boton-tactil.apero.bajado { border-color: #4caf50; box-shadow: 0 0 8px #4caf50; }
`;

const NOMBRE_LABOR = { arar: ['Arado', 'arado'], gradear: ['Cultivado', 'gradeado'] };
const fmt = (n, d = 0) => n.toLocaleString('es-ES', { maximumFractionDigits: d, minimumFractionDigits: d });

export function creaHudAgricultura({ tactil }) {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.append(estilo);
  const caja = document.createElement('div');
  caja.id = 'agri-hud';
  caja.hidden = true;
  caja.setAttribute('aria-live', 'polite');
  document.body.append(caja);
  const boton = tactil ? tactil.querySelector('[data-pulsar="apero"]') : null;

  let ultimo = '';
  return {
    // estado: null (no se lleva el tractor) o { apero, bajado, velocidadKmh, parcela, recuento, teclado }
    actualiza(estado) {
      if (!estado) {
        caja.hidden = true;
        if (boton) boton.hidden = true;
        ultimo = '';
        return;
      }
      const { apero, bajado, velocidadKmh, parcela, recuento, conTeclado } = estado;
      if (boton) {
        boton.hidden = !apero;
        boton.textContent = bajado ? '⬆' : '⬇';
        boton.classList.toggle('bajado', Boolean(bajado));
        boton.setAttribute('aria-label', bajado ? 'Subir el apero' : 'Bajar el apero');
      }
      let html;
      if (!apero) {
        html = `<span class="apero">🚜 Sin apero</span> <span class="parcela">· engánchalo en la COPE</span>`;
      } else {
        const [min, max] = apero.config.trabajoKmh;
        const v = Math.abs(velocidadKmh);
        const ritmo = !bajado ? '' : v < 1 ? '' : v > max + 0.5 ? '<span class="ritmo rapido"> · deprisa</span>'
          : v >= min ? '<span class="ritmo bien"> · buen ritmo</span>' : '<span class="ritmo lento"> · despacio</span>';
        const tecla = conTeclado ? ' (Q)' : '';
        html = `<span class="apero">${apero.config.icono} ${apero.config.nombre}</span>`
          + `<span class="estado-apero ${bajado ? 'bajado' : 'subido'}">${bajado ? '⬇ Bajado' : '⬆ Levantado'}${tecla}</span>${ritmo}`;
      }
      if (parcela) {
        html += `<div class="parcela">Parcela ${parcela.ref}${parcela.paraje ? ` · ${parcela.paraje}` : ''} · ${fmt(parcela.superficie_ha, 2)} ha</div>`;
        if (recuento && apero) {
          const [nombre, clave] = NOMBRE_LABOR[apero.config.labor] ?? ['Labrado', 'arado'];
          const pct = recuento[clave] ?? 0;
          // El cultivador trabaja sobre lo arado: el arado pasa a «cultivado»; se enseñan los dos
          const otros = Object.entries(NOMBRE_LABOR).filter(([, [, c]]) => c !== clave && (recuento[c] ?? 0) > 0)
            .map(([, [n, c]]) => ` · ${n} ${fmt(recuento[c], 0)} %`).join('');
          html += `<div><span class="labor">${nombre}</span><span class="barra"><i style="width:${Math.min(100, pct)}%"></i></span>${fmt(pct, 0)} %${otros}</div>`;
        }
      }
      if (html !== ultimo) { caja.innerHTML = html; ultimo = html; }
      caja.hidden = false;
    },
    libera() { caja.remove(); estilo.remove(); },
  };
}
