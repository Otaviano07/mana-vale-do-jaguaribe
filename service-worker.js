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
    '/fonts/Roboto_Mono/RobotoMono-Regular.ttf',
    '/fonts/Roboto_Mono/RobotoMono-Bold.ttf',
    '/fonts/Roboto_Mono/RobotoMono-Italic-VariableFont_wght.ttf',
    '/fonts/Roboto_Mono/RobotoMono-VariableFont_wght.ttf',
    'https://cdnjs.cloudflare.com/ajax/libs/vue/3.3.4/vue.global.prod.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://fonts.googleapis.com/css2?family=Roboto+Mono:ital,wght@0,100..700;1,100..700&display=swap'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
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