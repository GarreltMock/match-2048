// Hint system for finding and scoring the best possible move.
// Move types: "swap" (existing), "freeswap", "teleport", "joker_swap", "joker_hammer", "joker_halver".

import {
    isBlocked,
    isBlockedWithLife,
    isBlockedMovable,
    isBlockedWithMergeCount,
    isRectangularBlocked,
    isNormal,
    isCursed,
    isWildTeleportTile,
    isTileTeleportTile,
    isTileFreeSwapTile,
    isTileStickyFreeSwapTile,
    isTileFreeSwapHorizontalTile,
    isTileFreeSwapVerticalTile,
    createTile,
    createCursedTile,
} from "./tile-helpers.js";
import { hasMatchesForSwap, findMatches } from "./match-detector.js";
import { getPowerUpCost, isPowerUpButtonVisible } from "./power-ups.js";

// Penalties applied to keep scarce-resource moves from dominating non-completing ties.
// Tune JOKER_PENALTY_FACTOR to scale all joker penalties up/down (1.0 = baseline).
const JOKER_PENALTY_FACTOR = 2;
const JOKER_IN_STOCK_PENALTY = 500 * JOKER_PENALTY_FACTOR; // already-owned joker: small "save it" cost
const JOKER_MOVE_COST_PENALTY = 3000 * JOKER_PENALTY_FACTOR; // buying with a move: must clearly outscore a normal swap
const JOKER_COIN_COST_FACTOR = 25 * JOKER_PENALTY_FACTOR; // per-coin score discount when buying with coins
const JOKER_COIN_BASE_PENALTY = 500 * JOKER_PENALTY_FACTOR; // flat component for coin buys
const SPECIAL_FREESWAP_PENALTY = 300;
const SPECIAL_TELEPORT_PENALTY = 500;
// Stacks on top of the joker penalty for hammer-on-blocked that doesn't complete a goal.
// Larger than the +10000 blocked-clear bonus so it loses to any normal match.
const HAMMER_ON_BLOCKED_NON_COMPLETING_PENALTY = 15000;
// When a joker move completes a level goal, we override the regular cost-based penalty
// with this minimal value so "use halver to finish" wins ties against normal matches.
const JOKER_GOAL_COMPLETING_PENALTY = 200;

/**
 * Main entry point: finds the best move (any type) on the board.
 * Returns a move object whose shape includes a `type` field and per-type fields.
 * Back-compat shape: swap-like moves carry row1/col1/row2/col2/direction1/direction2/matchTiles.
 */
export function findBestSwap(game) {
    const candidates = findAllCandidateMoves(game);
    if (candidates.length === 0) return null;

    const originalBoard = game.board;
    const originalIsUserSwap = game.isUserSwap;
    const originalLastSwapPosition = game.lastSwapPosition;

    const evaluated = [];
    for (const move of candidates) {
        // Fresh working copy per evaluation so mutations don't leak.
        game.board = originalBoard.map((row) => row.map((tile) => (tile ? { ...tile } : null)));
        game.isUserSwap = false;
        game.lastSwapPosition = null;
        const result = evaluateMove(game, move);
        if (result !== null) evaluated.push(result);
    }

    game.board = originalBoard;
    game.isUserSwap = originalIsUserSwap;
    game.lastSwapPosition = originalLastSwapPosition;

    if (evaluated.length === 0) return null;

    evaluated.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Tiebreaker: prefer top-left.
        const aRow = a.row1 ?? a.row;
        const aCol = a.col1 ?? a.col;
        const bRow = b.row1 ?? b.row;
        const bCol = b.col1 ?? b.col;
        return aRow + aCol - (bRow + bCol);
    });

    return evaluated[0];
}

// ===== Candidate generation =====

