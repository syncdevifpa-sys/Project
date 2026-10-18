/**
 * Arcádia IFPA — Service Worker (PWA)
 * ====================================
 * Permite funcionamento e cache offline e instalação na tela inicial.
 */

const CACHE_NAME = 'arcadia-pwa-v1';
const STATIC_ASSETS = [
    'index.html',
    'dashboard.html',
    'login.html',
    'signup.html',
    'notices.html',
    'tasks.html',
    'documents.html',
    'calendar.html',
    'settings.html',
    'bundle.css',
    'landing.css',
    'auth.css',
    'tokens.css',
    'style.css',
    'js/theme.js',
    'js/api.js',
    'js/auth.js',
    'js/portal.js',
    'js/landing.js',
    'js/pages.js',
    'assets/arcadia-emblem.png',
    'manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(() => {
                // Em dev ou caminhos dinâmicos, alguns itens podem estar sob demanda
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Não cacheia chamadas da API
    if (event.request.method !== 'GET' || url.pathname.includes('/api/')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request).then((cachedResponse) => {
                    return cachedResponse || (event.request.headers.get('accept')?.includes('text/html') ? caches.match('index.html') : null);
                });
            })
    );
});
