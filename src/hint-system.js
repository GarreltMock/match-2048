// Hint system for finding and scoring the best possible swap

import { isBlocked, isBlockedWithLife } from "./tile-helpers.js";
import { hasMatchesForSwap, findMatches } from "./match-detector.js";

/**
 * Main entry point: finds the best swap on the board
 * @param {Match3Game} game - The game instance
 * @returns {{row1: number, col1: number, row2: number, col2: number, score: number} | null}
 */
export function findBestSwap(game) {
    const validSwaps = findAllValidSwaps(game);

    if (validSwaps.length === 0) {
        return null;
    }

    const evaluatedSwaps = [];

    // Save original board state and flags
    const originalBoard = game.board.map(row => row.map(tile => ({...tile})));
    const originalIsUserSwap = game.isUserSwap;

    for (const swap of validSwaps) {
        const result = evaluateSwap(game, swap.row1, swap.col1, swap.row2, swap.col2);

        if (result !== null) {
            evaluatedSwaps.push(result);
        }

        // Restore board state after each evaluation
        game.board = originalBoard.map(row => row.map(tile => ({...tile})));
    }

    // Restore original flag
    game.isUserSwap = originalIsUserSwap;

    if (evaluatedSwaps.length === 0) {
        return null;
    }

    // Sort by score descending, with tiebreaker for top-left position
    evaluatedSwaps.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        // Tiebreaker: prefer top-left positions
        const posA = a.row1 + a.col1;
        const posB = b.row1 + b.col1;
        return posA - posB;
    });

    return evaluatedSwaps[0];
}

/**
 * Find all valid adjacent swap pairs on the board
 * @param {Match3Game} game - The game instance
 * @returns {Array<{row1: number, col1: number, row2: number, col2: number}>}
 */
function findAllValidSwaps(game) {
    const validSwaps = [];

    for (let row = 0; row < game.boardHeight; row++) {
        for (let col = 0; col < game.boardWidth; col++) {
            // Check right neighbor
            if (col < game.boardWidth - 1) {
                if (isValidSwapPair(game, row, col, row, col + 1)) {
                    validSwaps.push({
                        row1: row,
                        col1: col,
                        row2: row,
                        col2: col + 1
                    });
                }
            }

            // Check down neighbor
            if (row < game.boardHeight - 1) {
                if (isValidSwapPair(game, row, col, row + 1, col)) {
                    validSwaps.push({
                        row1: row,
                        col1: col,
                        row2: row + 1,
                        col2: col
                    });
                }
            }
        }
    }

    return validSwaps;
}

/**
 * Check if two positions can be swapped
 * @param {Match3Game} game - The game instance
 * @param {number} row1 - First tile row
 * @param {number} col1 - First tile column
 * @param {number} row2 - Second tile row
 * @param {number} col2 - Second tile column
 * @returns {boolean}
 */
function isValidSwapPair(game, row1, col1, row2, col2) {
    const tile1 = game.board[row1]?.[col1];
    const tile2 = game.board[row2]?.[col2];

    // Check if tiles exist
    if (!tile1 || !tile2) {
        return false;
    }

    // Check if either tile is blocked
    if (isBlocked(tile1) || isBlockedWithLife(tile1)) {
        return false;
    }

    if (isBlocked(tile2) || isBlockedWithLife(tile2)) {
        return false;
    }

    return true;
}

/**
 * Evaluate a swap and compute its score
 * @param {Match3Game} game - The game instance
 * @param {number} row1 - First tile row
 * @param {number} col1 - First tile column
 * @param {number} row2 - Second tile row
 * @param {number} col2 - Second tile column
 * @returns {{row1: number, col1: number, row2: number, col2: number, score: number, matches: Array} | null}
 */
