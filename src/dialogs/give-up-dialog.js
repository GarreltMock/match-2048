import { FEATURE_KEYS, SUPER_STREAK_THRESHOLD } from "../config.js";
import { isFeatureUnlocked, saveStreak, saveSuperStreak } from "../storage.js";
import { track } from "../tracker.js";
import { showHomeScreen } from "../home-screen.js";

export function showGiveUpDialog(game) {
    const giveUpDialog = document.getElementById("giveUpDialog");
    const streakDisplay = document.getElementById("giveUpStreakDisplay");

    // Build streak display
    let streaksHTML = "";

    if (isFeatureUnlocked(FEATURE_KEYS.STREAK) && game.currentStreak > 0) {
        streaksHTML += `<div class="streak-item"><span>🔥</span><span>Your ${game.currentStreak}-win streak</span></div>`;
    }

    if (game.superStreak >= SUPER_STREAK_THRESHOLD) {
        streaksHTML += `<div class="streak-item"><img src="assets/upgrade-icon_streak.png" alt="Super Upgrade" /><span>Super Upgrade</span></div>`;
    }

    if (streakDisplay) {
        streakDisplay.innerHTML = streaksHTML;
    }

    if (giveUpDialog) {
        giveUpDialog.classList.remove("hidden");
    }
}

export function setupGiveUpDialog(game) {
    const giveUpDialog = document.getElementById("giveUpDialog");
    const cancelGiveUpBtn = document.getElementById("cancelGiveUpBtn");
    const confirmGiveUpBtnDialog = document.getElementById("confirmGiveUpBtnDialog");

    if (cancelGiveUpBtn) {
        cancelGiveUpBtn.addEventListener("click", () => {
            giveUpDialog.classList.add("hidden");
        });
    }

    if (confirmGiveUpBtnDialog) {
        confirmGiveUpBtnDialog.addEventListener("click", () => {
            giveUpDialog.classList.add("hidden");
            game.gameActive = false;

            // Go back to home screen
            setTimeout(() => {
                // Decrease heart
                if (!game.heartDecreasedThisAttempt) {
                    game.decreaseHeart();
                    game.heartDecreasedThisAttempt = true;
                }

                // Reset streak on give up - only if streak feature is unlocked
                if (isFeatureUnlocked(FEATURE_KEYS.STREAK)) {
                    game.currentStreak = 0;
                    saveStreak(game.currentStreak);
                }

                if (game.superStreak >= SUPER_STREAK_THRESHOLD) {
                    // Reset super streak on give up
                    game.superStreak = 0;
                    saveSuperStreak(game.superStreak);
                }

                // Track that player gave up
                track("level_gave_up", {
                    level: game.currentLevel,
                    moves_used: game.movesUsed,
                    max_moves: game.maxMoves,
                });

                // Show home screen with updated displays (hearts, streaks, etc.)
                showHomeScreen(game);
            }, 100);
        });
    }

    // Click outside to close
    if (giveUpDialog) {
        giveUpDialog.addEventListener("click", (e) => {
            if (e.target === giveUpDialog) {
                giveUpDialog.classList.add("hidden");
            }
        });
    }
}
