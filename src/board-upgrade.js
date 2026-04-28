import { SUPER_STREAK_THRESHOLD, TILE_TYPE } from "./config.js";
import { renderBoardUpgrades, updateGoalDisplay } from "./renderer.js";
import { createBlockedMovableTile, createBlockedTile, createTile } from "./tile-helpers.js";

/**
 * Check if a newly-created tile value should trigger a per-level board upgrade.
 */
export function checkAndShiftTileLevels(game, newlyCreatedValue) {
    const currentLevelConfig = game.levels[game.currentLevel - 1];

    if (currentLevelConfig.boardUpgrades) {
        const upgrades = currentLevelConfig.boardUpgrades;

        if (upgrades.includes(newlyCreatedValue) && !game.completedUpgrades.includes(newlyCreatedValue)) {
            game.pendingTileLevelShift = true;
            game.completedUpgrades.push(newlyCreatedValue);
        }
    }
}

/**
 * Execute tile level shift with animation.
 * Returns a promise that resolves when animation completes.
 */
export function shiftTileLevels(game) {
    return new Promise((resolve) => {
        const currentLevelConfig = game.levels[game.currentLevel - 1];
        const hasPerLevelUpgrades = currentLevelConfig?.boardUpgrades?.length > 0;

        // Check if we should proceed with shift
        if (!game.pendingTileLevelShift) {
            resolve();
            return;
        }

        // If no per-level upgrades, return
        if (!hasPerLevelUpgrades) {
            resolve();
            return;
        }

        // Clear the flag
        game.pendingTileLevelShift = false;

        const minValue = Math.min(...game.tileValues);
        const maxValue = Math.max(...game.tileValues);

        // Find all tiles that need to be removed/transformed
        const tilesToRemove = [];
        for (let row = 0; row < game.boardHeight; row++) {
            for (let col = 0; col < game.boardWidth; col++) {
                const tile = game.board[row][col];
                if (tile && tile.type === TILE_TYPE.NORMAL && tile.value === minValue) {
                    tilesToRemove.push({ row, col });
                }
            }
        }

        if (tilesToRemove.length === 0) {
            resolve();
            return;
        }

        // Determine which action to use (super streak uses superUpgradeAction, otherwise boardUpgradeAction)
        const effectiveAction =
            game.superStreak >= SUPER_STREAK_THRESHOLD ? game.superUpgradeAction : game.boardUpgradeAction;

        // Animate tiles based on action type
        tilesToRemove.forEach(({ row, col }) => {
            const element = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (element && !element.classList.contains("sliding") && !element.classList.contains("merge-target")) {
                if (effectiveAction === "blocked" || effectiveAction === "blocked_movable") {
                    // Bump animation for blocked transformation
                    element.classList.add("tile-to-blocked");
                } else if (effectiveAction === "double") {
                    // Pulse animation for doubling
                    element.style.transition = "transform 0.4s ease";
                    element.style.transform = "scale(1.2)";
                    setTimeout(() => {
                        element.style.transform = "scale(1)";
                    }, 200);
                } else {
                    // Disappear animation
                    element.style.transition = "transform 0.4s ease, opacity 0.4s ease";
                    element.style.opacity = "0";
                    element.style.transform = "scale(0.5)";
                    element.classList.add("tile-removing");
                }
            }
        });

        // After animation, update board state
        setTimeout(() => {
            tilesToRemove.forEach(({ row, col }) => {
                const element = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);

                if (effectiveAction === "blocked") {
                    // Transform to blocked tile
                    game.board[row][col] = createBlockedTile();
                    // Note: element will be recreated by dropGems' renderBoard
                } else if (effectiveAction === "blocked_movable") {
                    // Transform to blocked movable tile
                    game.board[row][col] = createBlockedMovableTile();
                    // Note: element will be recreated by dropGems' renderBoard
                } else if (effectiveAction === "double") {
                    // Double the value (add 1 to internal value: 2->3, 3->4, etc.)
                    const currentTile = game.board[row][col];
                    if (currentTile && currentTile.value === minValue) {
                        game.board[row][col] = createTile(minValue + 1, currentTile.specialType);
                    }
                    // Element will be updated by renderBoard below
                } else {
                    // Disappear - remove from board state
                    game.board[row][col] = null;
                }

                // Remove the element so renderBoard can start fresh (except for double action)
                if (element && effectiveAction !== "double") {
                    element.remove();
                }
            });

            // Update spawnableTiles: remove smallest, add next
            game.tileValues = game.tileValues.filter((v) => v !== minValue);
            game.tileValues.push(maxValue + 1);
            game.tileValues.sort((a, b) => a - b);

            // Re-render board for double action to show updated values
            if (effectiveAction === "double") {
                game.renderBoard();
            }

            // Update board upgrades display to show completion
            renderBoardUpgrades(game);

            // If blocked tiles were added, update the blocked goal target
            if (effectiveAction === "blocked" || effectiveAction === "blocked_movable") {
                const blockedTilesAdded = tilesToRemove.length;
                game.levelGoals.forEach((goal) => {
                    if (goal.goalType === "blocked") {
                        goal.target += blockedTilesAdded;
                        // Update initialBlockedTileCount to reflect new total
                        game.initialBlockedTileCount += blockedTilesAdded;
                    }
                });
                // Update the goal display to reflect new target
                updateGoalDisplay(game);
            }

            // Continue with the cascade - dropGems will handle rendering and animation
            resolve();
        }, 400);
    });
}
