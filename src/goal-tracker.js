// Goal and level progression tracking

import {
    isNormal,
    isBlocked,
    isBlockedWithLife,
    isBlockedMovable,
    isBlockedWithMergeCount,
    isCursed,
    getTileValue,
} from "./tile-helpers.js";
import {
    saveCurrentLevel,
    saveStreak,
    saveSuperStreak,
    isFeatureUnlocked,
    loadCoins,
    saveCoins,
    savePowerUpCounts,
} from "./storage.js";
import { animateCursedExpiration } from "./animator.js";
import { showHomeScreen } from "./home-screen.js";
import { FEATURE_KEYS } from "./config.js";
import { findBestSwap } from "./hint-system.js";

export function checkLevelComplete(game) {
    // Don't check while animations are running
    if (game.animating) return;

    const allGoalsComplete = game.levelGoals.every((goal) => {
        if (goal.goalType === "current") {
            return goal.current >= goal.target;
        } else if (goal.goalType === "blocked") {
            return goal.current >= goal.target;
        } else if (goal.goalType === "cursed") {
            return goal.current >= goal.target;
        } else if (goal.goalType === "score") {
            return goal.current >= goal.target;
        } else {
            return goal.created >= goal.target;
        }
    });
    const nextBtn = document.getElementById("nextBtn");

    if (allGoalsComplete) {
        game.gameActive = false;
        game.deactivatePowerUp();

        // Increment streak (capped at 3) - only if streak feature is unlocked
        if (isFeatureUnlocked(FEATURE_KEYS.STREAK)) {
            game.currentStreak = Math.min(game.currentStreak + 1, 3);
            saveStreak(game.currentStreak);
        }

        // Increment super streak (no cap) - only if board_upgrades feature is unlocked
        if (isFeatureUnlocked(FEATURE_KEYS.SUPER_STREAK)) {
            game.superStreak = game.superStreak + 1;
            saveSuperStreak(game.superStreak);
        }

        // Award 50 coins for completing the level
        const currentCoins = loadCoins();
        const newCoins = currentCoins + 50;
        saveCoins(newCoins);
        game.coins = newCoins;

        // Award one random unlocked power-up (only if persistent power-ups are enabled)
        if (game.persistentPowerUpsEnabled) {
            const unlockedPowerUps = [];
            if (isFeatureUnlocked(FEATURE_KEYS.HAMMER)) unlockedPowerUps.push("hammer");
            if (isFeatureUnlocked(FEATURE_KEYS.HALVE)) unlockedPowerUps.push("halve");
            if (isFeatureUnlocked(FEATURE_KEYS.SWAP)) unlockedPowerUps.push("swap");

            if (unlockedPowerUps.length > 0) {
                const randomPowerUp = unlockedPowerUps[Math.floor(Math.random() * unlockedPowerUps.length)];
                game.powerUpCounts[randomPowerUp].persistent++;
                savePowerUpCounts({
                    hammer: game.powerUpCounts.hammer.persistent,
                    halve: game.powerUpCounts.halve.persistent,
                    swap: game.powerUpCounts.swap.persistent,
                });

                // Show the power-up reward in the UI
                const powerUpReward = document.getElementById("powerUpReward");
                const powerUpRewardIcon = document.getElementById("powerUpRewardIcon");

                if (powerUpReward && powerUpRewardIcon) {
                    const powerUpIcons = {
                        hammer: "🔨",
                        halve: "✂️",
                        swap: "🔄",
                    };

                    powerUpRewardIcon.textContent = powerUpIcons[randomPowerUp];
                    powerUpReward.style.display = "flex";
                }
            }
        }

        // Hide power-ups and show control buttons
        game.hidePowerUps();
        game.showControls();

        // Show only the next button with reward container
        const restartBtn = document.getElementById("restartBtn");
        const continueBtn = document.getElementById("continueBtn");
        const nextLevelContainer = document.getElementById("nextLevelContainer");
        if (nextLevelContainer) nextLevelContainer.style.display = "block";
        if (restartBtn) restartBtn.style.display = "none";
        if (continueBtn) continueBtn.style.display = "none";
        setTimeout(() => {
            // Tracking happens in showLevelSolved
            game.showLevelSolved();
        }, 500);
    } else if (game.movesUsed >= game.maxMoves && !game.hasMatches()) {
        // Only trigger game over if there are no more cascading matches AND no animations running
        game.gameActive = false;
        game.deactivatePowerUp();

        // Hide power-ups
        game.hidePowerUps();

        // Store fail reason for later use
        game.failReason = "No moves left";

        // Show extra moves dialog after a delay to let final animations settle
        setTimeout(() => {
            if (game.extraMovesUsed) {
                // Show level failed screen (heart decrease and streak reset happens in showLevelFailed)
                game.showLevelFailed(game.failReason);
            } else {
                // Show extra moves dialog (first time)
                // Note: Streak is NOT reset here - only when level fully fails
                // Note: Hearts are NOT decreased here - only on full level loss
                game.showExtraMovesDialog();
            }
        }, 800);
    } else if (game.gameActive) {
        // Check if no valid moves are possible even if moves remain
        // Skip check if allowNonMatchingSwaps - always have moves available
        const hasValidMoves = game.allowNonMatchingSwaps || findBestSwap(game) !== null;
        if (!hasValidMoves && !game.hasMatches()) {
            // Game over: no valid moves possible - immediately show level failed (no extra moves option)
            game.gameActive = false;
            game.deactivatePowerUp();
            game.hidePowerUps();

            setTimeout(() => {
                game.showLevelFailed("No moves possible");
            }, 800);
        } else {
            game.hideControls();
            // Show power-ups during active gameplay
            game.showPowerUps();
        }
    }
}

