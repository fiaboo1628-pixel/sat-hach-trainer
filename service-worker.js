const CACHE_NAME = 'sat-hach-trainer-v13';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './js/app.js',
  './js/playlist.js',
  './js/theory.js',
  './js/theory-config.js',
  './js/theory-ui.js',
  './js/theory-progress.js',
  './manifest.webmanifest',
  './content/stations.json',
  './content/standard-set.json',
  './content/theory/questions.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
      const stations = await (await fetch('./content/stations.json')).json();
      const audioUrls = stations.flatMap((s) => [s.audio, s.cue].filter(Boolean).map((f) => `./content/audio/${f}`));
      await cache.addAll(audioUrls);
      const questions = await (await fetch('./content/theory/questions.json')).json();
      const imageUrls = questions.filter((q) => q.image).map((q) => `./content/theory/images/${q.image}`);
      await cache.addAll(imageUrls);
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
