'use strict';

// Bump this when you redeploy to force a full cache refresh.
const CACHE = 'tap2log-v1';

// All files needed for the app to work offline.
// Update this list if the build output changes significantly.
const PRECACHE = [
  './',
  'flutter.js',
  'flutter_bootstrap.js',
  'main.dart.js',
  'main.dart.mjs',
  'main.dart.wasm',
  'manifest.json',
  'favicon.png',
  'version.json',
  'sqlite3.wasm',
  'sqflite_sw.js',
  // Renderers (browser picks one, but cache all for compatibility)
  'canvaskit/skwasm.js',
  'canvaskit/skwasm.wasm',
  'canvaskit/skwasm_heavy.js',
  'canvaskit/skwasm_heavy.wasm',
  'canvaskit/canvaskit.js',
  'canvaskit/canvaskit.wasm',
  'canvaskit/chromium/canvaskit.js',
  'canvaskit/chromium/canvaskit.wasm',
  // Flutter assets
  'assets/AssetManifest.bin',
  'assets/AssetManifest.bin.json',
  'assets/FontManifest.json',
  'assets/fonts/MaterialIcons-Regular.otf',
  // Icons
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

  // Navigation: network-first, fall back to cached shell.
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

  // Assets: cache-first, silent background update.
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
