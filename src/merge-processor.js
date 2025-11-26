// Match processing and tile merging logic

import {
    createTile,
    createJokerTile,
    createCursedTile,
    isBlocked,
    isBlockedWithLife,
    isBlockedMovable,
    isCursed,
    getTileValue,
    isTileStickyFreeSwapTile,
    getDisplayValue,
} from "./tile-helpers.js";
import { animateMerges, animateUnblocking } from "./animator.js";
import { savePowerUpCounts } from "./storage.js";

export function processMatches(game) {
    const matchGroups = game.findMatches();

    // Reset user swap flag after finding matches
    game.isUserSwap = false;

    if (matchGroups.length === 0) {
        // No matches found, allow interactions again
        game.animating = false;
        return;
    }

    // Calculate score using display values (not internal values)
    let totalScore = 0;
    matchGroups.forEach((group) => {
        const displayValue = getDisplayValue(group.value, game.numberBase);
        totalScore += displayValue * group.tiles.length;
    });

    // Update score
    game.score += totalScore;
    game.saveScore(); // Save score to localStorage

    // Track score towards score goals
    game.levelGoals.forEach((goal) => {
        if (goal.goalType === "score") {
            goal.current += totalScore;
        }
    });

    // Check for blocked tiles adjacent to original match positions and unblock them
    unblockAdjacentTiles(game, matchGroups);

    // Start merge animations
    animateMerges(game, matchGroups, (matchGroups) => processMerges(game, matchGroups));
}

export function processMerges(game, matchGroups) {
    // Check for sticky free swap tiles BEFORE clearing the board
    matchGroups.forEach((group) => {
        group.hasStickyFreeSwap = group.tiles.some((tile) => {
            const boardTile = game.board[tile.row][tile.col];
            return isTileStickyFreeSwapTile(boardTile);
        });
    });

    // Track cursed tiles that were successfully merged
    const mergedCursedTiles = [];
    matchGroups.forEach((group) => {
        group.tiles.forEach((tile) => {
            const boardTile = game.board[tile.row][tile.col];
            if (isCursed(boardTile)) {
                mergedCursedTiles.push({ row: tile.row, col: tile.col });
            }
        });
    });

    // Update cursed goal progress for successfully merged cursed tiles
    mergedCursedTiles.forEach((pos) => {
        const tile = game.board[pos.row][pos.col];
        const value = getTileValue(tile);
        game.levelGoals.forEach((goal) => {
            if (goal.goalType === "cursed" && goal.tileValue === value) {
                goal.current++;
            }
        });
    });

    // Track match statistics (only for user-initiated matches)
    if (game.isUserSwap) {
        matchGroups.forEach((group) => {
            const tileCount = group.tiles.length;
            const direction = group.direction;

            if (direction === "T-formation") {
                game.matchStats.tFormationCount++;
            } else if (direction === "L-formation") {
                game.matchStats.lFormationCount++;
            } else if (direction === "block") {
                game.matchStats.blockFormationCount++;
            } else if (tileCount === 5) {
                game.matchStats.match5Count++;
            } else if (tileCount === 4) {
                game.matchStats.match4Count++;
            } else if (tileCount === 3) {
                game.matchStats.match3Count++;
            }
        });
    }

    // Clear all matched tiles first
    matchGroups.forEach((group) => {
        group.tiles.forEach((tile) => {
            game.board[tile.row][tile.col] = null;
        });
    });

    // Create new merged tiles
    matchGroups.forEach((group) => {
        createMergedTiles(game, group);
    });

    // Clear swap position after processing
    game.lastSwapPosition = null;

    // Update goal display after creating new tiles (without checking completion)
    // Let the natural cascade completion in dropGems handle checkLevelComplete
    game.updateGoalDisplay(false);

    // Clean up animation classes
    document.querySelectorAll(".gem").forEach((gem) => {
        gem.classList.remove("sliding", "merge-target", "unblocking");
        gem.style.transform = "";
        gem.style.transition = "";
        gem.style.opacity = "";
        gem.style.zIndex = "";
    });

    // Re-render the board to show the merged tiles in their new state
    // This is important so that when we animate tile removal, the board is in the correct state
    game.renderBoard();

    // Check if we need to shift tile levels before continuing with cascade
    // This will animate the removal and then continue
    if (game.pendingTileLevelShift) {
        // Small delay to allow the render to complete
        setTimeout(() => {
            game.shiftTileLevels().then(() => {
                game.dropGems();
            });
        }, 50);
    } else {
        game.dropGems();
    }
}

