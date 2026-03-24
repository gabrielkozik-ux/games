const CACHE_NAME = 'retro-arcade-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/snake.js',
  '/js/pong.js',
  '/js/breakout.js',
  '/js/dino.js',
  '/js/invaders.js',
  '/js/tetris.js',
  '/Dino-run.mp3',
  '/breakout.mp3',
  '/game-over.mp3',
  '/hadi-tanec.mp3',
  '/pong.mp3',
  '/ready-fight.mp3',
  '/space-invaders.mp3',
  '/tetris.mp3',
  '/victory.mp3',
  '/bmc_qr.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&family=Silkscreen&family=Bungee&family=Inter:wght@400;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

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
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignorovat Firestore/Firebase calls
  if (event.request.url.includes('firestore') || event.request.url.includes('firebase')) {
      return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response; // Return z cache
        }
        return fetch(event.request).then(
          function(response) {
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            var responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});
