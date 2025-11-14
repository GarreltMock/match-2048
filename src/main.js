// Entry point for Match 2048 game
import { Match3Game } from "./game.js";
import { initializeHomeScreen, showHomeScreen } from "./home-screen.js";
import "./components/stroked-text.js";

function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
        const isLocalhost =
            location.hostname === "localhost" ||
            location.hostname === "127.0.0.1" ||
            /^(\d{1,3}\.){3}\d{1,3}$/.test(location.hostname);
        if (!isLocalhost) {
            window.addEventListener("load", () => {
                navigator.serviceWorker
                    .register("sw.js", { updateViaCache: "none" })
                    .then((reg) => {
                        // Check for updates every time the page loads
                        reg.update();
                    })
                    .catch(() => {
                        // Silently fail if service worker registration fails
                    });
            });

            // Listen for service worker updates
            navigator.serviceWorker.addEventListener("message", (event) => {
                if (event.data && event.data.type === "SW_UPDATED") {
                    // Reload once to get the new version
                    window.location.reload();
                }
            });
        }
    }
}

// Unregister all active service workers
async function unregisterServiceWorkers() {
    if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
            await registration.unregister();
        }
    }
}

// Initialize the game when the page loads
document.addEventListener("DOMContentLoaded", () => {
    // Remove any existing service workers
    unregisterServiceWorkers();

    const game = new Match3Game();

    // Initialize home screen with game instance
    initializeHomeScreen(game);

    // Show home screen on initial load
    showHomeScreen(game);
});