function evaluateSwap(game, row1, col1, row2, col2) {
    // Temporarily swap tiles
    const temp = game.board[row1][col1];
    game.board[row1][col1] = game.board[row2][col2];
    game.board[row2][col2] = temp;

    // Set flag for joker activation
    game.isUserSwap = true;
    game.lastSwapPosition = {
        row: row2,
        col: col2,
        movedFrom: { row: row1, col: col1 }
    };

    // Check if this swap creates matches
    const hasMatches = hasMatchesForSwap(game, row1, col1, row2, col2);

    if (!hasMatches) {
        // Swap back
        game.board[row2][col2] = game.board[row1][col1];
        game.board[row1][col1] = temp;
        return null;
    }

    // Get detailed match information
    const matches = findMatches(game);

    // Swap back
    game.board[row2][col2] = game.board[row1][col1];
    game.board[row1][col1] = temp;

    // Calculate score
    const score = calculateSwapScore(game, matches);

    // Determine swap direction for nudge animation
    let direction1, direction2;
    if (col2 > col1) {
        direction1 = "right";
        direction2 = "left";
    } else if (col2 < col1) {
        direction1 = "left";
        direction2 = "right";
    } else if (row2 > row1) {
        direction1 = "down";
        direction2 = "up";
    } else {
        direction1 = "up";
        direction2 = "down";
    }

    // Separate matches by which swap tile they involve
    const matchesForTile1 = matches.filter(match =>
        match.tiles.some(tile => tile.row === row1 && tile.col === col1)
    );
    const matchesForTile2 = matches.filter(match =>
        match.tiles.some(tile => tile.row === row2 && tile.col === col2)
    );

    // Calculate score for each group to find the best one
    const score1 = matchesForTile1.length > 0 ? calculateSwapScore(game, matchesForTile1) : 0;
    const score2 = matchesForTile2.length > 0 ? calculateSwapScore(game, matchesForTile2) : 0;

    // Use matches from the higher-scoring tile only
    const bestMatches = score1 >= score2 ? matchesForTile1 : matchesForTile2;

    // Collect tiles from the best matches only
    // Translate post-swap positions back to pre-swap positions for display
    const matchTiles = [];
    for (const match of bestMatches) {
        for (const tile of match.tiles) {
            let displayRow = tile.row;
            let displayCol = tile.col;

            // If this tile is at a swap position, translate it back
            if (tile.row === row1 && tile.col === col1) {
                // This tile is at position 1 after swap, so it was at position 2 before
                displayRow = row2;
                displayCol = col2;
            } else if (tile.row === row2 && tile.col === col2) {
                // This tile is at position 2 after swap, so it was at position 1 before
                displayRow = row1;
                displayCol = col1;
            }

            matchTiles.push({ row: displayRow, col: displayCol });
        }
    }

    return {
        row1,
        col1,
        row2,
        col2,
        direction1,
        direction2,
        score,
        matches,
        matchTiles
    };
}

/**
 * Calculate composite score for a swap based on matches
 * @param {Match3Game} game - The game instance
 * @param {Array} matches - Array of match objects
 * @returns {number}
 */
function calculateSwapScore(game, matches) {
    let score = 0;

    let maxFormationScore = 0;
    let totalTilesCleared = 0;
    let maxValue = 0;
    let goalProgress = 0;
    let blockedCleared = 0;
    let hasSpecialTile = false;

    for (const match of matches) {
        // Formation type priority
        let formationScore = 0;
        const direction = match.direction;

        if (direction === "line_5_horizontal" || direction === "line_5_vertical") {
            formationScore = 1000;
        } else if (direction === "T-formation" || direction === "L-formation") {
            formationScore = 800;
        } else if (direction === "line_4_horizontal" || direction === "line_4_vertical") {
            formationScore = 600;
        } else if (direction === "block_4_formation") {
            formationScore = 500;
        } else {
            formationScore = 300; // 3-line matches
        }

        maxFormationScore = Math.max(maxFormationScore, formationScore);

        // Count tiles cleared
        totalTilesCleared += match.tiles.length;

        // Track max value
        maxValue = Math.max(maxValue, match.value);

        // Check for special tile creation based on formation type
        if (direction === "T-formation" || direction === "L-formation" || direction.includes("line_5")) {
            hasSpecialTile = true;
        }
    }

    // Calculate goal progress
    if (game.currentLevel && game.currentLevel.goals) {
        for (const match of matches) {
            for (const goal of game.currentLevel.goals) {
                // Check if this match contributes to any goals
                if (goal.tileValue === match.value) {
                    if (goal.goalType === "created") {
                        goalProgress += match.tiles.length;
                    } else if (goal.goalType === "current") {
                        goalProgress += 1;
                    }
                }
            }
        }
    }

    // Calculate blocked tiles that would be cleared
    // (Check adjacent tiles to matches for blocked tiles)
    const matchPositions = new Set();
    for (const match of matches) {
        for (const tile of match.tiles) {
            matchPositions.add(`${tile.row},${tile.col}`);
        }
    }

    // Check adjacent tiles for blocked tiles
    for (const match of matches) {
        for (const tile of match.tiles) {
            const adjacentPositions = [
                [tile.row - 1, tile.col],
                [tile.row + 1, tile.col],
                [tile.row, tile.col - 1],
                [tile.row, tile.col + 1]
            ];

            for (const [adjRow, adjCol] of adjacentPositions) {
                if (adjRow >= 0 && adjRow < game.boardHeight &&
                    adjCol >= 0 && adjCol < game.boardWidth) {
                    const adjTile = game.board[adjRow]?.[adjCol];
                    if (adjTile && isBlockedWithLife(adjTile)) {
                        blockedCleared += 1;
                    }
                }
            }
        }
    }

    // Check if level has blocked goals and if they're the only remaining goals
    let hasBlockedGoals = false;
    let blockedIsOnlyRemainingGoal = false;
    if (game.currentLevel && game.currentLevel.goals) {
        const blockedGoals = game.currentLevel.goals.filter(goal => goal.goalType === "blocked");
        hasBlockedGoals = blockedGoals.length > 0;

        if (hasBlockedGoals) {
            // Check if all non-blocked goals are complete
            const nonBlockedGoals = game.currentLevel.goals.filter(goal => goal.goalType !== "blocked");
            const allNonBlockedComplete = nonBlockedGoals.every(goal => {
                const progress = game.goalProgress?.[goal.id] || 0;
                return progress >= goal.count;
            });
            // Check if blocked goals are still incomplete
            const blockedGoalsIncomplete = blockedGoals.some(goal => {
                const progress = game.goalProgress?.[goal.id] || 0;
                return progress < goal.count;
            });
            blockedIsOnlyRemainingGoal = allNonBlockedComplete && blockedGoalsIncomplete;
        }
    }

    // Calculate position bonus (matches closer to bottom trigger more cascades)
    let totalRow = 0;
    let tileCount = 0;
    for (const match of matches) {
        for (const tile of match.tiles) {
            totalRow += tile.row;
            tileCount++;
        }
    }
    // Average row position (0 = top, boardHeight-1 = bottom)
    // Bonus scales from 0 to ~50 based on position
    const avgRow = tileCount > 0 ? totalRow / tileCount : 0;
    const positionBonus = Math.round((avgRow / (game.boardHeight - 1)) * 50);

    // Compute composite score
    score += maxFormationScore;
    score += totalTilesCleared * 50;
    score += goalProgress * 100;

    // Blocked tile scoring
    if (hasBlockedGoals && blockedCleared > 0) {
        if (blockedIsOnlyRemainingGoal) {
            // When blocked is the ONLY remaining goal, always prefer clearing blocked tiles
            // Use a massive bonus that dominates all other scoring factors
            score += 10000 + blockedCleared * 500;
        } else {
            // When there are other goals too, still give significant bonus
            score += blockedCleared * 200;
        }
    }

    score += hasSpecialTile ? 200 : 0;
    score += maxValue * 5;
    score += positionBonus;

    return score;
}

