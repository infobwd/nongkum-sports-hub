/* R31 — Installable app shell. Do not cache schedules, results, PDFs or personal data. */
"use strict";
const CACHE_PREFIX = "nongkum-sports-pwa-";
const CACHE_NAME = CACHE_PREFIX + "r31-v2";
const ROOT = new URL(self.registration.scope);
const OFFLINE_URL = new URL("offline.html", ROOT).href;
const ICON_URLS = [
  new URL("icons/pwa-192.png", ROOT).href,
  new URL("icons/pwa-512.png?v=r31-v2", ROOT).href
];
const PRE_CACHE = [OFFLINE_URL, ...ICON_URLS];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRE_CACHE)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const target = new URL(request.url);
  if (target.origin !== ROOT.origin || !target.pathname.startsWith(ROOT.pathname)) return;

  // Only the two public app icons may be served from the pre-cache offline.
  if (ICON_URLS.includes(target.href)) {
    event.respondWith(caches.match(target.href).then((hit) => hit || fetch(request)));
    return;
  }

  // All data/JSON, PDFs, API calls, fixture-share routes and assets bypass
  // Service Worker caching. Navigation never uses cached HTML; on network
  // failure, it displays an explicit offline page without old scores.
  if (request.mode !== "navigate") return;
  event.respondWith(fetch(request).catch(async () => {
    const offline = await caches.match(OFFLINE_URL);
    return offline || Response.error();
  }));
});
