/**
 * formation-tutorial.js
 *
 * Tutorial system for teaching users about different merge formations
 * Shows a dialog when user creates a specific formation type for the first time
 */

import { loadShownFormationTutorials, saveShownFormationTutorial } from "./storage.js";
import { isBlocked, isBlockedWithLife, isBlockedMovable, isBlockedWithMergeCount, getDisplayValue } from "./tile-helpers.js";

/**
 * Get pending formation tutorials for match groups
 * @param {Array} matchGroups - Array of match groups from findMatches()
 * @param {object|null} swapPosition - Last swap position {row, col, movedFrom: {row, col}}
 * @returns {Array<{formationType: string, matchGroup: object}>} Array of pending tutorials with their match groups
 */
export function getPendingFormationTutorials(matchGroups, swapPosition = null) {
    const pending = [];
    const seenTypes = new Set();
    const shownTutorials = loadShownFormationTutorials();

    // Filter to only active merges (containing swapped tiles) if swapPosition provided
    const filteredGroups = swapPosition
        ? matchGroups.filter((group) => {
              return group.tiles.some(
                  (tile) =>
                      (tile.row === swapPosition.row && tile.col === swapPosition.col) ||
                      (swapPosition.movedFrom &&
                          tile.row === swapPosition.movedFrom.row &&
                          tile.col === swapPosition.movedFrom.col),
              );
          })
        : matchGroups;

    filteredGroups.forEach((group) => {
        const formationType = getFormationTypeFromDirection(group.direction);
        if (formationType && !seenTypes.has(formationType) && !shownTutorials.has(formationType)) {
            seenTypes.add(formationType);
            pending.push({ formationType, matchGroup: group });
        }
    });

    return pending;
}

/**
 * Highlight tiles that will be merged using merge-preview class
 * @param {Array} matchGroups - Array of match groups to highlight
 */
export function highlightMergeTiles(matchGroups) {
    matchGroups.forEach((group) => {
        group.tiles.forEach((tile) => {
            const gem = document.querySelector(`[data-row="${tile.row}"][data-col="${tile.col}"]`);
            if (gem) {
                gem.classList.add("merge-preview");
            }
        });
    });
}

/**
 * Highlight blocked tiles adjacent to match tiles using unblock-preview class
 * @param {Match3Game} game - The game instance
 * @param {Array} matchGroups - Array of match groups
 */
export function highlightBlockedTiles(game, matchGroups) {
    const highlighted = new Set();

    matchGroups.forEach((group) => {
        group.tiles.forEach((tile) => {
            const adjacentPositions = [
                { row: tile.row - 1, col: tile.col },
                { row: tile.row + 1, col: tile.col },
                { row: tile.row, col: tile.col - 1 },
                { row: tile.row, col: tile.col + 1 },
            ];

            adjacentPositions.forEach((pos) => {
                if (pos.row >= 0 && pos.row < game.boardHeight && pos.col >= 0 && pos.col < game.boardWidth) {
                    const key = `${pos.row}_${pos.col}`;
                    if (highlighted.has(key)) return;

                    const adjacentTile = game.board[pos.row]?.[pos.col];
                    if (
                        adjacentTile &&
                        (isBlocked(adjacentTile) ||
                            isBlockedWithLife(adjacentTile) ||
                            isBlockedMovable(adjacentTile) ||
                            isBlockedWithMergeCount(adjacentTile))
                    ) {
                        highlighted.add(key);
                        const gem = document.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
                        if (gem) {
                            gem.classList.add("unblock-preview");
                        }
                    }
                }
            });
        });
    });
}

/**
 * Remove merge-preview and unblock-preview highlight from all tiles
 */
export function clearMergeHighlight() {
    document.querySelectorAll(".gem.merge-preview").forEach((gem) => {
        gem.classList.remove("merge-preview");
    });
    document.querySelectorAll(".gem.unblock-preview").forEach((gem) => {
        gem.classList.remove("unblock-preview");
    });
}

// Static metadata for each formation type (keys used externally to track shown tutorials)
export const FORMATION_TUTORIAL_DIALOGS = {
    line_3:      { count: "3-Tile", name: "Line Match" },
    line_4:      { count: "4-Tile", name: "Line Match" },
    block_4:     { count: "4-Tile", name: "Block Match" },
    line_5:      { count: "5-Tile", name: "Line Match" },
    t_formation: { count: "5-Tile", name: "T-Formation" },
    l_formation: { count: "5-Tile", name: "L-Formation" },
};

function t(value, extra = "", highlight = false) {
    const cls = ["gem", `tile-${value}`, extra, highlight ? "target-highlight" : ""].filter(Boolean).join(" ");
    return `<div class="${cls}">${getDisplayValue(value)}</div>`;
}


const MERGE_DESCRIPTIONS = {
    line_3:      "3 matching tiles merge into the next tier",
    line_4:      "4 matching tiles merge into the next tier",
    block_4:     "4 matching tiles merge into the next tier",
    line_5:      "5 matching tiles skip to a higher tier",
    t_formation: "5 matching tiles skip to a higher tier",
    l_formation: "5 matching tiles skip to a higher tier",
};

