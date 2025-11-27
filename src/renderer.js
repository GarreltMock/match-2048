// DOM rendering and display updates

import {
    getTileValue,
    isBlocked,
    isBlockedWithLife,
    isBlockedMovable,
    isJoker,
    isCursed,
    isNormal,
    isTilePowerTile,
    isTileGoldenTile,
    isTileFreeSwapTile,
    isTileStickyFreeSwapTile,
    isTileFreeSwapHorizontalTile,
    isTileFreeSwapVerticalTile,
    isTileHammerTile,
    isTileHalverTile,
    getDisplayValue,
    getFontSize,
    isRectangularBlocked,
} from "./tile-helpers.js";
import { saveScore } from "./storage.js";
import { SUPER_STREAK_THRESHOLD, TILE_TYPE } from "./config.js";
import { findBestJokerValue } from "./input-handler.js";

// Helper function to update target values for all joker tiles
function updateJokerTargetValues(game) {
    for (let row = 0; row < game.boardHeight; row++) {
        for (let col = 0; col < game.boardWidth; col++) {
            const tile = game.board[row][col];
            if (isJoker(tile)) {
                // Calculate what value this joker would become if activated
                const targetValue = findBestJokerValue(game, row, col);
                tile.targetValue = targetValue;
            }
        }
    }
}

function createRectangularBlockedElement(tile) {
    const gem = document.createElement("div");

    // Set data attributes for identification
    gem.dataset.rectId = tile.rectId;
    gem.dataset.row = tile.rectAnchor.row;
    gem.dataset.col = tile.rectAnchor.col;
    gem.dataset.rectWidth = tile.rectWidth;
    gem.dataset.rectHeight = tile.rectHeight;

    // CSS Grid positioning (1-indexed)
    const gridRowStart = tile.rectAnchor.row + 1;
    const gridRowEnd = gridRowStart + tile.rectHeight;
    const gridColStart = tile.rectAnchor.col + 1;
    const gridColEnd = gridColStart + tile.rectWidth;

    gem.style.gridRow = `${gridRowStart} / ${gridRowEnd}`;
    gem.style.gridColumn = `${gridColStart} / ${gridColEnd}`;

    // Apply appropriate class
    if (tile.type === TILE_TYPE.BLOCKED_WITH_LIFE) {
        gem.className = `gem tile-BLOCKED_WITH_LIFE rectangular-blocked`;
        gem.dataset.life = tile.lifeValue;
    } else {
        gem.className = `gem tile-BLOCKED rectangular-blocked`;
    }

    return gem;
}