export function createMergedTiles(game, group) {
    const formationType = getFormationConfig(group.direction);
    const specialTileType = formationType ? game.specialTileConfig[formationType] : null;

    // Check if this formation grants a power-up (in power-up rewards mode)
    if (game.usePowerUpRewards && specialTileType && specialTileType.startsWith("powerup_")) {
        const powerUpType = specialTileType.replace("powerup_", ""); // "hammer", "halve", or "swap"
        grantPowerUp(game, powerUpType, group);
    }

    // Calculate positions and value based on formation type
    const isTLFormation = group.direction === "T-formation" || group.direction === "L-formation";
    const is5LineFormation = group.direction === "line_5_horizontal" || group.direction === "line_5_vertical";
    const positions = isTLFormation ? [group.intersection] : calculateMiddlePositions(game, group.tiles, group);
    const valueIncrement = isTLFormation || is5LineFormation ? 2 : 1;

    // Check if any tile in the match was a golden tile - if so, add +1 to the result
    const goldenBonus = group.hasGoldenTile ? 1 : 0;
    const newValue = group.value + valueIncrement + goldenBonus;

    // Check if sticky free swap should transfer (detected before tiles were cleared)
    // If so, and this was NOT a user swap, transfer the sticky free swap to the merged tile
    const hasStickyFreeSwap = group.hasStickyFreeSwap || false;
    const transferStickyFreeSwap = hasStickyFreeSwap && !game.isUserSwap;

    // Track intermediate value if golden bonus was applied
    if (goldenBonus > 0) {
        trackGoalProgress(game, newValue - goldenBonus, 1);
    }

    // Handle special tile types
    if (specialTileType === "joker") {
        if (positions.length > 1) {
            const formationKey = group.direction.includes("block") ? "block_4" : "line_4";
            const specialPos = determineSpecialTilePosition(game, group, formationKey);
            const normalPos = positions.find((p) => p.row !== specialPos.row || p.col !== specialPos.col);

            game.board[specialPos.row][specialPos.col] = createJokerTile();
            game.board[normalPos.row][normalPos.col] = createTile(
                newValue,
                false,
                false,
                false,
                transferStickyFreeSwap
            );
            trackGoalProgress(game, newValue, 1);
        } else {
            game.board[positions[0].row][positions[0].col] = createJokerTile();
        }
    } else if (specialTileType === "power") {
        if (positions.length > 1) {
            const formationKey = group.direction.includes("block") ? "block_4" : "line_4";
            const specialPos = determineSpecialTilePosition(game, group, formationKey);
            const normalPos = positions.find((p) => p.row !== specialPos.row || p.col !== specialPos.col);

            game.board[specialPos.row][specialPos.col] = createTile(
                newValue,
                true,
                false,
                false,
                transferStickyFreeSwap
            );
            game.board[normalPos.row][normalPos.col] = createTile(
                newValue,
                false,
                false,
                false,
                transferStickyFreeSwap
            );
            trackGoalProgress(game, newValue, 2);
        } else {
            game.board[positions[0].row][positions[0].col] = createTile(
                newValue,
                true,
                false,
                false,
                transferStickyFreeSwap
            );
            trackGoalProgress(game, newValue, 1);
        }
    } else if (specialTileType === "golden") {
        if (positions.length > 1) {
            const formationKey = group.direction.includes("block") ? "block_4" : "line_4";
            const specialPos = determineSpecialTilePosition(game, group, formationKey);
            const normalPos = positions.find((p) => p.row !== specialPos.row || p.col !== specialPos.col);

            game.board[specialPos.row][specialPos.col] = createTile(
                newValue,
                false,
                true,
                false,
                transferStickyFreeSwap
            );
            game.board[normalPos.row][normalPos.col] = createTile(
                newValue,
                false,
                false,
                false,
                transferStickyFreeSwap
            );
            trackGoalProgress(game, newValue, 2);
        } else {
            game.board[positions[0].row][positions[0].col] = createTile(
                newValue,
                false,
                true,
                false,
                transferStickyFreeSwap
            );
            trackGoalProgress(game, newValue, 1);
        }
    } else if (specialTileType === "freeswap") {
        if (positions.length > 1) {
            const formationKey = group.direction.includes("block") ? "block_4" : "line_4";
            const specialPos = determineSpecialTilePosition(game, group, formationKey);
            const normalPos = positions.find((p) => p.row !== specialPos.row || p.col !== specialPos.col);

            game.board[specialPos.row][specialPos.col] = createTile(
                newValue,
                false,
                false,
                true,
                transferStickyFreeSwap
            );
            game.board[normalPos.row][normalPos.col] = createTile(
                newValue,
                false,
                false,
                false,
                transferStickyFreeSwap
            );
            trackGoalProgress(game, newValue, 2);
        } else {
            game.board[positions[0].row][positions[0].col] = createTile(
                newValue,
                false,
                false,
                true,
                transferStickyFreeSwap
            );
            trackGoalProgress(game, newValue, 1);
        }
    } else if (specialTileType === "sticky_freeswap") {
        if (positions.length > 1) {
            const formationKey = group.direction.includes("block") ? "block_4" : "line_4";
            const specialPos = determineSpecialTilePosition(game, group, formationKey);
            const normalPos = positions.find((p) => p.row !== specialPos.row || p.col !== specialPos.col);

            game.board[specialPos.row][specialPos.col] = createTile(newValue, false, false, false, true);
            game.board[normalPos.row][normalPos.col] = createTile(
                newValue,
                false,
                false,
                false,
                transferStickyFreeSwap
            );
            trackGoalProgress(game, newValue, 2);
        } else {
            game.board[positions[0].row][positions[0].col] = createTile(newValue, false, false, false, true);
            trackGoalProgress(game, newValue, 1);
        }
    } else if (specialTileType === "freeswap_horizontal" || specialTileType === "freeswap_vertical") {
        // Determine swap direction from lastSwapPosition
        let isHorizontal = false;
        if (game.lastSwapPosition && game.lastSwapPosition.movedFrom) {
            const fromRow = game.lastSwapPosition.movedFrom.row;
            const fromCol = game.lastSwapPosition.movedFrom.col;
            const toRow = game.lastSwapPosition.row;
            const toCol = game.lastSwapPosition.col;

            // If rows are the same, it's a horizontal swap (columns differ)
            isHorizontal = (fromRow === toRow);
        }

        // Create directional free swap tiles based on the actual swap direction
        if (positions.length > 1) {
            const formationKey = group.direction.includes("block") ? "block_4" : "line_4";
            const specialPos = determineSpecialTilePosition(game, group, formationKey);
            const normalPos = positions.find((p) => p.row !== specialPos.row || p.col !== specialPos.col);

            game.board[specialPos.row][specialPos.col] = createTile(
                newValue,
                false,
                false,
                false,
                transferStickyFreeSwap,
                isHorizontal, // isFreeSwapHorizontalTile
                !isHorizontal // isFreeSwapVerticalTile
            );
            game.board[normalPos.row][normalPos.col] = createTile(
                newValue,
                false,
                false,
                false,
                transferStickyFreeSwap
            );
            trackGoalProgress(game, newValue, 2);
        } else {
            game.board[positions[0].row][positions[0].col] = createTile(
                newValue,
                false,
                false,
                false,
                transferStickyFreeSwap,
                isHorizontal, // isFreeSwapHorizontalTile
                !isHorizontal // isFreeSwapVerticalTile
            );
            trackGoalProgress(game, newValue, 1);
        }
    } else {
        // No special tile - create normal tiles at all positions
        // However, if transferStickyFreeSwap is true, the merged tiles should inherit the sticky free swap ability
        positions.forEach((pos) => {
            game.board[pos.row][pos.col] = createTile(newValue, false, false, false, transferStickyFreeSwap);
        });
        trackGoalProgress(game, newValue, positions.length);
    }

    // After creating merged tiles, check if any should become cursed
    positions.forEach((pos) => {
        checkAndCreateCursedTile(game, newValue, pos);
    });

    // Check if we need to shift tile levels based on the newly created value
    // This just sets a flag and the highest value reached, doesn't execute the shift yet
    game.checkAndShiftTileLevels(newValue);
}

