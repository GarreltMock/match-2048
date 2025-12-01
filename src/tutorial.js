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
 * Check if the current tutorial step is a power-up step
 * @param {Match3Game} game - Game instance
 * @returns {boolean} True if current step is power-up step
 */
export function isTutorialPowerUpStep(game) {
    const currentSwap = getCurrentTutorialSwap(game);
    if (!currentSwap) return false;

    // Check if step has a powerUp property
    return currentSwap.powerUp !== undefined;
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

    // If this is a tap-only step, swapping is not valid
    if (!currentSwap.from || !currentSwap.to) return false;

    const from = currentSwap.from;
    const to = currentSwap.to;

    // Check forward direction (from → to)
    const matchesForward = row1 === from.row && col1 === from.col && row2 === to.row && col2 === to.col;

    // Check reverse direction (to → from)
    const matchesReverse = row1 === to.row && col1 === to.col && row2 === from.row && col2 === from.col;

    return matchesForward || matchesReverse;
}

/**
 * Check if the current tutorial step is a tap-only step
 * @param {Match3Game} game - Game instance
 * @returns {boolean} True if current step is tap-only
 */
export function isTutorialTapStep(game) {
    const currentSwap = getCurrentTutorialSwap(game);
    if (!currentSwap) return false;

    // Check if step has a tap property
    return currentSwap.tap !== undefined;
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

    // Check if step has a tap property
    if (currentSwap.tap) {
        return row === currentSwap.tap.row && col === currentSwap.tap.col;
    }

    return false;
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

    // If this is a power-up step, allow interaction ONLY if power-up is active
    // This allows clicking tiles when power-up is activated
    if (currentSwap.powerUp) {
        // If power-up is active, allow clicking the target tile
        if (game.activePowerUp === currentSwap.powerUp.type) {
            return row === currentSwap.powerUp.target.row && col === currentSwap.powerUp.target.col;
        }
        // Power-up not active yet, don't allow tile interaction
        return false;
    }

    // If this is a tap-only step, allow selecting the tap tile (but not dragging)
    if (currentSwap.tap) {
        return row === currentSwap.tap.row && col === currentSwap.tap.col;
    }

    // For swap steps, allow dragging if this is one of the tutorial tiles
    if (currentSwap.from && currentSwap.to) {
        const from = currentSwap.from;
        const to = currentSwap.to;
        return (row === from.row && col === from.col) || (row === to.row && col === to.col);
    }

    return false;
}

/**
 * Check if the tutorial expects a specific power-up to be activated
 * @param {Match3Game} game - Game instance
 * @param {string} powerUpType - Type of power-up ("hammer", "halve", "swap")
 * @returns {boolean} True if power-up matches tutorial
 */
export function isValidTutorialPowerUp(game, powerUpType) {
    const currentSwap = getCurrentTutorialSwap(game);
    if (!currentSwap) return false;

    if (currentSwap.powerUp) {
        return currentSwap.powerUp.type === powerUpType;
    }

    return false;
}

/**
 * Check if a tile is valid for the current power-up tutorial step
 * @param {Match3Game} game - Game instance
 * @param {number} row - Tile row
 * @param {number} col - Tile column
 * @returns {boolean} True if tile is valid for tutorial power-up
 */
export function isValidTutorialPowerUpTarget(game, row, col) {
    const currentSwap = getCurrentTutorialSwap(game);
    if (!currentSwap || !currentSwap.powerUp) return false;

    const target = currentSwap.powerUp.target;
    return row === target.row && col === target.col;
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
        const currentSwap = getCurrentTutorialSwap(game);
        const isPowerUpTutorial = currentSwap && currentSwap.powerUp;

        // Show/hide power-ups based on next step type
        const powerUpsContainer = document.getElementById("bottom-container");
        if (powerUpsContainer) {
            powerUpsContainer.style.visibility = isPowerUpTutorial ? "" : "hidden";
        }

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

    // Hide power-ups during tutorial UNLESS it's a power-up tutorial step
    const currentSwap = getCurrentTutorialSwap(game);
    const isPowerUpTutorial = currentSwap && currentSwap.powerUp;

    const powerUpsContainer = document.getElementById("bottom-container");
    if (powerUpsContainer && !isPowerUpTutorial) {
        powerUpsContainer.style.visibility = "hidden";
    } else if (powerUpsContainer && isPowerUpTutorial) {
        powerUpsContainer.style.visibility = "";
    }

    updateTutorialUI(game);
}

/**
 * Update tutorial UI for current step
 * @param {Match3Game} game - Game instance
 */
