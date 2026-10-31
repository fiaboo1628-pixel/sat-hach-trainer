const CACHE_NAME = 'sat-hach-trainer-v39';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './fonts/be-vietnam-pro-400-latin-ext.woff2',
  './fonts/be-vietnam-pro-400-latin.woff2',
  './fonts/be-vietnam-pro-400-vietnamese.woff2',
  './fonts/be-vietnam-pro-600-latin-ext.woff2',
  './fonts/be-vietnam-pro-600-latin.woff2',
  './fonts/be-vietnam-pro-600-vietnamese.woff2',
  './fonts/be-vietnam-pro-800-latin-ext.woff2',
  './fonts/be-vietnam-pro-800-latin.woff2',
  './fonts/be-vietnam-pro-800-vietnamese.woff2',
  './fonts/fonts.css',
  './fonts/unbounded-500-latin-ext.woff2',
  './fonts/unbounded-500-latin.woff2',
  './fonts/unbounded-500-vietnamese.woff2',
  './fonts/unbounded-700-latin-ext.woff2',
  './fonts/unbounded-700-latin.woff2',
  './fonts/unbounded-700-vietnamese.woff2',
  './js/app.js',
  './js/playlist.js',
  './js/theory.js',
  './js/theory-config.js',
  './js/theory-ui.js',
  './js/theory-progress.js',
  './manifest.webmanifest',
  './content/stations.json',
  './content/standard-set.json',
  './content/soundboard.json',
  './content/sa-hinh-loi.json',
  './content/sa-hinh-thong-bao.json',
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
      const soundboard = await (await fetch('./content/soundboard.json')).json();
      const errors = await (await fetch('./content/sa-hinh-loi.json')).json();
      const notices = await (await fetch('./content/sa-hinh-thong-bao.json')).json();
      const audioFiles = new Set([
        ...stations.flatMap((s) => [s.audio, s.cue]),
        ...soundboard.map((k) => k.audio),
        ...errors.map((k) => k.audio),
        ...notices.map((k) => k.audio),
        'tut.mp3', // phím Tút của bảng sa hình
        'khan-cap.mp3', // phím Khẩn cấp (tình huống nguy hiểm)
      ]);
      await cache.addAll([...audioFiles].filter(Boolean).map((f) => `./content/audio/${f}`));
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
