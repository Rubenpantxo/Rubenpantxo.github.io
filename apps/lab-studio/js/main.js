// Lab Studio — arranque y coordinación.
//
// Flujo de datos: toda modificación del documento pasa por `cambio()`, que la
// registra en el historial, vuelve a analizar el montaje (redes + reglas) y
// repinta la mesa y los paneles. El documento se guarda solo en este
// navegador; «Guardar» descarga un archivo .labstudio.json.

import { CATALOGO } from './datos/componentes.js';
import { PROYECTOS, ejemploDe } from './datos/proyectos.js';
import { nuevoDoc, validarDoc, docDesdePlantilla, plegarPlantilla, buscarParte, U, FORMATO } from './core/modelo.js';
import { Historial } from './core/historial.js';
import { analizar } from './core/erc.js';
import { materialesCsv, listaRedesTexto, cabeceraPines, platformioDe, archivosEjemplo } from './core/exportar.js';
import { Lienzo } from './ui/lienzo.js';
import { DEFS } from './ui/dibujos.js';
import { pintarBiblioteca, pintarPropiedades, pintarReglas, pintarRedes, pintarMateriales, pintarCodigo } from './ui/paneles.js';
import { pintarComponentes, pintarProyectos, pintarRecursos } from './ui/vistas.js';
import { pintarCalculadoras } from './ui/calculadoras.js';
import { cerrarVisor } from './ui/vista3d.js';
import { esc, ico, hojaIconos, descargar, copiar, nombreArchivo, almacen, mm } from './ui/util.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const AREAS = ['montaje', 'componentes', 'proyectos', 'calculadoras', 'recursos'];
const PESTANAS = { propiedades: pintarPropiedades, reglas: pintarReglas, redes: pintarRedes, materiales: pintarMateriales, codigo: pintarCodigo };

const app = {
    catalogo: CATALOGO,
    doc: nuevoDoc(),
    analisis: null,
    lienzo: null,
    historial: new Historial(),
    inventario: almacen.leer('inventario', {}) || {},
    prefs: { rejilla: true, rotulos: true, esquema: false, tema: 'oscuro', pestana: 'propiedades', ...(almacen.leer('prefs', {}) || {}) },
    filtro: { texto: '', propios: false },
    filtroProyectos: { texto: '', ambito: '', montaje: false },
    area: 'montaje',
    tengo(def) { return this.inventario[def.id] ?? !!def.propio; }
};

// ------------------------------------------------------------------ avisos
let temporizadorAviso = 0;
function avisar(texto, nivel = 'info') {
    const caja = $('#avisos');
    const el = document.createElement('div');
    el.className = 'aviso-flotante ' + nivel;
    el.setAttribute('role', nivel === 'error' ? 'alert' : 'status');
    el.innerHTML = ico(nivel === 'error' ? 'error' : nivel === 'aviso' ? 'alerta' : nivel === 'ok' ? 'ok' : 'info') + `<span>${esc(texto)}</span>`;
    caja.replaceChildren(el);
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => el.remove(), nivel === 'error' ? 7000 : 3800);
}

function confirmar(titulo, texto, si = 'Continuar') {
    const d = $('#dialogo');
    d.innerHTML = `<form method="dialog"><h2>${esc(titulo)}</h2><p>${esc(texto)}</p><div class="fila-botones"><button value="no" autofocus>Cancelar</button><button value="si" class="primario">${esc(si)}</button></div></form>`;
    d.showModal();
    return new Promise(res => d.addEventListener('close', () => res(d.returnValue === 'si'), { once: true }));
}

// --------------------------------------------------------------- documento
let temporizadorGuardado = 0;
function guardarAuto() {
    clearTimeout(temporizadorGuardado);
    temporizadorGuardado = setTimeout(() => {
        const ok = almacen.guardar('doc', app.doc);
        $('#estado-guardado').textContent = ok ? 'Guardado en este navegador' : 'Sin almacenamiento: descarga el archivo';
    }, 350);
}

function pintarLateral() {
    const p = app.prefs.pestana in PESTANAS ? app.prefs.pestana : 'propiedades';
    for (const b of $$('[data-pestana]')) b.setAttribute('aria-selected', String(b.dataset.pestana === p));
    PESTANAS[p]($('#panel-derecho'), app);
}