export function updateTileCounts(game) {
    // Count tiles currently on the board for "current" type goals
    game.tileCounts = {};
    for (let row = 0; row < game.boardHeight; row++) {
        for (let col = 0; col < game.boardWidth; col++) {
            const tile = game.board[row][col];
            if (isNormal(tile)) {
                const value = getTileValue(tile);
                game.tileCounts[value] = (game.tileCounts[value] || 0) + 1;
            }
        }
    }

    // Update current counts for "current" type goals
    game.levelGoals.forEach((goal) => {
        if (goal.goalType === "current") {
            goal.current = game.tileCounts[goal.tileValue] || 0;
        }
    });
}

export function countBlockedLevelTiles(game) {
    if (!game.blockedTiles || game.blockedTiles.length === 0) return 0;

    let count = 0;
    game.blockedTiles.forEach((blockedPos) => {
        // Handle rectangular blocks (with width and height)
        if (blockedPos.width !== undefined && blockedPos.height !== undefined) {
            count += blockedPos.width * blockedPos.height;
        } else if (blockedPos.row !== undefined && blockedPos.col !== undefined) {
            const colArray = Array.isArray(blockedPos.col) ? blockedPos.col : [blockedPos.col];
            count += colArray.length;
        } else if (blockedPos.row !== undefined && blockedPos.col === undefined) {
            if (blockedPos.row < game.boardHeight) {
                count += game.boardWidth;
            }
        } else if (blockedPos.col !== undefined && blockedPos.row === undefined) {
            if (blockedPos.col < game.boardWidth) {
                count += game.boardHeight;
            }
        }
    });
    return count;
}