/**
 * Get the tiles that would be matched if a swap is performed
 * Used by swap preview during drag
 * @param {Match3Game} game - The game instance
 * @param {number} row1 - First tile row
 * @param {number} col1 - First tile column
 * @param {number} row2 - Second tile row
 * @param {number} col2 - Second tile column
 * @returns {Array<{row: number, col: number}>} Array of tile positions in PRE-SWAP coordinates
 */
export function getMatchTilesForSwap(game, row1, col1, row2, col2) {
    // Save original board state
    const originalBoard = game.board.map(row => row.map(tile => tile ? {...tile} : null));
    const originalIsUserSwap = game.isUserSwap;

    // Temporarily swap tiles
    const temp = game.board[row1][col1];
    game.board[row1][col1] = game.board[row2][col2];
    game.board[row2][col2] = temp;

    // Set flag for joker activation
    game.isUserSwap = true;
    game.lastSwapPosition = {
        row: row2,
        col: col2,
        movedFrom: { row: row1, col: col1 }
    };

    // Check if this swap creates matches
    const hasMatches = hasMatchesForSwap(game, row1, col1, row2, col2);

    let matchTiles = [];
    if (hasMatches) {
        // Get detailed match information
        const matches = findMatches(game);

        // Only include matches that involve the actively dragged tile
        // The dragged tile starts at (row1, col1) and after swap is at (row2, col2)
        const relevantMatches = matches.filter(match =>
            match.tiles.some(tile =>
                tile.row === row2 && tile.col === col2
            )
        );

        // Collect tiles from relevant matches only
        // Translate post-swap positions back to pre-swap positions for display
        for (const match of relevantMatches) {
            for (const tile of match.tiles) {
                let displayRow = tile.row;
                let displayCol = tile.col;

                // If this tile is at a swap position, translate it back
                if (tile.row === row1 && tile.col === col1) {
                    // This tile is at position 1 after swap, so it was at position 2 before
                    displayRow = row2;
                    displayCol = col2;
                } else if (tile.row === row2 && tile.col === col2) {
                    // This tile is at position 2 after swap, so it was at position 1 before
                    displayRow = row1;
                    displayCol = col1;
                }

                matchTiles.push({ row: displayRow, col: displayCol });
            }
        }
    }

    // Restore board state
    game.board = originalBoard;
    game.isUserSwap = originalIsUserSwap;

    return matchTiles;
}
