/**
 * sw.js — Service worker for offline caching.
 * Caches all app shell files on install; serves from cache first.
 */

const CACHE_NAME = 'family-budget-v9';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './css/styles.css',
  './js/data.js',
  './js/utils.js',
  './js/state.js',
  './js/render.js',
  './js/modals.js',
  './js/receipt.js',
  './js/import.js',
  './js/chat.js',
  './js/pin.js',
  './js/app.js',
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
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
  // Never cache API or Anthropic calls — always go to network
  if (event.request.url.includes('anthropic.com') ||
      event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).catch(() => caches.match('./index.html'))
    )
  );
});
