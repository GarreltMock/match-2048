// Match finding logic for detecting tile matches and special formations

import { getTileValue, isNormal, isJoker, isTileGoldenTile, createTile } from "./tile-helpers.js";
import { canMatch } from "./board.js";
import { findBestJokerValue } from "./input-handler.js";

export function hasMatches(game) {
    return findMatches(game).length > 0;
}

export function findMatches(game) {
    // During user swap, activate jokers first
    if (game.isUserSwap) {
        activateJokers(game);
    }

    // Find all matches with priority: 5-line > T > L > 4-line > Block > 3-line
    const allMatches = [
        ...findLineMatches(game, 5),
        ...findSpecialFormations(game, "T"),
        ...findSpecialFormations(game, "L"),
        ...findLineMatches(game, 4),
        ...findSpecialFormations(game, "Block"),
        ...findLineMatches(game, 3),
    ];

    // Remove overlapping matches (keep higher priority)
    return filterOverlappingMatches(allMatches);
}

function activateJokers(game) {
    for (let row = 0; row < game.boardHeight; row++) {
        for (let col = 0; col < game.boardWidth; col++) {
            const tile = game.board[row][col];
            if (isJoker(tile)) {
                const bestValue = findBestJokerValue(game, row, col);
                if (bestValue !== null) {
                    game.board[row][col] = createTile(bestValue);
                }
            }
        }
    }
}

function findLineMatches(game, targetLength) {
    const matches = [];

    // Scan horizontally
    for (let row = 0; row < game.boardHeight; row++) {
        matches.push(...scanLine(game, row, true, targetLength));
    }

    // Scan vertically
    for (let col = 0; col < game.boardWidth; col++) {
        matches.push(...scanLine(game, col, false, targetLength));
    }

    return matches;
}

function scanLine(game, index, isHorizontal, targetLength) {
    const matches = [];
    const length = isHorizontal ? game.boardWidth : game.boardHeight;

    let matchGroup = [];
    let baseValue = null;
    let hasGoldenTile = false;

    for (let i = 0; i < length; i++) {
        const [row, col] = isHorizontal ? [index, i] : [i, index];
        const tile = game.board[row][col];
        const value = getTileValue(tile);

        // Check if tile can be part of current match
        if (isNormal(tile) && value !== 0) {
            if (matchGroup.length === 0) {
                // Start new match
                matchGroup.push({ row, col });
                baseValue = value;
                hasGoldenTile = isTileGoldenTile(tile);
            } else {
                // Try to extend match
                const prevPos = matchGroup[matchGroup.length - 1];
                const prevTile = game.board[prevPos.row][prevPos.col];

                if (canMatch(tile, prevTile, game)) {
                    matchGroup.push({ row, col });
                    // For power tiles, use maximum value
                    if (prevTile.isPowerTile || tile.isPowerTile) {
                        baseValue = Math.max(baseValue, value);
                    }
                    if (isTileGoldenTile(tile)) {
                        hasGoldenTile = true;
                    }
                } else {
                    // End current match and start new one
                    if (matchGroup.length >= targetLength) {
                        matches.push(createLineMatch(matchGroup, baseValue, hasGoldenTile, isHorizontal));
                    }
                    matchGroup = [{ row, col }];
                    baseValue = value;
                    hasGoldenTile = isTileGoldenTile(tile);
                }
            }
        } else {
            // End current match
            if (matchGroup.length >= targetLength) {
                matches.push(createLineMatch(matchGroup, baseValue, hasGoldenTile, isHorizontal));
            }
            matchGroup = [];
            baseValue = null;
            hasGoldenTile = false;
        }
    }

    // Check remaining match at end
    if (matchGroup.length >= targetLength) {
        matches.push(createLineMatch(matchGroup, baseValue, hasGoldenTile, isHorizontal));
    }

    return matches;
}

function createLineMatch(tiles, value, hasGoldenTile, isHorizontal) {
    const direction = isHorizontal ? "horizontal" : "vertical";
    const formationType = tiles.length === 4 ? `line_4_${direction}` :
                         tiles.length === 5 ? `line_5_${direction}` :
                         direction;

    return {
        tiles: [...tiles],
        value,
        direction: formationType,
        hasGoldenTile,
    };
}

function findSpecialFormations(game, type) {
    const formations = [];

    for (let row = 0; row < game.boardHeight; row++) {
        for (let col = 0; col < game.boardWidth; col++) {
            const tile = game.board[row][col];
            if (!isNormal(tile)) continue;

            const value = getTileValue(tile);
            if (value === 0) continue;

            let formation = null;
            if (type === "T") {
                formation = checkTFormation(game, row, col, value);
            } else if (type === "L") {
                formation = checkLFormation(game, row, col, value);
            } else if (type === "Block") {
                formation = checkBlockFormation(game, row, col, value);
            }

            if (formation) {
                formations.push(formation);
            }
        }
    }

    return formations;
}

