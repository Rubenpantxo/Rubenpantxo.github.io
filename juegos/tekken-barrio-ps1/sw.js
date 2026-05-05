/* ============================================
   SERVICE WORKER - TEKKEN BARRIO PS1
   PWA con cache offline
   ============================================ */

const CACHE_NAME = 'tekken-barrio-v1.1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/main.css',
  './css/loading.css',
  './css/menu.css',
  './css/select.css',
  './css/battle.css',
  './css/victory.css',
  './css/credits.css',
  './css/options.css',
  './css/tournament.css',
  './css/touch.css',
  './js/storage.js',
  './js/audio.js',
  './js/input.js',
  './js/touch.js',
  './js/particles.js',
  './js/characters.js',
  './js/scene-manager.js',
  './js/main.js',
  './scenes/loading.js',
  './scenes/menu.js',
  './scenes/options.js',
  './scenes/select.js',
  './scenes/battle.js',
  './scenes/victory.js',
  './scenes/credits.js',
  './scenes/tournament.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('SW: algunos assets no se pudieron cachear', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((res) => {
        const copy = res.clone();
        if (res.status === 200 && res.type === 'basic') {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
