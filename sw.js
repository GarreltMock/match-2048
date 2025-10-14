import { APP_VERSION } from "./src/version.js";

const CACHE_NAME = `match-2048-v${APP_VERSION}`;
const urlsToCache = [
    "./",
    "./index.html",
    "./style.css",
    "./src/main.js",
    "./src/game.js",
    "./src/config.js",
    "./src/storage.js",
    "./src/tile-helpers.js",
    "./src/board.js",
    "./src/input-handler.js",
    "./src/match-detector.js",
    "./src/merge-processor.js",
    "./src/animator.js",
    "./src/renderer.js",
    "./src/goal-tracker.js",
    "./assets/logo.png",
];

self.addEventListener("install", (event) => {
    self.skipWaiting(); // Force the waiting service worker to become active
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

self.addEventListener("fetch", (event) => {
    event.respondWith(caches.match(event.request).then((response) => response || fetch(event.request)));
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
    );
});
