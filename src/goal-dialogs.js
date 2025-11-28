// Goal type introduction dialogs

import { loadShownGoalDialogs, saveShownGoalDialog, isFeatureUnlocked, saveUnlockedFeature } from "./storage.js";
import { createGoalCard } from "./renderer.js";

// Short descriptions for intro dialog
export const GOAL_TYPE_DESCRIPTIONS = {
    created: {
        icon: "⭐",
        title: "Created Goals",
        description: "Create a total number of tiles throughout the level",
    },
    current: {
        icon: "📍",
        title: "Current Goals",
        description: "Keep a specific number of tiles on the board at the same time",
    },
    blocked: {
        icon: "♻️",
        title: "Blocked Tile Goals",
        description: "Clear blocked tiles by making matches adjacent to them",
    },
    blocked_with_life: {
        icon: "♻️",
        title: "Life-Based Blocked Tiles",
        description: "Clear reinforced blocked tiles that have life values",
    },
    cursed: {
        icon: "💀",
        title: "Cursed Tiles",
        description: "Merge cursed tiles before their countdown timer expires",
    },
    cursed_implode: {
        icon: "💥",
        title: "Imploding Cursed Tiles",
        description: "Merge explosive cursed tiles before they destroy adjacent tiles",
    },
    score: {
        icon: "💯",
        title: "Score Goals",
        description: "Accumulate points by merging tiles throughout the level",
    },
};

// Feature descriptions for unlockable game mechanics
export const FEATURE_DESCRIPTIONS = {
    block_4: {
        icon: "🔲",
        title: "Block Merges",
        description: "Merge 2x2 squares of tiles into two higher-value tiles",
    },
    line_4: {
        icon: "➖",
        title: "4-Tile Line Merges",
        description: "Merge 4 tiles in a row into one higher-value tile",
    },
    l_formation: {
        icon: "↪️",
        title: "L-Formation Merges",
        description: "Merge 5 tiles in an L-shape for powerful combinations",
    },
    t_formation: {
        icon: "⊤",
        title: "T-Formation Merges",
        description: "Merge 5 tiles in a T-shape for powerful combinations",
    },
    line_5: {
        icon: "═",
        title: "5-Tile Line Merges",
        description: "Merge 5 tiles in a row for maximum value",
    },
    power_hammer: {
        icon: "🔨",
        title: "Hammer Power-up",
        description: "Remove any tile from the board",
    },
    power_halve: {
        icon: "✂️",
        title: "Halve Power-up",
        description: "Reduce a tile's value by half",
    },
    power_swap: {
        icon: "🔄",
        title: "Swap Power-up",
        description: "Swap any two tiles on the board",
    },
    board_upgrades: {
        icon: "⬆️",
        title: "Board Upgrades",
        description: "Unlock higher tile values by reaching upgrade milestones",
    },
    streak: {
        icon: "🔥",
        title: "Win Streak",
        description: "Earn bonus power-ups by winning consecutive levels",
    },
};