export function updateTutorialUI(game) {
    const currentSwap = getCurrentTutorialSwap(game);
    if (!currentSwap) return;

    const { hintText, hintBox } = game.tutorialElements;

    // Update hint text
    hintText.textContent = currentSwap.text;

    // Position hint box based on step type
    if (currentSwap.powerUp && !game.activePowerUp) {
        // Power-up step BEFORE activation - position above power-ups
        if (hintBox) {
            hintBox.style.bottom = "25vh"; // Above the power-ups
        }
    } else {
        // All other steps - position at bottom
        if (hintBox) {
            hintBox.style.bottom = "4vh";
        }
    }

    // Update hand animation based on step type
    if (currentSwap.powerUp) {
        // Power-up tutorial step - show tap on power-up button, then tap on tile
        updateTutorialPowerUpAnimation(game, currentSwap.powerUp);
    } else if (currentSwap.tap) {
        // Tap-only step
        updateTutorialTapAnimation(game, currentSwap.tap);
    } else if (currentSwap.from && currentSwap.to) {
        // Swap step
        updateTutorialSwapAnimation(game, currentSwap.from, currentSwap.to);
    }
}

/**
 * Hide tutorial UI elements
 * @param {Match3Game} game - Game instance
 */
export function hideTutorialUI(game) {
    if (!game.tutorialElements) return;

    const { overlay, hand } = game.tutorialElements;

    hand.classList.remove("animating-swipe", "animating-tap");
    overlay.classList.add("hidden");

    // Show power-ups again after tutorial
    const powerUpsContainer = document.getElementById("bottom-container");
    if (powerUpsContainer) {
        powerUpsContainer.style.visibility = "";
    }
}

/**
 * Position and animate the tutorial hand for swipe gesture
 * @param {Match3Game} game - Game instance
 * @param {Object} fromCell - {row, col} starting cell
 * @param {Object} toCell - {row, col} destination cell
 */
function updateTutorialSwapAnimation(game, fromCell, toCell) {
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

    // Position hand at from cell center
    hand.style.left = `${fromCenterX}px`;
    hand.style.top = `${fromCenterY}px`;

    // Set CSS custom properties for animation
    hand.style.setProperty("--hand-dx", `${dx}px`);
    hand.style.setProperty("--hand-dy", `${dy}px`);

    // Remove tap animation and add swipe animation
    hand.classList.remove("hidden", "animating-tap");
    hand.classList.add("animating-swipe");
}

/**
 * Position and animate the tutorial hand for tap gesture
 * @param {Match3Game} game - Game instance
 * @param {Object} tapCell - {row, col} cell to tap
 */
function updateTutorialTapAnimation(game, tapCell) {
    if (!game.tutorialElements) return;

    const { hand } = game.tutorialElements;

    // Query DOM for cell element
    const tapElement = document.querySelector(`.gem[data-row="${tapCell.row}"][data-col="${tapCell.col}"]`);

    if (!tapElement) {
        console.warn("Tutorial: Could not find tap cell element", tapCell);
        return;
    }

    // Get bounding rectangle
    const tapRect = tapElement.getBoundingClientRect();

    // Calculate center position
    const centerX = tapRect.left + tapRect.width / 2;
    const centerY = tapRect.top + tapRect.height / 2;

    // Position hand at cell center
    hand.style.left = `${centerX}px`;
    hand.style.top = `${centerY}px`;

    // Remove swipe animation and add tap animation
    hand.classList.remove("hidden", "animating-swipe");
    hand.classList.add("animating-tap");
}

/**
 * Position and animate the tutorial hand for power-up usage
 * @param {Match3Game} game - Game instance
 * @param {Object} powerUpConfig - {type: "hammer"|"halve"|"swap", target: {row, col}}
 */
function updateTutorialPowerUpAnimation(game, powerUpConfig) {
    if (!game.tutorialElements) return;

    const { hand } = game.tutorialElements;

    // If power-up is not active, show hand on power-up button
    if (!game.activePowerUp || game.activePowerUp !== powerUpConfig.type) {
        const powerUpButton = document.querySelector(`[data-powerup="${powerUpConfig.type}"]`);

        if (!powerUpButton) {
            console.warn("Tutorial: Could not find power-up button", powerUpConfig.type);
            return;
        }

        // Get bounding rectangle
        const buttonRect = powerUpButton.getBoundingClientRect();

        // Calculate center position
        const centerX = buttonRect.left + buttonRect.width / 2;
        const centerY = buttonRect.top + buttonRect.height / 2;

        // Position hand at button center
        hand.style.left = `${centerX}px`;
        hand.style.top = `${centerY}px`;

        // Add tap animation
        hand.classList.remove("hidden", "animating-swipe");
        hand.classList.add("animating-tap");
    } else {
        // Power-up is active, show hand on target tile
        const targetElement = document.querySelector(
            `.gem[data-row="${powerUpConfig.target.row}"][data-col="${powerUpConfig.target.col}"]`
        );

        if (!targetElement) {
            console.warn("Tutorial: Could not find target tile element", powerUpConfig.target);
            return;
        }

        // Get bounding rectangle
        const targetRect = targetElement.getBoundingClientRect();

        // Calculate center position
        const centerX = targetRect.left + targetRect.width / 2;
        const centerY = targetRect.top + targetRect.height / 2;

        // Position hand at tile center
        hand.style.left = `${centerX}px`;
        hand.style.top = `${centerY}px`;

        // Add tap animation
        hand.classList.remove("hidden", "animating-swipe");
        hand.classList.add("animating-tap");
    }
}
