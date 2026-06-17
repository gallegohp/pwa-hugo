/**
 * Mankind OMDb Movie Explorer Service Worker
 * Implements a Network First caching strategy for local assets,
 * falling back to cache when offline.
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
 * Install event: caches essential shell resources.
 */
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('Cache installation failed:', error);
            })
    );
});

/**
 * Activate event: cleans up old caches to ensure fresh assets.
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
 * Fetch event: uses Network First strategy for local assets,
 * completely bypassing cache for OMDb API requests.
 */
self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('omdbapi.com')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return new Response(JSON.stringify({
                        Error: 'Offline mode active. No connection.'
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