function pintarBarra() {
    const h = app.historial, l = app.lienzo, c = app.analisis.cuenta;
    $('[data-accion="deshacer"]').disabled = !h.puedeDeshacer;
    $('[data-accion="rehacer"]').disabled = !h.puedeRehacer;
    for (const a of ['girar', 'duplicar']) $(`[data-accion="${a}"]`).disabled = !l.sel.partes.size;
    $('[data-accion="borrar"]').disabled = !l.haySeleccion();
    $('#nombre-doc').value = app.doc.nombre;
    document.title = `${app.doc.nombre} · Lab Studio`;
    $('#cuenta-doc').textContent = `${app.doc.partes.length} piezas · ${app.doc.cables.length} cables · ${app.analisis.redes.length} redes`;
    const chip = $('#chip-reglas');
    chip.className = 'chip-reglas ' + (c.error ? 'error' : c.aviso ? 'aviso' : 'ok');
    const texto = c.error ? `${c.error} error${c.error > 1 ? 'es' : ''}${c.aviso ? ` · ${c.aviso} aviso${c.aviso > 1 ? 's' : ''}` : ''}`
        : c.aviso ? `${c.aviso} aviso${c.aviso > 1 ? 's' : ''}` : 'Sin errores';
    // En pantallas estrechas solo se ven el icono y la cifra (CSS).
    chip.innerHTML = ico(c.error ? 'error' : c.aviso ? 'alerta' : 'ok') + (c.error || c.aviso ? `<span class="chip-num">${c.error || c.aviso}</span>` : '') + `<span class="chip-txt">${texto}</span>`;
    chip.setAttribute('aria-label', 'Diagnóstico eléctrico: ' + texto);
    $('#mesa-vacia').hidden = app.doc.partes.length > 0;
}

function refrescar({ conservarSeleccion = true } = {}) {
    app.analisis = analizar(app.doc, app.catalogo);
    app.lienzo.fijar(app.doc, app.analisis, { conservarSeleccion });
    pintarLateral();
    pintarBarra();
}

function cambio() {
    app.lienzo.resaltados.clear();
    app.historial.confirmar(app.doc);
    refrescar();
    guardarAuto();
}

function cargar(doc, { encuadrar = true } = {}) {
    app.doc = doc;
    app.historial.reiniciar(doc);
    refrescar({ conservarSeleccion: false });
    guardarAuto();
    app.encuadrado = false;
    if (encuadrar) encuadrarSiVisible();
}

// La mesa solo se puede encuadrar cuando su área está a la vista.
function encuadrarSiVisible() {
    if (app.area !== 'montaje' || app.encuadrado) return;
    app.encuadrado = true;
    requestAnimationFrame(encuadrarAuto);
}

// Encuadre automático: se recuerda la vista que deja para saber después si
// el usuario la ha movido.
function encuadrarAuto() {
    app.lienzo.encuadrar();
    app.vistaAuto = { ...app.lienzo.vista };
}

function restaurar(doc) {
    if (!doc) return;
    app.doc = doc;
    refrescar();
    guardarAuto();
}

async function reemplazar(crear, motivo) {
    if (app.doc.partes.length && !(await confirmar(motivo, 'El montaje actual se sustituye. Si no lo has descargado, guárdalo antes.', 'Sustituir'))) return false;
    try { cargar(crear()); return true; }
    catch (e) { avisar(e.message || 'No se pudo abrir.', 'error'); return false; }
}

// Montaje de un proyecto adaptado a la pantalla: en un móvil en vertical los
// montajes apaisados se pliegan en bandas para no quedar diminutos.
function docDeProyecto(p) {
    const estrecho = window.innerWidth <= 900;
    const plantilla = estrecho ? plegarPlantilla(p.montaje, app.catalogo, window.innerWidth - (window.innerWidth < 520 ? 40 : 120), window.innerHeight - 170) : p.montaje;
    return docDesdePlantilla(plantilla, app.catalogo, p.titulo);
}

