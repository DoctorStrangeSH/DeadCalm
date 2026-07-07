const CACHE_NAME = 'dead-calm-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/css/main.css',
  '/src/css/animations.css',
  '/src/js/core/app.js',
  '/src/js/core/events.js',
  '/src/js/core/state.js',
  '/src/js/core/router.js',
  '/src/js/core/storage.js',
  '/src/js/core/audio.js',
  '/src/js/utils/helpers.js',
  '/src/js/scenes/main-menu.js',
  '/src/js/scenes/office.js',
  '/src/data/game.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});