export function renderBoard(game) {
    const gameBoard = document.getElementById("gameBoard");
    gameBoard.innerHTML = "";

    // Update CSS grid template to match current board size
    gameBoard.style.gridTemplateColumns = `repeat(${game.boardWidth}, 1fr)`;
    gameBoard.style.gridTemplateRows = `repeat(${game.boardHeight}, 1fr)`;

    // Calculate width based on board aspect ratio to fit within 50vh height
    // Use visualViewport for zoom-independent dimensions
    const viewport = window.visualViewport || window;
    const aspectRatio = game.boardWidth / game.boardHeight;
    const maxHeight = viewport.height * 0.5; // 50vh of actual visible viewport
    const padding = 30; // Approximate padding from CSS clamp(6px, 3vw, 15px) * 2
    const maxContentHeight = maxHeight - padding;
    const calculatedWidth = maxContentHeight * aspectRatio + padding;
    const maxWidth = Math.min(calculatedWidth, viewport.width * 0.9, 550);

    gameBoard.style.width = `${maxWidth}px`;

    // Update target values for all joker tiles before rendering
    updateJokerTargetValues(game);

    // Track which rectangular blocks have been rendered
    const renderedRectangles = new Set();

    for (let row = 0; row < game.boardHeight; row++) {
        for (let col = 0; col < game.boardWidth; col++) {
            const tile = game.board[row][col];

            // NEW: Handle rectangular blocked tiles
            if (isRectangularBlocked(tile)) {
                // Only render once per rectangle
                if (renderedRectangles.has(tile.rectId)) {
                    continue; // Skip other cells of this rectangle
                }
                renderedRectangles.add(tile.rectId);

                const gem = createRectangularBlockedElement(tile);
                gameBoard.appendChild(gem);
                continue;
            }

            // EXISTING: Regular tile rendering
            const gem = document.createElement("div");
            gem.dataset.row = row;
            gem.dataset.col = col;

            // Set CSS class based on tile type
            if (isBlocked(tile)) {
                gem.className = `gem tile-BLOCKED`;
            } else if (isBlockedWithLife(tile)) {
                gem.className = `gem tile-BLOCKED_WITH_LIFE`;
                gem.dataset.life = tile.lifeValue;
            } else if (isBlockedMovable(tile)) {
                gem.className = `gem tile-BLOCKED_MOVABLE`;
            } else if (isJoker(tile)) {
                gem.className = `gem tile-JOKER`;

                // Calculate what value this joker would become
                let targetValueDisplay = "";
                if (tile.targetValue !== null && tile.targetValue !== undefined) {
                    const displayValue = getDisplayValue(tile.targetValue);
                    const fontSize = getFontSize(displayValue);
                    targetValueDisplay = `<span style="font-size: ${
                        fontSize * 0.7
                    }cqw;" class="preview-value">${displayValue}</span>`;
                }

                gem.innerHTML = `
                    <span class="star-value" style="">*</span>
                    ${targetValueDisplay}
                `;
                gem.classList.add("joker-tile");
            } else if (isCursed(tile)) {
                const value = getTileValue(tile);
                gem.className = `gem tile-${value} cursed-tile`;

                const displayValue = getDisplayValue(value);
                gem.innerHTML = `<span style="font-size: ${getFontSize(displayValue)}cqw">${displayValue}</span>`;

                gem.dataset.cursedMoves = tile.cursedMovesRemaining;
            } else if (isNormal(tile)) {
                const value = getTileValue(tile);
                gem.className = `gem tile-${value}`;

                const displayValue = getDisplayValue(value);
                gem.innerHTML = `<span style="font-size: ${getFontSize(displayValue)}cqw">${displayValue}</span>`;

                // Add power-tile class if this is a power tile
                if (isTilePowerTile(tile)) {
                    gem.classList.add("power-tile");
                }

                // Add golden-tile class if this is a golden tile
                if (isTileGoldenTile(tile)) {
                    gem.classList.add("golden-tile");
                }

                // Add freeswap-tile class if this is a free swap tile that hasn't been used
                if (isTileFreeSwapTile(tile) && !tile.hasBeenSwapped) {
                    gem.classList.add("freeswap-tile");
                }

                // Add sticky-freeswap-tile class if this is a sticky free swap tile that hasn't been used
                if (isTileStickyFreeSwapTile(tile) && !tile.hasBeenSwapped) {
                    gem.classList.add("sticky-freeswap-tile");
                }

                // Add directional free swap classes
                if (isTileFreeSwapHorizontalTile(tile) && !tile.hasBeenSwapped) {
                    gem.classList.add("freeswap-horizontal-tile");
                }

                if (isTileFreeSwapVerticalTile(tile) && !tile.hasBeenSwapped) {
                    gem.classList.add("freeswap-vertical-tile");
                }

                // Add hammer-tile class if this is a hammer tile
                if (isTileHammerTile(tile)) {
                    gem.classList.add("hammer-tile");
                }

                // Add halver-tile class if this is a halver tile
                if (isTileHalverTile(tile)) {
                    gem.classList.add("halver-tile");
                }
            }

            gameBoard.appendChild(gem);
        }
    }

    // Restore preview classes for pending interrupt swap
    if (game.pendingSwap) {
        const { row1, col1, row2, col2, tile1, tile2 } = game.pendingSwap;

        const tilesUnchanged = game.board[row1][col1] === tile1 && game.board[row2][col2] === tile2;
        if (tilesUnchanged) {
            const gem1 = document.querySelector(`[data-row="${row1}"][data-col="${col1}"]`);
            const gem2 = document.querySelector(`[data-row="${row2}"][data-col="${col2}"]`);
            if (gem1) gem1.classList.add("pending-preview");
            if (gem2) gem2.classList.add("pending-preview");
        } else {
            game.interruptCascade = false;
            game.pendingSwap = null;
        }
    }

    updateGoalDisplay(game);
}

export function renderGoals(game) {
    const goalsContainer = document.getElementById("goals");
    if (!goalsContainer) return;

    goalsContainer.innerHTML = "";

    game.levelGoals.forEach((goal) => {
        goalsContainer.appendChild(createGoalCard(game, goal));
    });
}

