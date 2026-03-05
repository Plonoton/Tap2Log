'use strict';

// Bump this when you redeploy to force a full cache refresh.
const CACHE = 'tap2log-v1';

const PRECACHE = [
  './',
  'flutter.js',
  'flutter_bootstrap.js',
  'main.dart.js',
  'manifest.json',
  'favicon.png',
  'version.json',
  'sqlite3.wasm',
  'sqflite_sw.js',
  'canvaskit/canvaskit.js',
  'canvaskit/canvaskit.wasm',
  'canvaskit/chromium/canvaskit.js',
  'canvaskit/chromium/canvaskit.wasm',
  'assets/AssetManifest.bin',
  'assets/AssetManifest.bin.json',
  'assets/FontManifest.json',
  'assets/fonts/MaterialIcons-Regular.otf',
  'assets/shaders/ink_sparkle.frag',
  'assets/shaders/stretch_effect.frag',
  'icons/Icon-192.png',
  'icons/Icon-512.png',
  'icons/Icon-maskable-192.png',
  'icons/Icon-maskable-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
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

  // Use URL string for cache matching (avoids Vary header mismatches).
  const cacheKey = url.href;

  event.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(cacheKey).then(cached => {
        const net = fetch(event.request).then(res => {
          if (res.ok) cache.put(cacheKey, res.clone());
          return res;
        });
        if (cached) {
          net.catch(() => {});
          return cached;
        }
        return net.catch(() => {
          // Last resort for navigation: serve cached index.html.
          if (event.request.mode === 'navigate') {
            return cache.match(new URL('./', self.location).href);
          }
          throw new Error('offline');
        });
      })
    )
  );
});
