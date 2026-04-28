import { FEATURE_KEYS, SUPER_STREAK_THRESHOLD } from "../config.js";
import { isFeatureUnlocked } from "../storage.js";
import { findSolutionPath, mulberry32 } from "../solver.js";
import { track } from "../tracker.js";

export function setupExtraMovesDialog(game) {
    const extraMovesDialog = document.getElementById("extraMovesDialog");
    const extraMoves5Btn = document.getElementById("extraMoves5");
    const loseProgressBtn = document.getElementById("loseProgress");
    const showBoardBtn = document.getElementById("showBoardBtn");
    const continueBtn = document.getElementById("continueBtn");

    if (extraMoves5Btn) {
        extraMoves5Btn.addEventListener("click", () => {
            const isFree = !!game.levelConfig?.freeExtraMoves;
            const EXTRA_MOVES_COST = isFree ? 0 : 900 + game.extraMovesCount * 1000;

            // Check if player has enough coins (or it's free)
            if (isFree || game.coins >= EXTRA_MOVES_COST) {
                // Deduct coins
                if (!isFree) {
                    game.coins -= EXTRA_MOVES_COST;
                    game.saveCoins();
                }

                // Track extra moves usage
                track("extra_moves_used", {
                    level: game.currentLevel,
                    extra_moves_count: 10,
                    included_powerups: true,
                    moves_used: game.movesUsed,
                    cost: EXTRA_MOVES_COST,
                    purchase_number: game.extraMovesCount + 1,
                });

                // Increment extra moves purchase count for this level
                game.extraMovesCount++;

                game.maxMoves += 10;

                // Lock in the seed the solver used so tile drops match the displayed
                // "Solvable in N moves" claim. If the user replays the solver's path,
                // cascades/spawns will line up with the simulation.
                if (game._lockedSeed != null) {
                    game._rng = mulberry32(game._lockedSeed);
                }

                // Add one of each visible power-up (transient for this level only)
                game.getVisiblePowerUpTypes().forEach((type) => {
                    game.powerUpCounts[type].transient++;
                });

                game.updatePowerUpButtons();

                game.updateMovesDisplay();
                extraMovesDialog.classList.add("hidden");
                game.hideControls();
                game.gameActive = true;
                game.showPowerUps();

                // Remove level-ended opacity from game board
                const gameBoard = document.getElementById("gameBoard");
                if (gameBoard) {
                    gameBoard.classList.remove("level-ended");
                }

                // Update coins display
                game.updateCoinsDisplays();
            } else {
                // Not enough coins - open shop instead
                // extraMovesDialog.classList.add("hidden");
                const shopDialog = document.getElementById("shopDialog");
                if (shopDialog) {
                    shopDialog.classList.remove("hidden");
                    // Update shop coins display
                    game.updateCoinsDisplays();
                }
            }
        });
    }

    const tryAgainBtn = document.getElementById("tryAgainBtn");
    if (tryAgainBtn) {
        tryAgainBtn.addEventListener("click", () => {
            const TRY_AGAIN_COST = 900;
            if (game.coins < TRY_AGAIN_COST) {
                const shopDialog = document.getElementById("shopDialog");
                if (shopDialog) {
                    shopDialog.classList.remove("hidden");
                    game.updateCoinsDisplays();
                }
                return;
            }
            game.coins -= TRY_AGAIN_COST;
            game.saveCoins();
            game.updateCoinsDisplays();
            extraMovesDialog.classList.add("hidden");
            const gameBoard = document.getElementById("gameBoard");
            if (gameBoard) gameBoard.classList.remove("level-ended");
            game.restartLevel();
        });
    }

    const giveUpWarning = document.getElementById("giveUpWarning");
    const giveUpWarningText = document.getElementById("giveUpWarningText");
    const confirmGiveUpBtn = document.getElementById("confirmGiveUp");
    const cancelGiveUpBtn = document.getElementById("cancelGiveUp");

    if (loseProgressBtn) {
        loseProgressBtn.addEventListener("click", () => {
            // Build warning message
            let warningText = "<h2>You will lose:</h2>";
            warningText += "<p>1 ♥️ Heart</p>";
            if (game.currentStreak > 0) {
                warningText += `<p>+ 🔥 Your Streak</p>`;
            }
            if (game.superStreak >= SUPER_STREAK_THRESHOLD) {
                warningText += `<p>+ <img style="display: inline-block; height: 1.3rem; vertical-align: sub" src="assets/upgrade-icon_streak.png" alt="Super Upgrade" /> Super Upgrade</p>`;
            }

            // Show warning box
            giveUpWarningText.innerHTML = warningText;
            giveUpWarning.classList.remove("hidden");
            loseProgressBtn.style.display = "none";
        });
    }

    if (confirmGiveUpBtn) {
        confirmGiveUpBtn.addEventListener("click", () => {
            // Hide warning and dialog
            giveUpWarning.classList.add("hidden");
            loseProgressBtn.style.display = "block";
            extraMovesDialog.classList.add("hidden");
            game.hideControls();

            // Show level failed state with the stored fail reason
            setTimeout(() => {
                game.showLevelFailed(game.failReason || "No moves left");
            }, 300);
        });
    }

    if (cancelGiveUpBtn) {
        cancelGiveUpBtn.addEventListener("click", () => {
            // Hide warning, show give up button again
            giveUpWarning.classList.add("hidden");
            loseProgressBtn.style.display = "block";
        });
    }

    if (showBoardBtn) {
        showBoardBtn.addEventListener("click", () => {
            extraMovesDialog.classList.add("hidden");
            game.showControls();

            // Show only continue button
            const continueBtn = document.getElementById("continueBtn");
            const nextLevelContainer = document.getElementById("nextLevelContainer");
            const restartBtn = document.getElementById("restartBtn");
            if (continueBtn) continueBtn.style.display = "inline-block";
            if (nextLevelContainer) nextLevelContainer.style.display = "none";
            if (restartBtn) restartBtn.style.display = "none";
        });
    }

    if (continueBtn) {
        continueBtn.addEventListener("click", () => {
            game.showExtraMovesDialog();
        });
    }
}

