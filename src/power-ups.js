// Power-up system - extracted from game.js
// All functions take `game` as first parameter

import { TILE_TYPE, FEATURE_KEYS } from "./config.js";
import {
    isBlockedWithLife,
    isRectangularBlocked,
    isBlockedWithMergeCount,
    isBlocked,
    isBlockedMovable,
    isNormal,
    createTile,
    createCursedTile,
    isCursed,
    getDisplayValue,
    getFontSize,
} from "./tile-helpers.js";
import { savePowerUpCounts, isFeatureUnlocked } from "./storage.js";
import { track } from "./tracker.js";
import {
    isTutorialActive,
    isTutorialPowerUpStep,
    isValidTutorialPowerUp,
    updateTutorialUI,
} from "./tutorial.js";

export function setupPowerUps(game) {
    const powerUpButtons = document.querySelectorAll(".power-up-btn.game");

    powerUpButtons.forEach((button) => {
        button.addEventListener("click", () => {
            if (!game.gameActive) return;

            const powerUpType = button.dataset.powerup;

            if (!isPowerUpButtonVisible(game, powerUpType)) {
                return;
            }

            if (getTotalPowerUpCount(game, powerUpType) <= 0) {
                openPowerupShop(game);
                return;
            }

            if (isTutorialActive(game) && isTutorialPowerUpStep(game)) {
                if (!isValidTutorialPowerUp(game, powerUpType)) {
                    return;
                }
            }

            if (game.activePowerUp === powerUpType) {
                deactivatePowerUp(game);
            } else {
                activatePowerUp(game, powerUpType);
            }
        });
    });
}

export function activatePowerUp(game, type) {
    if (isTutorialActive(game) && !isTutorialPowerUpStep(game)) {
        return;
    }

    deactivatePowerUp(game);
    game.activePowerUp = type;
    game.powerUpSwapTiles = [];

    const button = document.querySelector(`[data-powerup="${type}"]`);
    if (button) {
        button.classList.add("active");
    }

    if (isTutorialActive(game) && isTutorialPowerUpStep(game)) {
        updateTutorialUI(game);
    }
}

export function deactivatePowerUp(game) {
    if (game.activePowerUp) {
        const button = document.querySelector(`[data-powerup="${game.activePowerUp}"]`);
        if (button) {
            button.classList.remove("active");
        }
    }

    game.activePowerUp = null;
    game.powerUpSwapTiles = [];
}

export function isPowerUpButtonVisible(game, powerUpType) {
    const idx = game.selectedPowerUps.indexOf(powerUpType);
    if (idx === -1) return false;

    const unlockKeys = [FEATURE_KEYS.POWER_UP_1, FEATURE_KEYS.POWER_UP_2, FEATURE_KEYS.POWER_UP_3];
    let unlockedSlots = 0;
    for (const key of unlockKeys) {
        if (isFeatureUnlocked(key)) unlockedSlots++;
        else break;
    }

    return idx < unlockedSlots;
}

export function getVisiblePowerUpTypes(game) {
    return game.selectedPowerUps.filter((t) => isPowerUpButtonVisible(game, t));
}

export function grantPowerUp(game, powerUpType) {
    game.powerUpCounts[powerUpType].transient++;
    updatePowerUpButtons(game);
}

export function getTotalPowerUpCount(game, type) {
    const counts = game.powerUpCounts[type];
    const persistent = game.persistentPowerUpsEnabled ? counts.persistent : 0;
    return persistent + counts.transient;
}

export function consumePowerUp(game, type) {
    game.powerUpUsedCounts[type]++;

    const counts = game.powerUpCounts[type];
    if (counts.transient > 0) {
        counts.transient--;
    } else if (game.persistentPowerUpsEnabled && counts.persistent > 0) {
        counts.persistent--;
        savePowerUpCounts({
            hammer: game.powerUpCounts.hammer.persistent,
            halve: game.powerUpCounts.halve.persistent,
            swap: game.powerUpCounts.swap.persistent,
            teleport: game.powerUpCounts.teleport.persistent,
            wildcard: game.powerUpCounts.wildcard.persistent,
        });
    }
}

