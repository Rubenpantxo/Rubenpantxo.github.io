// ============================================================
// ZONA 01 · HERO Y SELECTOR INTERACTIVO
// El visitante elige qué quiere conseguir (web/app, 3D o
// automatización) y el hero cambia al instante: antetítulo,
// titular, subtítulo, plazo, prueba y botones.
//
// - El HTML del perfil por defecto ya viene pintado en index.html:
//   este módulo solo añade la interactividad (sin JS el hero se ve
//   entero y sus enlaces funcionan).
// - Pestañas accesibles: role="tablist", flechas, Inicio/Fin, foco
//   visible y anuncio con aria-live.
// - Perfil inicial: ?perfil= en la URL → el último de la sesión →
//   DEFECTO. Se guarda en sessionStorage 'sv:perfil' (texto con el id)
//   y en data-perfil de #servicios.
// - Contrato con las demás zonas: en document se lanza
//   CustomEvent('sv:perfil', { detail: { id, perfil, nombre, origen } })
//   al arrancar y en cada cambio. id y perfil valen lo mismo.
// - Analítica (si hay consentimiento, vía window.rpEvento):
//   hero_visto, hero_perfil, hero_cta.
// Sin variables globales; las clases van con prefijo .hs-
// ============================================================
import { PERFILES, ORDEN, DEFECTO, ALIAS } from './hero-selector.datos.js';

export const EVENTO = 'sv:perfil';
export const CLAVE_SESION = 'sv:perfil';

const instancias = new WeakMap();

const leerSesion = () => {
    try { return sessionStorage.getItem(CLAVE_SESION); } catch { return null; }
};
const guardarSesion = id => {
    try { sessionStorage.setItem(CLAVE_SESION, id); } catch { /* modo privado o almacenamiento bloqueado */ }
};

/** Normaliza un id que llega de fuera (URL, sesión); null si no es válido. */
export function normalizar(valor) {
    if (!valor) return null;
    const v = String(valor).trim().toLowerCase();
    const id = ALIAS[v] || v;
    return Object.prototype.hasOwnProperty.call(PERFILES, id) ? id : null;
}

/** Perfil con el que arranca y de dónde sale. */
export function perfilInicial(search = location.search) {
    const deUrl = normalizar(new URLSearchParams(search).get('perfil'));
    if (deUrl) return { id: deUrl, origen: 'url' };
    const deSesion = normalizar(leerSesion());
    if (deSesion) return { id: deSesion, origen: 'sesion' };
    return { id: DEFECTO, origen: 'inicio' };
}

const evento = (nombre, params) => {
    if (typeof window.rpEvento === 'function') window.rpEvento(nombre, params);
};

/**
 * Monta el selector sobre su contenedor.
 * @param {HTMLElement} contenedor  el bloque [data-zona="hero-selector"]
 * @param {object} [opciones]
 * @param {HTMLElement} [opciones.raiz]     donde buscar los textos [data-hs] (por defecto, el .sv-hero)
 * @param {HTMLElement} [opciones.seccion]  donde poner data-perfil (por defecto, #servicios)
 * @param {string} [opciones.perfil]        fuerza el perfil inicial
 * @returns {{ elegir(id: string): void, actual(): string, destroy(): void }}
 */
