// Áreas de consulta: fichas técnicas de componentes, biblioteca de proyectos
// y recursos. Se pintan a partir de los datos; la navegación va por el hash
// de la URL (#componentes/<id>, #proyectos/<id>) para poder enlazarlas.

import { CATEGORIAS, COMPONENTES, TIPOS_PIN } from '../datos/componentes.js';
import { PROYECTOS, AMBITOS } from '../datos/proyectos.js';
import { RECURSOS, HOJA_DE_RUTA } from '../datos/recursos.js';
import { formato } from '../core/erc.js';
import { miniatura } from './dibujos.js';
import { esc, eur, mm, ico, enlace } from './util.js';

const { fmtV, fmtI } = formato;
const ICO_ENLACE = { repo: 'repo', hoja: 'hoja', doc: 'libro' };
const TXT_ENLACE = { repo: 'Repositorio', hoja: 'Hoja de datos', doc: 'Documentación' };

const tarjetaEnlace = e => enlace(e.url, `${ico(ICO_ENLACE[e.tipo] || 'enlace')}<span><b>${esc(e.t)}</b>${e.nota ? `<small>${esc(e.nota)}</small>` : `<small>${esc(TXT_ENLACE[e.tipo] || new URL(e.url).hostname)}</small>`}</span>${ico('enlace', 'fuera')}`, 'tarjeta-enlace');

function electrico(p) {
    const t = [];
    if (p.tipo === 'fuente') t.push(`${fmtV(p.v)}${p.imax ? ' · hasta ' + fmtI(p.imax) : ''}`);
    else if (p.tipo === 'alim') t.push(`${fmtV(p.vmin)} – ${fmtV(p.vmax)}${p.i ? ' · ' + fmtI(p.i) : ''}`);
    else {
        if (p.v) t.push('nivel ' + fmtV(p.v));
        if (p.vmax) t.push('máx. ' + fmtV(p.vmax));
        if (p.imax) t.push('hasta ' + fmtI(p.imax));
        if (p.i) t.push(fmtI(p.i));
    }
    return t.join(' · ');
}

// ---------------------------------------------------------------- componentes
export function pintarComponentes(el, app, id) {
    const def = app.catalogo.get(id) || COMPONENTES[0];
    const nav = CATEGORIAS.map(([cid, nombre]) => {
        const items = COMPONENTES.filter(c => c.categoria === cid);
        return items.length ? `<h3>${esc(nombre)}</h3><ul>${items.map(c =>
            `<li><a href="#componentes/${c.id}" class="${c.id === def.id ? 'activo' : ''}">${app.tengo(c) ? ico('estrella', 'mia') : ''}${esc(c.corto)}</a></li>`).join('')}</ul>` : '';
    }).join('');

    const usados = new Set(def.pines.map(p => p.tipo));
    const filas = def.pines.map(p => `
<tr data-tipo="${p.tipo}"><td><b>${esc(p.n || p.id)}</b>${p.fisico ? ` <small>pin ${p.fisico}</small>` : ''}</td>
<td><span class="chip-pin t-${p.tipo}">${esc(TIPOS_PIN[p.tipo] || p.tipo)}</span></td>
<td>${esc(electrico(p))}</td><td>${(p.fn || []).map(f => `<code>${esc(f)}</code>`).join(' ')}</td>
<td>${p.reservado ? `<span class="marca error">Reservado</span> ` : ''}${p.strap ? `<span class="marca aviso">Arranque</span> ` : ''}${p.req ? `<span class="marca aviso">Obligatorio</span> ` : ''}${esc(p.nota || '')}</td></tr>`).join('');
    const usos = PROYECTOS.filter(p => (p.material || []).some(m => m.id === def.id));

    el.innerHTML = `
<nav class="indice" aria-label="Componentes">${nav}</nav>
<article class="ficha">
  <header class="ficha-cab">
    <div class="ficha-dibujo">${miniatura(def, { margen: 10 })}</div>
    <div class="ficha-intro">
      <p class="sobre">${esc(CATEGORIAS.find(c => c[0] === def.categoria)[1])} · ${esc(def.fabricante)}</p>
      <h2>${esc(def.nombre)}</h2>
      <p class="entradilla">${esc(def.resumen)}</p>
      <dl class="datos-clave">
        <div><dt>Huella</dt><dd>${mm(def.w)} × ${mm(def.h)} mm</dd></div>
        <div><dt>Conexiones</dt><dd>${def.pines.length}</dd></div>
        <div><dt>Precio orientativo</dt><dd>${def.precio ? eur(def.precio) : '—'}</dd></div>
      </dl>
      <div class="fila-botones">
        <button type="button" class="primario" data-anadir="${def.id}">${ico('mas')}Añadir a la mesa</button>
        <button type="button" data-tengo-alternar="${def.id}" aria-pressed="${app.tengo(def)}">${ico('estrella')}${app.tengo(def) ? 'En mi inventario' : 'Marcar como mío'}</button>
      </div>
    </div>
  </header>
  <section><h3>Descripción</h3><p>${esc(def.descripcion)}</p>${def.aviso ? `<p class="nota aviso">${ico('alerta')}<span>${esc(def.aviso)}</span></p>` : ''}</section>
  <section><h3>Especificaciones</h3><table class="tabla specs"><tbody>${def.specs.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table></section>
  <section><h3>Conexiones</h3>
    <div class="filtros" role="group" aria-label="Filtrar por tipo"><button type="button" class="activo" data-filtro-pin="">Todos <span>${def.pines.length}</span></button>${[...usados].map(t =>
        `<button type="button" data-filtro-pin="${t}">${esc(TIPOS_PIN[t] || t)} <span>${def.pines.filter(p => p.tipo === t).length}</span></button>`).join('')}</div>
    <div class="tabla-scroll"><table class="tabla pinout"><thead><tr><th>Pin</th><th>Tipo</th><th>Eléctrico</th><th>Funciones</th><th>Notas</th></tr></thead><tbody>${filas}</tbody></table></div>
  </section>
  ${def.enlaces.length ? `<section><h3>Documentación y repositorios</h3><div class="rejilla-enlaces">${def.enlaces.map(tarjetaEnlace).join('')}</div></section>` : ''}
  ${usos.length ? `<section><h3>Proyectos que lo usan</h3><ul class="lista-usos">${usos.map(p => `<li><a href="#proyectos/${p.id}">${ico('proyectos')}${esc(p.titulo)}</a></li>`).join('')}</ul></section>` : ''}
</article>`;
}

