// Arah Provisions — Service Worker
const CACHE_VER    = 'arah-v1';
const STATIC_CACHE = `${CACHE_VER}-static`;
const DYNAMIC_CACHE = `${CACHE_VER}-dynamic`;

// Pre-cache these on install
const PRECACHE = [
  '/',
  '/order',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ── Install: pre-cache static shell ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first, fall back to cache ─────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Let API calls and external requests go straight to network
  if (url.pathname.startsWith('/api/') || url.origin !== location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful HTML/JS/CSS/image responses
        if (response.ok) {
          const ct = response.headers.get('content-type') || '';
          if (
            ct.includes('text/html') ||
            ct.includes('javascript') ||
            ct.includes('css') ||
            ct.includes('image')
          ) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone));
          }
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          // If an HTML navigation fails and we have no cache, serve the root
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
        })
      )
  );
});
