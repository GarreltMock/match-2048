// Tile object creation and utility functions

import { TILE_TYPE } from "./config.js";

const SUPPORTED_NORMAL_SPECIAL_TYPES = new Set([
    "freeswap",
    "sticky_freeswap",
    "freeswap_horizontal",
    "freeswap_vertical",
    "teleport",
    "plus",
]);

/**
 * Create a normal tile with optional special properties
 * @param {number} value - The tile's internal value
 * @param {string|null} specialType - Special tile type: "freeswap", "sticky_freeswap",
 *                                     "freeswap_horizontal", "freeswap_vertical", "teleport", "plus", or null
 * @param {Object} options - Additional options
 * @param {boolean} options.transferStickyFreeSwap - Whether to transfer sticky free swap ability
 * @param {boolean|null} options.isHorizontal - For directional free swaps: true=horizontal, false=vertical, null=use config
 * @returns {Object} The created tile
 */
export function createTile(value, specialType = null, options = {}) {
    const { transferStickyFreeSwap = false, isHorizontal = null } = options;

    // Base tile
    const tile = {
        type: TILE_TYPE.NORMAL,
        value: value,
        specialType: null,
        hasBeenSwapped: false,
    };

    // Apply special type
    if (SUPPORTED_NORMAL_SPECIAL_TYPES.has(specialType)) {
        tile.specialType = specialType;

        // For directional free swaps, override with isHorizontal option if provided
        if ((specialType === "freeswap_horizontal" || specialType === "freeswap_vertical") && isHorizontal !== null) {
            tile.specialType = isHorizontal ? "freeswap_horizontal" : "freeswap_vertical";
        }
    }

    // Transfer sticky free swap ability if requested (for cascading merges)
    if (transferStickyFreeSwap) {
        tile.specialType = "sticky_freeswap";
    }

    return tile;
}

export function createBlockedTile(immovable = true) {
    return {
        type: TILE_TYPE.BLOCKED,
        value: null,
        immovable: immovable,
        specialType: null,
        hasBeenSwapped: false,
    };
}

export function createBlockedWithLifeTile(lifeValue, immovable = true) {
    return {
        type: TILE_TYPE.BLOCKED_WITH_LIFE,
        value: null,
        lifeValue: lifeValue,
        immovable: immovable,
        specialType: null,
        hasBeenSwapped: false,
    };
}

export function createBlockedMovableTile() {
    return {
        type: TILE_TYPE.BLOCKED_MOVABLE,
        value: null,
        specialType: null,
        hasBeenSwapped: false,
    };
}

export function createJokerTile(targetValue = null) {
    return {
        type: TILE_TYPE.JOKER,
        value: null,
        targetValue: targetValue, // The value this joker will become when activated
        specialType: null,
        hasBeenSwapped: false,
    };
}

export function createWildTeleportTile(targetValue = null) {
    return {
        type: TILE_TYPE.JOKER,
        value: null,
        targetValue: targetValue,
        specialType: "wild_teleport",
        hasBeenSwapped: false,
    };
}

export function createCursedTile(value, movesRemaining) {
    return {
        type: TILE_TYPE.CURSED,
        value: value,
        cursedMovesRemaining: movesRemaining,
        createdThisTurn: true, // Skip decrement on the turn this tile was created
        specialType: null,
        hasBeenSwapped: false,
    };
}

export function createRectangularBlockedTile(rectId, anchor, width, height, lifeValue) {
    const baseType = lifeValue !== undefined ? TILE_TYPE.BLOCKED_WITH_LIFE : TILE_TYPE.BLOCKED;

    return {
        type: baseType,
        value: null,
        lifeValue: lifeValue,
        immovable: true, // Rectangular blocks are always immovable

        // Rectangular properties
        isRectangular: true,
        rectId: rectId,
        rectAnchor: anchor,
        rectWidth: width,
        rectHeight: height,

        specialType: null,
        hasBeenSwapped: false,
    };
}

export function createRectangularBlockedWithMergeCount(rectId, anchor, width, height) {
    // Initialize cellMergeCounts dictionary
    const cellMergeCounts = {};
    for (let r = anchor.row; r < anchor.row + height; r++) {
        for (let c = anchor.col; c < anchor.col + width; c++) {
            cellMergeCounts[`${r}_${c}`] = 1; // Each cell needs 1 merge
        }
    }

    return {
        type: TILE_TYPE.BLOCKED, // Use regular BLOCKED type
        value: null,
        immovable: true, // Always immovable

        // Rectangular properties
        isRectangular: true,
        rectId: rectId,
        rectAnchor: anchor,
        rectWidth: width,
        rectHeight: height,

        // Per-cell merge tracking
        cellMergeCounts: cellMergeCounts,

        specialType: null,
        hasBeenSwapped: false,
    };
}

