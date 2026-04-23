// User input processing and drag-to-swap mechanics

import {
    getTileValue,
    createTile,
    createJokerTile,
    isBlocked,
    isBlockedWithLife,
    isBlockedMovable,
    isBlockedWithMergeCount,
    isRectangularBlocked,
    isJoker,
    isTileFreeSwapTile,
    isTileStickyFreeSwapTile,
    isTileFreeSwapHorizontalTile,
    isTileFreeSwapVerticalTile,
    isTileHammerTile,
    isTileHalverTile,
    isTileTeleportTile,
    isWildTeleportTile,
    getDisplayValue,
    findBestJokerValue,
    getUniqueTileValues,
} from "./tile-helpers.js";
import { track } from "./tracker.js";
import { getMatchTilesForSwap } from "./hint-system.js";
import {
    isTutorialActive,
    isValidTutorialSwap,
    advanceTutorialStep,
    canDragTileInTutorial,
    isTutorialTapStep,
    isValidTutorialTap,
    isTutorialPowerUpStep,
    isValidTutorialPowerUp,
    isValidTutorialPowerUpTarget,
    updateTutorialUI,
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

function startDrag(game, x, y) {
    if (!game.gameActive) return;

    // Clear hint on user interaction (don't start timer until drag ends)
    game.clearHint();
    game.clearHintTimer();

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

            // Check tutorial validation for power-up usage
            if (isTutorialActive(game) && isTutorialPowerUpStep(game)) {
                // Only allow clicking on the specified tutorial target
                if (!isValidTutorialPowerUpTarget(game, row, col)) {
                    return; // Block usage on wrong tile
                }
            }

            const handled = game.handlePowerUpAction(row, col, element);
            if (handled !== false) {
                // If power-up was used successfully, advance tutorial
                if (isTutorialActive(game) && isTutorialPowerUpStep(game)) {
                    advanceTutorialStep(game);
                }
                return;
            }
            // If handlePowerUpAction returns false (swap case), continue with normal drag
        }

        if (isBlockedWithLife(tile) || isBlockedMovable(tile) || isRectangularBlocked(tile)) {
            return;
        }
        if (isBlocked(tile) && game.activePowerUp !== "swap") {
            return;
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
        game.dragStartTime = performance.now();
        game.lastPreviewTile = null;
        game.wasInAdjacentZone = true;
        element.classList.add("dragging");
        showValidSwapTargets(game, row, col);
    }
}

function updateDrag(game, x, y) {
    if (!game.isDragging || !game.selectedGem) return;

    const element = document.elementFromPoint(x, y);
    if (!element || !element.classList.contains("gem")) return;

    const sourceRow = game.selectedGem.row;
    const sourceCol = game.selectedGem.col;

    // If user drags back to the original tile, cancel the preview
    if (element === game.selectedGem.element) {
        updatePreviewState(game, sourceRow, sourceCol, null, null);
        game.lastPreviewTile = null;
        game.wasInAdjacentZone = true;
        return;
    }

    const targetRow = parseInt(element.dataset.row);
    const targetCol = parseInt(element.dataset.col);

    // Detent: fire once when drag crosses out of the 1-tile radius on a
    // far-swap-capable tile. Teaches the boundary proprioceptively.
    if (isFarSwapCapable(game.selectedGem.tile)) {
        const manhattan = Math.abs(targetRow - sourceRow) + Math.abs(targetCol - sourceCol);
        const inAdjacentZone = manhattan <= 1;
        if (game.wasInAdjacentZone && !inAdjacentZone) {
            triggerDetentPulse(element);
        }
        game.wasInAdjacentZone = inAdjacentZone;
    }

    // Check if gems are adjacent or allowed by extended free swap rules
    if (canPreviewSwap(game, sourceRow, sourceCol, targetRow, targetCol)) {
        const last = game.lastPreviewTile;
        if (!last || last.row !== targetRow || last.col !== targetCol) {
            game.lastPreviewTile = { row: targetRow, col: targetCol };
        }
        updatePreviewState(game, sourceRow, sourceCol, targetRow, targetCol);
    }
}

