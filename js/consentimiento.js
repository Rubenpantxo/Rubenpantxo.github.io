// Banner de cookies y Google Analytics 4 con consentimiento previo.
//
// GA4 no se descarga hasta que el visitante pulsa «Aceptar»: sin elección o
// con «Rechazar» no se carga ningún script de Google ni se escribe ninguna
// cookie. La elección se guarda en localStorage (almacenamiento técnico,
// exento de consentimiento) y se puede cambiar desde cualquier enlace con
// el atributo data-cookies-config (p. ej. «Configurar cookies» del pie).
//
// Dentro de un iframe (las demos de servicios abiertas en el visor de la
// portada) no hace nada: la página que las contiene ya pide el permiso y
// mide la visita.
(function () {
    'use strict';

    const GA_ID = 'G-QDLQVMJHMJ';
    const CLAVE = 'rp-consentimiento-v1';
    const POLITICA = '/legal/cookies.html';

    if (window.self !== window.top) return;

    // Fuera del dominio publicado no se mide (servidor local, vistas previas),
    // salvo que se fuerce con ?ga=1 para probar.
    const PRODUCCION = /(^|\.)rubenpantxo\.com$/.test(location.hostname) ||
        new URLSearchParams(location.search).has('ga');

    function leer() {
        try { return JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { return null; }
    }
    function guardar(analitica) {
        try {
            localStorage.setItem(CLAVE, JSON.stringify({ analitica, fecha: new Date().toISOString() }));
        } catch (e) { /* sin almacenamiento: se volverá a preguntar */ }
    }

    let gaCargado = false;
    function cargarGA() {
        if (!PRODUCCION || gaCargado) return;
        gaCargado = true;
        window['ga-disable-' + GA_ID] = false;
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { window.dataLayer.push(arguments); };
        gtag('consent', 'default', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
        });
        gtag('js', new Date());
        gtag('config', GA_ID);
        const s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
        document.head.appendChild(s);
    }

    // Eventos de conversión. Sin consentimiento no se envía nada: la llamada
    // se ignora. Se usan desde el código (window.rpEvento) o en el marcado con
    // data-evento="nombre" y data-evento-<parámetro>="valor".
    function evento(nombre, parametros) {
        if (!gaCargado || window['ga-disable-' + GA_ID]) return;
        gtag('event', nombre, parametros || {});
    }
    window.rpEvento = evento;
    document.addEventListener('click', e => {
        const el = e.target.closest('[data-evento], a[href^="mailto:"]');
        if (!el) return;
        if (!el.dataset.evento) {
            evento('contacto_email', { pagina: location.pathname });
            return;
        }
        const parametros = { pagina: location.pathname };
        for (const [clave, valor] of Object.entries(el.dataset)) {
            if (clave.startsWith('evento') && clave !== 'evento') {
                parametros[clave.slice(6).toLowerCase()] = valor;
            }
        }
        evento(el.dataset.evento, parametros);
    });

    // Al retirar el consentimiento: se corta el envío y se borran las cookies _ga.
    function retirarGA() {
        window['ga-disable-' + GA_ID] = true;
        if (window.gtag) gtag('consent', 'update', { analytics_storage: 'denied' });
        const dominio = location.hostname.replace(/^www\./, '');
        document.cookie.split(';').forEach(c => {
            const nombre = c.split('=')[0].trim();
            if (!/^_ga/.test(nombre)) return;
            const caduca = '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
            document.cookie = nombre + caduca;
            document.cookie = nombre + caduca + '; domain=.' + dominio;
        });
    }

    const CSS = `
.rp-cookies{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:560px;margin:0 auto;
  background:#fffef6;color:#1f2933;border:2px solid #333;border-radius:14px;box-shadow:4px 4px 0 #333;
  padding:16px 18px;font:15px/1.5 Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
.rp-cookies[hidden]{display:none}
.rp-cookies h2{font:700 1.15rem/1.2 Kalam,"Comic Sans MS",cursive;color:#003366;margin:0 0 6px}
.rp-cookies p{margin:0 0 12px}
.rp-cookies a{color:#003366;font-weight:600;text-decoration:underline}
.rp-cookies-botones{display:flex;gap:10px;flex-wrap:wrap}
.rp-cookies button{flex:1 1 140px;min-height:44px;border-radius:10px;border:2px solid #333;background:#003366;color:#fff;
  font:700 15px/1 Inter,system-ui,sans-serif;cursor:pointer}
.rp-cookies button:hover{background:#00264d}
.rp-cookies button:focus-visible,.rp-cookies a:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}`;

    let banner = null;
    function crearBanner() {
        const estilo = document.createElement('style');
        estilo.textContent = CSS;
        document.head.appendChild(estilo);

        banner = document.createElement('section');
        banner.className = 'rp-cookies';
        banner.setAttribute('aria-labelledby', 'rp-cookies-titulo');
        banner.hidden = true;
        banner.innerHTML =
            '<h2 id="rp-cookies-titulo">¿Aceptas las cookies de analítica?</h2>' +
            '<p>Uso Google Analytics para saber qué partes de la web se visitan. Solo se activa si lo aceptas, ' +
            'y puedes cambiar de opinión cuando quieras. <a href="' + POLITICA + '">Política de cookies</a></p>' +
            '<div class="rp-cookies-botones">' +
            '<button type="button" data-eleccion="no">Rechazar</button>' +
            '<button type="button" data-eleccion="si">Aceptar</button>' +
            '</div>';
        banner.addEventListener('click', e => {
            const boton = e.target.closest('button[data-eleccion]');
            if (!boton) return;
            const acepta = boton.dataset.eleccion === 'si';
            guardar(acepta);
            if (acepta) cargarGA(); else retirarGA();
            banner.hidden = true;
        });
        document.body.appendChild(banner);
    }

    // Solo se enfoca al abrirlo a petición: al cargar la página no se roba el foco.
    function mostrar(enfocar) {
        if (!banner) crearBanner();
        banner.hidden = false;
        if (enfocar) banner.querySelector('button').focus({ preventScroll: true });
    }

    function iniciar() {
        const estado = leer();
        if (estado && estado.analitica) cargarGA();
        if (!estado) mostrar(false);
        document.addEventListener('click', e => {
            const enlace = e.target.closest('[data-cookies-config]');
            if (!enlace) return;
            e.preventDefault();
            mostrar(true);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
})();
