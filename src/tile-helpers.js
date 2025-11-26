// Tile object creation and utility functions

import { TILE_TYPE } from "./config.js";

/**
 * Create a normal tile with optional special properties
 * @param {number} value - The tile's internal value
 * @param {string|null} specialType - Special tile type: "power", "golden", "freeswap", "sticky_freeswap",
 *                                     "freeswap_horizontal", "freeswap_vertical", "hammer", "halver", or null
 * @param {Object} options - Additional options
 * @param {boolean} options.transferStickyFreeSwap - Whether to transfer sticky free swap ability
 * @param {boolean|null} options.isHorizontal - For directional free swaps: true=horizontal, false=vertical, null=use config
 * @returns {Object} The created tile
 */
export function createTile(value, specialType = null, options = {}) {
    const { transferStickyFreeSwap = false, isHorizontal = null } = options;

    // Base tile with all special properties set to false
    const tile = {
        type: TILE_TYPE.NORMAL,
        value: value,
        isPowerTile: false,
        isGoldenTile: false,
        isFreeSwapTile: false,
        isStickyFreeSwapTile: false,
        isFreeSwapHorizontalTile: false,
        isFreeSwapVerticalTile: false,
        isHammerTile: false,
        isHalverTile: false,
        hasBeenSwapped: false,
    };

    // Apply special type
    if (specialType === "power") {
        tile.isPowerTile = true;
    } else if (specialType === "golden") {
        tile.isGoldenTile = true;
    } else if (specialType === "freeswap") {
        tile.isFreeSwapTile = true;
    } else if (specialType === "sticky_freeswap") {
        tile.isStickyFreeSwapTile = true;
    } else if (specialType === "freeswap_horizontal" || specialType === "freeswap_vertical") {
        // For directional free swaps, use isHorizontal option if provided
        if (isHorizontal !== null) {
            tile.isFreeSwapHorizontalTile = isHorizontal;
            tile.isFreeSwapVerticalTile = !isHorizontal;
        }
    } else if (specialType === "hammer") {
        tile.isHammerTile = true;
    } else if (specialType === "halver") {
        tile.isHalverTile = true;
    }

    // Transfer sticky free swap ability if requested (for cascading merges)
    if (transferStickyFreeSwap) {
        tile.isStickyFreeSwapTile = true;
    }

    return tile;
}

export function createBlockedTile() {
    return {
        type: TILE_TYPE.BLOCKED,
        value: null,
        isPowerTile: false,
        isGoldenTile: false,
        isFreeSwapTile: false,
        isStickyFreeSwapTile: false,
        isFreeSwapHorizontalTile: false,
        isFreeSwapVerticalTile: false,
        isHammerTile: false,
        isHalverTile: false,
        hasBeenSwapped: false,
    };
}

export function createBlockedWithLifeTile(lifeValue) {
    return {
        type: TILE_TYPE.BLOCKED_WITH_LIFE,
        value: null,
        lifeValue: lifeValue,
        isPowerTile: false,
        isGoldenTile: false,
        isFreeSwapTile: false,
        isStickyFreeSwapTile: false,
        isFreeSwapHorizontalTile: false,
        isFreeSwapVerticalTile: false,
        isHammerTile: false,
        isHalverTile: false,
        hasBeenSwapped: false,
    };
}

export function createBlockedMovableTile() {
    return {
        type: TILE_TYPE.BLOCKED_MOVABLE,
        value: null,
        isPowerTile: false,
        isGoldenTile: false,
        isFreeSwapTile: false,
        isStickyFreeSwapTile: false,
        isFreeSwapHorizontalTile: false,
        isFreeSwapVerticalTile: false,
        isHammerTile: false,
        isHalverTile: false,
        hasBeenSwapped: false,
    };
}

export function createJokerTile() {
    return {
        type: TILE_TYPE.JOKER,
        value: null,
        isPowerTile: false,
        isGoldenTile: false,
        isFreeSwapTile: false,
        isStickyFreeSwapTile: false,
        isFreeSwapHorizontalTile: false,
        isFreeSwapVerticalTile: false,
        isHammerTile: false,
        isHalverTile: false,
        hasBeenSwapped: false,
    };
}

export function createCursedTile(value, movesRemaining) {
    return {
        type: TILE_TYPE.CURSED,
        value: value,
        cursedMovesRemaining: movesRemaining,
        createdThisTurn: true, // Skip decrement on the turn this tile was created
        isPowerTile: false,
        isGoldenTile: false,
        isFreeSwapTile: false,
        isStickyFreeSwapTile: false,
        isFreeSwapHorizontalTile: false,
        isFreeSwapVerticalTile: false,
        isHammerTile: false,
        isHalverTile: false,
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

export function isTilePowerTile(tile) {
    return tile && tile.type === TILE_TYPE.NORMAL && tile.isPowerTile === true;
}

export function isTileGoldenTile(tile) {
    return tile && tile.type === TILE_TYPE.NORMAL && tile.isGoldenTile === true;
}

export function isTileFreeSwapTile(tile) {
    return tile && tile.type === TILE_TYPE.NORMAL && tile.isFreeSwapTile === true;
}

export function isTileStickyFreeSwapTile(tile) {
    return tile && tile.type === TILE_TYPE.NORMAL && tile.isStickyFreeSwapTile === true;
}

export function isTileFreeSwapHorizontalTile(tile) {
    return tile && tile.type === TILE_TYPE.NORMAL && tile.isFreeSwapHorizontalTile === true;
}

export function isTileFreeSwapVerticalTile(tile) {
    return tile && tile.type === TILE_TYPE.NORMAL && tile.isFreeSwapVerticalTile === true;
}

export function isTileHammerTile(tile) {
    return tile && tile.type === TILE_TYPE.NORMAL && tile.isHammerTile === true;
}

export function isTileHalverTile(tile) {
    return tile && tile.type === TILE_TYPE.NORMAL && tile.isHalverTile === true;
}

export function isCursed(tile) {
    return tile && tile.type === TILE_TYPE.CURSED;
}

// Convert internal value (1, 2, 3...) to display value based on numberBase
export function getDisplayValue(internalValue, numberBase) {
    if (numberBase === 3) {
        // Powers of 3: 3^1=3, 3^2=9, 3^3=27, 3^4=81, etc.
        return Math.pow(3, internalValue);
    } else {
        // Powers of 2: 2^1=2, 2^2=4, 2^3=8, 2^4=16, etc.
        return Math.pow(2, internalValue);
    }
}

// Calculate responsive font size based on display value length
export function getFontSize(displayValue) {
    const length = displayValue.toString().length;
    return 50 - Math.max(0, length - 2) * 7;
}