export function grantFormationPowerUp(game, formationType) {
    if (!game.formationPowerUpRewards) return;

    const formationToPowerUp = {
        "L-formation": "hammer",
        "T-formation": "halve",
        line_5_horizontal: "swap",
        line_5_vertical: "swap",
    };

    const powerUpType = formationToPowerUp[formationType];
    if (!powerUpType) return;

    if (!isPowerUpButtonVisible(game, powerUpType)) return;

    grantPowerUp(game, powerUpType);
    showPowerUpRewardAnimation(game, powerUpType);
}

export function showPowerUpRewardAnimation(game, powerUpType) {
    const motivationalWords = ["Great!", "Awesome!", "Wow!", "Amazing!", "Nice!", "Super!"];
    const randomWord = motivationalWords[Math.floor(Math.random() * motivationalWords.length)];

    const powerUpIcons = {
        hammer: "🔨",
        halve: "✂️",
        swap: "🔄",
        teleport: "🚀",
        wildcard: "✨",
    };
    const icon = powerUpIcons[powerUpType];

    const container = document.createElement("div");
    container.className = "formation-powerup-animation";

    const headline = document.createElement("stroked-text");
    headline.className = "formation-powerup-headline";
    headline.setAttribute("text", randomWord);
    headline.setAttribute("font-size", "48");
    headline.setAttribute("stroke-width", "12");
    headline.setAttribute("fill", "#FFD700");
    headline.setAttribute("stroke", "#333");

    const subtitleContainer = document.createElement("div");
    subtitleContainer.className = "formation-powerup-subtitle";

    const plusOneText = document.createElement("stroked-text");
    plusOneText.setAttribute("text", "+1");
    plusOneText.setAttribute("font-size", "36");
    plusOneText.setAttribute("stroke-width", "10");
    plusOneText.setAttribute("fill", "#FFFFFF");
    plusOneText.setAttribute("stroke", "#333");

    const iconText = document.createElement("stroked-text");
    iconText.setAttribute("text", icon);
    iconText.setAttribute("font-size", "36");
    iconText.setAttribute("stroke-width", "6");

    subtitleContainer.appendChild(plusOneText);
    subtitleContainer.appendChild(iconText);

    container.appendChild(headline);
    container.appendChild(subtitleContainer);

    const gameContainer = document.getElementById("game-container");
    if (gameContainer) {
        gameContainer.appendChild(container);
        setTimeout(() => {
            container.remove();
        }, 2000);
    }
}

export function showPowerUps(game) {
    const powerUpsContainer = document.querySelector(".power-ups");
    if (powerUpsContainer) {
        powerUpsContainer.style.visibility = "";
    }
    const allButtons = document.querySelectorAll(".power-up-btn.game");
    allButtons.forEach((btn) => {
        btn.style.display = game.selectedPowerUps.includes(btn.dataset.powerup) ? "" : "none";
    });
}

export function hidePowerUps(game) {
    const powerUpsContainer = document.querySelector(".power-ups");
    if (powerUpsContainer) {
        powerUpsContainer.style.visibility = "hidden";
    }
}