// ------------------------------------------------------------------ proyectos
function costeProyecto(p, app) {
    const faltan = (p.material || []).map(m => ({ def: app.catalogo.get(m.id), n: m.cantidad || 1 })).filter(m => m.def && !app.tengo(m.def));
    const piezas = faltan.reduce((s, m) => s + m.def.precio * m.n, 0);
    const extra = (p.extra || []).reduce((s, e) => s + e[1], 0);
    return { faltan, total: piezas + extra };
}

export function pintarProyectos(el, app, id) {
    const p = id && PROYECTOS.find(x => x.id === id);
    if (p) return pintarProyecto(el, app, p);
    const f = app.filtroProyectos;
    const texto = (f.texto || '').toLowerCase().trim();
    const lista = PROYECTOS.filter(x => (!f.ambito || x.ambito === f.ambito) && (!f.montaje || x.montaje) &&
        (!texto || (x.titulo + ' ' + x.resumen + ' ' + x.modelo + ' ' + x.ambito).toLowerCase().includes(texto)));
    el.innerHTML = `
<header class="cab-area"><div><h2>Proyectos</h2><p>${PROYECTOS.filter(x => x.montaje).length} montajes listos para abrir en la mesa y ${PROYECTOS.filter(x => !x.montaje).length} ideas híbridas ESP32-S3 + Coral con su material y los repositorios de partida.</p></div>
  <label class="buscador">${ico('buscar')}<input type="search" data-buscar-proyecto placeholder="Buscar proyecto, modelo o ámbito" value="${esc(f.texto || '')}"></label></header>
<div class="filtros" role="group" aria-label="Filtrar proyectos">
  <button type="button" data-filtro-montaje aria-pressed="${!!f.montaje}" class="${f.montaje ? 'activo' : ''}">${ico('mesa')}Con montaje</button>
  <button type="button" data-filtro-ambito="" class="${f.ambito ? '' : 'activo'}">Todos</button>
  ${AMBITOS.map(a => `<button type="button" data-filtro-ambito="${esc(a)}" class="${f.ambito === a ? 'activo' : ''}">${esc(a)}</button>`).join('')}
</div>
${lista.length ? `<div class="rejilla-proyectos">${lista.map(x => {
        const c = costeProyecto(x, app);
        return `<a class="tarjeta-proyecto" href="#proyectos/${x.id}">
  <p class="sobre">${esc(x.ambito)}${x.montaje ? `<span class="marca ok">${ico('mesa')}Montaje listo</span>` : ''}</p>
  <h3>${esc(x.titulo)}</h3><p>${esc(x.resumen)}</p>
  <dl class="pie"><div><dt>Nivel</dt><dd>${esc(x.nivel)}</dd></div><div><dt>Modelo</dt><dd>${esc(x.modelo)}</dd></div><div><dt>Por comprar</dt><dd>${c.total ? '≈ ' + eur(c.total) : 'Nada'}</dd></div></dl>
</a>`;
    }).join('')}</div>` : '<p class="vacio">Ningún proyecto coincide con el filtro.</p>'}`;
}

