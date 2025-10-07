// Match finding logic for detecting tile matches and special formations

import { getTileValue, isNormal, isJoker, isTileGoldenTile, createTile } from "./tile-helpers.js";
import { canMatch } from "./board.js";
import { findBestJokerValue } from "./input-handler.js";

export function hasMatches(game) {
    return findMatches(game).length > 0;
}

export function findMatches(game) {
    const matchGroups = [];
    const usedTiles = new Set();

    // During user swap, try to activate jokers first
    if (game.isUserSwap) {
        for (let row = 0; row < game.boardHeight; row++) {
            for (let col = 0; col < game.boardWidth; col++) {
                const tile = game.board[row][col];
                if (isJoker(tile)) {
                    const bestValue = findBestJokerValue(game, row, col);
                    if (bestValue !== null) {
                        // Transform joker to the best value
                        game.board[row][col] = createTile(bestValue);
                    }
                }
            }
        }
    }

    // First, collect all regular line matches (horizontal and vertical)
    const allLineMatches = [];

    // Check horizontal matches (track formation types)
    for (let row = 0; row < game.boardHeight; row++) {
        let matchGroup = [];
        let baseValue = null; // The lowest value in the match (for power tiles)
        let hasGoldenTile = false;

        for (let col = 0; col < game.boardWidth; col++) {
            const currentTile = game.board[row][col];
            const currentValue = getTileValue(currentTile);

            if (!isNormal(currentTile)) {
                // End current match
                if (matchGroup.length >= 3) {
                    const formationType =
                        matchGroup.length === 4
                            ? "line_4_horizontal"
                            : matchGroup.length === 5
                            ? "line_5_horizontal"
                            : "horizontal";
                    matchGroups.push({
                        tiles: [...matchGroup],
                        value: baseValue,
                        direction: formationType,
                        hasGoldenTile,
                    });
                }
                matchGroup = [];
                baseValue = null;
                hasGoldenTile = false;
                continue;
            }

            // Check if this tile can be added to the current match
            if (matchGroup.length === 0) {
                // Start new match
                matchGroup.push({ row, col });
                baseValue = currentValue;
                hasGoldenTile = isTileGoldenTile(currentTile);
            } else {
                // Check if current tile matches with the previous tile
                const prevTile = matchGroup[matchGroup.length - 1];
                if (canMatch(currentTile, game.board[prevTile.row][prevTile.col], game)) {
                    matchGroup.push({ row, col });
                    // Update base value to the minimum
                    baseValue = Math.min(baseValue, currentValue);
                    // Track if any tile is golden
                    if (isTileGoldenTile(currentTile)) {
                        hasGoldenTile = true;
                    }
                } else {
                    // End current match and start new one
                    if (matchGroup.length >= 3) {
                        const formationType =
                            matchGroup.length === 4
                                ? "line_4_horizontal"
                                : matchGroup.length === 5
                                ? "line_5_horizontal"
                                : "horizontal";
                        matchGroups.push({
                            tiles: [...matchGroup],
                            value: baseValue,
                            direction: formationType,
                            hasGoldenTile,
                        });
                    }
                    matchGroup = [{ row, col }];
                    baseValue = currentValue;
                    hasGoldenTile = isTileGoldenTile(currentTile);
                }
            }
        }

        // Check remaining match at end of row
        if (matchGroup.length >= 3) {
            const formationType =
                matchGroup.length === 4
                    ? "line_4_horizontal"
                    : matchGroup.length === 5
                    ? "line_5_horizontal"
                    : "horizontal";
            allLineMatches.push({ tiles: matchGroup, value: baseValue, direction: formationType, hasGoldenTile });
        }
    }

    // Check vertical matches (track formation types)
    for (let col = 0; col < game.boardWidth; col++) {
        let matchGroup = [];
        let baseValue = null; // The lowest value in the match (for power tiles)
        let hasGoldenTile = false;

        for (let row = 0; row < game.boardHeight; row++) {
            const currentTile = game.board[row][col];
            const currentValue = getTileValue(currentTile);

            if (!isNormal(currentTile)) {
                // End current match
                if (matchGroup.length >= 3) {
                    const formationType =
                        matchGroup.length === 4
                            ? "line_4_vertical"
                            : matchGroup.length === 5
                            ? "line_5_vertical"
                            : "vertical";
                    matchGroups.push({
                        tiles: [...matchGroup],
                        value: baseValue,
                        direction: formationType,
                        hasGoldenTile,
                    });
                }
                matchGroup = [];
                baseValue = null;
                hasGoldenTile = false;
                continue;
            }

            // Check if this tile can be added to the current match
            if (matchGroup.length === 0) {
                // Start new match
                matchGroup.push({ row, col });
                baseValue = currentValue;
                hasGoldenTile = isTileGoldenTile(currentTile);
            } else {
                // Check if current tile matches with the previous tile
                const prevTile = matchGroup[matchGroup.length - 1];
                if (canMatch(currentTile, game.board[prevTile.row][prevTile.col], game)) {
                    matchGroup.push({ row, col });
                    // Update base value to the minimum
                    baseValue = Math.min(baseValue, currentValue);
                    // Track if any tile is golden
                    if (isTileGoldenTile(currentTile)) {
                        hasGoldenTile = true;
                    }
                } else {
                    // End current match and start new one
                    if (matchGroup.length >= 3) {
                        const formationType =
                            matchGroup.length === 4
                                ? "line_4_vertical"
                                : matchGroup.length === 5
                                ? "line_5_vertical"
                                : "vertical";
                        matchGroups.push({
                            tiles: [...matchGroup],
                            value: baseValue,
                            direction: formationType,
                            hasGoldenTile,
                        });
                    }
                    matchGroup = [{ row, col }];
                    baseValue = currentValue;
                    hasGoldenTile = isTileGoldenTile(currentTile);
                }
            }
        }

        // Check remaining match at end of column
        if (matchGroup.length >= 3) {
            const formationType =
                matchGroup.length === 4
                    ? "line_4_vertical"
                    : matchGroup.length === 5
                    ? "line_5_vertical"
                    : "vertical";
            allLineMatches.push({ tiles: matchGroup, value: baseValue, direction: formationType, hasGoldenTile });
        }
    }

    // Separate line matches by size
    const line5Matches = allLineMatches.filter((m) => m.tiles.length === 5);
    const line4Matches = allLineMatches.filter((m) => m.tiles.length === 4);
    const line3Matches = allLineMatches.filter((m) => m.tiles.length === 3);

    // Get all special formations
    const allSpecialFormations = findAllSpecialFormations(game);
    const tFormations = allSpecialFormations.filter((f) => f.direction === "T-formation");
    const lFormations = allSpecialFormations.filter((f) => f.direction === "L-formation");
    const blockFormations = allSpecialFormations.filter((f) => f.direction === "block_4_formation");

    // Apply matches in priority order: 5-line > T > L > 4-line > Block > 3-line
    const allMatchesByPriority = [
        ...line5Matches,
        ...tFormations,
        ...lFormations,
        ...line4Matches,
        ...blockFormations,
        ...line3Matches,
    ];

    // Add matches that don't overlap with already-used tiles
    for (const match of allMatchesByPriority) {
        const hasOverlap = match.tiles.some((tile) => usedTiles.has(`${tile.row},${tile.col}`));
        if (!hasOverlap) {
            matchGroups.push(match);
            match.tiles.forEach((tile) => {
                usedTiles.add(`${tile.row},${tile.col}`);
            });
        }
    }

    return matchGroups;
}

