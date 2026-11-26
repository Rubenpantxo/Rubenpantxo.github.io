// ============================================================
// ZONA 04 · EXPLORADOR DEL ENTREGABLE
// Enseña la carpeta que recibe el cliente al terminar: un árbol
// estilo editor de código (role="tree", teclado completo), un panel
// de vista previa (documento, Markdown y código) y, al lado, las
// garantías, la comparativa y las preguntas frecuentes.
//
// Todo el contenido sale de entregable-datos.json: añadir un archivo
// es añadir un nodo allí, sin tocar este módulo.
//
// Se monta en <div id="sv-entregable"> dentro de #servicios.
// Perfil: botones propios o el evento global
//   document.dispatchEvent(new CustomEvent('sv:perfil', { detail: { perfil: 'web' | '3d' | 'automatizacion' } }))
// que lanza el selector del hero (zona 01). Si el hero eligió antes de
// que esto cargue, se lee data-perfil de #servicios o sessionStorage.
// Analítica: window.rpEvento (js/consentimiento.js), solo con consentimiento.
// ============================================================

const BASE = new URL('./', import.meta.url);
const raiz = document.getElementById('sv-entregable');

if (raiz && !raiz.dataset.montado) {
    raiz.dataset.montado = '1';
    cargarEstilos();
    const empezar = () => iniciar().catch(err => {
        console.warn('[entregable] no se pudo cargar', err);
        raiz.querySelector('.ent-cargando')?.replaceChildren('No se pudo cargar el explorador. Recarga la página para intentarlo de nuevo.');
    });
    // Los datos se piden cuando la zona se acerca a la pantalla.
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(entradas => {
            if (entradas.some(e => e.isIntersecting)) { io.disconnect(); empezar(); }
        }, { rootMargin: '600px 0px' });
        io.observe(raiz);
    } else {
        empezar();
    }
}

function cargarEstilos() {
    if (document.getElementById('css-entregable')) return;
    const link = document.createElement('link');
    link.id = 'css-entregable';
    link.rel = 'stylesheet';
    link.href = new URL('entregable.css', BASE).href;
    document.head.appendChild(link);
}

function evento(nombre, parametros) {
    try { window.rpEvento?.(nombre, { pagina: location.pathname, ...parametros }); } catch { /* sin analítica */ }
}

// ---------- utilidades ----------
const escapar = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function el(tag, attrs = {}, ...hijos) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'html') n.innerHTML = v;
        else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : v);
    }
    for (const h of hijos.flat()) if (h != null) n.append(h);
    return n;
}

const extension = nombre => {
    if (nombre.startsWith('.') || nombre.startsWith('_')) return 'config';
    const m = /\.([a-z0-9]+)$/i.exec(nombre);
    return m ? m[1].toLowerCase() : 'txt';
};

// Icono por tipo: carpeta en SVG y archivos como etiqueta de color,
// como en los editores de código.
const ICONOS = {
    html: ['HTML', '#e8743b'], js: ['JS', '#e5c33a'], mjs: ['JS', '#e5c33a'], css: ['CSS', '#5a9ee8'],
    md: ['MD', '#7fb5ff'], pdf: ['PDF', '#e5534b'], txt: ['TXT', '#9a99a8'], svg: ['SVG', '#f0a33a'],
    glb: ['3D', '#4ce0b3'], blend: ['3D', '#f08a3a'], yml: ['YML', '#c678dd'], config: ['⚙', '#9a99a8'],
    webp: ['IMG', '#4ce0b3'], json: ['{ }', '#e5c33a']
};
function icono(nodo, abierta) {
    if (nodo.tipo === 'carpeta') {
        return el('span', { class: 'ent-ico ent-ico--carpeta', 'aria-hidden': 'true', html: abierta
            ? '<svg viewBox="0 0 24 24"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2h7A1.5 1.5 0 0 1 19 9.5V10H7.2a1.5 1.5 0 0 0-1.4 1L3 18.5z"/><path d="M5.8 11h15.7l-2.8 8H3z" opacity=".75"/></svg>'
            : '<svg viewBox="0 0 24 24"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2h9A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/></svg>' });
    }
    const [txt, color] = ICONOS[extension(nodo.nombre)] || ICONOS.txt;
    return el('span', { class: 'ent-ico ent-ico--archivo', style: `--ico:${color}`, 'aria-hidden': 'true', text: txt });
}

