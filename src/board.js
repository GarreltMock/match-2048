// Board state management and generation

import {
    createTile,
    createBlockedTile,
    createBlockedWithLifeTile,
    createBlockedMovableTile,
    getTileValue,
    createRectangularBlockedTile,
    createRectangularBlockedWithMergeCount,
    isTilePlusTile,
} from "./tile-helpers.js";
import { parsePresetTile } from "./serializer.js";

function isRectangularBlockConfig(blockedPos) {
    return blockedPos.width !== undefined && blockedPos.height !== undefined;
}

function placeRectangularBlockedTile(game, config) {
    const { row, col, width, height, lifeValue } = config;

    // Validate bounds
    if (row + height > game.boardHeight || col + width > game.boardWidth) {
        console.warn(`Rectangular blocked tile at (${row},${col}) with size ${width}x${height} exceeds board bounds`);
        return;
    }

    // Create single shared tile object
    const rectId = `rect_${row}_${col}_${width}_${height}`;
    const sharedTile =
        lifeValue !== undefined
            ? createRectangularBlockedTile(rectId, { row, col }, width, height, lifeValue)
            : createRectangularBlockedWithMergeCount(rectId, { row, col }, width, height);

    // Place reference in all cells of the rectangle
    for (let r = row; r < row + height; r++) {
        for (let c = col; c < col + width; c++) {
            game.board[r][c] = sharedTile; // All cells point to same object
        }
    }
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
                    game.board[row][col] = createTile(getRandomTileValue(game));
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

        // Place blocked tiles (with or without life, movable or immovable) from blockedTiles config
        if (game.blockedTiles) {
            game.blockedTiles.forEach((blockedPos) => {
                // NEW: Handle rectangular blocks
                if (isRectangularBlockConfig(blockedPos)) {
                    placeRectangularBlockedTile(game, blockedPos);
                    return; // Skip rest of iteration
                }

                // Determine tile creator based on properties
                // movable: true = swappable (BLOCKED_MOVABLE) - can drop and swap
                // movable: false = immovable (blocks gravity)
                // movable: undefined (omitted) = droppable (can fall, cannot swap)
                const movable = blockedPos.movable;
                const immovable = movable === false;

                let tileCreator;
                if (movable === true) {
                    // Movable blocked tile (swappable)
                    tileCreator = createBlockedMovableTile;
                } else if (blockedPos.lifeValue !== undefined) {
                    // Has life value - create blocked with life tile
                    tileCreator = () => createBlockedWithLifeTile(blockedPos.lifeValue, immovable);
                } else {
                    // Regular blocked tile
                    tileCreator = () => createBlockedTile(immovable);
                }

                if (blockedPos.row !== undefined && blockedPos.col !== undefined) {
                    const colArray = Array.isArray(blockedPos.col) ? blockedPos.col : [blockedPos.col];
                    for (const col of colArray) {
                        if (blockedPos.row < game.boardHeight && col < game.boardWidth) {
                            game.board[blockedPos.row][col] = tileCreator();
                        }
                    }
                } else if (blockedPos.row !== undefined && blockedPos.col === undefined) {
                    // Entire row: { row: 2 } or { row: 2, lifeValue: 128 } or { row: 2, movable: true }
                    if (blockedPos.row < game.boardHeight) {
                        for (let col = 0; col < game.boardWidth; col++) {
                            game.board[blockedPos.row][col] = tileCreator();
                        }
                    }
                } else if (blockedPos.col !== undefined && blockedPos.row === undefined) {
                    // Entire column: { col: 3 } or { col: 3, lifeValue: 128 } or { col: 3, movable: true }
                    if (blockedPos.col < game.boardWidth) {
                        for (let row = 0; row < game.boardHeight; row++) {
                            game.board[row][blockedPos.col] = tileCreator();
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

    // Normal match: same value
    if (val1 === val2) return true;

    // Plus tile can match with equal or higher value
    if (isTilePlusTile(tile1) && val2 >= val1) return true;
    if (isTilePlusTile(tile2) && val1 >= val2) return true;

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