function abrirProyecto(id) {
    const p = PROYECTOS.find(x => x.id === id);
    if (!p || !p.montaje) return;
    reemplazar(() => docDeProyecto(p), 'Abrir el montaje del proyecto').then(ok => {
        if (ok) { location.hash = '#montaje'; avisar('Montaje cargado: revisa el diagnóstico y el mapa de pines.', 'ok'); }
    });
}

// ----------------------------------------------------------------- archivo
function guardarArchivo() {
    descargar(nombreArchivo(app.doc.nombre) + '.labstudio.json', JSON.stringify(app.doc, null, 2), 'application/json');
    avisar('Archivo descargado.', 'ok');
}

function abrirArchivo() {
    const input = $('#archivo');
    input.value = '';
    input.onchange = async () => {
        const f = input.files[0];
        if (!f) return;
        if (f.size > 2e6) { avisar('El archivo es demasiado grande para ser un montaje.', 'error'); return; }
        let datos;
        try { datos = JSON.parse(await f.text()); }
        catch { avisar('El archivo no es un JSON válido.', 'error'); return; }
        try {
            const { doc, avisos } = validarDoc(datos, app.catalogo);
            if (await reemplazar(() => doc, 'Abrir archivo')) avisar(avisos.length ? avisos.join(' ') : 'Montaje abierto.', avisos.length ? 'aviso' : 'ok');
        } catch (e) { avisar(e.message, 'error'); }
    };
    input.click();
}

function exportarPng() {
    const { svg, ancho, alto } = app.lienzo.exportarSvg();
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => {
        const escala = Math.min(3, 6000 / Math.max(ancho, alto));
        const c = document.createElement('canvas');
        c.width = Math.round(ancho * escala); c.height = Math.round(alto * escala);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => b ? descargar(nombreArchivo(app.doc.nombre) + '.png', b) : avisar('No se pudo generar la imagen.', 'error'), 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); avisar('No se pudo generar la imagen.', 'error'); };
    img.src = url;
}

function exportar(que) {
    const base = nombreArchivo(app.doc.nombre);
    if (!/^(pio|ejm)-/.test(que) && !app.doc.partes.length) { avisar('La mesa está vacía.', 'aviso'); return; }
    switch (que) {
        case 'svg': descargar(base + '.svg', app.lienzo.exportarSvg().svg, 'image/svg+xml'); break;
        case 'png': exportarPng(); break;
        case 'materiales': descargar(base + '-materiales.csv', materialesCsv(app.doc, app.catalogo, app.inventario), 'text/csv;charset=utf-8'); break;
        case 'redes': descargar(base + '-redes.txt', listaRedesTexto(app.doc, app.analisis)); break;
        case 'pines': descargar('pines.h', cabeceraPines(app.doc, app.catalogo, app.analisis)); break;
    }
    const ej = ejemploDe(app.doc);
    if (que.startsWith('pio-')) { const x = platformioDe(app.doc, ej ? ej.libs : [])[+que.slice(4)]; if (x) descargar('platformio.ini', x.ini); }
    if (que.startsWith('ejm-') && ej) { const a = ej.archivos[+que.slice(4)]; if (a) descargar(a[0].split('/').pop(), a[1]); }
}

function descargarEjemplo(ref) {
    const [id, i] = ref.split(':');
    const p = PROYECTOS.find(x => x.id === id);
    const a = p && archivosEjemplo(p, app.catalogo)[+i];
    if (a) descargar(a.nombre.split('/').pop(), a.texto);
}

// ---------------------------------------------------------------- acciones
const ACCIONES = {
    nuevo: () => reemplazar(() => nuevoDoc(), 'Montaje nuevo'),
    abrir: abrirArchivo,
    guardar: guardarArchivo,
    deshacer: () => restaurar(app.historial.deshacer()),
    rehacer: () => restaurar(app.historial.rehacer()),
    sel: () => fijarHerramienta('sel'),
    mano: () => fijarHerramienta('mano'),
    girar: () => app.lienzo.rotarSeleccion(1),
    duplicar: () => app.lienzo.duplicarSeleccion(),
    borrar: () => app.lienzo.borrarSeleccion(),
    cancelar: () => { app.lienzo.cancelar(); pista(); },
    acercar: () => app.lienzo.zoom(1.25),
    alejar: () => app.lienzo.zoom(0.8),
    encuadrar: () => app.lienzo.encuadrar(),
    rejilla: () => preferencia('rejilla'),
    rotulos: () => preferencia('rotulos'),
    esquema: () => preferencia('esquema'),
    tema: () => { app.prefs.tema = app.prefs.tema === 'oscuro' ? 'claro' : 'oscuro'; aplicarPrefs(); },
    reglas: () => { app.prefs.pestana = 'reglas'; aplicarPrefs(); pintarLateral(); abrirPanel('der'); },
    biblioteca: () => abrirPanel('izq'),
    inspector: () => abrirPanel('der')
};

