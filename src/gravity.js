// Pure gravity logic - no DOM, no animation
// Used by animator.js (visual) and simulation.js (headless)

import { createTile, isBlocked, isBlockedWithLife, isBlockedWithMergeCount, isRectangularBlocked } from "./tile-helpers.js";
import { getRandomTileValue } from "./board.js";

/**
 * Apply gravity to the board: tiles fall down, new tiles spawn at top.
 * Mutates game.board directly.
 * @returns {{ movements: Array<{fromRow, row, col}>, newTiles: Array<{row, col}> }}
 */
export function applyGravity(game) {
    const movements = [];
    const newTiles = [];

    for (let col = 0; col < game.boardWidth; col++) {
        // Step 1: Find immovable blocked tiles in this column
        const immovableBlockerPositions = [];
        const processedRectangles = new Set();

        for (let row = 0; row < game.boardHeight; row++) {
            const tile = game.board[row][col];

            if ((isBlocked(tile) || isBlockedWithLife(tile) || isBlockedWithMergeCount(tile)) && tile.immovable !== false) {
                if (isRectangularBlocked(tile)) {
                    if (!processedRectangles.has(tile.rectId)) {
                        processedRectangles.add(tile.rectId);
                        const { row: anchorRow } = tile.rectAnchor;
                        const { rectHeight } = tile;
                        for (let r = anchorRow; r < anchorRow + rectHeight; r++) {
                            immovableBlockerPositions.push(r);
                        }
                    }
                } else {
                    immovableBlockerPositions.push(row);
                }
            }
        }

        // Step 2: Define sections between immovable blockers
        immovableBlockerPositions.sort((a, b) => a - b);

        const sections = [];
        let currentSectionStart = 0;

        for (const blockerRow of immovableBlockerPositions) {
            if (blockerRow > currentSectionStart) {
                sections.push({ start: currentSectionStart, end: blockerRow - 1 });
            }
            currentSectionStart = blockerRow + 1;
        }

        if (currentSectionStart < game.boardHeight) {
            sections.push({ start: currentSectionStart, end: game.boardHeight - 1 });
        }

        // Step 3: Apply gravity within each section
        let totalEmptySpaces = 0;

        for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
            const section = sections[sectionIndex];
            let writePos = section.end;
            let sectionEmptyCount = 0;

            for (let row = section.end; row >= section.start; row--) {
                const tile = game.board[row][col];

                if (tile === null) {
                    sectionEmptyCount++;
                } else {
                    if (row !== writePos) {
                        movements.push({ fromRow: row, row: writePos, col });
                        game.board[writePos][col] = game.board[row][col];
                        game.board[row][col] = null;
                    }
                    writePos--;
                }
            }

            if (sectionIndex === 0) {
                totalEmptySpaces = sectionEmptyCount;
            }
        }

        // Step 4: Spawn new tiles in topmost section
        if (sections.length > 0 && totalEmptySpaces > 0) {
            const topSection = sections[0];
            for (let i = 0; i < totalEmptySpaces; i++) {
                const spawnRow = topSection.start + i;
                game.board[spawnRow][col] = createTile(getRandomTileValue(game));
                newTiles.push({ row: spawnRow, col });
            }
        }
    }

    return { movements, newTiles };
}
