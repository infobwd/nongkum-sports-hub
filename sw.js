/* R31 — Installable app shell. Do not cache schedule, results, PDF or personal data. */
"use strict";
const CACHE_PREFIX = "nongkum-sports-pwa-";
const CACHE_NAME = CACHE_PREFIX + "r31-v1";
const ROOT = new URL(self.registration.scope);
const OFFLINE_URL = new URL("offline.html", ROOT).href;
const PRE_CACHE = [
  OFFLINE_URL,
  new URL("icons/pwa-192.png", ROOT).href,
  new URL("icons/pwa-512.png", ROOT).href
];
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
  // Only navigation is intercepted. Every data/JSON/PDF/fixture/media/API
  // request and every POST goes straight to network with no Cache Storage write.
  if (request.method !== "GET" || request.mode !== "navigate") return;
  const target = new URL(request.url);
  if (target.origin !== ROOT.origin || !target.pathname.startsWith(ROOT.pathname)) return;
  // Network-only pages: show a clearly labelled offline fallback on failure.
  // Never persist HTML that could contain draft committee information.
  event.respondWith(fetch(request).catch(async () => {
    const offline = await caches.match(OFFLINE_URL);
    return offline || Response.error();
  }));
});
