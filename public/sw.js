const CACHE = 'cuco-v30';
const SHELL = [
  '/', '/index.html',
  '/css/theme.css', '/css/layout.css', '/css/components.css', '/css/animations.css',
  '/js/app.js', '/js/api.js', '/js/store.js', '/js/ui.js', '/js/mascot.js',
  '/assets/mascote_passarinho.svg', '/assets/favicon.svg', '/assets/logo-claro.png', '/assets/logo-escuro.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Respostas autenticadas nunca entram no cache: evitam vazamento entre usuários.
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
    return response;
  })));
});
