/**
 * ZONA 02 · CATÁLOGO Y CASOS DE USO
 *
 * Se monta en <section id="sv-casos" data-zona="casos-uso"> dentro de
 * #servicios (index.html) y no toca nada fuera de ese contenedor salvo, como
 * respaldo, el formulario de contacto (#sv-contact) cuando nadie atiende un
 * «Quiero algo así».
 *
 * Tres partes:
 *   1. Datos     → casos-uso.json (añadir un trabajo = añadir una entrada)
 *   2. Filtros   → chips Web / 3D / Herramientas + sector, con el filtro en la
 *                  URL (#casos, #casos-web, #casos-3d, #casos-herramientas)
 *   3. Escenas   → vista 3D de los casos destacados con Three.js cargado bajo
 *                  demanda (import() dinámico), creada al acercarse a pantalla,
 *                  máximo dos a la vez y liberada (contexto incluido) al salir
 *
 * Contratos con otras zonas (todo en document):
 *   escucha  'sv:perfil'  detail { id: 'web' | '3d' | 'automatizacion' }
 *            (y sessionStorage 'sv:perfil', texto plano con el id)
 *   lanza    'sv:caso'    detail { id, nombre, categoria, negocio, bloques, origen }
 *            origen 'demo' al abrir una demo, 'catalogo' (cancelable) al pulsar
 *            «Quiero algo así». También se guarda en sessionStorage 'sv:caso'.
 *            Si nadie llama a preventDefault(), baja al formulario de contacto.
 *
 * ?debug en la URL muestra los fps de cada vista 3D.
 */

const RAIZ = document.getElementById('sv-casos');
const SECCION = document.getElementById('servicios');
const DATOS_URL = new URL('./casos-uso.json', import.meta.url);
const THREE_URL = new URL('../../js/vendor/three/three.module.min.js', import.meta.url).href;
const ROUNDED_URL = new URL('../../js/vendor/three/addons/RoundedBoxGeometry.js', import.meta.url).href;

const MAX_ESCENAS = 2;
const DEBUG = new URLSearchParams(location.search).has('debug');
const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)');
const tactil = matchMedia('(pointer: coarse)');
const RE_HASH = /^#casos(?:-(web|3d|herramientas))?$/;

const evento = (nombre, p) => { try { if (window.rpEvento) window.rpEvento(nombre, p); } catch (e) { /* sin analítica */ } };
const leerSesion = k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
const guardarSesion = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* modo privado */ } };

function h(tag, attrs = {}, ...hijos) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style') el.style.cssText = v;
        else el.setAttribute(k, v === true ? '' : v);
    }
    for (const hijo of hijos.flat()) if (hijo != null) el.append(hijo);
    return el;
}

/* Iconos de respaldo por categoría (cuando no hay imagen ni WebGL) */
const ICONOS = {
    web: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="9" width="36" height="28" rx="4"/><path d="M6 16h36M11 12.5h.01M15 12.5h.01M19 12.5h.01M14 23h12M14 29h20"/></svg>',
    '3d': '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 5 41 14.5v19L24 43 7 33.5v-19z"/><path d="M7 14.5 24 24l17-9.5M24 24v19"/></svg>',
    herramientas: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M29 8a9 9 0 0 0-8.3 12.4L8.5 32.6a3.5 3.5 0 0 0 5 5l12.2-12.2A9 9 0 0 0 38 17l-5.6 5.6-5.3-1.7-1.7-5.3L31 10a9 9 0 0 0-2-2z"/></svg>'
};

if (RAIZ) iniciar().catch(err => {
    console.warn('[casos-uso]', err);
    RAIZ.classList.add('svc-error');
    RAIZ.replaceChildren(h('p', { class: 'svc-vacio-texto', text: 'No se ha podido cargar el catálogo. Recarga la página para volver a intentarlo.' }));
});

