const CACHE_NAME = 'dead-calm-visual-v104';
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/assets/icons/icon-192.svg",
  "/assets/icons/icon-512.svg",
  "/src/assets/backgrounds/blackford-city-atlas.webp",
  "/src/assets/backgrounds/blackford-courtroom.webp",
  "/src/assets/backgrounds/blackford-harbor.webp",
  "/src/assets/backgrounds/blackford-morgue.webp",
  "/src/assets/backgrounds/blackford-precinct.webp",
  "/src/assets/backgrounds/blackford-rusty-anchor.webp",
  "/src/assets/backgrounds/holt-office.webp",
  "/src/assets/portraits/anna-holt-tension.webp",
  "/src/assets/portraits/anna-holt-warmth.webp",
  "/src/assets/portraits/anna-holt-withdrawal.webp",
  "/src/assets/portraits/anna-holt.webp",
  "/src/assets/portraits/father-thomas-tension.webp",
  "/src/assets/portraits/father-thomas-warmth.webp",
  "/src/assets/portraits/father-thomas-withdrawal.webp",
  "/src/assets/portraits/father-thomas.webp",
  "/src/assets/portraits/lydia-winter-tension.webp",
  "/src/assets/portraits/lydia-winter-warmth.webp",
  "/src/assets/portraits/lydia-winter-withdrawal.webp",
  "/src/assets/portraits/lydia-winter.webp",
  "/src/assets/portraits/marta-hayes-tension.webp",
  "/src/assets/portraits/marta-hayes-warmth.webp",
  "/src/assets/portraits/marta-hayes-withdrawal.webp",
  "/src/assets/portraits/marta-hayes.webp",
  "/src/assets/portraits/ray-morgan-tension.webp",
  "/src/assets/portraits/ray-morgan-warmth.webp",
  "/src/assets/portraits/ray-morgan-withdrawal.webp",
  "/src/assets/portraits/ray-morgan.webp",
  "/src/assets/portraits/sebastian-blackwood-tension.webp",
  "/src/assets/portraits/sebastian-blackwood-warmth.webp",
  "/src/assets/portraits/sebastian-blackwood-withdrawal.webp",
  "/src/assets/portraits/sebastian-blackwood.webp",
  "/src/css/animations.css",
  "/src/css/art-direction.css",
  "/src/css/main.css",
  "/src/data/characters.json",
  "/src/data/clues.json",
  "/src/data/contradictions.json",
  "/src/data/dialogues.json",
  "/src/data/game.json",
  "/src/data/locations.json",
  "/src/data/timeline-events.json",
  "/src/js/components/dialog-box.js",
  "/src/js/components/story-location.js",
  "/src/js/components/inventory.js",
  "/src/js/components/investigation-board.js",
  "/src/js/components/map.js",
  "/src/js/components/minigame-lock-screen.js",
  "/src/js/components/notebook-ui.js",
  "/src/js/components/timeline-ui.js",
  "/src/js/core/app.js",
  "/src/js/core/audio.js",
  "/src/js/core/events.js",
  "/src/js/core/router.js",
  "/src/js/core/state.js",
  "/src/js/core/storage.js",
  "/src/js/scenes/bar.js",
  "/src/js/scenes/blackwood-mansion.js",
  "/src/js/scenes/church.js",
  "/src/js/scenes/holt-house.js",
  "/src/js/scenes/port.js",
  "/src/js/scenes/city-map.js",
  "/src/js/scenes/crime-scene.js",
  "/src/js/scenes/film-restoration.js",
  "/src/js/scenes/investigation.js",
  "/src/js/scenes/main-menu.js",
  "/src/js/scenes/mechanical-repair.js",
  "/src/js/scenes/morgue.js",
  "/src/js/scenes/notebook.js",
  "/src/js/scenes/office.js",
  "/src/js/scenes/police-station.js",
  "/src/js/scenes/radio-tuning.js",
  "/src/js/scenes/timeline.js",
  "/src/js/systems/board-clue-filter.js",
  "/src/js/systems/conclusion-review.js",
  "/src/js/systems/contradictions.js",
  "/src/js/systems/court-guard.js",
  "/src/js/systems/court-workflow.js",
  "/src/js/systems/dialogue-reactions.js",
  "/src/js/systems/dialogue.js",
  "/src/js/systems/episode-conclusion.js",
  "/src/js/systems/evidence-archive.js",
  "/src/js/systems/film-restoration.js",
  "/src/js/systems/hypotheses.js",
  "/src/js/systems/hypothesis-filter.js",
  "/src/js/systems/hypothesis-link-map.js",
  "/src/js/systems/investigation-gaps.js",
  "/src/js/systems/investigation-quality.js",
  "/src/js/systems/investigation.js",
  "/src/js/systems/mechanical-repair.js",
  "/src/js/systems/minigame-progress.js",
  "/src/js/systems/minigame-access.js",
  "/src/js/systems/location-access.js",
  "/src/js/systems/case-001-evidence.js",
  "/src/js/systems/campaign-progression.js",
  "/src/js/systems/notebook.js",
  "/src/js/systems/npc-daily-life.js",
  "/src/js/systems/npc-dossiers.js",
  "/src/js/systems/npc-knowledge.js",
  "/src/js/systems/npc-memory.js",
  "/src/js/systems/npc-social-graph.js",
  "/src/js/systems/old-case-board-digest.js",
  "/src/js/systems/old-case-closure.js",
  "/src/js/systems/old-case-crosscheck.js",
  "/src/js/systems/old-case-discrepancy.js",
  "/src/js/systems/old-case-follow-up.js",
  "/src/js/systems/old-case-morgan-briefing.js",
  "/src/js/systems/old-case-morgan-revisit.js",
  "/src/js/systems/old-case-morgan.js",
  "/src/js/systems/old-case-navigation.js",
  "/src/js/systems/old-case-order.js",
  "/src/js/systems/old-case-port-log.js",
  "/src/js/systems/old-case-signature.js",
  "/src/js/systems/old-case-source-audit.js",
  "/src/js/systems/old-case-waybill.js",
  "/src/js/systems/old-case-witness-follow-up.js",
  "/src/js/systems/old-case-witnesses.js",
  "/src/js/systems/radio-tuning.js",
  "/src/js/systems/reader-theories.js",
  "/src/js/systems/reader-timeline.js",
  "/src/js/systems/review-directives.js",
  "/src/js/systems/timeline.js",
  "/src/js/systems/witness-interview-history.js",
  "/src/js/systems/witness-provenance.js",
  "/src/js/utils/helpers.js"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
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
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      return await fetch(event.request);
    } catch (error) {
      if (event.request.mode === 'navigate') {
        const fallback = await caches.match('/index.html');
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});