function buildTierChain(rv, boxStart) {
    const start = Math.max(1, rv - 2);
    const end = start + 3;
    let html = '<div class="tier-chain"><div class="tier-chain-tiles">';
    if (start > 1) html += '<span class="tier-chain-ellipsis">···</span><span class="tier-chain-arrow">→</span>';
    let boxOpen = false;
    for (let i = start; i <= end; i++) {
        if (i === boxStart) {
            if (i > start) html += '<span class="tier-chain-arrow">→</span>';
            html += '<div class="tier-chain-box">';
            boxOpen = true;
            html += `<div class="gem tile-${i} tier-chain-tile${i === rv ? " tier-chain-result" : ""}">${getDisplayValue(i)}</div>`;
        } else if (i === rv && boxOpen) {
            html += '<span class="tier-chain-arrow">→</span>';
            html += `<div class="gem tile-${i} tier-chain-tile tier-chain-result">${getDisplayValue(i)}</div>`;
            html += '</div>';
            boxOpen = false;
        } else {
            if (i > start) html += '<span class="tier-chain-arrow">→</span>';
            html += `<div class="gem tile-${i} tier-chain-tile">${getDisplayValue(i)}</div>`;
        }
    }
    html += '<span class="tier-chain-arrow">→</span><span class="tier-chain-ellipsis">···</span>';
    html += '</div></div>';
    return html;
}

function buildFormationContent(formationType, matchGroup, isHorizontalSwap = false) {
    const v = matchGroup.value;
    const is5 = formationType === "line_5" || formationType === "t_formation" || formationType === "l_formation";
    const rv = v + (is5 ? 2 : 1);

    const freeswapDir = isHorizontalSwap ? "freeswap-horizontal-tile" : "freeswap-vertical-tile";

    const description = MERGE_DESCRIPTIONS[formationType] ?? "";

    switch (formationType) {
        case "line_3":
            return `
                <div class="formation-tutorial-content">
                <div class="formation-example">
                    <div class="example-formations-row">
                        <div class="example-grid example-tiles">
                            ${t(v)} ${t(v, "", true)} ${t(v)}
                        </div>
                    </div>
                    <div class="merge-indicator"><div class="merge-arrow">↓</div></div>
                    <div class="result-card">
                        <div class="result-tiles">${t(rv, "result")}</div>
                    </div>
                </div>
                <div class="merge-description">${description}</div>
                ${buildTierChain(rv, is5 ? rv - 2 : rv - 1)}
                </div>`;

        case "line_4":
            return `
                <div class="formation-tutorial-content">
                <div class="formation-example">
                    <div class="example-formations-row">
                        <div class="example-grid example-tiles">
                            ${t(v)} ${t(v, "", true)} ${t(v, "", true)} ${t(v)}
                        </div>
                    </div>
                    <div class="merge-indicator"><div class="merge-arrow">↓</div></div>
                    <div class="result-card">
                        <div class="result-tiles">
                            ${t(rv, `result ${freeswapDir}`)}
                            ${t(rv, "result")}
                        </div>
                        <div class="special-tile-legend">
                            <div class="legend-item">
                                <div class="legend-icon gem ${freeswapDir}"></div>
                                <span>Allows one free invalid swap in that direction</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="merge-description">${description}</div>
                ${buildTierChain(rv, is5 ? rv - 2 : rv - 1)}
                </div>`;

        case "block_4":
            return `
                <div class="formation-tutorial-content">
                <div class="formation-example">
                    <div class="example-formations-row">
                        <div class="example-grid">
                            <div class="grid-row">${t(v)} ${t(v)}</div>
                            <div class="grid-row">${t(v, "", true)} ${t(v, "", true)}</div>
                        </div>
                    </div>
                    <div class="merge-indicator"><div class="merge-arrow">↓</div></div>
                    <div class="result-card">
                        <div class="result-tiles">
                            ${t(rv, "result freeswap-horizontal-tile")}
                            ${t(rv, "result")}
                        </div>
                        <div class="special-tile-legend">
                            <div class="legend-item">
                                <div class="legend-icon gem freeswap-horizontal-tile"></div>
                                <span>Allows one free invalid swap in that direction</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="merge-description">${description}</div>
                ${buildTierChain(rv, is5 ? rv - 2 : rv - 1)}
                </div>`;

        case "line_5":
            return `
                <div class="formation-tutorial-content">
                <div class="formation-example">
                    <div class="example-formations-row" style="margin-top: 24px">
                        <div class="example-grid example-tiles">
                            ${t(v)} ${t(v)} ${t(v, "", true)} ${t(v)} ${t(v)}
                        </div>
                    </div>
                    <div class="merge-indicator"><div class="merge-arrow">↓</div></div>
                    <div class="result-card">
                        <div class="result-tiles">${t(rv, "result teleport-tile")}</div>
                        <div class="special-tile-legend">
                            <div class="legend-item">
                                <span>Swap with any tile anywhere on the board.</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="merge-description">${description}</div>
                ${buildTierChain(rv, is5 ? rv - 2 : rv - 1)}
                </div>`;

        case "t_formation":
            return `
                <div class="formation-tutorial-content">
                <div class="formation-example">
                    <div class="example-formations-row">
                        <div class="example-grid">
                            <div class="grid-row">${t(v)}<span></span><span></span></div>
                            <div class="grid-row">${t(v, "", true)} ${t(v)} ${t(v)}</div>
                            <div class="grid-row">${t(v)}<span></span><span></span></div>
                        </div>
                    </div>
                    <div class="merge-indicator"><div class="merge-arrow">↓</div></div>
                    <div class="result-card">
                        <div class="result-tiles">${t(rv, "result freeswap-tile")}</div>
                        <div class="special-tile-legend">
                            <div class="legend-item">
                                <div class="legend-icon gem freeswap-tile"></div>
                                <span>Allows one free invalid swap</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="merge-description">${description}</div>
                ${buildTierChain(rv, is5 ? rv - 2 : rv - 1)}
                </div>`;

        case "l_formation":
            return `
                <div class="formation-tutorial-content">
                <div class="formation-example">
                    <div class="example-formations-row">
                        <div class="example-grid">
                            <div class="grid-row">${t(v, "", true)} ${t(v)} ${t(v)}</div>
                            <div class="grid-row">${t(v)}<span></span><span></span></div>
                            <div class="grid-row">${t(v)}<span></span><span></span></div>
                        </div>
                    </div>
                    <div class="merge-indicator"><div class="merge-arrow">↓</div></div>
                    <div class="result-card">
                        <div class="result-tiles">${t(rv, "result freeswap-tile")}</div>
                        <div class="special-tile-legend">
                            <div class="legend-item">
                                <div class="legend-icon gem freeswap-tile"></div>
                                <span>Allows one free invalid swap</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="merge-description">${description}</div>
                ${buildTierChain(rv, is5 ? rv - 2 : rv - 1)}
                </div>`;

        default:
            return "";
    }
}

