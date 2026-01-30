/**
 * formation-tutorial.js
 *
 * Tutorial system for teaching users about different merge formations
 * Shows a dialog when user creates a specific formation type for the first time
 */

import { loadShownFormationTutorials, saveShownFormationTutorial } from "./storage.js";

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
                          tile.col === swapPosition.movedFrom.col)
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
 * Remove merge-preview highlight from all tiles
 */
export function clearMergeHighlight() {
    document.querySelectorAll(".gem.merge-preview").forEach((gem) => {
        gem.classList.remove("merge-preview");
    });
}

// Dialog content for each formation type
export const FORMATION_TUTORIAL_DIALOGS = {
    line_3: {
        subtitle: "3-Tile Match",
        title: "Line",
        content: `
            <div class="formation-example">
                <div class="example-formations-row">
                    <div class="example-grid example-tiles">
                        <div class="example-tile">4</div>
                        <div class="example-tile target-highlight">4</div>
                        <div class="example-tile">4</div>
                    </div>
                </div>

                <div class="merge-indicator">
                    <div class="merge-arrow">↓</div>
                </div>

                <div class="result-card">
                    <div class="result-tiles">
                        <div class="example-tile highlight">8</div>
                    </div>
                </div>
            </div>
        `,
    },
    line_4: {
        subtitle: "4-Tile Match",
        title: "Line",
        content: `
            <div class="formation-example">
                <div class="example-formations-row">
                    <div class="example-grid example-tiles">
                        <div class="example-tile">4</div>
                        <div class="example-tile target-highlight">4</div>
                        <div class="example-tile target-highlight">4</div>
                        <div class="example-tile">4</div>
                    </div>
                </div>

                <div class="merge-indicator">
                    <div class="merge-arrow">↓</div>
                </div>

                <div class="result-card">
                    <div class="result-tiles">
                        <div class="example-tile highlight gem freeswap-horizontal-tile">8</div>
                        <div class="example-tile highlight">8</div>
                    </div>
                    <div class="special-tile-legend">
                        <div class="legend-item">
                            <div class="legend-icon gem freeswap-horizontal-tile"></div>
                            <span>Allows one free invalid swap in that direction</span>
                        </div>
                    </div>
                </div>
            </div>
        `,
    },
    block_4: {
        subtitle: "4-Tile Match",
        title: "Block",
        content: `
            <div class="formation-example">
                <div class="example-formations-row">
                    <div class="example-grid">
                        <div class="grid-row">
                            <div class="example-tile">4</div>
                            <div class="example-tile">4</div>
                        </div>
                        <div class="grid-row">
                            <div class="example-tile target-highlight">4</div>
                            <div class="example-tile target-highlight">4</div>
                        </div>
                    </div>
                </div>

                <div class="merge-indicator">
                    <div class="merge-arrow">↓</div>
                </div>

                <div class="result-card">
                    <div class="result-tiles">
                        <div class="example-tile highlight gem freeswap-horizontal-tile">8</div>
                        <div class="example-tile highlight">8</div>
                    </div>
                    <div class="special-tile-legend">
                        <div class="legend-item">
                            <div class="legend-icon gem freeswap-horizontal-tile"></div>
                            <span>Allows one free invalid swap in that direction</span>
                        </div>
                    </div>
                </div>
            </div>
        `,
    },
    line_5: {
        subtitle: "5-Tile Match",
        title: "Line",
        content: `
            <div class="formation-example">
                <div class="example-formations-row" style="margin-top: 24px">
                    <div class="example-grid example-tiles">
                        <div class="example-tile">4</div>
                        <div class="example-tile">4</div>
                        <div class="example-tile target-highlight">4</div>
                        <div class="example-tile">4</div>
                        <div class="example-tile">4</div>
                    </div>
                </div>

                <div class="merge-indicator">
                    <div class="merge-arrow">↓</div>
                </div>

                <div class="result-card">
                    <div class="result-tiles">
                        <div class="example-tile gem tile-JOKER joker-tile">
                            <span class="star-value">*</span>
                        </div>
                    </div>
                    <div class="special-tile-legend">
                        <div class="legend-item">
                            <span>Matches with any tile. Tap or swap it for a match.</span>
                        </div>
                    </div>
                </div>
            </div>
        `,
    },
    t_formation: {
        subtitle: "5-Tile Match",
        title: "T-Formation",
        content: `
            <div class="formation-example">
                <div class="example-formations-row">
                    <div class="example-grid">
                        <div class="grid-row">
                            <div class="example-tile">4</div>
                            <span></span>
                            <span></span>
                        </div>
                        <div class="grid-row">
                            <div class="example-tile target-highlight">4</div>
                            <div class="example-tile">4</div>
                            <div class="example-tile">4</div>
                        </div>
                        <div class="grid-row">
                            <div class="example-tile">4</div>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>

                <div class="merge-indicator">
                    <div class="merge-arrow">↓</div>
                </div>

                <div class="result-card">
                    <div class="result-tiles">
                        <div class="example-tile highlight double gem freeswap-tile">16</div>
                    </div>
                    <div class="special-tile-legend">
                        <div class="legend-item">
                            <div class="legend-icon gem freeswap-tile"></div>
                            <span>Allows one free invalid swap</span>
                        </div>
                    </div>
                </div>
            </div>
        `,
    },
    l_formation: {
        subtitle: "5-Tile Match",
        title: "L-Formation",
        content: `
            <div class="formation-example">
                <div class="example-formations-row">
                    <div class="example-grid">
                        <div class="grid-row">
                            <div class="example-tile target-highlight">4</div>
                            <div class="example-tile">4</div>
                            <div class="example-tile">4</div>
                        </div>
                        <div class="grid-row">
                            <div class="example-tile">4</div>
                            <span></span>
                            <span></span>
                        </div>
                        <div class="grid-row">
                            <div class="example-tile">4</div>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>

                <div class="merge-indicator">
                    <div class="merge-arrow">↓</div>
                </div>

                <div class="result-card">
                    <div class="result-tiles">
                        <div class="example-tile highlight double gem freeswap-tile">16</div>
                    </div>
                    <div class="special-tile-legend">
                        <div class="legend-item">
                            <div class="legend-icon gem freeswap-tile"></div>
                            <span>Allows one free invalid swap</span>
                        </div>
                    </div>
                </div>
            </div>
        `,
    },
};

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
 * @returns {Promise<boolean>} Resolves to true if dialog was shown, false if already shown or invalid
 */
export function showFormationTutorialDialog(formationType) {
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
                <h3>${dialog.subtitle}</h3>
                <h2>${dialog.title}</h2>
            </div>
            <div class="goal-dialog-content">
                ${dialog.content}
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
