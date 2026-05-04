// Dialog explaining why an invalid swap was rejected.
// Shown the very first time a user makes an invalid swap, and again whenever
// the same invalid swap is attempted twice in a row.

import { isTutorialActive } from "../tutorial.js";
import { loadInvalidSwapDialogShown, saveInvalidSwapDialogShown } from "../storage.js";

const DIALOG_ID = "invalidSwapDialog";

const DIALOG_CONTENT = {
    title: "Invalid Swap",
    subtitle: "That move doesn't create a match",
    body: `
        <p>A valid swap moves two adjacent tiles so that 3 or more tiles of the same value line up in a row or column.</p>
        <p>Tap the <strong>?</strong> button at the top of the game screen for a full explanation of swap rules and special tiles.</p>
    `,
};

function canonicalSwapKey(row1, col1, row2, col2) {
    const a = `${row1},${col1}`;
    const b = `${row2},${col2}`;
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function showInvalidSwapDialog() {
    if (document.getElementById(DIALOG_ID)) return;

    const overlay = document.createElement("div");
    overlay.className = "goal-dialog-overlay";
    overlay.id = DIALOG_ID;

    const dialogElement = document.createElement("div");
    dialogElement.className = "goal-dialog";
    dialogElement.innerHTML = `
        <div class="goal-dialog-header">
            <h2>${DIALOG_CONTENT.title}</h2>
            <h3>${DIALOG_CONTENT.subtitle}</h3>
        </div>
        <div class="goal-dialog-content invalid-swap-dialog-content">
            ${DIALOG_CONTENT.body}
        </div>
        <div class="goal-dialog-footer">
            <button class="goal-dialog-button">Got it</button>
        </div>
    `;

    overlay.appendChild(dialogElement);
    document.body.appendChild(overlay);

    const closeButton = overlay.querySelector(".goal-dialog-button");
    const close = () => {
        overlay.classList.add("hidden");
        setTimeout(() => overlay.remove(), 300);
    };
    closeButton.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
    });

    requestAnimationFrame(() => overlay.classList.add("visible"));
}

/**
 * Decide whether to show the invalid-swap dialog after a swap was reverted,
 * and update the tracked "last invalid swap" on the game instance.
 *
 * Triggers:
 *   - the very first invalid swap a user ever makes (persisted via localStorage)
 *   - the same invalid swap attempted twice in a row within a session
 *
 * Skipped when the tutorial is active.
 */
export function maybeShowInvalidSwapDialog(game, row1, col1, row2, col2) {
    if (isTutorialActive(game)) return;

    const key = canonicalSwapKey(row1, col1, row2, col2);

    if (!loadInvalidSwapDialogShown()) {
        saveInvalidSwapDialogShown();
        game.lastInvalidSwap = key;
        showInvalidSwapDialog();
        return;
    }

    if (game.lastInvalidSwap === key) {
        game.lastInvalidSwap = null;
        showInvalidSwapDialog();
        return;
    }

    game.lastInvalidSwap = key;
}

/**
 * Reset session-level tracking when a successful swap happens, so that
 * "twice the same invalid swap in a row" really means consecutive.
 */
export function clearLastInvalidSwap(game) {
    game.lastInvalidSwap = null;
}
