/* =========================================================================
 * Zona 06 · Comunicación y briefing — servicios/zonas/briefing-contacto.js
 * -------------------------------------------------------------------------
 * Asistente paso a paso que sustituye al formulario genérico de #servicios.
 * Se monta solo sobre #sv-contact y no depende de ninguna otra zona:
 *
 *   1. Asistente guiado: una pregunta por pantalla, progreso, volver atrás,
 *      validación en vivo, borrador en sessionStorage y foco accesible.
 *   2. Importación automática: escucha lo que eligen las demás zonas y lo
 *      precarga marcado como «Elegido antes».
 *   3. Lead cualificado: plantilla de briefing, prioridad automática y
 *      origen de la visita (UTM y referer).
 *   4. Flujo de entrada: envío por el canal configurado, antispam,
 *      pantalla de gracias útil y alternativa directa por correo.
 *
 * Contrato con las otras zonas (todas opcionales). Cada zona lanza en
 * `document` un CustomEvent y, si quiere, guarda lo mismo en sessionStorage
 * con la misma clave (JSON) para que se recoja aunque este módulo cargue
 * después:
 *
 *   'sv:perfil'        zona 1  { id, nombre }          id: web | 3d | automatizacion
 *   'sv:caso'          zona 2  { id, nombre }          id: bar | ropa | carne | …
 *   'sv:kit'           zona 3  { id, nombre }
 *   'sv:configuracion' zona 5  { bloques: [{ id, nombre, precio? }],
 *                                total?: número | { min, max }, plazo?, enlace? }
 *
 * Canal de envío: atributo data-envio en #sv-contact
 *   'web3forms' (por defecto si hay clave) · 'mailto' · 'prueba' (no envía nada)
 * ========================================================================= */
