// Común a las apps públicas (Pantxiko Notes, Rueda, Escenas, Format Explorer).
// Se carga en el <head>, justo después de consentimiento.js, para atrapar
// también los errores del arranque de la app. Hace tres cosas:
//
// 1. Errores: cualquier fallo de JavaScript sin capturar muestra un aviso
//    claro (en vez de dejar la app colgada sin explicación) y se manda a GA4
//    como evento «error_app», solo si el visitante aceptó la analítica. El
//    mensaje se recorta y se le quitan las URL: nunca viaja el contenido del
//    usuario (notas, nombres de archivo…).
// 2. Analítica: rpApp.evento(nombre, parámetros) añade el nombre de la app.
//    Al abrirla se envía «app_abierta».
// 3. PWA: registra el service worker de /apps/ para que se pueda instalar y
//    funcione sin conexión.
//
// El nombre de la app sale de <html data-app="…">.
(function () {
    'use strict';

    const APP = document.documentElement.dataset.app || location.pathname.split('/').pop();
    const MAX_ERRORES = 5;
    let enviados = 0;
    let aviso = null;

    function evento(nombre, parametros) {
        const p = Object.assign({ app: APP }, parametros || {});
        try { if (window.rpEvento) window.rpEvento(nombre, p); } catch (e) { /* sin analítica */ }
    }

    function limpiar(texto) {
        return String(texto == null ? '' : texto)
            .replace(/\b(?:blob:|data:|https?:\/\/|file:\/\/)\S*/g, '[url]')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 120);
    }

    // Ruido de los navegadores que no rompe nada.
    const IGNORAR = /ResizeObserver loop|^Script error\.?$|AbortError|The play\(\) request was interrupted/i;

    function mostrarAviso() {
        if (aviso || !document.body) return;
        const estilo = document.createElement('style');
        estilo.textContent =
            '.rp-fallo{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483001;max-width:520px;margin:0 auto;' +
            'display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px 14px;border-radius:12px;' +
            'background:#fff4f1;color:#5c1606;border:2px solid #8a1c0b;box-shadow:0 8px 24px rgba(0,0,0,.25);' +
            'font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif}' +
            '.rp-fallo p{flex:1 1 220px;margin:0}' +
            '.rp-fallo button{min-height:40px;padding:0 14px;border-radius:9px;border:2px solid #8a1c0b;' +
            'background:#8a1c0b;color:#fff;font:600 14px system-ui,sans-serif;cursor:pointer}' +
            '.rp-fallo button+button{background:transparent;color:#8a1c0b}' +
            '.rp-fallo button:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}';
        document.head.appendChild(estilo);
        aviso = document.createElement('div');
        aviso.className = 'rp-fallo';
        aviso.setAttribute('role', 'alert');
        aviso.innerHTML =
            '<p>Algo ha fallado en la app. Si deja de responder, recárgala: lo que tenías guardado sigue en este navegador.</p>' +
            '<button type="button" data-rp="recargar">Recargar</button>' +
            '<button type="button" data-rp="cerrar">Cerrar</button>';
        aviso.addEventListener('click', e => {
            const b = e.target.closest('button');
            if (!b) return;
            if (b.dataset.rp === 'recargar') location.reload();
            else aviso.hidden = true;
        });
        document.body.appendChild(aviso);
    }

    function fallo(tipo, mensaje, fuente) {
        const m = limpiar(mensaje);
        if (!m || IGNORAR.test(m)) return;
        if (enviados < MAX_ERRORES) {
            enviados++;
            evento('error_app', { tipo, mensaje: m, fuente: limpiar(fuente) });
        }
        mostrarAviso();
    }

    window.addEventListener('error', e => {
        if (e.target && e.target !== window) return; // imágenes o fuentes que no cargan: no rompen la app
        const archivo = (e.filename || '').split('/').pop().split('?')[0];
        fallo('js', e.message, archivo ? archivo + ':' + (e.lineno || 0) : '');
    }, true);
    window.addEventListener('unhandledrejection', e => {
        const r = e.reason;
        fallo('promesa', r && (r.message || r.name) || r, '');
    });

    // Las apps llaman a rpApp.fallo() cuando capturan un error que impide usarlas
    // (por ejemplo, sin WebGL) y ya lo explican ellas mismas en pantalla.
    window.rpApp = {
        evento,
        fallo: (mensaje, fuente) => {
            if (enviados >= MAX_ERRORES) return;
            enviados++;
            evento('error_app', { tipo: 'controlado', mensaje: limpiar(mensaje), fuente: limpiar(fuente) });
        }
    };

    // Tras DOMContentLoaded: consentimiento.js (cargado antes) decide entonces si GA arranca.
    const abierta = () => evento('app_abierta', { incrustada: window.self !== window.top ? 'si' : 'no' });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', abierta);
    else abierta();

    // Service worker: solo en la web publicada o en localhost, y nunca dentro de
    // un iframe (ahí manda la página que lo contiene).
    if ('serviceWorker' in navigator && window.self === window.top && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/apps/sw.js', { scope: '/apps/' }).catch(() => { /* sin modo sin conexión */ });
        });
    }
})();