function isFarSwapCapable(tile) {
    return (
        isTileTeleportTile(tile) ||
        isWildTeleportTile(tile) ||
        isTileFreeSwapTile(tile) ||
        isTileStickyFreeSwapTile(tile) ||
        isTileFreeSwapHorizontalTile(tile) ||
        isTileFreeSwapVerticalTile(tile)
    );
}

function triggerDetentPulse(element) {
    element.classList.remove("detent-crossed");
    void element.offsetWidth; // force reflow to restart animation
    element.classList.add("detent-crossed");
    setTimeout(() => element.classList.remove("detent-crossed"), 260);
}

function endDrag(game) {
    if (!game.isDragging || !game.selectedGem) return;

    const previewGems = document.querySelectorAll(".gem.preview");

    if (previewGems.length > 0) {
        // User dragged to swap
        const targetGem = Array.from(previewGems).find((g) => g !== game.selectedGem.element);
        if (targetGem) {
            let targetRow = parseInt(targetGem.dataset.row);
            let targetCol = parseInt(targetGem.dataset.col);

            // Velocity gate: fast flicks >1 tile away are likely 1-tile overshoots,
            // since users are trained on adjacent-only swaps. Snap to the adjacent
            // tile in the direction of release.
            const sr = game.selectedGem.row;
            const sc = game.selectedGem.col;
            const manhattan = Math.abs(sr - targetRow) + Math.abs(sc - targetCol);
            const duration = performance.now() - (game.dragStartTime ?? 0);
            if (manhattan > 1 && duration < FAST_FLICK_MS) {
                const snapped = snapToAdjacentInDirection(game, sr, sc, targetRow, targetCol);
                if (snapped) {
                    targetRow = snapped.row;
                    targetCol = snapped.col;
                }
            }

            trySwap(game, sr, sc, targetRow, targetCol);
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
        gem.classList.remove(
            "dragging",
            "preview",
            "merge-preview",
            "unblock-preview",
            "swap-dimmed",
            "detent-crossed",
        );
    });

    // Reset hint timer after user interaction completes
    game.resetHintTimer();

    game.selectedGem = null;
    game.isDragging = false;
    game.dragStartPos = null;
    game.dragStartTime = null;
    game.lastPreviewTile = null;
    game.wasInAdjacentZone = true;
}

const FAST_FLICK_MS = 150;