function fijarHerramienta(h) {
    app.lienzo.fijarHerramienta(h);
    for (const b of $$('[data-accion="sel"],[data-accion="mano"]')) b.setAttribute('aria-pressed', String(b.dataset.accion === h));
}

function preferencia(k) { app.prefs[k] = !app.prefs[k]; aplicarPrefs(); }

function aplicarPrefs() {
    const p = app.prefs, svg = $('#lienzo');
    document.documentElement.dataset.tema = p.tema;
    svg.classList.toggle('sin-rejilla', !p.rejilla);
    svg.classList.toggle('sin-rotulos', !p.rotulos);
    svg.classList.toggle('esquema', !!p.esquema);
    for (const k of ['rejilla', 'rotulos', 'esquema']) $(`[data-accion="${k}"]`).setAttribute('aria-pressed', String(!!p[k]));
    almacen.guardar('prefs', p);
}

function abrirPanel(lado) {
    const t = $('.taller');
    const clase = 'ver-' + lado;
    const estaba = t.classList.contains(clase);
    t.classList.remove('ver-izq', 'ver-der');
    if (!estaba) t.classList.add(clase);
}

function fijarInventario(id, valor) {
    app.inventario[id] = valor;
    almacen.guardar('inventario', app.inventario);
    pintarBiblioteca($('#biblioteca'), app);
    if (app.area === 'montaje') pintarLateral(); else pintarArea();
}

