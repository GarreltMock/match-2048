// Match finding logic for detecting tile matches and special formations

import { getTileValue, isNormal, isCursed, isJoker, isTileGoldenTile, createTile } from "./tile-helpers.js";
import { canMatch } from "./board.js";
import { findBestJokerValue } from "./input-handler.js";
import { isFeatureUnlocked } from "./storage.js";
import { FEATURE_KEYS } from "./config.js";

export function hasMatches(game) {
    return findMatches(game).length > 0;
}

// Check if a swap between two positions creates matches involving those positions
export function hasMatchesForSwap(game, row1, col1, row2, col2) {
    const matches = findMatches(game);

    // Check if any match contains either of the swapped positions
    return matches.some((match) => {
        return match.tiles.some((tile) => {
            return (tile.row === row1 && tile.col === col1) || (tile.row === row2 && tile.col === col2);
        });
    });
}

export function findMatches(game) {
    // During user swap, activate jokers that can participate in matches
    if (game.isUserSwap) {
        activateJokers(game);
    }

    // Find all matches with priority: 5-line > T > L > 4-line > Block > 3-line
    // Only check for formations that have been unlocked
    const allMatches = [];

    // Check for 5-tile line matches (if unlocked)
    if (isFeatureUnlocked(FEATURE_KEYS.LINE_5)) {
        allMatches.push(...findLineMatches(game, 5));
    }

    // Check for T-formations (if unlocked)
    if (isFeatureUnlocked(FEATURE_KEYS.T_FORMATION)) {
        allMatches.push(...findSpecialFormations(game, "T"));
    }

    // Check for L-formations (if unlocked)
    if (isFeatureUnlocked(FEATURE_KEYS.L_FORMATION)) {
        allMatches.push(...findSpecialFormations(game, "L"));
    }

    // Check for 4-tile line matches (if unlocked)
    if (isFeatureUnlocked(FEATURE_KEYS.LINE_4)) {
        allMatches.push(...findLineMatches(game, 4));
    }

    // Check for block formations (if unlocked)
    if (isFeatureUnlocked(FEATURE_KEYS.BLOCK_4)) {
        allMatches.push(...findSpecialFormations(game, "Block"));
    }

    // 3-tile line matches are always available (core mechanic)
    allMatches.push(...findLineMatches(game, 3));

    // Remove overlapping matches (keep higher priority)
    return filterOverlappingMatches(allMatches);
}