/**
 * Check if a formation tutorial has been shown before
 * @param {string} formationType - The formation type to check
 * @returns {boolean} True if the tutorial has been shown
 */
export function hasFormationTutorialBeenShown(formationType) {
    return loadShownFormationTutorials().has(formationType);
}

/**
 * Determine formation type from match group direction
 * @param {string} direction - Direction string from match group
 * @returns {string|null} Formation type key or null
 */
export function getFormationTypeFromDirection(direction) {
    // Map direction strings to formation type keys
    const formationMap = {
        horizontal: "line_3",
        vertical: "line_3",
        line_4_horizontal: "line_4",
        line_4_vertical: "line_4",
        block_4_formation: "block_4",
        line_5_horizontal: "line_5",
        line_5_vertical: "line_5",
        "T-formation": "t_formation",
        "L-formation": "l_formation",
    };

    return formationMap[direction] || null;
}

/**
 * Show formation tutorial dialog
 * @param {string} formationType - The formation type to show
 * @param {object} matchGroup - The match group that triggered this tutorial (provides actual tile value)
 * @param {boolean} isHorizontalSwap - Whether the triggering swap was horizontal (same row), used for freeswap badge direction
 * @returns {Promise<boolean>} Resolves to true if dialog was shown, false if already shown or invalid
 */
export function showFormationTutorialDialog(formationType, matchGroup, isHorizontalSwap = false) {
    return new Promise((resolve) => {
        // Check if already shown
        if (hasFormationTutorialBeenShown(formationType)) {
            resolve(false);
            return;
        }

        // Mark as shown immediately to prevent duplicate dialogs from concurrent triggers
        saveShownFormationTutorial(formationType);

        const dialog = FORMATION_TUTORIAL_DIALOGS[formationType];
        if (!dialog) {
            console.warn(`Unknown formation type: ${formationType}`);
            resolve(false);
            return;
        }

        // Create dialog overlay
        const overlay = document.createElement("div");
        overlay.className = "goal-dialog-overlay";

        // Create dialog content
        const dialogElement = document.createElement("div");
        dialogElement.className = "goal-dialog";
        dialogElement.innerHTML = `
            <div class="goal-dialog-header">
                <h2>Level Up!</h2>
                <h3><span class="formation-count-label">${dialog.count}</span> · ${dialog.name}</h3>
            </div>
            <div class="goal-dialog-content">
                ${buildFormationContent(formationType, matchGroup, isHorizontalSwap)}
            </div>
            <div class="goal-dialog-footer">
                <button class="goal-dialog-button">Got it!</button>
            </div>
        `;

        overlay.appendChild(dialogElement);
        document.body.appendChild(overlay);

        // Add close handler using scoped querySelector
        const closeButton = overlay.querySelector(".goal-dialog-button");
        closeButton.addEventListener("click", () => {
            overlay.classList.add("hidden");
            setTimeout(() => {
                overlay.remove();
                resolve(true);
            }, 300);
        });

        // Show dialog with animation
        requestAnimationFrame(() => {
            overlay.classList.add("visible");
        });
    });
}