export function determineSpecialTilePosition(game, group, formationType) {
    // For 4-tile formations, determine which of the 2 middle positions should get the special tile
    // based on where the last swap was made
    if (!game.lastSwapPosition) {
        // If no swap info, default to first middle position
        if (formationType === "block_4") {
            return group.intersections[0];
        } else {
            const middlePositions = calculateMiddlePositions(game, group.tiles);
            return middlePositions[0];
        }
    }

    const swapPos = game.lastSwapPosition;

    if (formationType === "block_4") {
        // For block formation, choose the intersection closest to swap position
        // First check if the swapped tile is one of the intersections
        const matchingIntersection = group.intersections.find(
            (pos) => pos.row === swapPos.row && pos.col === swapPos.col
        );
        if (matchingIntersection) {
            return matchingIntersection;
        }

        // Otherwise, find which intersection is adjacent to the swapped position
        // The 2x2 block has positions at [r,c], [r,c+1], [r+1,c], [r+1,c+1]
        // Intersections are at [r,c+1] (top-right) and [r+1,c] (bottom-left)
        const adjacentIntersection = group.intersections.find((pos) => {
            const isAdjacent =
                (Math.abs(pos.row - swapPos.row) === 1 && pos.col === swapPos.col) ||
                (Math.abs(pos.col - swapPos.col) === 1 && pos.row === swapPos.row);
            return isAdjacent;
        });

        if (adjacentIntersection) {
            return adjacentIntersection;
        }

        // Fallback to distance-based (shouldn't reach here in normal gameplay)
        const distances = group.intersections.map((pos) => {
            const dist = Math.abs(pos.row - swapPos.row) + Math.abs(pos.col - swapPos.col);
            return { pos, dist };
        });
        distances.sort((a, b) => a.dist - b.dist);
        return distances[0].pos;
    } else if (formationType === "line_4") {
        // For line formation, choose the middle position that contains the swapped tile
        const middlePositions = calculateMiddlePositions(game, group.tiles);

        // Check if swap position matches one of the middle positions
        const matchingPos = middlePositions.find((pos) => pos.row === swapPos.row && pos.col === swapPos.col);

        if (matchingPos) {
            return matchingPos;
        }

        // If swap position doesn't match, choose closest middle position
        const distances = middlePositions.map((pos) => {
            const dist = Math.abs(pos.row - swapPos.row) + Math.abs(pos.col - swapPos.col);
            return { pos, dist };
        });
        distances.sort((a, b) => a.dist - b.dist);
        return distances[0].pos;
    }

    return null;
}