export function findAllSpecialFormations(game) {
    const allFormations = [];

    // Find all possible formations
    for (let row = 0; row < game.boardHeight; row++) {
        for (let col = 0; col < game.boardWidth; col++) {
            const tile = game.board[row][col];
            if (!isNormal(tile)) continue;
            const value = getTileValue(tile);

            // Check T-formation
            const tFormation = checkTFormation(game, row, col, value);
            if (tFormation) {
                allFormations.push(tFormation);
            }

            // Check L-formation
            const lFormation = checkLFormation(game, row, col, value);
            if (lFormation) {
                allFormations.push(lFormation);
            }

            // Check block formation (4-tile 2x2)
            const blockFormation = checkBlockFormation(game, row, col, value);
            if (blockFormation) {
                allFormations.push(blockFormation);
            }
        }
    }

    return allFormations;
}

export function checkTFormation(game, intersectionRow, intersectionCol, value) {
    // T-formation: 4 different orientations
    // 1. xxx  2.  x   3.  x   4.   x
    //     x      xxx      x       xxx
    //     x       x      xxx       x

    const tFormations = [
        // 1. T pointing down: xxx
        //                      x
        //                      x
        {
            horizontal: [-1, 0, 1], // 3 tiles horizontally through intersection
            vertical: [1, 2], // 2 tiles down from intersection
        },
        // 2. T pointing right: x
        //                      xxx
        //                      x
        {
            vertical: [-1, 0, 1], // 3 tiles vertically through intersection
            horizontal: [1, 2], // 2 tiles right from intersection
        },
        // 3. T pointing up:  x
        //                    x
        //                   xxx
        {
            horizontal: [-1, 0, 1], // 3 tiles horizontally through intersection
            vertical: [-2, -1], // 2 tiles up from intersection
        },
        // 4. T pointing left: x
        //                   xxx
        //                     x
        {
            vertical: [-1, 0, 1], // 3 tiles vertically through intersection
            horizontal: [-2, -1], // 2 tiles left from intersection
        },
    ];

    for (const formation of tFormations) {
        const positions = [];
        let validT = true;
        let hasGoldenTile = false;

        // Check horizontal line (3 tiles including intersection)
        for (const colOffset of formation.horizontal) {
            const row = intersectionRow;
            const col = intersectionCol + colOffset;

            if (
                row < 0 ||
                row >= game.boardHeight ||
                col < 0 ||
                col >= game.boardWidth ||
                !game.board[row] ||
                game.board[row][col] === undefined
            ) {
                validT = false;
                break;
            }
            const tile = game.board[row][col];
            const tileValue = getTileValue(tile);
            if (tileValue !== value) {
                validT = false;
                break;
            }
            if (isTileGoldenTile(tile)) {
                hasGoldenTile = true;
            }
            positions.push({ row: row, col: col });
        }

        if (!validT) continue;

        // Check vertical extension (2 additional tiles)
        for (const rowOffset of formation.vertical) {
            const row = intersectionRow + rowOffset;
            const col = intersectionCol;

            if (
                row < 0 ||
                row >= game.boardHeight ||
                col < 0 ||
                col >= game.boardWidth ||
                !game.board[row] ||
                game.board[row][col] === undefined
            ) {
                validT = false;
                break;
            }
            const tile = game.board[row][col];
            const tileValue = getTileValue(tile);
            if (tileValue !== value) {
                validT = false;
                break;
            }
            if (isTileGoldenTile(tile)) {
                hasGoldenTile = true;
            }
            positions.push({ row: row, col: col });
        }

        if (validT && positions.length === 5) {
            return {
                tiles: positions,
                value: value,
                direction: "T-formation",
                intersection: { row: intersectionRow, col: intersectionCol },
                hasGoldenTile,
            };
        }
    }

    return null;
}

