// Mesa de montaje: lienzo SVG con zoom, desplazamiento, selección, arrastre
// con ajuste a rejilla y cableado de pin a pin con enrutado automático.
//
// El lienzo no guarda el documento: lo recibe de la aplicación, lo modifica
// a través de core/modelo.js y avisa con `alCambiar()` para que la aplicación
// lo registre en el historial y vuelva a analizarlo.

import { U, ajustar, posPin, cajaParte, transformParte, tamano, anadirParte, anadirCable, quitarPartes, quitarCables, rotarParte, duplicarPartes, limites, clavePin, buscarParte } from '../core/modelo.js';
import { crearEnrutador, rutaSimple, caminoSvg } from '../core/ruta.js';
import { DEFS, dibujar, DIBUJO_POR_INSTANCIA } from './dibujos.js';
import { TIPOS_PIN } from '../datos/componentes.js';

const NS = 'http://www.w3.org/2000/svg';
const ZMIN = 0.15, ZMAX = 6;
const PALETA = ['#2f9e44', '#1c7ed6', '#ae3ec9', '#f59f00', '#0ca678', '#e8590c', '#4263eb', '#d6336c', '#5c940d', '#1098ad'];
const COLOR_CLASE = { gnd: '#22252a', v5: '#e03131', v3: '#f08c00', fase: '#7b4a1e', neutro: '#2a62c9', pe: '#3aa655', usb: '#5f6770', 'datos-red': '#1c9bd6' };
const GROSOR = { usb: 5, fase: 4, neutro: 4, pe: 4, v5: 3.4, v3: 3.4, gnd: 3.4, senal: 3, 'datos-red': 2.4 };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function colorCable(cable, red, indice) {
    if (cable && cable.color) return cable.color;
    if (!red) return '#868e96';
    return COLOR_CLASE[red.clase] || PALETA[indice % PALETA.length];
}

export class Lienzo {
    constructor(svg, { catalogo, alCambiar, alSeleccionar, alEstado, alAbrirFicha, avisar }) {
        this.svg = svg;
        this.catalogo = catalogo;
        this.alCambiar = alCambiar;
        this.alSeleccionar = alSeleccionar;
        this.alEstado = alEstado || (() => {});
        this.alAbrirFicha = alAbrirFicha || (() => {});
        this.avisar = avisar || (() => {});
        this.doc = null;
        this.analisis = null;
        this.vista = { x: 40, y: 40, z: 1 };
        this.sel = { partes: new Set(), cables: new Set() };
        this.herramienta = 'sel';
        this.modo = null;            // arrastre | marco | mano | null
        this.cableando = null;       // { p, pin } de origen
        this.colocando = null;       // def que se está colocando
        this.cursor = { x: 0, y: 0 };
        this.rutas = new Map();
        this.resaltados = new Set(); // claves de pin que marca un problema
        this.espacio = false;
        this.dedos = new Map();      // punteros táctiles activos (pellizco)
        this.montar();
    }

    // ------------------------------------------------------------ montaje
    montar() {
        this.svg.innerHTML = `
<defs>${DEFS}
  <pattern id="ls-rejilla-fina" width="${U}" height="${U}" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r=".7" class="punto-rejilla"/></pattern>
  <pattern id="ls-rejilla" width="${U * 10}" height="${U * 10}" patternUnits="userSpaceOnUse"><rect width="${U * 10}" height="${U * 10}" fill="url(#ls-rejilla-fina)" class="rejilla-fina"/><path d="M${U * 10} 0H0V${U * 10}" fill="none" class="linea-rejilla"/></pattern>
  <g id="ls-simbolos"></g>
</defs>
<rect class="fondo" width="100%" height="100%"/>
<g class="mundo">
  <rect class="rejilla" x="-20000" y="-20000" width="40000" height="40000" fill="url(#ls-rejilla)"/>
  <g class="capa-partes"></g><g class="capa-cables"></g><g class="capa-pines"></g><g class="capa-encima"></g>
</g>`;
        const q = s => this.svg.querySelector(s);
        this.mundo = q('.mundo');
        this.simbolos = q('#ls-simbolos');
        this.capaPartes = q('.capa-partes');
        this.capaCables = q('.capa-cables');
        this.capaPines = q('.capa-pines');
        this.capaEncima = q('.capa-encima');
        this.conSimbolo = new Set();

        this.svg.addEventListener('pointerdown', e => this.alPulsar(e));
        this.svg.addEventListener('pointermove', e => this.alMover(e));
        this.svg.addEventListener('pointerup', e => this.alSoltar(e));
        this.svg.addEventListener('pointercancel', e => this.alSoltar(e));
        this.svg.addEventListener('pointerleave', () => this.alEstado({ pin: null }));
        this.svg.addEventListener('wheel', e => this.alRueda(e), { passive: false });
        this.svg.addEventListener('dblclick', e => {
            const g = e.target.closest('.parte');
            if (g) this.alAbrirFicha(buscarParte(this.doc, g.dataset.id).tipo);
        });
        this.svg.addEventListener('contextmenu', e => e.preventDefault());
        this.aplicarVista();
    }

