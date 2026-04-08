const CACHE_NAME = 'pf-cache-v6';

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
  // Ignora chamadas para o Firebase ou chamadas que não sejam GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => {
        // NUNCA guarda os médicos no cache. Vai sempre buscar o mais recente!
        if (!event.request.url.includes('medicos.json')) {
          cache.put(event.request, copy);
        }
      });
      return res;
    }).catch(() => caches.match(event.request))
  );
});
