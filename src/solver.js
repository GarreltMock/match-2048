// Short-horizon solver for "Solvable in X Moves" display.
// Beam search over simulated moves, early exit when all goals are satisfied.

import { findMatches } from "./match-detector.js";
import { simulateMove, areGoalsSatisfied } from "./simulation.js";
import { findAllValidSwaps, calculateSwapScore } from "./hint-system.js";

/**
 * Mulberry32 PRNG with cloneable state.
 */
export function mulberry32(seed) {
    const state = { s: seed >>> 0 };
    const fn = function () {
        state.s = (state.s + 0x6D2B79F5) | 0;
        let t = state.s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    fn.state = state;
    fn.clone = () => mulberry32(state.s);
    return fn;
}

function cloneTile(tile) {
    if (!tile) return null;
    const cloned = { ...tile };
    if (tile.rectAnchor) cloned.rectAnchor = { ...tile.rectAnchor };
    if (tile.cellMergeCounts) cloned.cellMergeCounts = { ...tile.cellMergeCounts };
    return cloned;
}

function cloneBoard(board) {
    return board.map((row) => row.map(cloneTile));
}

function cloneGoals(goals) {
    return goals.map((g) => ({ ...g }));
}

function hashBoard(board) {
    let h = 2166136261;
    for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[r].length; c++) {
            const t = board[r][c];
            const v = t ? (t.value || t.lifeValue || 0) : 0;
            h = Math.imul(h ^ v, 16777619);
        }
    }
    return h >>> 0;
}

function deriveSeed(game) {
    const h = hashBoard(game.board);
    return (Math.imul((game.movesUsed | 0) + 1, 0x9E3779B1) ^ h) >>> 0;
}

/**
 * Lightweight context for rank-only operations (no cascades).
 */
function makeRankContext(game) {
    return {
        board: null,
        boardWidth: game.boardWidth,
        boardHeight: game.boardHeight,
        levelGoals: game.levelGoals,
        isUserSwap: true,
        lastSwapPosition: null,
        allowNonMatchingSwaps: false,
        activePowerUp: null,
        tileValues: game.tileValues,
        specialTileConfig: game.specialTileConfig,
    };
}

/**
 * Score a candidate swap by tentatively swapping and scoring resulting matches.
 * Returns -Infinity if the swap does not create a match involving either swapped tile.
 */
function rankSwap(rankCtx, swap) {
    const { row1, col1, row2, col2 } = swap;
    const t = rankCtx.board[row1][col1];
    rankCtx.board[row1][col1] = rankCtx.board[row2][col2];
    rankCtx.board[row2][col2] = t;
    rankCtx.isUserSwap = true;
    rankCtx.lastSwapPosition = { row: row2, col: col2, movedFrom: { row: row1, col: col1 } };

    const matches = findMatches(rankCtx);
    const involves = matches.some((m) =>
        m.tiles.some((tile) =>
            (tile.row === row1 && tile.col === col1) || (tile.row === row2 && tile.col === col2)
        )
    );

    const score = involves ? calculateSwapScore(rankCtx, matches) : -Infinity;

    rankCtx.board[row2][col2] = rankCtx.board[row1][col1];
    rankCtx.board[row1][col1] = t;

    return score;
}

function goalProgressDelta(newGoals, oldGoals) {
    let delta = 0;
    for (let i = 0; i < newGoals.length; i++) {
        const ng = newGoals[i];
        const og = oldGoals[i];
        const field = ng.goalType && ng.goalType !== "created" ? "current" : "created";
        delta += ((ng[field] || 0) - (og[field] || 0));
    }
    return delta;
}

/**
 * Find a solution path of at most maxDepth moves.
 *
 * @param {Match3Game} game - Live game (not mutated)
 * @param {{ maxDepth?: number, beamWidth?: number }} [options]
 * @returns {{ solvable: boolean, moves: number|null, path: Array, seed: number }}
 */
export function findSolutionPath(game, options = {}) {
    const { maxDepth = 10, beamWidth = 3 } = options;
    const seed = deriveSeed(game);
    const initialBlockedTileCount = game.initialBlockedTileCount ?? 0;

    const rootGoals = cloneGoals(game.levelGoals);
    if (areGoalsSatisfied(rootGoals)) {
        return { solvable: true, moves: 0, path: [], seed };
    }

    const rankCtx = makeRankContext(game);

    const rootNode = {
        board: cloneBoard(game.board),
        goals: rootGoals,
        path: [],
        rng: mulberry32(seed),
        heuristic: 0,
    };

    let frontier = [rootNode];

    for (let depth = 1; depth <= maxDepth; depth++) {
        const candidates = [];

        for (const node of frontier) {
            rankCtx.board = node.board;
            rankCtx.levelGoals = node.goals;
            const validSwaps = findAllValidSwaps(rankCtx);
            if (validSwaps.length === 0) continue;

            const ranked = validSwaps
                .map((swap) => ({ swap, rank: rankSwap(rankCtx, swap) }))
                .filter((r) => r.rank > -Infinity)
                .sort((a, b) => b.rank - a.rank)
                .slice(0, beamWidth);

            for (const { swap } of ranked) {
                const childRng = node.rng.clone();
                const simGame = {
                    ...game,
                    board: node.board,
                    levelGoals: node.goals,
                };
                const result = simulateMove(simGame, swap, {
                    rng: childRng,
                    levelGoals: node.goals,
                    initialBlockedTileCount,
                });

                if (!result.valid) continue;

                if (result.allGoalsSatisfied) {
                    return {
                        solvable: true,
                        moves: depth,
                        path: [...node.path, swap],
                        seed,
                    };
                }

                const progress = goalProgressDelta(result.levelGoals, node.goals);
                candidates.push({
                    board: result.newBoard,
                    goals: result.levelGoals,
                    path: [...node.path, swap],
                    rng: childRng,
                    heuristic: progress * 1000 + result.scoreDelta,
                });
            }
        }

        if (candidates.length === 0) break;

        candidates.sort((a, b) => b.heuristic - a.heuristic);
        frontier = candidates.slice(0, beamWidth);
    }

    return { solvable: false, moves: null, path: [], seed };
}
