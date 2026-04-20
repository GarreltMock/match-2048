// Headless game simulation - no DOM, no animation
// Used by MCTS/RL hint systems to evaluate moves

import { applyGravity } from "./gravity.js";
import { findMatches } from "./match-detector.js";
import { processMerges, calculateMiddlePositions } from "./merge-processor.js";
import { getDisplayValue } from "./tile-helpers.js";

/**
 * Deep-clone an individual tile, including nested objects.
 */
function cloneTile(tile) {
    if (!tile) return null;
    const cloned = { ...tile };
    if (tile.rectAnchor && typeof tile.rectAnchor === "object") {
        cloned.rectAnchor = { ...tile.rectAnchor };
    }
    if (tile.cellMergeCounts && typeof tile.cellMergeCounts === "object") {
        cloned.cellMergeCounts = { ...tile.cellMergeCounts };
    }
    return cloned;
}

/**
 * Deep-clone the board (2D array of tile objects).
 */
function cloneBoard(board) {
    return board.map((row) => row.map((tile) => cloneTile(tile)));
}

/**
 * Create a minimal game-like context for headless simulation.
 * Copies only the fields needed by findMatches, processMerges, applyGravity.
 */
function createSimContext(game, board) {
    return {
        board,
        boardWidth: game.boardWidth,
        boardHeight: game.boardHeight,
        tileValues: game.tileValues,
        spawnableTileValues: game.spawnableTileValues,
        specialTileConfig: game.specialTileConfig,
        levelGoals: game.levelGoals.map((g) => ({ ...g })),
        allowNonMatchingSwaps: false,
        activePowerUp: null,
        isUserSwap: false,
        lastSwapPosition: null,
        movesUsed: game.movesUsed,
        maxMoves: game.maxMoves,
        score: 0,
        animating: false,
        pendingTileLevelShift: false,
        cursedTileCreatedCount: { ...game.cursedTileCreatedCount },
        cursedTileCreatedThisTurn: {},
        shouldDecrementCursedTimers: false,
        matchStats: {
            tFormationCount: 0, lFormationCount: 0, blockFormationCount: 0,
            match5Count: 0, match4Count: 0, match3Count: 0,
        },

        // Methods called by processMerges/createMergedTiles
        findMatches() { return findMatches(this); },
        hasMatchesForSwap(r1, c1, r2, c2) {
            // Used internally - check if swap creates a match at those positions
            const matches = findMatches(this);
            return matches.some((match) =>
                match.tiles.some((t) =>
                    (t.row === r1 && t.col === c1) || (t.row === r2 && t.col === c2)
                )
            );
        },
        saveScore() {},
        updateGoalDisplay() {},
        updateMovesDisplay() {},
        renderBoard() {},
        dropGems() {},
        checkAndShiftTileLevels() {},
        shiftTileLevels() { return Promise.resolve(); },

        grantFormationPowerUp() {},
    };
}

/**
 * Accumulate goal progress for a given tile value, filtering to "created" goals only.
 */
function accumulateGoal(goalProgress, levelGoals, tileValue, count) {
    const hasGoal = levelGoals.some((g) => g.goalType === "created" && g.tileValue === tileValue);
    if (hasGoal) {
        goalProgress[tileValue] = (goalProgress[tileValue] || 0) + count;
    }
}

/**
 * Simulate a single complete move (swap → match → merge → gravity cascade).
 *
 * @param {Match3Game} game - Live game instance (not mutated)
 * @param {{ row1: number, col1: number, row2: number, col2: number }} swap
 * @returns {{
 *   valid: boolean,
 *   newBoard: Array[][],
 *   scoreDelta: number,
 *   goalProgress: Object,
 *   cascades: number
 * }}
 */
export function simulateMove(game, swap) {
    const { row1, col1, row2, col2 } = swap;

    const board = cloneBoard(game.board);
    const ctx = createSimContext(game, board);

    // Swap tiles on the board
    const temp = ctx.board[row1][col1];
    ctx.board[row1][col1] = ctx.board[row2][col2];
    ctx.board[row2][col2] = temp;

    ctx.lastSwapPosition = { row: row2, col: col2, movedFrom: { row: row1, col: col1 } };
    ctx.isUserSwap = true;

    // Verify swap creates a match
    const initialMatches = findMatches(ctx);
    const hasMatch = initialMatches.some((match) =>
        match.tiles.some((t) =>
            (t.row === row1 && t.col === col1) || (t.row === row2 && t.col === col2)
        )
    );

    if (!hasMatch) {
        // Revert and return invalid
        ctx.board[row2][col2] = ctx.board[row1][col1];
        ctx.board[row1][col1] = temp;
        return { valid: false, newBoard: ctx.board, scoreDelta: 0, goalProgress: {}, cascades: 0 };
    }

    let scoreDelta = 0;
    const goalProgress = {};
    let cascades = 0;
    const maxCascades = 20;

    // Cascade loop: find matches → merge → gravity → repeat
    let isFirstIteration = true;
    while (cascades < maxCascades) {
        ctx.isUserSwap = isFirstIteration;

        const matchGroups = findMatches(ctx);
        if (matchGroups.length === 0) break;

        // Accumulate score
        matchGroups.forEach((group) => {
            const displayValue = getDisplayValue(group.value);
            scoreDelta += displayValue * group.tiles.length;
        });

        // Track goal progress — mirrors createMergedTiles logic in merge-processor.js
        matchGroups.forEach((group) => {
            const isTLFormation = group.direction === "T-formation" || group.direction === "L-formation";
            const is5LineFormation = group.direction === "line_5_horizontal" || group.direction === "line_5_vertical";
            const valueIncrement = isTLFormation || is5LineFormation ? 2 : 1;
            const mergedValue = group.value + valueIncrement;

            // Count how many merged tiles are produced (1 for T/L/5-line, 2 for 4-tile line/block)
            const positions = isTLFormation ? [group.intersection] : calculateMiddlePositions(ctx, group.tiles, group);
            const tileCount = positions ? positions.length : 1;

            // T/L/5-line: track 3 intermediate (N+1) tiles conceptually created in merge chain
            if (isTLFormation || is5LineFormation) {
                const intermediateValue = group.value + 1;
                accumulateGoal(goalProgress, ctx.levelGoals, intermediateValue, 3);
            }

            accumulateGoal(goalProgress, ctx.levelGoals, mergedValue, tileCount);
        });

        // Process merges (mutates ctx.board)
        processMerges(ctx, matchGroups, ctx.isUserSwap);

        // Apply gravity (mutates ctx.board, spawns new tiles)
        applyGravity(ctx);

        cascades++;
        isFirstIteration = false;
        ctx.isUserSwap = false;
        ctx.lastSwapPosition = null;
    }

    return {
        valid: true,
        newBoard: ctx.board,
        scoreDelta,
        goalProgress,
        cascades,
    };
}