async function iniciar() {
    const resp = await fetch(DATOS_URL);
    if (!resp.ok) throw new Error(`catálogo ${resp.status}`);
    const datos = await resp.json();
    const casos = datos.casos;
    const categorias = datos.categorias;
    const nombreCat = Object.fromEntries(categorias.map(c => [c.id, c.nombre]));

    const estado = { categoria: 'todos', sector: 'todos', elegidoPorUsuario: false };

    /* ---------------------------------------------------------------- marcado */
    const cabecera = h('header', { class: 'svc-cabecera' },
        h('p', { class: 'svc-eyebrow', text: 'Casos de uso' }),
        h('h3', { class: 'svc-titulo', id: 'svc-titulo' }, 'Trabajos que ', h('em', { text: 'puedes tocar.' })),
        h('p', { class: 'svc-lead', text: 'Cada caso cuenta el problema, lo que se hizo y qué cambia. Los destacados se giran con el dedo; todos se abren y se prueban aquí mismo.' })
    );

    const chips = h('div', { class: 'svc-chips', role: 'group', 'aria-label': 'Filtrar por tipo de trabajo' });
    const opcionesCat = [{ id: 'todos', nombre: 'Todos' }, ...categorias];
    const botonesCat = opcionesCat.map(c => {
        const n = c.id === 'todos' ? casos.length : casos.filter(x => x.categoria === c.id).length;
        const b = h('button', { type: 'button', class: 'svc-chip', 'data-cat': c.id, 'aria-pressed': 'false', title: c.descripcion || 'Todos los trabajos' },
            h('span', { text: c.nombre }), h('span', { class: 'svc-chip-n', text: String(n), 'aria-label': `${n} casos` }));
        b.addEventListener('click', () => filtrar({ categoria: c.id }, true));
        return b;
    });
    chips.append(...botonesCat);

    const sectores = [...new Set(casos.map(c => c.sector))].sort((a, b) => a.localeCompare(b, 'es'));
    const selSector = h('select', { class: 'svc-sector', id: 'svc-sector', 'aria-label': 'Filtrar por sector' },
        h('option', { value: 'todos', text: 'Todos los sectores' }),
        sectores.map(s => h('option', { value: s, text: s })));
    selSector.addEventListener('change', () => filtrar({ sector: selSector.value }, true));

    const contador = h('p', { class: 'svc-contador', role: 'status', 'aria-live': 'polite' });
    const barra = h('div', { class: 'svc-barra' }, chips, h('label', { class: 'svc-sector-wrap' }, selSector), contador);

    const lista = h('ul', { class: 'svc-lista', 'aria-label': 'Casos de uso' });
    const tarjetas = casos.map(c => crearTarjeta(c));
    lista.append(...tarjetas.map(t => t.li));

    const vacio = h('div', { class: 'svc-vacio', hidden: true },
        h('p', { class: 'svc-vacio-titulo', text: '¿No ves tu caso?' }),
        h('p', { class: 'svc-vacio-texto', text: 'Aún no hay un trabajo publicado con ese filtro. Cuéntame qué necesitas y te digo cómo lo haría.' }),
        h('div', { class: 'svc-vacio-acciones' },
            h('button', { type: 'button', class: 'svc-btn svc-btn--sec', 'data-accion': 'limpiar', text: 'Ver todos los casos' }),
            h('a', { class: 'svc-btn', href: '#contacto', 'data-accion': 'contacto', 'data-evento': 'catalogo_vacio_contacto', text: 'Cuéntamelo →' })));
    vacio.querySelector('[data-accion="limpiar"]').addEventListener('click', () => filtrar({ categoria: 'todos', sector: 'todos' }, true));
    vacio.querySelector('[data-accion="contacto"]').addEventListener('click', e => { e.preventDefault(); irAlContacto(null); });

    const dialogo = crearDialogo();

    RAIZ.replaceChildren(cabecera, barra, lista, vacio, dialogo.el);
    RAIZ.classList.add('svc-listo');
    publicarDatosEstructurados(casos, nombreCat);

    /* ----------------------------------------------------------------- tarjeta */
    function crearTarjeta(c) {
        const titId = `svc-t-${c.id}`;
        const media = h('div', { class: 'svc-media' + (c.vista3d ? ' svc-media--3d' : '') });
        const poster = h('div', { class: 'svc-poster' });
        if (c.imagen) {
            poster.append(h('img', { src: c.imagen, alt: `Icono de ${c.titulo}`, loading: 'lazy', decoding: 'async', width: '512', height: '512' }));
        } else {
            poster.innerHTML = ICONOS[c.categoria] || ICONOS.web;
        }
        media.append(poster);
        if (c.vista3d) {
            media.append(h('p', { class: 'svc-pista', 'aria-hidden': 'true', text: (c.demo && c.demo.pista) || 'Arrastra para girar' }));
            media.append(h('p', { class: 'svc-carga', 'aria-hidden': 'true' }, h('span'), 'Cargando 3D…'));
        }

        const meta = h('p', { class: 'svc-meta' },
            h('span', { class: 'svc-cat', text: nombreCat[c.categoria] }),
            h('span', { text: ` · ${c.sector}${c.anio ? ' · ' + c.anio : ''}` }));
        const cuerpo = h('div', { class: 'svc-cuerpo' },
            meta,
            h('h4', { class: 'svc-nombre', id: titId, text: c.titulo }),
            h('p', { class: 'svc-resumen', text: c.resumen }),
            h('p', { class: 'svc-resultado' }, h('strong', { text: c.metrica || 'Resultado' }), ' ', c.resultado),
            h('ul', { class: 'svc-tec', 'aria-label': 'Tecnologías' }, c.tecnologias.map(t => h('li', { text: t }))));

        const probar = h('a', { class: 'svc-btn svc-btn--sec', href: c.demo ? c.demo.url : c.enlace, 'aria-describedby': titId }, 'Probar demo');
        probar.addEventListener('click', e => {
            if (!dialogo.soportado) return; // sin <dialog>: el enlace abre la demo
            e.preventDefault();
            dialogo.abrir(c, probar);
        });
        const quiero = h('button', { type: 'button', class: 'svc-btn', 'aria-describedby': titId }, 'Quiero algo así ', h('span', { 'aria-hidden': 'true', text: '→' }));
        quiero.addEventListener('click', () => quieroAlgoAsi(c));
        cuerpo.append(h('div', { class: 'svc-acciones' }, probar, quiero));

        const art = h('article', { class: 'svc-card' + (c.destacado ? ' svc-card--destacado' : ''), 'aria-labelledby': titId, style: `--acc:${c.acento}` }, media, cuerpo);
        if (c.destacado) art.prepend(h('span', { class: 'svc-badge', text: 'Destacado' }));
        const li = h('li', { 'data-cat': c.categoria, 'data-id': c.id, style: `--svc-vt:svc-${c.id}` }, art);
        if (c.vista3d) escenas.registrar(c, media);
        return { li, caso: c };
    }

    /* ----------------------------------------------------------------- filtros */
    function coincide(c) {
        return (estado.categoria === 'todos' || c.categoria === estado.categoria)
            && (estado.sector === 'todos' || c.sector === estado.sector);
    }

    function filtrar(cambios, porUsuario) {
        Object.assign(estado, cambios);
        if (porUsuario) estado.elegidoPorUsuario = true;
        const aplicar = () => {
            let visibles = 0;
            for (const t of tarjetas) {
                const ok = coincide(t.caso);
                t.li.hidden = !ok;
                if (ok) visibles++;
            }
            botonesCat.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === estado.categoria)));
            selSector.value = estado.sector;
            vacio.hidden = visibles > 0;
            contador.textContent = visibles === 1 ? '1 caso' : `${visibles} casos`;
        };
        // Mantener la barra de filtros donde está aunque cambie la altura del listado
        const antes = barra.getBoundingClientRect().top;
        const fijar = () => { const d = barra.getBoundingClientRect().top - antes; if (porUsuario && Math.abs(d) > 1) window.scrollBy(0, d); };
        if (porUsuario && document.startViewTransition && !sinMovimiento.matches && document.visibilityState === 'visible') {
            document.documentElement.classList.add('svc-vt');
            const vt = document.startViewTransition(() => { aplicar(); fijar(); });
            // Si otro filtrado empieza antes de acabar, el anterior se salta: no es un error
            vt.ready.catch(() => {});
            vt.finished.catch(() => {}).then(() => document.documentElement.classList.remove('svc-vt'));
        } else {
            aplicar();
            fijar();
        }
        if (porUsuario) {
            if (cambios.categoria) evento('catalogo_filtro', { categoria: estado.categoria });
            if (cambios.sector) evento('catalogo_sector', { sector: estado.sector });
            // El filtro en la URL solo cuando se está en Servicios
            if (/^#(servicios|contacto|casos(-[\w]+)?)?$/.test(location.hash)) {
                history.replaceState(null, '', estado.categoria === 'todos' ? '#casos' : `#casos-${estado.categoria}`);
            }
        }
        escenas.revisar();
    }

    /* --------------------------------------------- perfil de la zona 1 (hero) */
    function deperfil(valor) {
        if (!valor) return null;
        let id = valor;
        if (typeof valor === 'string' && valor.trim().startsWith('{')) { try { const o = JSON.parse(valor); id = o.id || o.perfil; } catch (e) { /* texto */ } }
        if (typeof valor === 'object') id = valor.id || valor.perfil;
        return datos.perfiles[String(id || '').toLowerCase()] || null;
    }
    document.addEventListener('sv:perfil', e => {
        const cat = deperfil(e.detail);
        if (cat && !estado.elegidoPorUsuario) filtrar({ categoria: cat, sector: 'todos' }, false);
    });

    /* ------------------------------------------------------------ estado inicial */
    const desdeHash = location.hash.match(RE_HASH);
    if (desdeHash) {
        filtrar({ categoria: desdeHash[1] || 'todos' }, false);
        estado.elegidoPorUsuario = true;
        abrirServiciosYBajar();
    } else {
        const cat = deperfil(leerSesion('sv:perfil')) || deperfil(SECCION && SECCION.dataset.perfil);
        filtrar({ categoria: cat || 'todos' }, false);
    }
    window.addEventListener('hashchange', () => {
        const m = location.hash.match(RE_HASH);
        if (!m) return;
        filtrar({ categoria: m[1] || 'todos', sector: 'todos' }, false);
        estado.elegidoPorUsuario = true;
        abrirServiciosYBajar();
    });

    function abrirServiciosYBajar() {
        const nav = document.querySelector('.nav-item[data-section="servicios"]');
        const abierta = SECCION && !SECCION.classList.contains('content-hidden');
        const hash = location.hash;
        if (!abierta && nav) nav.click();
        history.replaceState(null, '', hash);
        setTimeout(() => RAIZ.scrollIntoView({ behavior: sinMovimiento.matches ? 'auto' : 'smooth', block: 'start' }), abierta ? 0 : 800);
    }

    /* ------------------------------------------------- «Quiero algo así» y demo */
    function detalleCaso(c, origen) {
        return { id: c.id, nombre: c.titulo, categoria: c.categoria, negocio: c.negocio || null, bloques: c.bloques || [], origen };
    }
    function anunciarCaso(c, origen) {
        const detail = detalleCaso(c, origen);
        guardarSesion('sv:caso', JSON.stringify(detail));
        const ev = new CustomEvent('sv:caso', { detail, cancelable: origen === 'catalogo' });
        document.dispatchEvent(ev);
        return ev;
    }
    function quieroAlgoAsi(c) {
        evento('quiero_algo_asi', { caso: c.id, origen: 'catalogo' });
        if (dialogo.abierto()) dialogo.cerrar();
        const ev = anunciarCaso(c, 'catalogo');
        if (!ev.defaultPrevented) irAlContacto(c);
    }

    // Respaldo: el formulario de contacto actual, con el negocio y la idea ya puestos
    function irAlContacto(c) {
        const select = document.getElementById('sv-negocio');
        if (select && c) {
            const op = Array.from(select.options).find(o => o.text === c.negocioFormulario)
                || Array.from(select.options).find(o => o.text === 'Otro');
            if (op) select.value = op.value;
        }
        const mensaje = document.getElementById('sv-mensaje');
        if (mensaje && c && !mensaje.value.trim()) {
            mensaje.value = `Me interesa algo como «${c.titulo}». `;
            mensaje.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const contacto = document.getElementById('sv-contact');
        if (!contacto) return;
        setTimeout(() => {
            contacto.scrollIntoView({ behavior: sinMovimiento.matches ? 'auto' : 'smooth', block: 'start' });
            const nombre = document.getElementById('sv-nombre');
            if (nombre) setTimeout(() => nombre.focus({ preventScroll: true }), 650);
        }, 80);
    }

    /* ------------------------------------------------------------ diálogo demo */
    function crearDialogo() {
        const el = h('dialog', { class: 'svc-dlg', 'aria-labelledby': 'svc-dlg-titulo' });
        const soportado = typeof el.showModal === 'function';
        const frame = h('iframe', { title: 'Demo interactiva', loading: 'lazy' });
        const carga = h('div', { class: 'svc-dlg-carga', 'aria-hidden': 'true' }, h('span'));
        const meta = h('p', { class: 'svc-meta' });
        const titulo = h('h3', { class: 'svc-dlg-titulo', id: 'svc-dlg-titulo' });
        const historia = h('dl', { class: 'svc-historia' });
        const tec = h('ul', { class: 'svc-tec', 'aria-label': 'Tecnologías' });
        const cita = h('blockquote', { class: 'svc-cita', hidden: true });
        const quiero = h('button', { type: 'button', class: 'svc-btn' }, 'Quiero algo así ', h('span', { 'aria-hidden': 'true', text: '→' }));
        const nueva = h('a', { class: 'svc-btn svc-btn--sec', target: '_blank', rel: 'noopener', 'data-evento': 'caso_pantalla_completa' }, 'Pantalla completa ', h('span', { 'aria-hidden': 'true', text: '↗' }));
        const cerrarBtn = h('button', { type: 'button', class: 'svc-dlg-cerrar', 'aria-label': 'Cerrar la demo', text: '✕' });
        el.append(
            h('div', { class: 'svc-dlg-caja' },
                h('div', { class: 'svc-dlg-demo' }, carga, frame),
                h('div', { class: 'svc-dlg-info' }, meta, titulo, historia, tec, cita, h('div', { class: 'svc-acciones' }, quiero, nueva))),
            cerrarBtn);

        let actual = null;
        let origen = null;
        frame.addEventListener('load', () => { if (frame.src && frame.src !== 'about:blank') el.classList.add('is-cargado'); });
        cerrarBtn.addEventListener('click', () => cerrar());
        el.addEventListener('close', () => {
            frame.src = 'about:blank';
            el.classList.remove('is-cargado');
            escenas.pausar('dialogo', false);
            if (origen && origen.isConnected) origen.focus({ preventScroll: true });
            actual = null;
        });
        el.addEventListener('click', e => { if (e.target === el) cerrar(); });
        quiero.addEventListener('click', () => { if (actual) quieroAlgoAsi(actual); });

        function abrir(c, desde) {
            actual = c;
            origen = desde;
            el.style.setProperty('--acc', c.acento);
            meta.replaceChildren(h('span', { class: 'svc-cat', text: nombreCat[c.categoria] }), ` · ${c.sector}`);
            titulo.textContent = c.titulo;
            historia.replaceChildren(
                h('dt', { text: 'El reto' }), h('dd', { text: c.reto }),
                h('dt', { text: 'Lo que se hizo' }), h('dd', { text: c.solucion }),
                h('dt', { text: 'Qué cambia' }), h('dd', {}, c.metrica ? h('strong', { text: c.metrica + ' · ' }) : null, c.resultado));
            tec.replaceChildren(...c.tecnologias.map(t => h('li', { text: t })));
            cita.hidden = !c.testimonio;
            if (c.testimonio) cita.textContent = `«${c.testimonio}»`;
            nueva.href = c.enlace;
            nueva.setAttribute('data-evento-caso', c.id);
            el.classList.remove('is-cargado');
            escenas.pausar('dialogo', true);
            el.showModal();
            frame.src = c.demo.url;
            evento('caso_demo_abierta', { caso: c.id, categoria: c.categoria });
            anunciarCaso(c, 'demo');
            cerrarBtn.focus();
        }
        function cerrar() { if (el.open) el.close(); }
        return { el, soportado, abrir, cerrar, abierto: () => el.open };
    }
}