const PARA = {
    cliente: 'Para ti',
    equipo: 'Para tu equipo',
    desarrollador: 'Para un futuro desarrollador'
};

const MODOS = { doc: 'Documento', md: 'Markdown', codigo: 'Código', texto: 'Texto' };

// Markdown mínimo y seguro (se escapa antes de dar formato).
function markdown(texto) {
    const lineas = texto.split('\n');
    let html = '';
    let lista = null;
    let codigo = null;
    const cerrarLista = () => { if (lista) { html += `</${lista}>`; lista = null; } };
    const enLinea = s => escapar(s)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    for (const linea of lineas) {
        if (linea.startsWith('```')) {
            if (codigo === null) { cerrarLista(); codigo = []; }
            else { html += `<pre><code>${escapar(codigo.join('\n'))}</code></pre>`; codigo = null; }
            continue;
        }
        if (codigo !== null) { codigo.push(linea); continue; }
        let m;
        if ((m = /^(#{1,3})\s+(.*)$/.exec(linea))) {
            cerrarLista();
            const n = m[1].length + 3; // # → h4 dentro del panel
            html += `<h${n}>${enLinea(m[2])}</h${n}>`;
        } else if ((m = /^\s*[-*]\s+(.*)$/.exec(linea))) {
            if (lista !== 'ul') { cerrarLista(); html += '<ul>'; lista = 'ul'; }
            html += `<li>${enLinea(m[1])}</li>`;
        } else if ((m = /^\s*\d+\.\s+(.*)$/.exec(linea))) {
            if (lista !== 'ol') { cerrarLista(); html += '<ol>'; lista = 'ol'; }
            html += `<li>${enLinea(m[1])}</li>`;
        } else if ((m = /^>\s?(.*)$/.exec(linea))) {
            cerrarLista();
            html += `<blockquote>${enLinea(m[1])}</blockquote>`;
        } else if (linea.trim()) {
            cerrarLista();
            html += `<p>${enLinea(linea)}</p>`;
        } else {
            cerrarLista();
        }
    }
    cerrarLista();
    if (codigo !== null) html += `<pre><code>${escapar(codigo.join('\n'))}</code></pre>`;
    return html;
}

// ---------- datos ----------
function resolver(arbol, comunes) {
    return arbol.map(n => {
        const nodo = n.ref ? structuredClone(comunes[n.ref]) : { ...n };
        if (!nodo || !nodo.nombre) throw new Error(`Nodo sin nombre o referencia rota: ${JSON.stringify(n)}`);
        if (nodo.hijos) nodo.hijos = resolver(nodo.hijos, comunes);
        return nodo;
    });
}

// ---------- montaje ----------
async function iniciar() {
    const resp = await fetch(new URL('entregable-datos.json', BASE));
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const datos = await resp.json();

    const perfiles = {};
    for (const [id, p] of Object.entries(datos.perfiles)) {
        perfiles[id] = { ...p, id, arbol: resolver(p.arbol, datos.comunes) };
    }
    // Estado por perfil: carpetas abiertas y archivo seleccionado.
    const estados = {};
    const estadoDe = id => {
        if (!estados[id]) {
            const abiertas = new Set();
            const recorrer = (nodos, ruta) => nodos.forEach(n => {
                const r = `${ruta}/${n.nombre}`;
                if (n.tipo === 'carpeta') {
                    if (n.abierta) abiertas.add(r);
                    recorrer(n.hijos || [], r);
                }
            });
            recorrer(perfiles[id].arbol, '');
            abiertas.add(''); // la raíz
            estados[id] = { abiertas, seleccion: '/README.md', foco: null };
        }
        return estados[id];
    };

    let perfilActual = perfiles[datos.perfilPorDefecto] ? datos.perfilPorDefecto : Object.keys(perfiles)[0];
    let archivosAbiertos = 0;
    let vistos = new Set();

    // --- estructura ---
    const vivo = el('p', { class: 'ent-sr', 'aria-live': 'polite' });
    const botonesPerfil = Object.values(perfiles).map(p => el('button', {
        type: 'button', class: 'ent-perfil', 'data-perfil': p.id, 'aria-pressed': 'false',
        onclick: () => ponerPerfil(p.id, 'botones')
    }, p.nombre));
    const resumenPerfil = el('p', { class: 'ent-perfil-resumen' });

    const tituloVentana = el('span', { class: 'ent-win-titulo' });
    const arbol = el('ul', { class: 'ent-tree', role: 'tree', 'aria-label': 'Carpeta del proyecto entregado' });
    const conmutador = el('button', {
        type: 'button', class: 'ent-conmutar', 'aria-expanded': 'false', 'aria-controls': 'ent-lateral',
        onclick: () => abrirLateral(conmutador.getAttribute('aria-expanded') !== 'true')
    }, el('span', { class: 'ent-conmutar-ico', 'aria-hidden': 'true', text: '☰' }), el('span', { class: 'ent-conmutar-txt', text: 'Archivos' }));
    const lateral = el('nav', { class: 'ent-lateral', id: 'ent-lateral', 'aria-label': 'Explorador de archivos' },
        el('p', { class: 'ent-lateral-cab', 'aria-hidden': 'true', text: 'Explorador' }), arbol);

    const pestana = el('div', { class: 'ent-pestana' });
    const migas = el('p', { class: 'ent-migas' });
    const vista = el('div', { class: 'ent-vista', id: 'ent-vista', tabindex: '-1', 'aria-live': 'off' });
    const barraEstado = el('div', { class: 'ent-estado' });
    const editor = el('section', { class: 'ent-editor', 'aria-label': 'Vista previa del archivo' },
        el('div', { class: 'ent-pestanas' }, pestana), migas, vista);

    const ventana = el('div', { class: 'ent-ventana' },
        el('div', { class: 'ent-win-barra' },
            el('span', { class: 'ent-win-luces', 'aria-hidden': 'true' }, el('i'), el('i'), el('i')),
            tituloVentana, conmutador),
        el('div', { class: 'ent-cuerpo' }, lateral, editor),
        barraEstado);

    const cronologia = el('ol', { class: 'ent-crono' });

    raiz.replaceChildren(
        el('header', { class: 'ent-cab' },
            el('p', { class: 'sv-eyebrow', text: 'Lo que te llevas' }),
            el('h3', { class: 'ent-titulo', id: 'ent-titulo', html: 'La carpeta que recibes, <em>abierta antes de empezar.</em>' }),
            el('p', { class: 'ent-intro', text: 'Así es la entrega al terminar un proyecto: código, documentación y guías, todo a tu nombre. Abre las carpetas y mira cualquier archivo.' })),
        el('div', { class: 'ent-perfiles', role: 'group', 'aria-label': 'Tipo de proyecto' }, botonesPerfil),
        resumenPerfil,
        ventana,
        el('div', { class: 'ent-crono-caja' },
            el('h4', { class: 'ent-sub', text: 'Qué recibes y cuándo' }), cronologia),
        garantias(datos),
        vivo
    );
    raiz.setAttribute('aria-labelledby', 'ent-titulo');

    // --- árbol ---
    function filas() { return Array.from(arbol.querySelectorAll('[role="treeitem"]')).filter(f => !f.closest('[role="group"][hidden]')); }

    function pintarArbol() {
        const p = perfiles[perfilActual];
        const est = estadoDe(perfilActual);
        tituloVentana.textContent = p.raiz;
        const crear = (nodos, ruta, nivel) => nodos.map((n, i) => {
            const r = `${ruta}/${n.nombre}`;
            const esCarpeta = n.tipo === 'carpeta';
            const abierta = esCarpeta && est.abiertas.has(r);
            const fila = el('li', {
                role: 'treeitem', class: `ent-nodo ent-nodo--${n.tipo}`, 'data-ruta': r,
                'aria-level': String(nivel), 'aria-setsize': String(nodos.length), 'aria-posinset': String(i + 1),
                'aria-expanded': esCarpeta ? String(abierta) : null,
                'aria-selected': esCarpeta ? null : String(est.seleccion === r),
                tabindex: '-1'
            });
            const etiqueta = el('span', { class: 'ent-fila', style: `--nivel:${nivel}` },
                esCarpeta ? el('span', { class: 'ent-flecha', 'aria-hidden': 'true' }) : el('span', { class: 'ent-flecha ent-flecha--vacia', 'aria-hidden': 'true' }),
                icono(n, abierta),
                el('span', { class: 'ent-nombre', text: n.nombre }));
            fila.append(etiqueta);
            fila._nodo = n;
            if (esCarpeta) {
                const grupo = el('ul', { role: 'group', hidden: !abierta });
                if (n.nota) grupo.append(el('li', { class: 'ent-nota', role: 'none', style: `--nivel:${nivel + 1}`, text: n.nota }));
                grupo.append(...crear(n.hijos || [], r, nivel + 1));
                fila.append(grupo);
            }
            return fila;
        });
        arbol.replaceChildren(...crear(p.arbol, '', 1));
        const objetivo = arbol.querySelector(`[data-ruta="${CSS.escape(est.foco || est.seleccion)}"]`) || filas()[0];
        if (objetivo) objetivo.tabIndex = 0;
    }

    function enfocar(fila) {
        if (!fila) return;
        arbol.querySelectorAll('[role="treeitem"][tabindex="0"]').forEach(f => { f.tabIndex = -1; });
        fila.tabIndex = 0;
        fila.focus();
        estadoDe(perfilActual).foco = fila.dataset.ruta;
    }

    function alternar(fila, abrir) {
        const est = estadoDe(perfilActual);
        const r = fila.dataset.ruta;
        const ahora = abrir ?? fila.getAttribute('aria-expanded') !== 'true';
        if (ahora) est.abiertas.add(r); else est.abiertas.delete(r);
        fila.setAttribute('aria-expanded', String(ahora));
        const grupo = fila.querySelector(':scope > [role="group"]');
        if (grupo) grupo.hidden = !ahora;
        const ico = fila.querySelector(':scope > .ent-fila > .ent-ico');
        ico?.replaceWith(icono(fila._nodo, ahora));
    }

    function seleccionar(fila, { desdeTeclado = false } = {}) {
        const est = estadoDe(perfilActual);
        est.seleccion = fila.dataset.ruta;
        arbol.querySelectorAll('[aria-selected="true"]').forEach(f => f.setAttribute('aria-selected', 'false'));
        fila.setAttribute('aria-selected', 'true');
        mostrar(fila._nodo, fila.dataset.ruta);
        const clave = `${perfilActual}:${fila.dataset.ruta}`;
        if (!vistos.has(clave)) {
            vistos.add(clave);
            archivosAbiertos++;
            evento('entregable_abrir_archivo', { archivo: fila._nodo.nombre, perfil: perfilActual, orden: archivosAbiertos });
        }
        if (estrecho.matches) {
            abrirLateral(false);
            if (!desdeTeclado) vista.focus({ preventScroll: true });
        }
    }

    arbol.addEventListener('click', e => {
        const fila = e.target.closest('[role="treeitem"]');
        if (!fila || e.target.closest('.ent-nota')) return;
        e.stopPropagation();
        enfocar(fila);
        if (fila._nodo.tipo === 'carpeta') alternar(fila);
        else seleccionar(fila);
    });

    arbol.addEventListener('keydown', e => {
        const fila = e.target.closest('[role="treeitem"]');
        if (!fila) return;
        const lista = filas();
        const i = lista.indexOf(fila);
        const esCarpeta = fila._nodo.tipo === 'carpeta';
        const abierta = fila.getAttribute('aria-expanded') === 'true';
        let hecho = true;
        switch (e.key) {
            case 'ArrowDown': enfocar(lista[i + 1]); break;
            case 'ArrowUp': enfocar(lista[i - 1]); break;
            case 'Home': enfocar(lista[0]); break;
            case 'End': enfocar(lista[lista.length - 1]); break;
            case 'ArrowRight':
                if (esCarpeta && !abierta) alternar(fila, true);
                else if (esCarpeta) enfocar(filas()[i + 1]);
                break;
            case 'ArrowLeft':
                if (esCarpeta && abierta) alternar(fila, false);
                else enfocar(fila.parentElement.closest('[role="treeitem"]'));
                break;
            case 'Enter':
            case ' ':
                if (esCarpeta) alternar(fila); else seleccionar(fila, { desdeTeclado: true });
                break;
            case '*': {
                // Abre todas las carpetas hermanas (patrón ARIA de árbol).
                const hermanas = fila.parentElement.querySelectorAll(':scope > [role="treeitem"][aria-expanded="false"]');
                hermanas.forEach(h => alternar(h, true));
                break;
            }
            default:
                // Escribir una letra salta al siguiente nombre que empieza por ella.
                if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    const letra = e.key.toLowerCase();
                    const orden = [...lista.slice(i + 1), ...lista.slice(0, i + 1)];
                    enfocar(orden.find(f => f._nodo.nombre.toLowerCase().startsWith(letra)));
                } else hecho = false;
        }
        if (hecho) e.preventDefault();
    });

    // --- vista previa ---
    let peticion = 0;
    async function mostrar(nodo, ruta) {
        const v = nodo.vista || { modo: 'texto', texto: '' };
        const id = ++peticion;
        const ext = extension(nodo.nombre);
        pestana.replaceChildren(icono(nodo), el('span', { text: nodo.nombre }));
        migas.replaceChildren(...[perfiles[perfilActual].raiz, ...ruta.split('/').filter(Boolean)]
            .flatMap((t, k, a) => [el('span', { text: t }), k < a.length - 1 ? el('span', { class: 'ent-migas-sep', 'aria-hidden': 'true', text: '›' }) : null]).filter(Boolean));

        const ficha = el('div', { class: 'ent-ficha' },
            el('p', { class: 'ent-ficha-desc', text: nodo.desc || '' }),
            nodo.para ? el('p', { class: `ent-para ent-para--${nodo.para}`, text: PARA[nodo.para] || nodo.para }) : null);

        let contenido;
        if (v.modo === 'doc') {
            contenido = el('article', { class: 'ent-doc' },
                el('div', { class: 'ent-doc-hoja' },
                    el('p', { class: 'ent-doc-marca', 'aria-hidden': 'true', text: 'PDF' }),
                    el('h4', { class: 'ent-doc-titulo', text: v.titulo }),
                    el('p', { class: 'ent-doc-sub', text: v.subtitulo }),
                    el('p', { class: 'ent-doc-h', text: 'Índice' }),
                    el('ol', { class: 'ent-doc-indice' }, (v.indice || []).map(t => el('li', { text: t.replace(/^\d+\.\s*/, '') }))),
                    (v.pasos || []).length ? el('p', { class: 'ent-doc-h', text: 'Así se explica cada tarea' }) : null,
                    (v.pasos || []).map((p, k) => el('figure', { class: 'ent-doc-paso' },
                        el('div', { class: 'ent-doc-captura', 'aria-hidden': 'true' },
                            el('span', { class: 'ent-doc-cap-barra' }), el('span', { class: 'ent-doc-cap-bloque' }), el('span', { class: 'ent-doc-cap-dedo', text: String(k + 1) })),
                        el('figcaption', {}, el('strong', { text: p.titulo }), ' ', p.texto)))
                ),
                el('button', {
                    type: 'button', class: 'ent-cta', 'data-evento': 'entregable_pedir_manual', 'data-evento-perfil': perfilActual,
                    onclick: pedirManual
                }, 'Pídeme un manual de ejemplo ', el('span', { 'aria-hidden': 'true', text: '→' })));
        } else if (v.modo === 'md') {
            contenido = el('article', { class: 'ent-md', html: markdown(v.texto || '') });
        } else if (v.modo === 'codigo') {
            const code = el('code', { text: v.texto || '' });
            contenido = el('pre', { class: 'ent-codigo', tabindex: '0', 'aria-label': `Código de ${nodo.nombre}` }, code);
            const lenguaje = v.lenguaje || ext;
            if (['js', 'mjs', 'css', 'html'].includes(lenguaje)) {
                import('./resaltado.js').then(({ resaltar }) => {
                    if (id === peticion) code.innerHTML = resaltar(v.texto || '', lenguaje);
                }).catch(() => { /* sin resaltado: el texto ya está */ });
            }
        } else {
            contenido = el('pre', { class: 'ent-texto', tabindex: '0' }, v.texto || '');
        }
        vista.replaceChildren(ficha, contenido);
        vista.scrollTop = 0;
        barraEstado.replaceChildren(
            el('span', { text: MODOS[v.modo] || 'Texto' }),
            el('span', { text: PARA[nodo.para] || '' }),
            el('span', { class: 'ent-estado-der', text: 'UTF-8 · Español' }));
        vivo.textContent = `Abierto ${nodo.nombre}. ${nodo.desc || ''}`;
    }

    function pedirManual() {
        const contacto = document.getElementById('sv-contact');
        const mensaje = document.getElementById('sv-mensaje');
        if (mensaje && !mensaje.value.trim()) {
            mensaje.value = `Hola, me gustaría ver un manual de ejemplo de un proyecto de tipo «${perfiles[perfilActual].nombre}».`;
            mensaje.dispatchEvent(new Event('input', { bubbles: true }));
        }
        contacto?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        (document.getElementById('sv-nombre') || mensaje)?.focus({ preventScroll: true });
    }

    // --- móvil: el árbol se pliega como lista desplegable ---
    const estrecho = matchMedia('(max-width: 719px)');
    function abrirLateral(abrir) {
        conmutador.setAttribute('aria-expanded', String(abrir));
        ventana.classList.toggle('ent-ventana--lateral', abrir);
        if (abrir) requestAnimationFrame(() => enfocar(arbol.querySelector('[role="treeitem"][tabindex="0"]')));
    }
    const ajustar = () => { if (!estrecho.matches) abrirLateral(false); };
    estrecho.addEventListener?.('change', ajustar);

    // --- perfil ---
    function ponerPerfil(id, origen) {
        if (!perfiles[id]) return;
        const cambia = id !== perfilActual;
        perfilActual = id;
        const p = perfiles[id];
        botonesPerfil.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.perfil === id)));
        resumenPerfil.textContent = p.resumen;
        raiz.dataset.perfil = id;
        pintarArbol();
        const est = estadoDe(id);
        const fila = arbol.querySelector(`[data-ruta="${CSS.escape(est.seleccion)}"]`);
        if (fila) mostrar(fila._nodo, est.seleccion);
        cronologia.replaceChildren(...(p.cronologia || []).map((c, k) => el('li', { class: 'ent-crono-paso', style: `--k:${k}` },
            el('span', { class: 'ent-crono-cuando', text: c.cuando }),
            el('span', { class: 'ent-crono-que', text: c.que }))));
        if (cambia && origen) {
            evento('entregable_perfil', { perfil: id, origen });
            vivo.textContent = `Entrega de un proyecto de ${p.nombre}.`;
        }
    }

    // El hero (zona 01) puede elegir el perfil por nosotros.
    const normalizar = v => {
        const s = String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (perfiles[s]) return s;
        if (s.includes('3d') || s === 'webgl' || s === 'visualizacion') return '3d';
        if (s.includes('autom') || s === 'ia' || s === 'edge') return 'automatizacion';
        if (s.includes('web') || s.includes('app')) return 'web';
        return null;
    };
    document.addEventListener('sv:perfil', e => {
        const id = normalizar(e.detail?.perfil ?? e.detail);
        if (id) ponerPerfil(id, 'hero');
    });
    // Si el hero ya eligió antes de que cargáramos, se lee de su marca
    // en #servicios (data-perfil) o de su sessionStorage 'sv:perfil'.
    const seccion = document.getElementById('servicios')?.dataset || {};
    let deSesion = null;
    try { deSesion = sessionStorage.getItem('sv:perfil'); } catch { /* bloqueado */ }
    const inicial = normalizar(seccion.perfil || seccion.svPerfil || deSesion);
    ponerPerfil(inicial || perfilActual, null);
}