// Dialog content for each goal type
export const GOAL_DIALOGS = {
    created: {
        title: "⭐ Created Goals",
        subtitle: "Track your progress across the entire level!",
        content: `
            <p>Created goals count every time you create a specific tile value throughout the level.</p>
            <ul>
                <li>The count never decreases - only increases</li>
                <li>If a tile is merged or removed, it still counts toward your goal</li>
                <li>Focus on making matches that create the target tile values</li>
            </ul>
            <p><em>Tip: Plan your moves to maximize the tiles you create!</em></p>
        `,
    },
    current: {
        title: "📍 Current Goals",
        subtitle: "Keep specific tiles on the board!",
        content: `
            <p>Current goals require you to have a certain number of tiles with a specific value on the board at the same time.</p>
            <ul>
                <li>The count goes up when you create the tile</li>
                <li>The count goes down when the tile is merged or removed</li>
                <li>You must maintain the target number of tiles to complete the goal</li>
            </ul>
            <p><em>Tip: Be strategic about when to merge - you might need to keep tiles separate!</em></p>
        `,
    },
    blocked: {
        title: "♻️ Blocked Tile Goals",
        subtitle: "Clear obstacles from the board!",
        content: `
            <p>Blocked tiles can't be moved, but you can clear them by making matches adjacent to them.</p>
            <ul>
                <li>Each match next to a blocked tile removes one layer</li>
                <li>Clear all blocked tiles to complete the goal</li>
            </ul>
            <p><em>Tip: Plan your matches to reach all blocked tiles!</em></p>
        `,
    },
    blocked_with_life: {
        title: "♻️ Life-Based Blocked Tiles",
        subtitle: "Break through reinforced obstacles!",
        content: `
            <p>These special blocked tiles have a life value that determines how much damage they need to be cleared.</p>
            <ul>
                <li>The life value is displayed on the tile</li>
                <li>Adjacent matches reduce the life by the sum of the merged tile values</li>
                <li>When life reaches 0, the blocked tile is cleared</li>
            </ul>
            <p><em>Tip: Create high-value tiles and merge them next to blocked tiles for maximum impact!</em></p>
        `,
    },
    cursed: {
        title: "💀 Cursed Tiles",
        subtitle: "Race against time!",
        content: `
            <p>Cursed tiles appear with a moves countdown. If you don't merge them in time, they disappear!</p>
            <ul>
                <li>The number shows how many moves you have left</li>
                <li>Merge cursed tiles before the countdown reaches 0 to complete the goal</li>
                <li>Plan your moves!</li>
            </ul>
            <p><em>Tip: Prioritize cursed tiles when they appear - don't let them expire!</em></p>
        `,
    },
    cursed_implode: {
        title: "💥 Imploding Cursed Tiles",
        subtitle: "Danger! These cursed tiles explode!",
        content: `
            <p>Like regular cursed tiles, but with a devastating twist - when the countdown reaches 0, they suck in adjacent tiles!</p>
            <ul>
                <li>If the number reaches 0, all adjacent tiles are destroyed</li>
                <li>Merge them quickly to avoid catastrophe!</li>
            </ul>
            <p><em>Tip: These are top priority - clear them before anything else!</em></p>
        `,
    },
    score: {
        title: "💯 Score Goals",
        subtitle: "Accumulate points through matches!",
        content: `
            <p>Score goals require you to earn a target number of points by merging tiles.</p>
            <ul>
                <li>Each match adds points equal to the sum of the merged tile values</li>
                <li>Example: Merging three 2s earns 6 points (2+2+2)</li>
            </ul>
            <p><em>Tip: Larger matches and higher-value tiles earn more points!</em></p>
        `,
    },
};

