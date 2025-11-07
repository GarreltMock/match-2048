// Goal and level progression tracking

import { isNormal, isBlocked, isBlockedWithLife, isCursed, getTileValue } from "./tile-helpers.js";
import { saveCurrentLevel } from "./storage.js";
import { animateCursedExpiration } from "./animator.js";
import { showHomeScreen } from "./home-screen.js";

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
        } else {
            return goal.created >= goal.target;
        }
    });
    const nextBtn = document.getElementById("nextBtn");

    if (allGoalsComplete) {
        game.gameActive = false;
        game.deactivatePowerUp();

        // Hide power-ups and show control buttons
        game.hidePowerUps();
        if (game.currentLevel < game.levels.length) {
            nextBtn.style.display = "inline-block";
        }
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

        // Show extra moves dialog after a delay to let final animations settle
        setTimeout(() => {
            if (game.extraMovesUsed) {
                // Show level failed screen (tracking happens in showLevelFailed)
                game.showLevelFailed();
            } else {
                // Show extra moves dialog (first time)
                game.showExtraMovesDialog();
            }
        }, 800);
    } else if (game.gameActive) {
        nextBtn.style.display = "none";
        // Show power-ups during active gameplay
        game.showPowerUps();
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
        if (blockedPos.row !== undefined && blockedPos.col !== undefined) {
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
    for (let row = 0; row < game.boardHeight; row++) {
        for (let col = 0; col < game.boardWidth; col++) {
            const tile = game.board[row][col];
            // Count both blocked tiles and blocked with life tiles
            if (isBlocked(tile) || isBlockedWithLife(tile)) {
                count++;
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
    const nextBtn = document.getElementById("nextBtn");
    nextBtn.style.display = "none";

    game.hideLevelSolved();

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
    game.loadLevel(game.currentLevel);
    game.createBoard();
    game.renderBoard();
    game.showGoalDialogIfNeeded();
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
