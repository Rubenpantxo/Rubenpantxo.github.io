// Configurador de alcance (zona 5 de #servicios).
//
// Tres piezas separadas:
//   - datos:  configurador-precios.json (precios, semanas, paquetes, casos)
//   - motor:  configurador-motor.mjs (funciones puras, probadas en Node)
//   - vista:  este archivo (DOM, eventos, almacenamiento)
//
// Se monta solo en <div id="sv-configurador"> si existe. No depende del resto
// de la sección: habla con las demás zonas por eventos en `document`.
//
// Escucha:
//   sv:perfil  { id | perfil, nombre?, origen? }            (zona 1, hero)
//   sv:caso    { id, categoria, negocio, bloques, origen }   (zona 2, catálogo)
// Emite (detail = resumen(), ver configurador-motor.mjs):
//   sv:configuracion                     en cada cambio (zona 6, briefing)
//   servicios:configuracion-actualizada  ídem, nombre del plan de trabajo
//   sv:configuracion-enviar              al pulsar «Enviar mi proyecto» (cancelable)
// Guarda:
//   sessionStorage 'sv:configuracion'  último resumen (JSON), para quien cargue después
//   localStorage  'sv:configurador'    la selección a medio hacer, para volver otro día
//   ?alcance=web.admin-seo             en la URL, para compartirla
// Lee directamente: window.ServiciosConfigurador.resumen()

import {
    estadoInicial, normalizar, elegirPerfil, alternarBloque, alternarUrgente, aplicarPaquete,
    calcular, resumen, serializar, deserializar, dependientesDe, incluidoEnPerfil,
    formatoRango, formatoEuros, formatoPlazo, formatoSemanas,
} from './configurador-motor.mjs';

const RAIZ = document.getElementById('sv-configurador');
const CLAVE_LOCAL = 'sv:configurador';
const CLAVE_SESION = 'sv:configuracion';
const PARAM = 'alcance';
const AVISO_MS = 45000;

const movimientoReducido = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function leer(almacen, clave) {
    try { return window[almacen].getItem(clave); } catch { return null; }
}
function escribir(almacen, clave, valor) {
    try { window[almacen].setItem(clave, valor); } catch { /* modo privado o bloqueado */ }
}
function evento(nombre, parametros) {
    try { if (window.rpEvento) window.rpEvento(nombre, parametros); } catch { /* analítica opcional */ }
}

