const CACHE_NAME = 'sat-hach-trainer-v1';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './js/app.js',
  './js/playlist.js',
  './manifest.webmanifest',
  './content/stations.json',
  './content/standard-set.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
      const stations = await (await fetch('./content/stations.json')).json();
      const audioUrls = stations.map((s) => `./content/audio/${s.audio}`);
      await cache.addAll(audioUrls);
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