export function getTileValue(tile) {
    if (!tile || (tile.type !== TILE_TYPE.NORMAL && tile.type !== TILE_TYPE.CURSED)) {
        return null;
    }
    return tile.value;
}

export function getTileType(tile) {
    if (!tile) return null;
    return tile.type;
}

export function isBlocked(tile) {
    return tile && tile.type === TILE_TYPE.BLOCKED;
}

export function isBlockedWithLife(tile) {
    return tile && tile.type === TILE_TYPE.BLOCKED_WITH_LIFE;
}

export function isBlockedMovable(tile) {
    return tile && tile.type === TILE_TYPE.BLOCKED_MOVABLE;
}

export function isJoker(tile) {
    return tile && tile.type === TILE_TYPE.JOKER;
}

export function isNormal(tile) {
    return tile && tile.type === TILE_TYPE.NORMAL;
}

export function isTileFreeSwapTile(tile) {
    return tile && tile.type === TILE_TYPE.NORMAL && tile.specialType === "freeswap";
}

export function isTileStickyFreeSwapTile(tile) {
    return tile && tile.type === TILE_TYPE.NORMAL && tile.specialType === "sticky_freeswap";
}

export function isTileFreeSwapHorizontalTile(tile) {
    return tile && tile.type === TILE_TYPE.NORMAL && tile.specialType === "freeswap_horizontal";
}

export function isTileFreeSwapVerticalTile(tile) {
    return tile && tile.type === TILE_TYPE.NORMAL && tile.specialType === "freeswap_vertical";
}

export function isTileTeleportTile(tile) {
    return tile && tile.type === TILE_TYPE.NORMAL && tile.specialType === "teleport";
}

export function isWildTeleportTile(tile) {
    return tile && tile.type === TILE_TYPE.JOKER && tile.specialType === "wild_teleport";
}

export function isTilePlusTile(tile) {
    return tile && tile.type === TILE_TYPE.NORMAL && tile.specialType === "plus";
}

export function isCursed(tile) {
    return tile && tile.type === TILE_TYPE.CURSED;
}

export function isRectangularBlocked(tile) {
    return tile && tile.isRectangular === true;
}

export function isBlockedWithMergeCount(tile) {
    return tile && tile.type === TILE_TYPE.BLOCKED && tile.cellMergeCounts !== undefined;
}

let _displayBase = 2;

export function setDisplayBase(base) {
    _displayBase = base;
}


export function getDisplayValue(internalValue) {
    if (_displayBase === 1) return internalValue;
    return Math.pow(2, internalValue);
}

// Calculate responsive font size based on display value length
export function getFontSize(displayValue) {
    const length = displayValue.toString().length;
    return 50 - Math.max(0, length - 2) * 7;
}

export function getUniqueTileValues(game) {
    const allValues = [];
    for (let r = 0; r < game.boardHeight; r++) {
        for (let c = 0; c < game.boardWidth; c++) {
            const tile = game.board[r][c];
            if (tile && tile.type === "normal") {
                const val = getTileValue(tile);
                if (!allValues.includes(val)) {
                    allValues.push(val);
                }
            }
        }
    }
    return allValues;
}

/**
 * Find the best value for a joker tile to become, based on what creates valid matches.
 * Pure logic: temporarily mutates game.board but restores it before returning.
 */
export function findBestJokerValue(game, jokerRow, jokerCol, requireSwapConnection = false) {
    const originalTile = game.board[jokerRow][jokerCol];

    if (!isJoker(originalTile)) {
        return null;
    }

    const allValues = getUniqueTileValues(game);
    allValues.sort((a, b) => b - a);

    for (const testValue of allValues) {
        game.board[jokerRow][jokerCol] = createTile(testValue);

        const matches = game.findMatches();

        const validMatch = matches.find((match) => {
            const includesJoker = match.tiles.some((tile) => tile.row === jokerRow && tile.col === jokerCol);
            if (!includesJoker) return false;

            if (requireSwapConnection && game.lastSwapPosition) {
                const includesSourceTile = match.tiles.some(
                    (tile) => tile.row === game.lastSwapPosition.row && tile.col === game.lastSwapPosition.col,
                );
                if (!includesSourceTile) return false;
            }

            const hasOtherJokers = match.tiles.some((tile) => {
                if (tile.row === jokerRow && tile.col === jokerCol) return false;
                return isJoker(game.board[tile.row][tile.col]);
            });

            return !hasOtherJokers;
        });

        if (validMatch) {
            game.board[jokerRow][jokerCol] = originalTile;
            return testValue;
        }
    }

    game.board[jokerRow][jokerCol] = originalTile;
    return null;
}
