// home-screen.js - Home screen management

import { loadShownGoalDialogs, saveHearts, saveLastRegenTime } from "./storage.js";
import { SUPER_STREAK_THRESHOLD } from "./config.js";

/**
 * Shows the home screen with current level information
 * @param {Match3Game} game - The game instance
 */
export function showHomeScreen(game) {
    const homeScreen = document.getElementById("home-screen");
    const gameContainer = document.getElementById("game-container");
    const levelButton = document.getElementById("start-level-button");
    const streakDisplay = document.getElementById("streak-display");
    const superStreakDisplay = document.getElementById("super-streak-display");
    const heartsDisplay = document.getElementById("hearts-display");
    const coinsDisplay = document.getElementById("coins-display");

    // Regenerate hearts before showing home screen
    game.regenerateHearts();

    // Update button text with current level
    levelButton.textContent = `Level ${game.currentLevel}`;

    // Update super streak display (above regular streak) - only if feature is unlocked
    const shownDialogs = loadShownGoalDialogs();
    if (shownDialogs.has("board_upgrades")) {
        updateSuperStreakDisplay(game, superStreakDisplay);
    } else {
        // Hide super streak display if feature is not unlocked yet
        if (superStreakDisplay) {
            superStreakDisplay.innerHTML = "";
        }
    }

    // Update streak display
    updateStreakDisplay(game, streakDisplay);

    // Update hearts display
    updateHeartsDisplay(game, heartsDisplay);

    // Update coins display
    updateCoinsDisplay(game, coinsDisplay);

    // Show home screen, hide game
    homeScreen.style.display = "flex";
    gameContainer.style.display = "none";
}

/**
 * Updates the super streak display with circular progress indicator
 * @param {Match3Game} game - The game instance
 * @param {HTMLElement} superStreakDisplay - The super streak display element
 */
