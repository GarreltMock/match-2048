// Tile object creation and utility functions

import { TILE_TYPE } from "./config.js";

export function createTile(value, isPowerTile = false, isGoldenTile = false, isFreeSwapTile = false, isStickyFreeSwapTile = false) {
    return {
        type: TILE_TYPE.NORMAL,
        value: value,
        isPowerTile: isPowerTile,
        isGoldenTile: isGoldenTile,
        isFreeSwapTile: isFreeSwapTile,
        isStickyFreeSwapTile: isStickyFreeSwapTile,
        hasBeenSwapped: false,
    };
}

export function createBlockedTile() {
    return {
        type: TILE_TYPE.BLOCKED,
        value: null,
        isPowerTile: false,
        isGoldenTile: false,
        isFreeSwapTile: false,
        isStickyFreeSwapTile: false,
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
        hasBeenSwapped: false,
    };
}

export function getTileValue(tile) {
    if (!tile || tile.type !== TILE_TYPE.NORMAL) {
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
