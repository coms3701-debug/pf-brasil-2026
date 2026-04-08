javascript
const CACHE_NAME = 'pf-v5-final';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => {
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => {
        // Nunca guarda a lista de médicos no cache!
        if (!event.request.url.includes('medicos.json')) {
          cache.put(event.request, copy);
        }
      });
      return res;
    }).catch(() => caches.match(event.request))
  );
});
