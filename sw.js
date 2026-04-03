const CACHE_NAME = "bfmidi-wifi-v22";

// Core assets that MUST cache for the PWA install prompt.
// Keep this list minimal and only with internal files to ensure install success.
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-192-maskable.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-512-maskable.png",
  "./js/parity-bridge-client.js"
];

// Non-blocking assets: editor pages and external fonts.
// Failed attempts here won't prevent the PWA from being installable.
const OPTIONAL_ASSETS = [
  "./preset-config/index.html",
  "./global-config/index.html",
  "./global-config/global-inline.css",
  "./global-config/global-inline.js",
  "./system/index.html",
  "./system/system-inline.css",
  "./system/system-inline.js",
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Mandatory assets (PWA will NOT install if these fail)
      await cache.addAll(CORE_ASSETS);

      // 2. Optional assets (PWA WILL still install even if these fail)
      for (const url of OPTIONAL_ASSETS) {
        try {
          await cache.add(new Request(url, { mode: 'no-cors' }));
        } catch (err) {
          console.warn("[SW] Skipping optional asset:", url, err);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) return caches.delete(key);
            return Promise.resolve();
          })
        )
      )
      .then(() => self.clients.claim())
      .then(() =>
        // Avisa todas as abas abertas para recarregar com a versão nova
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: "SW_UPDATED" }));
        })
      )
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Special handling for Google Fonts (cross-origin)
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((networkResponse) => {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return networkResponse;
        }).catch(() => caches.match(request)); // Fallback to cache if network fails
      })
    );
    return;
  }

  // ONLY intercept local assets
  if (url.hostname !== self.location.hostname) return;

  // Network-first for HTML pages (so updates propagate)
  const isHtml =
    request.mode === "navigate" ||
    request.destination === "document" ||
    (request.headers.get("accept") || "").includes("text/html");

  if (isHtml) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return networkResponse;
        })
        .catch(() =>
          caches.match(request).then((cached) =>
            cached || caches.match("./index.html")
          )
        )
    );
    return;
  }

  // Cache-first for other local assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((networkResponse) => {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return networkResponse;
        })
        .catch(() => new Response("Offline", { status: 503 }));
    })
  );
});
