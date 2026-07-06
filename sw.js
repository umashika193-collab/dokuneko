const CACHE_NAME = 'dokuneko-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './ui.js',
  './sound.js',
  './manifest.json',
  './cat_max.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    }).catch(err => console.log('Cache error', err))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
