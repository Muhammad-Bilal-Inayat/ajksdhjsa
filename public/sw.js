// MBI INVENTRA — High-Performance Offline Service Worker & Hot-Update Cache Purge Engine
const CURRENT_CACHE = 'mbi-inventra-v4.2.2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/mbi-favicon.png',
  '/mbi-favicon.svg',
  '/mbi-logo.png',
  '/mbi-logo.svg',
  '/manifest.json'
];

// Install: Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CURRENT_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW INSTALL] Non-blocking cache warning:', err);
      });
    })
  );
  // Auto activate if forced
  self.skipWaiting();
});

// Activate: Delete all old caches immediately and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CURRENT_CACHE).map((key) => {
          console.log('[SW ACTIVATE] Purging legacy cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message listener: Handle Instant Zero-Logout Hot-Update
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW MESSAGE] Received SKIP_WAITING signal. Claiming clients immediately.');
    self.skipWaiting();
    self.clients.claim();
  }
});

// Fetch: Network-First for index.html/root & API exclusions, Cache-First for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Exclude API, SSE streams and non-GET backend calls
  if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') {
    return;
  }

  // Network-First with cache fallback for navigation / HTML requests / root
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CURRENT_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/') || caches.match(event.request);
        })
    );
    return;
  }

  // Cache-First with network fallback for static images, fonts and icons
  if (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CURRENT_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default Stale-While-Revalidate for bundled assets & scripts
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CURRENT_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