// ---------- garantías, comparativa y preguntas ----------
function garantias(datos) {
    const sellos = el('ul', { class: 'ent-sellos' }, (datos.garantias || []).map((g, k) => el('li', { class: 'ent-sello', style: `--k:${k}` },
        el('span', { class: 'ent-sello-ico', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24"><path d="M12 2.8l7 2.7v5.8c0 4.6-3 8.3-7 9.9-4-1.6-7-5.3-7-9.9V5.5z"/><path d="M8.6 12.2l2.4 2.4 4.6-4.8" fill="none"/></svg>' }),
        el('h5', { class: 'ent-sello-titulo', text: g.titulo }),
        el('p', { class: 'ent-sello-frase', text: g.frase }),
        el('details', { class: 'ent-sello-mas' },
            el('summary', { text: 'Qué incluye' }),
            el('p', {}, el('strong', { text: 'Incluye: ' }), g.incluye),
            g.noIncluye ? el('p', {}, el('strong', { text: 'No incluye: ' }), g.noIncluye) : null))));

    const c = datos.comparativa;
    const tabla = c ? el('div', { class: 'ent-comp' },
        el('table', {},
            el('caption', { text: c.titulo }),
            el('thead', {}, el('tr', {}, el('th', { scope: 'col', text: '' }), el('th', { scope: 'col', text: 'Lo habitual' }), el('th', { scope: 'col', class: 'ent-comp-mia', text: 'Esta entrega' }))),
            el('tbody', {}, c.filas.map(f => el('tr', {},
                el('th', { scope: 'row', text: f.aspecto }),
                el('td', { text: f.habitual }),
                el('td', { class: 'ent-comp-mia', text: f.esta })))))) : null;

    const faq = el('div', { class: 'ent-faq' },
        el('h4', { class: 'ent-sub', text: 'Preguntas frecuentes' }),
        (datos.faq || []).map(q => el('details', { class: 'ent-faq-item', ontoggle: e => { if (e.target.open) evento('entregable_faq', { pregunta: q.p.slice(0, 60) }); } },
            el('summary', { text: q.p }), el('p', { text: q.r }))),
        el('p', { class: 'ent-legal' },
            'Las condiciones exactas se recogen en la propuesta y el contrato de cada proyecto. Consulta también la ',
            el('a', { href: 'legal/privacidad.html', text: 'política de privacidad' }), ' y el ',
            el('a', { href: 'legal/aviso-legal.html', text: 'aviso legal' }), '.'));

    const caja = el('section', { class: 'ent-garantias', 'aria-labelledby': 'ent-garantias-titulo' },
        el('h4', { class: 'ent-sub', id: 'ent-garantias-titulo', text: 'Garantías por escrito' }),
        sellos, tabla, faq);

    // Lectura de garantías (KPI del plan): una vez por visita.
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(es => {
            if (es.some(e => e.isIntersecting)) { io.disconnect(); evento('entregable_ver_garantias', {}); }
        }, { threshold: 0.4 });
        io.observe(sellos);
    }
    return caja;
}
