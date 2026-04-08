javascript
const CACHE_NAME = 'pf-brasil-cache-v3';

self.addEventListener('install', (event) => {
    self.skipWaiting(); 
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName); 
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // PROTEÇÃO MÁXIMA: Ignora envios para o Firebase para não travar o aplicativo
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            return caches.open(CACHE_NAME).then((cache) => {
                // Nunca guarda o JSON dos médicos na memória para ler sempre a versão mais recente!
                if (!event.request.url.includes('medicos.json')) {
                    cache.put(event.request, networkResponse.clone());
                }
                return networkResponse;
            });
        }).catch(() => {
            return caches.match(event.request);
        })
    );
});

