// Match processing and tile merging logic

import { createTile, createJokerTile, isBlocked, getTileValue } from "./tile-helpers.js";
import { animateMerges, animateUnblocking } from "./animator.js";

export function processMatches(game) {
    const matchGroups = game.findMatches();

    // Reset user swap flag after finding matches
    game.isUserSwap = false;

    if (matchGroups.length === 0) {
        // No matches found, allow interactions again
        game.animating = false;
        return;
    }

    // Calculate score
    let totalScore = 0;
    matchGroups.forEach((group) => {
        totalScore += group.value * group.tiles.length;
    });

    // Update score
    game.score += totalScore;
    document.getElementById("score").textContent = game.score;
    game.saveScore(); // Save score to localStorage

    // Check for blocked tiles adjacent to original match positions and unblock them
    unblockAdjacentTiles(game, matchGroups);

    // Start merge animations
    animateMerges(game, matchGroups, (matchGroups) => processMerges(game, matchGroups));
}

export function processMerges(game, matchGroups) {
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

    // Update goal display after creating new tiles
    game.updateGoalDisplay(true);

    // Clean up animation classes
    document.querySelectorAll(".gem").forEach((gem) => {
        gem.classList.remove("sliding", "merge-target", "unblocking");
        gem.style.transform = "";
        gem.style.transition = "";
        gem.style.opacity = "";
        gem.style.zIndex = "";
    });

    game.dropGems();
}

export function createMergedTiles(game, group) {
    const formationType = getFormationConfig(group.direction);
    const specialTileType = formationType ? game.specialTileConfig[formationType] : null;

    // Calculate positions and value based on formation type
    const isTLFormation = group.direction === "T-formation" || group.direction === "L-formation";
    const is5LineFormation = group.direction === "line_5_horizontal" || group.direction === "line_5_vertical";
    const positions = isTLFormation ? [group.intersection] : calculateMiddlePositions(game, group.tiles, group);
    const valueIncrement = (isTLFormation || is5LineFormation) ? 2 : 1;

    // Check if any tile in the match was a golden tile - if so, add +1 to the result
    const goldenBonus = group.hasGoldenTile ? 1 : 0;
    const newValue = group.value + valueIncrement + goldenBonus;

    // Calculate goal tracking count:
    // - For 5-line formations: count as 3 tiles (represents 3 intermediate merges)
    // - For golden bonus: count the intermediate value as well
    // - Otherwise: count based on positions created
    if (is5LineFormation) {
        // 5-line creates 1 tile but should count as 3 for goals
        trackGoalProgress(game, newValue - 1, 3);
    }
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
            game.board[normalPos.row][normalPos.col] = createTile(newValue);
            trackGoalProgress(game, newValue, 1);
        } else {
            game.board[positions[0].row][positions[0].col] = createJokerTile();
        }
    } else if (specialTileType === "power") {
        if (positions.length > 1) {
            const formationKey = group.direction.includes("block") ? "block_4" : "line_4";
            const specialPos = determineSpecialTilePosition(game, group, formationKey);
            const normalPos = positions.find((p) => p.row !== specialPos.row || p.col !== specialPos.col);

            game.board[specialPos.row][specialPos.col] = createTile(newValue, true);
            game.board[normalPos.row][normalPos.col] = createTile(newValue);
            trackGoalProgress(game, newValue, 2);
        } else {
            game.board[positions[0].row][positions[0].col] = createTile(newValue, true);
            trackGoalProgress(game, newValue, 1);
        }
    } else if (specialTileType === "golden") {
        if (positions.length > 1) {
            const formationKey = group.direction.includes("block") ? "block_4" : "line_4";
            const specialPos = determineSpecialTilePosition(game, group, formationKey);
            const normalPos = positions.find((p) => p.row !== specialPos.row || p.col !== specialPos.col);

            game.board[specialPos.row][specialPos.col] = createTile(newValue, false, true);
            game.board[normalPos.row][normalPos.col] = createTile(newValue);
            trackGoalProgress(game, newValue, 2);
        } else {
            game.board[positions[0].row][positions[0].col] = createTile(newValue, false, true);
            trackGoalProgress(game, newValue, 1);
        }
    } else if (specialTileType === "freeswap") {
        if (positions.length > 1) {
            const formationKey = group.direction.includes("block") ? "block_4" : "line_4";
            const specialPos = determineSpecialTilePosition(game, group, formationKey);
            const normalPos = positions.find((p) => p.row !== specialPos.row || p.col !== specialPos.col);

            game.board[specialPos.row][specialPos.col] = createTile(newValue, false, false, true);
            game.board[normalPos.row][normalPos.col] = createTile(newValue);
            trackGoalProgress(game, newValue, 2);
        } else {
            game.board[positions[0].row][positions[0].col] = createTile(newValue, false, false, true);
            trackGoalProgress(game, newValue, 1);
        }
    } else {
        // No special tile - create normal tiles at all positions
        positions.forEach((pos) => {
            game.board[pos.row][pos.col] = createTile(newValue);
        });
        trackGoalProgress(game, newValue, positions.length);
    }
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

        // Check each tile in the original match for adjacent blocked tiles
        group.tiles.forEach((matchTile) => {
            const adjacentPositions = [
                { row: matchTile.row - 1, col: matchTile.col }, // Up
                { row: matchTile.row + 1, col: matchTile.col }, // Down
                { row: matchTile.row, col: matchTile.col - 1 }, // Left
                { row: matchTile.row, col: matchTile.col + 1 }, // Right
            ];

            adjacentPositions.forEach((pos) => {
                // Check bounds and if tile is blocked
                if (
                    pos.row >= 0 &&
                    pos.row < game.boardHeight &&
                    pos.col >= 0 &&
                    pos.col < game.boardWidth &&
                    isBlocked(game.board[pos.row][pos.col])
                ) {
                    // Avoid duplicates
                    if (!blockedTilesToRemove.some((tile) => tile.row === pos.row && tile.col === pos.col)) {
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
            });
        });
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