export function checkLFormation(game, cornerRow, cornerCol, value) {
    // L-formation: 3 tiles in one direction + 3 tiles in perpendicular direction with shared corner
    // Check 4 possible L orientations from this corner

    const lShapes = [
        // L pointing right-down:   x
        //                          x
        //                          xxx
        { horizontal: [0, 1, 2], vertical: [0, 1, 2] },

        // L pointing left-down:     x
        //                           x
        //                         xxx
        { horizontal: [0, -1, -2], vertical: [0, 1, 2] },

        // L pointing right-up:   xxx
        //                        x
        //                        x
        { horizontal: [0, 1, 2], vertical: [0, -1, -2] },

        // L pointing left-up:   xxx
        //                         x
        //                         x
        { horizontal: [0, -1, -2], vertical: [0, -1, -2] },
    ];

    for (const shape of lShapes) {
        const positions = [];
        let validL = true;
        let hasGoldenTile = false;

        // Check horizontal part (3 tiles from corner)
        for (const colOffset of shape.horizontal) {
            const col = cornerCol + colOffset;
            const row = cornerRow;

            if (
                col < 0 ||
                col >= game.boardWidth ||
                row < 0 ||
                row >= game.boardHeight ||
                !game.board[row] ||
                game.board[row][col] === undefined
            ) {
                validL = false;
                break;
            }
            const tile = game.board[row][col];
            const tileValue = getTileValue(tile);
            if (tileValue !== value) {
                validL = false;
                break;
            }
            if (isTileGoldenTile(tile)) {
                hasGoldenTile = true;
            }
            positions.push({ row: row, col: col });
        }

        if (!validL) continue;

        // Check vertical part (3 tiles from corner, but corner is already added, so 2 more)
        for (let i = 1; i < shape.vertical.length; i++) {
            const rowOffset = shape.vertical[i];
            const row = cornerRow + rowOffset;
            const col = cornerCol;

            if (
                row < 0 ||
                row >= game.boardHeight ||
                col < 0 ||
                col >= game.boardWidth ||
                !game.board[row] ||
                game.board[row][col] === undefined
            ) {
                validL = false;
                break;
            }
            const tile = game.board[row][col];
            const tileValue = getTileValue(tile);
            if (tileValue !== value) {
                validL = false;
                break;
            }
            if (isTileGoldenTile(tile)) {
                hasGoldenTile = true;
            }
            positions.push({ row: row, col: col });
        }

        if (validL && positions.length === 5) {
            return {
                tiles: positions,
                value: value,
                direction: "L-formation",
                intersection: { row: cornerRow, col: cornerCol },
                hasGoldenTile,
            };
        }
    }

    return null;
}

