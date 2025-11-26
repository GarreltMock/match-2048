// User input processing and drag-to-swap mechanics

import {
    getTileValue,
    createTile,
    createJokerTile,
    isBlocked,
    isBlockedWithLife,
    isBlockedMovable,
    isJoker,
    isTileFreeSwapTile,
    isTileStickyFreeSwapTile,
    getDisplayValue,
} from "./tile-helpers.js";
import { track } from "./tracker.js";
import { savePowerUpCounts } from "./storage.js";

export function setupEventListeners(game) {
    const gameBoard = document.getElementById("gameBoard");

    // Touch events for mobile
    gameBoard.addEventListener("touchstart", handleTouchStart.bind(game), { passive: false });
    gameBoard.addEventListener("touchmove", handleTouchMove.bind(game), { passive: false });
    gameBoard.addEventListener("touchend", handleTouchEnd.bind(game), { passive: false });

    // Mouse events for desktop
    gameBoard.addEventListener("mousedown", handleMouseDown.bind(game));
    gameBoard.addEventListener("mousemove", handleMouseMove.bind(game));
    gameBoard.addEventListener("mouseup", handleMouseUp.bind(game));
    gameBoard.addEventListener("mouseleave", handleMouseUp.bind(game));
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    startDrag(this, touch.clientX, touch.clientY);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    updateDrag(this, touch.clientX, touch.clientY);
}

function handleTouchEnd(e) {
    e.preventDefault();
    endDrag(this);
}

function handleMouseDown(e) {
    startDrag(this, e.clientX, e.clientY);
}

function handleMouseMove(e) {
    updateDrag(this, e.clientX, e.clientY);
}

function handleMouseUp() {
    endDrag(this);
}

