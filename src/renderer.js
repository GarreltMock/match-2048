// DOM rendering and display updates

import {
    getTileValue,
    isBlocked,
    isBlockedWithLife,
    isJoker,
    isCursed,
    isNormal,
    isTilePowerTile,
    isTileGoldenTile,
    isTileFreeSwapTile,
    isTileStickyFreeSwapTile,
    getDisplayValue,
} from "./tile-helpers.js";
import { saveScore } from "./storage.js";

function getFontSize(value) {
    const length = value.toString().length;
    return 50 - Math.max(0, length - 2) * 7;
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

    for (let row = 0; row < game.boardHeight; row++) {
        for (let col = 0; col < game.boardWidth; col++) {
            const gem = document.createElement("div");
            const tile = game.board[row][col];
            gem.dataset.row = row;
            gem.dataset.col = col;

            // Set CSS class based on tile type
            if (isBlocked(tile)) {
                gem.className = `gem tile-BLOCKED`;
            } else if (isBlockedWithLife(tile)) {
                gem.className = `gem tile-BLOCKED_WITH_LIFE`;
                gem.dataset.life = tile.lifeValue;
            } else if (isJoker(tile)) {
                gem.className = `gem tile-JOKER`;
                gem.textContent = "🃏";
                gem.classList.add("joker-tile");
            } else if (isCursed(tile)) {
                const value = getTileValue(tile);
                gem.className = `gem tile-${value} cursed-tile`;

                const displayValue = getDisplayValue(value, game.numberBase);
                gem.innerHTML = `<span style="font-size: ${getFontSize(displayValue)}cqw">${displayValue}</span>`;

                gem.dataset.cursedMoves = tile.cursedMovesRemaining;
            } else if (isNormal(tile)) {
                const value = getTileValue(tile);
                gem.className = `gem tile-${value}`;

                const displayValue = getDisplayValue(value, game.numberBase);
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
            }

            gameBoard.appendChild(gem);
        }
    }

    // Restore preview classes for pending interrupt swap
    if (game.pendingSwap) {
        const { row1, col1, row2, col2 } = game.pendingSwap;
        const gem1 = document.querySelector(`[data-row="${row1}"][data-col="${col1}"]`);
        const gem2 = document.querySelector(`[data-row="${row2}"][data-col="${col2}"]`);
        if (gem1) gem1.classList.add("preview");
        if (gem2) gem2.classList.add("preview");
    }

    updateGoalDisplay(game);
}

export function renderGoals(game) {
    const goalsContainer = document.getElementById("goals");
    if (!goalsContainer) return;

    goalsContainer.innerHTML = "";

    game.levelGoals.forEach((goal) => {
        const goalCard = document.createElement("div");
        let isCompleted, currentProgress, goalTypeClass, goalIcon, goalContent;

        if (goal.goalType === "current") {
            isCompleted = goal.current >= goal.target;
            currentProgress = goal.current;
            goalTypeClass = "goal-current";
            goalIcon = "📍";

            const displayValue = getDisplayValue(goal.tileValue, game.numberBase);
            goalContent = `
                <div class="goal-tile tile-${goal.tileValue}">
                    <span style="font-size: ${getFontSize(displayValue)}cqw">${displayValue}</span>
                </div>`;
        } else if (goal.goalType === "blocked") {
            isCompleted = goal.current >= goal.target;
            currentProgress = goal.current;
            goalTypeClass = "goal-blocked";
            goalIcon = "♻️";
            goalContent = `<div class="goal-tile blocked-goal-tile"></div>`;
        } else if (goal.goalType === "cursed") {
            isCompleted = goal.current >= goal.target;
            currentProgress = goal.current;
            goalTypeClass = "goal-cursed";
            goalIcon = goal.implode ? "💥" : "💀";
            const displayValue = getDisplayValue(goal.tileValue, game.numberBase);
            goalContent = `
                <div class="goal-tile tile-${goal.tileValue} cursed-goal-tile" data-cursed-moves="${goal.strength}">
                    <span style="font-size: ${getFontSize(displayValue)}cqw">${displayValue}</span>
                </div>`;
        } else {
            isCompleted = goal.created >= goal.target;
            currentProgress = goal.created;
            goalTypeClass = "goal-created";
            goalIcon = "⭐";
            const displayValue = getDisplayValue(goal.tileValue, game.numberBase);
            goalContent = `
                <div class="goal-tile tile-${goal.tileValue}">
                    <span style="font-size: ${getFontSize(displayValue)}cqw">${displayValue}</span>
                </div>`;
        }

        goalCard.className = `goal-card ${goalTypeClass} ${isCompleted ? "completed" : ""}`;

        goalCard.innerHTML = `
            ${goalContent}
            <div class="goal-progress">${goalIcon} ${currentProgress} / ${goal.target}</div>
            ${isCompleted ? '<div class="goal-check">✓</div>' : ""}
        `;

        goalsContainer.appendChild(goalCard);
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

    const levelElement = document.getElementById("level");
    if (levelElement) {
        levelElement.textContent = game.currentLevel;
    }
}

export function updateScore(game, points) {
    game.score += points;
    document.getElementById("score").textContent = game.score;
    saveScore(game.score); // Save score to localStorage
}