function snapToAdjacentInDirection(game, sr, sc, tr, tc) {
    const dr = tr - sr;
    const dc = tc - sc;
    const useRowAxis = Math.abs(dr) >= Math.abs(dc);
    const adjR = sr + (useRowAxis ? Math.sign(dr) : 0);
    const adjC = sc + (useRowAxis ? 0 : Math.sign(dc));
    if (adjR < 0 || adjR >= game.boardHeight || adjC < 0 || adjC >= game.boardWidth) return null;
    const adjTile = game.board[adjR][adjC];
    if (
        isBlocked(adjTile) ||
        isBlockedWithLife(adjTile) ||
        isBlockedMovable(adjTile) ||
        isRectangularBlocked(adjTile)
    ) {
        return null;
    }
    return { row: adjR, col: adjC };
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

// Single-pass update of all drag-related state classes (preview, merge-preview,
// unblock-preview, swap-dimmed). One DOM traversal keeps class changes atomic
// so the dim transition doesn't visibly stagger across tiles.
// Pass targetRow/targetCol = null to clear preview state (drag active, no target).
function updatePreviewState(game, sourceRow, sourceCol, targetRow, targetCol) {
    const hasTarget = targetRow != null && targetCol != null;

    const previewKeys = new Set();
    let mergeKeys = new Set();
    let unblockKeys = new Set();

    if (hasTarget) {
        previewKeys.add(`${sourceRow},${sourceCol}`);
        previewKeys.add(`${targetRow},${targetCol}`);
        const matchTiles = getMatchTilesForSwap(game, sourceRow, sourceCol, targetRow, targetCol);
        mergeKeys = new Set(matchTiles.map((t) => `${t.row},${t.col}`));
        const blockedToUnblock = getBlockedTilesForMatch(
            game,
            matchTiles,
            sourceRow,
            sourceCol,
            targetRow,
            targetCol,
        );
        unblockKeys = new Set(blockedToUnblock.map((p) => `${p.row},${p.col}`));
    }

    const dimEnabled = !!game.showSwapTargets;
    const gems = document.querySelectorAll(".gem");
    for (const gem of gems) {
        const r = parseInt(gem.dataset.row);
        const c = parseInt(gem.dataset.col);
        if (isNaN(r) || isNaN(c)) continue;
        const key = `${r},${c}`;

        const isPreview = previewKeys.has(key);
        const isMerge = mergeKeys.has(key);
        const isUnblock = unblockKeys.has(key);
        const isSource = r === sourceRow && c === sourceCol;

        gem.classList.toggle("preview", isPreview);
        gem.classList.toggle("merge-preview", isMerge);
        gem.classList.toggle("unblock-preview", isUnblock);

        let shouldDim = false;
        if (dimEnabled && !isPreview && !isMerge && !isUnblock && !isSource) {
            // Dim only tiles that can't be swapped with the source. Don't dim
            // other valid targets during preview — they must stay interactive
            // (free-swap-line tiles need to be reachable via drag).
            shouldDim = !canPreviewSwap(game, sourceRow, sourceCol, r, c);
        }
        gem.classList.toggle("swap-dimmed", shouldDim);
    }
}

function showValidSwapTargets(game, row, col) {
    updatePreviewState(game, row, col, null, null);
}

function canPreviewSwap(game, row1, col1, row2, col2) {
    const tile2 = game.board[row2][col2];
    // Blocked tiles are not valid swap targets (mirrors trySwap's guards).
    // Simple blocked is swappable only with the swap power-up.
    if (isBlockedWithLife(tile2)) return false;
    if (isRectangularBlocked(tile2)) return false;
    if (isBlocked(tile2) && game.activePowerUp !== "swap") return false;

    if (areAdjacent(row1, col1, row2, col2)) {
        return true;
    }

    if (game.activePowerUp === "teleport") {
        return true;
    }

    if (isTeleportSwapAllowed(game, row1, col1, row2, col2)) {
        return true;
    }

    return isExtendedFreeSwapAllowed(game, row1, col1, row2, col2);
}

function isTeleportSwapAllowed(game, row1, col1, row2, col2) {
    const tile1 = game.board[row1][col1];
    const tile2 = game.board[row2][col2];

    // Can't teleport to/from blocked tiles
    if (isBlocked(tile1) || isBlocked(tile2) || isBlockedWithLife(tile1) || isBlockedWithLife(tile2)) {
        return false;
    }

    const isTeleport1 = (isTileTeleportTile(tile1) || isWildTeleportTile(tile1)) && !tile1.hasBeenSwapped;

    return isTeleport1;
}

function isExtendedFreeSwapAllowed(game, row1, col1, row2, col2) {
    if (game.extendedFreeSwap !== true) {
        return false;
    }

    const isHorizontalSwap = row1 === row2;
    const isVerticalSwap = col1 === col2;

    if (!isHorizontalSwap && !isVerticalSwap) {
        return false;
    }

    const tile1 = game.board[row1][col1];

    const isFreeSwap1 = (isTileFreeSwapTile(tile1) || isTileStickyFreeSwapTile(tile1)) && !tile1.hasBeenSwapped;

    const isDirectionalFreeSwap1 =
        !tile1.hasBeenSwapped &&
        ((isTileFreeSwapHorizontalTile(tile1) && isHorizontalSwap) ||
            (isTileFreeSwapVerticalTile(tile1) && isVerticalSwap));

    return isFreeSwap1 || isDirectionalFreeSwap1;
}

function getBlockedTilesForMatch(game, matchTiles, row1, col1, row2, col2) {
    const blockedSet = new Set();
    const result = [];

    for (const tile of matchTiles) {
        // Convert pre-swap to post-swap coordinates
        let checkRow = tile.row;
        let checkCol = tile.col;
        if (tile.row === row1 && tile.col === col1) {
            checkRow = row2;
            checkCol = col2;
        } else if (tile.row === row2 && tile.col === col2) {
            checkRow = row1;
            checkCol = col1;
        }

        const adjacentPositions = [
            { row: checkRow - 1, col: checkCol },
            { row: checkRow + 1, col: checkCol },
            { row: checkRow, col: checkCol - 1 },
            { row: checkRow, col: checkCol + 1 },
        ];

        for (const pos of adjacentPositions) {
            if (pos.row >= 0 && pos.row < game.boardHeight && pos.col >= 0 && pos.col < game.boardWidth) {
                const key = `${pos.row}_${pos.col}`;
                if (!blockedSet.has(key)) {
                    const adjacentTile = game.board[pos.row][pos.col];
                    if (
                        isBlocked(adjacentTile) ||
                        isBlockedWithLife(adjacentTile) ||
                        isBlockedMovable(adjacentTile) ||
                        isBlockedWithMergeCount(adjacentTile)
                    ) {
                        blockedSet.add(key);
                        result.push(pos);
                    }
                }
            }
        }
    }

    return result;
}

/**
 * Execute the board-level swap logic (pure: no DOM, no animation).
 * Mutates game.board and game state flags.
 * @returns {{ valid: boolean, hasMatch: boolean, hasFreeSwap: boolean, hasTeleport: boolean,
 *             isSwapPowerUp: boolean, isTeleportPowerUp: boolean, allowNonMatchingSwap: boolean }}
 *   An invalid or disallowed swap is indicated by `valid: false`.
 */
export function executeSwap(game, row1, col1, row2, col2) {
    const tile1 = game.board[row1][col1];

    const isHorizontalSwap = row1 === row2;
    const isVerticalSwap = col1 === col2;

    const isFreeSwap1 = (isTileFreeSwapTile(tile1) || isTileStickyFreeSwapTile(tile1)) && !tile1.hasBeenSwapped;
    const isDirectionalFreeSwap1 =
        !tile1.hasBeenSwapped &&
        ((isTileFreeSwapHorizontalTile(tile1) && isHorizontalSwap) ||
            (isTileFreeSwapVerticalTile(tile1) && isVerticalSwap));
    const hasFreeSwap = isFreeSwap1 || isDirectionalFreeSwap1;
    const hasTeleport = (isTileTeleportTile(tile1) || isWildTeleportTile(tile1)) && !tile1.hasBeenSwapped;
    const isSwapPowerUp = game.activePowerUp === "swap";
    const isTeleportPowerUp = game.activePowerUp === "teleport";
    const allowNonMatchingSwap = game.allowNonMatchingSwaps === true;

    // Perform the board swap
    const temp = game.board[row1][col1];
    game.board[row1][col1] = game.board[row2][col2];
    game.board[row2][col2] = temp;

    game.lastSwapPosition = { row: row2, col: col2, movedFrom: { row: row1, col: col1 } };
    game.isUserSwap = true;

    const hasMatch = game.hasMatchesForSwap(row1, col1, row2, col2);

    if (hasMatch || isSwapPowerUp || isTeleportPowerUp || hasFreeSwap || hasTeleport || allowNonMatchingSwap) {
        // Count the move
        if (!isSwapPowerUp && !isTeleportPowerUp && !hasFreeSwap && !hasTeleport) {
            game.movesUsed++;
        }

        game.shouldDecrementCursedTimers = true;
        game.cursedTileCreatedThisTurn = {};

        // Mark free swap tile as used (tile1 is now at row2/col2 after swap)
        if (hasFreeSwap) {
            game.board[row2][col2].hasBeenSwapped = true;
        }
        if (hasTeleport) {
            game.board[row2][col2].hasBeenSwapped = true;
        }

        return {
            valid: true,
            hasMatch,
            hasFreeSwap,
            hasTeleport,
            isSwapPowerUp,
            isTeleportPowerUp,
            allowNonMatchingSwap,
        };
    } else {
        // Revert the swap
        game.board[row2][col2] = game.board[row1][col1];
        game.board[row1][col1] = temp;
        game.lastSwapPosition = null;
        game.isUserSwap = false;
        return {
            valid: false,
            hasMatch: false,
            hasFreeSwap,
            hasTeleport,
            isSwapPowerUp,
            isTeleportPowerUp,
            allowNonMatchingSwap,
        };
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

    // Prevent swapping blocked/blocked-with-life tiles unless swap power-up on simple (non-rectangular) blocked
    const isSwapPowerUp = game.activePowerUp === "swap";
    const t1 = game.board[row1][col1];
    const t2 = game.board[row2][col2];
    const t1SimpleBlocked = isBlocked(t1) && !isRectangularBlocked(t1);
    const t2SimpleBlocked = isBlocked(t2) && !isRectangularBlocked(t2);
    if (isBlockedWithLife(t1) || isBlockedWithLife(t2)) return;
    if (isBlocked(t1) && !t1SimpleBlocked) return;
    if (isBlocked(t2) && !t2SimpleBlocked) return;
    if ((t1SimpleBlocked || t2SimpleBlocked) && !isSwapPowerUp) return;

    const isAdjacentSwap = areAdjacent(row1, col1, row2, col2);
    const allowExtendedFreeSwap = !isAdjacentSwap && isExtendedFreeSwapAllowed(game, row1, col1, row2, col2);
    const allowTeleportSwap = !isAdjacentSwap && isTeleportSwapAllowed(game, row1, col1, row2, col2);
    const isPowerUpSwap = !isAdjacentSwap && game.activePowerUp === "teleport";

    if (!isAdjacentSwap && !allowExtendedFreeSwap && !allowTeleportSwap && !isPowerUpSwap) {
        return false;
    }

    // If animating, queue the swap to execute after animation completes
    if (game.animating) {
        game.interruptCascade = true;
        game.pendingSwap = {
            row1,
            col1,
            row2,
            col2,
            tile1: game.board[row1][col1],
            tile2: game.board[row2][col2],
        };

        const gem1 = document.querySelector(`[data-row="${row1}"][data-col="${col1}"]`);
        const gem2 = document.querySelector(`[data-row="${row2}"][data-col="${col2}"]`);
        if (gem1) gem1.classList.add("pending-preview");
        if (gem2) gem2.classList.add("pending-preview");

        return;
    }

    // Execute board-level swap logic
    const result = executeSwap(game, row1, col1, row2, col2);

    if (result.valid) {
        const { hasMatch, hasFreeSwap, hasTeleport, isSwapPowerUp, isTeleportPowerUp, allowNonMatchingSwap } = result;

        game.updateMovesDisplay();

        game.animateSwap(row1, col1, row2, col2, () => {
            game.renderBoard();

            if (isTutorialActive(game)) {
                advanceTutorialStep(game);
            }

            if (isSwapPowerUp) {
                game.consumePowerUp("swap");
                game.updatePowerUpButtons();
                track("power_up_used", {
                    level: game.currentLevel,
                    power_up_type: "swap",
                    remaining_moves: game.maxMoves - game.movesUsed,
                    uses_remaining: game.getTotalPowerUpCount("swap"),
                });
                game.deactivatePowerUp();
            }

            if (isTeleportPowerUp) {
                game.consumePowerUp("teleport");
                game.updatePowerUpButtons();
                track("power_up_used", {
                    level: game.currentLevel,
                    power_up_type: "teleport",
                    remaining_moves: game.maxMoves - game.movesUsed,
                    uses_remaining: game.getTotalPowerUpCount("teleport"),
                });
                game.deactivatePowerUp();
            }

            if (
                !hasMatch &&
                (allowNonMatchingSwap || hasTeleport || isTeleportPowerUp) &&
                !isSwapPowerUp &&
                !hasFreeSwap
            ) {
                game.lastSwapPosition = null;
                game.isUserSwap = false;
            }

            document.querySelectorAll(".gem").forEach((gem) => {
                gem.classList.remove("dragging", "preview", "merge-preview", "unblock-preview");
            });
            game.selectedGem = null;
            game.isDragging = false;
            game.dragStartPos = null;

            game.processMatches();
        });

        return true;
    } else {
        game.animateRevert(row1, col1, row2, col2);
    }
}
