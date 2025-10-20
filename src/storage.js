// LocalStorage persistence utilities

export function loadNumberBase() {
    const saved = localStorage.getItem("match2048_numberBase");
    return saved ? parseInt(saved, 10) : 2;
}

export function saveNumberBase(numberBase) {
    localStorage.setItem("match2048_numberBase", numberBase.toString());
}

export function loadShowReviewBoard() {
    const saved = localStorage.getItem("match2048_showReviewBoard");
    return saved === null ? true : saved === "true";
}

export function saveShowReviewBoard(showReviewBoard) {
    localStorage.setItem("match2048_showReviewBoard", showReviewBoard.toString());
}

export function loadSpecialTileConfig() {
    const saved = localStorage.getItem("match2048_specialTileConfig");
    if (saved) {
        return JSON.parse(saved);
    }
    // Default configuration: all special tiles disabled
    return {
        line_4: "none",
        block_4: "none",
        line_5: "none",
        t_formation: "none",
        l_formation: "none",
    };
}

export function saveSpecialTileConfig(specialTileConfig) {
    localStorage.setItem("match2048_specialTileConfig", JSON.stringify(specialTileConfig));
}

export function loadCurrentLevel() {
    const savedLevel = localStorage.getItem("match2048_currentLevel");
    return savedLevel ? parseInt(savedLevel, 10) : 1;
}

export function saveCurrentLevel(currentLevel) {
    localStorage.setItem("match2048_currentLevel", currentLevel.toString());
}

export function loadScore() {
    const savedScore = localStorage.getItem("match2048_score");
    return savedScore ? parseInt(savedScore, 10) : 0;
}

export function saveScore(score) {
    localStorage.setItem("match2048_score", score.toString());
}

export function loadUseTestLevels() {
    const saved = localStorage.getItem("match2048_useTestLevels");
    return saved === "true";
}

export function saveUseTestLevels(useTestLevels) {
    localStorage.setItem("match2048_useTestLevels", useTestLevels.toString());
}

export function generateUUID() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );
}

export function loadUserId() {
    let userId = localStorage.getItem("match2048_userId");
    if (!userId) {
        // Generate a random user ID (UUID v4 format)
        userId = generateUUID();
        localStorage.setItem("match2048_userId", userId);
    }
    return userId;
}

/**
 * Load set of already-shown goal dialog types from localStorage
 * @returns {Set<string>} Set of dialog types that have been shown
 */
export function loadShownGoalDialogs() {
    const saved = localStorage.getItem("match2048_shownGoalDialogs");
    if (saved) {
        try {
            return new Set(JSON.parse(saved));
        } catch (e) {
            console.error("Failed to parse shown goal dialogs:", e);
            return new Set();
        }
    }
    return new Set();
}

/**
 * Save a goal dialog type as shown to localStorage
 * @param {string} dialogType - The dialog type to mark as shown
 */
export function saveShownGoalDialog(dialogType) {
    const shown = loadShownGoalDialogs();
    shown.add(dialogType);
    localStorage.setItem("match2048_shownGoalDialogs", JSON.stringify([...shown]));
}

/**
 * Reset all shown goal dialogs (for testing or reset)
 */
export function resetShownGoalDialogs() {
    localStorage.removeItem("match2048_shownGoalDialogs");
}

/**
 * Load the maximum tile levels setting
 * @returns {number|null} Maximum tile levels or null if disabled
 */
export function loadMaxTileLevels() {
    const saved = localStorage.getItem("match2048_maxTileLevels");
    return saved ? parseInt(saved, 10) : null; // null means disabled
}

/**
 * Save the maximum tile levels setting
 * @param {number|null} maxTileLevels - Maximum tile levels or null to disable
 */
export function saveMaxTileLevels(maxTileLevels) {
    if (maxTileLevels === null) {
        localStorage.removeItem("match2048_maxTileLevels");
    } else {
        localStorage.setItem("match2048_maxTileLevels", maxTileLevels.toString());
    }
}

/**
 * Load the smallest tile action setting
 * @returns {string} Action to take with smallest tiles ("disappear", "blocked", "blocked_movable", or "double")
 */
export function loadSmallestTileAction() {
    const saved = localStorage.getItem("match2048_smallestTileAction");
    return saved || "disappear";
}

/**
 * Save the smallest tile action setting
 * @param {string} action - Action to take ("disappear", "blocked", "blocked_movable", or "double")
 */
export function saveSmallestTileAction(action) {
    localStorage.setItem("match2048_smallestTileAction", action);
}
