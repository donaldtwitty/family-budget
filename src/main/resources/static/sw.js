const CACHE_NAME = 'family-budget-v2';

// Static assets that are safe to serve from cache while offline.
// Any JS file added to the app MUST also be listed here.
const ASSETS_TO_CACHE = [
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/api.js',       // ← REST client (must come before state.js)
  './js/data.js',
  './js/utils.js',
  './js/state.js',
  './js/render.js',
  './js/modals.js',
  './js/receipt.js',
  './js/pin.js',
  './js/app.js',
  './icons/icon.svg',
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
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
  const url = new URL(event.request.url);

  // ── Network-first for all API calls ───────────────────────────────────────
  // API responses must always reflect the latest server state. We only fall
  // back to cache when the network is completely unreachable (full offline).
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // ── Cache-first for static assets ─────────────────────────────────────────
  // HTML, CSS, JS, fonts and icons are versioned by CACHE_NAME. They are safe
  // to serve from cache; the network is only hit when a file isn't cached yet.
  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request))
  );
});