// ------------------------------------------------------------------- áreas
function pintarArea() {
    const [area, id] = location.hash.replace(/^#/, '').split('/');
    app.area = AREAS.includes(area) ? area : 'montaje';
    for (const a of AREAS) $('#area-' + a).hidden = a !== app.area;
    for (const b of $$('[data-area]')) b.setAttribute('aria-current', b.dataset.area === app.area ? 'page' : 'false');
    const el = $('#area-' + app.area);
    if (app.area !== 'componentes') cerrarVisor();
    if (app.area === 'componentes') pintarComponentes(el, app, id);
    else if (app.area === 'proyectos') pintarProyectos(el, app, id);
    else if (app.area === 'calculadoras') { if (!el.dataset.listo) { pintarCalculadoras(el); el.dataset.listo = '1'; } }
    else if (app.area === 'recursos') { if (!el.dataset.listo) { pintarRecursos(el); el.dataset.listo = '1'; } }
    if (app.area !== 'montaje') { el.scrollTop = 0; app.lienzo.cancelar(); }
    else encuadrarSiVisible();
}

// ------------------------------------------------------------------ globo
function pintarEstado(e) {
    if (e.zoom != null) $('#estado-zoom').textContent = Math.round(e.zoom * 100) + ' %';
    if (e.x != null) $('#estado-pos').textContent = `X ${mm(e.x / U)}  Y ${mm(e.y / U)} mm`;
    if ('pin' in e) {
        const g = $('#globo');
        if (!e.pin) { g.hidden = true; return; }
        const { parte, def, pin, red, tipo, cx, cy } = e.pin;
        const datos = [];
        if (pin.v) datos.push((pin.tipo === 'fuente' ? 'entrega ' : 'nivel ') + String(pin.v).replace('.', ',') + ' V');
        if (pin.vmax) datos.push('máx. ' + String(pin.vmax).replace('.', ',') + ' V');
        if (pin.imax) datos.push('hasta ' + pin.imax + ' mA');
        if (pin.i) datos.push(pin.i + ' mA');
        g.innerHTML = `<b>${esc(parte.ref)}.${esc(pin.red || pin.n || pin.id)}</b> <span>${esc(def.corto)}</span>` +
            `<small>${esc(tipo)}${datos.length ? ' · ' + esc(datos.join(' · ')) : ''}</small>` +
            (pin.fn && pin.fn.length ? `<small>${pin.fn.map(esc).join(' · ')}</small>` : '') +
            (pin.reservado ? `<small class="error">Reservado: no usar</small>` : pin.nota ? `<small>${esc(pin.nota)}</small>` : '') +
            `<small class="red">${red ? 'Red ' + esc(red.nombre) : 'Sin conectar'}</small>`;
        g.hidden = false;
        const r = $('.mesa').getBoundingClientRect();
        const x = Math.min(cx - r.left + 14, r.width - g.offsetWidth - 8), y = cy - r.top + 16;
        g.style.left = Math.max(8, x) + 'px';
        g.style.top = (y + g.offsetHeight > r.height - 8 ? cy - r.top - g.offsetHeight - 12 : y) + 'px';
    }
}

function pista() {
    const l = app.lienzo;
    $('#cancelar-modo').hidden = !(l.colocando || l.cableando);
    $('#estado-pista').textContent = l.colocando ? `Pulsa en la mesa para colocar ${l.colocando.corto}`
        : l.cableando ? 'Pulsa el pin de destino para tender el cable'
            : matchMedia('(pointer: coarse)').matches ? 'Toca un pin para cablear · arrastra para mover · pellizca para ampliar'
                : 'Clic en un pin para cablear · R gira · Supr quita · F encuadra';
}

// ---------------------------------------------------------------- arranque
function iniciar() {
    document.body.insertAdjacentHTML('afterbegin', hojaIconos() + `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${DEFS}</defs></svg>`);
    for (const n of $$('[data-ico]')) n.insertAdjacentHTML('afterbegin', ico(n.dataset.ico));

    app.lienzo = new Lienzo($('#lienzo'), {
        catalogo: app.catalogo,
        alCambiar: () => { cambio(); pista(); },
        alSeleccionar: info => {
            if (info && info.problemaDe) app.prefs.pestana = 'reglas';
            else if (app.lienzo.haySeleccion() && !app.silencio) app.prefs.pestana = 'propiedades';
            pintarLateral(); pintarBarra(); pista();
        },
        alEstado: pintarEstado,
        alAbrirFicha: id => { location.hash = '#componentes/' + id; },
        avisar
    });
    const pintarOriginal = app.lienzo.pintar.bind(app.lienzo);
    app.lienzo.pintar = () => { pintarOriginal(); pista(); };

    aplicarPrefs();
    fijarHerramienta('sel');
    pintarBiblioteca($('#biblioteca'), app);

    // Documento inicial: el guardado en el navegador o, la primera vez, un
    // proyecto de ejemplo para no empezar con la mesa vacía.
    let doc = null;
    const guardado = almacen.leer('doc');
    if (guardado) { try { doc = validarDoc(guardado, app.catalogo).doc; } catch { doc = null; } }
    if (!doc) doc = docDeProyecto(PROYECTOS[0]);
    cargar(doc, { encuadrar: false });
    pintarArea();

    enlazar();
}

function enlazar() {
    window.addEventListener('hashchange', pintarArea);
    window.addEventListener('resize', () => { if (!app.doc.partes.length) app.lienzo.encuadrar(); });
    // Si la mesa cambia de tamaño (la hoja de estilos llega después del
    // script, se gira el móvil, se abre un panel) y nadie ha tocado la vista,
    // se vuelve a encuadrar. Sin esto el montaje inicial quedaba diminuto.
    new ResizeObserver(() => {
        const v = app.lienzo.vista, a = app.vistaAuto;
        if (app.area === 'montaje' && a && v.x === a.x && v.y === a.y && v.z === a.z) encuadrarAuto();
    }).observe($('#lienzo'));

    document.addEventListener('click', e => {
        const t = e.target.closest('button,[data-ficha],a');
        if (!t) { cerrarMenus(); return; }
        const d = t.dataset;
        if (!t.closest('.menu') && !d.menu) cerrarMenus();
        if (d.accion && ACCIONES[d.accion]) { ACCIONES[d.accion](); pintarBarra(); return; }
        if (d.menu) { const m = $('#' + d.menu), abierto = !m.hidden; cerrarMenus(); m.hidden = abierto; t.setAttribute('aria-expanded', String(!abierto)); return; }
        if (d.exportar) { exportar(d.exportar); cerrarMenus(); return; }
        if (d.pestana) { app.prefs.pestana = d.pestana; almacen.guardar('prefs', app.prefs); pintarLateral(); return; }
        if (d.ficha) { location.hash = '#componentes/' + d.ficha; return; }
        if (d.colocar) { app.lienzo.empezarColocacion(app.catalogo.get(d.colocar)); $('.taller').classList.remove('ver-izq'); pista(); return; }
        if ('propios' in d) { app.filtro.propios = !app.filtro.propios; pintarBiblioteca($('#biblioteca'), app); return; }
        if (d.orden) { ACCIONES[d.orden](); return; }
        if (d.red) { seleccionarRed(d.red); return; }
        if (d.parte) { app.silencio = true; app.lienzo.seleccionar({ partes: [d.parte] }, true); app.silencio = false; return; }
        if (d.problema) { const p = app.analisis.problemas[+d.problema]; if (p) { app.silencio = true; app.lienzo.seleccionar({ partes: p.partes, pines: p.pines }, true); app.silencio = false; } return; }
        if ('color' in d) { const c = cableSel(); if (c) { if (d.color) c.color = d.color; else delete c.color; cambio(); } return; }
        if (d.copiar) { copiar($(`[data-codigo="${d.copiar}"]`).textContent).then(ok => avisar(ok ? 'Copiado al portapapeles.' : 'No se pudo copiar.', ok ? 'ok' : 'error')); return; }
        if (d.anadir) { location.hash = '#montaje'; requestAnimationFrame(() => app.lienzo.colocarEnCentro(app.catalogo.get(d.anadir))); return; }
        if (d.tengoAlternar) { fijarInventario(d.tengoAlternar, !app.tengo(app.catalogo.get(d.tengoAlternar))); return; }
        if (d.abrirProyecto) { abrirProyecto(d.abrirProyecto); return; }
        if (d.descargarEjemplo) { descargarEjemplo(d.descargarEjemplo); return; }
        if ('filtroPin' in d) {
            for (const b of $$('[data-filtro-pin]')) b.classList.toggle('activo', b === t);
            for (const tr of $$('.pinout tbody tr')) tr.hidden = !!d.filtroPin && tr.dataset.tipo !== d.filtroPin;
            return;
        }
        if ('filtroAmbito' in d) { app.filtroProyectos.ambito = d.filtroAmbito; pintarArea(); return; }
        if ('filtroMontaje' in d) { app.filtroProyectos.montaje = !app.filtroProyectos.montaje; pintarArea(); return; }
    });

    // Tocar la mesa cierra los paneles superpuestos de la vista estrecha.
    $('#lienzo').addEventListener('pointerdown', () => { $('.taller').classList.remove('ver-izq', 'ver-der'); });

    document.addEventListener('dblclick', e => {
        const t = e.target.closest('[data-colocar]');
        if (!t) return;
        app.lienzo.cancelar();
        app.lienzo.colocarEnCentro(app.catalogo.get(t.dataset.colocar));
    });

    document.addEventListener('change', e => {
        const t = e.target, d = t.dataset;
        if (d.tengo) { fijarInventario(d.tengo, t.checked); return; }
        if (d.campo) {
            const v = t.value.trim();
            if (d.campo === 'nombre') app.doc.nombre = v || 'Montaje sin título';
            else if (d.campo === 'notas') app.doc.notas = t.value;
            else if (d.campo === 'etiqueta') { const c = cableSel(); if (c) { if (v) c.etiqueta = v; else delete c.etiqueta; } }
            else {
                const parte = buscarParte(app.doc, [...app.lienzo.sel.partes][0]);
                if (!parte) return;
                if (d.campo === 'ref') {
                    if (!v) { t.value = parte.ref; return; }
                    if (app.doc.partes.some(p => p !== parte && p.ref === v)) { avisar(`La referencia ${v} ya existe.`, 'aviso'); t.value = parte.ref; return; }
                    parte.ref = v;
                } else if (d.campo === 'valor') { if (v) parte.valor = v; else delete parte.valor; }
            }
            cambio();
        }
    });

    $('#nombre-doc').addEventListener('change', e => { app.doc.nombre = e.target.value.trim() || 'Montaje sin título'; cambio(); });
    $('#buscar-pieza').addEventListener('input', e => { app.filtro.texto = e.target.value; pintarBiblioteca($('#biblioteca'), app); });
    document.addEventListener('input', e => {
        if (!('buscarProyecto' in e.target.dataset)) return;
        app.filtroProyectos.texto = e.target.value;
        const pos = e.target.selectionStart;
        pintarArea();
        const n = $('[data-buscar-proyecto]');
        n.focus(); n.setSelectionRange(pos, pos);
    });

    document.addEventListener('keydown', alTeclear);
    document.addEventListener('keyup', e => { if (e.code === 'Space') { app.lienzo.espacio = false; $('#lienzo').classList.remove('mano-temporal'); } });
    window.addEventListener('blur', () => { app.lienzo.espacio = false; });
}

function cerrarMenus() {
    for (const m of $$('.menu')) m.hidden = true;
    for (const b of $$('[data-menu]')) b.setAttribute('aria-expanded', 'false');
}

function cableSel() {
    const id = [...app.lienzo.sel.cables][0];
    return id ? app.doc.cables.find(c => c.id === id) : null;
}

function seleccionarRed(id) {
    const red = app.analisis.redes.find(r => r.id === id);
    if (!red) return;
    app.silencio = true;
    app.lienzo.seleccionar({ cables: red.cables, pines: red.pines.map(e => e.clave) });
    app.lienzo.centrarEn([...new Set(red.pines.map(e => e.parte.id))]);
    app.silencio = false;
}

function alTeclear(e) {
    if (e.key === 'Escape') {
        if ($('#dialogo').open) return;
        cerrarMenus();
        $('.taller').classList.remove('ver-izq', 'ver-der');
        if (app.area === 'montaje' && !app.lienzo.cancelar() && app.lienzo.haySeleccion()) app.lienzo.seleccionar({});
        return;
    }
    const enCampo = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if (app.area !== 'montaje' || enCampo || $('#dialogo').open) return;
    const l = app.lienzo, ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    const hecho = () => { e.preventDefault(); pintarBarra(); };
    if (ctrl) {
        if (k === 'z') { e.shiftKey ? ACCIONES.rehacer() : ACCIONES.deshacer(); return hecho(); }
        if (k === 'y') { ACCIONES.rehacer(); return hecho(); }
        if (k === 's') { guardarArchivo(); return hecho(); }
        if (k === 'o') { abrirArchivo(); return hecho(); }
        if (k === 'd') { l.duplicarSeleccion(); return hecho(); }
        if (k === 'a') { l.seleccionarTodo(); return hecho(); }
        return;
    }
    if (e.altKey) return;
    if (e.code === 'Space') { l.espacio = true; $('#lienzo').classList.add('mano-temporal'); return hecho(); }
    switch (k) {
        case 'delete': case 'backspace': l.borrarSeleccion(); return hecho();
        case 'r': l.rotarSeleccion(e.shiftKey ? -1 : 1); return hecho();
        case 'f': l.encuadrar(); return hecho();
        case 'v': fijarHerramienta('sel'); return hecho();
        case 'h': fijarHerramienta('mano'); return hecho();
        case 'g': preferencia('rejilla'); return hecho();
        case '+': case '=': l.zoom(1.25); return hecho();
        case '-': l.zoom(0.8); return hecho();
        case '0': l.vista.z = 1; l.aplicarVista(); return hecho();
        case 'arrowleft': l.moverSeleccion(-1, 0); return hecho();
        case 'arrowright': l.moverSeleccion(1, 0); return hecho();
        case 'arrowup': l.moverSeleccion(0, -1); return hecho();
        case 'arrowdown': l.moverSeleccion(0, 1); return hecho();
    }
}

// Para depurar desde la consola y para las comprobaciones automáticas.
window.labStudio = { app, FORMATO };

iniciar();