function pintarProyecto(el, app, p) {
    const c = costeProyecto(p, app);
    const material = (p.material || []).map(m => {
        const def = app.catalogo.get(m.id), n = m.cantidad || 1;
        return `<tr class="${app.tengo(def) ? 'propio' : ''}"><td><a href="#componentes/${def.id}">${esc(def.nombre)}</a></td><td class="num">${n}</td><td class="num">${eur(def.precio * n)}</td>` +
            `<td><input type="checkbox" data-tengo="${def.id}" ${app.tengo(def) ? 'checked' : ''} aria-label="Tengo ${esc(def.corto)}"></td></tr>`;
    }).join('') + (p.extra || []).map(([n, precio]) => `<tr><td>${esc(n)} <small>fuera de la biblioteca</small></td><td class="num">1</td><td class="num">${eur(precio)}</td><td></td></tr>`).join('');
    el.innerHTML = `
<article class="proyecto">
  <a class="volver" href="#proyectos">${ico('flecha', 'atras')}Todos los proyectos</a>
  <header class="proyecto-cab">
    <p class="sobre">${esc(p.ambito)} · ${esc(p.nivel)}${p.tiempo ? ' · ' + esc(p.tiempo) : ''}</p>
    <h2>${esc(p.titulo)}</h2><p class="entradilla">${esc(p.resumen)}</p>
    <div class="fila-botones">${p.montaje ? `<button type="button" class="primario" data-abrir-proyecto="${p.id}">${ico('mesa')}Abrir el montaje en la mesa</button>` : `<span class="marca">${ico('info')}Idea de proyecto: aún sin montaje cargable</span>`}</div>
  </header>
  ${p.aviso ? `<p class="nota aviso">${ico('alerta')}<span>${esc(p.aviso)}</span></p>` : ''}
  <div class="reparto">
    <section class="rol esp"><h3>${ico('chip')}ESP32-S3</h3><p>${esc(p.esp32)}</p></section>
    <section class="rol tpu"><h3>${ico('rayo')}Coral Edge TPU</h3><p>${esc(p.coral)}</p></section>
    <section class="rol"><h3>${ico('codigo')}Modelo</h3><p>${esc(p.modelo)}</p></section>
  </div>
  <div class="dos-col">
    <section><h3>Material</h3>
      <table class="tabla bom"><thead><tr><th>Componente</th><th class="num">Ud.</th><th class="num">Importe</th><th title="Lo tengo">${ico('estrella')}</th></tr></thead><tbody>${material}</tbody></table>
      <p class="total">Por comprar: <b>${c.total ? '≈ ' + eur(c.total) : 'nada, lo tienes todo'}</b></p>
    </section>
    <section>${p.pasos ? `<h3>Pasos</h3><ol class="pasos">${p.pasos.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
      ${p.aprendizaje ? `<h3>Qué se aprende</h3><ul class="aprendizaje">${p.aprendizaje.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
      ${!p.pasos ? `<h3>Por dónde empezar</h3><ol class="pasos"><li>Prueba el modelo en el host con el ejemplo del repositorio de Coral que corresponda.</li><li>Monta en la mesa el ESP32-S3 con sus periféricos y deja el diagnóstico sin errores.</li><li>Une ambos lados por el puerto serie USB o por MQTT.</li></ol>` : ''}
    </section>
  </div>
  <section><h3>Repositorios de partida</h3><div class="rejilla-enlaces">${p.repos.map(r => tarjetaEnlace({ ...r, tipo: 'repo' })).join('')}</div></section>
  ${p.docs && p.docs.length ? `<section><h3>Documentación</h3><div class="rejilla-enlaces">${p.docs.map(d => tarjetaEnlace({ ...d, tipo: 'doc' })).join('')}</div></section>` : ''}
</article>`;
}

// ------------------------------------------------------------------- recursos
export function pintarRecursos(el) {
    const ESTADO = { hecho: 'Disponible', siguiente: 'En desarrollo', previsto: 'Previsto' };
    el.innerHTML = `
<header class="cab-area"><div><h2>Recursos</h2><p>Repositorios, documentación oficial y herramientas de referencia, ordenados por tema.</p></div></header>
${RECURSOS.map(g => `<section class="grupo-recursos"><h3>${esc(g.titulo)} <span>${g.enlaces.length}</span></h3><div class="rejilla-enlaces">${g.enlaces.map(tarjetaEnlace).join('')}</div></section>`).join('')}
<section class="ruta"><h3>Hoja de ruta</h3><p class="tenue">Lab Studio crece por módulos. La mesa ya admite el lado de potencia (red de 230 V, protección, Shelly) con sus propias reglas; el siguiente paso grande son los cuadros eléctricos.</p>
<ol class="fases">${HOJA_DE_RUTA.map(f => `<li class="${f.estado}"><p class="sobre">${esc(f.fase)}<span class="marca ${f.estado === 'hecho' ? 'ok' : ''}">${ESTADO[f.estado]}</span></p><h4>${esc(f.titulo)}</h4><ul>${f.puntos.map(x => `<li>${esc(x)}</li>`).join('')}</ul></li>`).join('')}</ol></section>`;
}
