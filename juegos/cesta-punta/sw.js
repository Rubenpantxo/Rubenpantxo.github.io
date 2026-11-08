/* Service worker de Cesta Punta: hace el juego instalable y jugable sin conexión.
   - Archivos del juego: se sirven desde la caché y se actualizan en segundo plano
     (la versión nueva se ve la siguiente vez que se abre el juego).
   - Librerías de CDN y fuentes de Google: caché primero (sus URL llevan versión fija).
   Al cambiar la lista de archivos, sube VERSION para que se rehaga la caché. */
const VERSION = 'cesta-punta-v1';
const LOCAL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './modelos/cesta_punta_lowpoly.js',
  './fuentes/fuentes_vascas.js',
  './escudos/escudos.js',
  './escudos/club_cabanillas.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
const CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(LOCAL);
    await Promise.all(CDN.map((u) => cache.add(new Request(u, { mode: 'cors' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('cesta-punta-') && k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (!url.pathname.startsWith(new URL('./', location).pathname)) return;   // fuera del juego
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const key = req.mode === 'navigate' ? './index.html' : req;
      const cached = await cache.match(key, { ignoreSearch: true });
      const fresh = fetch(req).then((res) => {
        if (res.ok) cache.put(key, res.clone());
        return res;
      }).catch(() => null);
      if (cached) { event.waitUntil(fresh); return cached; }
      return (await fresh) || Response.error();
    })());
  } else if (/^(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname)) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    })());
  }
});
