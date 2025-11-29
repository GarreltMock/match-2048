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
    isTileFreeSwapHorizontalTile,
    isTileFreeSwapVerticalTile,
    isTileHammerTile,
    isTileHalverTile,
    getDisplayValue,
} from "./tile-helpers.js";
import { track } from "./tracker.js";
import { savePowerUpCounts } from "./storage.js";
import {
    isTutorialActive,
    isValidTutorialSwap,
    advanceTutorialStep,
    canDragTileInTutorial,
    isTutorialTapStep,
    isValidTutorialTap
} from "./tutorial.js";

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

export function findBestJokerValue(game, jokerRow, jokerCol, requireSwapConnection = false) {
    // Find the best value to transform the joker into
    // Returns the value if a match is found, null otherwise
    // If requireSwapConnection is true, only returns values that create matches involving swapped tiles

    // Store the original tile to restore it properly
    const originalTile = game.board[jokerRow][jokerCol];

    // If it's not actually a joker, return null
    if (!isJoker(originalTile)) {
        return null;
    }

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
            const includesJoker = match.tiles.some((tile) => tile.row === jokerRow && tile.col === jokerCol);

            if (!includesJoker) return false;

            // Optional: check if match includes at least one of the swapped tiles
            if (requireSwapConnection && game.lastSwapPosition) {
                const includesSwappedTile = match.tiles.some((tile) =>
                    (tile.row === game.lastSwapPosition.row && tile.col === game.lastSwapPosition.col) ||
                    (game.lastSwapPosition.movedFrom &&
                        tile.row === game.lastSwapPosition.movedFrom.row &&
                        tile.col === game.lastSwapPosition.movedFrom.col)
                );

                if (!includesSwappedTile) return false;
            }

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
            // Found a valid match! Restore the original joker and return the value
            game.board[jokerRow][jokerCol] = originalTile;
            return testValue;
        }
    }

    // No valid matches found, restore original joker tile
    game.board[jokerRow][jokerCol] = originalTile;
    return null;
}