export function getUniqueTileValues(game) {
    // Get all unique tile values on the board (excluding blocked and joker tiles)
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

export function findBestJokerValue(game, jokerRow, jokerCol) {
    // Find the best value to transform the joker into
    // Returns the value if a match is found, null otherwise

    const allValues = getUniqueTileValues(game);

    // Sort from highest to lowest
    allValues.sort((a, b) => b - a);

    // Try each value from highest to lowest
    for (const testValue of allValues) {
        // Temporarily set joker to this value
        game.board[jokerRow][jokerCol] = createTile(testValue);

        // Use existing findMatches to check if this creates a valid match
        const matches = game.findMatches();

        // Check if any match includes our joker position AND has no other jokers
        const validMatch = matches.find((match) => {
            // Check if this match includes our joker position
            const includesJokerPos = match.tiles.some((tile) => tile.row === jokerRow && tile.col === jokerCol);

            if (!includesJokerPos) return false;

            // Check that no other jokers are in this match
            const hasOtherJokers = match.tiles.some((tile) => {
                // Skip the joker we're testing
                if (tile.row === jokerRow && tile.col === jokerCol) return false;
                // Check if this tile is a joker
                return isJoker(game.board[tile.row][tile.col]);
            });

            return !hasOtherJokers;
        });

        if (validMatch) {
            // Found a valid match! Return the value (board is already set)
            return testValue;
        }

        // No match, try next value
        game.board[jokerRow][jokerCol] = createJokerTile();
    }

    // No valid matches found, restore joker
    game.board[jokerRow][jokerCol] = createJokerTile();
    return null;
}

function startDrag(game, x, y) {
    if (!game.gameActive) return;

    const element = document.elementFromPoint(x, y);
    if (element && element.classList.contains("gem")) {
        const row = parseInt(element.dataset.row);
        const col = parseInt(element.dataset.col);
        const tile = game.board[row][col];

        // Handle power-ups (but not during animations)
        if (game.activePowerUp) {
            // Prevent power-up usage during animations
            if (game.animating) return;

            const handled = game.handlePowerUpAction(row, col, element);
            if (handled !== false) {
                return;
            }
            // If handlePowerUpAction returns false (swap case), continue with normal drag
        }
        // Normal drag behavior (including joker)
        game.selectedGem = {
            element: element,
            row: row,
            col: col,
            tile: tile, // Store tile to detect joker taps later
        };
        game.isDragging = true;
        game.dragStartPos = { x, y };
        element.classList.add("dragging");
    }
}

function updateDrag(game, x, y) {
    if (!game.isDragging || !game.selectedGem) return;

    const element = document.elementFromPoint(x, y);
    if (element && element.classList.contains("gem") && element !== game.selectedGem.element) {
        const targetRow = parseInt(element.dataset.row);
        const targetCol = parseInt(element.dataset.col);

        // Check if gems are adjacent
        if (areAdjacent(game.selectedGem.row, game.selectedGem.col, targetRow, targetCol)) {
            previewSwap(game.selectedGem.row, game.selectedGem.col, targetRow, targetCol);
        }
    }
}

function endDrag(game) {
    if (!game.isDragging || !game.selectedGem) return;

    const previewGems = document.querySelectorAll(".gem.preview");

    if (previewGems.length > 0) {
        // User dragged to swap
        const targetGem = Array.from(previewGems).find((g) => g !== game.selectedGem.element);
        if (targetGem) {
            const targetRow = parseInt(targetGem.dataset.row);
            const targetCol = parseInt(targetGem.dataset.col);
            trySwap(game, game.selectedGem.row, game.selectedGem.col, targetRow, targetCol);
        }
    } else if (isJoker(game.selectedGem.tile) && !game.activePowerUp) {
        // User tapped on joker without dragging - try to activate it
        // Only activate if not in power-up mode
        activateJokerByTap(game, game.selectedGem.row, game.selectedGem.col, game.selectedGem.element);
    }

    // Clean up
    document.querySelectorAll(".gem").forEach((gem) => {
        gem.classList.remove("dragging", "preview");
    });

    game.selectedGem = null;
    game.isDragging = false;
    game.dragStartPos = null;
}

function activateJokerByTap(game, row, col, element) {
    // Activate joker when tapped
    const bestValue = findBestJokerValue(game, row, col);

    if (bestValue !== null) {
        // Reset power-up usage flag when user activates joker (counts as user action)
        if (game.onePowerUpPerSwap) {
            game.powerUpUsedSinceLastSwap = false;
            game.updatePowerUpButtons();
        }

        // Transform and animate
        game.animating = true;
        element.style.transform = "scale(1.2)";
        element.textContent = getDisplayValue(bestValue, game.numberBase);
        element.className = `gem tile-${bestValue}`;

        setTimeout(() => {
            element.style.transform = "scale(1)";
            game.board[row][col] = createTile(bestValue); // Update board
            game.renderBoard(); // Re-render to show the updated tile
            setTimeout(() => {
                game.isUserSwap = true; // Treat tap as user action
                game.processMatches();
            }, 200);
        }, 300);
    } else {
        // No valid match found - indicate to user with a shake animation
        element.style.animation = "shake 0.3s";
        setTimeout(() => {
            element.style.animation = "";
        }, 300);
    }
}

function areAdjacent(row1, col1, row2, col2) {
    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

function previewSwap(row1, col1, row2, col2) {
    // Clear previous previews
    document.querySelectorAll(".gem.preview").forEach((gem) => {
        gem.classList.remove("preview");
    });

    // Add preview to both gems
    const gem1 = document.querySelector(`[data-row="${row1}"][data-col="${col1}"]`);
    const gem2 = document.querySelector(`[data-row="${row2}"][data-col="${col2}"]`);

    if (gem1 && gem2) {
        gem1.classList.add("preview");
        gem2.classList.add("preview");
    }
}

export function trySwap(game, row1, col1, row2, col2) {
    if (!game.gameActive) return;

    // Prevent swapping if either tile is blocked or blocked with life
    // BLOCKED_MOVABLE tiles CAN be swapped
    if (
        isBlocked(game.board[row1][col1]) ||
        isBlocked(game.board[row2][col2]) ||
        isBlockedWithLife(game.board[row1][col1]) ||
        isBlockedWithLife(game.board[row2][col2])
    ) {
        return;
    }

    // If animating, queue the swap to execute after animation completes
    if (game.animating) {
        game.interruptCascade = true;
        // Store tile references to validate they haven't changed when executing
        game.pendingSwap = {
            row1,
            col1,
            row2,
            col2,
            tile1: game.board[row1][col1],
            tile2: game.board[row2][col2],
        };

        // Visualize the pending swap with preview class
        const gem1 = document.querySelector(`[data-row="${row1}"][data-col="${col1}"]`);
        const gem2 = document.querySelector(`[data-row="${row2}"][data-col="${col2}"]`);
        if (gem1) gem1.classList.add("pending-preview");
        if (gem2) gem2.classList.add("pending-preview");

        return;
    }

    // Check if either tile is a free swap tile (or sticky free swap) that hasn't been used
    const tile1 = game.board[row1][col1];
    const tile2 = game.board[row2][col2];
    const isFreeSwap1 = (isTileFreeSwapTile(tile1) || isTileStickyFreeSwapTile(tile1)) && !tile1.hasBeenSwapped;
    const isFreeSwap2 = (isTileFreeSwapTile(tile2) || isTileStickyFreeSwapTile(tile2)) && !tile2.hasBeenSwapped;
    const hasFreeSwap = isFreeSwap1 || isFreeSwap2;

    // Temporarily swap gems
    const temp = game.board[row1][col1];
    game.board[row1][col1] = game.board[row2][col2];
    game.board[row2][col2] = temp;

    // Track which tile was moved (the one that changed position)
    game.lastSwapPosition = { row: row2, col: col2, movedFrom: { row: row1, col: col1 } };

    // Mark this as a user swap for match detection
    game.isUserSwap = true;

    // Check if this creates any matches (or if using swap power-up or free swap tile)
    const isSwapPowerUp = game.activePowerUp === "swap";

    if (game.hasMatchesForSwap(row1, col1, row2, col2) || isSwapPowerUp || hasFreeSwap) {
        if (!isSwapPowerUp) {
            game.movesUsed++;
            game.updateMovesDisplay();
        }

        // Reset power-up usage flag when user makes a swap (only if not using swap power-up)
        if (game.onePowerUpPerSwap && !isSwapPowerUp) {
            game.powerUpUsedSinceLastSwap = false;
            game.updatePowerUpButtons();
        }

        // Flag that we should decrement cursed timers after this turn completes
        game.shouldDecrementCursedTimers = true;

        // Reset cursed tile creation flag for frequency:0 goals
        game.cursedTileCreatedThisTurn = {};

        // Mark free swap tile as used
        if (hasFreeSwap) {
            if (isFreeSwap1) {
                game.board[row2][col2].hasBeenSwapped = true;
            }
            if (isFreeSwap2) {
                game.board[row1][col1].hasBeenSwapped = true;
            }
        }

        game.animateSwap(row1, col1, row2, col2, () => {
            game.renderBoard();

            if (isSwapPowerUp) {
                // Decrement remaining count and deactivate power-up after successful swap
                game.powerUpRemaining.swap--;

                // Decrement persistent count (consuming persistent before streak bonuses)
                // Use Math.max to prevent going negative
                game.persistentPowerUpCounts.swap = Math.max(0, game.persistentPowerUpCounts.swap - 1);
                savePowerUpCounts(game.persistentPowerUpCounts);

                // Mark that a power-up was used (swap power-up)
                if (game.onePowerUpPerSwap) {
                    game.powerUpUsedSinceLastSwap = true;
                }

                game.updatePowerUpButtons();

                // Track power-up usage
                track("power_up_used", {
                    level: game.currentLevel,
                    power_up_type: "swap",
                    remaining_moves: game.maxMoves - game.movesUsed,
                    uses_remaining: game.powerUpRemaining.swap,
                });

                game.deactivatePowerUp();
            }

            game.processMatches();
        });

        return true;
    } else {
        // Revert the swap
        game.board[row2][col2] = game.board[row1][col1];
        game.board[row1][col1] = temp;
        game.lastSwapPosition = null;
        game.isUserSwap = false;
        game.animateRevert(row1, col1, row2, col2);
    }
}
