/**
 * Service Worker Principal - Mankind OMDb Movie Explorer
 * Implementa una estrategia de red prioritaria (Network First) para los archivos locales,
 * y recurre a la memoria caché cuando no hay conexión a internet.
 */

const CACHE_NAME = 'mankind-omdb-v5.0';
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
 * Evento de instalación: guarda en caché los recursos esenciales de la interfaz.
 */
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('Fallo en la instalación de la caché:', error);
            })
    );
});

/**
 * Evento de activación: limpia cachés antiguas para asegurar que se sirvan archivos frescos.
 */
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
        }).then(() => {
            return self.clients.claim();
        })
    );
});

/**
 * Evento de recuperación (fetch): usa estrategia de red prioritaria para archivos locales,
 * e ignora completamente la caché para las peticiones a la API de OMDb.
 */
self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('omdbapi.com')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return new Response(JSON.stringify({
                        Error: 'Modo sin conexión activo. No hay red disponible.'
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return response;
            })
            .catch(() => {
                return caches.match(event.request)
                    .then(response => response || caches.match('./index.html'));
            })
    );
});