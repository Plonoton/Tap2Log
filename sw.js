'use strict';

// Bump this string when you deploy a breaking change to force cache refresh.
const CACHE_NAME = 'tap2log-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  // Delete any old caches from previous versions.
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  // Only cache same-origin GET requests.
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(req).then(cached => {
        // Always fetch a fresh copy in the background to keep cache warm.
        const networkFetch = fetch(req).then(res => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        });
        if (cached) {
          // Serve cached immediately; update silently in background.
          networkFetch.catch(() => {});
          return cached;
        }
        // Not yet cached — must go to network (first visit).
        return networkFetch;
      })
    )
  );
});
