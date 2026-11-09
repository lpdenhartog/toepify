// The production build injects a revision and all hashed application assets.
const CACHE_NAME = "toepify-app-v2";
const APP_SHELL = ["/", "/manifest.webmanifest", "/favicon.svg"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  // Let an existing game finish using its current shell before activating updates.
});
self.addEventListener("activate", event => { event.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api") || url.pathname.startsWith("/socket.io")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.open(CACHE_NAME).then(cache => cache.match("/"))));
    return;
  }
  event.respondWith(caches.open(CACHE_NAME).then(async cache => {
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  }));
});
