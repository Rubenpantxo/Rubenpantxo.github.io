// Paneles laterales del editor: biblioteca (izquierda) y propiedades, reglas,
// redes, materiales y código (derecha). Cada función pinta su panel a partir
// del estado de la aplicación; los eventos se delegan en el contenedor.

import { CATEGORIAS, COMPONENTES, TIPOS_PIN } from '../datos/componentes.js';
import { clavePin, buscarParte, U } from '../core/modelo.js';
import { formato } from '../core/erc.js';
import { listaMateriales, cabeceraPines, platformioDe } from '../core/exportar.js';
import { longitudRuta } from '../core/ruta.js';
import { miniatura } from './dibujos.js';
import { colorCable } from './lienzo.js';
import { esc, eur, mm, ico } from './util.js';

const { fmtV, fmtI } = formato;
const NIVEL_ICO = { error: 'error', aviso: 'alerta', info: 'info' };
const CLASE_TXT = { gnd: 'Masa', v5: 'Alimentación', v3: 'Alimentación 3,3 V', fase: 'Fase', neutro: 'Neutro', pe: 'Tierra', usb: 'USB', 'datos-red': 'Red de datos', senal: 'Señal' };
const COLORES_CABLE = ['#e03131', '#f08c00', '#f2d024', '#2f9e44', '#1c7ed6', '#ae3ec9', '#22252a', '#f1f3f5', '#7b4a1e', '#868e96'];

// ---------------------------------------------------------------- biblioteca
export function pintarBiblioteca(el, app) {
    const texto = (app.filtro.texto || '').toLowerCase().trim();
    const visibles = COMPONENTES.filter(c =>
        (!app.filtro.propios || app.tengo(c)) &&
        (!texto || (c.nombre + ' ' + c.corto + ' ' + c.fabricante + ' ' + c.resumen).toLowerCase().includes(texto)));
    let lista = '';
    for (const [id, nombre] of CATEGORIAS) {
        const items = visibles.filter(c => c.categoria === id);
        if (!items.length) continue;
        lista += `<h3 class="bib-cat">${esc(nombre)} <span>${items.length}</span></h3><ul class="bib-lista">` + items.map(c => `
<li class="bib-item${app.tengo(c) ? ' propio' : ''}">
  <button type="button" class="bib-pieza" data-colocar="${c.id}" title="Clic para colocar · doble clic para añadir al centro">
    <span class="bib-mini">${miniatura(c, { margen: 4 })}</span>
    <span class="bib-txt"><b>${esc(c.corto)}</b><small>${esc(c.fabricante)} · ${mm(c.w)} × ${mm(c.h)} mm</small></span>
  </button>
  <button type="button" class="bib-info" data-ficha="${c.id}" title="Ver ficha técnica" aria-label="Ficha de ${esc(c.corto)}">${ico('info')}</button>
</li>`).join('') + '</ul>';
    }
    const lista_el = el.querySelector('.bib-contenido');
    lista_el.innerHTML = lista || `<p class="vacio">Ningún componente coincide con el filtro.</p>`;
    el.querySelector('[data-propios]').setAttribute('aria-pressed', String(!!app.filtro.propios));
}

