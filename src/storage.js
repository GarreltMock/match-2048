// LocalStorage persistence utilities

export function loadSpecialTileConfig() {
    const saved = localStorage.getItem("match2048_specialTileConfig_v2");
    if (saved) {
        return JSON.parse(saved);
    }
    // Default configuration
    return {
        line_4: "freeswap_horizontal",
        block_4: "freeswap_horizontal",
        line_5: "joker",
        t_formation: "freeswap",
        l_formation: "freeswap",
    };
}

export function saveSpecialTileConfig(specialTileConfig) {
    localStorage.setItem("match2048_specialTileConfig_v2", JSON.stringify(specialTileConfig));
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

export function loadLevelConfigKey() {
    const saved = localStorage.getItem("match2048_levelConfigKey");
    if (!saved) {
        return "new";
    }
    return saved;
}

export function saveLevelConfigKey(levelConfigKey) {
    localStorage.setItem("match2048_levelConfigKey", levelConfigKey);
}

export function loadRespectsLocks() {
    const saved = localStorage.getItem("match2048_respectLocks");
    // Default to true if not set
    if (saved === null) {
        return true;
    }
    return saved === "true";
}

export function saveRespectsLocks(respectsLocks) {
    localStorage.setItem("match2048_respectLocks", respectsLocks.toString());
}

// Deprecated functions - kept for backwards compatibility but not used
export function loadUseTestLevels() {
    return loadLevelConfigKey() === "test";
}

export function saveUseTestLevels(useTestLevels) {
    saveLevelConfigKey(useTestLevels ? "test" : "main");
}

export function generateUUID() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
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
 * Load the board upgrade action setting
 * @returns {string} Action to take with smallest tiles during board upgrade ("disappear", "blocked", "blocked_movable", or "double")
 */
export function loadBoardUpgradeAction() {
    const saved = localStorage.getItem("match2048_boardUpgradeAction");
    return saved || "blocked_movable";
}

/**
 * Save the board upgrade action setting
 * @param {string} action - Action to take ("disappear", "blocked", "blocked_movable", or "double")
 */
export function saveBoardUpgradeAction(action) {
    localStorage.setItem("match2048_boardUpgradeAction", action);
}

/**
 * Load the super upgrade action setting
 * @returns {string} Action to take with smallest tiles during super streak upgrade ("disappear", "blocked", "blocked_movable", or "double")
 */
export function loadSuperUpgradeAction() {
    const saved = localStorage.getItem("match2048_superUpgradeAction");
    return saved || "disappear";
}

/**
 * Save the super upgrade action setting
 * @param {string} action - Action to take ("disappear", "blocked", "blocked_movable", or "double")
 */
export function saveSuperUpgradeAction(action) {
    localStorage.setItem("match2048_superUpgradeAction", action);
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

/**
 * Load persistent power-up counts (hammer, halve, swap)
 * @returns {{hammer: number, halve: number, swap: number}} Power-up counts
 */
export function loadPowerUpCounts() {
    const hammer = localStorage.getItem("match2048_powerUpHammer");
    const halve = localStorage.getItem("match2048_powerUpHalve");
    const swap = localStorage.getItem("match2048_powerUpSwap");

    // Default to 2 of each if no stored values
    return {
        hammer: hammer !== null ? parseInt(hammer, 10) : 2,
        halve: halve !== null ? parseInt(halve, 10) : 2,
        swap: swap !== null ? parseInt(swap, 10) : 2,
    };
}

/**
 * Save power-up counts to localStorage
 * @param {{hammer: number, halve: number, swap: number}} powerUpCounts - Power-up counts to save
 */
export function savePowerUpCounts(powerUpCounts) {
    localStorage.setItem("match2048_powerUpHammer", powerUpCounts.hammer.toString());
    localStorage.setItem("match2048_powerUpHalve", powerUpCounts.halve.toString());
    localStorage.setItem("match2048_powerUpSwap", powerUpCounts.swap.toString());
}

/**
 * Load coins from localStorage
 * @returns {number} Current coin count
 */
export function loadCoins() {
    const coins = localStorage.getItem("match2048_coins");
    return coins !== null ? parseInt(coins, 10) : 1000; // Default to 1000 coins
}

/**
 * Save coins to localStorage
 * @param {number} coins - Current coin count
 */
export function saveCoins(coins) {
    localStorage.setItem("match2048_coins", coins.toString());
}

/**
 * Load unlocked features from localStorage
 * @returns {Set<string>} Set of unlocked feature keys
 */
export function loadUnlockedFeatures() {
    const stored = localStorage.getItem("match2048_unlockedFeatures");
    return stored ? new Set(JSON.parse(stored)) : new Set();
}

/**
 * Save a newly unlocked feature
 * @param {string} featureKey - The feature key to unlock
 */
export function saveUnlockedFeature(featureKey) {
    const unlocked = loadUnlockedFeatures();
    unlocked.add(featureKey);
    localStorage.setItem("match2048_unlockedFeatures", JSON.stringify([...unlocked]));
}

/**
 * Check if specific feature is unlocked
 * @param {string} featureKey - The feature key to check
 * @returns {boolean} True if feature is unlocked
 */
export function isFeatureUnlocked(featureKey) {
    // Check if feature locks should be respected
    const respectsLocks = loadRespectsLocks();
    if (!respectsLocks) {
        return true; // All features unlocked
    }

    return loadUnlockedFeatures().has(featureKey);
}

/**
 * Reset all unlocked features (for testing/reset functionality)
 */
export function resetUnlockedFeatures() {
    localStorage.removeItem("match2048_unlockedFeatures");
}

/**
 * Load the stored app version from localStorage
 * @returns {string|null} Stored version string (e.g., "0.4.0") or null if not set
 */
export function loadVersion() {
    return localStorage.getItem("match2048_version");
}

/**
 * Save the app version to localStorage
 * @param {string} version - Version string to save (e.g., "0.4.0")
 */
export function saveVersion(version) {
    localStorage.setItem("match2048_version", version);
}

/**
 * Load the hint system enabled setting
 * @returns {boolean} True if hints are enabled (default: true)
 */
export function loadHintsEnabled() {
    const saved = localStorage.getItem("match2048_hintsEnabled");
    // Default to true if not set
    if (saved === null) {
        return true;
    }
    return saved === "true";
}

/**
 * Save the hint system enabled setting
 * @param {boolean} enabled - Whether hints should be enabled
 */
export function saveHintsEnabled(enabled) {
    localStorage.setItem("match2048_hintsEnabled", enabled.toString());
}

/**
 * Load set of already-shown formation tutorials from localStorage
 * @returns {Set<string>} Set of formation types that have been shown
 */
export function loadShownFormationTutorials() {
    const saved = localStorage.getItem("match2048_shownFormationTutorials");
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                return new Set(parsed);
            }
            console.warn("Invalid format for shown formation tutorials in localStorage, resetting value.");
            localStorage.removeItem("match2048_shownFormationTutorials");
            return new Set();
        } catch (e) {
            console.error("Failed to parse shown formation tutorials:", e);
            localStorage.removeItem("match2048_shownFormationTutorials");
            return new Set();
        }
    }
    return new Set();
}

/**
 * Save a formation tutorial type as shown to localStorage
 * @param {string} formationType - The formation type to mark as shown
 */
export function saveShownFormationTutorial(formationType) {
    const shown = loadShownFormationTutorials();
    shown.add(formationType);
    localStorage.setItem("match2048_shownFormationTutorials", JSON.stringify([...shown]));
}

/**
 * Load the formation power-up rewards setting
 * @returns {boolean} True if formation power-up rewards are enabled (default: true)
 */
export function loadFormationPowerUpRewards() {
    const saved = localStorage.getItem("match2048_formationPowerUpRewards");
    // Default to true if not set
    if (saved === null) {
        return false;
    }
    return saved === "true";
}

/**
 * Save the formation power-up rewards setting
 * @param {boolean} enabled - Whether formation power-up rewards should be enabled
 */
export function saveFormationPowerUpRewards(enabled) {
    localStorage.setItem("match2048_formationPowerUpRewards", enabled.toString());
}
