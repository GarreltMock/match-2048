// Headless game simulation - no DOM, no animation
// Used by solver/hint systems to evaluate moves

import { applyGravity } from "./gravity.js";
import { findMatches } from "./match-detector.js";
import { processMerges, unblockAdjacentTiles } from "./merge-processor.js";
import { isRectangularBlocked } from "./tile-helpers.js";
import {
    isNormal, getTileValue, getDisplayValue,
    isBlocked, isBlockedWithLife, isBlockedMovable, isBlockedWithMergeCount,
    isCursed,
} from "./tile-helpers.js";

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

function cloneBoard(board) {
    return board.map((row) => row.map((tile) => cloneTile(tile)));
}

function cloneGoals(goals) {
    return goals.map((g) => ({ ...g }));
}

/**
 * Create a minimal game-like context for headless simulation.
 */
function createSimContext(game, board, levelGoals) {
    return {
        board,
        boardWidth: game.boardWidth,
        boardHeight: game.boardHeight,
        tileValues: game.tileValues,
        specialTileConfig: game.specialTileConfig,
        levelGoals,
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
        _rng: null,

        findMatches() { return findMatches(this); },
        hasMatchesForSwap(r1, c1, r2, c2) {
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

function countBoardBlockedTiles(ctx) {
    let count = 0;
    const countedRects = new Set();
    for (let row = 0; row < ctx.boardHeight; row++) {
        for (let col = 0; col < ctx.boardWidth; col++) {
            const tile = ctx.board[row][col];
            if (!tile) continue;
            if (isBlockedWithMergeCount(tile)) {
                const key = `${row}_${col}`;
                if (tile.cellMergeCounts?.[key] > 0) count++;
            } else if (isBlocked(tile) || isBlockedWithLife(tile) || isBlockedMovable(tile)) {
                if (tile.isRectangular) {
                    if (!countedRects.has(tile.rectId)) {
                        countedRects.add(tile.rectId);
                        count += (tile.rectWidth || 1) * (tile.rectHeight || 1);
                    }
                } else {
                    count++;
                }
            }
        }
    }
    return count;
}

function countBoardTileValues(ctx) {
    const counts = {};
    for (let row = 0; row < ctx.boardHeight; row++) {
        for (let col = 0; col < ctx.boardWidth; col++) {
            const tile = ctx.board[row][col];
            if (isNormal(tile)) {
                const v = getTileValue(tile);
                counts[v] = (counts[v] || 0) + 1;
            }
        }
    }
    return counts;
}

/**
 * Update "current" and "blocked" goal progress by scanning the board.
 * ("created", "cursed", "score" are already mutated by processMerges.)
 */
function updateBoardScanGoals(ctx, initialBlockedTileCount) {
    const tileCounts = countBoardTileValues(ctx);
    const blockedCount = countBoardBlockedTiles(ctx);
    const blockedCleared = Math.max(0, (initialBlockedTileCount ?? 0) - blockedCount);

    ctx.levelGoals.forEach((goal) => {
        if (goal.goalType === "current") {
            goal.current = tileCounts[goal.tileValue] || 0;
        } else if (goal.goalType === "blocked") {
            goal.current = blockedCleared;
        }
    });
}

/**
 * Decrement cursed tile timers and remove expired tiles from the board.
 * Mirrors decrementCursedTileTimers in goal-tracker.js (without DOM/animation).
 * Returns the number of tiles removed.
 */
function decrementCursedTimers(ctx) {
    const toRemove = [];
    const toImplode = [];

    for (let row = 0; row < ctx.boardHeight; row++) {
        for (let col = 0; col < ctx.boardWidth; col++) {
            const tile = ctx.board[row][col];
            if (!tile || !isCursed(tile)) continue;
            if (tile.createdThisTurn) {
                tile.createdThisTurn = false;
                continue;
            }
            tile.cursedMovesRemaining--;
            if (tile.cursedMovesRemaining <= 0) {
                const goal = ctx.levelGoals.find(
                    (g) => g.goalType === "cursed" && g.tileValue === getTileValue(tile)
                );
                if (goal?.implode) {
                    toImplode.push({ row, col });
                } else {
                    toRemove.push({ row, col });
                }
            }
        }
    }

    toRemove.forEach((pos) => { ctx.board[pos.row][pos.col] = null; });

    toImplode.forEach((pos) => {
        const adjacent = [
            { row: pos.row - 1, col: pos.col },
            { row: pos.row + 1, col: pos.col },
            { row: pos.row, col: pos.col - 1 },
            { row: pos.row, col: pos.col + 1 },
        ];
        adjacent.forEach((a) => {
            if (a.row >= 0 && a.row < ctx.boardHeight && a.col >= 0 && a.col < ctx.boardWidth) {
                const t = ctx.board[a.row][a.col];
                if (t && (isNormal(t) || isCursed(t))) ctx.board[a.row][a.col] = null;
            }
        });
        ctx.board[pos.row][pos.col] = null;
    });

    return toRemove.length + toImplode.length;
}

/**
 * Run one cascade step: find matches, score, merge, unblock, gravity.
 * Returns scoreDelta for this step, or 0 if no matches.
 */
function runCascadeStep(ctx, isUserSwap) {
    ctx.isUserSwap = isUserSwap;

    const matchGroups = findMatches(ctx);
    if (matchGroups.length === 0) return 0;

    let cascadeScore = 0;
    matchGroups.forEach((group) => {
        cascadeScore += getDisplayValue(group.value) * group.tiles.length;
    });
    ctx.levelGoals.forEach((goal) => {
        if (goal.goalType === "score") goal.current += cascadeScore;
    });

    processMerges(ctx, matchGroups, isUserSwap);

    // Mirror processMatches: clear adjacent blocked tiles from the board
    const blockedTilesToRemove = unblockAdjacentTiles(ctx, matchGroups);
    blockedTilesToRemove.forEach((entry) => {
        if (entry.isMergeCount && !entry.isFullRemoval) return;
        const tile = entry.tile || ctx.board[entry.row]?.[entry.col];
        if (!tile) return;
        if (isRectangularBlocked(tile)) {
            for (let r = tile.rectAnchor.row; r < tile.rectAnchor.row + tile.rectHeight; r++) {
                for (let c = tile.rectAnchor.col; c < tile.rectAnchor.col + tile.rectWidth; c++) {
                    if (ctx.board[r]?.[c]?.rectId === tile.rectId) ctx.board[r][c] = null;
                }
            }
            return;
        }
        ctx.board[entry.row][entry.col] = null;
    });

    applyGravity(ctx);

    ctx.isUserSwap = false;
    ctx.lastSwapPosition = null;

    return cascadeScore;
}

/**
 * Return true iff every goal is satisfied.
 * Mirrors goal-tracker.js:30-42 logic.
 */
export function areGoalsSatisfied(levelGoals) {
    return levelGoals.every((goal) => {
        if (goal.goalType === "current" || goal.goalType === "blocked" ||
            goal.goalType === "cursed" || goal.goalType === "score") {
            return goal.current >= goal.target;
        }
        return goal.created >= goal.target;
    });
}

/**
 * Simulate a single complete move (swap → match → merge → gravity cascade).
 *
 * @param {Match3Game} game - Live game instance (not mutated)
 * @param {{ row1: number, col1: number, row2: number, col2: number }} swap
 * @param {Object} [options]
 * @param {Function} [options.rng] - Optional deterministic PRNG
 * @param {Array}    [options.levelGoals] - Cumulative goal state (cloned before use)
 */
export function simulateMove(game, swap, options = {}) {
    const { row1, col1, row2, col2 } = swap;
    const rng = options.rng || null;
    const goals = options.levelGoals ? cloneGoals(options.levelGoals) : cloneGoals(game.levelGoals);

    const board = cloneBoard(game.board);
    const ctx = createSimContext(game, board, goals);
    ctx._rng = rng;

    // Count blocked tiles from the simulation's own starting board so goal tracking
    // is correct regardless of whether game.initialBlockedTileCount is stale/wrong.
    const initialBlockedTileCount = countBoardBlockedTiles(ctx);

    const temp = ctx.board[row1][col1];
    ctx.board[row1][col1] = ctx.board[row2][col2];
    ctx.board[row2][col2] = temp;

    ctx.lastSwapPosition = { row: row2, col: col2, movedFrom: { row: row1, col: col1 } };
    ctx.isUserSwap = true;

    const initialMatches = findMatches(ctx);
    const hasMatch = initialMatches.some((match) =>
        match.tiles.some((t) =>
            (t.row === row1 && t.col === col1) || (t.row === row2 && t.col === col2)
        )
    );

    if (!hasMatch) {
        ctx.board[row2][col2] = ctx.board[row1][col1];
        ctx.board[row1][col1] = temp;
        return {
            valid: false,
            newBoard: ctx.board,
            scoreDelta: 0,
            cascades: 0,
            levelGoals: goals,
            allGoalsSatisfied: false,
        };
    }

    let scoreDelta = 0;
    let cascades = 0;
    const maxCascades = 20;

    // Main cascade loop (first iteration is the user's swap)
    let isFirstIteration = true;
    while (cascades < maxCascades) {
        const step = runCascadeStep(ctx, isFirstIteration);
        if (step === 0) break;
        scoreDelta += step;
        cascades++;
        isFirstIteration = false;
    }

    // Decrement cursed tile timers after all cascades complete, then run any
    // follow-up cascades that may form (mirrors real game: decrementCursedTileTimers
    // → dropGems in animator.js).
    const expiredCount = decrementCursedTimers(ctx);
    if (expiredCount > 0) {
        applyGravity(ctx);
        while (cascades < maxCascades) {
            const step = runCascadeStep(ctx, false);
            if (step === 0) break;
            scoreDelta += step;
            cascades++;
        }
    }

    updateBoardScanGoals(ctx, initialBlockedTileCount);

    return {
        valid: true,
        newBoard: ctx.board,
        scoreDelta,
        cascades,
        levelGoals: goals,
        allGoalsSatisfied: areGoalsSatisfied(goals),
    };
}