// --------------------------------------------------------------- propiedades
export function pintarPropiedades(el, app) {
    const { doc, analisis: an, lienzo } = app;
    const partes = [...lienzo.sel.partes], cables = [...lienzo.sel.cables];

    if (partes.length === 1 && !cables.length) {
        const parte = buscarParte(doc, partes[0]), def = app.catalogo.get(parte.tipo);
        const filas = def.pines.map(pin => {
            const red = an.porPin.get(clavePin(parte.id, pin.id));
            return `<tr class="${red ? 'con' : ''}"><td><b>${esc(pin.n || pin.id)}</b>${pin.fisico ? ` <small>#${pin.fisico}</small>` : ''}</td>` +
                `<td><span class="chip-pin t-${pin.tipo}">${esc(TIPOS_PIN[pin.tipo] || pin.tipo)}</span></td>` +
                `<td>${red ? `<button type="button" class="vinculo" data-red="${red.id}">${esc(red.nombre)}</button>` : '<span class="tenue">—</span>'}</td></tr>`;
        }).join('');
        el.innerHTML = `
<div class="prop-cab"><span class="prop-mini">${miniatura(def, { margen: 4 })}</span>
  <div><h3>${esc(def.nombre)}</h3><p class="tenue">${esc(def.fabricante)}</p></div></div>
<div class="campos">
  <label>Referencia<input type="text" data-campo="ref" value="${esc(parte.ref)}" maxlength="12" spellcheck="false"></label>
  ${def.valor ? `<label>Valor<input type="text" data-campo="valor" value="${esc(parte.valor || '')}" maxlength="24" spellcheck="false"></label>` : ''}
  <label>Posición<output>X ${mm(parte.x / U)} · Y ${mm(parte.y / U)} mm · ${parte.rot * 90}°</output></label>
</div>
<div class="fila-botones">
  <button type="button" data-orden="girar">${ico('girar')}Girar</button>
  <button type="button" data-orden="duplicar">${ico('duplicar')}Duplicar</button>
  <button type="button" data-orden="borrar" class="peligro">${ico('borrar')}Quitar</button>
</div>
${def.aviso ? `<p class="nota aviso">${ico('alerta')}<span>${esc(def.aviso)}</span></p>` : ''}
<button type="button" class="boton-ancho" data-ficha="${def.id}">${ico('hoja')}Ficha técnica y enlaces</button>
<h4>Pines <span class="tenue">${def.pines.filter(p => an.porPin.has(clavePin(parte.id, p.id))).length} de ${def.pines.length} conectados</span></h4>
<div class="tabla-scroll"><table class="tabla pines"><thead><tr><th>Pin</th><th>Tipo</th><th>Red</th></tr></thead><tbody>${filas}</tbody></table></div>`;
        return;
    }

    if (cables.length === 1 && !partes.length) {
        const cable = doc.cables.find(c => c.id === cables[0]);
        const red = an.porCable.get(cable.id);
        const ruta = lienzo.rutas.get(cable.id) || [];
        const ext = e => { const p = buscarParte(doc, e.p), d = app.catalogo.get(p.tipo), pin = d.pines.find(x => x.id === e.pin); return `${esc(p.ref)}.${esc(pin.red || pin.n || pin.id)}`; };
        const color = colorCable(cable, red, lienzo.indiceRed(red));
        el.innerHTML = `
<div class="prop-cab"><span class="muestra-cable" style="background:${esc(color)}"></span>
  <div><h3>Cable ${ext(cable.a)} → ${ext(cable.b)}</h3><p class="tenue">Red ${esc(red ? red.nombre : '—')} · ${esc(CLASE_TXT[red ? red.clase : 'senal'])}</p></div></div>
<div class="campos">
  <label>Rótulo<input type="text" data-campo="etiqueta" value="${esc(cable.etiqueta || '')}" maxlength="60" placeholder="Sin rótulo"></label>
  <label>Longitud del trazado<output>${mm(longitudRuta(ruta) / U)} mm</output></label>
</div>
<h4>Color</h4>
<div class="paleta">
  <button type="button" data-color="" class="auto${cable.color ? '' : ' activo'}" title="Según el tipo de red">Auto</button>
  ${COLORES_CABLE.map(c => `<button type="button" data-color="${c}" class="${cable.color === c ? 'activo' : ''}" style="background:${c}" aria-label="Color ${c}"></button>`).join('')}
</div>
<div class="fila-botones"><button type="button" data-orden="borrar" class="peligro">${ico('borrar')}Quitar cable</button></div>
${red ? `<h4>Pines de la red <span class="tenue">${red.pines.length}</span></h4><ul class="lista-pines">${red.pines.map(e =>
            `<li><button type="button" class="vinculo" data-parte="${e.parte.id}">${esc(e.parte.ref)}</button>.${esc(e.pin.red || e.pin.n || e.pin.id)} <small>${esc(TIPOS_PIN[e.pin.tipo])}</small></li>`).join('')}</ul>` : ''}`;
        return;
    }

    if (partes.length + cables.length > 1) {
        el.innerHTML = `
<div class="prop-cab"><div><h3>Selección múltiple</h3><p class="tenue">${partes.length} pieza(s) · ${cables.length} cable(s)</p></div></div>
<div class="fila-botones">
  ${partes.length ? `<button type="button" data-orden="girar">${ico('girar')}Girar</button><button type="button" data-orden="duplicar">${ico('duplicar')}Duplicar</button>` : ''}
  <button type="button" data-orden="borrar" class="peligro">${ico('borrar')}Quitar</button>
</div>
<p class="nota">Arrastra cualquiera de las piezas seleccionadas para moverlas juntas. Las flechas del teclado las desplazan un paso de rejilla.</p>`;
        return;
    }

    const bom = listaMateriales(doc, app.catalogo, app.inventario);
    el.innerHTML = `
<div class="prop-cab"><div><h3>Montaje</h3><p class="tenue">Nada seleccionado</p></div></div>
<div class="campos">
  <label>Nombre<input type="text" data-campo="nombre" value="${esc(doc.nombre)}" maxlength="80"></label>
  <label>Notas<textarea data-campo="notas" rows="4" maxlength="4000" placeholder="Objetivo, pendientes, medidas…">${esc(doc.notas || '')}</textarea></label>
</div>
<dl class="resumen">
  <div><dt>Piezas</dt><dd>${doc.partes.length}</dd></div><div><dt>Cables</dt><dd>${doc.cables.length}</dd></div>
  <div><dt>Redes</dt><dd>${an.redes.length}</dd></div><div><dt>Coste</dt><dd>${eur(bom.total)}</dd></div>
</dl>
<h4>Cómo se trabaja</h4>
<ul class="ayuda">
  <li><kbd>Clic</kbd> en una pieza de la biblioteca y otro en la mesa para colocarla.</li>
  <li><kbd>Clic</kbd> en un pin y <kbd>clic</kbd> en otro para tender un cable. <kbd>Esc</kbd> cancela.</li>
  <li><kbd>R</kbd> gira · <kbd>Supr</kbd> quita · <kbd>Ctrl</kbd>+<kbd>D</kbd> duplica · <kbd>Ctrl</kbd>+<kbd>Z</kbd> deshace.</li>
  <li>Rueda para el zoom · <kbd>Espacio</kbd> + arrastrar o botón central para desplazar · <kbd>F</kbd> encuadra.</li>
</ul>`;
}