function getFormationConfig(direction) {
    // Map direction to formation type for special tile config
    const formationMap = {
        "T-formation": "t_formation",
        "L-formation": "l_formation",
        block_4_formation: "block_4",
        line_4_horizontal: "line_4",
        line_4_vertical: "line_4",
        line_5_horizontal: "line_5",
        line_5_vertical: "line_5",
    };
    return formationMap[direction] || null;
}

function calculateMiddlePositions(game, tiles, group = null) {
    const positions = [];
    const length = tiles.length;

    // Special handling for T and L formations
    if (group && (group.direction === "T-formation" || group.direction === "L-formation")) {
        // For special formations, the "middle" position is the intersection
        positions.push(group.intersection);
        return positions;
    }

    // Special handling for block formations
    if (group && group.direction === "block_4_formation") {
        // For block formations, the "middle" positions are the two intersections
        return group.intersections;
    }

    // Special handling for 5-tile lines (should create 1 tile with 4x value)
    if (group && (group.direction === "line_5_horizontal" || group.direction === "line_5_vertical")) {
        // 5 tiles: middle position only (creates 1 tile with 4x value)
        positions.push(tiles[2]);
        return positions;
    }

    // Regular match logic
    if (length === 3) {
        // 3 tiles: middle position (creates 1 tile with 2x value)
        positions.push(tiles[1]);
    } else if (length === 4) {
        // 4 tiles: two middle positions (creates 2 tiles with 2x value)
        positions.push(tiles[1]);
        positions.push(tiles[2]);
    } else if (length >= 5) {
        // 5+ tiles: single middle position (creates 1 tile with 4x value)
        positions.push(tiles[Math.floor(length / 2)]);
    }

    return positions;
}

