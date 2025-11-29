/**
 * tutorial.js
 *
 * FTUX (First Time User Experience) tutorial system
 * Guides users through specific swap sequences with animated hand and hint text
 */

/**
 * Initialize tutorial from level config
 * @param {Match3Game} game - Game instance
 */
export function initTutorial(game) {
    const level = game.levelConfig;

    if (!level.tutorialSwaps || level.tutorialSwaps.length === 0) {
        game.tutorialState = null;
        return;
    }

    game.tutorialState = {
        active: true,
        currentStep: 0,
        swaps: level.tutorialSwaps,
    };

    // Create DOM elements if they don't exist
    if (!game.tutorialElements) {
        const overlay = document.getElementById("tutorialOverlay");
        const hand = document.getElementById("tutorialHand");
        const hintBox = document.querySelector(".tutorial-hint-box");
        const hintText = document.getElementById("tutorialHintText");

        game.tutorialElements = {
            overlay,
            hand,
            hintBox,
            hintText,
        };
    }
}

/**
 * Check if tutorial is currently active
 * @param {Match3Game} game - Game instance
 * @returns {boolean} True if tutorial is active
 */
export function isTutorialActive(game) {
    return game.tutorialState && game.tutorialState.active;
}

/**
 * Get the current tutorial swap definition
 * @param {Match3Game} game - Game instance
 * @returns {Object|null} Current swap object or null
 */
export function getCurrentTutorialSwap(game) {
    if (!isTutorialActive(game)) return null;

    const step = game.tutorialState.currentStep;
    return game.tutorialState.swaps[step] || null;
}

/**
 * Check if a swap matches the current tutorial step (bidirectional)
 * @param {Match3Game} game - Game instance
 * @param {number} row1 - First tile row
 * @param {number} col1 - First tile column
 * @param {number} row2 - Second tile row
 * @param {number} col2 - Second tile column
 * @returns {boolean} True if swap is valid for tutorial
 */
export function isValidTutorialSwap(game, row1, col1, row2, col2) {
    const currentSwap = getCurrentTutorialSwap(game);
    if (!currentSwap) return false;

    const from = currentSwap.from;
    const to = currentSwap.to;

    // Check forward direction (from → to)
    const matchesForward = row1 === from.row && col1 === from.col && row2 === to.row && col2 === to.col;

    // Check reverse direction (to → from)
    const matchesReverse = row1 === to.row && col1 === to.col && row2 === from.row && col2 === from.col;

    return matchesForward || matchesReverse;
}

/**
 * Check if the current tutorial step is a tap-only step (from and to are the same)
 * @param {Match3Game} game - Game instance
 * @returns {boolean} True if current step is tap-only
 */
export function isTutorialTapStep(game) {
    const currentSwap = getCurrentTutorialSwap(game);
    if (!currentSwap) return false;

    const from = currentSwap.from;
    const to = currentSwap.to;

    return from.row === to.row && from.col === to.col;
}

/**
 * Check if a tap matches the current tutorial step
 * @param {Match3Game} game - Game instance
 * @param {number} row - Tapped tile row
 * @param {number} col - Tapped tile column
 * @returns {boolean} True if tap is valid for tutorial
 */
export function isValidTutorialTap(game, row, col) {
    const currentSwap = getCurrentTutorialSwap(game);
    if (!currentSwap) return false;

    const from = currentSwap.from;
    return row === from.row && col === from.col;
}

/**
 * Check if a tile can be dragged during tutorial
 * @param {Match3Game} game - Game instance
 * @param {number} row - Tile row
 * @param {number} col - Tile column
 * @returns {boolean} True if tile can be dragged
 */
export function canDragTileInTutorial(game, row, col) {
    if (!isTutorialActive(game)) return true;

    const currentSwap = getCurrentTutorialSwap(game);
    if (!currentSwap) return false;

    const from = currentSwap.from;
    const to = currentSwap.to;

    // Allow dragging if this is one of the tutorial tiles
    return (row === from.row && col === from.col) || (row === to.row && col === to.col);
}