// Escapa texto para meterlo en plantillas HTML. Todo lo que pintamos sale de
// nuestro propio JSON, pero así un cambio de precios nunca rompe el marcado.
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function iniciar(raiz) {
    cargarEstilos();
    const url = new URL('./configurador-precios.json', import.meta.url);
    const resp = await fetch(url, { cache: 'no-cache' });
    if (!resp.ok) throw new Error(`No se pudo leer ${url} (${resp.status})`);
    const datos = await resp.json();

    const admin = new URLSearchParams(location.search).has('admin');
    let estado = estadoDeArranque(datos);
    let tocado = false;       // el visitante ya ha cambiado algo
    let enviado = false;
    let temporizadorAviso = 0;
    let totalPintado = null;

    raiz.classList.add('cfg');
    raiz.setAttribute('aria-labelledby', 'cfg-titulo');
    raiz.innerHTML = plantilla(datos, admin);

    const $ = sel => raiz.querySelector(sel);
    const $$ = sel => Array.from(raiz.querySelectorAll(sel));

    /* ---------------------------------------------------- interacción */

    raiz.addEventListener('click', e => {
        const perfil = e.target.closest('[data-cfg-perfil]');
        const bloque = e.target.closest('[data-cfg-bloque]');
        const paquete = e.target.closest('[data-cfg-paquete]');
        if (perfil) cambiar(elegirPerfil(estado, perfil.dataset.cfgPerfil, datos), 'perfil');
        else if (bloque) cambiar(alternarBloque(estado, bloque.dataset.cfgBloque, datos), 'bloque');
        else if (paquete) {
            cambiar(aplicarPaquete(estado, paquete.dataset.cfgPaquete, datos), 'paquete');
            evento('configurador_paquete', { paquete: paquete.dataset.cfgPaquete });
        }
        else if (e.target.closest('[data-cfg-urgente]')) cambiar(alternarUrgente(estado, datos), 'urgente');
        else if (e.target.closest('#cfg-enviar')) enviar();
        else if (e.target.closest('#cfg-compartir')) compartir();
        else if (e.target.closest('#cfg-reiniciar')) cambiar(estadoInicial(datos), 'reiniciar');
        else if (e.target.closest('#cfg-detalle')) alternarDetalle();
    });

    // Flechas en el grupo de perfiles, como un grupo de radio nativo.
    $('.cfg-perfiles').addEventListener('keydown', e => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        const ids = datos.perfiles.map(p => p.id);
        let i = ids.indexOf(estado.perfil);
        if (e.key === 'Home') i = 0;
        else if (e.key === 'End') i = ids.length - 1;
        else i = (i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + ids.length) % ids.length;
        cambiar(elegirPerfil(estado, ids[i], datos), 'perfil');
        raiz.querySelector(`[data-cfg-perfil="${ids[i]}"]`).focus();
    });

    function cambiar(nuevo, origen, { silencioso = false } = {}) {
        estado = normalizar(nuevo, datos);
        if (!silencioso) {
            if (!tocado) evento('configurador_inicio', { origen });
            tocado = true;
            enviado = false;
            guardar();
            programarAviso();
        }
        pintar();
    }

    /* ---------------------------------------------------- contexto */

    // Perfil elegido en el hero. El aviso de arranque (origen 'inicio') no
    // pisa una configuración que el visitante ya traía guardada o en la URL.
    document.addEventListener('sv:perfil', e => {
        const d = e.detail || {};
        const id = d.perfil || d.id;
        if (!datos.perfiles.some(p => p.id === id) || id === estado.perfil) return;
        if (d.origen === 'inicio' && (tocado || estadoPropio)) return;
        cambiar(elegirPerfil(estado, id, datos), 'hero', { silencioso: true });
    });

    // Caso pulsado en el catálogo: preselecciona perfil y bloques. Si viene
    // del botón «Quiero algo así», además baja hasta aquí.
    document.addEventListener('sv:caso', e => {
        const d = e.detail || {};
        const sugerido = estadoDeCaso(d, datos);
        if (!sugerido) return;
        cambiar(sugerido, 'caso', { silencioso: true });
        if (d.origen === 'catalogo') {
            e.preventDefault();
            raiz.scrollIntoView({ behavior: movimientoReducido() ? 'auto' : 'smooth', block: 'start' });
            const foco = raiz.querySelector('.cfg-titulo');
            if (foco) foco.focus({ preventScroll: true });
        }
    });

    /* ---------------------------------------------------- pintar */

    function pintar() {
        const c = calcular(estado, datos);
        const r = resumen(estado, datos, { enlace: enlaceCompartir() });

        $$('[data-cfg-perfil]').forEach(b => {
            const activo = b.dataset.cfgPerfil === estado.perfil;
            b.setAttribute('aria-checked', String(activo));
            b.tabIndex = activo ? 0 : -1;
        });

        $$('[data-cfg-paquete]').forEach(b => b.setAttribute('aria-pressed', String(c.paquete && c.paquete.id === b.dataset.cfgPaquete)));

        const marcados = new Set(estado.bloques);
        for (const b of datos.bloques) {
            const tarjeta = raiz.querySelector(`[data-cfg-tarjeta="${b.id}"]`);
            const interruptor = tarjeta.querySelector('[data-cfg-bloque]');
            const incluido = incluidoEnPerfil(b, estado.perfil);
            const activo = marcados.has(b.id) || incluido;
            interruptor.setAttribute('aria-checked', String(activo));
            interruptor.disabled = incluido;
            tarjeta.classList.toggle('is-on', activo);
            tarjeta.classList.toggle('is-incluido', incluido);
            const nota = tarjeta.querySelector('.cfg-nota');
            const dependientes = dependientesDe(b.id, datos).filter(id => marcados.has(id));
            if (incluido) nota.textContent = `Ya va incluido en ${nombrePerfil(datos, estado.perfil)}.`;
            else if (dependientes.length) nota.textContent = `Lo necesita: ${dependientes.map(id => nombreBloque(datos, id)).join(', ')}.`;
            else if (b.requiere && b.requiere.length) nota.textContent = `Incluye ${b.requiere.map(id => nombreBloque(datos, id)).join(', ')}.`;
            else nota.textContent = '';
        }
        const urg = $('[data-cfg-urgente]');
        urg.setAttribute('aria-checked', String(estado.urgente));
        urg.closest('.cfg-bloque').classList.toggle('is-on', estado.urgente);

        pintarTicket(c);
        if (admin) $('#cfg-admin').textContent = [`estado: ${serializar(estado)}`, ...c.pasos].join('\n');

        // Contrato con la zona 6 (y con quien quiera escuchar).
        escribir('sessionStorage', CLAVE_SESION, JSON.stringify(r));
        document.dispatchEvent(new CustomEvent('sv:configuracion', { detail: r }));
        document.dispatchEvent(new CustomEvent('servicios:configuracion-actualizada', { detail: r }));
    }

    function pintarTicket(c) {
        const lineas = c.lineas.map(l => `
            <li><span>${esc(l.nombre)}${l.tipo === 'base' ? ' <small>base</small>' : ''}</span><b>${formatoRango(l.min, l.max)}</b></li>`);
        if (c.descuento) lineas.push(`<li class="cfg-linea-descuento"><span>Paquete ${esc(c.paquete.nombre)} (−${Math.round(c.descuento.tasa * 100)}\u00a0%)</span><b>−${formatoRango(c.descuento.min, c.descuento.max)}</b></li>`);
        if (c.recargo) lineas.push(`<li class="cfg-linea-recargo"><span>${esc(datos.urgente.nombre)} (+${Math.round(c.recargo.tasa * 100)}\u00a0%)</span><b>+${formatoRango(c.recargo.min, c.recargo.max)}</b></li>`);
        $('#cfg-lineas').innerHTML = lineas.join('');

        animarTotal(c.total);
        $('#cfg-plazo').textContent = formatoPlazo(c.plazo);
        $('#cfg-mini-plazo').textContent = formatoPlazo(c.plazo);

        const mensual = $('#cfg-mensual');
        mensual.hidden = !c.mensual;
        if (c.mensual) mensual.querySelector('b').textContent = `${formatoRango(c.mensual.min, c.mensual.max)}/mes`;

        const total = c.fases.reduce((s, f) => s + f.semanas, 0);
        $('#cfg-fases').innerHTML = c.fases.map(f => `
            <li style="--peso:${f.semanas / total}"><span class="cfg-fase-barra" aria-hidden="true"></span><span class="cfg-fase-nombre">${esc(f.nombre)}</span><span class="cfg-fase-sem" title="${esc(formatoSemanas(f.semanas))}">${esc(String(f.semanas).replace('.', ','))} sem</span></li>`).join('');

        $('#cfg-pagos').innerHTML = c.pagos.map(p => `<li><b>${p.porcentaje} %</b><span>${formatoRango(p.min, p.max)}</span></li>`).join('');

        $('#cfg-anuncio').textContent = `Total orientativo ${formatoRango(c.total.min, c.total.max)} sin IVA, ${formatoPlazo(c.plazo)}.`;
    }

    // El total rueda unos 400 ms hasta su valor nuevo; sin animación si el
    // visitante pide menos movimiento.
    function animarTotal(total) {
        const salida = [$('#cfg-total'), $('#cfg-mini-total')];
        const desde = totalPintado;
        totalPintado = total;
        const poner = (min, max) => salida.forEach(el => { el.textContent = formatoRango(min, max); });
        if (!desde || movimientoReducido()) { poner(total.min, total.max); return; }
        const t0 = performance.now();
        const dur = 400;
        const paso = ahora => {
            if (totalPintado !== total) return; // llegó otro cambio
            const k = Math.min(1, (ahora - t0) / dur);
            const e = 1 - Math.pow(1 - k, 3);
            const r50 = n => Math.round(n / 50) * 50;
            poner(r50(desde.min + (total.min - desde.min) * e), r50(desde.max + (total.max - desde.max) * e));
            if (k < 1) requestAnimationFrame(paso);
            else poner(total.min, total.max);
        };
        requestAnimationFrame(paso);
        const caja = $('.cfg-total');
        caja.classList.remove('is-cambio');
        void caja.offsetWidth;
        caja.classList.add('is-cambio');
    }

    function alternarDetalle() {
        const boton = $('#cfg-detalle');
        const abierto = boton.getAttribute('aria-expanded') !== 'true';
        boton.setAttribute('aria-expanded', String(abierto));
        $('.cfg-ticket').classList.toggle('is-abierto', abierto);
        boton.querySelector('.cfg-detalle-txt').textContent = abierto ? 'Ocultar' : 'Ver detalle';
    }

    /* ---------------------------------------------------- guardar y compartir */

    function enlaceCompartir() {
        const u = new URL(location.href);
        u.searchParams.delete('admin');
        u.searchParams.set(PARAM, serializar(estado));
        u.hash = 'servicios';
        return u.toString();
    }

    function guardar() {
        escribir('localStorage', CLAVE_LOCAL, serializar(estado));
        try {
            const u = new URL(location.href);
            u.searchParams.set(PARAM, serializar(estado));
            history.replaceState(history.state, '', u);
        } catch { /* file:// u otros contextos raros */ }
    }

    async function compartir() {
        const enlace = enlaceCompartir();
        const boton = $('#cfg-compartir');
        const texto = boton.querySelector('span');
        const original = texto.textContent;
        evento('configurador_compartir', { paquete: (calcular(estado, datos).paquete || {}).id || 'ninguno' });
        try {
            if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
                await navigator.share({ title: 'Mi proyecto', text: 'Esta es la configuración que he preparado:', url: enlace });
                return;
            }
            await navigator.clipboard.writeText(enlace);
            texto.textContent = '¡Enlace copiado!';
        } catch (err) {
            if (err && err.name === 'AbortError') return;
            window.prompt('Copia este enlace:', enlace);
        }
        setTimeout(() => { texto.textContent = original; }, 2200);
    }

    // Abandono: si el visitante se para sin enviar, un aviso suave en el
    // ticket. Solo una vez por visita.
    let avisado = false;
    function programarAviso() {
        clearTimeout(temporizadorAviso);
        if (avisado) return;
        temporizadorAviso = setTimeout(() => {
            if (enviado || avisado) return;
            avisado = true;
            $('#cfg-aviso').hidden = false;
            evento('configurador_aviso', {});
        }, AVISO_MS);
    }

    function enviar() {
        enviado = true;
        clearTimeout(temporizadorAviso);
        $('#cfg-aviso').hidden = true;
        const r = resumen(estado, datos, { enlace: enlaceCompartir() });
        escribir('sessionStorage', CLAVE_SESION, JSON.stringify(r));
        evento('configurador_enviar', { perfil: r.perfil.id, paquete: r.paquete || 'ninguno', bloques: r.bloques.length });
        const ev = new CustomEvent('sv:configuracion-enviar', { detail: r, cancelable: true });
        const nadieLoGestiona = document.dispatchEvent(ev);
        if (nadieLoGestiona) respaldoContacto(r);
    }

    pintar();
    window.ServiciosConfigurador = Object.freeze({
        resumen: () => resumen(estado, datos, { enlace: enlaceCompartir() }),
        estado: () => ({ ...estado, bloques: [...estado.bloques] }),
    });
}