export function init(contenedor, opciones = {}) {
    if (!contenedor) throw new Error('hero-selector: falta el contenedor');
    if (instancias.has(contenedor)) return instancias.get(contenedor);

    const raiz = opciones.raiz || contenedor.closest('.sv-hero') || contenedor;
    const seccion = opciones.seccion || contenedor.closest('section') || document.getElementById('servicios');
    const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)');
    const tabs = Array.from(contenedor.querySelectorAll('[role="tab"][data-perfil]'));
    const panel = contenedor.querySelector('[role="tabpanel"]');
    const aviso = contenedor.querySelector('[data-hs="aviso"]');
    const huecos = campo => Array.from(raiz.querySelectorAll(`[data-hs="${campo}"]`));
    const animables = [...huecos('antetitulo'), ...huecos('titulo-1'), ...huecos('titulo-2'), panel].filter(Boolean);
    const quitar = [];
    const on = (el, tipo, fn, opt) => { el.addEventListener(tipo, fn, opt); quitar.push(() => el.removeEventListener(tipo, fn, opt)); };

    // La hoja de estilos llega sin bloquear el primer pintado; si aún no está, que cargue ya
    const hoja = document.getElementById('css-hero-sel');
    if (hoja && hoja.media !== 'all') hoja.media = 'all';

    let actual = null;
    let animacion = 0;

    function escribir(id) {
        const p = PERFILES[id];
        const poner = (campo, texto) => huecos(campo).forEach(el => { if (el.textContent !== texto) el.textContent = texto; });
        poner('antetitulo', p.antetitulo);
        poner('titulo-1', p.titulo[0]);
        poner('titulo-2', p.titulo[1]);
        poner('subtitulo', p.subtitulo);
        poner('plazo', p.plazo);
        poner('plazoDepende', p.plazoDepende);
        poner('prueba', p.prueba);
        [['cta', p.cta], ['cta2', p.cta2]].forEach(([campo, c]) => {
            poner(campo, c.texto);
            huecos(campo).forEach(el => {
                const enlace = el.closest('a') || el;
                enlace.setAttribute('href', c.href);
                enlace.dataset.accion = c.accion;
                if (c.demo) enlace.dataset.demo = c.demo; else delete enlace.dataset.demo;
            });
        });
        contenedor.style.setProperty('--hs-acc', p.acento);
        contenedor.dataset.perfil = id;
    }

    function marcar(id) {
        tabs.forEach(t => {
            const si = t.dataset.perfil === id;
            t.setAttribute('aria-selected', si ? 'true' : 'false');
            t.tabIndex = si ? 0 : -1;
            if (si && panel) panel.setAttribute('aria-labelledby', t.id);
        });
    }

    // Reserva la altura del perfil más largo: cambiar de perfil nunca empuja lo de abajo
    let reservando = false;
    function reservarAltura() {
        if (reservando || !actual || !raiz.offsetParent) return;
        reservando = true;
        const medir = [huecos('titulo-1')[0], huecos('titulo-2')[0], panel, huecos('antetitulo')[0]]
            .map(el => el && (el.closest('.sv-line') || el)).filter(Boolean);
        medir.forEach(el => { el.style.minHeight = ''; });
        const max = medir.map(() => 0);
        ORDEN.forEach(id => {
            escribir(id);
            medir.forEach((el, k) => { max[k] = Math.max(max[k], el.getBoundingClientRect().height); });
        });
        escribir(actual);
        medir.forEach((el, k) => { el.style.minHeight = max[k] ? `${Math.ceil(max[k])}px` : ''; });
        reservando = false;
    }

    function anunciar(id, origen) {
        const p = PERFILES[id];
        if (aviso && origen !== 'inicio' && origen !== 'url' && origen !== 'sesion') {
            aviso.textContent = `${p.etiqueta}: ${p.titulo.join(' ')} Plazo orientativo, ${p.plazo}.`;
        }
        if (seccion) seccion.dataset.perfil = id;
        guardarSesion(id);
        document.dispatchEvent(new CustomEvent(EVENTO, { detail: { id, perfil: id, nombre: p.etiqueta, origen } }));
    }

    function elegir(id, origen = 'api') {
        id = normalizar(id);
        if (!id || id === actual) return;
        const primera = actual === null;
        actual = id;
        marcar(id);
        if (primera || sinMovimiento.matches || typeof Element.prototype.animate !== 'function') {
            escribir(id);
        } else {
            // Fundido corto con desplazamiento leve; se cambian solo los textos, el bloque no se recrea
            const turno = ++animacion;
            const salida = animables.map(el => el.animate(
                [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px)' }],
                { duration: 110, easing: 'ease-in', fill: 'forwards' }));
            Promise.all(salida.map(a => a.finished.catch(() => {}))).then(() => {
                if (turno !== animacion) return;
                escribir(actual);
                salida.forEach(a => a.cancel());
                animables.forEach(el => el.animate(
                    [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
                    { duration: 200, easing: 'cubic-bezier(.16, 1, .3, 1)' }));
            });
        }
        anunciar(id, origen);
        if (!primera) evento('hero_perfil', { perfil: id, origen });
    }

    /* ---------- Pestañas: ratón, táctil y teclado ---------- */
    tabs.forEach(t => on(t, 'click', e => {
        elegir(t.dataset.perfil, e.detail === 0 ? 'teclado' : 'clic');
    }));
    const tablist = contenedor.querySelector('[role="tablist"]');
    if (tablist) on(tablist, 'keydown', e => {
        const i = tabs.indexOf(document.activeElement);
        if (i < 0) return;
        let j = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = tabs.length - 1;
        if (j === null) return;
        e.preventDefault();
        tabs[j].focus();
        elegir(tabs[j].dataset.perfil, 'teclado');
    });

    /* ---------- Botones de acción ---------- */
    const bajarA = (el, foco) => {
        if (!el) return false;
        el.scrollIntoView({ behavior: sinMovimiento.matches ? 'auto' : 'smooth', block: 'start' });
        if (foco) foco.focus({ preventScroll: true });
        return true;
    };
    const irAlContacto = () => {
        const ok = bajarA(document.getElementById('sv-contact'), document.getElementById('sv-nombre'));
        if (ok) history.replaceState(null, '', '#contacto');
        return ok;
    };
    on(contenedor, 'click', e => {
        const a = e.target.closest('a[data-accion]');
        if (!a || !contenedor.contains(a)) return;
        if (e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // abrir en otra pestaña: que lo haga el navegador
        const accion = a.dataset.accion;
        const tipo = a.classList.contains('hs-cta') ? 'principal' : a.classList.contains('hs-cta2') ? 'secundario' : 'indeciso';
        evento('hero_cta', { perfil: actual, cta: tipo, accion });
        let hecho = false;
        if (accion === 'demos') {
            hecho = bajarA(document.getElementById('sv-deck'));
        } else if (accion === 'demo') {
            // El visor de js/servicios.js se abre con el clic de la tarjeta
            const card = document.querySelector(`.sv-card[data-demo="${a.dataset.demo}"]`);
            if (card) { card.click(); hecho = true; }
        } else if (accion === 'presupuesto') {
            const conf = document.getElementById('sv-configurador');
            hecho = conf ? bajarA(conf, conf.querySelector('input, select, button, [tabindex]')) : irAlContacto();
        } else if (accion === 'contacto') {
            hecho = irAlContacto();
        }
        if (hecho) e.preventDefault();
    });

    /* ---------- Altura reservada al hacerse visible y al cambiar de ancho ---------- */
    let ancho = 0;
    let ro = null;
    if (typeof ResizeObserver === 'function') {
        ro = new ResizeObserver(entradas => {
            const w = Math.round(entradas[0].contentRect.width);
            if (!w || w === ancho) return;
            ancho = w;
            reservarAltura();
        });
        ro.observe(raiz);
    }
    const alCargarFuentes = () => { ancho = 0; reservarAltura(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(alCargarFuentes);

    /* ---------- Hero visto (una vez por carga) ---------- */
    let io = null;
    if (typeof IntersectionObserver === 'function') {
        io = new IntersectionObserver(entradas => {
            if (!entradas.some(en => en.isIntersecting)) return;
            evento('hero_visto', { perfil: actual });
            io.disconnect();
        }, { threshold: 0.5 });
        io.observe(contenedor);
    }

    // Arranque
    const ini = opciones.perfil ? { id: normalizar(opciones.perfil) || DEFECTO, origen: 'inicio' } : perfilInicial();
    elegir(ini.id, ini.origen);
    contenedor.classList.add('is-listo');

    const api = {
        elegir: id => elegir(id, 'api'),
        actual: () => actual,
        destroy() {
            quitar.forEach(f => f());
            if (ro) ro.disconnect();
            if (io) io.disconnect();
            animacion++;
            [huecos('titulo-1')[0], huecos('titulo-2')[0], panel, huecos('antetitulo')[0]]
                .map(el => el && (el.closest('.sv-line') || el)).filter(Boolean)
                .forEach(el => { el.style.minHeight = ''; });
            contenedor.classList.remove('is-listo');
            instancias.delete(contenedor);
        }
    };
    instancias.set(contenedor, api);
    return api;
}

/** Desmonta el selector montado en ese contenedor. */
export function destroy(contenedor) {
    const api = instancias.get(contenedor);
    if (api) api.destroy();
}

// Montaje automático cuando se carga desde index.html
const auto = typeof document !== 'undefined' && document.querySelector('[data-zona="hero-selector"]');
if (auto) init(auto);
