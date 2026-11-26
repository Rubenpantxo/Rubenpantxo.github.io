// Panel del modo agricultura (PLAN_AGRICULTURA.md §5.7). De momento (A4): con el tractor, qué apero
// lleva y si está bajado, la parcela que pisa y cuánto lleva labrado; desde A5, lo que queda en la
// tolva (abono o semilla); desde A6, el día de cultivo y lo que hay sembrado donde se pisa (etapa,
// edad y cuánto falta para la siguiente); y el botón táctil del apero. Desde A7, la humedad del
// suelo y el riego de la parcela, y junto a una tajadera (en coche o en tractor) cómo abrirla o
// cerrarla (G o el botón de la tajadera) y cómo va el agua. Desde A8, con la cosechadora: el cabezal, la tolva,
// lo que se está segando, el rendimiento y lo cosechado de la parcela; botones de bajar (cabezal) y del tubo.
// Con el remolque de grano en el tractor, lo que lleva.
// A9: la línea de la parcela lleva el uso SIGPAC y secano o regadío, y el apero con toma de fuerza
// enseña si gira. Los avisos salen por el aviso del juego; el minimapa, en capaMinimapa.js.
import { iconoHtml, ICONO_APERO } from './iconos.js';
const ESTILO = `
#agri-hud svg.ic, #agri-riego svg.ic { display: inline-block; vertical-align: middle; margin: -2px 5px 0 0; }
.boton-tactil svg.ic { width: 30px; height: 30px; pointer-events: none; }
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
#agri-hud .vacia { color: #ffb74d; }
#agri-hud .cultivo { font-weight: 600; color: #c8e6a0; }
#agri-hud .ritmo.bien { color: #8be28f; } #agri-hud .ritmo.rapido { color: #ffb74d; } #agri-hud .ritmo.lento { color: #c9d3de; }
#agri-hud .riego, #agri-riego .riego { color: #8fd3ff; font-weight: 600; }
#agri-riego { position: fixed; bottom: calc(max(12px, env(safe-area-inset-bottom)) + 150px); left: 50%; transform: translateX(-50%);
  z-index: 12; pointer-events: none; text-align: center; color: var(--tinta, #fff); background: var(--fondo-ui, rgba(16,22,30,.78));
  border-radius: 10px; padding: 6px 14px 7px; font: 500 13px system-ui, sans-serif; max-width: min(92vw, 420px);
  box-sizing: border-box; backdrop-filter: blur(4px); line-height: 1.4; border: 1px solid rgba(143,211,255,.45); }
#agri-riego[hidden] { display: none; }
#agri-riego .tecla { display: inline-block; min-width: 16px; padding: 0 5px; border-radius: 4px; background: rgba(255,255,255,.2); font-weight: 700; }
.boton-tactil.tajadera { font-size: 22px; }
.boton-tactil.tajadera.abierta { border-color: #4fc3f7; box-shadow: 0 0 8px #4fc3f7; }
@media (max-width: 640px) { #agri-riego { bottom: calc(max(10px, env(safe-area-inset-bottom)) + 200px); font-size: 12px; } }
@media (max-width: 640px) { #agri-hud { top: calc(max(8px, env(safe-area-inset-top)) + 2px); font-size: 12px; max-width: 58vw; } }
.boton-tactil.apero, .boton-tactil.descargar { font-size: 22px; }
.boton-tactil.descargar.fuera { border-color: #ffd54a; box-shadow: 0 0 8px #ffd54a; }
#agri-hud .segando { color: #ffd54a; font-weight: 600; }
.boton-tactil.apero.bajado { border-color: #4caf50; box-shadow: 0 0 8px #4caf50; }
`;