function unblockAdjacentTiles(game, matchGroups) {
    const blockedTilesToRemove = [];
    const goalTilesToDamage = [];

    matchGroups.forEach((group) => {
        // Get where the new merged tile(s) will be created
        let targetPositions = [];
        if (group.direction === "T-formation" || group.direction === "L-formation") {
            targetPositions.push(group.intersection);
        } else if (group.direction === "block_4_formation") {
            targetPositions.push(...group.intersections);
        } else {
            const middlePositions = calculateMiddlePositions(game, group.tiles, group);
            targetPositions.push(...middlePositions);
        }

        // Calculate the damage value from this match (the value of tiles being matched, not the merged result)
        const damageValue = getDisplayValue(group.value, game.numberBase);

        // Check each tile in the original match for adjacent blocked/goal tiles
        group.tiles.forEach((matchTile) => {
            const adjacentPositions = [
                { row: matchTile.row - 1, col: matchTile.col }, // Up
                { row: matchTile.row + 1, col: matchTile.col }, // Down
                { row: matchTile.row, col: matchTile.col - 1 }, // Left
                { row: matchTile.row, col: matchTile.col + 1 }, // Right
            ];

            adjacentPositions.forEach((pos) => {
                // Check bounds
                if (pos.row >= 0 && pos.row < game.boardHeight && pos.col >= 0 && pos.col < game.boardWidth) {
                    const tile = game.board[pos.row][pos.col];

                    // Handle blocked tiles and blocked movable tiles (remove immediately)
                    if (isBlocked(tile) || isBlockedMovable(tile)) {
                        // Avoid duplicates
                        if (!blockedTilesToRemove.some((t) => t.row === pos.row && t.col === pos.col)) {
                            // Find the closest target position for animation
                            let closestTarget = targetPositions[0];
                            let closestDistance =
                                Math.abs(pos.row - closestTarget.row) + Math.abs(pos.col - closestTarget.col);

                            targetPositions.forEach((target) => {
                                const distance = Math.abs(pos.row - target.row) + Math.abs(pos.col - target.col);
                                if (distance < closestDistance) {
                                    closestDistance = distance;
                                    closestTarget = target;
                                }
                            });

                            blockedTilesToRemove.push({
                                row: pos.row,
                                col: pos.col,
                                targetPos: closestTarget,
                            });
                        }
                    }
                    // Handle blocked tiles with life (apply damage)
                    else if (isBlockedWithLife(tile)) {
                        // Avoid duplicates - if already in list, add damage to existing entry
                        const existingEntry = goalTilesToDamage.find((t) => t.row === pos.row && t.col === pos.col);
                        if (existingEntry) {
                            existingEntry.damage += damageValue;
                        } else {
                            // Find the closest target position for animation
                            let closestTarget = targetPositions[0];
                            let closestDistance =
                                Math.abs(pos.row - closestTarget.row) + Math.abs(pos.col - closestTarget.col);

                            targetPositions.forEach((target) => {
                                const distance = Math.abs(pos.row - target.row) + Math.abs(pos.col - target.col);
                                if (distance < closestDistance) {
                                    closestDistance = distance;
                                    closestTarget = target;
                                }
                            });

                            goalTilesToDamage.push({
                                row: pos.row,
                                col: pos.col,
                                damage: damageValue,
                                targetPos: closestTarget,
                            });
                        }
                    }
                }
            });
        });
    });

    // Apply damage to blocked tiles with life
    goalTilesToDamage.forEach((entry) => {
        const tile = game.board[entry.row][entry.col];
        if (isBlockedWithLife(tile)) {
            tile.lifeValue -= entry.damage;
            // If life goes below or equal to 0, mark for removal
            if (tile.lifeValue <= 0) {
                blockedTilesToRemove.push({
                    row: entry.row,
                    col: entry.col,
                    targetPos: entry.targetPos,
                });
            }
        }
    });

    // Animate and remove blocked tiles
    animateUnblocking(
        game,
        blockedTilesToRemove,
        () => game.updateBlockedTileGoals(),
        (check) => game.updateGoalDisplay(check)
    );
}

