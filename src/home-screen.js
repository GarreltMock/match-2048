// home-screen.js - Home screen management

/**
 * Shows the home screen with current level information
 * @param {Match3Game} game - The game instance
 */
export function showHomeScreen(game) {
    const homeScreen = document.getElementById("home-screen");
    const gameContainer = document.getElementById("game-container");
    const levelButton = document.getElementById("start-level-button");
    const streakDisplay = document.getElementById("streak-display");

    // Update button text with current level
    levelButton.textContent = `Level ${game.currentLevel}`;

    // Update streak display
    updateStreakDisplay(game, streakDisplay);

    // Show home screen, hide game
    homeScreen.style.display = "flex";
    gameContainer.style.display = "none";
}

/**
 * Updates the streak display with current streak information
 * @param {Match3Game} game - The game instance
 * @param {HTMLElement} streakDisplay - The streak display element
 */
function updateStreakDisplay(game, streakDisplay) {
    const streak = game.currentStreak;

    if (streak === 0) {
        // No streak - show dim message
        streakDisplay.innerHTML = `
            <div class="streak-indicator streak-level-0">
                <span class="streak-icon">🔥</span>
                <span>No Streak</span>
            </div>
        `;
    } else {
        // Active streak - show level and bonus
        const bonusText = getStreakBonusText(streak);
        streakDisplay.innerHTML = `
            <div class="streak-indicator streak-level-${streak}">
                <span class="streak-icon">🔥</span>
                <span>Streak Level ${streak}</span>
            </div>
            <div class="streak-bonus">${bonusText}</div>
        `;
    }
}

/**
 * Gets the bonus text for the current streak level
 * @param {number} streak - Current streak level (1-3)
 * @returns {string} Bonus description
 */
function getStreakBonusText(streak) {
    switch (streak) {
        case 1:
            return "+1 Halve";
        case 2:
            return "+1 Halve, +1 Hammer";
        case 3:
            return "+1 Halve, +1 Hammer, +1 Swap";
        default:
            return "";
    }
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