function updateSuperStreakDisplay(game, superStreakDisplay) {
    const superStreak = game.superStreak;
    const progress = Math.min(superStreak, SUPER_STREAK_THRESHOLD);
    const isActive = superStreak >= SUPER_STREAK_THRESHOLD;

    // Calculate circle progress (0-283 is full circle, stroke-dasharray circumference for r=45)
    const circumference = 2 * Math.PI * 45;
    const progressOffset = circumference - (progress / SUPER_STREAK_THRESHOLD) * circumference;

    const content = `
        <div class="super-streak-container ${isActive ? "active" : ""}">
            <svg class="super-streak-circle" width="120" height="120" viewBox="0 0 120 120">
                <!-- Background circle -->
                <circle
                    cx="60"
                    cy="60"
                    r="45"
                    fill="none"
                    stroke="rgba(0, 0, 0, 0.4)"
                    stroke-width="12"
                />
                <!-- Progress circle -->
                <circle
                    cx="60"
                    cy="60"
                    r="45"
                    fill="none"
                    stroke="url(#superStreakGradient)"
                    stroke-width="8"
                    stroke-linecap="round"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${progressOffset}"
                    transform="translate(60, 60) rotate(-90) scale(-1, 1) translate(-60, -60)"
                    class="progress-circle"
                />
                <!-- Gradient definition -->
                <defs>
                    <linearGradient id="superStreakGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#3E9DFF;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#bb00ff;stop-opacity:1" />
                    </linearGradient>
                </defs>
            </svg>
            <div class="super-streak-icon">
                <img src="assets/upgrade-icon_streak.png" alt="Super Streak" />
            </div>
            <div class="super-streak-text">${progress}/${SUPER_STREAK_THRESHOLD}</div>
        </div>
    `;

    superStreakDisplay.innerHTML = content;
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
          <stroked-text
            class="heart-count"
            text="${hearts}"
            font-size="20"
            font-weight="900"
            stroke-width="7"
            width="100"
            height="60">
          </stroked-text>
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
 * Updates the coins display with current coin count
 * @param {Match3Game} game - The game instance
 * @param {HTMLElement} coinsDisplay - The coins display element
 */
function updateCoinsDisplay(game, coinsDisplay) {
    const coins = game.coins;
    const formattedCoins = coins.toLocaleString();

    const coinsHTML = `
        <img src="assets/shop/coin.png" class="coin-icon" alt="Coins" />
        <div class="coin-count">${formattedCoins}</div>
    `;

    coinsDisplay.innerHTML = coinsHTML;
}

/**
 * Initializes home screen event listeners
 * @param {Match3Game} game - The game instance
 */
export function initializeHomeScreen(game) {
    const levelButton = document.getElementById("start-level-button");
    const noHeartsDialog = document.getElementById("noHeartsDialog");
    const closeNoHeartsBtn = document.getElementById("closeNoHeartsBtn");
    const fillHeartsBtn = document.getElementById("fillHeartsBtn");
    const coinsDisplay = document.getElementById("coins-display");
    const shopDialog = document.getElementById("shopDialog");
    const closeShopBtn = document.getElementById("closeShopBtn");
    const shopBuyBtns = document.querySelectorAll(".shop-buy-btn");

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

    // Fill hearts with coins handler
    if (fillHeartsBtn) {
        fillHeartsBtn.addEventListener("click", () => {
            const HEART_REFILL_COST = 800;

            // Check if player has enough coins
            if (game.coins >= HEART_REFILL_COST) {
                // Deduct coins
                game.coins -= HEART_REFILL_COST;
                game.saveCoins();

                // Fill hearts to max
                game.hearts = game.MAX_HEARTS;
                saveHearts(game.hearts);

                // Update regeneration time
                game.lastRegenTime = Date.now();
                saveLastRegenTime(game.lastRegenTime);

                // Update all displays
                const heartsDisplay = document.getElementById("hearts-display");
                updateHeartsDisplay(game, heartsDisplay);
                updateCoinsDisplay(game, coinsDisplay);

                // Close dialog
                noHeartsDialog.classList.add("hidden");
            } else {
                // Not enough coins - open shop instead
                noHeartsDialog.classList.add("hidden");
                shopDialog.classList.remove("hidden");
                // Update shop coins display
                const shopCoinsDisplay = document.getElementById("shop-coins-display");
                if (shopCoinsDisplay) {
                    updateCoinsDisplay(game, shopCoinsDisplay);
                }
            }
        });
    }

    // Close dialog handler
    if (closeNoHeartsBtn) {
        closeNoHeartsBtn.addEventListener("click", () => {
            noHeartsDialog.classList.add("hidden");
        });
    }

    // Shop dialog handlers
    if (coinsDisplay) {
        coinsDisplay.addEventListener("click", () => {
            shopDialog.classList.remove("hidden");
            // Update shop coins display when opening
            const shopCoinsDisplay = document.getElementById("shop-coins-display");
            if (shopCoinsDisplay) {
                updateCoinsDisplay(game, shopCoinsDisplay);
            }
        });
    }

    if (closeShopBtn) {
        closeShopBtn.addEventListener("click", () => {
            shopDialog.classList.add("hidden");
        });
    }

    // Close shop when clicking backdrop
    if (shopDialog) {
        shopDialog.addEventListener("click", (e) => {
            if (e.target === shopDialog) {
                shopDialog.classList.add("hidden");
            }
        });
    }

    // Shop purchase handlers
    shopBuyBtns.forEach((btn) => {
        // Store original button HTML for restoration
        const originalHTML = btn.innerHTML;

        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const shopItem = btn.closest(".shop-item");
            const coinsAmount = parseInt(shopItem.getAttribute("data-coins"));

            // Validate coinsAmount
            if (isNaN(coinsAmount)) {
                return;
            }

            // Add coins to player's balance
            game.coins = Number(game.coins) + Number(coinsAmount);
            game.saveCoins();

            // Update all coins displays (home, shop, extra moves dialog)
            game.updateCoinsDisplays();

            // Show purchase feedback
            const originalBg = btn.style.background;
            btn.textContent = "✓";
            btn.style.background = "#8bc34a";
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = originalBg;
            }, 1500);
        });
    });
}