/* ------------------------------------------------------------ arranque */

let estadoPropio = false; // venía de la URL o de una visita anterior

function estadoDeArranque(datos) {
    const desdeUrl = deserializar(new URLSearchParams(location.search).get(PARAM), datos);
    if (desdeUrl) { estadoPropio = true; return desdeUrl; }
    const guardado = deserializar(leer('localStorage', CLAVE_LOCAL), datos);
    if (guardado) { estadoPropio = true; return guardado; }

    // Pistas de las zonas 1 y 2 que se emitieron antes de que cargáramos.
    let caso = null;
    try { caso = JSON.parse(leer('sessionStorage', 'sv:caso') || 'null'); } catch { caso = null; }
    const deCaso = caso && estadoDeCaso(caso, datos);
    if (deCaso) return deCaso;
    const perfil = leer('sessionStorage', 'sv:perfil');
    if (perfil && datos.perfiles.some(p => p.id === perfil)) return normalizar({ perfil, bloques: [] }, datos);
    const conPerfil = document.querySelector('#servicios[data-perfil]');
    if (conPerfil) return normalizar({ perfil: conPerfil.dataset.perfil, bloques: [] }, datos);
    return estadoInicial(datos);
}

const CATEGORIA_A_PERFIL = { web: 'web', '3d': '3d', herramientas: 'automatizacion', automatizacion: 'automatizacion' };

