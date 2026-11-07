// Service worker de las apps (alcance /apps/). Lo registra js/app.js.
//
// Estrategia «red primero»: con conexión siempre se sirve lo último publicado
// (no hay que acordarse de cambiar ninguna versión al editar una app) y cada
// respuesta buena se guarda; sin conexión se sirve la copia guardada. Así
// Pantxiko Notes, Rueda, Escenas y Format Explorer abren también offline una
// vez visitadas, y se pueden instalar como aplicación.
//
// Solo guarda peticiones GET del propio dominio. Lo de fuera (pdf.js de
// cdnjs, Google Fonts, Google Analytics) pasa sin tocarse.
const CACHE = 'rp-apps-v1';

// Lo mínimo para que cada app abra sin conexión aunque solo se haya visitado
// una vez. El resto (imágenes, fuentes) se guarda al usarse.
const PRECARGA = [
    '/apps/pantxiko-notes.html',
    '/apps/conversor-rueda.html',
    '/apps/format-explorer.html',
    '/apps/escenas/',
    '/apps/escenas/halogen.css',
    '/apps/escenas/escenas.css',
    '/apps/escenas/three.r128.min.js',
    '/apps/escenas/posturas.js',
    '/apps/escenas/encuadre.js',
    '/apps/escenas/prompt.js',
    '/apps/escenas/escena.js',
    '/apps/escenas/ui.js',
    '/js/app.js',
    '/js/consentimiento.js',
    '/CSS/fuentes/fuentes.css'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE)
            // Una a una: si alguna falla (renombrada, sin conexión) no se pierden las demás.
            .then(c => Promise.all(PRECARGA.map(u => c.add(u).catch(() => null))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(claves => Promise.all(claves.filter(k => k.startsWith('rp-apps-') && k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const peticion = e.request;
    if (peticion.method !== 'GET') return;
    const url = new URL(peticion.url);
    if (url.origin !== location.origin) return;

    e.respondWith(
        fetch(peticion)
            .then(respuesta => {
                if (respuesta.ok && respuesta.type === 'basic') {
                    const copia = respuesta.clone();
                    caches.open(CACHE).then(c => c.put(peticion, copia));
                }
                return respuesta;
            })
            .catch(() =>
                caches.match(peticion, { ignoreSearch: peticion.mode === 'navigate' })
                    .then(guardada => guardada || (peticion.mode !== 'navigate' ? Response.error() : new Response(
                        '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
                        '<title>Sin conexión</title><body style="font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem">' +
                        '<h1>Sin conexión</h1><p>Esta página no está guardada en el dispositivo. Vuelve a intentarlo cuando tengas internet.</p>',
                        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
                    )))
            )
    );
});
