const CACHE_NAME = 'dokuneko-cache-v2'; // バージョンを上げて古いキャッシュを無効化
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
  // インストール時に強制的に最新のService Workerを待機状態からアクティブにする
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    }).catch(err => console.log('Cache error', err))
  );
});

self.addEventListener('activate', event => {
  // 古いキャッシュ（v1など）を削除して、ユーザーの端末の容量を空けつつ最新版に強制移行する
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // すぐに制御を開始する
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