// Feature unlock dialogs for game mechanics
export const FEATURE_UNLOCK_DIALOGS = {
    // block_4: {
    //     title: "🔲 Block Merges Unlocked!",
    //     subtitle: "Match tiles in a 2x2 square",
    //     content: `
    //         <p>You've unlocked Block Merges! Create powerful matches by forming 2x2 squares of identical tiles.</p>
    //         <ul>
    //             <li>Match 4 tiles in a square pattern</li>
    //             <li>Creates 2 tiles at double the value</li>
    //             <li>Great for clearing space on the board</li>
    //         </ul>
    //         <p><em>Tip: Look for opportunities to form squares as you play!</em></p>
    //     `,
    // },
    line_4: {
        title: "4-Tile Merges Unlocked",
        subtitle: "Match 4 tiles in a row or in a block",
        content: `
            <p>You've unlocked 4-Tile Merges!</p>
            <p>Create more powerful matches by lining up 4 identical tiles</p>
            <p>or by forming 2x2 squares of identical tiles.</p>
            <ul>
                <li>Match 4 tiles horizontally or vertically</li>
                <li>Match 4 tiles in a 2x2 square</li>
                <li>Creates 1 tile at double the value</li>
            </ul>
            <p><em>This adds the ability to make a free swap with one of the resulting tiles</em></p>
        `,
    },
    l_formation: {
        title: "↪️ L-Formation Merges Unlocked",
        subtitle: "Master the L-shape pattern",
        content: `
            <p>You've unlocked L-Formation Merges! Create advanced matches with L-shaped patterns.</p>
            <ul>
                <li>Match 5 tiles in an L-shape (3 horizontal + 3 vertical, sharing corner)</li>
                <li>Creates 1 tile at 4x the value</li>
                <li>One of the most powerful merge types</li>
            </ul>
            <p><em>Tip: L-formations give you huge value boosts - use them strategically!</em></p>
        `,
    },
    // t_formation: {
    //     title: "⊤ T-Formation Merges Unlocked",
    //     subtitle: "Master the T-shape pattern",
    //     content: `
    //         <p>You've unlocked T-Formation Merges! Create advanced matches with T-shaped patterns.</p>
    //         <ul>
    //             <li>Match 5 tiles in a T-shape (3 in one direction + 2 perpendicular)</li>
    //             <li>Creates 1 tile at 4x the value</li>
    //             <li>One of the most powerful merge types</li>
    //         </ul>
    //         <p><em>Tip: T-formations give you huge value boosts - use them strategically!</em></p>
    //     `,
    // },
    line_5: {
        title: "═ 5-Tile Line Merges Unlocked",
        subtitle: "The ultimate line match",
        content: `
            <p>You've unlocked 5-Tile Line Merges! Create the most powerful line matches possible.</p>
            <ul>
                <li>Match 5 tiles horizontally or vertically</li>
                <li>Creates 1 tile at 4x the value</li>
                <li>The most powerful line merge available</li>
            </ul>
            <p><em>Tip: 5-tile lines are rare but extremely valuable - set them up when you can!</em></p>
        `,
    },
    power_hammer: {
        title: "🔨 Hammer Joker Unlocked",
        subtitle: "Remove any movable tile from the board",
        content: `
            <p>You've unlocked the Hammer Joker! Use it to remove problematic tiles from the board.</p>
            <ul>
                <li>Click the hammer, then click any tile to remove it</li>
                <li>Works on normal tiles and movable blocked tiles</li>
                <li>Limited uses per level - use wisely!</li>
            </ul>
            <p><em>Tip: Save hammers for when you're stuck or need to clear space quickly!</em></p>
        `,
    },
    power_halve: {
        title: "✂️ Halve Joker Unlocked",
        subtitle: "Reduce a tile's value",
        content: `
            <p>You've unlocked the Halve Joker! Use it to reduce a tile's value by half.</p>
            <ul>
                <li>Click the scissors, then click any tile to halve its value</li>
                <li>Great for making matches with high-value tiles</li>
                <li>Can trigger cascading matches</li>
            </ul>
            <p><em>Tip: Use on high-value tiles to create matches with nearby tiles!</em></p>
        `,
    },
    power_swap: {
        title: "🔄 Swap Joker Unlocked",
        subtitle: "Swap any two tiles",
        content: `
            <p>You've unlocked the Swap Joker! Use it to swap any two tiles on the board.</p>
            <ul>
                <li>Click the swap icon, then click two tiles to swap them</li>
                <li>No adjacency required - swap across the board!</li>
                <li>Perfect for setting up difficult matches</li>
            </ul>
            <p><em>Tip: Use swaps to create special formations or rescue difficult situations!</em></p>
        `,
    },
    board_upgrades: {
        title: `<img src="assets/upgrade-icon.png" style="display: inline-block; height: 2rem; vertical-align: bottom" /> Board Upgrades Unlocked!`,
        subtitle: "Unlock higher tile values",
        content: `
            <p>You've unlocked Board Upgrades! This level features upgrades that unlock when you reach specific tile milestones.</p>
            <ul>
                <li>Create the tiles shown to trigger an upgrade</li>
                <li>Each upgrade removes the smallest tiles from the board</li>
                <li>Higher value tiles become available to spawn</li>
            </ul>
            <p><em>Tip: Upgrades help you reach even higher tiles - aim for those milestones!</em></p>
        `,
    },
    streak: {
        title: "🔥 Win Streak Unlocked",
        subtitle: "Earn bonus power-ups for consecutive wins",
        content: `
            <p>You've unlocked the Win Streak system! Win levels consecutively to earn temporary power-up bonuses.</p>
            <ul>
                <li>Win 1 level in a row: +1 Halve power-up</li>
                <li>Win 2 levels in a row: +1 Hammer power-up</li>
                <li>Win 3 levels in a row: +1 Swap power-up</li>
            </ul>
            <p><em>Tip: These bonuses are temporary for the next level only. Keep your streak going!</em></p>
        `,
    },
};

/**
 * Check if a dialog has been shown before
 * @param {string} dialogType - The dialog type to check
 * @returns {boolean} True if the dialog has been shown
 */
