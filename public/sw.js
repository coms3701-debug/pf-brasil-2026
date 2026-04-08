```javascript
const CACHE_NAME = 'pf-brasil-cache-v2';

self.addEventListener('install', (event) => {
    // Força o robô novo a assumir o controlo imediatamente
    self.skipWaiting(); 
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Limpa toda a memória velha e teimosa do telemóvel
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName); 
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Regra de Ouro: Vai sempre buscar a versão mais recente à internet primeiro!
    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            return caches.open(CACHE_NAME).then((cache) => {
                // Guarda a versão nova para funcionar offline, MAS NUNCA guarda o medicos.json
                // Assim a sua lista de médicos está sempre atualizada ao segundo!
                if (!event.request.url.includes('medicos.json')) {
                    cache.put(event.request, networkResponse.clone());
                }
                return networkResponse;
            });
        }).catch(() => {
            // Se não tiver internet, usa o que guardou na memória
            return caches.match(event.request);
        })
    );
});


```