/* ======================================================================
   GESTOR DE ESCENAS 3D
   ====================================================================== */
const escenas = (() => {
    const registradas = new Map(); // media → { caso, escena|null, visible, ratio }
    const pausas = new Set();
    let threeP = null;
    let webgl = null;

    const hayWebGL = () => {
        if (webgl !== null) return webgl;
        try {
            const c = document.createElement('canvas');
            webgl = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
        } catch (e) { webgl = false; }
        return webgl;
    };
    const cargarThree = () => threeP || (threeP = Promise.all([import(THREE_URL), import(ROUNDED_URL)])
        .then(([THREE, rb]) => ({ THREE, RoundedBoxGeometry: rb.RoundedBoxGeometry })));

    const io = 'IntersectionObserver' in window ? new IntersectionObserver(entradas => {
        for (const en of entradas) {
            const r = registradas.get(en.target);
            if (!r) continue;
            r.visible = en.isIntersecting;
            r.ratio = en.intersectionRatio;
        }
        revisar();
    }, { rootMargin: '240px 0px', threshold: [0, .25, .5, .75, 1] }) : null;

    function registrar(caso, media) {
        registradas.set(media, { caso, escena: null, visible: false, ratio: 0, creando: false });
        if (!hayWebGL() || !io) { media.classList.add('sin-3d'); return; }
        io.observe(media);
    }

    function distanciaAlCentro(media) {
        const r = media.getBoundingClientRect();
        return Math.abs((r.top + r.bottom) / 2 - innerHeight / 2);
    }

    // Decide qué escenas viven: las visibles más cercanas al centro, hasta MAX_ESCENAS
    function revisar() {
        if (!hayWebGL()) return;
        const candidatas = [...registradas.entries()]
            .filter(([m, r]) => r.visible && !m.closest('[hidden]') && !m.classList.contains('sin-3d'))
            .sort((a, b) => distanciaAlCentro(a[0]) - distanciaAlCentro(b[0]))
            .slice(0, MAX_ESCENAS)
            .map(([m]) => m);
        for (const [m, r] of registradas) {
            if (!candidatas.includes(m) && r.escena) { r.escena.liberar(); r.escena = null; }
        }
        for (const m of candidatas) {
            const r = registradas.get(m);
            if (!r.escena && !r.creando) crear(m, r);
        }
        for (const r of registradas.values()) if (r.escena) r.escena.animar(pausas.size === 0 && document.visibilityState === 'visible');
    }

    async function crear(media, r) {
        r.creando = true;
        media.classList.add('is-cargando');
        try {
            const lib = await cargarThree();
            // Puede haber salido de pantalla mientras se descargaba
            if (!r.visible || media.closest('[hidden]')) return;
            r.escena = montarEscena(lib, media, r.caso, () => { r.escena = null; media.classList.add('sin-3d'); });
            revisar();
        } catch (e) {
            console.warn('[casos-uso] 3D', e);
            media.classList.add('sin-3d');
        } finally {
            r.creando = false;
            media.classList.remove('is-cargando');
        }
    }

    function pausar(motivo, si) {
        if (si) pausas.add(motivo); else pausas.delete(motivo);
        revisar();
    }

    document.addEventListener('visibilitychange', revisar);
    if (SECCION) SECCION.addEventListener('sv:visor', e => pausar('visor', !!e.detail));
    addEventListener('scroll', () => { if (!revisar.pendiente) { revisar.pendiente = true; requestAnimationFrame(() => { revisar.pendiente = false; revisar(); }); } }, { passive: true });

    return { registrar, revisar, pausar };
})();