function trackGoalProgress(game, newValue, count = 1) {
    // Update goal progress when tiles are created
    game.levelGoals.forEach((goal) => {
        if (goal.tileValue === newValue) {
            goal.created += count;
        }
    });
}

export function checkAndCreateCursedTile(game, value, position) {
    // Check if this value has a cursed goal
    const cursedGoal = game.levelGoals.find((goal) => goal.goalType === "cursed" && goal.tileValue === value);

    if (!cursedGoal) {
        return false; // No cursed goal for this value
    }

    // Check if cursed goal is already complete
    if (cursedGoal.current >= cursedGoal.target) {
        return false; // Goal complete, no more cursed tiles
    }

    // Special handling for frequency: 0
    // Always keep exactly one cursed tile on the board
    if (cursedGoal.frequency === 0) {
        // Check if we already created one this turn (to prevent multiple during cascades)
        if (game.cursedTileCreatedThisTurn[value]) {
            return false;
        }

        // Scan the entire board to count cursed tiles of this value
        let cursedCount = 0;
        for (let row = 0; row < game.boardHeight; row++) {
            for (let col = 0; col < game.boardWidth; col++) {
                const tile = game.board[row][col];
                if (tile && isCursed(tile) && getTileValue(tile) === value) {
                    cursedCount++;
                }
            }
        }

        // Only create if none exist
        if (cursedCount === 0) {
            const currentTile = game.board[position.row][position.col];
            if (currentTile && getTileValue(currentTile) === value) {
                const cursedTile = createCursedTile(value, cursedGoal.strength);
                game.board[position.row][position.col] = cursedTile;
                game.cursedTileCreatedThisTurn[value] = true; // Mark as created this turn
                return true;
            }
        }
        return false;
    }

    // Normal frequency handling (frequency >= 1)
    // Track how many tiles of this value have been created
    if (!game.cursedTileCreatedCount[value]) {
        game.cursedTileCreatedCount[value] = 0;
    }
    game.cursedTileCreatedCount[value]++;

    // Check if frequency is met (every Nth tile becomes cursed)
    if (game.cursedTileCreatedCount[value] % cursedGoal.frequency === 0) {
        // Convert the tile at this position to a cursed tile
        const currentTile = game.board[position.row][position.col];
        if (currentTile && getTileValue(currentTile) === value) {
            // Create cursed tile with full strength - decrement will happen at end of turn
            const cursedTile = createCursedTile(value, cursedGoal.strength);
            game.board[position.row][position.col] = cursedTile;

            return true; // Cursed tile created
        }
    }

    return false; // Not cursed
}