function findAllCandidateMoves(game) {
    const moves = [];
    const seenSwapPairs = new Set(); // for dedupe across swap-like move types

    for (const m of generateSwapCandidates(game)) {
        moves.push(m);
        seenSwapPairs.add(swapKey(m));
    }
    for (const m of generateFreeswapCandidates(game)) {
        if (!seenSwapPairs.has(swapKey(m))) moves.push(m);
    }
    for (const m of generateTeleportCandidates(game)) {
        if (!seenSwapPairs.has(swapKey(m))) moves.push(m);
    }
    for (const m of generateJokerSwapCandidates(game)) {
        if (!seenSwapPairs.has(swapKey(m))) moves.push(m);
    }
    moves.push(...generateJokerHammerCandidates(game));
    moves.push(...generateJokerHalverCandidates(game));

    return moves;
}

function swapKey(move) {
    const a = move.row1 * 100 + move.col1;
    const b = move.row2 * 100 + move.col2;
    return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/**
 * Find all valid adjacent swap pairs (no special-tile/joker moves).
 * Kept exported for solver.js which only consumes plain-swap candidates.
 */
export function findAllValidSwaps(game) {
    return generateSwapCandidates(game).map(({ row1, col1, row2, col2 }) => ({ row1, col1, row2, col2 }));
}

function generateSwapCandidates(game) {
    const out = [];
    for (let row = 0; row < game.boardHeight; row++) {
        for (let col = 0; col < game.boardWidth; col++) {
            if (col < game.boardWidth - 1 && isPlainSwappable(game, row, col, row, col + 1)) {
                out.push({ type: "swap", row1: row, col1: col, row2: row, col2: col + 1 });
            }
            if (row < game.boardHeight - 1 && isPlainSwappable(game, row, col, row + 1, col)) {
                out.push({ type: "swap", row1: row, col1: col, row2: row + 1, col2: col });
            }
        }
    }
    return out;
}

function isPlainSwappable(game, r1, c1, r2, c2) {
    const t1 = game.board[r1]?.[c1];
    const t2 = game.board[r2]?.[c2];
    if (!t1 || !t2) return false;
    if (isBlocked(t1) || isBlockedWithLife(t1)) return false;
    if (isBlocked(t2) || isBlockedWithLife(t2)) return false;
    return true;
}

function tileHasFreeSwap(tile, isHorizontal, isVertical) {
    if (!tile || tile.hasBeenSwapped) return false;
    if (isTileFreeSwapTile(tile) || isTileStickyFreeSwapTile(tile)) return true;
    return (isTileFreeSwapHorizontalTile(tile) && isHorizontal) || (isTileFreeSwapVerticalTile(tile) && isVertical);
}

function generateFreeswapCandidates(game) {
    const out = [];
    const extended = game.extendedFreeSwap === true;

    for (let r = 0; r < game.boardHeight; r++) {
        for (let c = 0; c < game.boardWidth; c++) {
            const tile = game.board[r][c];
            if (!tile || tile.hasBeenSwapped) continue;

            const isFree = isTileFreeSwapTile(tile) || isTileStickyFreeSwapTile(tile);
            const isFreeH = isTileFreeSwapHorizontalTile(tile);
            const isFreeV = isTileFreeSwapVerticalTile(tile);
            if (!isFree && !isFreeH && !isFreeV) continue;

            // Adjacent partners
            const adj = [
                [r - 1, c],
                [r + 1, c],
                [r, c - 1],
                [r, c + 1],
            ];
            for (const [r2, c2] of adj) {
                if (!isInBounds(game, r2, c2)) continue;
                const t2 = game.board[r2][c2];
                if (!t2) continue;
                if (isBlocked(t2) || isBlockedWithLife(t2) || isRectangularBlocked(t2)) continue;
                const isHorizontal = r === r2;
                const isVertical = c === c2;
                if (!tileHasFreeSwap(tile, isHorizontal, isVertical)) continue;
                out.push({ type: "freeswap", row1: r, col1: c, row2: r2, col2: c2 });
            }

            // Extended: same-row (H) or same-col (V) non-adjacent partners
            if (extended) {
                const horizontal = isFree || isFreeH;
                const vertical = isFree || isFreeV;
                if (horizontal) {
                    for (let c2 = 0; c2 < game.boardWidth; c2++) {
                        if (c2 === c || Math.abs(c2 - c) === 1) continue;
                        const t2 = game.board[r][c2];
                        if (!t2 || isBlocked(t2) || isBlockedWithLife(t2) || isRectangularBlocked(t2)) continue;
                        out.push({ type: "freeswap", row1: r, col1: c, row2: r, col2: c2 });
                    }
                }
                if (vertical) {
                    for (let r2 = 0; r2 < game.boardHeight; r2++) {
                        if (r2 === r || Math.abs(r2 - r) === 1) continue;
                        const t2 = game.board[r2][c];
                        if (!t2 || isBlocked(t2) || isBlockedWithLife(t2) || isRectangularBlocked(t2)) continue;
                        out.push({ type: "freeswap", row1: r, col1: c, row2: r2, col2: c });
                    }
                }
            }
        }
    }
    return out;
}

function generateTeleportCandidates(game) {
    const out = [];
    for (let r = 0; r < game.boardHeight; r++) {
        for (let c = 0; c < game.boardWidth; c++) {
            const tile = game.board[r][c];
            if (!tile || tile.hasBeenSwapped) continue;
            const isTele = isTileTeleportTile(tile) || isWildTeleportTile(tile);
            if (!isTele) continue;
            for (let r2 = 0; r2 < game.boardHeight; r2++) {
                for (let c2 = 0; c2 < game.boardWidth; c2++) {
                    if (r === r2 && c === c2) continue;
                    if (Math.abs(r - r2) + Math.abs(c - c2) === 1) continue; // adjacency handled by swap/freeswap
                    const t2 = game.board[r2][c2];
                    if (!t2) continue;
                    if (isBlocked(t2) || isBlockedWithLife(t2) || isRectangularBlocked(t2)) continue;
                    out.push({ type: "teleport", row1: r, col1: c, row2: r2, col2: c2 });
                }
            }
        }
    }
    return out;
}

function getPowerUpCount(game, type) {
    const counts = game.powerUpCounts?.[type];
    if (!counts) return 0;
    const persistent = game.persistentPowerUpsEnabled ? (counts.persistent || 0) : 0;
    return (counts.transient || 0) + persistent;
}

function generateJokerHammerCandidates(game) {
    // Buying a hammer requires either an unused move or coins; if neither, skip entirely.
    if (!canAffordPowerUp(game, "hammer")) return [];
    const out = [];
    const seenRects = new Set();
    for (let r = 0; r < game.boardHeight; r++) {
        for (let c = 0; c < game.boardWidth; c++) {
            const tile = game.board[r][c];
            if (!tile) continue;
            const isBlockedKind =
                isBlocked(tile) || isBlockedWithLife(tile) || isBlockedMovable(tile) || isBlockedWithMergeCount(tile);
            if (isBlockedKind) {
                if (isRectangularBlocked(tile)) {
                    if (seenRects.has(tile.rectId)) continue;
                    seenRects.add(tile.rectId);
                    out.push({ type: "joker_hammer", row: tile.rectAnchor.row, col: tile.rectAnchor.col });
                } else {
                    out.push({ type: "joker_hammer", row: r, col: c });
                }
            } else if (isNormal(tile) || isCursed(tile)) {
                // Normal/cursed: hammer + gravity collapse may form matches in the column.
                out.push({ type: "joker_hammer", row: r, col: c });
            }
        }
    }
    return out;
}

function canAffordPowerUp(game, type) {
    if (!isPowerUpButtonVisible(game, type)) return false;
    if (getPowerUpCount(game, type) > 0) return true;
    if (game.powerUpMoveCost) return (game.maxMoves ?? 0) - (game.movesUsed ?? 0) > 0;
    return (game.coins ?? 0) >= getPowerUpCost(type);
}

/**
 * Cost-aware joker penalty. In-stock jokers are nearly free (small save-it bias);
 * jokers that would have to be bought are penalized by their actual cost (moves or coins).
 */
function computeJokerCostPenalty(game, type) {
    if (getPowerUpCount(game, type) > 0) return JOKER_IN_STOCK_PENALTY;
    if (game.powerUpMoveCost) return JOKER_MOVE_COST_PENALTY;
    return JOKER_COIN_BASE_PENALTY + getPowerUpCost(type) * JOKER_COIN_COST_FACTOR;
}

function generateJokerHalverCandidates(game) {
    if (!canAffordPowerUp(game, "halve")) return [];
    const out = [];
    for (let r = 0; r < game.boardHeight; r++) {
        for (let c = 0; c < game.boardWidth; c++) {
            const tile = game.board[r][c];
            if (!tile) continue;
            if (!(isNormal(tile) || isCursed(tile))) continue;
            if (!(tile.value > 1)) continue;
            out.push({ type: "joker_halver", row: r, col: c });
        }
    }
    return out;
}

function generateJokerSwapCandidates(game) {
    if (!canAffordPowerUp(game, "swap")) return [];
    const out = [];
    for (let r = 0; r < game.boardHeight; r++) {
        for (let c = 0; c < game.boardWidth; c++) {
            // Right and down to avoid duplicates.
            const candidates = [];
            if (c < game.boardWidth - 1) candidates.push([r, c + 1]);
            if (r < game.boardHeight - 1) candidates.push([r + 1, c]);
            for (const [r2, c2] of candidates) {
                const t1 = game.board[r][c];
                const t2 = game.board[r2][c2];
                if (!t1 || !t2) continue;
                // Mirror executeSwap rules: swap power-up cannot move blocked-with-life or rectangular blocked.
                if (isBlockedWithLife(t1) || isBlockedWithLife(t2)) continue;
                if (isRectangularBlocked(t1) || isRectangularBlocked(t2)) continue;
                out.push({ type: "joker_swap", row1: r, col1: c, row2: r2, col2: c2 });
            }
        }
    }
    return out;
}

function isInBounds(game, r, c) {
    return r >= 0 && r < game.boardHeight && c >= 0 && c < game.boardWidth;
}

// ===== Move evaluation =====

function evaluateMove(game, move) {
    switch (move.type) {
        case "swap":
        case "freeswap":
        case "teleport":
        case "joker_swap":
            return evaluateSwapLikeMove(game, move);
        case "joker_hammer":
            return evaluateHammerMove(game, move);
        case "joker_halver":
            return evaluateHalverMove(game, move);
    }
    return null;
}

function evaluateSwapLikeMove(game, move) {
    const { type, row1, col1, row2, col2 } = move;

    const temp = game.board[row1][col1];
    game.board[row1][col1] = game.board[row2][col2];
    game.board[row2][col2] = temp;

    game.isUserSwap = true;
    game.lastSwapPosition = { row: row2, col: col2, movedFrom: { row: row1, col: col1 } };

    if (!hasMatchesForSwap(game, row1, col1, row2, col2)) return null;

    const { score: baseScore, firstMatches, allMatches } = cascadeAndScore(game);
    if (baseScore === 0) return null;

    // Match tiles for display: first round only, translated back to pre-swap visual positions.
    const matchTiles = [];
    for (const m of firstMatches) {
        for (const tile of m.tiles) {
            let dr = tile.row,
                dc = tile.col;
            if (tile.row === row1 && tile.col === col1) {
                dr = row2;
                dc = col2;
            } else if (tile.row === row2 && tile.col === col2) {
                dr = row1;
                dc = col1;
            }
            matchTiles.push({ row: dr, col: dc });
        }
    }

    const goalsCompleted = countGoalsCompletedByMatches(game, allMatches);
    const { direction1, direction2 } = computeNudgeDirections(row1, col1, row2, col2);
    const score = baseScore + applyMoveTypeAdjustment(game, type, baseScore, goalsCompleted);

    return { type, row1, col1, row2, col2, direction1, direction2, score, matchTiles };
}

function computeNudgeDirections(r1, c1, r2, c2) {
    const dr = r2 - r1;
    const dc = c2 - c1;
    if (dr === 0) {
        return dc > 0 ? { direction1: "right", direction2: "left" } : { direction1: "left", direction2: "right" };
    }
    if (dc === 0) {
        return dr > 0 ? { direction1: "down", direction2: "up" } : { direction1: "up", direction2: "down" };
    }
    // Diagonal (teleport across both axes).
    const v = dr > 0 ? "down" : "up";
    const h = dc > 0 ? "right" : "left";
    const opp = dr > 0 ? "up" : "down";
    const oppH = dc > 0 ? "left" : "right";
    return { direction1: `${v}-${h}`, direction2: `${opp}-${oppH}` };
}

function evaluateHammerMove(game, move) {
    const { row, col } = move;
    const tile = game.board[row][col];
    if (!tile) return null;

    const isBlockedKind =
        isBlocked(tile) || isBlockedWithLife(tile) || isBlockedMovable(tile) || isBlockedWithMergeCount(tile);

    if (isBlockedKind) return evaluateHammerOnBlocked(game, row, col, tile);
    if (isNormal(tile) || isCursed(tile)) return evaluateHammerOnNormal(game, row, col);
    return null;
}

function evaluateHammerOnBlocked(game, row, col, tile) {
    const wouldClearCount = computeHammerClearCount(tile);
    if (wouldClearCount <= 0) return null;

    let baseScore = 10000 + wouldClearCount * 500;

    const blockedGoalsCompleted = countBlockedGoalsCompletedByClear(game, wouldClearCount);
    baseScore += blockedGoalsCompleted * 8000;

    // Mirror usePowerUpHammer: only null out cells when the blocker is actually cleared.
    if (isBlockedWithMergeCount(tile)) {
        // Decrement one cell; remove entire rect only when all cells reach zero.
        const allCleared = Object.values(tile.cellMergeCounts).every((v) => v <= 1);
        if (allCleared) {
            for (let r = tile.rectAnchor.row; r < tile.rectAnchor.row + tile.rectHeight; r++) {
                for (let c = tile.rectAnchor.col; c < tile.rectAnchor.col + tile.rectWidth; c++) {
                    game.board[r][c] = null;
                }
            }
        }
        // If not fully cleared, no holes are created so no cascade is possible.
        else {
            return { type: "joker_hammer", row, col, score: baseScore - computeJokerCostPenalty(game, "hammer") - HAMMER_ON_BLOCKED_NON_COMPLETING_PENALTY, matchTiles: [] };
        }
    } else if (isBlockedWithLife(tile) && tile.isRectangular) {
        // Rectangular life-blocker cleared — remove all cells.
        for (let r = tile.rectAnchor.row; r < tile.rectAnchor.row + tile.rectHeight; r++) {
            for (let c = tile.rectAnchor.col; c < tile.rectAnchor.col + tile.rectWidth; c++) {
                game.board[r][c] = null;
            }
        }
    } else {
        game.board[row][col] = null;
    }
    collapseColumnsNoSpawn(game);
    const { score: cascadeScore, allMatches } = cascadeAndScore(game);
    baseScore += cascadeScore;

    const goalsCompletedByMatches = countGoalsCompletedByMatches(game, allMatches);
    const totalGoalsCompleted = blockedGoalsCompleted + goalsCompletedByMatches;

    let score = baseScore;
    if (totalGoalsCompleted > 0) {
        score -= computeJokerCostPenalty(game, "hammer") + JOKER_GOAL_COMPLETING_PENALTY;
    } else {
        score -= computeJokerCostPenalty(game, "hammer");
        score -= HAMMER_ON_BLOCKED_NON_COMPLETING_PENALTY;
    }

    const matchTiles = [];
    for (const m of allMatches) for (const t of m.tiles) matchTiles.push({ row: t.row, col: t.col });

    return { type: "joker_hammer", row, col, score, matchTiles };
}

function evaluateHammerOnNormal(game, row, col) {
    game.board[row][col] = null;
    collapseColumnsNoSpawn(game);

    const { score: baseScore, allMatches } = cascadeAndScore(game);
    if (baseScore === 0) return null;

    const goalsCompleted = countGoalsCompletedByMatches(game, allMatches);
    const penalty = computeJokerCostPenalty(game, "hammer") + (goalsCompleted > 0 ? JOKER_GOAL_COMPLETING_PENALTY : 0);
    const score = baseScore - penalty;

    const matchTiles = [];
    for (const m of allMatches) for (const t of m.tiles) matchTiles.push({ row: t.row, col: t.col });

    return { type: "joker_hammer", row, col, score, matchTiles };
}

/**
 * Score all matches reachable from the current board state via deterministic cascade.
 * Each round: findMatches → calculateSwapScore → remove tiles → collapseColumnsNoSpawn.
 * Mutates game.board. Returns accumulated score, first-round matches (for display), all matches.
 */
function cascadeAndScore(game) {
    let totalScore = 0;
    const allMatches = [];
    let firstMatches = null;

    let round = findMatches(game);
    while (round.length > 0) {
        if (!firstMatches) firstMatches = round;
        totalScore += calculateSwapScore(game, round);
        allMatches.push(...round);
        for (const m of round) for (const t of m.tiles) game.board[t.row][t.col] = null;
        collapseColumnsNoSpawn(game);
        round = findMatches(game);
    }

    return { score: totalScore, firstMatches: firstMatches ?? [], allMatches };
}

/**
 * Collapse non-null tiles downward within each column, treating immovable blocked tiles
 * as section dividers. Does NOT spawn new tiles at the top — that would be stochastic.
 * Mutates game.board in place.
 */
function collapseColumnsNoSpawn(game) {
    for (let c = 0; c < game.boardWidth; c++) {
        const blockerRows = [];
        for (let r = 0; r < game.boardHeight; r++) {
            const t = game.board[r][c];
            if (t && (isBlocked(t) || isBlockedWithLife(t) || isBlockedWithMergeCount(t)) && t.immovable !== false) {
                blockerRows.push(r);
            }
        }
        const sections = [];
        let start = 0;
        for (const br of blockerRows) {
            if (br > start) sections.push([start, br - 1]);
            start = br + 1;
        }
        if (start <= game.boardHeight - 1) sections.push([start, game.boardHeight - 1]);

        for (const [s, e] of sections) {
            const collected = [];
            for (let r = s; r <= e; r++) {
                if (game.board[r][c]) collected.push(game.board[r][c]);
            }
            // Place collected tiles bottom-up; leave nulls at the top of the section.
            for (let r = e, i = collected.length - 1; r >= s; r--, i--) {
                game.board[r][c] = i >= 0 ? collected[i] : null;
            }
        }
    }
}

function computeHammerClearCount(tile) {
    if (isBlockedWithLife(tile)) {
        const cellCount = tile.isRectangular ? tile.rectWidth * tile.rectHeight : 1;
        const reducedLife = tile.lifeValue - Math.ceil(tile.lifeValue / (cellCount + 1));
        return reducedLife <= 0 ? cellCount : 0;
    }
    if (isBlockedWithMergeCount(tile)) {
        // Hammer decrements one cell. Treat as +1 cleared if that cell completes; else 0.
        const remainingCells = Object.values(tile.cellMergeCounts).filter((v) => v > 0).length;
        return remainingCells === 1 ? tile.rectWidth * tile.rectHeight : 1;
    }
    if (isBlocked(tile) || isBlockedMovable(tile)) return 1;
    return 0;
}

function countBlockedGoalsCompletedByClear(game, wouldClearCount) {
    if (!game.levelGoals) return 0;
    let n = 0;
    for (const goal of game.levelGoals) {
        if (goal.goalType !== "blocked") continue;
        if (goal.current + wouldClearCount >= goal.target) n++;
    }
    return n;
}

function evaluateHalverMove(game, move) {
    const { row, col } = move;
    const tile = game.board[row][col];
    if (!tile) return null;
    if (!(isNormal(tile) || isCursed(tile))) return null;
    if (!(tile.value > 1)) return null;

    const halvedValue = tile.value - 1;
    game.board[row][col] = isCursed(tile)
        ? createCursedTile(halvedValue, tile.cursedMovesRemaining)
        : createTile(halvedValue);

    // Only score matches that involve the halved tile (attributable to this halver action).
    const firstAllMatches = findMatches(game);
    const firstMatches = firstAllMatches.filter((m) => m.tiles.some((t) => t.row === row && t.col === col));

    let baseScore = firstMatches.length > 0 ? calculateSwapScore(game, firstMatches) : 0;
    const allMatches = [...firstMatches];

    // Cascade: remove first-round matches and score chain reactions.
    if (firstMatches.length > 0) {
        for (const m of firstMatches) for (const t of m.tiles) game.board[t.row][t.col] = null;
        collapseColumnsNoSpawn(game);
        const { score: cascadeScore, allMatches: cascadeMatches } = cascadeAndScore(game);
        baseScore += cascadeScore;
        allMatches.push(...cascadeMatches);
    }

    const halverGoalProgress = countHalverGoalProgress(game, halvedValue);
    baseScore += halverGoalProgress.progress * 100 + halverGoalProgress.completed * 8000;

    const goalsCompleted = countGoalsCompletedByMatches(game, allMatches) + halverGoalProgress.completed;
    const score = baseScore + applyMoveTypeAdjustment(game, "joker_halver", baseScore, goalsCompleted);

    const matchTiles = [];
    for (const m of firstMatches) for (const t of m.tiles) matchTiles.push({ row: t.row, col: t.col });

    return { type: "joker_halver", row, col, score, matchTiles };
}

function countHalverGoalProgress(game, halvedValue) {
    let progress = 0;
    let completed = 0;
    if (!game.levelGoals) return { progress, completed };
    for (const goal of game.levelGoals) {
        if (goal.goalType === "created" && goal.tileValue === halvedValue) {
            progress += 1;
            if (goal.created + 1 >= goal.target) completed += 1;
        } else if (goal.goalType === "current" && goal.tileValue === halvedValue) {
            progress += 1;
            if (goal.current + 1 >= goal.target) completed += 1;
        }
    }
    return { progress, completed };
}

// ===== Scoring =====

/**
 * Calculate composite score for a swap based on matches.
 * Public so other modules (or tests) can reuse the formula.
 */
export function calculateSwapScore(game, matches) {
    let score = 0;

    let maxFormationScore = 0;
    let totalTilesCleared = 0;
    let maxValue = 0;
    let goalProgress = 0;
    let blockedCleared = 0;
    let hasSpecialTile = false;

    for (const match of matches) {
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
            formationScore = 300;
        }

        maxFormationScore = Math.max(maxFormationScore, formationScore);
        totalTilesCleared += match.tiles.length;
        maxValue = Math.max(maxValue, match.value);

        if (direction === "T-formation" || direction === "L-formation" || direction.includes("line_5")) {
            hasSpecialTile = true;
        }
    }

    let goalsCompleted = 0;
    if (game.levelGoals && game.levelGoals.length > 0) {
        for (const goal of game.levelGoals) {
            let progressForGoal = 0;
            for (const match of matches) {
                const isBigFormation =
                    match.direction === "T-formation" ||
                    match.direction === "L-formation" ||
                    match.direction === "line_5_horizontal" ||
                    match.direction === "line_5_vertical";
                const producedValue = match.value + (isBigFormation ? 2 : 1);

                if (goal.goalType === "created" && producedValue === goal.tileValue) {
                    progressForGoal += 1;
                } else if (goal.goalType === "current" && producedValue === goal.tileValue) {
                    progressForGoal += 1;
                }
            }
            goalProgress += progressForGoal;

            if (progressForGoal > 0) {
                const currentProgress = goal.goalType === "created" ? goal.created : goal.current;
                if (currentProgress + progressForGoal >= goal.target) {
                    goalsCompleted += 1;
                }
            }
        }
    }

    // Blocked tiles adjacent to match positions (would clear via match-adjacency).
    for (const match of matches) {
        for (const tile of match.tiles) {
            const adj = [
                [tile.row - 1, tile.col],
                [tile.row + 1, tile.col],
                [tile.row, tile.col - 1],
                [tile.row, tile.col + 1],
            ];
            for (const [ar, ac] of adj) {
                if (ar >= 0 && ar < game.boardHeight && ac >= 0 && ac < game.boardWidth) {
                    const a = game.board[ar]?.[ac];
                    if (
                        a &&
                        (isBlocked(a) || isBlockedWithLife(a) || isBlockedMovable(a) || isBlockedWithMergeCount(a))
                    ) {
                        blockedCleared += 1;
                    }
                }
            }
        }
    }

    let totalRow = 0;
    let tileCount = 0;
    for (const match of matches) {
        for (const tile of match.tiles) {
            totalRow += tile.row;
            tileCount++;
        }
    }
    const avgRow = tileCount > 0 ? totalRow / tileCount : 0;
    const positionBonus = Math.round((avgRow / (game.boardHeight - 1)) * 150);

    score += maxFormationScore;
    score += totalTilesCleared * 50;
    score += goalProgress * 100;
    score += goalsCompleted * 8000;

    if (blockedCleared > 0) {
        score += 10000 + blockedCleared * 500;
    }

    score += hasSpecialTile ? 200 : 0;
    score += maxValue * 5;
    score += positionBonus;

    return score;
}

