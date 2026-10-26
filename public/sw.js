/*
 * HealthFinder service worker: lets the app open without a connection.
 * Same-origin requests go to the network first, so new deploys show up straight away; the
 * cached copy is used when the network fails, or when a page takes too long on a slow link.
 * Map tiles and Overpass requests are not touched.
 */

const CACHE = 'healthfinder-v1';
const NAVIGATION_TIMEOUT_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add('/')));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, timeoutMs) {
  const cache = await caches.open(CACHE);
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });

  if (!timeoutMs) {
    return network.catch(async () => (await cache.match(request)) ?? Response.error());
  }

  // Slow connection: fall back to the cached page after a few seconds (the network
  // request keeps going and refreshes the cache for next time).
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
  const first = await Promise.race([network.catch(() => null), timeout]);
  if (first) return first;
  const cached = (await cache.match(request)) ?? (await cache.match('/'));
  return cached ?? network.catch(() => Response.error());
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Single-page app: every path is served by the same page.
    event.respondWith(
      networkFirst(request, NAVIGATION_TIMEOUT_MS).then(async (response) =>
        response.ok ? response : ((await caches.match('/')) ?? response),
      ),
    );
    return;
  }
  event.respondWith(networkFirst(request));
});