export function showExtraMovesDialog(game) {
    const extraMovesDialog = document.getElementById("extraMovesDialog");
    const showBoardBtn = document.getElementById("showBoardBtn");
    const fiveExtraMovesText = document.getElementById("fiveExtraMovesText");
    const gameBoard = document.getElementById("gameBoard");

    if (gameBoard) {
        gameBoard.classList.add("level-ended");
    }

    // Always show the review board button
    if (showBoardBtn) {
        showBoardBtn.classList.remove("hidden");
    }

    // Check how many power-up slots are unlocked
    const anyPowerUpUnlocked = isFeatureUnlocked(FEATURE_KEYS.POWER_UP_1);

    // Show/hide extra-moves power-up buttons based on unlock status
    const extraMovesPowerUps = document.querySelectorAll("#extraMovesDialog .power-up-btn");
    extraMovesPowerUps.forEach((btn) => {
        const powerUpType = btn.dataset.powerup;
        btn.style.display = game.isPowerUpButtonVisible(powerUpType) ? "" : "none";
    });

    // Update the text based on whether any power-ups are unlocked
    if (fiveExtraMovesText) {
        const newText = anyPowerUpUnlocked ? "10 Moves +" : "+10 Moves";
        fiveExtraMovesText.setAttribute("text", newText);
    }

    // Update cost display
    const costDisplay = document.getElementById("extraMovesCostDisplay");
    const coinIcon = document.querySelector("#extraMoves5 .extra-move-coin-icon");
    if (game.levelConfig?.freeExtraMoves) {
        if (costDisplay) costDisplay.textContent = "for free";
        if (coinIcon) coinIcon.style.display = "none";
    } else {
        if (costDisplay) costDisplay.textContent = (900 + game.extraMovesCount * 1000).toLocaleString();
        if (coinIcon) coinIcon.style.display = "";
    }

    // Update coins display
    game.updateCoinsDisplays();

    const continueBtn = document.getElementById("extraMoves5");
    const originalRewardBox = extraMovesDialog.querySelector(".button-container:not(#tryAgainSection) .reward-box");
    const tryAgainSection = document.getElementById("tryAgainSection");

    if (continueBtn) continueBtn.classList.remove("hidden");
    if (originalRewardBox) originalRewardBox.classList.remove("hidden");
    if (tryAgainSection) tryAgainSection.classList.add("hidden");

    const solveHint = document.getElementById("solveHint");
    if (solveHint) {
        if (!game.solverHintEnabled) {
            solveHint.setAttribute("text", "");
        } else {
            try {
                const result = findSolutionPath(game, { maxDepth: 10, beamWidth: 3 });
                if (result.solvable) {
                    game._lockedSeed = result.seed;
                    game._lockedSolutionPath = result.path;
                    const label = result.moves === 1 ? "Solvable in 1 move" : `Solvable in ${result.moves} moves`;
                    solveHint.setAttribute("text", label);
                    if (continueBtn) continueBtn.classList.remove("hidden");
                    if (originalRewardBox) originalRewardBox.classList.remove("hidden");
                    if (tryAgainSection) tryAgainSection.classList.add("hidden");
                    console.log(
                        `[solver] ${label} (seed=${result.seed}):\n` +
                            result.path
                                .map((s, i) => `  ${i + 1}. (${s.row1},${s.col1}) <-> (${s.row2},${s.col2})`)
                                .join("\n"),
                    );
                } else {
                    game._lockedSeed = null;
                    game._lockedSolutionPath = null;
                    if (game.tryAgainEnabled) {
                        solveHint.setAttribute("text", "Not solvable in 10 moves");
                        if (continueBtn) continueBtn.classList.add("hidden");
                        if (originalRewardBox) originalRewardBox.classList.add("hidden");
                        if (tryAgainSection) {
                            const keepBox = document.getElementById("tryAgainKeepBox");
                            if (keepBox) {
                                let parts = ["♥️"];
                                if (isFeatureUnlocked(FEATURE_KEYS.STREAK) && game.currentStreak > 0) {
                                    parts.push("🔥");
                                }
                                if (game.superStreak >= SUPER_STREAK_THRESHOLD) {
                                    parts.push(
                                        `<img src="assets/upgrade-icon_streak.png" alt="Super Upgrade" class="try-again-streak-icon" />`,
                                    );
                                }
                                keepBox.innerHTML = "Keep " + parts.join(" + ");
                            }
                            tryAgainSection.classList.remove("hidden");
                        }
                    } else {
                        solveHint.setAttribute("text", "");
                    }
                }
            } catch (err) {
                console.error("Solver failed:", err);
                solveHint.setAttribute("text", "");
            }
        }
    }

    extraMovesDialog.classList.remove("hidden");
}