/* Una escena: renderer, cámara, luz, modelo y giro con el dedo */
function montarEscena({ THREE, RoundedBoxGeometry }, media, caso, alPerderContexto) {
    const canvas = document.createElement('canvas');
    canvas.className = 'svc-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    media.prepend(canvas);

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: !tactil.matches, alpha: true, powerPreference: 'low-power' });
    } catch (e) {
        canvas.remove();
        alPerderContexto();
        return null;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, tactil.matches ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const escena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(32, 1, .1, 50);
    camara.position.set(0, 1.1, 6.2);
    camara.lookAt(0, 0, 0);
    escena.add(new THREE.HemisphereLight(0xffffff, 0x30304a, 1.6));
    const sol = new THREE.DirectionalLight(0xffffff, 2.4);
    sol.position.set(3, 5, 4);
    escena.add(sol);
    const contra = new THREE.DirectionalLight(new THREE.Color(caso.acento), 1.2);
    contra.position.set(-4, 2, -3);
    escena.add(contra);

    const grupo = new THREE.Group();
    grupo.add(...modelo(THREE, RoundedBoxGeometry, caso));
    grupo.rotation.x = .35;
    escena.add(grupo);

    /* tamaño */
    const ajustar = () => {
        const w = media.clientWidth, hgt = media.clientHeight;
        if (!w || !hgt) return;
        renderer.setSize(w, hgt, false);
        camara.aspect = w / hgt;
        camara.updateProjectionMatrix();
        pedir();
    };
    const ro = new ResizeObserver(ajustar);
    ro.observe(media);

    /* giro con el dedo (horizontal gira; vertical deja hacer scroll) */
    let arrastre = null, vel = 0;
    const abajo = e => {
        arrastre = { x: e.clientX, y: e.clientY, rx: grupo.rotation.x };
        media.classList.add('is-tocado');
        canvas.setPointerCapture(e.pointerId);
    };
    const mover = e => {
        if (!arrastre) return;
        const dx = e.clientX - arrastre.x;
        const dy = e.clientY - arrastre.y;
        vel = dx * .012;
        grupo.rotation.y += vel;
        grupo.rotation.x = Math.max(-.6, Math.min(1, arrastre.rx + dy * .006));
        arrastre.x = e.clientX;
        pedir();
    };
    const arriba = () => { arrastre = null; };
    canvas.addEventListener('pointerdown', abajo);
    canvas.addEventListener('pointermove', mover);
    canvas.addEventListener('pointerup', arriba);
    canvas.addEventListener('pointercancel', arriba);

    /* contexto perdido: se libera y queda la imagen de respaldo */
    const perdido = e => { e.preventDefault(); liberar(); alPerderContexto(); };
    canvas.addEventListener('webglcontextlost', perdido);

    /* fps en ?debug */
    let fpsEl = null, frames = 0, tFps = performance.now();
    if (DEBUG) { fpsEl = document.createElement('span'); fpsEl.className = 'svc-fps'; media.append(fpsEl); }

    // Bucle de render solo mientras hace falta: con la escena visible y, si se
    // pide menos movimiento, solo durante el gesto y su inercia.
    let animando = false, corriendo = false;
    const reloj = new THREE.Clock();
    const hayMovimiento = () => !sinMovimiento.matches || arrastre || Math.abs(vel) > .0005;
    function cuadro() {
        const dt = Math.min(reloj.getDelta(), .05);
        if (!arrastre) {
            vel *= .92;
            grupo.rotation.y += vel;
            if (!sinMovimiento.matches) grupo.rotation.y += dt * .45;
        }
        renderer.render(escena, camara);
        if (fpsEl) {
            frames++;
            const ahora = performance.now();
            if (ahora - tFps > 500) { fpsEl.textContent = `${Math.round(frames * 1000 / (ahora - tFps))} fps`; frames = 0; tFps = ahora; }
        }
        if (!(animando && hayMovimiento())) { renderer.setAnimationLoop(null); corriendo = false; }
    }
    function pedir() {
        if (!renderer || corriendo) return;
        corriendo = true;
        reloj.getDelta();
        renderer.setAnimationLoop(cuadro);
    }
    function animar(si) {
        if (!renderer || si === animando) return;
        animando = si;
        if (si) pedir();
        else { renderer.setAnimationLoop(null); corriendo = false; }
    }

    media.classList.add('con-3d');
    ajustar();

    function liberar() {
        if (!renderer) return;
        renderer.setAnimationLoop(null);
        ro.disconnect();
        canvas.removeEventListener('webglcontextlost', perdido);
        escena.traverse(o => {
            if (o.geometry) o.geometry.dispose();
            if (o.material) [].concat(o.material).forEach(m => m.dispose());
        });
        renderer.dispose();
        renderer.forceContextLoss();
        renderer = null;
        canvas.remove();
        if (fpsEl) fpsEl.remove();
        media.classList.remove('con-3d', 'is-tocado');
    }

    return { animar, liberar };
}