export function createGoalCard(game, goal) {
    const goalCard = document.createElement("div");
    let isCompleted, currentProgress, goalTypeClass, goalIcon, goalContent;

    if (goal.goalType === "current") {
        isCompleted = goal.current >= goal.target;
        currentProgress = goal.current;
        goalTypeClass = "goal-current";
        goalIcon = "📍";

        const displayValue = getDisplayValue(goal.tileValue);
        goalContent = `
                <div class="gem tile-${goal.tileValue} goal-tile">
                    <span style="font-size: ${getFontSize(displayValue)}cqw">${displayValue}</span>
                </div>`;
    } else if (goal.goalType === "blocked") {
        isCompleted = goal.current >= goal.target;
        currentProgress = goal.current;
        goalTypeClass = "goal-blocked";
        goalIcon = "♻️";
        goalContent = `<div class="gem tile-BLOCKED goal-tile"></div>`;
    } else if (goal.goalType === "cursed") {
        isCompleted = goal.current >= goal.target;
        currentProgress = goal.current;
        goalTypeClass = "goal-cursed";
        goalIcon = goal.implode ? "💥" : "💀";
        const displayValue = getDisplayValue(goal.tileValue);
        goalContent = `
                <div class="gem tile-${goal.tileValue} cursed-tile goal-tile" data-cursed-moves="${goal.strength}">
                    <span style="font-size: ${getFontSize(displayValue)}cqw">${displayValue}</span>
                </div>`;
    } else if (goal.goalType === "score") {
        return createScoreGoalCard(goal);
    } else {
        isCompleted = goal.created >= goal.target;
        currentProgress = goal.created;
        goalTypeClass = "goal-created";
        goalIcon = "⭐";
        const displayValue = getDisplayValue(goal.tileValue);
        goalContent = `
                <div class="gem tile-${goal.tileValue} goal-tile">
                    <span style="font-size: ${getFontSize(displayValue)}cqw">${displayValue}</span>
                </div>`;
    }

    goalCard.className = `goal-card ${goalTypeClass} ${isCompleted ? "completed" : ""}`;

    const goalProgress = goal.target - currentProgress;
    const goalProgressElement = `
        <stroked-text
            text="${goalProgress}"
            font-size="20"
            stroke-width="8"
            width="100"
            height="24"
            svg-style="height: 100%;">
        </stroked-text>
        `;
    goalCard.innerHTML = `
            ${goalContent}
            <div class="goal-icon">${goalIcon}</div>
            ${
                isCompleted
                    ? '<div class="goal-check">✓</div>'
                    : `<div class="goal-progress">${goalProgressElement}</div>`
            }
        `;
    return goalCard;
}

function createScoreGoalCard(goal) {
    const goalCard = document.createElement("div");

    let isCompleted = goal.current >= goal.target,
        currentProgress = goal.current,
        goalTypeClass = "goal-score",
        goalIcon = "Points",
        goalContent = `
                <div class="goal-score-display">
                    <span class="goal-score-value">${currentProgress}</span><span class="goal-value">/${goal.target}</span>
                </div>`;

    goalCard.className = `goal-card ${goalTypeClass} ${isCompleted ? "completed" : ""}`;

    goalCard.innerHTML = `
            <div class="goal-icon">${goalIcon}</div>
            ${goalContent}
            ${isCompleted ? '<div class="goal-check">✓</div>' : ``}
        `;
    return goalCard;
}

export function renderBoardUpgrades(game) {
    const upgradesContainer = document.getElementById("boardUpgradesContainer");
    const upgradesElement = document.getElementById("boardUpgrades");
    const upgradeIcon = upgradesContainer?.querySelector(".upgrade-icon");
    if (!upgradesContainer || !upgradesElement) return;

    const levelConfig = game.levelConfig;

    // Only show if level has boardUpgrades configured
    if (!levelConfig.boardUpgrades || levelConfig.boardUpgrades.length === 0) {
        upgradesContainer.style.display = "none";
        return;
    }

    upgradesContainer.style.display = "flex";
    upgradesElement.innerHTML = "";

    // Update icon based on super streak status
    if (upgradeIcon) {
        if (game.superStreak >= SUPER_STREAK_THRESHOLD) {
            upgradeIcon.src = "assets/upgrade-icon_streak.png";
            upgradeIcon.classList.add("active");
        } else {
            upgradeIcon.src = "assets/upgrade-icon.png";
            upgradeIcon.classList.remove("active");
        }
    }

    // Show upgrade trigger tiles stacked vertically
    levelConfig.boardUpgrades
        .sort((a, b) => b - a)
        .forEach((tileValue) => {
            const isCompleted = game.completedUpgrades.includes(tileValue);
            const displayValue = getDisplayValue(tileValue);

            const upgradeTile = document.createElement("div");
            upgradeTile.className = `gem tile-${tileValue} upgrade-tile ${isCompleted ? "completed" : ""}`;
            upgradeTile.innerHTML = `<span style="font-size: ${getFontSize(displayValue)}cqw">${displayValue}</span>`;

            upgradesElement.appendChild(upgradeTile);
        });
}

export function updateGoalDisplay(game, checkComplete = false) {
    // Update tile counts for current-type goals
    game.updateTileCounts();
    renderGoals(game);
    if (checkComplete) {
        game.checkLevelComplete();
    }
}

export function updateMovesDisplay(game) {
    const movesElement = document.getElementById("moves");
    if (movesElement) {
        movesElement.textContent = `${game.maxMoves - game.movesUsed}`; //`${this.movesUsed}/${this.maxMoves}`;
    }
}

export function updateScore(game, points) {
    game.score += points;
    saveScore(game.score); // Save score to localStorage
}
