// Service Worker for Offline VVM Portal Support (Created by Siraj Hossain)
const CACHE_NAME = 'vvm-scifi-bengali-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './vvm_formal_portal.html',
  './manifest.json',
  './sw.js',
  './src/style.css',
  './src/main.js',
  './src/js/galaxyCanvas.js',
  './src/js/audioEngine.js',
  './src/js/stateManager.js',
  './src/js/components.js',
  './src/data/vvmClassesData.js',
  './src/data/vvmSyllabusData.js',
  './src/data/flashcardsData.js'
];

// NOTE: cache.addAll will fail the install if any asset 404s. We use a robust install
// that attempts to fetch each asset and only caches those that succeed. This keeps the
// service worker install from failing due to missing optional assets.
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(
      ASSETS_TO_CACHE.map(async (url) => {
        try {
          // Use fetch with cache: 'no-cache' to ensure we attempt network retrieval
          const res = await fetch(url, { cache: 'no-cache' });
          if (res && res.ok) {
            await cache.put(url, res.clone());
            console.log('SW: cached', url);
          } else {
            console.warn('SW: asset not cached (bad response)', url, res && res.status);
          }
        } catch (err) {
          console.warn('SW: failed to fetch asset', url, err);
        }
      })
    );
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Try cache first, then network, else fallback to index.html (for SPA)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        // Optionally cache new GET requests
        try {
          if (event.request.method === 'GET' && networkResponse && networkResponse.ok) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
        } catch (e) {
          // ignore cache-put errors
        }
        return networkResponse;
      }).catch(() => {
        // network failed — fallback to cached index.html if available
        return caches.match('./index.html');
      });
    })
  );
});