/**
 * Advance to the next tutorial step or complete tutorial
 * @param {Match3Game} game - Game instance
 */
export function advanceTutorialStep(game) {
    if (!isTutorialActive(game)) return;

    game.tutorialState.currentStep++;

    // Check if there are more steps
    if (game.tutorialState.currentStep >= game.tutorialState.swaps.length) {
        completeTutorial(game);
    } else {
        // Update UI for next step
        updateTutorialUI(game);
    }
}

/**
 * Complete tutorial and return to normal gameplay
 * @param {Match3Game} game - Game instance
 */
export function completeTutorial(game) {
    if (!game.tutorialState) return;

    game.tutorialState.active = false;
    hideTutorialUI(game);
}

/**
 * Show tutorial UI with hand animation and hint text
 * @param {Match3Game} game - Game instance
 */
export function showTutorialUI(game) {
    if (!isTutorialActive(game) || !game.tutorialElements) return;

    const { overlay } = game.tutorialElements;
    overlay.classList.remove("hidden");

    // Hide power-ups during tutorial
    const powerUpsContainer = document.getElementById("bottom-container");
    if (powerUpsContainer) {
        powerUpsContainer.style.display = "none";
    }

    updateTutorialUI(game);
}

/**
 * Update tutorial UI for current step
 * @param {Match3Game} game - Game instance
 */
function updateTutorialUI(game) {
    const currentSwap = getCurrentTutorialSwap(game);
    if (!currentSwap) return;

    const { hintText } = game.tutorialElements;

    // Update hint text
    hintText.textContent = currentSwap.text;

    // Update hand animation
    updateTutorialAnimation(game, currentSwap.from, currentSwap.to);
}

/**
 * Hide tutorial UI elements
 * @param {Match3Game} game - Game instance
 */
export function hideTutorialUI(game) {
    if (!game.tutorialElements) return;

    const { overlay, hand } = game.tutorialElements;

    hand.classList.remove("animating");
    overlay.classList.add("hidden");

    // Show power-ups again after tutorial
    const powerUpsContainer = document.getElementById("bottom-container");
    if (powerUpsContainer) {
        powerUpsContainer.style.display = "";
    }
}

/**
 * Position and animate the tutorial hand
 * @param {Match3Game} game - Game instance
 * @param {Object} fromCell - {row, col} starting cell
 * @param {Object} toCell - {row, col} destination cell
 */
function updateTutorialAnimation(game, fromCell, toCell) {
    if (!game.tutorialElements) return;

    const { hand } = game.tutorialElements;

    // Query DOM for cell elements
    const fromElement = document.querySelector(`.gem[data-row="${fromCell.row}"][data-col="${fromCell.col}"]`);
    const toElement = document.querySelector(`.gem[data-row="${toCell.row}"][data-col="${toCell.col}"]`);

    if (!fromElement || !toElement) {
        console.warn("Tutorial: Could not find cell elements", fromCell, toCell);
        return;
    }

    // Get bounding rectangles
    const fromRect = fromElement.getBoundingClientRect();
    const toRect = toElement.getBoundingClientRect();

    // Calculate center positions
    const fromCenterX = fromRect.left + fromRect.width / 2;
    const fromCenterY = fromRect.top + fromRect.height / 2;
    const toCenterX = toRect.left + toRect.width / 2;
    const toCenterY = toRect.top + toRect.height / 2;

    // Calculate delta for animation
    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;

    // Position hand at from cell center (accounting for hand size)
    hand.style.left = `${fromCenterX}px`;
    hand.style.top = `${fromCenterY}px`;
    // hand.style.transform = "translate(-50%, -50%)";

    // Set CSS custom properties for animation
    hand.style.setProperty("--hand-dx", `${dx}px`);
    hand.style.setProperty("--hand-dy", `${dy}px`);

    // Show hand and start animation
    hand.classList.remove("hidden");
    hand.classList.add("animating");
}