    def(parte) { return this.catalogo.get(parte.tipo); }

    capturar(e) { try { this.svg.setPointerCapture(e.pointerId); } catch { /* puntero ya liberado */ } }

    // ---------------------------------------------------------- documento
    fijar(doc, analisis, { conservarSeleccion = true } = {}) {
        this.doc = doc;
        this.analisis = analisis;
        if (!conservarSeleccion) { this.sel.partes.clear(); this.sel.cables.clear(); this.cableando = null; }
        const partes = new Set(doc.partes.map(p => p.id)), cables = new Set(doc.cables.map(c => c.id));
        for (const id of [...this.sel.partes]) if (!partes.has(id)) this.sel.partes.delete(id);
        for (const id of [...this.sel.cables]) if (!cables.has(id)) this.sel.cables.delete(id);
        if (this.cableando && !partes.has(this.cableando.p)) this.cableando = null;
        this.calcularRutas();
        this.pintar();
    }

    extremo(ext) {
        const parte = buscarParte(this.doc, ext.p);
        const def = parte && this.def(parte);
        const pin = def && def.pines.find(p => p.id === ext.pin);
        return pin ? posPin(parte, def, pin) : null;
    }

    indiceRed(red) { return red ? +red.id.slice(1) : 0; }

    calcularRutas(rapidas = null) {
        const trazar = rapidas ? null : crearEnrutador(this.doc, this.catalogo);
        const rutas = new Map();
        // Primero alimentación y masa: los trazados largos condicionan al resto.
        const orden = c => { const r = this.analisis.porCable.get(c.id); return r && r.clase !== 'senal' ? 0 : 1; };
        for (const c of [...this.doc.cables].sort((a, b) => orden(a) - orden(b))) {
            const a = this.extremo(c.a), b = this.extremo(c.b);
            if (!a || !b) continue;
            if (rapidas) {
                rutas.set(c.id, rapidas.has(c.a.p) || rapidas.has(c.b.p) ? rutaSimple(a, b) : (this.rutas.get(c.id) || rutaSimple(a, b)));
            } else {
                rutas.set(c.id, trazar(a, b, this.indiceRed(this.analisis.porCable.get(c.id))) || rutaSimple(a, b));
            }
        }
        this.rutas = rutas;
    }

    // -------------------------------------------------------------- pintar
    asegurarSimbolo(def) {
        if (this.conSimbolo.has(def.id) || DIBUJO_POR_INSTANCIA.has(def.dibujo)) return;
        const g = document.createElementNS(NS, 'g');
        g.id = 'sim-' + def.id;
        g.innerHTML = dibujar(def);
        this.simbolos.appendChild(g);
        this.conSimbolo.add(def.id);
    }

    arte(def, parte) {
        if (DIBUJO_POR_INSTANCIA.has(def.dibujo)) return dibujar(def, parte);
        this.asegurarSimbolo(def);
        return `<use href="#sim-${def.id}"/>`;
    }