function estadoDeCaso(d, datos) {
    if (!d || typeof d !== 'object') return null;
    const caso = d.negocio && datos.casos[d.negocio];
    const perfil = (caso && caso.perfil) || CATEGORIA_A_PERFIL[d.categoria] || null;
    const bloques = Array.isArray(d.bloques) && d.bloques.length ? d.bloques : (caso ? caso.bloques : []);
    if (!perfil && !bloques.length) return null;
    return normalizar({ perfil: perfil || datos.perfiles[0].id, bloques, urgente: false }, datos);
}

// Si la zona 6 no gestiona el envío, bajamos al formulario de contacto de
// siempre y dejamos el resumen escrito en el mensaje (sin pisar lo que el
// visitante ya hubiera escrito).
function respaldoContacto(r) {
    const contacto = document.getElementById('sv-contact');
    if (!contacto) { location.hash = 'contacto'; return; }
    const mensaje = document.getElementById('sv-mensaje');
    if (mensaje) {
        const previo = mensaje.value.trim();
        const anterior = mensaje.dataset.cfgTexto;
        if (!previo || previo === anterior) mensaje.value = r.texto;
        else if (!previo.includes(r.texto)) mensaje.value = `${previo}\n\n${r.texto}`;
        mensaje.dataset.cfgTexto = r.texto;
        mensaje.dispatchEvent(new Event('input', { bubbles: true }));
    }
    contacto.scrollIntoView({ behavior: movimientoReducido() ? 'auto' : 'smooth', block: 'start' });
    const nombre = document.getElementById('sv-nombre');
    if (nombre) setTimeout(() => nombre.focus({ preventScroll: true }), movimientoReducido() ? 0 : 500);
}

