const CACHE_NAME = 'taxis-bic-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/firebase-config.js',
  '/pantalla-confirmacion.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  // Solo cachear peticiones GET y evitar APIs
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