// -------------------------------------------------------------------- reglas
export function pintarReglas(el, app) {
    const an = app.analisis;
    const { error, aviso, info } = an.cuenta;
    const cabecera = !app.doc.partes.length
        ? `<p class="veredicto neutro">${ico('info')}<span>La mesa está vacía.</span></p>`
        : error ? `<p class="veredicto error">${ico('error')}<span><b>${error} error${error > 1 ? 'es' : ''}</b>: el montaje no es seguro tal como está.</span></p>`
            : aviso ? `<p class="veredicto aviso">${ico('alerta')}<span><b>${aviso} aviso${aviso > 1 ? 's' : ''}</b>: revísalos antes de conectar.</span></p>`
                : `<p class="veredicto ok">${ico('ok')}<span><b>Sin errores.</b> Las conexiones respetan las tensiones y corrientes declaradas.</span></p>`;
    const lista = an.problemas.map((p, i) => `
<li><button type="button" class="problema ${p.nivel}" data-problema="${i}">${ico(NIVEL_ICO[p.nivel])}
  <span><b>${esc(p.titulo)}</b><small>${esc(p.detalle)}</small><code>${esc(p.codigo)}</code></span></button></li>`).join('');
    const balance = an.alimentacion.map(a => {
        const pct = a.capacidad ? Math.min(100, Math.round(a.consumo / a.capacidad * 100)) : 0;
        const nivel = a.capacidad && a.consumo > a.capacidad ? 'error' : pct > 80 ? 'aviso' : 'ok';
        return `<li class="rail"><div class="rail-cab"><b>${esc(a.nombre)}</b><span>${fmtI(a.consumo)}${a.capacidad ? ' de ' + fmtI(a.capacidad) : ''}${a.tipo !== 'usb' ? ' · ' + fmtV(a.tension) : ''}</span></div>` +
            `<div class="barra-rail ${nivel}"><i style="width:${a.capacidad ? Math.max(2, pct) : 0}%"></i></div>` +
            `<small>${a.tipo === 'usb' ? 'Puerto USB' : a.tipo === 'ac' ? 'Circuito de 230 V' : 'Raíl de continua'} · ${esc(String((a.consumo * a.tension / 1000).toFixed(a.tipo === 'ac' ? 0 : 2)).replace('.', ','))} W</small></li>`;
    }).join('');
    el.innerHTML = `${cabecera}
<div class="contadores"><span class="error">${ico('error')}${error}</span><span class="aviso">${ico('alerta')}${aviso}</span><span class="info">${ico('info')}${info}</span></div>
${lista ? `<ul class="problemas">${lista}</ul>` : ''}
<h4>Balance de alimentación</h4>
${balance ? `<ul class="rails">${balance}</ul>` : '<p class="vacio">Aún no hay ninguna fuente con cargas conectadas.</p>'}
<p class="nota">Análisis estático a partir de los datos de las hojas de características: detecta montajes que no pueden funcionar o que dañan el hardware. No sustituye a medir con el polímetro.</p>`;
}

