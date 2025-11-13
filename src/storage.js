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
    if (!userId || userId.length > 36) {
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

/**
 * Load the spawnable tiles start count setting
 * @returns {number[]|null} Array of tile levels or null if disabled (use level defaults)
 */
export function loadSpawnableTilesStartCount() {
    const saved = localStorage.getItem("match2048_spawnableTilesStartCount");
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("Failed to parse spawnable tiles start count:", e);
            return null;
        }
    }
    return null; // null means use level defaults
}

/**
 * Save the spawnable tiles start count setting
 * @param {number[]|null} tiles - Array of tile levels or null to use level defaults
 */
export function saveSpawnableTilesStartCount(tiles) {
    if (tiles === null) {
        localStorage.removeItem("match2048_spawnableTilesStartCount");
    } else {
        localStorage.setItem("match2048_spawnableTilesStartCount", JSON.stringify(tiles));
    }
}

/**
 * Load the power-up rewards mode setting
 * @returns {boolean} Whether power-up rewards mode is enabled
 */
export function loadUsePowerUpRewards() {
    const saved = localStorage.getItem("match2048_usePowerUpRewards");
    return saved === "true";
}

/**
 * Save the power-up rewards mode setting
 * @param {boolean} usePowerUpRewards - Whether power-up rewards mode is enabled
 */
export function saveUsePowerUpRewards(usePowerUpRewards) {
    localStorage.setItem("match2048_usePowerUpRewards", usePowerUpRewards.toString());
}

/**
 * Load the current streak level (0-3)
 * @returns {number} Current streak level
 */
export function loadStreak() {
    const saved = localStorage.getItem("match2048_currentStreak");
    return saved ? parseInt(saved, 10) : 0;
}

/**
 * Save the current streak level
 * @param {number} streak - Current streak level (0-3)
 */
export function saveStreak(streak) {
    localStorage.setItem("match2048_currentStreak", streak.toString());
}

/**
 * Load hearts data (count and last regeneration time)
 * @returns {{hearts: number, lastRegenTime: number}} Hearts data
 */
export function loadHearts() {
    const heartsCount = localStorage.getItem("match2048_hearts");
    const lastRegenTime = localStorage.getItem("match2048_lastRegenTime");

    return {
        hearts: heartsCount ? parseInt(heartsCount, 10) : 5, // Default to 5 hearts
        lastRegenTime: lastRegenTime ? parseInt(lastRegenTime, 10) : Date.now(),
    };
}

/**
 * Save hearts count
 * @param {number} hearts - Current hearts count
 */
export function saveHearts(hearts) {
    localStorage.setItem("match2048_hearts", hearts.toString());
}

/**
 * Save last heart regeneration time
 * @param {number} timestamp - Timestamp in milliseconds
 */
export function saveLastRegenTime(timestamp) {
    localStorage.setItem("match2048_lastRegenTime", timestamp.toString());
}

/**
 * Load the super streak count (10+ levels for board upgrade benefit)
 * @returns {number} Super streak count (0+)
 */
export function loadSuperStreak() {
    const saved = localStorage.getItem("match2048_superStreak");
    return saved ? parseInt(saved, 10) : 0;
}

/**
 * Save the super streak count
 * @param {number} superStreak - Super streak count (0+)
 */
export function saveSuperStreak(superStreak) {
    localStorage.setItem("match2048_superStreak", superStreak.toString());
}