    pintar() {
        const doc = this.doc, an = this.analisis;
        if (!doc) return;
        const peor = new Map();
        for (const p of an.problemas) {
            if (p.nivel === 'info') continue;
            for (const id of p.partes) if (peor.get(id) !== 'error') peor.set(id, p.nivel);
        }

        let partes = '', pines = '', encima = '';
        for (const parte of doc.partes) {
            const def = this.def(parte);
            if (!def) continue;
            const c = cajaParte(parte, def), sel = this.sel.partes.has(parte.id);
            partes += `<g class="parte${sel ? ' sel' : ''}" data-id="${parte.id}"><g transform="${transformParte(parte, def)}" filter="url(#ls-sombra)">${this.arte(def, parte)}</g>` +
                `<rect class="caja" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}"/></g>`;
            encima += `<text class="ref" x="${c.x}" y="${c.y - 5}">${esc(parte.ref)}${parte.valor ? ' · ' + esc(parte.valor) : ''}</text>`;
            if (sel) encima += `<rect class="marco-sel" x="${c.x - 4}" y="${c.y - 4}" width="${c.w + 8}" height="${c.h + 8}" rx="4"/>`;
            if (peor.has(parte.id)) {
                encima += `<g class="alerta ${peor.get(parte.id)}" data-parte="${parte.id}" transform="translate(${c.x + c.w} ${c.y})"><circle r="7"/><text y="3.6" text-anchor="middle">!</text></g>`;
            }
            for (const pin of def.pines) {
                const q = posPin(parte, def, pin), k = clavePin(parte.id, pin.id);
                const con = an.porPin.has(k), origen = this.cableando && this.cableando.p === parte.id && this.cableando.pin === pin.id;
                pines += `<g class="pin t-${pin.tipo}${con ? ' con' : ''}${origen ? ' origen' : ''}${this.resaltados.has(k) ? ' marcado' : ''}" data-p="${parte.id}" data-pin="${esc(pin.id)}">` +
                    `<circle class="zona" cx="${q.x}" cy="${q.y}" r="5"/><circle class="punto" cx="${q.x}" cy="${q.y}" r="2.6"/></g>`;
            }
        }

        const redesSel = new Set([...this.sel.cables].map(id => an.porCable.get(id)).filter(Boolean).map(r => r.id));
        let cables = '';
        for (const c of doc.cables) {
            const ruta = this.rutas.get(c.id);
            if (!ruta) continue;
            const red = an.porCable.get(c.id), clase = red ? red.clase : 'senal';
            const d = caminoSvg(ruta, 5), color = colorCable(c, red, this.indiceRed(red)), w = GROSOR[clase] || 3;
            const sel = this.sel.cables.has(c.id), enRed = red && redesSel.has(red.id);
            const raya = clase === 'datos-red' ? ' stroke-dasharray="7 5"' : '';
            cables += `<g class="cable c-${clase}${sel ? ' sel' : ''}${enRed ? ' en-red' : ''}" data-id="${c.id}">` +
                `<path class="zona" d="${d}"/><path class="halo" d="${d}" stroke-width="${w + 5}"/>` +
                `<path class="borde" d="${d}" stroke="#000" stroke-opacity=".35" stroke-width="${w + 1.4}" fill="none" stroke-linecap="round" stroke-linejoin="round"${raya}/>` +
                `<path class="nucleo" d="${d}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"${raya}/>` +
                (clase === 'pe' ? `<path d="${d}" stroke="#f2d024" stroke-width="${w * .45}" fill="none" stroke-dasharray="8 8"/>` : '') +
                `<path class="brillo" d="${d}" stroke="#fff" stroke-opacity=".28" stroke-width="${w * .28}" fill="none" stroke-linecap="round" stroke-linejoin="round"${raya}/>`;
            if (c.etiqueta) {
                const m = puntoMedio(ruta);
                cables += `<g class="rotulo" transform="translate(${m[0]} ${m[1]})"><rect x="${-c.etiqueta.length * 2.1 - 4}" y="-6" width="${c.etiqueta.length * 4.2 + 8}" height="12" rx="3"/><text y="3" text-anchor="middle">${esc(c.etiqueta)}</text></g>`;
            }
            cables += '</g>';
        }

        this.capaPartes.innerHTML = partes;
        this.capaCables.innerHTML = cables;
        this.capaPines.innerHTML = pines;
        this.capaEncima.innerHTML = encima + '<g class="temporal"></g>';
        this.temporal = this.capaEncima.querySelector('.temporal');
        this.pintarTemporal();
        this.svg.classList.toggle('cableando', !!this.cableando);
        this.svg.classList.toggle('colocando', !!this.colocando);
    }