/* Modelos procedurales ligeros: sin descargas, solo geometría */
function modelo(THREE, RoundedBoxGeometry, caso) {
    const acento = new THREE.Color(caso.acento);
    const oscuro = acento.clone().multiplyScalar(.45);
    const metal = new THREE.MeshStandardMaterial({ color: acento, metalness: .35, roughness: .38 });
    const mate = new THREE.MeshStandardMaterial({ color: oscuro, metalness: .1, roughness: .7 });

    if (caso.vista3d === 'pieza') {
        // Brida mecanizada: disco con agujeros pasantes y cubo central
        const forma = new THREE.Shape();
        forma.absarc(0, 0, 1.25, 0, Math.PI * 2, false);
        const centro = new THREE.Path();
        centro.absarc(0, 0, .38, 0, Math.PI * 2, true);
        forma.holes.push(centro);
        for (let i = 0; i < 6; i++) {
            const a = i / 6 * Math.PI * 2;
            const p = new THREE.Path();
            p.absarc(Math.cos(a) * .86, Math.sin(a) * .86, .13, 0, Math.PI * 2, true);
            forma.holes.push(p);
        }
        const disco = new THREE.ExtrudeGeometry(forma, { depth: .28, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 3, curveSegments: 40 });
        disco.center();
        const d = new THREE.Mesh(disco, metal);
        d.rotation.x = -Math.PI / 2;
        const cubo = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .62, 48, 1, true), metal);
        cubo.position.y = .3;
        const anillo = new THREE.Mesh(new THREE.TorusGeometry(.5, .045, 12, 48), mate);
        anillo.rotation.x = Math.PI / 2;
        anillo.position.y = .62;
        return [d, cubo, anillo];
    }

    if (caso.vista3d === 'peon') {
        const perfil = [
            [0, 0], [.78, 0], [.8, .1], [.72, .18], [.7, .26], [.55, .34], [.5, .42],
            [.36, .5], [.3, .9], [.26, 1.3], [.42, 1.38], [.42, 1.46], [.24, 1.52],
            [.36, 1.68], [.4, 1.86], [.34, 2.04], [.2, 2.16], [0, 2.2]
        ].map(([x, y]) => new THREE.Vector2(x, y));
        const peon = new THREE.Mesh(new THREE.LatheGeometry(perfil, 56), new THREE.MeshStandardMaterial({ color: acento, metalness: .05, roughness: .32 }));
        peon.position.y = -1.1;
        const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, .08, 4), mate);
        base.rotation.y = Math.PI / 4;
        base.position.y = -1.15;
        return [peon, base];
    }

    // 'caja': paquete con precinto y cotas
    const caja = new THREE.Mesh(new RoundedBoxGeometry(1.9, 1.25, 1.35, 4, .06), new THREE.MeshStandardMaterial({ color: acento, metalness: 0, roughness: .8 }));
    const cinta = new THREE.Mesh(new THREE.BoxGeometry(.34, 1.27, 1.37), mate);
    const aristas = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(2.05, 1.4, 1.5)),
        new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: .08, gapSize: .06, transparent: true, opacity: .55 }));
    aristas.computeLineDistances();
    return [caja, cinta, aristas];
}

/* ======================================================================
   DATOS ESTRUCTURADOS (CreativeWork) para que Google entienda el portfolio
   ====================================================================== */
function publicarDatosEstructurados(casos, nombreCat) {
    const base = 'https://rubenpantxo.com/';
    const ld = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        '@id': base + '#casos',
        name: 'Casos de uso de Rubenpantxo',
        itemListElement: casos.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
                '@type': 'CreativeWork',
                '@id': base + '#caso-' + c.id,
                name: c.titulo,
                description: c.resumen,
                url: new URL(c.enlace, base).href,
                genre: nombreCat[c.categoria],
                about: c.sector,
                keywords: [...c.etiquetas, ...c.tecnologias].join(', '),
                dateCreated: c.anio ? String(c.anio) : undefined,
                image: c.imagen ? new URL(c.imagen, base).href : undefined,
                inLanguage: 'es',
                creator: { '@id': base + '#ruben' }
            }
        }))
    };
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'svc-ld';
    s.textContent = JSON.stringify(ld);
    document.head.append(s);
}
