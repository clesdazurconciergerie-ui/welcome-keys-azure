// Welkom Prestataire Service Worker
const CACHE_NAME = "welkom-sp-v1";
const STATIC_ASSETS = [
  "/",
  "/prestataire",
  "/manifest.json",
  "/favicon.png",
  "/brand/logo-wlekom-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for navigations; cache-first for other GETs
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).catch(() => cached))
  );
});

// Web Push handler
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Welkom", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Nouvelle mission disponible";
  const options = {
    body: data.body || "",
    icon: "/brand/logo-wlekom-icon.png",
    badge: "/brand/logo-wlekom-icon.png",
    tag: data.tag || "welkom-mission",
    data: { url: data.url || "/prestataire/missions" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/prestataire/missions";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

// Allow page to trigger a local notification via postMessage
self.addEventListener("message", (event) => {
  const msg = event.data || {};
  if (msg.type === "SHOW_NOTIFICATION") {
    self.registration.showNotification(msg.title || "Welkom", {
      body: msg.body || "",
      icon: "/brand/logo-wlekom-icon.png",
      badge: "/brand/logo-wlekom-icon.png",
      tag: msg.tag || "welkom-mission",
      data: { url: msg.url || "/prestataire/missions" },
    });
  }
});