export function checkTFormation(game, row, col, value) {
    // T-formation: 3 tiles in one direction + 2 tiles perpendicular at center
    const patterns = [
        { horizontal: [-1, 0, 1], vertical: [1, 2] },   // T down
        { vertical: [-1, 0, 1], horizontal: [1, 2] },   // T right
        { horizontal: [-1, 0, 1], vertical: [-2, -1] }, // T up
        { vertical: [-1, 0, 1], horizontal: [-2, -1] }, // T left
    ];

    for (const pattern of patterns) {
        const result = checkPattern(game, row, col, value, pattern);
        if (result && result.positions.length === 5) {
            return {
                tiles: result.positions,
                value,
                direction: "T-formation",
                intersection: { row, col },
                hasGoldenTile: result.hasGoldenTile,
            };
        }
    }

    return null;
}

export function checkLFormation(game, row, col, value) {
    // L-formation: 3 tiles horizontal + 3 tiles vertical with shared corner
    const patterns = [
        { horizontal: [0, 1, 2], vertical: [0, 1, 2] },    // L right-down
        { horizontal: [0, -1, -2], vertical: [0, 1, 2] },  // L left-down
        { horizontal: [0, 1, 2], vertical: [0, -1, -2] },  // L right-up
        { horizontal: [0, -1, -2], vertical: [0, -1, -2] },// L left-up
    ];

    for (const pattern of patterns) {
        // For L, vertical should skip first offset (corner already counted)
        const positions = [];
        let hasGoldenTile = false;
        let valid = true;

        // Check horizontal
        for (const offset of pattern.horizontal) {
            const result = getTileAt(game, row, col + offset);
            if (!result || getTileValue(result.tile) !== value) {
                valid = false;
                break;
            }
            positions.push(result.pos);
            if (isTileGoldenTile(result.tile)) hasGoldenTile = true;
        }

        if (!valid) continue;

        // Check vertical (skip first - it's the corner)
        for (let i = 1; i < pattern.vertical.length; i++) {
            const result = getTileAt(game, row + pattern.vertical[i], col);
            if (!result || getTileValue(result.tile) !== value) {
                valid = false;
                break;
            }
            positions.push(result.pos);
            if (isTileGoldenTile(result.tile)) hasGoldenTile = true;
        }

        if (valid && positions.length === 5) {
            return {
                tiles: positions,
                value,
                direction: "L-formation",
                intersection: { row, col },
                hasGoldenTile,
            };
        }
    }

    return null;
}

export function checkBlockFormation(game, row, col, value) {
    // Block: 2x2 square
    if (row >= game.boardHeight - 1 || col >= game.boardWidth - 1) {
        return null;
    }

    const positions = [
        { row, col },
        { row, col: col + 1 },
        { row: row + 1, col },
        { row: row + 1, col: col + 1 },
    ];

    let hasGoldenTile = false;

    for (const pos of positions) {
        const tile = game.board[pos.row]?.[pos.col];
        if (!tile || getTileValue(tile) !== value) {
            return null;
        }
        if (isTileGoldenTile(tile)) {
            hasGoldenTile = true;
        }
    }

    return {
        tiles: positions,
        value,
        direction: "block_4_formation",
        intersections: [
            { row, col: col + 1 },      // top-right
            { row: row + 1, col },      // bottom-left
        ],
        hasGoldenTile,
    };
}

function checkPattern(game, centerRow, centerCol, value, pattern) {
    const positions = [];
    let hasGoldenTile = false;

    // Check horizontal offsets
    for (const offset of pattern.horizontal) {
        const result = getTileAt(game, centerRow, centerCol + offset);
        if (!result || getTileValue(result.tile) !== value) {
            return null;
        }
        positions.push(result.pos);
        if (isTileGoldenTile(result.tile)) hasGoldenTile = true;
    }

    // Check vertical offsets
    for (const offset of pattern.vertical) {
        const result = getTileAt(game, centerRow + offset, centerCol);
        if (!result || getTileValue(result.tile) !== value) {
            return null;
        }
        positions.push(result.pos);
        if (isTileGoldenTile(result.tile)) hasGoldenTile = true;
    }

    return { positions, hasGoldenTile };
}

function getTileAt(game, row, col) {
    if (row < 0 || row >= game.boardHeight || col < 0 || col >= game.boardWidth) {
        return null;
    }
    const tile = game.board[row]?.[col];
    if (!tile || !isNormal(tile)) {
        return null;
    }
    return { tile, pos: { row, col } };
}

function filterOverlappingMatches(matches) {
    const result = [];
    const usedTiles = new Set();

    for (const match of matches) {
        const hasOverlap = match.tiles.some(tile =>
            usedTiles.has(`${tile.row},${tile.col}`)
        );

        if (!hasOverlap) {
            result.push(match);
            match.tiles.forEach(tile => {
                usedTiles.add(`${tile.row},${tile.col}`);
            });
        }
    }

    return result;
}