function activateJokers(game) {
    // Activate jokers that can form valid matches involving the swapped tiles
    for (let row = 0; row < game.boardHeight; row++) {
        for (let col = 0; col < game.boardWidth; col++) {
            const tile = game.board[row][col];
            if (isJoker(tile)) {
                // Pass true to require that matches include swapped tiles
                const bestValue = findBestJokerValue(game, row, col, true);
                if (bestValue !== null) {
                    // Convert joker to the best matching value
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

        // Check if tile can be part of current match (normal or cursed tiles)
        if ((isNormal(tile) || isCursed(tile)) && value !== 0) {
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
                    if (prevTile.specialType === "power" || tile.specialType === "power") {
                        baseValue = Math.max(baseValue, value);
                    }
                    if (isTileGoldenTile(tile)) {
                        hasGoldenTile = true;
                    }
                } else {
                    // End current match and start new one
                    if (matchGroup.length >= targetLength) {
                        // Take exactly targetLength tiles from the group
                        const matchTiles = matchGroup.slice(0, targetLength);
                        matches.push(createLineMatch(matchTiles, baseValue, hasGoldenTile, isHorizontal));
                    }
                    matchGroup = [{ row, col }];
                    baseValue = value;
                    hasGoldenTile = isTileGoldenTile(tile);
                }
            }
        } else {
            // End current match
            if (matchGroup.length >= targetLength) {
                // Take exactly targetLength tiles from the group
                const matchTiles = matchGroup.slice(0, targetLength);
                matches.push(createLineMatch(matchTiles, baseValue, hasGoldenTile, isHorizontal));
            }
            matchGroup = [];
            baseValue = null;
            hasGoldenTile = false;
        }
    }

    // Check remaining match at end
    if (matchGroup.length >= targetLength) {
        // Take exactly targetLength tiles from the group
        const matchTiles = matchGroup.slice(0, targetLength);
        matches.push(createLineMatch(matchTiles, baseValue, hasGoldenTile, isHorizontal));
    }

    return matches;
}

function createLineMatch(tiles, value, hasGoldenTile, isHorizontal) {
    const direction = isHorizontal ? "horizontal" : "vertical";
    const formationType =
        tiles.length === 4 ? `line_4_${direction}` : tiles.length === 5 ? `line_5_${direction}` : direction;

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
            if (!isNormal(tile) && !isCursed(tile)) continue;

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
        { horizontal: [-1, 0, 1], vertical: [1, 2] }, // T down
        { vertical: [-1, 0, 1], horizontal: [1, 2] }, // T right
        { horizontal: [-1, 0, 1], vertical: [-2, -1] }, // T up
        { vertical: [-1, 0, 1], horizontal: [-2, -1] }, // T left
    ];

    for (const pattern of patterns) {
        const result = checkPattern(game, row, col, value, pattern);
        if (result && result.positions.length === 5) {
            // Find overlapping line matches and add their tiles
            const additionalTiles = findOverlappingLineMatches(game, result.positions, value);
            const allTiles = [...result.positions, ...additionalTiles];

            return {
                tiles: allTiles,
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
        { horizontal: [0, 1, 2], vertical: [0, 1, 2] }, // L right-down
        { horizontal: [0, -1, -2], vertical: [0, 1, 2] }, // L left-down
        { horizontal: [0, 1, 2], vertical: [0, -1, -2] }, // L right-up
        { horizontal: [0, -1, -2], vertical: [0, -1, -2] }, // L left-up
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
            // Find overlapping line matches and add their tiles
            const additionalTiles = findOverlappingLineMatches(game, positions, value);
            const allTiles = [...positions, ...additionalTiles];

            return {
                tiles: allTiles,
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

    // Find overlapping line matches and add their tiles
    const additionalTiles = findOverlappingLineMatches(game, positions, value);
    const allTiles = [...positions, ...additionalTiles];

    return {
        tiles: allTiles,
        value,
        direction: "block_4_formation",
        intersections: [
            { row: row + 1, col }, // bottom-left
            { row: row + 1, col: col + 1 }, // bottom-right
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

// Find all line matches (3+, 4+, or 5+ tiles) that overlap with the given formation tiles
function findOverlappingLineMatches(game, formationTiles, value) {
    const formationSet = new Set();
    formationTiles.forEach((tile) => {
        formationSet.add(`${tile.row},${tile.col}`);
    });

    const additionalTiles = new Set();
    const processedLines = new Set();

    // Check each formation tile for overlapping line matches
    for (const formationTile of formationTiles) {
        // Check horizontal line
        const horizontalKey = `h-${formationTile.row}`;
        if (!processedLines.has(horizontalKey)) {
            processedLines.add(horizontalKey);

            // Find extent of horizontal line
            let leftCol = formationTile.col;
            let rightCol = formationTile.col;

            // Scan left
            while (leftCol > 0) {
                const row = game.board[formationTile.row];
                if (!row) break;
                const tile = row[leftCol - 1];
                if (!tile || getTileValue(tile) !== value || (!isNormal(tile) && !isCursed(tile))) {
                    break;
                }
                leftCol--;
            }

            // Scan right
            while (rightCol < game.boardWidth - 1) {
                const row = game.board[formationTile.row];
                if (!row) break;
                const tile = row[rightCol + 1];
                if (!tile || getTileValue(tile) !== value || (!isNormal(tile) && !isCursed(tile))) {
                    break;
                }
                rightCol++;
            }

            // If this is a valid line match (3+ tiles), add all tiles not in formation
            const lineLength = rightCol - leftCol + 1;
            if (lineLength >= 3) {
                for (let col = leftCol; col <= rightCol; col++) {
                    const key = `${formationTile.row},${col}`;
                    if (!formationSet.has(key)) {
                        additionalTiles.add(key);
                    }
                }
            }
        }

        // Check vertical line
        const verticalKey = `v-${formationTile.col}`;
        if (!processedLines.has(verticalKey)) {
            processedLines.add(verticalKey);

            // Find extent of vertical line
            let topRow = formationTile.row;
            let bottomRow = formationTile.row;

            // Scan up
            while (topRow > 0) {
                const row = game.board[topRow - 1];
                if (!row) break;
                const tile = row[formationTile.col];
                if (!tile || getTileValue(tile) !== value || (!isNormal(tile) && !isCursed(tile))) {
                    break;
                }
                topRow--;
            }

            // Scan down
            while (bottomRow < game.boardHeight - 1) {
                const row = game.board[bottomRow + 1];
                if (!row) break;
                const tile = row[formationTile.col];
                if (!tile || getTileValue(tile) !== value || (!isNormal(tile) && !isCursed(tile))) {
                    break;
                }
                bottomRow++;
            }

            // If this is a valid line match (3+ tiles), add all tiles not in formation
            const lineLength = bottomRow - topRow + 1;
            if (lineLength >= 3) {
                for (let row = topRow; row <= bottomRow; row++) {
                    const key = `${row},${formationTile.col}`;
                    if (!formationSet.has(key)) {
                        additionalTiles.add(key);
                    }
                }
            }
        }
    }

    // Convert set back to array of position objects
    const result = [];
    additionalTiles.forEach((key) => {
        const [row, col] = key.split(",").map(Number);
        result.push({ row, col });
    });

    return result;
}

function filterOverlappingMatches(matches) {
    const result = [];
    const usedTiles = new Set();

    for (const match of matches) {
        const hasOverlap = match.tiles.some((tile) => usedTiles.has(`${tile.row},${tile.col}`));

        if (!hasOverlap) {
            result.push(match);
            match.tiles.forEach((tile) => {
                usedTiles.add(`${tile.row},${tile.col}`);
            });
        }
    }

    return result;
}