export function checkBlockFormation(game, topRow, leftCol, value) {
    // Block formation: 2x2 square of same tiles
    // Check if we can form: xx
    //                       xx

    // Check bounds
    if (topRow >= game.boardHeight - 1 || leftCol >= game.boardWidth - 1) {
        return null;
    }

    const positions = [
        { row: topRow, col: leftCol }, // top-left
        { row: topRow, col: leftCol + 1 }, // top-right
        { row: topRow + 1, col: leftCol }, // bottom-left
        { row: topRow + 1, col: leftCol + 1 }, // bottom-right
    ];

    let hasGoldenTile = false;

    // Check if all 4 positions have the same value
    for (const pos of positions) {
        if (pos.row < 0 || pos.row >= game.boardHeight || pos.col < 0 || pos.col >= game.boardWidth) {
            return null; // Out of bounds
        }
        if (!game.board[pos.row] || game.board[pos.row][pos.col] === undefined) {
            return null; // Position doesn't exist
        }
        const tile = game.board[pos.row][pos.col];
        const tileValue = getTileValue(tile);
        if (tileValue !== value) {
            return null; // Doesn't match
        }
        if (isTileGoldenTile(tile)) {
            hasGoldenTile = true;
        }
    }

    return {
        tiles: positions,
        value: value,
        direction: "block_4_formation",
        intersections: [
            { row: topRow, col: leftCol + 1 }, // top-right becomes one merge point
            { row: topRow + 1, col: leftCol }, // bottom-left becomes other merge point
        ],
        hasGoldenTile,
    };
}