const NOMBRE_LABOR = { arar: ['Arado', 'arado'], gradear: ['Cultivado', 'gradeado'], abonar: ['Abonado', 'abonado'], sembrar: ['Sembrado', 'sembrado'] };
// Lo que se enseña además de la labor del apero (si ya hay algo)
const OTRAS = [['Arado', 'arado'], ['Cultivado', 'gradeado'], ['Abonado', 'abonado'], ['Sembrado', 'sembrado']];
const fmt = (n, d = 0) => n.toLocaleString('es-ES', { maximumFractionDigits: d, minimumFractionDigits: d });
// Línea de la parcela: referencia, paraje, superficie, uso SIGPAC y secano o regadío
function lineaParcela(p) {
  const uso = p.sigpac?.uso ? ` · SIGPAC ${p.sigpac.uso}` : '';
  const expl = p.sigpac?.explotacion === 'regadio' ? ' · regadío' : p.sigpac?.explotacion === 'secano' ? ' · secano' : '';
  return `Parcela ${p.ref}${p.paraje ? ` · ${p.paraje}` : ''} · ${fmt(p.superficie_ha, 2)} ha${uso}${expl}`;
}

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
  const botonTajadera = tactil ? tactil.querySelector('[data-pulsar="tajadera"]') : null;
  const botonDescargar = tactil ? tactil.querySelector('[data-pulsar="descargar"]') : null;
  const cajaRiego = document.createElement('div');
  cajaRiego.id = 'agri-riego';
  cajaRiego.hidden = true;
  cajaRiego.setAttribute('aria-live', 'polite');
  document.body.append(cajaRiego);
  let ultimoRiego = '';
  // Los botones táctiles llevan icono propio (se cambia solo si cambia)
  const ponIcono = (b, nombre) => { if (b.dataset.icono !== nombre) { b.dataset.icono = nombre; b.innerHTML = iconoHtml(nombre, 30); } };
  if (botonTajadera) ponIcono(botonTajadera, 'tajadera');
  if (botonDescargar) ponIcono(botonDescargar, 'tubo');

  let ultimo = '';
  let recoleccionOn = false;
  return {
    // A pie junto a un cultivo de mano: el botón de la cesta (el mismo de «descargar» de la cosechadora)
    recoleccion(on) {
      if (!botonDescargar) return;
      recoleccionOn = on;
      botonDescargar.hidden = !on;
      if (on) { ponIcono(botonDescargar, 'cesta'); botonDescargar.setAttribute('aria-label', 'Recoger lo que está en su punto'); }
    },
    // estado: null (no se lleva el tractor) o { apero, bajado, velocidadKmh, parcela, recuento, teclado }
    actualiza(estado) {
      if (botonDescargar) botonDescargar.hidden = !recoleccionOn;
      if (!estado) {
        caja.hidden = true;
        if (boton) boton.hidden = true;
        ultimo = '';
        return;
      }
      const { apero, bajado, tdf, velocidadKmh, parcela, recuento, conTeclado, tolva, dia, minutosParaManana, cultivo, suelo, riego } = estado;
      if (boton) {
        boton.hidden = !apero || !apero.config.labor;
        ponIcono(boton, bajado ? 'subir' : 'bajar');
        boton.classList.toggle('bajado', Boolean(bajado));
        boton.setAttribute('aria-label', bajado ? 'Subir el apero' : 'Bajar el apero');
      }
      let html;
      if (!apero) {
        html = `<span class="apero">${iconoHtml('tractor', 22)}Sin apero</span> <span class="parcela">· engánchalo en la COPE</span>`;
      } else if (apero.config.grano) {
        const pct = Math.round(apero.llenado * 100);
        html = `<span class="apero">${iconoHtml(ICONO_APERO[apero.id] ?? 'remolque', 22)}${apero.config.nombre}</span>`
          + `<div class="parcela">Lleva <span class="barra"><i style="width:${pct}%"></i></span>${fmt(apero.carga, 0)} kg${apero.carga > 0 && tolva?.nombre ? ` de ${tolva.nombre}` : ''}</div>`;
      } else {
        const [min, max] = apero.config.trabajoKmh;
        const v = Math.abs(velocidadKmh);
        const ritmo = !bajado ? '' : v < 1 ? '' : v > max + 0.5 ? '<span class="ritmo rapido"> · deprisa</span>'
          : v >= min ? '<span class="ritmo bien"> · buen ritmo</span>' : '<span class="ritmo lento"> · despacio</span>';
        const tecla = conTeclado ? ' (Q)' : '';
        html = `<span class="apero">${iconoHtml(ICONO_APERO[apero.id] ?? 'tractor', 22)}${apero.config.nombre}</span>`
          + `<span class="estado-apero ${bajado ? 'bajado' : 'subido'}">${bajado ? 'Bajado' : 'Levantado'}${tecla}</span>${ritmo}`
          + (apero.info?.entrada_tdf ? `<span class="estado-apero ${tdf ? 'bajado' : 'subido'}">TDF ${tdf ? 'girando' : 'parada'}</span>` : '');
        if (tolva) {
          const pct = Math.round(tolva.llenado * 100);
          html += `<div class="parcela${pct < 10 ? ' vacia' : ''}">Tolva <span class="barra"><i style="width:${pct}%"></i></span>${fmt(tolva.kg, 0)} kg de ${tolva.nombre}</div>`;
        }
      }
      if (cultivo) {
        const sig = cultivo.siguiente ? ` · ${cultivo.siguiente.etapa.toLowerCase()} en ${cultivo.siguiente.enDias} ${cultivo.siguiente.enDias === 1 ? 'día' : 'días'}` : '';
        html += `<div class="cultivo">${iconoHtml(cultivo.id ?? cultivo.nombre.toLowerCase(), 18)}${cultivo.nombre} · ${cultivo.etapa}${cultivo.madura ? ' ✓' : ''} · ${fmt(Math.floor(cultivo.edad))} días${sig}</div>`;
      }
      if (parcela) {
        html += `<div class="parcela">${lineaParcela(parcela)}</div>`;
        if (recuento && apero?.config.labor) {
          const [nombre, clave] = NOMBRE_LABOR[apero.config.labor] ?? ['Labrado', 'arado'];
          const pct = recuento[clave] ?? 0;
          // El cultivador trabaja sobre lo arado: el arado pasa a «cultivado»; se enseñan los dos
          const otros = OTRAS.filter(([, c]) => c !== clave && (recuento[c] ?? 0) > 0)
            .map(([n, c]) => ` · ${n} ${fmt(recuento[c], 0)} %`).join('');
          html += `<div><span class="labor">${nombre}</span><span class="barra"><i style="width:${Math.min(100, pct)}%"></i></span>${fmt(pct, 0)} %${otros}</div>`;
        }
      }
      if (parcela && (suelo || riego)) {
        const partes = [];
        if (suelo) partes.push(`${iconoHtml('gota', 16)}Humedad del suelo ${fmt(suelo.humedad * 100, 0)} %`);
        if (riego?.regando) partes.push(`<span class="riego">regando ${fmt(riego.cubierto * 100, 0)} %</span>`);
        html += `<div class="parcela">${partes.join(' · ')}</div>`;
      }
      if (dia != null) html += `<div class="parcela">${iconoHtml('calendario', 16)}Día ${dia} de cultivo · el siguiente en ${minutosParaManana} min</div>`;
      if (html !== ultimo) { caja.innerHTML = html; ultimo = html; }
      caja.hidden = false;
    },
    // Cosechadora: { bajado, velocidadKmh, conTeclado, tuboFuera, tolva: { kg, capacidad, nombre }, segando,
    //   descargando, rendimiento (kg/ha), parcela, cosechado (%), cultivo, dia, minutosParaManana }
    cosechadora(e) {
      if (boton) {
        boton.hidden = false;
        ponIcono(boton, e.bajado ? 'subir' : 'bajar');
        boton.classList.toggle('bajado', Boolean(e.bajado));
        boton.setAttribute('aria-label', e.bajado ? 'Subir el cabezal' : 'Bajar el cabezal');
      }
      if (botonDescargar) {
        botonDescargar.hidden = false;
        botonDescargar.classList.toggle('fuera', Boolean(e.tuboFuera));
        botonDescargar.setAttribute('aria-label', e.tuboFuera ? 'Recoger el tubo de descarga' : 'Sacar el tubo de descarga');
      }
      const v = Math.abs(e.velocidadKmh);
      const [min, max] = [3, 7];
      const ritmo = !e.bajado || v < 1 ? '' : v > max + 0.5 ? '<span class="ritmo rapido"> · deprisa</span>'
        : v >= min ? '<span class="ritmo bien"> · buen ritmo</span>' : '<span class="ritmo lento"> · despacio</span>';
      let html = `<span class="apero">${iconoHtml('cosechadora', 22)}Cosechadora</span><span class="estado-apero ${e.bajado ? 'bajado' : 'subido'}">${e.bajado ? 'Cabezal bajado' : 'Cabezal arriba'}${e.conTeclado ? ' (Q)' : ''}</span>${ritmo}`;
      const pct = Math.round((e.tolva.kg / e.tolva.capacidad) * 100);
      html += `<div class="parcela${pct >= 99 ? ' vacia' : ''}">Tolva <span class="barra"><i style="width:${pct}%"></i></span>${fmt(e.tolva.kg, 0)} kg${e.tolva.kg > 0 ? ` de ${e.tolva.nombre}` : ''}${pct >= 99 ? ' · llena' : ''}</div>`;
      if (e.segando) html += `<div class="segando">Segando · ${fmt(e.rendimiento, 0)} kg/ha</div>`;
      else if (e.descargando) html += '<div class="segando">Descargando al remolque…</div>';
      else if (e.tuboFuera) html += `<div class="parcela">Tubo de descarga fuera${e.conTeclado ? ' (X)' : ''}</div>`;
      if (e.cultivo) {
        const sig = e.cultivo.siguiente ? ` · ${e.cultivo.siguiente.etapa.toLowerCase()} en ${e.cultivo.siguiente.enDias} ${e.cultivo.siguiente.enDias === 1 ? 'día' : 'días'}` : '';
        html += `<div class="cultivo">${iconoHtml(e.cultivo.id ?? e.cultivo.nombre.toLowerCase(), 18)}${e.cultivo.nombre} · ${e.cultivo.etapa}${e.cultivo.madura ? ' ✓' : ''}${sig}</div>`;
      }
      if (e.parcela) {
        html += `<div class="parcela">${lineaParcela(e.parcela)}</div>`;
        if (e.cosechado != null) html += `<div><span class="labor">Cosechado</span><span class="barra"><i style="width:${Math.min(100, e.cosechado)}%"></i></span>${fmt(e.cosechado, 0)} %</div>`;
      }
      if (e.dia != null) html += `<div class="parcela">${iconoHtml('calendario', 16)}Día ${e.dia} de cultivo · el siguiente en ${e.minutosParaManana} min</div>`;
      if (html !== ultimo) { caja.innerHTML = html; ultimo = html; }
      caja.hidden = false;
    },
    // Junto a una tajadera: { ref, nombre, abierta, estado (riego de la parcela), conTeclado } o null
    riego(info) {
      if (!info) {
        cajaRiego.hidden = true;
        if (botonTajadera) botonTajadera.hidden = true;
        ultimoRiego = '';
        return;
      }
      const { nombre, abierta, estado: e, conTeclado, ref } = info;
      if (botonTajadera) {
        botonTajadera.hidden = false;
        botonTajadera.classList.toggle('abierta', abierta);
        botonTajadera.setAttribute('aria-label', abierta ? 'Cerrar la tajadera' : 'Abrir la tajadera');
      }
      const tecla = conTeclado ? '<span class="tecla">G</span>' : iconoHtml('tajadera', 18);
      let html = `<div>${iconoHtml('tajadera', 20)}Tajadera ${nombre} de la ${ref} · ${abierta ? 'abierta' : 'cerrada'} · ${tecla} ${abierta ? 'cerrarla' : 'abrirla'}</div>`;
      if (e?.regando) {
        html += `<div class="riego">Regando: ${fmt(e.caudalLs, 0)} L/s · agua en el ${fmt(e.cubierto * 100, 0)} % de la parcela`
          + ` · ${fmt(e.mm, 0)} mm</div>`;
      }
      if (html !== ultimoRiego) { cajaRiego.innerHTML = html; ultimoRiego = html; }
      cajaRiego.hidden = false;
    },
    libera() { caja.remove(); cajaRiego.remove(); estilo.remove(); },
  };
}
