'use strict';

// Bump this when you deploy a breaking update to force a full cache refresh.
const CACHE = 'tap2log-v1';

// App shell — precached on install so the first offline launch works.
// Paths are relative to the service worker location (/Tap2Log/sw.js).
const SHELL = ['./', 'flutter.js', 'flutter_bootstrap.js', 'manifest.json', 'favicon.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests (opening the app): network-first, fall back to cached shell.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }

  // All other assets: cache-first, silent background update.
  event.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(event.request).then(cached => {
        const net = fetch(event.request).then(res => {
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        });
        if (cached) {
          net.catch(() => {});
          return cached;
        }
        return net;
      })
    )
  );
});
