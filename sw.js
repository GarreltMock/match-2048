const CACHE_NAME = `match-2048-v0.3.5`;

// Only pre-cache critical resources needed for initial load
const urlsToCache = ["./", "./index.html", "./style.css", "./src/main.js"];

self.addEventListener("install", (event) => {
    self.skipWaiting(); // Force the waiting service worker to become active
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Return cached version or fetch and cache the new resource
            if (response) {
                return response;
            }
            return fetch(event.request).then((response) => {
                // Don't cache non-successful responses or non-GET requests
                if (
                    !response ||
                    response.status !== 200 ||
                    response.type === "opaque" ||
                    event.request.method !== "GET"
                ) {
                    return response;
                }

                // Cache the fetched resource for future use
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            });
        })
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim()) // Take control immediately
            .then(() => {
                // Notify clients that a new version is active
                return self.clients.matchAll({ type: "window" }).then((clients) => {
                    clients.forEach((client) => {
                        client.postMessage({ type: "SW_UPDATED" });
                    });
                });
            })
    );
});