function countGoalsCompletedByMatches(game, matches) {
    if (!game.levelGoals || game.levelGoals.length === 0) return 0;
    let n = 0;
    for (const goal of game.levelGoals) {
        let progressForGoal = 0;
        for (const match of matches) {
            const isBig =
                match.direction === "T-formation" ||
                match.direction === "L-formation" ||
                match.direction === "line_5_horizontal" ||
                match.direction === "line_5_vertical";
            const producedValue = match.value + (isBig ? 2 : 1);
            if (goal.goalType === "created" && producedValue === goal.tileValue) progressForGoal += 1;
            else if (goal.goalType === "current" && producedValue === goal.tileValue) progressForGoal += 1;
        }
        if (progressForGoal > 0) {
            const cur = goal.goalType === "created" ? goal.created : goal.current;
            if (cur + progressForGoal >= goal.target) n++;
        }
    }
    return n;
}

function applyMoveTypeAdjustment(game, type, _baseScore, goalsCompleted) {
    switch (type) {
        case "swap":
            return 0;
        case "freeswap":
            return -SPECIAL_FREESWAP_PENALTY;
        case "teleport":
            return -SPECIAL_TELEPORT_PENALTY;
        case "joker_swap":
            return -(computeJokerCostPenalty(game, "swap") + (goalsCompleted > 0 ? JOKER_GOAL_COMPLETING_PENALTY : 0));
        case "joker_halver":
            return -(computeJokerCostPenalty(game, "halve") + (goalsCompleted > 0 ? JOKER_GOAL_COMPLETING_PENALTY : 0));
        default:
            return 0;
    }
}