export function updatePowerUpButtons(game) {
    const powerUpButtons = document.querySelectorAll(".power-up-btn.game");

    powerUpButtons.forEach((button) => {
        const powerUpType = button.dataset.powerup;

        if (!isPowerUpButtonVisible(game, powerUpType)) {
            button.classList.add("locked");
            button.disabled = true;
            button.title = "Unlock by progressing through levels";
            const existingIndicator = button.querySelector(".use-indicator");
            if (existingIndicator) {
                existingIndicator.remove();
            }
            return;
        }

        button.classList.remove("locked");
        button.disabled = false;

        const counts = game.powerUpCounts[powerUpType];
        const persistent = game.persistentPowerUpsEnabled ? counts.persistent : 0;
        const transient = counts.transient;
        const total = persistent + transient;

        const existingIndicator = button.querySelector(".use-indicator");
        if (existingIndicator) {
            existingIndicator.remove();
        }

        if (total <= 0) {
            button.classList.add("can-purchase");
            button.title = `${button.title.split(" - ")[0]} - Click to buy more`;
        } else {
            button.classList.remove("can-purchase");
            const indicator = document.createElement("div");
            indicator.className = "use-indicator";

            const strokedText = document.createElement("stroked-text");
            strokedText.setAttribute("text", total);
            strokedText.setAttribute("font-size", "26");
            strokedText.setAttribute("width", "40");
            strokedText.setAttribute("height", "40");
            strokedText.setAttribute("svg-style", "width: 100%; height: 100%;");

            if (transient > 0) {
                indicator.classList.add("transient-count");
            }

            indicator.appendChild(strokedText);
            button.appendChild(indicator);

            button.classList.remove("disabled");
            const baseTitle = button.title.split(" - ")[0];
            button.title = `${baseTitle} - ${total} uses left`;
        }
    });

    }
}

export function handlePowerUpAction(game, row, col, element) {
    const tile = game.board[row][col];

    switch (game.activePowerUp) {
        case "hammer":
            if (!tile) return;
            const allowedTypes = [
                TILE_TYPE.NORMAL,
                TILE_TYPE.BLOCKED_MOVABLE,
                TILE_TYPE.BLOCKED,
                TILE_TYPE.BLOCKED_WITH_LIFE,
            ];
            if (!allowedTypes.includes(tile.type)) return;
            usePowerUpHammer(game, row, col, element);
            break;
        case "halve":
            usePowerUpHalve(game, row, col, element);
            break;
        case "swap":
        case "teleport":
            return false;
        case "wildcard":
            usePowerUpWildcard(game, row, col, element);
            break;
    }
}

