// Board state management and generation

import { createTile, createBlockedTile, createJokerTile, getTileValue } from "./tile-helpers.js";

/**
 * Parse preset tile notation into a tile object
 * @param {string|number} notation - The preset notation (e.g., "2B", "2G", "2S", "B", "J", or just a number)
 * @returns {object} A tile object
 */
function parsePresetTile(notation) {
    if (typeof notation === 'number') {
        // Just a number - create a normal tile with that value
        return createTile(notation);
    }

    const str = String(notation);

    // Check for blocked tile (just "B")
    if (str === 'B') {
        return createBlockedTile();
    }

    // Check for joker tile (just "J")
    if (str === 'J') {
        return createJokerTile();
    }

    // Parse special tiles with value prefix (e.g., "2B", "2G", "2S")
    const match = str.match(/^(\d+)([BGSP])$/);
    if (match) {
        const value = parseInt(match[1], 10);
        const type = match[2];

        switch (type) {
            case 'B': // Bonus (Power tile)
                return createTile(value, true, false, false);
            case 'G': // Golden
                return createTile(value, false, true, false);
            case 'S': // Swap (Free swap)
                return createTile(value, false, false, true);
            default:
                return createTile(value);
        }
    }

    // If we can't parse it, return a normal tile with default value
    console.warn(`Could not parse preset tile notation: ${notation}`);
    return createTile(1);
}

export function createBoard(game) {
    game.board = [];

    // Check if there's a boardPreset in the level config
    const levelConfig = game.levelConfig || {};
    const boardPreset = levelConfig.boardPreset;

    if (boardPreset && Array.isArray(boardPreset)) {
        // Use the preset board configuration
        for (let row = 0; row < game.boardHeight; row++) {
            game.board[row] = [];
            for (let col = 0; col < game.boardWidth; col++) {
                if (boardPreset[row] && boardPreset[row][col] !== undefined) {
                    // Use preset tile
                    game.board[row][col] = parsePresetTile(boardPreset[row][col]);
                } else {
                    // Fill with random tile if preset doesn't cover this position
                    do {
                        game.board[row][col] = createTile(getRandomTileValue(game));
                    } while (hasInitialMatch(game, row, col));
                }
            }
        }
    } else {
        // Generate random board as before
        for (let row = 0; row < game.boardHeight; row++) {
            game.board[row] = [];
            for (let col = 0; col < game.boardWidth; col++) {
                do {
                    game.board[row][col] = createTile(getRandomTileValue(game));
                } while (hasInitialMatch(game, row, col));
            }
        }

        // Place blocked tiles from blockedTiles config
        if (game.blockedTiles) {
            game.blockedTiles.forEach((blockedPos) => {
                if (blockedPos.row !== undefined && blockedPos.col !== undefined) {
                    const colArray = Array.isArray(blockedPos.col) ? blockedPos.col : [blockedPos.col];
                    for (const col of colArray) {
                        if (blockedPos.row < game.boardHeight && col < game.boardWidth) {
                            game.board[blockedPos.row][col] = createBlockedTile();
                        }
                    }
                } else if (blockedPos.row !== undefined && blockedPos.col === undefined) {
                    // Entire row: { row: 2 }
                    if (blockedPos.row < game.boardHeight) {
                        for (let col = 0; col < game.boardWidth; col++) {
                            game.board[blockedPos.row][col] = createBlockedTile();
                        }
                    }
                } else if (blockedPos.col !== undefined && blockedPos.row === undefined) {
                    // Entire column: { col: 3 }
                    if (blockedPos.col < game.boardWidth) {
                        for (let row = 0; row < game.boardHeight; row++) {
                            game.board[row][blockedPos.col] = createBlockedTile();
                        }
                    }
                }
            });
        }
    }
}

export function getRandomTileValue(game) {
    return game.tileValues[Math.floor(Math.random() * game.tileValues.length)];
}

export function canMatch(tile1, tile2, game) {
    // Helper function to check if two tiles can match
    const val1 = getTileValue(tile1);
    const val2 = getTileValue(tile2);

    if (val1 === val2) return true;

    // Check if either tile is a power tile
    const isPower1 = tile1 && tile1.isPowerTile === true;
    const isPower2 = tile2 && tile2.isPowerTile === true;

    // Power tile matches with its value or higher
    if (isPower1 && val2 >= val1) return true;
    if (isPower2 && val1 >= val2) return true;

    return false;
}

function hasInitialMatch(game, row, col) {
    const tile = game.board[row][col];
    const value = getTileValue(tile);

    // Check horizontal matches
    if (col >= 2 && game.board[row][col - 1] && game.board[row][col - 2]) {
        const val1 = getTileValue(game.board[row][col - 1]);
        const val2 = getTileValue(game.board[row][col - 2]);
        if (value === val1 && value === val2) {
            return true;
        }
    }

    // Check vertical matches
    if (row >= 2 && game.board[row - 1][col] && game.board[row - 2][col]) {
        const val1 = getTileValue(game.board[row - 1][col]);
        const val2 = getTileValue(game.board[row - 2][col]);
        if (value === val1 && value === val2) {
            return true;
        }
    }

    // Check special formations that could be created by placing this tile
    // Note: These will be imported from match-detector.js in the game
    // For now, we'll do a simplified check

    // We need access to checkTFormation, checkLFormation, checkBlockFormation
    // These will be checked by the game instance
    if (game.checkTFormation && game.checkTFormation(row, col, value)) {
        return true;
    }

    if (game.checkLFormation && game.checkLFormation(row, col, value)) {
        return true;
    }

    // Check if this position completes a block formation (check all possible 2x2 blocks this tile could be part of)
    const blockPositions = [
        [row - 1, col - 1], // This tile is bottom-right of block
        [row - 1, col], // This tile is bottom-left of block
        [row, col - 1], // This tile is top-right of block
        [row, col], // This tile is top-left of block
    ];

    for (const [blockRow, blockCol] of blockPositions) {
        if (game.checkBlockFormation && game.checkBlockFormation(blockRow, blockCol, value)) {
            return true;
        }
    }

    return false;
}
