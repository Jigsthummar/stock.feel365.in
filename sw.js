const CACHE_NAME = 'feel365-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/js/db.js',
  '/js/ui.js',
  '/js/chart.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.warn('SW: Cache failed', err))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});