export function usePowerUpHammer(game, row, col, element) {
    const tile = game.board[row][col];

    game.resetHintTimer();

    consumePowerUp(game, "hammer");
    updatePowerUpButtons(game);

    track("power_up_used", {
        level: game.currentLevel,
        power_up_type: "hammer",
        remaining_moves: game.maxMoves - game.movesUsed,
        uses_remaining: getTotalPowerUpCount(game, "hammer"),
    });

    game.animating = true;

    if (isBlockedWithLife(tile)) {
        element.style.transition = "transform 0.3s ease, opacity 0.3s ease";
        element.style.opacity = "0";
        element.style.transform = "scale(0)";

        setTimeout(() => {
            if (isRectangularBlocked(tile)) {
                for (let r = tile.rectAnchor.row; r < tile.rectAnchor.row + tile.rectHeight; r++) {
                    for (let c = tile.rectAnchor.col; c < tile.rectAnchor.col + tile.rectWidth; c++) {
                        if (r >= 0 && r < game.boardHeight && c >= 0 && c < game.boardWidth) {
                            game.board[r][c] = null;
                        }
                    }
                }
            } else {
                game.board[row][col] = null;
            }

            game.updateBlockedTileGoals();
            game.dropGems();
            deactivatePowerUp(game);
        }, 300);
    } else if (isBlockedWithMergeCount(tile)) {
        let cellToClear = null;
        for (let r = tile.rectAnchor.row; r < tile.rectAnchor.row + tile.rectHeight; r++) {
            for (let c = tile.rectAnchor.col; c < tile.rectAnchor.col + tile.rectWidth; c++) {
                const cellKey = `${r}_${c}`;
                if (tile.cellMergeCounts[cellKey] > 0) {
                    cellToClear = { row: r, col: c, cellKey: cellKey };
                    break;
                }
            }
            if (cellToClear) break;
        }

        if (cellToClear) {
            tile.cellMergeCounts[cellToClear.cellKey]--;

            const allCleared = Object.values(tile.cellMergeCounts).every((count) => count === 0);

            if (allCleared) {
                element.style.transition = "transform 0.3s ease, opacity 0.3s ease";
                element.style.opacity = "0";
                element.style.transform = "scale(0)";

                setTimeout(() => {
                    for (let r = tile.rectAnchor.row; r < tile.rectAnchor.row + tile.rectHeight; r++) {
                        for (let c = tile.rectAnchor.col; c < tile.rectAnchor.col + tile.rectWidth; c++) {
                            if (r >= 0 && r < game.boardHeight && c >= 0 && c < game.boardWidth) {
                                game.board[r][c] = null;
                            }
                        }
                    }

                    game.updateBlockedTileGoals();
                    game.dropGems();
                    deactivatePowerUp(game);
                }, 300);
            } else {
                element.style.transition = "transform 0.2s ease";
                element.style.transform = "scale(1.1)";

                setTimeout(() => {
                    element.style.transform = "scale(1)";
                    game.renderBoard();
                    game.animating = false;
                    deactivatePowerUp(game);
                }, 200);
            }
        } else {
            game.animating = false;
            deactivatePowerUp(game);
        }
    } else if (isBlocked(tile) || isBlockedMovable(tile)) {
        element.style.transition = "transform 0.3s ease, opacity 0.3s ease";
        element.style.opacity = "0";
        element.style.transform = "scale(0)";

        setTimeout(() => {
            if (isRectangularBlocked(tile)) {
                for (let r = tile.rectAnchor.row; r < tile.rectAnchor.row + tile.rectHeight; r++) {
                    for (let c = tile.rectAnchor.col; c < tile.rectAnchor.col + tile.rectWidth; c++) {
                        if (r >= 0 && r < game.boardHeight && c >= 0 && c < game.boardWidth) {
                            game.board[r][c] = null;
                        }
                    }
                }
            } else {
                game.board[row][col] = null;
            }

            game.updateBlockedTileGoals();
            game.dropGems();
            deactivatePowerUp(game);
        }, 300);
    } else {
        element.style.transition = "transform 0.3s ease, opacity 0.3s ease";
        element.style.opacity = "0";
        element.style.transform = "scale(0)";

        setTimeout(() => {
            game.board[row][col] = null;
            game.dropGems();
            deactivatePowerUp(game);
        }, 300);
    }
}

export function usePowerUpHalve(game, row, col, element) {
    const tile = game.board[row][col];
    const isCursedTile = isCursed(tile);
    const currentValue = tile && (tile.type === TILE_TYPE.NORMAL || isCursedTile) ? tile.value : null;

    if (currentValue && currentValue > 1) {
        game.resetHintTimer();

        consumePowerUp(game, "halve");
        updatePowerUpButtons(game);

        track("power_up_used", {
            level: game.currentLevel,
            power_up_type: "halve",
            remaining_moves: game.maxMoves - game.movesUsed,
            uses_remaining: getTotalPowerUpCount(game, "halve"),
        });

        game.animating = true;

        const halvedValue = currentValue - 1;

        if (isCursedTile) {
            game.board[row][col] = createCursedTile(halvedValue, tile.cursedMovesRemaining);
        } else {
            game.board[row][col] = createTile(halvedValue);
        }

        game.levelGoals.forEach((goal) => {
            if (goal.tileValue === halvedValue) {
                goal.created += 1;
            }
        });

        const displayValue = getDisplayValue(halvedValue);
        const fontSize = getFontSize(displayValue);
        element.innerHTML = `<span style="font-size: ${fontSize}cqw">${displayValue}</span>`;
        element.className = `gem tile-${halvedValue}`;
        if (isCursedTile) {
            element.classList.add("cursed-tile");
            element.dataset.cursedMoves = tile.cursedMovesRemaining;
        }
        element.dataset.row = row;
        element.dataset.col = col;

        element.style.transform = "scale(1.2)";
        setTimeout(() => {
            element.style.transform = "scale(1)";
            game.updateGoalDisplay(false);

            setTimeout(() => {
                game.animating = false;
                game.processMatches();
            }, 100);
        }, 200);

        deactivatePowerUp(game);
    }
}

