'use strict';

const CACHE_PREFIX = 'tap2log-v';

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

// Derives the cache name from version.json, which Flutter generates at build
// time - so the cache automatically rotates on every new deploy with no
// manual version bump needed.
// Result is memoised for the lifetime of this SW process.
// Fallback (offline SW restart before version.json is in the HTTP cache):
// reuse whichever tap2log-* cache already exists so offline mode keeps working.
let _cacheName = null;
async function getCacheName() {
  if (_cacheName) return _cacheName;
  try {
    const res = await fetch('version.json');
    const { version } = await res.json();
    _cacheName = CACHE_PREFIX + version;
  } catch (_) {
    const keys = await caches.keys();
    _cacheName = keys.find(k => k.startsWith(CACHE_PREFIX)) ?? CACHE_PREFIX + 'current';
  }
  return _cacheName;
}

self.addEventListener('install', event => {
  event.waitUntil(
    getCacheName().then(name =>
      caches.open(name)
        .then(c => c.addAll(PRECACHE))
        .then(() => self.skipWaiting())
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    getCacheName().then(name =>
      caches.keys()
        .then(keys => Promise.all(
          keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== name).map(k => caches.delete(k))
        ))
        .then(() => self.clients.claim())
    )
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Strip query strings (e.g. ?cachebuster=...) so that requests like
  // version.json?cachebuster=123 match the precached version.json entry.
  url.search = '';
  const cacheKey = url.href;

  event.respondWith(
    getCacheName().then(name =>
      caches.open(name).then(cache =>
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
    )
  );
});