function startDrag(game, x, y) {
    if (!game.gameActive) return;

    const element = document.elementFromPoint(x, y);
    if (element && element.classList.contains("gem")) {
        const row = parseInt(element.dataset.row);
        const col = parseInt(element.dataset.col);
        const tile = game.board[row][col];

        // Block dragging tiles during tutorial if not part of the tutorial step
        if (isTutorialActive(game) && !canDragTileInTutorial(game, row, col)) {
            return;
        }

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

        // Check if this is a valid tutorial tap
        if (isTutorialActive(game) && isTutorialTapStep(game)) {
            if (isValidTutorialTap(game, game.selectedGem.row, game.selectedGem.col)) {
                activateJokerByTap(game, game.selectedGem.row, game.selectedGem.col, game.selectedGem.element);
                // Note: Tutorial progression is handled in the joker activation callback
            }
        } else if (!isTutorialActive(game)) {
            activateJokerByTap(game, game.selectedGem.row, game.selectedGem.col, game.selectedGem.element);
        }
    } else if (isTileHammerTile(game.selectedGem.tile) && !game.activePowerUp) {
        // User tapped on hammer tile without dragging - activate it
        // Only activate if not in power-up mode
        activateHammerTileByTap(game, game.selectedGem.row, game.selectedGem.col, game.selectedGem.element);
    } else if (isTileHalverTile(game.selectedGem.tile) && !game.activePowerUp) {
        // User tapped on halver tile without dragging - activate it
        // Only activate if not in power-up mode
        activateHalverTileByTap(game, game.selectedGem.row, game.selectedGem.col, game.selectedGem.element);
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
        // Transform and animate
        game.animating = true;
        element.style.transform = "scale(1.2)";
        element.textContent = getDisplayValue(bestValue);
        element.className = `gem tile-${bestValue}`;

        setTimeout(() => {
            element.style.transform = "scale(1)";
            game.board[row][col] = createTile(bestValue); // Update board

            // Set lastSwapPosition to the joker position so other jokers connected to this one can activate
            game.lastSwapPosition = { row, col, movedFrom: { row, col } };

            game.renderBoard(); // Re-render to show the updated tile

            // Progress tutorial if this was a tap-only tutorial step
            if (isTutorialActive(game) && isTutorialTapStep(game)) {
                advanceTutorialStep(game);
            }

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

function activateHammerTileByTap(game, row, col, element) {
    // Activate hammer tile when tapped - removes the tile

    // Animate removal
    game.animating = true;
    element.style.transform = "scale(0.5)";
    element.style.opacity = "0";

    setTimeout(() => {
        // Remove the tile from the board
        game.board[row][col] = null;
        game.renderBoard();

        // Decrement moves
        game.currentMoves--;
        game.updateMovesDisplay();

        setTimeout(() => {
            // Drop tiles and process matches
            game.isUserSwap = true;
            game.dropGems();
        }, 200);
    }, 300);
}

function activateHalverTileByTap(game, row, col, element) {
    // Activate halver tile when tapped - halves the tile's value
    const currentValue = getTileValue(game.board[row][col]);

    // Can only halve if value is greater than 1
    if (currentValue <= 1) {
        // Cannot halve further - show shake animation
        element.style.animation = "shake 0.3s";
        setTimeout(() => {
            element.style.animation = "";
        }, 300);
        return;
    }

    // Calculate new value (halve it)
    const newValue = currentValue - 1; // Internal value decreased by 1 (which halves the display value)

    // Animate the change
    game.animating = true;
    element.style.transform = "scale(1.2)";

    setTimeout(() => {
        element.style.transform = "scale(1)";
        // Update the tile to regular tile with new value (no longer a halver tile)
        game.board[row][col] = createTile(newValue);
        game.renderBoard();

        // Decrement moves
        game.currentMoves--;
        game.updateMovesDisplay();

        setTimeout(() => {
            // Process any matches that may have been created
            game.isUserSwap = true;
            game.processMatches();
        }, 200);
    }, 300);
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

    // Tutorial validation - only allow defined swaps during tutorial
    if (isTutorialActive(game)) {
        if (!isValidTutorialSwap(game, row1, col1, row2, col2)) {
            game.animateRevert(row1, col1, row2, col2);
            return false;
        }
    }

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

    // Determine if this swap is horizontal or vertical
    const isHorizontalSwap = (row1 === row2); // Same row means horizontal swap
    const isVerticalSwap = (col1 === col2); // Same column means vertical swap

    // Check for regular free swap tiles
    const isFreeSwap1 = (isTileFreeSwapTile(tile1) || isTileStickyFreeSwapTile(tile1)) && !tile1.hasBeenSwapped;
    const isFreeSwap2 = (isTileFreeSwapTile(tile2) || isTileStickyFreeSwapTile(tile2)) && !tile2.hasBeenSwapped;

    // Check for directional free swap tiles and validate direction
    const isDirectionalFreeSwap1 = !tile1.hasBeenSwapped && (
        (isTileFreeSwapHorizontalTile(tile1) && isHorizontalSwap) ||
        (isTileFreeSwapVerticalTile(tile1) && isVerticalSwap)
    );
    const isDirectionalFreeSwap2 = !tile2.hasBeenSwapped && (
        (isTileFreeSwapHorizontalTile(tile2) && isHorizontalSwap) ||
        (isTileFreeSwapVerticalTile(tile2) && isVerticalSwap)
    );

    const hasFreeSwap = isFreeSwap1 || isFreeSwap2 || isDirectionalFreeSwap1 || isDirectionalFreeSwap2;

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

        // Flag that we should decrement cursed timers after this turn completes
        game.shouldDecrementCursedTimers = true;

        // Reset cursed tile creation flag for frequency:0 goals
        game.cursedTileCreatedThisTurn = {};

        // Mark free swap tile as used
        if (hasFreeSwap) {
            if (isFreeSwap1 || isDirectionalFreeSwap1) {
                game.board[row2][col2].hasBeenSwapped = true;
            }
            if (isFreeSwap2 || isDirectionalFreeSwap2) {
                game.board[row1][col1].hasBeenSwapped = true;
            }
        }

        game.animateSwap(row1, col1, row2, col2, () => {
            game.renderBoard();

            // Progress tutorial if active
            if (isTutorialActive(game)) {
                advanceTutorialStep(game);
            }

            if (isSwapPowerUp) {
                // Decrement remaining count and deactivate power-up after successful swap
                game.powerUpRemaining.swap--;

                // Consumption priority: extra moves bonus > streak bonus > persistent count
                // Only decrement persistent count if we're consuming from it
                if (game.extraMovesPowerUpCounts.swap > 0) {
                    // Consume extra moves bonus first
                    game.extraMovesPowerUpCounts.swap--;
                } else if (game.powerUpRemaining.swap < game.persistentPowerUpCounts.swap) {
                    // We're consuming from persistent count (streak is gone)
                    game.persistentPowerUpCounts.swap = Math.max(0, game.persistentPowerUpCounts.swap - 1);
                    savePowerUpCounts(game.persistentPowerUpCounts);
                }
                // Otherwise we're consuming a streak bonus (which is temporary and not persisted)

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