export function usePowerUpWildcard(game, row, col, element) {
    const tile = game.board[row][col];

    if (!tile || !isNormal(tile)) return;

    game.resetHintTimer();

    consumePowerUp(game, "wildcard");
    updatePowerUpButtons(game);

    track("power_up_used", {
        level: game.currentLevel,
        power_up_type: "wildcard",
        remaining_moves: game.maxMoves - game.movesUsed,
        uses_remaining: getTotalPowerUpCount(game, "wildcard"),
    });

    game.animating = true;

    game.board[row][col] = {
        type: TILE_TYPE.JOKER,
        value: null,
        targetValue: null,
        specialType: null,
        hasBeenSwapped: false,
    };

    element.style.transition = "transform 0.3s ease";
    element.style.transform = "scale(1.3)";
    setTimeout(() => {
        element.style.transform = "scale(1)";
        game.renderBoard();
        game.animating = false;
    }, 300);

    deactivatePowerUp(game);
}

export function setupPowerupShop(game) {
    const powerupShopDialog = document.getElementById("powerupShopDialog");
    const closePowerupShopBtn = document.getElementById("closePowerupShopBtn");
    const powerupBuyButtons = document.querySelectorAll(".powerup-buy-btn");

    if (closePowerupShopBtn) {
        closePowerupShopBtn.addEventListener("click", () => {
            powerupShopDialog.classList.add("hidden");
        });
    }

    if (powerupShopDialog) {
        powerupShopDialog.addEventListener("click", (e) => {
            if (e.target === powerupShopDialog) {
                powerupShopDialog.classList.add("hidden");
            }
        });
    }

    powerupBuyButtons.forEach((button) => {
        const originalHTML = button.innerHTML;
        let isPurchasing = false;

        button.addEventListener("click", (e) => {
            e.stopPropagation();

            if (isPurchasing) return;

            const shopItem = button.closest(".powerup-shop-item");
            const powerupType = shopItem.getAttribute("data-powerup");
            const cost = parseInt(shopItem.getAttribute("data-cost"));

            if (isNaN(cost) || isNaN(game.coins)) {
                return;
            }

            if (game.coins >= cost) {
                isPurchasing = true;

                game.coins = Number(game.coins) - Number(cost);
                game.saveCoins();

                if (game.persistentPowerUpsEnabled) {
                    game.powerUpCounts[powerupType].persistent++;
                    savePowerUpCounts({
                        hammer: game.powerUpCounts.hammer.persistent,
                        halve: game.powerUpCounts.halve.persistent,
                        swap: game.powerUpCounts.swap.persistent,
                        teleport: game.powerUpCounts.teleport.persistent,
                        wildcard: game.powerUpCounts.wildcard.persistent,
                    });
                } else {
                    game.powerUpCounts[powerupType].transient++;
                }

                updatePowerUpButtons(game);
                game.updateCoinsDisplays();

                const originalBg = button.style.background;
                button.textContent = "✓";
                button.style.background = "#8bc34a";
                setTimeout(() => {
                    button.innerHTML = originalHTML;
                    button.style.background = originalBg;
                    isPurchasing = false;
                }, 1500);
            } else {
                const shopDialog = document.getElementById("shopDialog");
                if (shopDialog) {
                    shopDialog.classList.remove("hidden");
                    game.updateCoinsDisplays();
                }
            }
        });
    });
}

export function openPowerupShop(game) {
    const powerupShopDialog = document.getElementById("powerupShopDialog");
    if (powerupShopDialog) {
        game.updateCoinsDisplays();

        const shopItems = powerupShopDialog.querySelectorAll(".powerup-shop-item");
        shopItems.forEach((item) => {
            const powerupType = item.dataset.powerup;
            item.style.display = isPowerUpButtonVisible(game, powerupType) ? "" : "none";
        });

        powerupShopDialog.classList.remove("hidden");
    }
}