function cargarEstilos() {
    if (document.querySelector('link[data-cfg-estilos]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./configurador.css', import.meta.url).href;
    link.dataset.cfgEstilos = '';
    document.head.appendChild(link);
}

const nombreBloque = (datos, id) => (datos.bloques.find(b => b.id === id) || {}).nombre || id;
const nombrePerfil = (datos, id) => (datos.perfiles.find(p => p.id === id) || {}).nombre || id;

/* ------------------------------------------------------------ plantilla */

function plantilla(datos, admin) {
    const perfiles = datos.perfiles.map(p => `
        <button type="button" class="cfg-perfil" role="radio" aria-checked="false" data-cfg-perfil="${esc(p.id)}" aria-describedby="cfg-perfil-${esc(p.id)}-desc">
            <span class="cfg-icono" aria-hidden="true">${esc(p.icono)}</span>
            <span class="cfg-perfil-nombre">${esc(p.nombre)}</span>
            <span class="cfg-perfil-desc" id="cfg-perfil-${esc(p.id)}-desc">${esc(p.resuelve)}</span>
            <span class="cfg-perfil-meta">desde ${formatoEuros(p.min)} · ${esc(formatoSemanas(p.semanas))}</span>
        </button>`).join('');

    const paquetes = datos.paquetes.map(p => `
        <button type="button" class="cfg-paquete${p.destacado ? ' is-destacado' : ''}" aria-pressed="false" data-cfg-paquete="${esc(p.id)}">
            ${p.destacado ? '<span class="cfg-sello">Lo más elegido</span>' : ''}
            <span class="cfg-paquete-nombre">${esc(p.nombre)}</span>
            <span class="cfg-paquete-lema">${esc(p.lema)}</span>
            <span class="cfg-paquete-lista">${p.bloques.map(id => esc(nombreBloque(datos, id))).join(' · ')}</span>
            ${p.descuento ? `<span class="cfg-paquete-dto">−${Math.round(p.descuento * 100)} % en el proyecto</span>` : ''}
        </button>`).join('');

    const tarjeta = b => `
        <li class="cfg-bloque" data-cfg-tarjeta="${esc(b.id)}">
            <div class="cfg-bloque-cab">
                <span class="cfg-icono" aria-hidden="true">${esc(b.icono)}</span>
                <h5 class="cfg-bloque-nombre" id="cfg-b-${esc(b.id)}">${esc(b.nombre)}</h5>
                ${b.popular ? '<span class="cfg-sello cfg-sello--mini">Lo más elegido</span>' : ''}
                <button type="button" class="cfg-switch" role="switch" aria-checked="false" data-cfg-bloque="${esc(b.id)}" aria-labelledby="cfg-b-${esc(b.id)}" aria-describedby="cfg-b-${esc(b.id)}-res"><span aria-hidden="true"></span></button>
            </div>
            <p class="cfg-bloque-res" id="cfg-b-${esc(b.id)}-res">${esc(b.resuelve)}</p>
            <p class="cfg-bloque-meta"><b>+${formatoRango(b.min, b.max)}${b.mensual ? '/mes' : ''}</b>${b.semanas ? ` · +${esc(formatoSemanas(b.semanas))}` : ''}</p>
            <details class="cfg-incluye">
                <summary>Ver qué incluye</summary>
                <ul>${b.incluye.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
            </details>
            <p class="cfg-nota" aria-live="polite"></p>
        </li>`;

    const u = datos.urgente;
    const urgente = `
        <li class="cfg-bloque cfg-bloque--urgente">
            <div class="cfg-bloque-cab">
                <span class="cfg-icono" aria-hidden="true">${esc(u.icono)}</span>
                <h5 class="cfg-bloque-nombre" id="cfg-b-urgente">${esc(u.nombre)}</h5>
                <button type="button" class="cfg-switch" role="switch" aria-checked="false" data-cfg-urgente aria-labelledby="cfg-b-urgente" aria-describedby="cfg-b-urgente-res"><span aria-hidden="true"></span></button>
            </div>
            <p class="cfg-bloque-res" id="cfg-b-urgente-res">${esc(u.resuelve)}</p>
            <p class="cfg-bloque-meta"><b>+${Math.round(u.recargo * 100)} % del total</b> · ${Math.round(u.reduccionSemanas * 100)} % menos de plazo</p>
        </li>`;

    return `
    <header class="cfg-cab">
        <p class="cfg-eyebrow">Configurador de alcance</p>
        <h3 class="cfg-titulo" id="cfg-titulo" tabindex="-1">¿Cuánto costaría <em>tu proyecto?</em></h3>
        <p class="cfg-lead">Marca lo que necesitas y mira al momento el plazo y la inversión orientativa. Sin registrarte y sin compromiso.</p>
    </header>
    <div class="cfg-cuerpo">
        <div class="cfg-opciones">
            <section class="cfg-paso" aria-labelledby="cfg-paso1">
                <h4 class="cfg-paso-tit" id="cfg-paso1"><span aria-hidden="true">1</span> Punto de partida</h4>
                <div class="cfg-perfiles" role="radiogroup" aria-labelledby="cfg-paso1">${perfiles}</div>
            </section>
            <section class="cfg-paso" aria-labelledby="cfg-paso2">
                <h4 class="cfg-paso-tit" id="cfg-paso2"><span aria-hidden="true">2</span> Elige un paquete…</h4>
                <div class="cfg-paquetes">${paquetes}</div>
            </section>
            <section class="cfg-paso" aria-labelledby="cfg-paso3">
                <h4 class="cfg-paso-tit" id="cfg-paso3"><span aria-hidden="true">3</span> …o ajústalo bloque a bloque</h4>
                <ul class="cfg-bloques">${datos.bloques.map(tarjeta).join('')}${urgente}</ul>
            </section>
        </div>
        <aside class="cfg-ticket" aria-labelledby="cfg-ticket-tit">
            <button type="button" class="cfg-mini" id="cfg-detalle" aria-expanded="false" aria-controls="cfg-ticket-cuerpo">
                <span class="cfg-mini-txt"><small>Total orientativo</small><b id="cfg-mini-total">—</b><small id="cfg-mini-plazo"></small></span>
                <span class="cfg-detalle-txt">Ver detalle</span>
            </button>
            <div class="cfg-ticket-cuerpo" id="cfg-ticket-cuerpo">
                <h4 class="cfg-ticket-tit" id="cfg-ticket-tit">Tu proyecto</h4>
                <ul class="cfg-lineas" id="cfg-lineas"></ul>
                <div class="cfg-total">
                    <span>Inversión orientativa</span>
                    <b id="cfg-total">—</b>
                    <small>sin IVA</small>
                </div>
                <p class="cfg-mensual" id="cfg-mensual" hidden><span>Mantenimiento</span><b></b></p>
                <div class="cfg-plazo-caja">
                    <p class="cfg-plazo-tit"><span>Plazo estimado</span><b id="cfg-plazo"></b></p>
                    <ol class="cfg-fases" id="cfg-fases" aria-label="Fases del proyecto"></ol>
                </div>
                <div class="cfg-pagos-caja">
                    <p class="cfg-pagos-tit">Pago por fases</p>
                    <ol class="cfg-pagos" id="cfg-pagos"></ol>
                </div>
                <p class="cfg-letra">Orientativo. El presupuesto final se cierra tras el briefing.</p>
                <button type="button" class="cfg-cta" id="cfg-enviar">Enviar mi proyecto <span aria-hidden="true">→</span></button>
                <div class="cfg-acciones">
                    <button type="button" class="cfg-sec" id="cfg-compartir"><span>Copiar enlace para compartir</span></button>
                    <button type="button" class="cfg-sec" id="cfg-reiniciar">Empezar de cero</button>
                </div>
                <p class="cfg-aviso" id="cfg-aviso" hidden>¿Te ayudo a cerrarlo? Envíamelo tal cual y lo afinamos juntos en una llamada corta.</p>
                ${admin ? '<pre class="cfg-admin" id="cfg-admin" aria-label="Detalle interno del cálculo"></pre>' : ''}
            </div>
            <p class="cfg-sr" id="cfg-anuncio" aria-live="polite" aria-atomic="true"></p>
        </aside>
    </div>`;
}

if (RAIZ) iniciar(RAIZ).catch(err => {
    console.error('[configurador]', err);
    RAIZ.hidden = true;
});