/**
 * Grant a power-up to the player and animate the icon flying to the power-up button
 * @param {Match3Game} game - The game instance
 * @param {string} powerUpType - Type of power-up ("hammer", "halve", or "swap")
 * @param {object} group - The match group that triggered the power-up reward
 */
function grantPowerUp(game, powerUpType, group) {
    // Increment the power-up count
    if (game.powerUpRemaining[powerUpType] !== undefined) {
        game.powerUpRemaining[powerUpType]++;

        game.updatePowerUpButtons();

        // Trigger flying animation
        animatePowerUpGrant(game, powerUpType, group);
    }
}

/**
 * Animate the power-up icon flying from the merge position to the power-up button
 * @param {Match3Game} game - The game instance
 * @param {string} powerUpType - Type of power-up ("hammer", "halve", or "swap")
 * @param {object} group - The match group that triggered the power-up reward
 */
function animatePowerUpGrant(game, powerUpType, group) {
    // Determine the start position (intersection or middle of match)
    let startPos;
    if (group.direction === "T-formation" || group.direction === "L-formation") {
        startPos = group.intersection;
    } else if (group.direction === "block_4_formation" && group.intersections) {
        startPos = group.intersections[0];
    } else {
        const middlePositions = calculateMiddlePositions(game, group.tiles, group);
        startPos = middlePositions[0];
    }

    // Get the DOM element position for the merge
    const mergeElement = document.querySelector(`[data-row="${startPos.row}"][data-col="${startPos.col}"]`);
    if (!mergeElement) return;

    // Get the target power-up button
    const powerUpButton = document.querySelector(`[data-powerup="${powerUpType}"]`);
    if (!powerUpButton) return;

    // Get positions
    const mergeRect = mergeElement.getBoundingClientRect();
    const buttonRect = powerUpButton.getBoundingClientRect();

    // Get power-up icon
    const powerUpIcons = {
        hammer: "🔨",
        halve: "✂️",
        swap: "🔄",
    };
    const icon = powerUpIcons[powerUpType] || "⚡";

    // Create flying icon element
    const flyingIcon = document.createElement("div");
    flyingIcon.className = "flying-powerup-icon";
    flyingIcon.textContent = icon;
    // Position centered on the merge tile (accounting for the 60px circular background)
    flyingIcon.style.left = `${mergeRect.left + mergeRect.width / 2 - 30}px`;
    flyingIcon.style.top = `${mergeRect.top + mergeRect.height / 2 - 30}px`;

    // Calculate the translation needed (also accounting for the circular background size)
    const deltaX = buttonRect.left + buttonRect.width / 2 - (mergeRect.left + mergeRect.width / 2);
    const deltaY = buttonRect.top + buttonRect.height / 2 - (mergeRect.top + mergeRect.height / 2);

    document.body.appendChild(flyingIcon);

    // Use transform for the animation - smooth movement with a slight bounce
    requestAnimationFrame(() => {
        flyingIcon.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.7)`;
    });

    // Remove element after animation
    setTimeout(() => {
        flyingIcon.remove();
        // Add a pulse effect to the power-up button
        powerUpButton.style.animation = "none";
        requestAnimationFrame(() => {
            powerUpButton.style.animation = "pulse 0.4s ease";
        });
        setTimeout(() => {
            powerUpButton.style.animation = "";
        }, 400);
    }, 700);
}
