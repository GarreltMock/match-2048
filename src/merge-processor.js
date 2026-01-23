// Match processing and tile merging logic

import {
    createTile,
    createJokerTile,
    createCursedTile,
    isBlocked,
    isBlockedWithLife,
    isBlockedMovable,
    isBlockedWithMergeCount,
    isCursed,
    getTileValue,
    isTileStickyFreeSwapTile,
    getDisplayValue,
    isRectangularBlocked,
} from "./tile-helpers.js";
import { animateMerges, animateUnblocking } from "./animator.js";
import {
    showFormationTutorialDialog,
    getPendingFormationTutorials,
    highlightMergeTiles,
    clearMergeHighlight,
} from "./formation-tutorial.js";

export async function processMatches(game) {
    const matchGroups = game.findMatches();

    // Capture user swap flag before resetting (needed for processMerges callback)
    const wasUserSwap = game.isUserSwap;
    game.isUserSwap = false;

    if (matchGroups.length === 0) {
        // No matches found, allow interactions again
        game.animating = false;
        game.updateGoalDisplay(true);
        return;
    }

    // Calculate score using display values (not internal values)
    let totalScore = 0;
    matchGroups.forEach((group) => {
        const displayValue = getDisplayValue(group.value);
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

    // Check for pending formation tutorials (only on user swaps)
    if (wasUserSwap) {
        const pendingTutorials = getPendingFormationTutorials(matchGroups);

        if (pendingTutorials.length > 0) {
            // Highlight all tiles that will be merged
            highlightMergeTiles(matchGroups);

            // Wait 500ms so user can see the highlighted tiles before dialog opens
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Show each tutorial dialog and wait for user to close it
            for (const { formationType } of pendingTutorials) {
                await showFormationTutorialDialog(formationType);
            }

            // Wait 300ms after dialog closes before continuing
            await new Promise((resolve) => setTimeout(resolve, 300));

            // Clear the highlight
            clearMergeHighlight();
        }
    }

    // Start merge animations
    animateMerges(game, matchGroups, (matchGroups) => processMerges(game, matchGroups, wasUserSwap));
}

export function processMerges(game, matchGroups, wasUserSwap = false) {
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
    if (wasUserSwap) {
        matchGroups.forEach((group) => {
            const tileCount = group.tiles.length;
            const direction = group.direction;

            if (direction === "T-formation") {
                game.matchStats.tFormationCount++;
            } else if (direction === "L-formation") {
                game.matchStats.lFormationCount++;
            } else if (direction === "block_4_formation") {
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
        createMergedTiles(game, group, wasUserSwap);
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

export function createMergedTiles(game, group, wasUserSwap = false) {
    const formationType = getFormationConfig(group.direction);
    const specialTileType = formationType ? game.specialTileConfig[formationType] : null;

    // Calculate positions and value based on formation type
    const isTLFormation = group.direction === "T-formation" || group.direction === "L-formation";
    const is5LineFormation = group.direction === "line_5_horizontal" || group.direction === "line_5_vertical";
    const positions = isTLFormation ? [group.intersection] : calculateMiddlePositions(game, group.tiles, group);
    const valueIncrement = isTLFormation || is5LineFormation ? 2 : 1;

    const newValue = group.value + valueIncrement;

    // Check if sticky free swap should transfer (detected before tiles were cleared)
    // If so, and this was NOT a user swap, transfer the sticky free swap to the merged tile
    const hasStickyFreeSwap = group.hasStickyFreeSwap || false;
    const transferStickyFreeSwap = hasStickyFreeSwap && !wasUserSwap;

    // Track intermediate values for formations that skip a level (T, L, 5-line)
    // When tiles of value N merge into 1 tile of value N+2, conceptually there's an intermediate step:
    // - T/L formation (5 tiles): 5 tiles → 3 tiles of N+1 → 1 tile of N+2
    // - 5-line formation (5 tiles): 5 tiles → 3 tiles of N+1 → 1 tile of N+2
    // So we track 3 creations of the intermediate value (N+1)
    if (isTLFormation || is5LineFormation) {
        const intermediateValue = group.value + 1;
        trackGoalProgress(game, intermediateValue, 3);
    }

    // Handle special tile types
    if (specialTileType === "joker") {
        // Joker is special - it creates a joker tile (different tile type), not a normal tile with properties
        if (positions.length > 1) {
            const formationKey = group.direction.includes("block") ? "block_4" : "line_4";
            const specialPos = determineSpecialTilePosition(game, group, formationKey);
            const normalPos = positions.find((p) => p.row !== specialPos.row || p.col !== specialPos.col);

            game.board[specialPos.row][specialPos.col] = createJokerTile();
            game.board[normalPos.row][normalPos.col] = createTile(newValue, null, { transferStickyFreeSwap });
            trackGoalProgress(game, newValue, 1);
        } else {
            game.board[positions[0].row][positions[0].col] = createJokerTile();
        }
    } else if (specialTileType === "random_powerup") {
        // Random power-up grants a power-up immediately and creates normal tiles
        game.grantRandomPowerUp();
        positions.forEach((pos) => {
            game.board[pos.row][pos.col] = createTile(newValue, null, { transferStickyFreeSwap });
        });
        trackGoalProgress(game, newValue, positions.length);
    } else if (specialTileType && specialTileType !== "none") {
        // All other special tile types use the same pattern
        // For directional free swaps, determine the direction
        let options = { transferStickyFreeSwap };

        if (specialTileType === "freeswap_horizontal" || specialTileType === "freeswap_vertical") {
            // Determine swap direction from lastSwapPosition
            let isHorizontal = false;
            if (game.lastSwapPosition && game.lastSwapPosition.movedFrom) {
                const fromRow = game.lastSwapPosition.movedFrom.row;
                const toRow = game.lastSwapPosition.row;

                // If rows are the same, it's a horizontal swap (columns differ)
                isHorizontal = fromRow === toRow;
            }
            options.isHorizontal = isHorizontal;
        }

        if (positions.length > 1) {
            // For 2-position formations (4-tile line/block), create one special tile and one normal tile
            const formationKey = group.direction.includes("block") ? "block_4" : "line_4";
            const specialPos = determineSpecialTilePosition(game, group, formationKey);
            const normalPos = positions.find((p) => p.row !== specialPos.row || p.col !== specialPos.col);

            game.board[specialPos.row][specialPos.col] = createTile(newValue, specialTileType, options);
            game.board[normalPos.row][normalPos.col] = createTile(newValue, null, { transferStickyFreeSwap });
            trackGoalProgress(game, newValue, 2);
        } else {
            // For 1-position formations (T, L, 5-line), create one special tile
            game.board[positions[0].row][positions[0].col] = createTile(newValue, specialTileType, options);
            trackGoalProgress(game, newValue, 1);
        }
    } else {
        // No special tile - create normal tiles at all positions
        // However, if transferStickyFreeSwap is true, the merged tiles should inherit the sticky free swap ability
        positions.forEach((pos) => {
            game.board[pos.row][pos.col] = createTile(newValue, null, { transferStickyFreeSwap });
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
    const cellsToDecrement = new Set(); // Track individual cells to decrement for merge-count blocks

    matchGroups.forEach((group) => {
        // Track which blocked tiles have been hit by this match group
        const hitInThisGroup = new Set();

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
        const damageValue = getDisplayValue(group.value);

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

                    // Handle blocked tiles with life (apply damage)
                    if (isBlockedWithLife(tile)) {
                        // Use rectId for rectangular blocks, row_col for single cells
                        const key = isRectangularBlocked(tile) ? tile.rectId : `${pos.row}_${pos.col}`;

                        // Skip if already hit by this match group
                        if (hitInThisGroup.has(key)) {
                            return;
                        }
                        hitInThisGroup.add(key);

                        const existingEntry = goalTilesToDamage.find((t) => t.key === key);

                        if (existingEntry) {
                            // Accumulate damage from different match groups
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
                                key: key,
                                row: pos.row,
                                col: pos.col,
                                damage: damageValue,
                                targetPos: closestTarget,
                                tile: tile, // Store tile reference for rectangular blocks
                            });
                        }
                    }
                    // Handle blocked tiles with merge count (per-rectangle tracking)
                    else if (isBlockedWithMergeCount(tile)) {
                        // Skip if this RECTANGLE was already hit in this match group
                        // One match should only clear ONE cell from the entire block
                        if (hitInThisGroup.has(tile.rectId)) {
                            return;
                        }
                        hitInThisGroup.add(tile.rectId);

                        // Find any cell in this rectangle that still needs clearing
                        let cellToClear = null;
                        for (let r = tile.rectAnchor.row; r < tile.rectAnchor.row + tile.rectHeight; r++) {
                            for (let c = tile.rectAnchor.col; c < tile.rectAnchor.col + tile.rectWidth; c++) {
                                const cellKey = `${r}_${c}`;
                                if (tile.cellMergeCounts[cellKey] > 0) {
                                    cellToClear = { row: r, col: c, cellKey: cellKey };
                                    break;
                                }
                            }
                            if (cellToClear) break;
                        }

                        // If we found a cell to clear, decrement it
                        if (cellToClear) {
                            const rectCellKey = `${tile.rectId}_${cellToClear.cellKey}`;
                            cellsToDecrement.add(rectCellKey);

                            // Find the closest target position for animation
                            let closestTarget = targetPositions[0];
                            let closestDistance =
                                Math.abs(cellToClear.row - closestTarget.row) +
                                Math.abs(cellToClear.col - closestTarget.col);

                            targetPositions.forEach((target) => {
                                const distance =
                                    Math.abs(cellToClear.row - target.row) + Math.abs(cellToClear.col - target.col);
                                if (distance < closestDistance) {
                                    closestDistance = distance;
                                    closestTarget = target;
                                }
                            });

                            // Store for animation purposes
                            blockedTilesToRemove.push({
                                rectId: tile.rectId,
                                cellKey: cellToClear.cellKey,
                                row: cellToClear.row,
                                col: cellToClear.col,
                                targetPos: closestTarget,
                                tile: tile,
                                isMergeCount: true, // Flag for animation
                            });
                        }
                    } else if (isBlocked(tile) || isBlockedMovable(tile)) {
                        // Use rectId for deduplication
                        const key = isRectangularBlocked(tile) ? tile.rectId : `${pos.row}_${pos.col}`;

                        // Skip if already hit by this match group
                        if (hitInThisGroup.has(key)) {
                            return;
                        }
                        hitInThisGroup.add(key);

                        if (!blockedTilesToRemove.some((t) => t.key === key)) {
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
                                key: key,
                                row: pos.row,
                                col: pos.col,
                                targetPos: closestTarget,
                                tile: tile, // Store tile reference
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

    // Decrement merge counts for affected cells
    const processedRects = new Set(); // Track which rectangles we've checked for full removal
    cellsToDecrement.forEach((rectCellKey) => {
        // Parse rectCellKey format: "rect_2_3_2_2_2_3" -> extract cell coordinates
        const parts = rectCellKey.split("_");
        const cellKey = `${parts[parts.length - 2]}_${parts[parts.length - 1]}`;

        // Find the tile object (any cell in the rectangle will point to it)
        const [row, col] = cellKey.split("_").map(Number);
        const tile = game.board[row][col];

        if (tile && isBlockedWithMergeCount(tile)) {
            // Decrement the cell's merge count
            tile.cellMergeCounts[cellKey]--;

            // Check if ALL cells are cleared (all counts === 0) only once per rectangle
            if (!processedRects.has(tile.rectId)) {
                processedRects.add(tile.rectId);

                const allCleared = Object.values(tile.cellMergeCounts).every((count) => count === 0);

                if (allCleared) {
                    // Mark entire rectangular block for removal
                    blockedTilesToRemove.push({
                        rectId: tile.rectId,
                        row: tile.rectAnchor.row,
                        col: tile.rectAnchor.col,
                        tile: tile,
                        isFullRemoval: true,
                    });
                }
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
