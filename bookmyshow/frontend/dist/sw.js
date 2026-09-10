// CineVerse PWA Service Worker v1
// Strategy: Network-first for APIs, Cache-first for static assets, Offline shell for navigation

const CACHE_NAME = 'cineverse-pwa-v1';
const STATIC_CACHE = 'cineverse-static-v1';

const APP_SHELL = [
  '/',
  '/movies',
  '/static/manifest.json',
];

// ── Install: Pre-cache app shell ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[CineVerse SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(APP_SHELL).catch(() => {})
    )
  );
  self.skipWaiting();
});

// ── Activate: Remove old caches ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[CineVerse SW] Activating...');
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME && n !== STATIC_CACHE)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: Smart caching strategy ───────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET and cross-origin requests
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  // API calls: always network-first (never serve stale booking data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req).catch(() =>
        new Response(
          JSON.stringify({ error: 'You are offline. Please reconnect to the internet.' }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 }
        )
      )
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts): cache-first, network fallback
  if (
    url.pathname.startsWith('/static/assets/') ||
    url.pathname.startsWith('/assets/') ||
    req.destination === 'image' ||
    req.destination === 'script' ||
    req.destination === 'style' ||
    req.destination === 'font'
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkFetch = fetch(req).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, clone));
          }
          return res;
        });
        return cached || networkFetch;
      })
    );
    return;
  }

  // HTML navigation: network-first, fallback to cached shell
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match('/'))
      )
  );
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'CineVerse', {
      body: data.body || 'Your booking update is ready!',
      icon: '/static/icon-192.png',
      badge: '/static/icon-192.png',
      tag: 'cineverse-notification',
      data: data.url || '/',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data || '/'));
});
