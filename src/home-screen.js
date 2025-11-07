// home-screen.js - Home screen management

/**
 * Shows the home screen with current level information
 * @param {Match3Game} game - The game instance
 */
export function showHomeScreen(game) {
    const homeScreen = document.getElementById("home-screen");
    const gameContainer = document.getElementById("game-container");
    const levelButton = document.getElementById("start-level-button");

    // Update button text with current level
    levelButton.textContent = `Level ${game.currentLevel}`;

    // Show home screen, hide game
    homeScreen.style.display = "flex";
    gameContainer.style.display = "none";
}

/**
 * Hides the home screen and shows the game
 */
export function hideHomeScreen() {
    const homeScreen = document.getElementById("home-screen");
    const gameContainer = document.getElementById("game-container");

    homeScreen.style.display = "none";
    gameContainer.style.display = "flex";
}

/**
 * Initializes home screen event listeners
 * @param {Match3Game} game - The game instance
 */
export function initializeHomeScreen(game) {
    const levelButton = document.getElementById("start-level-button");

    levelButton.addEventListener("click", () => {
        hideHomeScreen();
        game.startLevel();
    });
}