export function countBlockedTiles(game) {
    if (!game.board || !game.board[0]) return 0;

    let count = 0;
    const countedRects = new Set(); // Track rectangular blocks we've already counted

    for (let row = 0; row < game.boardHeight; row++) {
        for (let col = 0; col < game.boardWidth; col++) {
            const tile = game.board[row][col];

            // Handle merge-count tiles specially - count only cells that still need clearing
            if (isBlockedWithMergeCount(tile)) {
                const cellKey = `${row}_${col}`;
                // Only count this cell if it still needs clearing
                if (tile.cellMergeCounts[cellKey] > 0) {
                    count++;
                }
            }
            // Handle regular blocked tiles (not merge-count)
            else if (isBlocked(tile) || isBlockedWithLife(tile) || isBlockedMovable(tile)) {
                // If it's a rectangular block, only count it once
                if (tile.isRectangular) {
                    if (!countedRects.has(tile.rectId)) {
                        countedRects.add(tile.rectId);
                        count += tile.rectWidth * tile.rectHeight;
                    }
                } else {
                    count++;
                }
            }
        }
    }
    return count;
}

export function updateBlockedTileGoals(game) {
    const currentBlockedCount = countBlockedTiles(game);
    const totalBlockedTiles = game.initialBlockedTileCount;
    const clearedCount = totalBlockedTiles - currentBlockedCount;

    game.levelGoals.forEach((goal) => {
        if (goal.goalType === "blocked") {
            goal.current = clearedCount;
            goal.target = totalBlockedTiles;
        }
    });
}

export function nextLevel(game) {
    game.hideControls();
    game.hideLevelSolved();
    // Hide power-up reward
    const powerUpReward = document.getElementById("powerUpReward");
    if (powerUpReward) {
        powerUpReward.style.display = "none";
    }

    // Clear hint and timer when leaving level
    game.clearHint();
    game.clearHintTimer();

    if (game.currentLevel < game.levels.length) {
        game.currentLevel++;
        saveCurrentLevel(game.currentLevel); // Save progress to localStorage
        // Show home screen instead of immediately starting next level
        showHomeScreen(game);
    } else {
        alert("Congratulations! You've completed all levels! 🏆");
    }
}

export function restartLevel(game) {
    game.hideLevelSolved();
    game.hideLevelFailed();
    // Hide power-up reward
    const powerUpReward = document.getElementById("powerUpReward");
    if (powerUpReward) {
        powerUpReward.style.display = "none";
    }
    game.loadLevel(game.currentLevel);
    game.createBoard();
    game.renderBoard();
    game.showGoalDialogIfNeeded();

    // Reset hint system for restarted level
    game.clearHint();
    game.clearHintTimer();
    game.startHintTimer();
}

export function decrementCursedTileTimers(game) {
    // Decrement move counter for cursed tiles, EXCEPT those created this turn
    const cursedTilesToRemove = [];
    const cursedTilesToImplode = [];
    let hasDecrementedAny = false;

    // Scan entire board for cursed tiles
    for (let row = 0; row < game.boardHeight; row++) {
        for (let col = 0; col < game.boardWidth; col++) {
            const tile = game.board[row][col];
            if (tile && isCursed(tile)) {
                // Skip tiles created this turn, but clear the flag for next turn
                if (tile.createdThisTurn) {
                    tile.createdThisTurn = false;
                    continue;
                }

                // Decrement the timer
                tile.cursedMovesRemaining--;
                hasDecrementedAny = true;

                if (tile.cursedMovesRemaining <= 0) {
                    // Check if this cursed goal has implode enabled
                    const value = getTileValue(tile);
                    const cursedGoal = game.levelGoals.find(
                        (goal) => goal.goalType === "cursed" && goal.tileValue === value
                    );

                    if (cursedGoal && cursedGoal.implode) {
                        cursedTilesToImplode.push({ row, col });
                    } else {
                        cursedTilesToRemove.push({ row, col });
                    }
                }
            }
        }
    }

    // Re-render to update counters before animating removals
    if (hasDecrementedAny) {
        game.renderBoard();
    }

    // Trigger animations if tiles expired
    if (cursedTilesToRemove.length > 0 || cursedTilesToImplode.length > 0) {
        animateCursedExpiration(game, cursedTilesToRemove, cursedTilesToImplode, () => game.dropGems());
    }
}
