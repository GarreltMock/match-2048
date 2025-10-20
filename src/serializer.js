// Board serialization and deserialization utilities
//
// This module provides utilities to serialize and deserialize game boards.
// It supports both string-based serialization for logging/storage and
// array-based presets for level configuration in config.js.
//
// Example string serialization:
//   "5,3|2,4,B,2G,J|0,2P,BM,B64,2C5|1,1,1,1,1"
//   This represents a 5-wide, 3-high board with various tile types.
//
// Example array preset (as used in config.js):
//   [[2, 4, "B", "2G", "J"], [0, "2P", "BM", "B64", "2C5"], [1, 1, 1, 1, 1]]

import { createTile, createBlockedTile, createBlockedWithLifeTile, createBlockedMovableTile, createJokerTile, createCursedTile, getTileValue, getTileType, isBlocked, isBlockedWithLife, isBlockedMovable, isJoker, isCursed, isTilePowerTile, isTileGoldenTile, isTileFreeSwapTile, isTileStickyFreeSwapTile } from "./tile-helpers.js";
import { TILE_TYPE } from "./config.js";

/**
 * Parse preset tile notation into a tile object
 * @param {string|number} notation - The preset notation:
 *   - Number: normal tile with that value (e.g., 2, 4, 6)
 *   - "B": blocked tile
 *   - "BM": blocked movable tile
 *   - "B64": blocked with life value (e.g., B64 for life=64)
 *   - "J": joker tile
 *   - "2P": power tile with value 2
 *   - "2G": golden tile with value 2
 *   - "2S": free swap tile with value 2
 *   - "2K": sticky free swap tile with value 2
 *   - "2C5": cursed tile with value 2 and 5 moves remaining
 * @returns {object} A tile object
 */
export function parsePresetTile(notation) {
    if (typeof notation === "number") {
        // Just a number - create a normal tile with that value
        return createTile(notation);
    }

    const str = String(notation);

    // Check for blocked tile (just "B")
    if (str === "B") {
        return createBlockedTile();
    }

    // Check for blocked movable tile (just "BM")
    if (str === "BM") {
        return createBlockedMovableTile();
    }

    // Check for joker tile (just "J")
    if (str === "J") {
        return createJokerTile();
    }

    // Parse blocked tile with life value (e.g., "B64" for blocked with 64 life)
    const blockedWithLifeMatch = str.match(/^B(\d+)$/);
    if (blockedWithLifeMatch) {
        const lifeValue = parseInt(blockedWithLifeMatch[1], 10);
        return createBlockedWithLifeTile(lifeValue);
    }

    // Parse cursed tile with value and moves remaining (e.g., "2C5" for value=2, moves=5)
    const cursedMatch = str.match(/^(\d+)C(\d+)$/);
    if (cursedMatch) {
        const value = parseInt(cursedMatch[1], 10);
        const movesRemaining = parseInt(cursedMatch[2], 10);
        return createCursedTile(value, movesRemaining);
    }

    // Parse special tiles with value prefix (e.g., "2P", "2G", "2S", "2K")
    const match = str.match(/^(\d+)([PGSK])$/);
    if (match) {
        const value = parseInt(match[1], 10);
        const type = match[2];

        switch (type) {
            case "P": // Power tile
                return createTile(value, true, false, false, false);
            case "G": // Golden
                return createTile(value, false, true, false, false);
            case "S": // Swap (Free swap)
                return createTile(value, false, false, true, false);
            case "K": // sticKy free swap
                return createTile(value, false, false, false, true);
            default:
                return createTile(value);
        }
    }

    // If we can't parse it, return a normal tile with default value
    console.warn(`Could not parse preset tile notation: ${notation}`);
    return createTile(1);
}

/**
 * Convert a tile object to its notation string
 * @param {object} tile - The tile object
 * @returns {string} The notation string
 */
export function tileToNotation(tile) {
    if (!tile) {
        return "0"; // Empty cell
    }

    const tileType = getTileType(tile);

    // Handle special tile types without values
    if (tileType === TILE_TYPE.BLOCKED) {
        return "B";
    }

    if (tileType === TILE_TYPE.BLOCKED_MOVABLE) {
        return "BM";
    }

    if (tileType === TILE_TYPE.BLOCKED_WITH_LIFE) {
        return `B${tile.lifeValue}`;
    }

    if (tileType === TILE_TYPE.JOKER) {
        return "J";
    }

    // Handle tiles with values
    const value = getTileValue(tile);

    if (tileType === TILE_TYPE.CURSED) {
        const moves = tile.cursedMovesRemaining || 0;
        return `${value}C${moves}`;
    }

    if (tileType === TILE_TYPE.NORMAL) {
        // Check for special normal tile properties
        if (isTilePowerTile(tile)) {
            return `${value}P`;
        }
        if (isTileGoldenTile(tile)) {
            return `${value}G`;
        }
        if (isTileStickyFreeSwapTile(tile)) {
            return `${value}K`;
        }
        if (isTileFreeSwapTile(tile)) {
            return `${value}S`;
        }
        // Regular normal tile
        return String(value);
    }

    // Fallback
    return "0";
}

/**
 * Serialize a 2D board array to a string
 * Format: "width,height|tile1,tile2,...|tile1,tile2,..."
 * @param {Array<Array<object>>} board - The 2D board array
 * @returns {string} Serialized board string
 */
export function serializeBoard(board) {
    if (!board || board.length === 0) {
        return "0,0";
    }

    const height = board.length;
    const width = board[0]?.length || 0;

    const rows = board.map((row) => row.map((tile) => tileToNotation(tile)).join(","));

    return `${width},${height}|${rows.join("|")}`;
}

/**
 * Deserialize a board string to a 2D array
 * @param {string} serialized - The serialized board string
 * @returns {Array<Array<object>>} The 2D board array
 */
export function deserializeBoard(serialized) {
    const parts = serialized.split("|");

    if (parts.length === 0) {
        return [];
    }

    const [width, height] = parts[0].split(",").map((n) => parseInt(n, 10));

    if (parts.length === 1) {
        // No board data, return empty board
        return Array.from({ length: height }, () => Array(width).fill(null));
    }

    const board = [];
    for (let i = 1; i <= height; i++) {
        if (!parts[i]) {
            // Missing row, fill with nulls
            board.push(Array(width).fill(null));
            continue;
        }

        const rowNotations = parts[i].split(",");
        const row = rowNotations.map((notation) => {
            if (notation === "0" || notation === "") {
                return null;
            }
            return parsePresetTile(notation);
        });

        // Ensure row has correct width
        while (row.length < width) {
            row.push(null);
        }

        board.push(row);
    }

    return board;
}

/**
 * Convert a 2D array preset to the same 2D array format with tile objects
 * This is for backward compatibility with existing boardPreset arrays in config.js
 * @param {Array<Array<string|number>>} preset - The preset array
 * @returns {Array<Array<object>>} The board array with tile objects
 */
export function parsePresetArray(preset) {
    if (!preset || !Array.isArray(preset)) {
        return [];
    }

    return preset.map((row) => row.map((notation) => parsePresetTile(notation)));
}
