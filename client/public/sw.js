// CodeBud service worker — runtime caching for PWA installability + light offline.
// Strategy: never touch the API or sockets; network-first for navigations (fallback to the
// cached app shell when offline); stale-while-revalidate for same-origin static assets.
// Every code path returns a real Response so respondWith never rejects.

const CACHE = 'codebud-v2';
const APP_SHELL = '/';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.add(APP_SHELL)).catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const offline = (body, status = 504) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain' } });

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle our own origin; never cache API or realtime traffic.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) return;

  // Navigations: network-first, fall back to the cached app shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put(APP_SHELL, res.clone())).catch(() => {});
          return res;
        })
        .catch(async () => (await caches.match(APP_SHELL)) || offline('Offline')),
    );
    return;
  }

  // Static assets: stale-while-revalidate. Always resolves to a Response.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.ok) caches.open(CACHE).then((c) => c.put(request, res.clone())).catch(() => {});
          return res;
        })
        .catch(() => cached || offline('Asset unavailable'));
      return cached || network;
    }),
  );
});
