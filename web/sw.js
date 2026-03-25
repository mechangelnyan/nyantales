/**
 * NyanTales — Service Worker
 * Caches the shell + story files for offline play.
 * Strategy: cache-first for static assets, network-first for stories.
 */

const CACHE_NAME = 'nyantales-v9';

// Core shell files to pre-cache on install
const SHELL_FILES = [
  './',
  './index.html',
  './css/style.css',
  './js/toast.js',
  './js/story-intro.js',
  './js/data-manager.js',
  './js/focus-trap.js',
  './js/confirm-dialog.js',
  './js/scene-select.js',
  './js/yaml-parser.js',
  './js/js-yaml.min.js',
  './js/engine.js',
  './js/sprites.js',
  './js/portraits.js',
  './js/tracker.js',
  './js/audio.js',
  './js/achievements.js',
  './js/gallery.js',
  './js/settings.js',
  './js/settings-panel.js',
  './js/history.js',
  './js/story-info.js',
  './js/save-manager.js',
  './js/touch.js',
  './js/ui.js',
  './js/main.js',
  './js/stats-dashboard.js',
  './js/keyboard-help.js',
  './js/about.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // For story YAML files: network-first (so updates are picked up), cache fallback
  if (url.pathname.includes('/stories/') && url.pathname.endsWith('.yaml')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For everything else: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful responses for same-origin
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
