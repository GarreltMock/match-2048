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

    // Create progress bar with 3 sections
    let content = `
        <div class="streak-header">
            <span class="streak-icon">🔥</span>
            <span class="streak-title">${streak === 0 ? "No Streak" : "Streak"}</span>
        </div>
    `;

    if (streak > 0) {
        content += `
        <div class="streak-progress-container">
            <div class="streak-section ${streak >= 1 ? "active" : ""}">
                <div class="streak-powerup">${streak >= 1 ? "✂️" : ""}</div>
                <div class="streak-bar first"></div>
            </div>
            <div class="streak-section ${streak >= 2 ? "active" : ""}">
                <div class="streak-powerup">${streak >= 2 ? "🔨" : ""}</div>
                <div class="streak-bar"></div>
            </div>
            <div class="streak-section ${streak >= 3 ? "active" : ""}">
                <div class="streak-powerup">${streak >= 3 ? "🔄" : ""}</div>
                <div class="streak-bar last"></div>
            </div>
        </div>`;
    }

    streakDisplay.innerHTML = content;
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
    let heartsHTML = `<div class="hearts-container">
        <h2 class="heart-icon${hearts === 0 ? " empty" : ""}">♥️</h2>
        ${
            hearts < 5
                ? `
          <svg class="heart-count" viewBox="0 0 100 60" width="100" height="60">
            <text
                x="50"
                y="40"
                font-size="22"
                font-weight="900"
                fill="#fff"
                stroke="#000"
                stroke-width="7"
                paint-order="stroke fill"
                stroke-linejoin="round"
                text-anchor="middle"
            >
                ${hearts}
            </text>
          </svg>
        `
                : ""
        }
      </div>
    `;

    // Add timer or full message
    if (hearts >= maxHearts) {
        heartsHTML += '<h2 class="hearts-full">Full</h2>';
    } else if (hearts < maxHearts) {
        const timeRemaining = game.getTimeUntilNextHeart();
        const minutes = Math.floor(timeRemaining / (60 * 1000));
        const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000);
        const timerText = `${minutes}:${seconds.toString().padStart(2, "0")}`;
        heartsHTML += `<h4 class="hearts-timer">${timerText}</h4>`;

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
    const noHeartsDialog = document.getElementById("noHeartsDialog");
    const closeNoHeartsBtn = document.getElementById("closeNoHeartsBtn");

    levelButton.addEventListener("click", () => {
        // Check if player has hearts to play
        if (game.hearts <= 0) {
            // No hearts available - show dialog
            noHeartsDialog.classList.remove("hidden");
            return;
        }

        // Clear hearts timer when starting level
        clearInterval(game.heartsTimerInterval);

        hideHomeScreen();
        game.startLevel();
    });

    // Close dialog handler
    if (closeNoHeartsBtn) {
        closeNoHeartsBtn.addEventListener("click", () => {
            noHeartsDialog.classList.add("hidden");
        });
    }
}