// --------------------------------------------------------------------- redes
export function pintarRedes(el, app) {
    const an = app.analisis, lienzo = app.lienzo;
    if (!an.redes.length) { el.innerHTML = '<p class="vacio">Todavía no hay cables. Cada grupo de pines unidos forma una red.</p>'; return; }
    el.innerHTML = `<ul class="redes">${an.redes.map(r => `
<li><details><summary><i class="punto-red" style="background:${esc(colorCable(null, r, lienzo.indiceRed(r)))}"></i><b>${esc(r.nombre)}</b>
  <span class="tenue">${esc(CLASE_TXT[r.clase])} · ${r.pines.length} pines</span>
  <button type="button" class="mini" data-red="${r.id}" title="Seleccionar en la mesa">${ico('ojo')}</button></summary>
  <ul class="lista-pines">${r.pines.map(e => `<li><button type="button" class="vinculo" data-parte="${e.parte.id}">${esc(e.parte.ref)}</button>.${esc(e.pin.red || e.pin.n || e.pin.id)} <small>${esc(TIPOS_PIN[e.pin.tipo])}</small></li>`).join('')}</ul>
</details></li>`).join('')}</ul>`;
}

// ---------------------------------------------------------------- materiales
export function pintarMateriales(el, app) {
    const bom = listaMateriales(app.doc, app.catalogo, app.inventario);
    if (!bom.lista.length) { el.innerHTML = '<p class="vacio">La lista de materiales se genera con las piezas de la mesa.</p>'; return; }
    el.innerHTML = `
<div class="tabla-scroll"><table class="tabla bom"><thead><tr><th>Ref.</th><th>Componente</th><th class="num">Ud.</th><th class="num">Importe</th><th title="Lo tengo">${ico('estrella')}</th></tr></thead><tbody>
${bom.lista.map(f => `<tr class="${f.propio ? 'propio' : ''}"><td>${esc(f.refs.join(', '))}</td><td><button type="button" class="vinculo" data-ficha="${f.def.id}">${esc(f.def.corto)}</button>${f.valor ? ` <small>${esc(f.valor)}</small>` : ''}</td>
<td class="num">${f.cantidad}</td><td class="num">${eur(f.importe)}</td>
<td><input type="checkbox" data-tengo="${f.def.id}" ${f.propio ? 'checked' : ''} aria-label="Tengo ${esc(f.def.corto)}"></td></tr>`).join('')}
</tbody></table></div>
<dl class="resumen dos"><div><dt>Total del montaje</dt><dd>${eur(bom.total)}</dd></div><div><dt>Por comprar</dt><dd class="${bom.pendiente ? 'aviso' : 'ok'}">${eur(bom.pendiente)}</dd></div></dl>
<div class="fila-botones"><button type="button" data-exportar="materiales">${ico('exportar')}CSV</button><button type="button" data-exportar="redes">${ico('exportar')}Lista de redes</button></div>
<p class="nota">Precios orientativos. Marca la estrella en lo que ya tienes para ver qué falta por comprar.</p>`;
}

// -------------------------------------------------------------------- código
export function pintarCodigo(el, app) {
    const cabecera = cabeceraPines(app.doc, app.catalogo, app.analisis);
    const pio = platformioDe(app.doc);
    el.innerHTML = `
<h4>pines.h <span class="tenue">según el cableado</span></h4>
<pre class="codigo" data-codigo="pines">${esc(cabecera)}</pre>
<div class="fila-botones"><button type="button" data-copiar="pines">${ico('copiar')}Copiar</button><button type="button" data-exportar="pines">${ico('exportar')}Descargar</button></div>
${pio.map((x, i) => `<h4>platformio.ini <span class="tenue">${esc(x.titulo)}</span></h4>
<pre class="codigo" data-codigo="pio-${i}">${esc(x.ini)}</pre>
<div class="fila-botones"><button type="button" data-copiar="pio-${i}">${ico('copiar')}Copiar</button><button type="button" data-exportar="pio-${i}">${ico('exportar')}Descargar</button></div>`).join('')}
<p class="nota">La cabecera se regenera con cada cable: cambia un GPIO en la mesa y el firmware se queda sincronizado al volver a compilar.</p>`;
}
