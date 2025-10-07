// Entry point for Match 2048 game

import { Match3Game } from "./game.js";

// Register service worker for PWA (but not on localhost)
if ("serviceWorker" in navigator) {
    const isLocalhost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (!isLocalhost) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("sw.js", { updateViaCache: 'none' }).then(reg => {
                // Check for updates every time the page loads
                reg.update();
            }).catch(() => {
                // Silently fail if service worker registration fails
            });
        });
    }
}

// Initialize the game when the page loads
document.addEventListener("DOMContentLoaded", () => {
    new Match3Game();
});
