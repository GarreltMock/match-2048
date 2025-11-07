// Goal type introduction dialogs

import { loadShownGoalDialogs, saveShownGoalDialog } from "./storage.js";
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
    board_upgrades: {
        icon: "⬆️",
        title: "Board Upgrades",
        description: "Unlock higher tile values by reaching upgrade milestones",
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
    board_upgrades: {
        title: `<img src="/assets/upgrade-icon.png" style="display: inline-block; height: 2rem; vertical-align: bottom" /> Board Upgrades`,
        subtitle: "Unlock higher tile values!",
        content: `
            <p>This level features board upgrades that unlock when you reach specific tile milestones.</p>
            <ul>
                <li>Create the tiles shown to trigger an upgrade</li>
                <li>Each upgrade removes the smallest tiles from the board</li>
                <li>Higher value tiles become available to spawn</li>
            </ul>
            <p><em>Tip: Upgrades help you reach even higher tiles - aim for those milestones!</em></p>
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