    // Elementos efímeros: cable en curso, pieza fantasma, marco de selección.
    pintarTemporal() {
        if (!this.temporal) return;
        let s = '';
        if (this.cableando) {
            const a = this.extremo(this.cableando);
            if (a) {
                const dx = this.cursor.x - a.x, dy = this.cursor.y - a.y;
                const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'izq' : 'der') : (dy > 0 ? 'arr' : 'aba');
                const fin = this.pinBajoCursor ? this.extremo(this.pinBajoCursor) : { x: ajustar(this.cursor.x), y: ajustar(this.cursor.y), dir };
                if (fin) s += `<path class="cable-nuevo" d="${caminoSvg(rutaSimple(a, fin), 5)}"/>`;
            }
        }
        if (this.colocando) {
            const def = this.colocando, x = ajustar(this.cursor.x - def.w * U / 2), y = ajustar(this.cursor.y - def.h * U / 2);
            s += `<g class="fantasma" transform="translate(${x} ${y})">${this.arte(def, null)}</g>`;
        }
        if (this.modo === 'marco' && this.marco) {
            const m = this.marco;
            s += `<rect class="marco" x="${Math.min(m.x0, m.x1)}" y="${Math.min(m.y0, m.y1)}" width="${Math.abs(m.x1 - m.x0)}" height="${Math.abs(m.y1 - m.y0)}"/>`;
        }
        this.temporal.innerHTML = s;
    }

    // --------------------------------------------------------------- vista
    aplicarVista() {
        const v = this.vista;
        this.mundo.setAttribute('transform', `translate(${v.x} ${v.y}) scale(${v.z})`);
        this.svg.classList.toggle('lejos', v.z < 0.55);
        this.alEstado({ zoom: v.z });
    }

    aMundo(e) {
        const r = this.svg.getBoundingClientRect();
        return { x: (e.clientX - r.left - this.vista.x) / this.vista.z, y: (e.clientY - r.top - this.vista.y) / this.vista.z };
    }

    zoom(factor, cx = null, cy = null) {
        const r = this.svg.getBoundingClientRect();
        if (cx == null) { cx = r.width / 2; cy = r.height / 2; }
        const z = Math.min(ZMAX, Math.max(ZMIN, this.vista.z * factor));
        const f = z / this.vista.z;
        this.vista.x = cx - (cx - this.vista.x) * f;
        this.vista.y = cy - (cy - this.vista.y) * f;
        this.vista.z = z;
        this.aplicarVista();
    }

    // Caja de piezas y cables: un cable que rodea el montaje también cuenta.
    extension() {
        const l = limites(this.doc, this.catalogo);
        if (l.vacio) return l;
        let x0 = l.x, y0 = l.y, x1 = l.x + l.w, y1 = l.y + l.h;
        for (const r of this.rutas.values()) for (const [x, y] of r) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
        return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }

    encuadrar() {
        const r = this.svg.getBoundingClientRect();
        const l = this.extension();
        if (l.vacio || !r.width) { this.vista = { x: r.width / 2 - 200, y: 80, z: 1 }; this.aplicarVista(); return; }
        const m = r.width < 520 ? 20 : 60;
        const z = Math.min(2.2, Math.max(ZMIN, Math.min((r.width - 2 * m) / l.w, (r.height - 2 * m) / l.h)));
        this.vista = { z, x: (r.width - l.w * z) / 2 - l.x * z, y: (r.height - l.h * z) / 2 - l.y * z };
        this.aplicarVista();
    }

    centroVisible() {
        const r = this.svg.getBoundingClientRect();
        return { x: (r.width / 2 - this.vista.x) / this.vista.z, y: (r.height / 2 - this.vista.y) / this.vista.z };
    }

    // ---------------------------------------------------------- interacción
    alRueda(e) {
        e.preventDefault();
        const r = this.svg.getBoundingClientRect();
        const paso = e.ctrlKey ? 0.01 : 0.0016;
        this.zoom(Math.exp(-e.deltaY * paso), e.clientX - r.left, e.clientY - r.top);
    }

    alPulsar(e) {
        if (!this.doc) return;
        this.svg.focus({ preventScroll: true });
        const m = this.aMundo(e);
        this.cursor = m;
        const tactil = e.pointerType === 'touch';
        if (tactil) {
            this.alEstado({ pin: null });
            this.dedos.set(e.pointerId, this.enLienzo(e));
            if (this.dedos.size === 2) { this.empezarPellizco(); return; }
            if (this.dedos.size > 2) return;
        }
        if (e.button === 1 || e.button === 2 || (e.button === 0 && (this.espacio || this.herramienta === 'mano'))) {
            this.modo = 'mano';
            this.origen = { cx: e.clientX, cy: e.clientY, vx: this.vista.x, vy: this.vista.y };
            this.capturar(e);
            this.svg.classList.add('arrastrando');
            return;
        }
        if (e.button !== 0) return;
        this.pinBajoCursor = null;

        if (this.colocando) {
            const def = this.colocando;
            const parte = anadirParte(this.doc, def, m.x - def.w * U / 2, m.y - def.h * U / 2, def.valor ? { valor: def.valor } : {});
            if (!e.shiftKey) this.colocando = null;
            this.sel.partes = new Set([parte.id]); this.sel.cables.clear();
            this.alCambiar('Añadir ' + def.corto);
            return;
        }

        // Con el dedo o el lápiz se admite un margen alrededor del pin.
        const gPin = e.target.closest('.pin');
        const ext = gPin ? { p: gPin.dataset.p, pin: gPin.dataset.pin } : (e.pointerType !== 'mouse' ? this.pinCercano(m) : null);
        if (ext) {
            if (!this.cableando) {
                this.cableando = ext;
                this.pintar();
                if (tactil) this.alEstado({ pin: this.infoPin(ext.p, ext.pin, e) });
            } else if (this.cableando.p === ext.p && this.cableando.pin === ext.pin) {
                this.cancelar();
            } else {
                const r = anadirCable(this.doc, this.catalogo, this.cableando, ext);
                if (typeof r === 'string') { this.avisar(r, 'aviso'); return; }
                this.cableando = e.shiftKey ? ext : null;
                this.sel.partes.clear(); this.sel.cables = new Set([r.id]);
                this.alCambiar('Cablear');
            }
            return;
        }
        if (this.cableando && !tactil) return; // clic en vacío mientras se cablea: se ignora

        const gAlerta = e.target.closest('.alerta');
        const gParte = gAlerta ? null : e.target.closest('.parte');
        const id = gAlerta ? gAlerta.dataset.parte : gParte && gParte.dataset.id;
        if (id && !this.cableando) {
            if (e.shiftKey) { this.sel.partes.has(id) ? this.sel.partes.delete(id) : this.sel.partes.add(id); }
            else if (!this.sel.partes.has(id)) { this.sel.partes = new Set([id]); this.sel.cables.clear(); }
            this.modo = 'arrastre';
            this.origen = { x: m.x, y: m.y, movido: false, pos: new Map([...this.sel.partes].map(i => { const p = buscarParte(this.doc, i); return [i, { x: p.x, y: p.y }]; })) };
            this.capturar(e);
            this.pintar();
            this.alSeleccionar(gAlerta ? { problemaDe: id } : undefined);
            return;
        }
        const gCable = e.target.closest('.cable');
        if (gCable && !this.cableando) {
            const cid = gCable.dataset.id;
            if (e.shiftKey) { this.sel.cables.has(cid) ? this.sel.cables.delete(cid) : this.sel.cables.add(cid); }
            else { this.sel.cables = new Set([cid]); this.sel.partes.clear(); }
            this.pintar();
            this.alSeleccionar();
            return;
        }
        if (tactil) {
            // Un dedo en vacío desplaza la mesa; un toque sin arrastre deselecciona
            // o cancela el cable en curso.
            this.modo = 'mano';
            this.origen = { cx: e.clientX, cy: e.clientY, vx: this.vista.x, vy: this.vista.y, toque: true };
            this.capturar(e);
            return;
        }
        if (!e.shiftKey) { this.sel.partes.clear(); this.sel.cables.clear(); }
        this.modo = 'marco';
        this.marco = { x0: m.x, y0: m.y, x1: m.x, y1: m.y };
        this.capturar(e);
        this.pintar();
        this.alSeleccionar();
    }

    alMover(e) {
        if (!this.doc) return;
        const m = this.aMundo(e);
        this.cursor = m;
        if (this.dedos.has(e.pointerId)) this.dedos.set(e.pointerId, this.enLienzo(e));
        if (this.modo === 'pellizco') { this.pellizcar(); return; }
        if (this.modo === 'mano') {
            if (Math.hypot(e.clientX - this.origen.cx, e.clientY - this.origen.cy) > 6) this.origen.movido = true;
            if (this.origen.toque && !this.origen.movido) return;
            this.vista.x = this.origen.vx + e.clientX - this.origen.cx;
            this.vista.y = this.origen.vy + e.clientY - this.origen.cy;
            this.aplicarVista();
            return;
        }
        if (this.modo === 'arrastre') {
            const dx = ajustar(m.x - this.origen.x), dy = ajustar(m.y - this.origen.y);
            let cambio = false;
            for (const [id, o] of this.origen.pos) {
                const p = buscarParte(this.doc, id);
                if (p.x !== o.x + dx || p.y !== o.y + dy) { p.x = o.x + dx; p.y = o.y + dy; cambio = true; }
            }
            if (cambio) {
                this.origen.movido = true;
                this.calcularRutas(this.sel.partes);
                this.pintar();
            }
            return;
        }
        if (this.modo === 'marco') {
            this.marco.x1 = m.x; this.marco.y1 = m.y;
            this.pintarTemporal();
            return;
        }
        const gPin = e.target.closest && e.target.closest('.pin');
        this.pinBajoCursor = gPin ? { p: gPin.dataset.p, pin: gPin.dataset.pin } : null;
        if (this.cableando || this.colocando) this.pintarTemporal();
        this.alEstado({ x: m.x, y: m.y, pin: gPin ? this.infoPin(gPin.dataset.p, gPin.dataset.pin, e) : null });
    }

    alSoltar(e) {
        if (this.svg.hasPointerCapture(e.pointerId)) this.svg.releasePointerCapture(e.pointerId);
        this.svg.classList.remove('arrastrando');
        this.dedos.delete(e.pointerId);
        if (this.modo === 'pellizco') { if (this.dedos.size < 2) this.modo = null; return; }
        const modo = this.modo;
        this.modo = null;
        if (modo === 'mano' && this.origen.toque && !this.origen.movido) {
            if (!this.cancelar() && this.haySeleccion()) { this.sel.partes.clear(); this.sel.cables.clear(); this.pintar(); this.alSeleccionar(); }
        } else if (modo === 'arrastre') {
            if (this.origen.movido) this.alCambiar('Mover');
        } else if (modo === 'marco') {
            const m = this.marco, x0 = Math.min(m.x0, m.x1), x1 = Math.max(m.x0, m.x1), y0 = Math.min(m.y0, m.y1), y1 = Math.max(m.y0, m.y1);
            if (x1 - x0 > 3 || y1 - y0 > 3) {
                for (const p of this.doc.partes) {
                    const def = this.def(p);
                    if (!def) continue;
                    const c = cajaParte(p, def);
                    if (c.x >= x0 && c.y >= y0 && c.x + c.w <= x1 && c.y + c.h <= y1) this.sel.partes.add(p.id);
                }
            }
            this.marco = null;
            this.pintar();
            this.alSeleccionar();
        }
    }

    // ------------------------------------------------------------- táctil
    enLienzo(e) {
        const r = this.svg.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    pinCercano(m) {
        const tolerancia = Math.min(18 / this.vista.z, 8);
        let mejor = null, dist = tolerancia;
        for (const parte of this.doc.partes) {
            const def = this.def(parte);
            if (!def) continue;
            for (const pin of def.pines) {
                const q = posPin(parte, def, pin), d = Math.hypot(q.x - m.x, q.y - m.y);
                if (d < dist) { dist = d; mejor = { p: parte.id, pin: pin.id }; }
            }
        }
        return mejor;
    }

    empezarPellizco() {
        // Si el primer dedo estaba arrastrando piezas, se devuelven a su sitio.
        if (this.modo === 'arrastre' && this.origen.movido) {
            for (const [id, o] of this.origen.pos) { const p = buscarParte(this.doc, id); if (p) { p.x = o.x; p.y = o.y; } }
            this.calcularRutas();
            this.pintar();
        }
        this.marco = null;
        const [a, b] = [...this.dedos.values()];
        this.modo = 'pellizco';
        this.pellizco = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, v: { ...this.vista } };
        this.pintarTemporal();
    }

    pellizcar() {
        if (this.dedos.size < 2) return;
        const [a, b] = [...this.dedos.values()], p = this.pellizco;
        const z = Math.min(ZMAX, Math.max(ZMIN, p.v.z * Math.hypot(a.x - b.x, a.y - b.y) / p.d)), f = z / p.v.z;
        const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        this.vista = { z, x: cx - (p.cx - p.v.x) * f, y: cy - (p.cy - p.v.y) * f };
        this.aplicarVista();
    }

    infoPin(parteId, pinId, e) {
        const parte = buscarParte(this.doc, parteId), def = parte && this.def(parte);
        const pin = def && def.pines.find(p => p.id === pinId);
        if (!pin) return null;
        const red = this.analisis.porPin.get(clavePin(parteId, pinId));
        return { parte, def, pin, red, tipo: TIPOS_PIN[pin.tipo] || pin.tipo, cx: e.clientX, cy: e.clientY };
    }

    // ------------------------------------------------------------- órdenes
    fijarHerramienta(h) {
        this.herramienta = h;
        this.svg.dataset.herramienta = h;
        if (h !== 'sel') this.cancelar();
    }

    empezarColocacion(def) {
        this.cableando = null;
        this.colocando = def;
        this.pintar();
    }

    colocarEnCentro(def) {
        const c = this.centroVisible();
        const parte = anadirParte(this.doc, def, c.x - def.w * U / 2, c.y - def.h * U / 2, def.valor ? { valor: def.valor } : {});
        // Si el hueco está ocupado, se desplaza en diagonal hasta quedar libre.
        const choca = () => this.doc.partes.some(o => o !== parte && o.x === parte.x && o.y === parte.y);
        while (choca()) { parte.x += 2 * U; parte.y += 2 * U; }
        this.sel.partes = new Set([parte.id]); this.sel.cables.clear();
        this.alCambiar('Añadir ' + def.corto);
    }

    cancelar() {
        const habia = this.cableando || this.colocando;
        this.cableando = null;
        this.colocando = null;
        if (habia) this.pintar();
        return !!habia;
    }

    haySeleccion() { return this.sel.partes.size + this.sel.cables.size > 0; }

    borrarSeleccion() {
        if (!this.haySeleccion()) return;
        quitarCables(this.doc, this.sel.cables);
        quitarPartes(this.doc, this.sel.partes);
        this.sel.partes.clear(); this.sel.cables.clear();
        this.alCambiar('Borrar');
    }

    rotarSeleccion(sentido = 1) {
        if (!this.sel.partes.size) return;
        for (const id of this.sel.partes) { const p = buscarParte(this.doc, id); rotarParte(p, this.def(p), sentido); }
        this.alCambiar('Girar');
    }

    duplicarSeleccion() {
        if (!this.sel.partes.size) return;
        const nuevas = duplicarPartes(this.doc, this.catalogo, [...this.sel.partes]);
        this.sel.partes = new Set(nuevas); this.sel.cables.clear();
        this.alCambiar('Duplicar');
    }

    moverSeleccion(dx, dy) {
        if (!this.sel.partes.size) return;
        for (const id of this.sel.partes) { const p = buscarParte(this.doc, id); p.x += dx * U; p.y += dy * U; }
        this.alCambiar('Mover');
    }

    seleccionarTodo() {
        this.sel.partes = new Set(this.doc.partes.map(p => p.id));
        this.sel.cables.clear();
        this.pintar();
        this.alSeleccionar();
    }

    seleccionar({ partes = [], cables = [], pines = [] }, centrar = false) {
        this.sel.partes = new Set(partes);
        this.sel.cables = new Set(cables);
        this.resaltados = new Set(pines);
        this.pintar();
        if (centrar && partes.length) this.centrarEn(partes);
        this.alSeleccionar();
    }

    centrarEn(ids) {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const id of ids) {
            const p = buscarParte(this.doc, id);
            if (!p) continue;
            const c = cajaParte(p, this.def(p));
            x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x + c.w); y1 = Math.max(y1, c.y + c.h);
        }
        if (x0 === Infinity) return;
        const r = this.svg.getBoundingClientRect();
        const dentro = (x, y) => { const sx = x * this.vista.z + this.vista.x, sy = y * this.vista.z + this.vista.y; return sx > 30 && sy > 30 && sx < r.width - 30 && sy < r.height - 30; };
        if (dentro(x0, y0) && dentro(x1, y1)) return;
        this.vista.x = r.width / 2 - (x0 + x1) / 2 * this.vista.z;
        this.vista.y = r.height / 2 - (y0 + y1) / 2 * this.vista.z;
        this.aplicarVista();
    }

    // ---------------------------------------------------------- exportación
    // SVG autónomo del montaje (sin rejilla ni marcas de edición).
    exportarSvg({ fondo = '#f4f2ec' } = {}) {
        const l = this.extension(), m = 40;
        const x0 = l.x, y0 = l.y, x1 = l.x + l.w, y1 = l.y + l.h;
        const w = x1 - x0 + 2 * m, h = y1 - y0 + 2 * m;
        let cuerpo = '';
        for (const p of this.doc.partes) {
            const def = this.def(p);
            if (!def) continue;
            const c = cajaParte(p, def);
            cuerpo += `<g transform="${transformParte(p, def)}" filter="url(#ls-sombra)">${dibujar(def, p)}</g>`;
            cuerpo += `<text x="${c.x}" y="${c.y - 5}" font-family="Inter,system-ui,sans-serif" font-size="7" font-weight="700" fill="#3a3e45">${esc(p.ref)}${p.valor ? ' · ' + esc(p.valor) : ''}</text>`;
        }
        const clon = this.capaCables.cloneNode(true);
        clon.querySelectorAll('.zona,.halo').forEach(n => n.remove());
        clon.querySelectorAll('.rotulo rect').forEach(n => { n.setAttribute('fill', '#fff'); n.setAttribute('fill-opacity', '.9'); n.setAttribute('stroke', '#c3c8ce'); n.setAttribute('stroke-width', '.5'); });
        clon.querySelectorAll('.rotulo text').forEach(n => { n.setAttribute('font-family', 'Inter,system-ui,sans-serif'); n.setAttribute('font-size', '7'); n.setAttribute('fill', '#22252a'); });
        return {
            ancho: w, alto: h,
            svg: `<svg xmlns="${NS}" viewBox="${x0 - m} ${y0 - m} ${w} ${h}" width="${w * 2}" height="${h * 2}"><defs>${DEFS}</defs>` +
                `<rect x="${x0 - m}" y="${y0 - m}" width="${w}" height="${h}" fill="${fondo}"/>${cuerpo}${clon.innerHTML}</svg>`
        };
    }
}

function puntoMedio(ruta) {
    let total = 0;
    for (let i = 1; i < ruta.length; i++) total += Math.abs(ruta[i][0] - ruta[i - 1][0]) + Math.abs(ruta[i][1] - ruta[i - 1][1]);
    let resto = total / 2;
    for (let i = 1; i < ruta.length; i++) {
        const l = Math.abs(ruta[i][0] - ruta[i - 1][0]) + Math.abs(ruta[i][1] - ruta[i - 1][1]);
        if (resto <= l && l > 0) {
            const f = resto / l;
            return [ruta[i - 1][0] + (ruta[i][0] - ruta[i - 1][0]) * f, ruta[i - 1][1] + (ruta[i][1] - ruta[i - 1][1]) * f];
        }
        resto -= l;
    }
    return ruta[0];
}