/**
 * Get the tiles that would be matched if a swap is performed.
 * Used by swap preview during drag.
 */
export function getMatchTilesForSwap(game, row1, col1, row2, col2) {
    const originalBoard = game.board;
    const originalIsUserSwap = game.isUserSwap;
    const originalLastSwapPosition = game.lastSwapPosition;

    game.board = originalBoard.map((row) => row.map((tile) => (tile ? { ...tile } : null)));

    const temp = game.board[row1][col1];
    game.board[row1][col1] = game.board[row2][col2];
    game.board[row2][col2] = temp;

    game.isUserSwap = true;
    game.lastSwapPosition = { row: row2, col: col2, movedFrom: { row: row1, col: col1 } };

    const matchTiles = [];
    if (hasMatchesForSwap(game, row1, col1, row2, col2)) {
        const matches = findMatches(game);
        const relevantMatches = matches.filter((m) => m.tiles.some((t) => t.row === row2 && t.col === col2));
        for (const m of relevantMatches) {
            for (const t of m.tiles) {
                let dr = t.row;
                let dc = t.col;
                if (t.row === row1 && t.col === col1) {
                    dr = row2;
                    dc = col2;
                } else if (t.row === row2 && t.col === col2) {
                    dr = row1;
                    dc = col1;
                }
                matchTiles.push({ row: dr, col: dc });
            }
        }
    }

    game.board = originalBoard;
    game.isUserSwap = originalIsUserSwap;
    game.lastSwapPosition = originalLastSwapPosition;

    return matchTiles;
}
