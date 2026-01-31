// sw.js
const CACHE_NAME = 'feel365-v2'; // 👈 Increment version to force update
const urlsToCache = [
  '/',
  '/index.html',
  '/js/ui.js',
  '/js/db.js',
  '/manifest.json'
];

// Install: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // 👈 Activate immediately
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); // 👈 Clear old version
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first for HTML, cache-first for others
self.addEventListener('fetch', (event) => {
  if (event.request.destination === 'document') {
    // Always fetch HTML fresh
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  } else {
    // Use cache-first for JS, CSS, etc.
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
