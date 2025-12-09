// Entry point for Match 2048 game
import { Match3Game } from "./game.js";
import { initializeHomeScreen, showHomeScreen, hideHomeScreen } from "./home-screen.js";
import { loadVersion, saveVersion } from "./storage.js";
import { APP_VERSION } from "./version.js";
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

/**
 * Check version and reset game if major version has changed or no version exists
 * @returns {boolean} True if game was reset, false otherwise
 */
function checkVersionAndReset() {
    const storedVersion = loadVersion();

    // If no stored version exists, this is a new install or old version without version tracking
    if (!storedVersion) {
        console.log("No stored version found. Resetting game and saving version:", APP_VERSION);
        localStorage.clear();
        saveVersion(APP_VERSION);
        return true;
    }

    // Parse major version from stored and current versions
    const storedMajor = parseInt(storedVersion.split(".")[0], 10);
    const currentMajor = parseInt(APP_VERSION.split(".")[0], 10);

    // If major version has changed, reset the game
    if (storedMajor !== currentMajor) {
        console.log(`Major version changed from ${storedVersion} to ${APP_VERSION}. Resetting game.`);
        localStorage.clear();
        saveVersion(APP_VERSION);
        return true;
    }

    // Update stored version to current version (for minor/patch updates)
    if (storedVersion !== APP_VERSION) {
        console.log(`Version updated from ${storedVersion} to ${APP_VERSION}`);
        saveVersion(APP_VERSION);
    }

    return false;
}

// Initialize the game when the page loads
document.addEventListener("DOMContentLoaded", () => {
    // Check version and reset if necessary
    checkVersionAndReset();

    // Remove any existing service workers
    unregisterServiceWorkers();

    const game = new Match3Game();

    // Initialize home screen with game instance
    initializeHomeScreen(game);

    // Show home screen on initial load
    showHomeScreen(game);

    // Keyboard shortcuts for level navigation
    document.addEventListener("keydown", (e) => {
        // 'n' for next level
        if (e.key === "n" || e.key === "N") {
            // Close any open dialogs
            closeAllDialogs();

            game.nextLevel();
            hideHomeScreen();
            game.startLevel();
        }
        // 'b' for previous (before) level
        else if (e.key === "b" || e.key === "B") {
            if (game.currentLevel > 1) {
                // Close any open dialogs
                closeAllDialogs();

                game.currentLevel -= 2; // Subtract 2 because nextLevel() will add 1
                game.nextLevel();
                hideHomeScreen();
                game.startLevel();
            }
        }
    });
});

// Helper function to close all open dialogs and tutorials
function closeAllDialogs() {
    // Close tutorial overlay
    const tutorialOverlay = document.getElementById("tutorialOverlay");
    if (tutorialOverlay) {
        tutorialOverlay.classList.add("hidden");
    }

    // Close any goal dialogs
    const goalDialog = document.getElementById("goalDialog");
    if (goalDialog) {
        goalDialog.remove();
    }

    // Close feature unlock dialog
    const featureUnlockDialog = document.getElementById("featureUnlockDialog");
    if (featureUnlockDialog) {
        featureUnlockDialog.remove();
    }

    // Close intro dialog
    const introDialog = document.getElementById("introDialog");
    if (introDialog) {
        introDialog.classList.add("hidden");
    }

    // Close extra moves dialog
    const extraMovesDialog = document.getElementById("extraMovesDialog");
    if (extraMovesDialog) {
        extraMovesDialog.classList.add("hidden");
    }

    // Close settings dialog
    const settingsDialog = document.getElementById("settingsDialog");
    if (settingsDialog) {
        settingsDialog.classList.add("hidden");
    }

    // Close no hearts dialog
    const noHeartsDialog = document.getElementById("noHeartsDialog");
    if (noHeartsDialog) {
        noHeartsDialog.classList.add("hidden");
    }

    // Close give up dialog
    const giveUpDialog = document.getElementById("giveUpDialog");
    if (giveUpDialog) {
        giveUpDialog.classList.add("hidden");
    }

    // Close shop dialogs
    const shopDialog = document.getElementById("shopDialog");
    if (shopDialog) {
        shopDialog.classList.add("hidden");
    }

    const powerupShopDialog = document.getElementById("powerupShopDialog");
    if (powerupShopDialog) {
        powerupShopDialog.classList.add("hidden");
    }
}
