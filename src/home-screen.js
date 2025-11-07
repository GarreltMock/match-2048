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
    const heartsDisplay = document.getElementById("hearts-display");

    // Regenerate hearts before showing home screen
    game.regenerateHearts();

    // Update button text with current level
    levelButton.textContent = `Level ${game.currentLevel}`;

    // Update streak display
    updateStreakDisplay(game, streakDisplay);

    // Update hearts display
    updateHeartsDisplay(game, heartsDisplay);

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
 * Updates the hearts display with current hearts and timer
 * @param {Match3Game} game - The game instance
 * @param {HTMLElement} heartsDisplay - The hearts display element
 */
function updateHeartsDisplay(game, heartsDisplay) {
    const hearts = game.hearts;
    const maxHearts = game.MAX_HEARTS;

    // Create heart icons
    let heartsHTML = '<div class="hearts-container">';
    for (let i = 0; i < maxHearts; i++) {
        const isEmpty = i >= hearts ? ' empty' : '';
        heartsHTML += `<span class="heart-icon${isEmpty}">❤️</span>`;
    }
    heartsHTML += '</div>';

    // Add timer or full message
    if (hearts >= maxHearts) {
        heartsHTML += '<div class="hearts-full">Full</div>';
    } else if (hearts < maxHearts) {
        const timeRemaining = game.getTimeUntilNextHeart();
        const minutes = Math.floor(timeRemaining / (60 * 1000));
        const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000);
        const timerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        heartsHTML += `<div class="hearts-timer">Next in ${timerText}</div>`;

        // Update timer every second if not at max hearts
        clearInterval(game.heartsTimerInterval);
        game.heartsTimerInterval = setInterval(() => {
            game.regenerateHearts();
            if (document.getElementById("home-screen").style.display === "flex") {
                updateHeartsDisplay(game, heartsDisplay);
            } else {
                clearInterval(game.heartsTimerInterval);
            }
        }, 1000);
    }

    heartsDisplay.innerHTML = heartsHTML;
}

/**
 * Initializes home screen event listeners
 * @param {Match3Game} game - The game instance
 */
export function initializeHomeScreen(game) {
    const levelButton = document.getElementById("start-level-button");

    levelButton.addEventListener("click", () => {
        // Check if player has hearts to play
        if (game.hearts <= 0) {
            // No hearts available - show message
            alert("You're out of hearts! Wait for them to regenerate or come back later.");
            return;
        }

        // Clear hearts timer when starting level
        clearInterval(game.heartsTimerInterval);

        hideHomeScreen();
        game.startLevel();
    });
}