export function hasDialogBeenShown(dialogType) {
    return loadShownGoalDialogs().has(dialogType);
}

/**
 * Get the dialog type(s) that should be shown for a level
 * @param {Array} levelGoals - Array of goal objects from level config
 * @returns {Array<string>} Array of dialog types that should be shown
 */
export function getDialogsToShow(levelGoals) {
    const dialogsToShow = [];
    const shownDialogs = loadShownGoalDialogs();

    // Check each goal type in the level
    const goalTypes = new Set();
    levelGoals.forEach((goal) => {
        if (goal.goalType === "blocked") {
            // Check if this is a life-based blocked tile goal
            // We need to check if the level has blocked tiles with life values
            // This will be passed as a parameter or checked in the caller
            goalTypes.add("blocked");
        } else if (goal.goalType === "cursed") {
            // Check if this is an imploding cursed tile
            if (goal.implode) {
                goalTypes.add("cursed_implode");
            } else {
                goalTypes.add("cursed");
            }
        } else {
            goalTypes.add(goal.goalType);
        }
    });

    // Add any new goal types that haven't been shown
    goalTypes.forEach((type) => {
        if (!shownDialogs.has(type)) {
            dialogsToShow.push(type);
        }
    });

    return dialogsToShow;
}

/**
 * Check if level has blocked tiles with life values
 * @param {Array} blockedTiles - Array of blocked tile configurations
 * @returns {boolean} True if any blocked tiles have life values
 */
export function hasLifeBasedBlockedTiles(blockedTiles) {
    if (!blockedTiles || blockedTiles.length === 0) return false;
    return blockedTiles.some((tile) => tile.lifeValue !== undefined);
}

/**
 * Generate HTML for goal visuals to display in dialog
 * @param {Object} game - The game instance
 * @param {string} dialogType - The dialog type being shown
 * @returns {string} HTML string for goal visuals
 */
function generateGoalVisualsHTML(game, dialogType) {
    if (!game || !game.levelGoals) return "";

    // Filter goals that match this dialog type
    const relevantGoals = game.levelGoals.filter((goal) => {
        if (dialogType === "created" && goal.goalType === "created") return true;
        if (dialogType === "current" && goal.goalType === "current") return true;
        if (dialogType === "blocked" && goal.goalType === "blocked" && !hasLifeBasedBlockedTiles(game.blockedTiles))
            return true;
        if (
            dialogType === "blocked_with_life" &&
            goal.goalType === "blocked" &&
            hasLifeBasedBlockedTiles(game.blockedTiles)
        )
            return true;
        if (dialogType === "cursed" && goal.goalType === "cursed" && !goal.implode) return true;
        if (dialogType === "cursed_implode" && goal.goalType === "cursed" && goal.implode) return true;
        if (dialogType === "score" && goal.goalType === "score") return true;
        return false;
    });

    if (relevantGoals.length === 0) return "";

    // Generate goal cards HTML
    let goalsHTML = '<div class="goal-dialog-goals">';
    relevantGoals.forEach((goal) => (goalsHTML += createGoalCard(game, goal).outerHTML));
    goalsHTML += "</div>";

    return goalsHTML;
}

/**
 * Create and show a goal dialog
 * @param {string} dialogType - The type of dialog to show
 * @param {Object} game - The game instance (to access goals and display values)
 * @param {Function} onClose - Callback when dialog is closed
 */
export function showGoalDialog(dialogType, game, onClose) {
    const dialog = GOAL_DIALOGS[dialogType];
    if (!dialog) {
        console.error(`Unknown dialog type: ${dialogType}`);
        if (onClose) onClose();
        return;
    }

    // Create dialog overlay
    const overlay = document.createElement("div");
    overlay.className = "goal-dialog-overlay";
    overlay.id = "goalDialog";

    // Generate goal visuals HTML
    const goalsHTML = generateGoalVisualsHTML(game, dialogType);

    // Create dialog content
    const dialogElement = document.createElement("div");
    dialogElement.className = "goal-dialog";
    dialogElement.innerHTML = `
        <div class="goal-dialog-header">
            <h2>${dialog.title}</h2>
            <h3>${dialog.subtitle}</h3>
        </div>
        <div class="goal-dialog-content">
            ${goalsHTML}
            ${dialog.content}
        </div>
        <div class="goal-dialog-footer">
            <button class="goal-dialog-button" id="goalDialogClose">Got it</button>
        </div>
    `;

    overlay.appendChild(dialogElement);
    document.body.appendChild(overlay);

    // Add close handler
    const closeButton = document.getElementById("goalDialogClose");
    closeButton.addEventListener("click", () => {
        overlay.classList.add("hidden");
        setTimeout(() => {
            overlay.remove();
        }, 300);
        saveShownGoalDialog(dialogType);
        if (onClose) onClose();
    });

    // Show dialog with animation
    requestAnimationFrame(() => {
        overlay.classList.add("visible");
    });
}

