const CACHE_NAME = 'dead-calm-visual-v24';
const ASSETS = [
  '/',
  '/index.html',
  '/src/css/main.css',
  '/src/css/animations.css',
  '/src/css/art-direction.css',
  '/src/js/core/app.js',
  '/src/js/core/events.js',
  '/src/js/core/state.js',
  '/src/js/core/router.js',
  '/src/js/core/storage.js',
  '/src/js/core/audio.js',
  '/src/js/systems/dialogue-reactions.js',
  '/src/js/utils/helpers.js',
  '/src/js/scenes/main-menu.js',
  '/src/js/scenes/office.js',
  '/src/js/scenes/city-map.js',
  '/src/js/components/map.js',
  '/src/js/scenes/crime-scene.js',
  '/src/js/scenes/police-station.js',
  '/src/js/scenes/morgue.js',
  '/src/js/scenes/bar.js',
  '/src/assets/backgrounds/blackford-harbor.webp',
  '/src/assets/backgrounds/holt-office.webp',
  '/src/assets/backgrounds/blackford-city-atlas.webp',
  '/src/assets/backgrounds/blackford-courtroom.webp',
  '/src/assets/backgrounds/blackford-precinct.webp',
  '/src/assets/backgrounds/blackford-morgue.webp',
  '/src/assets/backgrounds/blackford-rusty-anchor.webp',
  '/src/assets/portraits/lydia-winter.webp',
  '/src/assets/portraits/lydia-winter-tension.webp',
  '/src/assets/portraits/lydia-winter-warmth.webp',
  '/src/assets/portraits/lydia-winter-withdrawal.webp',
  '/src/assets/portraits/ray-morgan.webp',
  '/src/assets/portraits/ray-morgan-tension.webp',
  '/src/assets/portraits/ray-morgan-warmth.webp',
  '/src/assets/portraits/ray-morgan-withdrawal.webp',
  '/src/assets/portraits/anna-holt.webp',
  '/src/assets/portraits/anna-holt-tension.webp',
  '/src/assets/portraits/anna-holt-warmth.webp',
  '/src/assets/portraits/anna-holt-withdrawal.webp',
  '/src/assets/portraits/marta-hayes.webp',
  '/src/assets/portraits/marta-hayes-tension.webp',
  '/src/assets/portraits/marta-hayes-warmth.webp',
  '/src/assets/portraits/marta-hayes-withdrawal.webp',
  '/src/assets/portraits/father-thomas.webp',
  '/src/assets/portraits/father-thomas-tension.webp',
  '/src/assets/portraits/father-thomas-warmth.webp',
  '/src/assets/portraits/sebastian-blackwood.webp',
  '/src/data/locations.json',
  '/src/data/dialogues.json',
  '/src/data/game.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('dead-calm-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
