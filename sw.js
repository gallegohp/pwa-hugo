/**
 * ============================================
 * Service Worker - OMDb Movie Explorer Mankind
 * ============================================
 * Proporciona funcionalidad offline básica
 * mediante cache de la aplicación shell
 */

const CACHE_NAME = 'mankind-omdb-v1';
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

/**
 * Evento Install - Cachea los recursos esenciales
 */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache abierto');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                return self.skipWaiting();
            })
            .catch((error) => {
                console.log('Error al cachear:', error);
            })
    );
});

/**
 * Evento Activate - Limpia caches antiguos
 */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Eliminando cache antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

/**
 * Evento Fetch - Estrategia Cache First
 * Intenta servir desde cache, si no está,
 * hace la petición a la red
 */
self.addEventListener('fetch', (event) => {
    // No cachear peticiones a la API de OMDb
    if (event.request.url.includes('omdbapi.com')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Clonar la respuesta para cachearla
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    return response;
                })
                .catch(() => {
                    // Si no hay red, devolver error
                    return new Response(JSON.stringify({
                        Error: 'Sin conexión a internet'
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
        return;
    }

    // Para otros recursos, usar cache first
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Si está en cache, devolverlo
                if (response) {
                    return response;
                }

                // Si no está, hacer petición a la red
                return fetch(event.request).then((response) => {
                    // Verificar si es una respuesta válida
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clonar la respuesta
                    const responseToCache = response.clone();

                    // Cachear la nueva respuesta
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
            .catch(() => {
                // Si hay error, devolver página offline
                return caches.match('./index.html');
            })
    );
});