/**
 * Show multiple goal dialogs in sequence
 * @param {Array<string>} dialogTypes - Array of dialog types to show
 * @param {Object} game - The game instance
 * @param {Function} onComplete - Callback when all dialogs are closed
 */
export function showGoalDialogsSequence(dialogTypes, game, onComplete) {
    if (dialogTypes.length === 0) {
        if (onComplete) onComplete();
        return;
    }

    let currentIndex = 0;

    const showNext = () => {
        if (currentIndex >= dialogTypes.length) {
            if (onComplete) onComplete();
            return;
        }

        showGoalDialog(dialogTypes[currentIndex], game, () => {
            currentIndex++;
            // Small delay between dialogs
            setTimeout(showNext, 300);
        });
    };

    showNext();
}

/**
 * Check if feature has been unlocked
 * @param {string} featureKey - The feature key to check
 * @returns {boolean} True if the feature has been unlocked
 */
export function hasFeatureBeenUnlocked(featureKey) {
    return isFeatureUnlocked(featureKey);
}

/**
 * Show feature unlock dialog
 * @param {string} featureKey - The feature key to unlock
 * @param {Object} game - The game instance
 * @param {Function} onClose - Callback when dialog is closed
 */
export function showFeatureUnlockDialog(featureKey, game, onClose) {
    const dialog = FEATURE_UNLOCK_DIALOGS[featureKey];
    if (!dialog) {
        console.warn(`Unknown feature: ${featureKey}`);
        if (onClose) onClose();
        return;
    }

    // Create dialog overlay
    const overlay = document.createElement("div");
    overlay.className = "goal-dialog-overlay";
    overlay.id = "featureUnlockDialog";

    // Create dialog content
    const dialogElement = document.createElement("div");
    dialogElement.className = "goal-dialog";
    dialogElement.innerHTML = `
        <div class="goal-dialog-header">
            <h2>${dialog.title}</h2>
            <h3>${dialog.subtitle}</h3>
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

    // Add close handler - use querySelector on the overlay instead of getElementById
    const closeButton = overlay.querySelector(".goal-dialog-button");
    closeButton.addEventListener("click", () => {
        overlay.classList.add("hidden");
        setTimeout(() => overlay.remove(), 300);
        if (onClose) onClose();
    });

    // Show with animation
    requestAnimationFrame(() => {
        overlay.classList.add("visible");
    });
}

/**
 * Populate the intro dialog goal types list based on which dialogs have been shown
 */
export function updateIntroDialogGoalsList() {
    const goalTypesList = document.getElementById("goalTypesList");
    if (!goalTypesList) return;

    const shownDialogs = loadShownGoalDialogs();

    // Clear existing list
    goalTypesList.innerHTML = "";

    // Always show Created Goals first since it's the foundational goal type
    const createdGoalInfo = GOAL_TYPE_DESCRIPTIONS.created;
    const createdLi = document.createElement("li");
    createdLi.innerHTML = `<strong>${createdGoalInfo.icon} ${createdGoalInfo.title}:</strong> ${createdGoalInfo.description}`;
    goalTypesList.appendChild(createdLi);

    // Add other shown goal types (excluding 'created' since we already added it)
    shownDialogs.forEach((dialogType) => {
        if (dialogType === "created") return; // Skip created, already added

        const goalInfo = GOAL_TYPE_DESCRIPTIONS[dialogType];
        if (goalInfo) {
            const li = document.createElement("li");
            li.innerHTML = `<strong>${goalInfo.icon} ${goalInfo.title}:</strong> ${goalInfo.description}`;
            goalTypesList.appendChild(li);
        }
    });
}
