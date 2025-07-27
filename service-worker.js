const CACHE_NAME = 'mana-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/constants.js',
    '/utils.js',
    '/img/folder_sem.jpg',
    '/img/folder.jpg',
    '/img/moldura.png',
    '/fonts/Roboto_Mono/static/RobotoMono-Regular.ttf',
    '/fonts/Roboto_Mono/static/RobotoMono-Bold.ttf',
    '/fonts/Roboto_Mono/RobotoMono-Italic-VariableFont_wght.ttf',
    '/fonts/Roboto_Mono/RobotoMono-VariableFont_wght.ttf'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                // Tenta adicionar cada arquivo individualmente e loga o erro específico
                return Promise.all(
                    urlsToCache.map(url =>
                        cache.add(url).catch(error => {
                            console.error(`Erro ao adicionar ${url} ao cache:`, error);
                        })
                    )
                );
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});