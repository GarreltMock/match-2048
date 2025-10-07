// Entry point for Match 2048 game

import { Match3Game } from "./game.js";

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Silently fail if service worker registration fails
        });
    });
}

// Initialize the game when the page loads
document.addEventListener("DOMContentLoaded", () => {
    new Match3Game();
});
