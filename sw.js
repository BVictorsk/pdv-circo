
const CACHE_NAME = 'pdv-patati-patata-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/pdv.html',
  '/styles.css',
  '/script.js',
  '/firebase-config.js',
  '/print.js',
  '/fechamento.html',
  '/fechamento.js',
  '/editar_transacao.html',
  '/editar_transacao.js',
  '/minhas_transacoes.html',
  '/minhas_transacoes.js',
  '/painel_admin.html',
  '/portal_admin.css',
  '/portal_admin.js',
  'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js'
];

self.addEventListener('install', event => {
  // Perform install steps
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
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
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