(function () {
    'use strict';

    const contacto = document.getElementById('sv-contact');
    if (!contacto || contacto.querySelector('.svb')) return;

    const formViejo = document.getElementById('sv-contact-form');
    const CORREO = 'rubenpantxo@gmail.com';
    const CLAVE_BORRADOR = 'sv:briefing-borrador';
    const CLAVE_ORIGEN = 'sv:origen';
    const RESPUESTA = 'menos de 24 h laborables';

    /* ---------------------------------------------------------------------
     * Utilidades
     * ------------------------------------------------------------------- */
    // Acepta JSON y también texto plano (la zona 1 guarda solo el id)
    const leerSesion = clave => {
        let crudo = null;
        try { crudo = sessionStorage.getItem(clave); } catch (e) { return null; }
        if (crudo == null) return null;
        try { return JSON.parse(crudo); } catch (e) { return crudo; }
    };
    const guardarSesion = (clave, valor) => {
        try { sessionStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* modo privado */ }
    };
    const borrarSesion = clave => {
        try { sessionStorage.removeItem(clave); } catch (e) { /* modo privado */ }
    };
    const evento = (nombre, params) => {
        try { if (window.rpEvento) window.rpEvento(nombre, params || {}); } catch (e) { /* sin analítica */ }
    };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    const euros = n => Number(n).toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €';

    /* ---------------------------------------------------------------------
     * Catálogo de opciones
     * ------------------------------------------------------------------- */
    const OBJETIVOS = [
        { id: 'web', t: 'Una web nueva', d: 'Presencia, reservas o tienda online', icono: '🌐' },
        { id: 'app', t: 'Una app a medida', d: 'Pedidos, gestión interna o clientes', icono: '📱' },
        { id: '3d', t: 'Visualización 3D', d: 'Producto, espacio o configurador', icono: '🧊' },
        { id: 'automatizacion', t: 'Automatizar o usar IA', d: 'Procesos, sensores o Edge AI', icono: '⚙️' },
        { id: 'rediseno', t: 'Mejorar lo que ya tengo', d: 'Rediseño, velocidad o SEO', icono: '✨' },
        { id: 'otro', t: 'Aún no lo tengo claro', d: 'Lo vemos juntos', icono: '💬' }
    ];
    // Los perfiles de la zona 1 se traducen a un objetivo
    const PERFIL_A_OBJETIVO = { web: 'web', app: 'app', '3d': '3d', automatizacion: 'automatizacion', ia: 'automatizacion' };

    const NEGOCIOS = [
        { id: 'bar', t: 'Bar / Restaurante' },
        { id: 'ropa', t: 'Tienda de ropa' },
        { id: 'carne', t: 'Carnicería / Alimentación' },
        { id: 'gym', t: 'Gimnasio / Entrenador' },
        { id: 'super', t: 'Supermercado / Comercio' },
        { id: 'granja', t: 'Granja / Agrario' },
        { id: 'industria', t: 'Industria / Fábrica' },
        { id: 'logistica', t: 'Logística / Transporte' },
        { id: 'otro', t: 'Otro' }
    ];

    const BLOQUES = [
        { id: 'diseno', t: 'Diseño a medida' },
        { id: 'reservas', t: 'Reservas o pedidos online' },
        { id: 'pagos', t: 'Pagos' },
        { id: 'admin', t: 'Panel de administración' },
        { id: 'clientes', t: 'Área de clientes' },
        { id: '3d', t: 'Escena 3D' },
        { id: 'ia', t: 'Asistente con IA' },
        { id: 'integraciones', t: 'Conectar con lo que ya uso' },
        { id: 'idiomas', t: 'Varios idiomas' },
        { id: 'seo', t: 'SEO y analítica' }
    ];

    // Mismos ids que el laboratorio de UI Kits (zona 3)
    const KITS = [
        { id: 'propuesta', t: 'Que me lo propongas tú' },
        { id: 'petardo', t: 'Neobrutalismo' },
        { id: 'bruma', t: 'Glass' },
        { id: 'cota', t: 'Industrial / Técnico' },
        { id: 'maqueta', t: 'Isométrico 3D' },
        { id: 'sereno', t: 'Corporativo sobrio' }
    ];

    const PLAZOS = [
        { id: 'urgente', t: 'Lo antes posible', d: 'Menos de 1 mes' },
        { id: '1-3', t: 'En 1–3 meses', d: 'Con margen para hacerlo bien' },
        { id: '3-6', t: 'En 3–6 meses', d: 'Planificándolo con calma' },
        { id: 'flexible', t: 'Sin fecha', d: 'Estoy explorando' }
    ];

    // Horquillas orientativas: el importe final sale del briefing
    const PRESUPUESTOS = [
        { id: 'p1', t: 'Menos de 1.500 €', max: 1500 },
        { id: 'p2', t: '1.500 – 5.000 €', max: 5000 },
        { id: 'p3', t: '5.000 – 15.000 €', max: 15000 },
        { id: 'p4', t: 'Más de 15.000 €', max: Infinity },
        { id: 'nose', t: 'Aún no lo sé', d: 'Te oriento yo' }
    ];

    const CANALES = [
        { id: 'correo', t: 'Correo' },
        { id: 'llamada', t: 'Llamada de 15 min' },
        { id: 'videollamada', t: 'Videollamada' }
    ];
    const FRANJAS = [
        { id: 'manana', t: 'Mañana (9–14 h)' },
        { id: 'tarde', t: 'Tarde (16–19 h)' },
        { id: 'igual', t: 'Me da igual' }
    ];

    const buscar = (lista, id) => lista.find(o => o.id === id);
    const texto = (lista, id) => (buscar(lista, id) || {}).t || '';

    /* ---------------------------------------------------------------------
     * Estado: borrador + selecciones de otras zonas + origen
     * ------------------------------------------------------------------- */
    const VACIO = {
        ruta: '', objetivo: '', negocio: '', bloques: [], kit: '', plazo: '', presupuesto: '',
        contexto: '', referencias: '', nombre: '', email: '', telefono: '', empresa: '',
        canal: 'correo', franja: '', acepta: false, paso: 0
    };
    // Estado de la interfaz (declarado antes de que las zonas puedan avisar)
    let raiz = null;
    let enviado = false;
    let enviando = false;
    let errores = {};
    let tocados = {};
    let flotante = null;
    let contactoVisible = false;
    const seccion = document.getElementById('servicios');

    const borrador = leerSesion(CLAVE_BORRADOR);
    const estado = Object.assign({}, VACIO, borrador || {});
    // Qué campos vienen de otra zona (para la etiqueta «Elegido antes»)
    const precargado = {};
    let iniciado = !!borrador;
    let avisoBorrador = !!(borrador && borrador.ruta);
    // Lo que han contado las demás zonas, tal cual
    const contextoZonas = { perfil: null, caso: null, kit: null, configuracion: null };

    function capturarOrigen() {
        if (leerSesion(CLAVE_ORIGEN)) return;
        const q = new URLSearchParams(location.search);
        const origen = {};
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(k => {
            const v = q.get(k);
            if (v) origen[k] = v.slice(0, 100);
        });
        if (document.referrer && !document.referrer.startsWith(location.origin)) {
            origen.referer = document.referrer.slice(0, 200);
        }
        origen.entrada = (location.pathname + location.hash).slice(0, 120);
        guardarSesion(CLAVE_ORIGEN, origen);
    }
    capturarOrigen();

    function guardarBorrador() {
        guardarSesion(CLAVE_BORRADOR, estado);
    }

    /* Precarga: solo rellena lo que el visitante no haya tocado ya */
    function aplicarZona(zona, d) {
        if (typeof d === 'string' && d) d = { id: d };
        if (!d || typeof d !== 'object') return;
        contextoZonas[zona] = d;
        if (zona === 'perfil') {
            // El perfil por defecto del hero (origen 'inicio') no es una elección del visitante
            if (d.origen === 'inicio') return;
            const obj = PERFIL_A_OBJETIVO[String(d.id || '').toLowerCase()];
            if (obj && (!estado.objetivo || precargado.objetivo)) {
                estado.objetivo = obj;
                precargado.objetivo = true;
            }
        } else if (zona === 'caso') {
            // Casos de negocio usan los ids de data-demo; el resto puede traer «negocio»
            const id = String(d.id || '').toLowerCase();
            const neg = buscar(NEGOCIOS, id) ? id : String(d.negocio || '').toLowerCase();
            if (buscar(NEGOCIOS, neg) && (!estado.negocio || precargado.negocio)) {
                estado.negocio = neg;
                precargado.negocio = true;
            }
            const cat = { web: 'web', '3d': '3d', herramientas: 'app' }[d.categoria];
            if (cat && !estado.objetivo) {
                estado.objetivo = cat;
                precargado.objetivo = true;
            }
        } else if (zona === 'kit') {
            const id = String(d.id || '').toLowerCase();
            if (!buscar(KITS, id) && d.nombre) KITS.splice(1, 0, { id, t: String(d.nombre).slice(0, 40) });
            if (id && (!estado.kit || precargado.kit)) {
                estado.kit = id;
                precargado.kit = true;
            }
        } else if (zona === 'configuracion') {
            const lista = Array.isArray(d.bloques) ? d.bloques : [];
            const ids = [];
            lista.forEach(b => {
                const id = String((b && (b.id || b.nombre)) || '').toLowerCase().slice(0, 40);
                if (!id) return;
                // Se respeta el nombre que usa el configurador
                const existe = buscar(BLOQUES, id);
                if (existe && b.nombre) existe.t = String(b.nombre).slice(0, 50);
                else if (!existe) BLOQUES.push({ id, t: String(b.nombre || id).slice(0, 50) });
                ids.push(id);
            });
            if (ids.length && (!estado.bloques.length || precargado.bloques)) {
                estado.bloques = ids;
                precargado.bloques = true;
            }
            const max = d.total && typeof d.total === 'object' ? Number(d.total.max) : Number(d.total);
            if (max > 0 && (!estado.presupuesto || precargado.presupuesto)) {
                const banda = PRESUPUESTOS.find(p => p.max && max <= p.max);
                if (banda) {
                    estado.presupuesto = banda.id;
                    precargado.presupuesto = true;
                }
            }
        }
        guardarBorrador();
        actualizarFlotante();
        // Si el visitante ya está en el paso afectado, se repinta sin perder el foco
        if (raiz && !enviado) pintar(false);
    }

    ['perfil', 'caso', 'kit', 'configuracion'].forEach(zona => {
        const guardado = leerSesion('sv:' + zona);
        // La zona 1 guarda también su perfil por defecto ('web'): solo cuenta si es otro
        if (!(zona === 'perfil' && guardado === 'web')) aplicarZona(zona, guardado);
        document.addEventListener('sv:' + zona, e => aplicarZona(zona, e.detail));
    });

    // «Enviar mi proyecto» del configurador y «Quiero algo así» del catálogo:
    // este módulo se encarga de llevar al visitante al briefing
    document.addEventListener('sv:configuracion-enviar', e => {
        if (e.cancelable) e.preventDefault();
        aplicarZona('configuracion', e.detail);
        abrirBriefing('briefing', 'alcance');
    });
    document.addEventListener('sv:caso', e => {
        if (e.detail && e.detail.origen === 'catalogo' && e.cancelable) {
            e.preventDefault();
            abrirBriefing('briefing');
        }
    });
    // Cualquier enlace a #contacto (hero, cabecera…) enfoca el asistente
    document.addEventListener('click', e => {
        const a = e.target.closest && e.target.closest('a[href$="#contacto"]');
        if (!a || !raiz) return;
        setTimeout(enfocarAsistente, reducido() ? 50 : 850);
    });

    // Respaldo mientras la zona 2 no emite su evento: clic en una tarjeta de demo
    document.querySelectorAll('.sv-card[data-demo]').forEach(card => {
        card.addEventListener('click', () => {
            const nombre = card.querySelector('.sv-card-name');
            aplicarZona('caso', { id: card.dataset.demo, nombre: nombre ? nombre.textContent.trim() : card.dataset.demo });
        });
    });

    /* ---------------------------------------------------------------------
     * Pasos
     * ------------------------------------------------------------------- */
    const PASOS_BRIEFING = ['objetivo', 'alcance', 'plazo', 'contexto', 'contacto'];
    const PASOS_LLAMADA = ['contacto'];
    const pasos = () => (estado.ruta === 'llamada' ? PASOS_LLAMADA : PASOS_BRIEFING);

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const TEL_RE = /^[+()\d\s.-]{9,20}$/;
    const enlaces = v => (v.match(/https?:\/\/|www\./gi) || []).length;

    // Cada validador devuelve { campo: 'mensaje' } con lo que falte
    const VALIDAR = {
        objetivo: () => (estado.objetivo ? {} : { objetivo: 'Elige la opción que más se parezca a lo que buscas.' }),
        alcance: () => ({}),
        plazo: () => {
            const e = {};
            if (!estado.plazo) e.plazo = 'Elige un plazo aproximado.';
            if (!estado.presupuesto) e.presupuesto = 'Elige una horquilla o «Aún no lo sé».';
            return e;
        },
        contexto: () => {
            const e = {};
            const v = estado.contexto.trim();
            if (v.length < 20) e.contexto = `Cuéntame un poco más: ${Math.max(0, 20 - v.length)} caracteres más y listo.`;
            else if (enlaces(v) > 2) e.contexto = 'Pon como mucho dos enlaces aquí; el resto, en «Referencias».';
            if (enlaces(estado.referencias) > 3) e.referencias = 'Como mucho tres enlaces de referencia.';
            return e;
        },
        contacto: () => {
            const e = {};
            const n = estado.nombre.trim();
            if (n.length < 2) e.nombre = 'Escribe tu nombre (al menos 2 letras).';
            else if (/https?:|www\.|[<>]/i.test(n)) e.nombre = 'El nombre no puede llevar enlaces ni símbolos < >.';
            const m = estado.email.trim();
            if (!m) e.email = 'Escribe tu correo para poder responderte.';
            else if (!EMAIL_RE.test(m)) e.email = 'Revisa el correo: debe tener la forma nombre@dominio.com.';
            const t = estado.telefono.trim();
            const pideTel = estado.ruta === 'llamada' || estado.canal === 'llamada';
            if (pideTel && !t) e.telefono = 'Déjame un teléfono para poder llamarte.';
            else if (t && !TEL_RE.test(t)) e.telefono = 'Revisa el teléfono: solo números, espacios y +.';
            if (!estado.acepta) e.acepta = 'Marca la casilla para poder enviarlo.';
            return e;
        }
    };

    /* ---------------------------------------------------------------------
     * Calificación del lead (prioridad alta / media / baja)
     * Puntos: presupuesto (0–3) + plazo (1–2) + encaje (0–3)
     * ------------------------------------------------------------------- */
    function calificar() {
        const pPres = { p1: 0, p2: 2, p3: 3, p4: 3, nose: 1 }[estado.presupuesto] || 0;
        const pPlazo = { urgente: 1, '1-3': 2, '3-6': 2, flexible: 1 }[estado.plazo] || 0;
        let encaje = 0;
        if (estado.objetivo && estado.objetivo !== 'otro') encaje++;
        if (estado.contexto.trim().length >= 120 || estado.bloques.length >= 2) encaje++;
        if (contextoZonas.configuracion || contextoZonas.kit || estado.telefono.trim()) encaje++;
        const puntos = pPres + pPlazo + encaje;
        const prioridad = puntos >= 6 ? 'alta' : puntos >= 4 ? 'media' : 'baja';
        return { prioridad, puntos };
    }

    /* ---------------------------------------------------------------------
     * Plantilla del briefing (lo que recibe Rubén)
     * ------------------------------------------------------------------- */
    function construirBriefing() {
        const { prioridad, puntos } = calificar();
        const conf = contextoZonas.configuracion;
        const origen = leerSesion(CLAVE_ORIGEN) || {};
        const bloques = estado.bloques.map(id => texto(BLOQUES, id) || id);
        const totalConf = conf && conf.total
            ? (typeof conf.total === 'object' ? `${euros(conf.total.min)} – ${euros(conf.total.max)}` : euros(conf.total))
            : '';
        const campos = [
            ['Prioridad', `${prioridad.toUpperCase()} (${puntos}/8)`],
            ['Ruta', estado.ruta === 'llamada' ? 'Prefiere hablar (llamada corta)' : 'Briefing completo'],
            ['Perfil (zona 1)', contextoZonas.perfil && (contextoZonas.perfil.nombre || contextoZonas.perfil.id)],
            ['Objetivo', texto(OBJETIVOS, estado.objetivo)],
            ['Tipo de negocio', texto(NEGOCIOS, estado.negocio)],
            ['Caso de referencia (zona 2)', contextoZonas.caso && (contextoZonas.caso.nombre || contextoZonas.caso.id)],
            ['Bloques', bloques.join(', ')],
            ['Estilo / UI Kit', texto(KITS, estado.kit)],
            ['Configuración (zona 5)', totalConf && `${totalConf}${conf.plazo ? ' · ' + conf.plazo : ''}`],
            ['Enlace a la configuración', conf && conf.enlace],
            ['Mantenimiento (zona 5)', conf && conf.mensual && conf.mensual.max ? `${euros(conf.mensual.min)} – ${euros(conf.mensual.max)} / mes` : ''],
            ['Resumen del configurador', conf && typeof conf.texto === 'string' ? conf.texto.slice(0, 1500) : ''],
            ['Plazo', texto(PLAZOS, estado.plazo)],
            ['Presupuesto', texto(PRESUPUESTOS, estado.presupuesto)],
            ['Contexto', estado.contexto.trim()],
            ['Referencias', estado.referencias.trim()],
            ['Nombre', estado.nombre.trim()],
            ['Empresa', estado.empresa.trim()],
            ['Correo', estado.email.trim()],
            ['Teléfono', estado.telefono.trim()],
            ['Prefiere', texto(CANALES, estado.canal) + (estado.franja ? ' · ' + texto(FRANJAS, estado.franja) : '')],
            ['Origen', [origen.utm_source, origen.utm_medium, origen.utm_campaign].filter(Boolean).join(' / ') || origen.referer || 'directo'],
            ['Página de entrada', origen.entrada]
        ].filter(([, v]) => v);
        const textoPlano = campos.map(([k, v]) => `${k}: ${v}`).join('\n');
        const asunto = `[${prioridad.toUpperCase()}] Briefing · ${texto(OBJETIVOS, estado.objetivo) || 'Llamada'}`
            + `${estado.negocio ? ' · ' + texto(NEGOCIOS, estado.negocio) : ''} (${estado.nombre.trim() || 'sin nombre'})`;
        return { campos, textoPlano, asunto, prioridad, origen };
    }

    /* ---------------------------------------------------------------------
     * Canales de envío
     * ------------------------------------------------------------------- */
    const claveInput = formViejo && formViejo.querySelector('input[name="access_key"]');
    const accessKey = ((claveInput && claveInput.value) || '').trim();
    const hayClave = accessKey && accessKey !== 'TU_CLAVE_DE_WEB3FORMS_AQUI';
    const modoEnvio = contacto.dataset.envio || (hayClave ? 'web3forms' : 'mailto');

    function urlMailto(b) {
        return `mailto:${CORREO}?subject=${encodeURIComponent(b.asunto)}`
            + `&body=${encodeURIComponent('Hola Rubén,\n\n' + b.textoPlano + '\n\n¿Hablamos?\n')}`;
    }

    async function enviar(b) {
        if (modoEnvio === 'prueba') {
            console.info('[briefing] modo prueba, no se envía nada:\n' + b.textoPlano);
            return 'prueba';
        }
        if (modoEnvio === 'mailto') {
            location.href = urlMailto(b);
            return 'mailto';
        }
        const datos = {
            access_key: accessKey,
            subject: b.asunto,
            from_name: 'Briefing de Servicios — rubenpantxo.com',
            name: estado.nombre.trim(),
            email: estado.email.trim(),
            botcheck: ''
        };
        b.campos.forEach(([k, v]) => { datos[k] = v; });
        datos.acepta_privacidad = 'sí';
        const r = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(datos)
        });
        const json = await r.json();
        if (!json.success) throw new Error(json.message || 'Error desconocido');
        return 'web3forms';
    }

    /* Antispam invisible: honeypot + tiempo mínimo + interacción real */
    const TIEMPO_MINIMO_MS = 4000;
    let inicio = 0;
    let interacciones = 0;

    /* ---------------------------------------------------------------------
     * Interfaz
     * ------------------------------------------------------------------- */

    function opciones(nombre, lista, valor, { multiple = false, marca = false, columnas = '' } = {}) {
        const tipo = multiple ? 'checkbox' : 'radio';
        const sel = multiple ? valor : [valor];
        return `<div class="svb-opciones ${columnas}" role="${multiple ? 'group' : 'radiogroup'}" aria-labelledby="svb-q-${nombre}"${errores[nombre] ? ` aria-describedby="svb-err-${nombre}"` : ''}>`
            + lista.map(o => {
                const on = sel.includes(o.id);
                return `<label class="svb-op${on ? ' is-on' : ''}">`
                    + `<input type="${tipo}" name="${nombre}" value="${esc(o.id)}"${on ? ' checked' : ''}>`
                    + (o.icono ? `<span class="svb-op-ico" aria-hidden="true">${o.icono}</span>` : '')
                    + `<span class="svb-op-txt"><span class="svb-op-t">${esc(o.t)}</span>`
                    + (o.d ? `<span class="svb-op-d">${esc(o.d)}</span>` : '')
                    + (on && marca ? '<span class="svb-antes">Elegido antes</span>' : '')
                    + `</span>`
                    + `</label>`;
            }).join('')
            + `</div>${error(nombre)}`;
    }

    function error(nombre) {
        return `<p class="svb-error" id="svb-err-${nombre}" role="alert">${errores[nombre] ? esc(errores[nombre]) : ''}</p>`;
    }

    function campo(nombre, etiqueta, attrs, { area = false, ayuda = '' } = {}) {
        const v = esc(estado[nombre]);
        const inv = errores[nombre] ? ' aria-invalid="true"' : '';
        const desc = `aria-describedby="svb-err-${nombre}${ayuda ? ` svb-ayuda-${nombre}` : ''}"`;
        const control = area
            ? `<textarea id="svb-${nombre}" name="${nombre}" ${attrs} ${desc}${inv}>${v}</textarea>`
            : `<input id="svb-${nombre}" name="${nombre}" value="${v}" ${attrs} ${desc}${inv}>`;
        return `<div class="svb-campo"><label for="svb-${nombre}">${etiqueta}</label>${control}`
            + (ayuda ? `<p class="svb-ayuda" id="svb-ayuda-${nombre}">${ayuda}</p>` : '')
            + `${error(nombre)}</div>`;
    }

    function resumenEditable() {
        if (estado.ruta === 'llamada') return '';
        const filas = [
            ['objetivo', 'Objetivo', [texto(OBJETIVOS, estado.objetivo), texto(NEGOCIOS, estado.negocio)].filter(Boolean).join(' · ')],
            ['alcance', 'Alcance y estilo', [estado.bloques.map(id => texto(BLOQUES, id) || id).join(', '), texto(KITS, estado.kit)].filter(Boolean).join(' · ') || 'Lo vemos juntos'],
            ['plazo', 'Plazo y presupuesto', [texto(PLAZOS, estado.plazo), texto(PRESUPUESTOS, estado.presupuesto)].filter(Boolean).join(' · ')],
            ['contexto', 'Tu proyecto', estado.contexto.trim().slice(0, 140) + (estado.contexto.trim().length > 140 ? '…' : '')]
        ];
        return `<div class="svb-resumen"><p class="svb-resumen-t">Tu proyecto, de un vistazo</p><dl>`
            + filas.map(([paso, k, v]) => `<div><dt>${k}</dt><dd>${esc(v || '—')}</dd>`
                + `<button type="button" class="svb-editar" data-ir="${paso}" aria-label="Cambiar ${k.toLowerCase()}">Cambiar</button></div>`).join('')
            + `</dl></div>`;
    }

    const PANTALLAS = {
        objetivo: () => `
            <h4 class="svb-q" id="svb-q-objetivo" tabindex="-1">¿Qué quieres conseguir?</h4>
            <p class="svb-sub">Elige lo que más se parezca. Podrás matizarlo después.</p>
            ${opciones('objetivo', OBJETIVOS, estado.objetivo, { marca: precargado.objetivo, columnas: 'svb-2col' })}
            <h5 class="svb-q2" id="svb-q-negocio">¿Para qué tipo de negocio? <span class="svb-opc">opcional</span></h5>
            ${opciones('negocio', NEGOCIOS, estado.negocio, { marca: precargado.negocio, columnas: 'svb-chips' })}`,
        alcance: () => `
            <h4 class="svb-q" id="svb-q-bloques" tabindex="-1">¿Qué debería incluir?</h4>
            <p class="svb-sub">${precargado.bloques ? 'He rellenado lo que elegiste en el configurador. Cámbialo si quieres.' : 'Marca lo que creas que necesitas. Si dudas, déjalo en blanco.'}</p>
            ${opciones('bloques', BLOQUES, estado.bloques, { multiple: true, marca: precargado.bloques, columnas: 'svb-chips' })}
            <h5 class="svb-q2" id="svb-q-kit">¿Qué estilo te gusta? <span class="svb-opc">opcional</span></h5>
            ${opciones('kit', KITS, estado.kit, { marca: precargado.kit, columnas: 'svb-chips' })}`,
        plazo: () => {
            const conf = contextoZonas.configuracion;
            const total = conf && conf.total
                ? (typeof conf.total === 'object' ? `${euros(conf.total.min)} – ${euros(conf.total.max)}` : euros(conf.total)) : '';
            return `
            <h4 class="svb-q" id="svb-q-plazo" tabindex="-1">¿Para cuándo lo necesitas?</h4>
            ${opciones('plazo', PLAZOS, estado.plazo, { columnas: 'svb-2col' })}
            <h5 class="svb-q2" id="svb-q-presupuesto">¿Con qué presupuesto cuentas?</h5>
            ${total ? `<p class="svb-sub">Tu configuración sale por unos <strong>${esc(total)}</strong>.</p>` : '<p class="svb-sub">Es orientativo: me ayuda a proponerte lo que mejor encaja.</p>'}
            ${opciones('presupuesto', PRESUPUESTOS, estado.presupuesto, { marca: precargado.presupuesto, columnas: 'svb-chips' })}`;
        },
        contexto: () => `
            <h4 class="svb-q" id="svb-q-contexto" tabindex="-1"><label for="svb-contexto">Cuéntame tu proyecto</label></h4>
            <p class="svb-sub">Qué haces, a quién va dirigido y qué te gustaría que pasara. Con tus palabras.</p>
            <div class="svb-campo">
                <textarea id="svb-contexto" name="contexto" rows="5" maxlength="2000" required
                    placeholder="Ej.: Tengo un bar con terraza y quiero que la gente reserve mesa y vea la carta desde el móvil…"
                    aria-describedby="svb-err-contexto svb-cont-contexto"${errores.contexto ? ' aria-invalid="true"' : ''}>${esc(estado.contexto)}</textarea>
                <p class="svb-contador" id="svb-cont-contexto" aria-live="off">${estado.contexto.length} / 2000</p>
                ${error('contexto')}
            </div>
            ${campo('referencias', 'Webs que te gusten o tu web actual <span class="svb-opc">opcional</span>',
                'type="text" maxlength="400" inputmode="url" placeholder="Ej.: https://mi-bar.es, https://una-que-me-gusta.com"')}
            <p class="svb-ayuda">¿Tienes logo, fotos o un documento? Mándamelos cuando te responda, sin prisa.</p>`,
        contacto: () => {
            const llamada = estado.ruta === 'llamada';
            return `
            ${resumenEditable()}
            <h4 class="svb-q" id="svb-q-contacto" tabindex="-1">${llamada ? 'Te llamo yo, ¿dónde y cuándo?' : '¿Dónde te respondo?'}</h4>
            <p class="svb-sub">${llamada ? 'Una llamada de 15 minutos, sin compromiso, para entender lo que necesitas.' : `Te respondo yo, en ${RESPUESTA}.`}</p>
            <div class="svb-grid2">
                ${campo('nombre', 'Tu nombre', 'type="text" autocomplete="name" maxlength="80" required placeholder="Ej.: María"')}
                ${campo('email', 'Tu correo', 'type="email" autocomplete="email" inputmode="email" maxlength="120" required placeholder="maria@ejemplo.com"')}
                ${campo('telefono', `Teléfono${llamada || estado.canal === 'llamada' ? '' : ' <span class="svb-opc">opcional</span>'}`, `type="tel" autocomplete="tel" inputmode="tel" maxlength="20" placeholder="600 000 000"${llamada ? ' required' : ''}`)}
                ${campo('empresa', 'Negocio o empresa <span class="svb-opc">opcional</span>', 'type="text" autocomplete="organization" maxlength="80"')}
            </div>
            ${llamada ? '' : `<h5 class="svb-q2" id="svb-q-canal">¿Cómo prefieres seguir?</h5>${opciones('canal', CANALES, estado.canal, { columnas: 'svb-chips' })}`}
            ${llamada || estado.canal !== 'correo' ? `<h5 class="svb-q2" id="svb-q-franja">¿A qué hora te viene mejor?</h5>${opciones('franja', FRANJAS, estado.franja, { columnas: 'svb-chips' })}` : ''}
            <label class="svb-acepto">
                <input type="checkbox" name="acepta" id="svb-acepta"${estado.acepta ? ' checked' : ''} aria-describedby="svb-err-acepta"${errores.acepta ? ' aria-invalid="true"' : ''}>
                <span>He leído la <a href="legal/privacidad.html" target="_blank" rel="noopener">política de privacidad</a> y acepto que uses mis datos para responderme.</span>
            </label>
            ${error('acepta')}
            <input type="text" name="sitio_web" class="svb-trampa" tabindex="-1" autocomplete="off" aria-hidden="true">
            <p class="svb-legal"><strong>Responsable:</strong> Rubén Aguado Alonso. <strong>Finalidad:</strong> responder a tu solicitud. <strong>Destinatarios:</strong> nadie más, salvo Web3Forms, que me reenvía el mensaje. <strong>Derechos:</strong> acceso, rectificación y supresión en ${CORREO}.</p>`;
        }
    };

    function pantallaInicio() {
        return `
            <div class="svb-hola">
                <span class="svb-avatar" aria-hidden="true">R</span>
                <div>
                    <h4 class="svb-q" tabindex="-1">Cuéntame tu proyecto, te respondo yo.</h4>
                    <p class="svb-sub">Soy Rubén. Leo cada mensaje personalmente y te contesto en ${RESPUESTA}.</p>
                </div>
            </div>
            ${hayPrecarga() ? `<p class="svb-aviso">✓ Ya tengo lo que elegiste más arriba: ${esc(listaPrecarga())}. Lo verás rellenado.</p>` : ''}
            <div class="svb-rutas">
                <button type="button" class="svb-ruta svb-ruta--main" data-ruta="briefing">
                    <span class="svb-ruta-t">Contarte mi proyecto</span>
                    <span class="svb-ruta-d">5 pasos cortos · unos 2 minutos · recibes propuesta</span>
                </button>
                <button type="button" class="svb-ruta" data-ruta="llamada">
                    <span class="svb-ruta-t">Prefiero hablar</span>
                    <span class="svb-ruta-d">Te llamo 15 minutos cuando te venga bien</span>
                </button>
                <a class="svb-ruta" data-ruta="mensaje" href="${esc(urlMailto(construirBriefing()))}">
                    <span class="svb-ruta-t">Escribirte directamente</span>
                    <span class="svb-ruta-d">Abre tu correo con un mensaje ya empezado</span>
                </a>
            </div>
`;
    }

    function hayPrecarga() {
        return Object.keys(precargado).some(k => precargado[k]);
    }
    function listaPrecarga() {
        const l = [];
        if (precargado.objetivo) l.push(texto(OBJETIVOS, estado.objetivo).toLowerCase());
        if (precargado.negocio) l.push(texto(NEGOCIOS, estado.negocio));
        if (precargado.kit) l.push('estilo ' + texto(KITS, estado.kit));
        if (precargado.bloques) l.push(estado.bloques.length + ' bloques del configurador');
        return l.join(', ');
    }

    function pantallaGracias(b, canal) {
        const nombre = esc(estado.nombre.trim().split(' ')[0] || '');
        const titulo = canal === 'mailto' ? `Casi listo${nombre ? ', ' + nombre : ''}` : `¡Recibido${nombre ? ', ' + nombre : ''}!`;
        const intro = canal === 'mailto'
            ? 'Se ha abierto tu correo con el briefing ya escrito. Solo tienes que pulsar Enviar.'
            : estado.ruta === 'llamada'
                ? `Te llamaré en ${RESPUESTA}${estado.franja && estado.franja !== 'igual' ? ', por la ' + texto(FRANJAS, estado.franja).split(' ')[0].toLowerCase() : ''}.`
                : `Te respondo en ${RESPUESTA}, normalmente antes, con preguntas concretas o una primera propuesta.`;
        return `
            <div class="svb-gracias" role="status">
                <div class="svb-check" aria-hidden="true">✓</div>
                <h4 class="svb-q" tabindex="-1">${titulo}</h4>
                <p class="svb-sub">${intro}</p>
                ${canal === 'prueba' ? '<p class="svb-aviso">Modo prueba: no se ha enviado nada.</p>' : ''}
                <ol class="svb-despues">
                    <li><strong>Leo tu briefing</strong> y miro si encaja con lo que hago.</li>
                    <li><strong>Te escribo</strong> a ${esc(estado.email.trim())} con dudas o una propuesta orientativa.</li>
                    <li><strong>Si hace falta, hablamos</strong> 15 minutos y te paso el presupuesto cerrado.</li>
                </ol>
                <p class="svb-sub">Mientras tanto, puedes ir preparando tu logo, unas fotos y dos o tres webs que te gusten.</p>
                <div class="svb-acciones">
                    <a class="svb-btn svb-btn--sec" href="#servicios" data-accion="casos">Ver más casos</a>
                    <button type="button" class="svb-btn svb-btn--sec" data-accion="copiar">Copiar mi resumen</button>
                    ${canal === 'mailto' ? `<a class="svb-btn" href="${esc(urlMailto(b))}">Volver a abrir el correo</a>` : ''}
                </div>
                <button type="button" class="svb-link" data-accion="nuevo">Empezar otro briefing</button>
            </div>`;
    }

    function plantilla() {
        if (!estado.ruta || estado.paso < 0) {
            return `<div class="svb-cuerpo">${pantallaInicio()}</div>`;
        }
        const lista = pasos();
        const i = Math.min(estado.paso, lista.length - 1);
        const nombrePaso = lista[i];
        const ultimo = i === lista.length - 1;
        const progreso = lista.length > 1
            ? `<div class="svb-progreso">
                    <p class="svb-progreso-t" aria-live="polite">Paso ${i + 1} de ${lista.length}</p>
                    <div class="svb-barra" aria-hidden="true"><span style="width:${((i + 1) / lista.length) * 100}%"></span></div>
               </div>` : '';
        const aviso = avisoBorrador
            ? '<p class="svb-aviso svb-aviso--suave">He recuperado tu borrador. <button type="button" class="svb-link" data-accion="nuevo">Empezar de cero</button></p>' : '';
        return `
            ${aviso}
            ${progreso}
            <div class="svb-cuerpo" data-paso="${nombrePaso}">${PANTALLAS[nombrePaso]()}</div>
            <div class="svb-nav">
                <button type="button" class="svb-btn svb-btn--sec" data-accion="atras">← Atrás</button>
                <button type="submit" class="svb-btn svb-btn--main"${enviando ? ' disabled' : ''}>${ultimo ? (enviando ? 'Enviando…' : estado.ruta === 'llamada' ? 'Pedir mi llamada' : 'Enviar mi proyecto') : 'Siguiente →'}</button>
            </div>
            <p class="svb-estado" role="status" aria-live="polite"></p>`;
    }

    function pintar(enfocar) {
        if (enviado) return;
        const activo = document.activeElement;
        const idActivo = activo && raiz.contains(activo) ? activo.id : '';
        raiz.querySelector('.svb-form').innerHTML = plantilla();
        if (enfocar) {
            const q = raiz.querySelector('.svb-q');
            if (q) q.focus({ preventScroll: true });
        } else if (idActivo) {
            const el = document.getElementById(idActivo);
            if (el) el.focus({ preventScroll: true });
        }
    }

    function irAPaso(n, enfocar = true) {
        avisoBorrador = false;
        estado.paso = n;
        errores = {};
        guardarBorrador();
        pintar(enfocar);
        if (enfocar) {
            const top = raiz.getBoundingClientRect().top;
            if (top < 0) raiz.scrollIntoView({ behavior: reducido() ? 'auto' : 'smooth', block: 'start' });
        }
        if (estado.ruta) evento('briefing_paso', { paso: pasos()[estado.paso] || 'inicio', numero: estado.paso + 1, ruta: estado.ruta });
    }

    function pasoActual() {
        return estado.ruta ? pasos()[Math.min(estado.paso, pasos().length - 1)] : '';
    }

    function revalidar(nombreCampo) {
        // Validación en vivo: solo se muestra el error de lo ya tocado
        const nuevos = VALIDAR[pasoActual()] ? VALIDAR[pasoActual()]() : {};
        const nombres = Object.keys(Object.assign({}, errores, nuevos));
        nombres.forEach(k => {
            if (!tocados[k] && k !== nombreCampo) return;
            const msg = nuevos[k] || '';
            errores[k] = msg;
            if (!msg) delete errores[k];
            const hueco = document.getElementById('svb-err-' + k);
            if (hueco) hueco.textContent = msg;
            const ctl = document.getElementById('svb-' + k);
            if (ctl) ctl.setAttribute('aria-invalid', msg ? 'true' : 'false');
        });
    }

    async function avanzar() {
        const paso = pasoActual();
        const errs = VALIDAR[paso]();
        errores = errs;
        Object.keys(errs).forEach(k => { tocados[k] = true; });
        if (Object.keys(errs).length) {
            pintar(false);
            const primero = Object.keys(errs)[0];
            const destino = document.getElementById('svb-' + primero)
                || raiz.querySelector(`[name="${primero}"]`);
            if (destino) destino.focus();
            const st = raiz.querySelector('.svb-estado');
            if (st) st.textContent = Object.keys(errs).length > 1 ? 'Revisa los campos marcados.' : errs[primero];
            evento('briefing_error', { paso, campo: primero });
            return;
        }
        if (estado.paso < pasos().length - 1) {
            irAPaso(estado.paso + 1);
            return;
        }
        // Último paso: enviar
        const trampa = raiz.querySelector('.svb-trampa');
        // Quien vuelve con un borrador ya demostró ser una persona en otra carga
        const bot = (trampa && trampa.value)
            || (!borrador && (!inicio || Date.now() - inicio < TIEMPO_MINIMO_MS || interacciones < 3));
        const b = construirBriefing();
        if (bot) {
            terminar(b, 'prueba-silenciosa');
            return;
        }
        enviando = true;
        pintar(false);
        try {
            const canal = await enviar(b);
            evento('generate_lead', { metodo: 'briefing', canal, ruta: estado.ruta, prioridad: b.prioridad, objetivo: estado.objetivo || 'llamada' });
            terminar(b, canal);
        } catch (err) {
            enviando = false;
            pintar(false);
            evento('formulario_error', { motivo: String((err && err.message) || err).slice(0, 80) });
            const st = raiz.querySelector('.svb-estado');
            if (st) {
                st.innerHTML = `No se pudo enviar. <a href="${esc(urlMailto(b))}">Mándamelo por correo</a> con todo ya escrito.`;
                st.classList.add('is-error');
            }
        }
    }

    function terminar(b, canal) {
        enviado = true;
        enviando = false;
        borrarSesion(CLAVE_BORRADOR);
        // Un bot ve lo mismo que una persona, para no darle pistas
        raiz.querySelector('.svb-form').innerHTML = pantallaGracias(b, canal === 'prueba-silenciosa' ? 'web3forms' : canal);
        raiz.dataset.briefing = b.textoPlano;
        const q = raiz.querySelector('.svb-q');
        if (q) q.focus({ preventScroll: true });
        raiz.scrollIntoView({ behavior: reducido() ? 'auto' : 'smooth', block: 'nearest' });
        actualizarFlotante();
    }

    function reiniciar() {
        avisoBorrador = false;
        Object.assign(estado, VACIO, { bloques: [] });
        Object.keys(precargado).forEach(k => delete precargado[k]);
        ['perfil', 'caso', 'kit', 'configuracion'].forEach(z => { if (contextoZonas[z]) aplicarZona(z, contextoZonas[z]); });
        enviado = false;
        errores = {};
        tocados = {};
        borrarSesion(CLAVE_BORRADOR);
        estado.ruta = '';
        estado.paso = 0;
        pintar(true);
    }

    /* ---------------------------------------------------------------------
     * Montaje
     * ------------------------------------------------------------------- */
    function montar() {
        raiz = document.createElement('div');
        raiz.className = 'svb';
        raiz.id = 'sv-briefing';
        raiz.innerHTML = '<form class="svb-form" novalidate aria-label="Cuéntame tu proyecto"></form>';
        if (formViejo) {
            formViejo.hidden = true;
            formViejo.setAttribute('aria-hidden', 'true');
            formViejo.after(raiz);
        } else {
            contacto.appendChild(raiz);
        }
        contacto.classList.add('sv-contact--briefing');

        // Expectativas claras junto al titular
        const intro = contacto.querySelector('.sv-contact-intro');
        if (intro && !intro.querySelector('.svb-promesa')) {
            const p = intro.querySelector('p');
            if (p) p.textContent = 'Cuéntamelo en dos minutos y te respondo yo, con una propuesta, en ' + RESPUESTA + '.';
            const lista = document.createElement('ul');
            lista.className = 'svb-promesa';
            lista.innerHTML = '<li>Sin compromiso y sin llamadas comerciales</li>'
                + '<li>Presupuesto cerrado antes de empezar</li>'
                + '<li>Tus datos solo los uso para responderte</li>';
            (intro.querySelector('.sv-contact-links') || p).before(lista);
        }

        const form = raiz.querySelector('.svb-form');

        form.addEventListener('focusin', () => { if (!inicio) inicio = Date.now(); });
        form.addEventListener('pointerdown', () => { interacciones++; });
        form.addEventListener('keydown', () => { interacciones++; });

        form.addEventListener('click', e => {
            const ruta = e.target.closest('[data-ruta]');
            if (ruta) {
                const r = ruta.dataset.ruta;
                if (r === 'mensaje') {
                    evento('briefing_inicio', { ruta: 'mensaje' });
                    evento('generate_lead', { metodo: 'mailto', ruta: 'mensaje' });
                    return; // el enlace mailto sigue su curso
                }
                estado.ruta = r;
                iniciado = true;
                evento('briefing_inicio', { ruta: r });
                irAPaso(0);
                return;
            }
            const ir = e.target.closest('[data-ir]');
            if (ir) {
                irAPaso(pasos().indexOf(ir.dataset.ir));
                return;
            }
            const accion = e.target.closest('[data-accion]');
            if (!accion) return;
            const a = accion.dataset.accion;
            if (a === 'atras') {
                if (estado.paso > 0) irAPaso(estado.paso - 1);
                else { estado.ruta = ''; irAPaso(0); }
            } else if (a === 'copiar') {
                const t = raiz.dataset.briefing || '';
                const ok = () => { accion.textContent = '¡Copiado!'; };
                if (navigator.clipboard) navigator.clipboard.writeText(t).then(ok, () => {});
            } else if (a === 'nuevo') {
                reiniciar();
            }
        });

        form.addEventListener('input', e => {
            const t = e.target;
            if (!t.name || t.classList.contains('svb-trampa')) return;
            if (t.type === 'checkbox' && t.name === 'bloques') {
                estado.bloques = Array.from(form.querySelectorAll('input[name="bloques"]:checked')).map(x => x.value);
                precargado.bloques = false;
                t.closest('.svb-op').classList.toggle('is-on', t.checked);
                const etiqueta = form.querySelectorAll('.svb-opciones [name="bloques"]');
                etiqueta.forEach(x => { const m = x.closest('.svb-op').querySelector('.svb-antes'); if (m) m.remove(); });
            } else if (t.type === 'checkbox') {
                estado[t.name] = t.checked;
                tocados[t.name] = true;
            } else if (t.type === 'radio') {
                estado[t.name] = t.value;
                precargado[t.name] = false;
                tocados[t.name] = true;
                // Repinta para mover la marca y mostrar campos que dependen (franja, teléfono)
                guardarBorrador();
                pintar(false);
                const nuevo = form.querySelector(`input[name="${t.name}"][value="${CSS.escape(t.value)}"]`);
                if (nuevo) nuevo.focus({ preventScroll: true });
                revalidar(t.name);
                return;
            } else {
                estado[t.name] = t.value;
                if (t.name === 'contexto') {
                    const c = document.getElementById('svb-cont-contexto');
                    if (c) c.textContent = `${t.value.length} / 2000`;
                }
            }
            guardarBorrador();
            if (errores[t.name]) revalidar(t.name);
        });

        form.addEventListener('focusout', e => {
            const t = e.target;
            if (!t.name || t.type === 'radio' || t.type === 'checkbox') return;
            if (t.value) { tocados[t.name] = true; revalidar(t.name); }
        });

        form.addEventListener('submit', e => {
            e.preventDefault();
            if (!enviando) avanzar();
        });

        // Abandono por paso (para medir dónde se pierde gente)
        addEventListener('pagehide', () => {
            if (iniciado && !enviado && estado.ruta) evento('briefing_abandono', { paso: pasoActual(), ruta: estado.ruta });
        });

        // Con un borrador a medias se sigue en el mismo paso; si no, portada
        pintar(false);
    }

    /* ---------------------------------------------------------------------
     * Botón flotante «Enviar mi proyecto»: aparece cuando el visitante ya ha
     * elegido algo en otra zona y el briefing no está a la vista
     * ------------------------------------------------------------------- */

    function actualizarFlotante() {
        if (!flotante) return;
        const abierta = !seccion || !seccion.classList.contains('content-hidden');
        const mostrar = abierta && !enviado && !contactoVisible
            && (contextoZonas.configuracion || contextoZonas.kit || (borrador && borrador.ruta));
        flotante.hidden = !mostrar;
    }

    function montarFlotante() {
        flotante = document.createElement('button');
        flotante.type = 'button';
        flotante.className = 'svb-flotante';
        flotante.hidden = true;
        flotante.innerHTML = '<span aria-hidden="true">✉</span> Enviar mi proyecto';
        flotante.addEventListener('click', () => {
            evento('briefing_flotante', {});
            contacto.scrollIntoView({ behavior: reducido() ? 'auto' : 'smooth', block: 'start' });
            setTimeout(() => {
                const q = raiz.querySelector('.svb-q, .svb-ruta');
                if (q) q.focus({ preventScroll: true });
            }, reducido() ? 0 : 500);
        });
        document.body.appendChild(flotante);
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(entradas => {
                contactoVisible = entradas[0].isIntersecting;
                actualizarFlotante();
            }, { threshold: 0.15 }).observe(contacto);
        }
        if (seccion) new MutationObserver(actualizarFlotante).observe(seccion, { attributes: true, attributeFilter: ['class'] });
        actualizarFlotante();
    }

    function enfocarAsistente() {
        const q = raiz && raiz.querySelector('.svb-q, .svb-ruta');
        if (q) q.focus({ preventScroll: true });
    }

    function abrirBriefing(ruta, paso) {
        if (!raiz) return;
        if (enviado) reiniciar();
        estado.ruta = ruta === 'llamada' ? 'llamada' : 'briefing';
        iniciado = true;
        evento('briefing_inicio', { ruta: estado.ruta, desde: paso || 'externo' });
        const n = paso ? Math.max(0, pasos().indexOf(paso)) : 0;
        irAPaso(n, false);
        contacto.scrollIntoView({ behavior: reducido() ? 'auto' : 'smooth', block: 'start' });
        setTimeout(enfocarAsistente, reducido() ? 0 : 600);
    }

    montar();
    montarFlotante();

    // API mínima para pruebas y para que otras zonas puedan abrir el briefing
    window.svBriefing = {
        abrir: abrirBriefing,
        enfocar: enfocarAsistente,
        briefing: () => construirBriefing(),
        modo: modoEnvio
    };
})();
