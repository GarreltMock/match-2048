// Main Match3Game class - orchestrates all game modules

import {
    TILE_TYPE,
    SPECIAL_TILE_TYPES,
    FORMATION_TYPES,
    DEFAULT_TILE_VALUES,
    SUPER_STREAK_THRESHOLD,
    LEVELS,
    LEVEL_CONFIGS,
    FEATURE_KEYS,
} from "./config.js";
import {
    loadSpecialTileConfig,
    saveSpecialTileConfig,
    loadCurrentLevel,
    saveCurrentLevel,
    loadScore,
    saveScore,
    loadLevelConfigKey,
    saveLevelConfigKey,
    saveRespectsLocks,
    loadUserId,
    loadBoardUpgradeAction,
    saveBoardUpgradeAction,
    loadSuperUpgradeAction,
    saveSuperUpgradeAction,
    loadStreak,
    saveStreak,
    loadHearts,
    saveHearts,
    saveLastRegenTime,
    loadSuperStreak,
    saveSuperStreak,
    loadPowerUpCounts,
    savePowerUpCounts,
    loadCoins,
    saveCoins,
    isFeatureUnlocked,
    saveUnlockedFeature,
} from "./storage.js";
import { track, cyrb53, trackLevelSolved, trackLevelLost } from "./tracker.js";
import { APP_VERSION } from "./version.js";
import {
    createTile,
    createCursedTile,
    createBlockedTile,
    createBlockedMovableTile,
    isCursed,
    getFontSize,
    getDisplayValue,
} from "./tile-helpers.js";
import { createBoard } from "./board.js";
import { setupEventListeners } from "./input-handler.js";
import {
    hasMatches,
    hasMatchesForSwap,
    findMatches,
    checkTFormation,
    checkLFormation,
    checkBlockFormation,
} from "./match-detector.js";
import { processMatches } from "./merge-processor.js";
import { animateSwap, animateRevert, dropGems } from "./animator.js";
import { renderBoard, renderGoals, renderBoardUpgrades, updateGoalDisplay, updateMovesDisplay } from "./renderer.js";
import {
    checkLevelComplete,
    updateTileCounts,
    countBlockedLevelTiles,
    updateBlockedTileGoals,
    nextLevel,
    restartLevel,
    decrementCursedTileTimers,
} from "./goal-tracker.js";
import {
    showGoalDialog,
    hasDialogBeenShown,
    updateIntroDialogGoalsList,
    showFeatureUnlockDialog,
    hasFeatureBeenUnlocked,
} from "./goal-dialogs.js";
import { showHomeScreen } from "./home-screen.js";
import {
    initTutorial,
    isTutorialActive,
    showTutorialUI,
    isTutorialPowerUpStep,
    isValidTutorialPowerUp,
    updateTutorialUI,
} from "./tutorial.js";

export class Match3Game {
    constructor() {
        // Tile type constants
        this.TILE_TYPE = TILE_TYPE;
        this.board = [];
        this.boardWidth = 8; // Default width, will be updated by loadLevel
        this.boardHeight = 8; // Default height, will be updated by loadLevel
        this.defaultTileValues = DEFAULT_TILE_VALUES; // Internal representation: 1=2, 2=4, 3=8, 4=16
        this.tileValues = this.defaultTileValues;
        this.levelConfigKey = loadLevelConfigKey(); // "main", "test", etc.
        this.score = loadScore();
        this.boardUpgradeAction = loadBoardUpgradeAction(); // "disappear", "blocked", "blocked_movable", or "double"
        this.superUpgradeAction = loadSuperUpgradeAction(); // "disappear", "blocked", "blocked_movable", or "double"
        this.currentStreak = loadStreak(); // 0-3 consecutive wins
        this.superStreak = loadSuperStreak(); // 0+ consecutive wins for super streak

        // Hearts system
        const heartsData = loadHearts();
        this.hearts = heartsData.hearts;
        this.lastRegenTime = heartsData.lastRegenTime;
        this.MAX_HEARTS = 5;
        this.HEART_REGEN_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds

        // Coins system
        this.coins = loadCoins();
        // Ensure coins is always a valid number
        if (isNaN(this.coins) || this.coins === null || this.coins === undefined) {
            this.coins = 2000;
            this.saveCoins();
        }

        this.currentMinTileLevel = null; // Track the minimum tile level currently on board
        this.pendingTileLevelShift = false; // Flag to indicate a shift should happen after first merge
        this.completedUpgrades = []; // Track completed board upgrades for per-level system
        this.selectedGem = null;
        this.isDragging = false;
        this.dragStartPos = null;
        this.animating = false;
        this.lastSwapPosition = null; // Track last swap position for special tile placement and joker activation
        this.isUserSwap = false; // Track if we're processing a user swap
        this.interruptCascade = false; // Flag to interrupt ongoing cascade animations
        this.pendingSwap = null; // Store pending swap when interrupting

        this.currentLevel = loadCurrentLevel();
        this.levelGoals = [];
        this.tileCounts = {};
        this.movesUsed = 0;
        this.maxMoves = 0;
        this.gameActive = true;
        this.extraMovesUsed = false; // Track if extra moves have been used this level

        // Cursed tile tracking
        this.cursedTileCreatedCount = {}; // Track how many tiles of each cursed value have been created
        this.shouldDecrementCursedTimers = false; // Flag to decrement after turn ends
        this.cursedTileCreatedThisTurn = {}; // Track if cursed tile was created this turn for frequency:0

        // Power-up system
        this.activePowerUp = null;
        this.powerUpSwapTiles = [];
        // Load persistent power-up counts from storage (defaults to 2 each on first start)
        this.persistentPowerUpCounts = loadPowerUpCounts();
        // powerUpRemaining will be set per level: persistent + streak bonuses
        this.powerUpRemaining = {
            hammer: 0,
            halve: 0,
            swap: 0,
        };
        // Track extra moves power-ups (separate from persistent and streak bonuses)
        this.extraMovesPowerUpCounts = {
            hammer: 0,
            halve: 0,
            swap: 0,
        };

        // Special tiles configuration
        this.specialTileConfig = loadSpecialTileConfig();
        this.SPECIAL_TILE_TYPES = SPECIAL_TILE_TYPES;
        this.FORMATION_TYPES = FORMATION_TYPES;

        // Match statistics tracking
        this.matchStats = {
            match3Count: 0,
            match4Count: 0,
            match5Count: 0,
            tFormationCount: 0,
            lFormationCount: 0,
            blockFormationCount: 0,
        };

        // Level timing
        this.levelStartTime = null;
        this.settingsChangedDuringLevel = false;

        // Tutorial system
        this.tutorialState = null; // { active: bool, currentStep: number, swaps: array }
        this.tutorialElements = null; // { overlay, hand, hintBox, hintText }

        // Track app start first, before any level is loaded
        track("app_start", {
            current_level: this.currentLevel,
            level_config_key: this.levelConfigKey,
        });

        this.initializeLevels();
        this.setupInfoButton();
        this.setupSettingsButton();
        this.setupExtraMovesDialog();
        this.setupPowerupShop();
        this.setupControlButtons();
        // Setup event listeners once during initialization
        setupEventListeners(this);
        // Don't auto-create/render board - let home screen handle starting the game
    }

    initializeLevels() {
        // Find the level config by key
        const config = LEVEL_CONFIGS.find((c) => c.key === this.levelConfigKey);
        this.levels = config ? config.levels : LEVELS;

        // Save the respectsFeatureLocks setting for this config (in case it wasn't saved before)
        const respectsLocks = config ? config.respectsFeatureLocks : true;
        saveRespectsLocks(respectsLocks);

        this.loadLevel(this.currentLevel);
    }

    /**
     * Regenerate hearts based on time elapsed since last regeneration
     * One heart every 30 minutes
     */
    regenerateHearts() {
        if (this.hearts >= this.MAX_HEARTS) {
            // Already at max, update timestamp
            this.lastRegenTime = Date.now();
            saveLastRegenTime(this.lastRegenTime);
            return;
        }

        const now = Date.now();
        const timeSinceLastRegen = now - this.lastRegenTime;
        const heartsToAdd = Math.floor(timeSinceLastRegen / this.HEART_REGEN_TIME);

        if (heartsToAdd > 0) {
            this.hearts = Math.min(this.hearts + heartsToAdd, this.MAX_HEARTS);
            // Update last regen time, accounting for partial time periods
            this.lastRegenTime += heartsToAdd * this.HEART_REGEN_TIME;

            saveHearts(this.hearts);
            saveLastRegenTime(this.lastRegenTime);
        }
    }

    /**
     * Get time remaining until next heart regenerates
     * @returns {number} Milliseconds until next heart
     */
    getTimeUntilNextHeart() {
        if (this.hearts >= this.MAX_HEARTS) {
            return 0;
        }
        const now = Date.now();
        const timeSinceLastRegen = now - this.lastRegenTime;
        const timeRemaining = this.HEART_REGEN_TIME - (timeSinceLastRegen % this.HEART_REGEN_TIME);
        return timeRemaining;
    }

    /**
     * Decrease hearts by 1 (called on level loss)
     */
    decreaseHeart() {
        if (this.hearts > 0) {
            this.hearts--;
            saveHearts(this.hearts);

            // Start regeneration timer if this was the first heart lost
            if (this.hearts === this.MAX_HEARTS - 1) {
                this.lastRegenTime = Date.now();
                saveLastRegenTime(this.lastRegenTime);
            }
        }
    }

    loadLevel(levelNum) {
        const level = this.levels[levelNum - 1];
        if (!level) return;

        this.currentLevel = levelNum;
        saveCurrentLevel(this.currentLevel); // Save progress to localStorage
        this.levelConfig = level; // Store level config for board.js to access boardPreset
        this.boardWidth = level.boardWidth || 8; // Use level-specific board width or default to 8
        this.boardHeight = level.boardHeight || 8; // Use level-specific board height or default to 8
        this.blockedTiles = level.blockedTiles || []; // Store blocked/goal tile positions (goal tiles have lifeValue)

        // Use level-specific spawnable tiles or default
        this.tileValues = level.spawnableTiles || this.defaultTileValues;

        this.maxMoves = level.maxMoves;
        this.movesUsed = 0;
        this.extraMovesUsed = false; // Reset extra moves flag for new level
        this.heartDecreasedThisAttempt = false; // Reset heart decrease flag for new level

        // Reset extra moves power-up counts for new level
        this.extraMovesPowerUpCounts = {
            hammer: 0,
            halve: 0,
            swap: 0,
        };

        this.initialBlockedTileCount = countBlockedLevelTiles(this);

        this.levelGoals = level.goals.map((goal) => {
            const levelGoal = {
                ...goal,
                current: 0,
                created: 0,
                goalType: goal.goalType || "created", // Default to "created" if not specified
            };

            if (goal.goalType === "blocked") {
                levelGoal.target = this.initialBlockedTileCount;
            }

            return levelGoal;
        });

        // Reset cursed tile tracking for new level
        this.cursedTileCreatedCount = {};
        this.gameActive = true;

        // Reset tile level shift flag
        this.pendingTileLevelShift = false;
        this.completedUpgrades = []; // Reset board upgrade progress for new level

        // Reset match statistics for new level
        this.matchStats = {
            match3Count: 0,
            match4Count: 0,
            match5Count: 0,
            tFormationCount: 0,
            lFormationCount: 0,
            blockFormationCount: 0,
        };

        // Set level start time
        this.levelStartTime = Date.now();
        this.settingsChangedDuringLevel = false; // Reset flag for new level

        renderBoardUpgrades(this);
        renderGoals(this);
        updateMovesDisplay(this);

        // Hide controls and show power-ups at start of level
        this.hideControls();
        this.showPowerUps();

        // Set power-up remaining for level: persistent counts + streak bonuses
        // (Streak bonuses are temporary and not saved to storage)
        this.powerUpRemaining = {
            hammer: this.persistentPowerUpCounts.hammer,
            halve: this.persistentPowerUpCounts.halve,
            swap: this.persistentPowerUpCounts.swap,
        };

        // Apply streak bonus power-ups (temporary for this level only) - only if streak feature is unlocked
        if (isFeatureUnlocked(FEATURE_KEYS.STREAK)) {
            if (this.currentStreak >= 1) {
                this.powerUpRemaining.halve += 1;
            }
            if (this.currentStreak >= 2) {
                this.powerUpRemaining.hammer += 1;
            }
            if (this.currentStreak >= 3) {
                this.powerUpRemaining.swap += 1;
            }
        }

        // Deactivate any power-ups when loading a level
        this.deactivatePowerUp();

        // Update power-up button states
        this.updatePowerUpButtons();

        // Track level started
        track("level_started", {
            level: this.currentLevel,
            board_width: this.boardWidth,
            board_height: this.boardHeight,
            max_moves: this.maxMoves,
            blocked_tile_count: this.initialBlockedTileCount,
            goal_count: this.levelGoals.length,
            spawnable_tiles: this.tileValues.join(","),
        });

        // Initialize tutorial if level has tutorial swaps
        if (level.tutorialSwaps && level.tutorialSwaps.length > 0) {
            initTutorial(this);
        }
    }

    init() {
        this.createBoard();
        this.renderBoard();
        setupEventListeners(this);
        renderBoardUpgrades(this);
        renderGoals(this);
        updateMovesDisplay(this);
        this.showGoalDialogIfNeeded();
        this.checkAndUnlockFeature();

        // Show tutorial UI if active
        if (isTutorialActive(this)) {
            showTutorialUI(this);
        }
    }

    checkAndUnlockFeature() {
        if (!this.levelConfig?.unlockFeature) return;

        // Support both string and array formats
        const features = Array.isArray(this.levelConfig.unlockFeature)
            ? this.levelConfig.unlockFeature
            : [this.levelConfig.unlockFeature];

        // Filter out already unlocked features
        const featuresToUnlock = features.filter((key) => !hasFeatureBeenUnlocked(key));

        if (featuresToUnlock.length === 0) return;

        // Wait a bit to ensure goal dialogs are shown first
        setTimeout(() => {
            // Show unlock dialogs sequentially
            let delay = 0;
            featuresToUnlock.forEach((featureKey) => {
                setTimeout(() => {
                    showFeatureUnlockDialog(featureKey, this, () => {
                        saveUnlockedFeature(featureKey);

                        // Refresh power-up buttons if a power-up was unlocked
                        if (featureKey.startsWith("power_")) {
                            this.updatePowerUpButtons();
                        }
                    });
                }, delay);
                delay += 500; // Stagger dialogs by 500ms
            });
        }, 500);
    }

    setupControlButtons() {
        const restartBtn = document.getElementById("restartBtn");
        const nextBtn = document.getElementById("nextBtn");
        const backBtn = document.getElementById("backBtn");

        if (restartBtn) {
            restartBtn.addEventListener("click", () => {
                // Check if player has hearts to play
                if (this.hearts <= 0) {
                    // No hearts available - show dialog
                    const noHeartsDialog = document.getElementById("noHeartsDialog");
                    if (noHeartsDialog) {
                        noHeartsDialog.classList.remove("hidden");
                    }
                    return;
                }
                this.restartLevel();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", () => {
                this.nextLevel();
            });
        }

        // Setup back button
        if (backBtn) {
            backBtn.addEventListener("click", () => {
                this.showGiveUpDialog();
            });
        }

        // Setup board upgrades click handler to show dialog
        const boardUpgradesContainer = document.getElementById("boardUpgradesContainer");
        if (boardUpgradesContainer) {
            boardUpgradesContainer.addEventListener("click", () => {
                // Only show dialog if level has board upgrades and feature is unlocked
                if (this.levelConfig?.boardUpgrades?.length > 0 && isFeatureUnlocked(FEATURE_KEYS.BOARD_UPGRADES)) {
                    showFeatureUnlockDialog("board_upgrades", this, () => {
                        // Dialog closed, do nothing
                    });
                }
            });
        }

        // Setup give up dialog buttons
        this.setupGiveUpDialog();

        // Setup power-ups
        this.setupPowerUps();
    }

    // Wrapper methods that delegate to imported modules
    createBoard() {
        createBoard(this);
    }

    renderBoard() {
        renderBoard(this);
    }

    hasMatches() {
        return hasMatches(this);
    }

    hasMatchesForSwap(row1, col1, row2, col2) {
        return hasMatchesForSwap(this, row1, col1, row2, col2);
    }

    findMatches() {
        return findMatches(this);
    }

    checkTFormation(row, col, value) {
        return checkTFormation(this, row, col, value);
    }

    checkLFormation(row, col, value) {
        return checkLFormation(this, row, col, value);
    }

    checkBlockFormation(row, col, value) {
        return checkBlockFormation(this, row, col, value);
    }

    processMatches() {
        processMatches(this);
    }

    animateSwap(row1, col1, row2, col2, callback) {
        animateSwap(this, row1, col1, row2, col2, callback);
    }

    animateRevert(row1, col1, row2, col2) {
        animateRevert(this, row1, col1, row2, col2);
    }

    dropGems() {
        dropGems(this);
    }

    updateGoalDisplay(checkComplete = false) {
        updateGoalDisplay(this, checkComplete);
    }

    updateMovesDisplay() {
        updateMovesDisplay(this);
    }

    checkLevelComplete() {
        checkLevelComplete(this);
    }

    updateTileCounts() {
        updateTileCounts(this);
    }

    updateBlockedTileGoals() {
        updateBlockedTileGoals(this);
    }

    decrementCursedTileTimers() {
        decrementCursedTileTimers(this);
    }

    nextLevel() {
        nextLevel(this);
    }

    restartLevel() {
        restartLevel(this);
    }

    startLevel() {
        // Load current level and start the game
        this.loadLevel(this.currentLevel);
        this.createBoard();
        this.renderBoard();
        renderBoardUpgrades(this);
        renderGoals(this);
        updateMovesDisplay(this);
        this.showGoalDialogIfNeeded();
        this.checkAndUnlockFeature();

        // Show tutorial UI if active
        if (isTutorialActive(this)) {
            showTutorialUI(this);
        }
    }

    saveScore() {
        saveScore(this.score);
    }

    saveCoins() {
        // Prevent saving invalid coin values
        if (isNaN(this.coins) || this.coins === null || this.coins === undefined || this.coins < 0) {
            this.coins = 2000; // Reset to default
        }
        saveCoins(this.coins);
    }

    updateCoinsDisplays() {
        // Ensure coins is a valid number
        if (isNaN(this.coins) || this.coins === null || this.coins === undefined) {
            this.coins = 2000;
            this.saveCoins();
        }

        const formattedCoins = Number(this.coins).toLocaleString();

        const coinsHTML = `
            <img src="assets/shop/coin.png" class="coin-icon" alt="Coins" />
            <div class="coin-count">${formattedCoins}</div>
        `;

        // Update home screen coins display
        const coinsDisplay = document.getElementById("coins-display");
        if (coinsDisplay) {
            coinsDisplay.innerHTML = coinsHTML;
        }

        // Update extra moves dialog coins display
        const extraMovesCoinsDisplay = document.getElementById("extra-moves-coins-display");
        if (extraMovesCoinsDisplay) {
            extraMovesCoinsDisplay.innerHTML = coinsHTML;
        }

        // Update shop coins display
        const shopCoinsDisplay = document.getElementById("shop-coins-display");
        if (shopCoinsDisplay) {
            shopCoinsDisplay.innerHTML = `
                <img src="assets/shop/coin.png" class="coin-icon" alt="Coins" />
                <span class="coin-count">${formattedCoins}</span>
            `;
        }

        // Update powerup shop coins display
        const powerupShopCoinsDisplay = document.getElementById("powerup-shop-coins-display");
        if (powerupShopCoinsDisplay) {
            powerupShopCoinsDisplay.innerHTML = coinsHTML;
        }
    }

    showGoalDialogIfNeeded() {
        // Check if levelConfig exists and has a dialog to show
        if (!this.levelConfig) return;

        const dialogType = this.levelConfig.showGoalDialog;
        if (!dialogType) return;

        // Check if we've already shown this dialog type
        if (hasDialogBeenShown(dialogType)) return;

        // Show the dialog with game instance for goal visuals
        showGoalDialog(dialogType, this, () => {
            // Dialog closed, game can continue
        });
    }

    // Power-up methods
    setupPowerUps() {
        const powerUpButtons = document.querySelectorAll(".power-up-btn");

        powerUpButtons.forEach((button) => {
            button.addEventListener("click", () => {
                if (!this.gameActive) return;

                const powerUpType = button.dataset.powerup;
                const featureKey = `power_${powerUpType}`;

                // Check if power-up is unlocked
                if (!isFeatureUnlocked(featureKey)) {
                    return; // Ignore clicks on locked power-ups
                }

                // Check if power-up has uses remaining
                if (this.powerUpRemaining[powerUpType] <= 0) {
                    // Open powerup shop instead
                    this.openPowerupShop();
                    return;
                }

                // Tutorial validation - only allow the specified power-up
                if (isTutorialActive(this) && isTutorialPowerUpStep(this)) {
                    if (!isValidTutorialPowerUp(this, powerUpType)) {
                        return; // Block clicking non-tutorial power-ups
                    }
                }

                if (this.activePowerUp === powerUpType) {
                    // Deselect power-up
                    this.deactivatePowerUp();
                } else {
                    // Select power-up
                    this.activatePowerUp(powerUpType);
                }
            });
        });
    }

    activatePowerUp(type) {
        // Block power-ups during tutorial (except during power-up tutorial steps)
        if (isTutorialActive(this) && !isTutorialPowerUpStep(this)) {
            return;
        }

        this.deactivatePowerUp(); // Clear any active power-up first
        this.activePowerUp = type;
        this.powerUpSwapTiles = [];

        // Add visual feedback
        const button = document.querySelector(`[data-powerup="${type}"]`);
        if (button) {
            button.classList.add("active");
        }

        // Update tutorial UI to show next step (tap on target tile)
        if (isTutorialActive(this) && isTutorialPowerUpStep(this)) {
            updateTutorialUI(this);
        }
    }

    deactivatePowerUp() {
        if (this.activePowerUp) {
            const button = document.querySelector(`[data-powerup="${this.activePowerUp}"]`);
            if (button) {
                button.classList.remove("active");
            }
        }

        this.activePowerUp = null;
        this.powerUpSwapTiles = [];
    }

    showPowerUps() {
        const powerUpsContainer = document.querySelector(".power-ups");
        if (powerUpsContainer) {
            powerUpsContainer.style.visibility = "visible";
        }
    }

    hidePowerUps() {
        const powerUpsContainer = document.querySelector(".power-ups");
        if (powerUpsContainer) {
            powerUpsContainer.style.visibility = "hidden";
        }
    }

    showControls() {
        const controlsContainer = document.querySelector(".controls");
        if (controlsContainer) {
            controlsContainer.style.display = "flex";
        }
    }

    hideControls() {
        const controlsContainer = document.querySelector(".controls");
        if (controlsContainer) {
            controlsContainer.style.display = "none";
        }
    }

    updatePowerUpButtons() {
        const powerUpButtons = document.querySelectorAll(".power-up-btn");

        powerUpButtons.forEach((button) => {
            const powerUpType = button.dataset.powerup;
            const featureKey = `power_${powerUpType}`;

            // Check if power-up is unlocked
            if (!isFeatureUnlocked(featureKey)) {
                button.classList.add("locked");
                button.disabled = true;
                button.title = "Unlock by progressing through levels";
                // Remove any existing indicators
                const existingIndicator = button.querySelector(".use-indicator");
                if (existingIndicator) {
                    existingIndicator.remove();
                }
                return;
            }

            // Power-up is unlocked - show normal state
            button.classList.remove("locked");
            button.disabled = false;

            const usesLeft = this.powerUpRemaining[powerUpType];
            const persistentUses = this.persistentPowerUpCounts[powerUpType];
            const extraMovesUses = this.extraMovesPowerUpCounts[powerUpType];

            // Check if this power-up has extra moves bonus
            const hasExtraMovesBonus = extraMovesUses > 0;
            // Check if this power-up has a streak bonus (more uses than persistent + extra moves)
            const hasStreakBonus = usesLeft > persistentUses + extraMovesUses;

            // Remove existing use indicators
            const existingIndicator = button.querySelector(".use-indicator");
            if (existingIndicator) {
                existingIndicator.remove();
            }

            // Check if button should be disabled
            const shouldDisable = usesLeft <= 0;

            if (usesLeft <= 0) {
                // Power-up is used up - add can-purchase indicator
                button.classList.add("can-purchase");
                button.title = `${button.title.split(" - ")[0]} - Click to buy more`;
            } else {
                // Power-up has uses left - remove can-purchase indicator and show the use count
                button.classList.remove("can-purchase");
                // Add use indicator
                const indicator = document.createElement("div");
                indicator.className = "use-indicator";

                if (hasExtraMovesBonus) {
                    // Show extra moves icon instead of number
                    const strokedText = document.createElement("stroked-text");
                    strokedText.setAttribute("text", "⏩");
                    strokedText.setAttribute("font-size", "26");
                    strokedText.setAttribute("width", "40");
                    strokedText.setAttribute("height", "40");
                    strokedText.setAttribute("svg-style", "width: 100%; height: 100%;");
                    indicator.classList.add("extra-moves-bonus");
                    indicator.appendChild(strokedText);
                } else if (hasStreakBonus) {
                    // Show streak icon instead of number
                    const strokedText = document.createElement("stroked-text");
                    strokedText.setAttribute("text", "🔥");
                    strokedText.setAttribute("font-size", "26");
                    strokedText.setAttribute("width", "40");
                    strokedText.setAttribute("height", "40");
                    strokedText.setAttribute("svg-style", "width: 100%; height: 100%;");
                    indicator.classList.add("streak-bonus");
                    indicator.appendChild(strokedText);
                } else {
                    // Show regular use count
                    const strokedText = document.createElement("stroked-text");
                    strokedText.setAttribute("text", usesLeft);
                    strokedText.setAttribute("font-size", "26");
                    strokedText.setAttribute("width", "40");
                    strokedText.setAttribute("height", "40");
                    strokedText.setAttribute("svg-style", "width: 100%; height: 100%;");
                    indicator.appendChild(strokedText);
                }

                button.appendChild(indicator);

                // Check if temporarily disabled due to one-per-swap rule
                if (shouldDisable) {
                    button.classList.add("disabled");
                    button.title = `${button.title.split(" - ")[0]} - Make a swap to use power-ups again`;
                } else {
                    button.classList.remove("disabled");
                    // Update title
                    const baseTitle = button.title.split(" - ")[0];
                    if (hasExtraMovesBonus) {
                        button.title = `${baseTitle} - Extra moves bonus available!`;
                    } else if (hasStreakBonus) {
                        button.title = `${baseTitle} - Streak bonus available!`;
                    } else {
                        button.title = `${baseTitle} - ${usesLeft} uses left`;
                    }
                }
            }
        });
    }

    handlePowerUpAction(row, col, element) {
        const tile = this.board[row][col];

        switch (this.activePowerUp) {
            case "hammer":
                // Hammer only works on normal tiles (not on any blocked tiles)
                if (!tile || (tile.type !== TILE_TYPE.NORMAL && tile.type !== TILE_TYPE.BLOCKED_MOVABLE)) return;
                this.usePowerUpHammer(row, col, element);
                break;
            case "halve":
                this.usePowerUpHalve(row, col, element);
                break;
            case "swap":
                // For swap, we want to use normal drag behavior
                // So we don't handle it here, just return to allow normal drag
                return false;
        }
    }

    usePowerUpHammer(row, col, element) {
        // Decrement remaining count
        this.powerUpRemaining.hammer--;

        // Consumption priority: extra moves bonus > streak bonus > persistent count
        // Only decrement persistent count if we're consuming from it
        if (this.extraMovesPowerUpCounts.hammer > 0) {
            // Consume extra moves bonus first
            this.extraMovesPowerUpCounts.hammer--;
        } else if (this.powerUpRemaining.hammer < this.persistentPowerUpCounts.hammer) {
            // We're consuming from persistent count (streak is gone)
            this.persistentPowerUpCounts.hammer = Math.max(0, this.persistentPowerUpCounts.hammer - 1);
            savePowerUpCounts(this.persistentPowerUpCounts);
        }
        // Otherwise we're consuming a streak bonus (which is temporary and not persisted)

        this.updatePowerUpButtons();

        // Track power-up usage
        track("power_up_used", {
            level: this.currentLevel,
            power_up_type: "hammer",
            remaining_moves: this.maxMoves - this.movesUsed,
            uses_remaining: this.powerUpRemaining.hammer,
        });

        // Block interactions during animation
        this.animating = true;

        // Animate the tile shrinking away
        element.style.transition = "transform 0.3s ease, opacity 0.3s ease";
        element.style.opacity = "0";
        element.style.transform = "scale(0)";

        setTimeout(() => {
            // Remove the tile from the board state
            this.board[row][col] = null;

            // Let dropGems handle the DOM updates via renderBoard
            this.dropGems();
            this.deactivatePowerUp();
        }, 300);
    }

    usePowerUpHalve(row, col, element) {
        const tile = this.board[row][col];
        const isCursedTile = isCursed(tile);
        const currentValue = tile && (tile.type === TILE_TYPE.NORMAL || isCursedTile) ? tile.value : null;

        if (currentValue && currentValue > 1) {
            // Decrement remaining count
            this.powerUpRemaining.halve--;

            // Consumption priority: extra moves bonus > streak bonus > persistent count
            // Only decrement persistent count if we're consuming from it
            if (this.extraMovesPowerUpCounts.halve > 0) {
                // Consume extra moves bonus first
                this.extraMovesPowerUpCounts.halve--;
            } else if (this.powerUpRemaining.halve < this.persistentPowerUpCounts.halve) {
                // We're consuming from persistent count (streak is gone)
                this.persistentPowerUpCounts.halve = Math.max(0, this.persistentPowerUpCounts.halve - 1);
                savePowerUpCounts(this.persistentPowerUpCounts);
            }
            // Otherwise we're consuming a streak bonus (which is temporary and not persisted)

            this.updatePowerUpButtons();

            // Track power-up usage
            track("power_up_used", {
                level: this.currentLevel,
                power_up_type: "halve",
                remaining_moves: this.maxMoves - this.movesUsed,
                uses_remaining: this.powerUpRemaining.halve,
            });

            // Block interactions during animation
            this.animating = true;

            // Decrement by 1 to go to previous level (halving in display terms)
            const halvedValue = currentValue - 1;

            // If tile is cursed, keep it cursed but halve the value
            if (isCursedTile) {
                this.board[row][col] = createCursedTile(halvedValue, tile.cursedMovesRemaining);
            } else {
                this.board[row][col] = createTile(halvedValue);
            }

            // Track goal progress for the newly created tile (via merge-processor)
            this.levelGoals.forEach((goal) => {
                if (goal.tileValue === halvedValue) {
                    goal.created += 1;
                }
            });

            // Update the visual element with proper rendering
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

            // Add animation effect
            element.style.transform = "scale(1.2)";
            setTimeout(() => {
                element.style.transform = "scale(1)";

                // Update goal display without checking completion
                // Let the natural cascade completion handle checkLevelComplete
                this.updateGoalDisplay(false);

                // Process any matches after halving
                setTimeout(() => {
                    this.animating = false; // Allow interactions again
                    this.processMatches();
                }, 100);
            }, 200);

            this.deactivatePowerUp();
        }
    }

    setupExtraMovesDialog() {
        const extraMovesDialog = document.getElementById("extraMovesDialog");
        const extraMoves5Btn = document.getElementById("extraMoves5");
        const extraMoves5WithSwapBtn = document.getElementById("extraMoves5WithSwap");
        const loseProgressBtn = document.getElementById("loseProgress");
        const showBoardBtn = document.getElementById("showBoardBtn");
        const continueBtn = document.getElementById("continueBtn");

        if (extraMoves5Btn) {
            extraMoves5Btn.addEventListener("click", () => {
                const EXTRA_MOVES_COST = 900;

                // Check if player has enough coins
                if (this.coins >= EXTRA_MOVES_COST) {
                    // Deduct coins
                    this.coins -= EXTRA_MOVES_COST;
                    this.saveCoins();

                    // Track extra moves usage
                    track("extra_moves_used", {
                        level: this.currentLevel,
                        extra_moves_count: 5,
                        included_powerups: true,
                        moves_used: this.movesUsed,
                    });

                    // Mark that extra moves have been used for this level
                    this.extraMovesUsed = true;

                    this.maxMoves += 5;

                    // Add one of each power-up (temporary for this level only, like streak bonuses)
                    this.powerUpRemaining.hammer++;
                    this.powerUpRemaining.halve++;
                    this.powerUpRemaining.swap++;

                    // Track that these came from extra moves (not persisted)
                    this.extraMovesPowerUpCounts.hammer++;
                    this.extraMovesPowerUpCounts.halve++;
                    this.extraMovesPowerUpCounts.swap++;

                    this.updatePowerUpButtons();

                    this.updateMovesDisplay();
                    extraMovesDialog.classList.add("hidden");
                    this.hideControls();
                    this.gameActive = true;
                    this.showPowerUps();

                    // Update coins display
                    this.updateCoinsDisplays();
                } else {
                    // Not enough coins - open shop instead
                    // extraMovesDialog.classList.add("hidden");
                    const shopDialog = document.getElementById("shopDialog");
                    if (shopDialog) {
                        shopDialog.classList.remove("hidden");
                        // Update shop coins display
                        this.updateCoinsDisplays();
                    }
                }
            });
        }

        if (extraMoves5WithSwapBtn) {
            extraMoves5WithSwapBtn.addEventListener("click", () => {
                // Track extra moves usage
                track("extra_moves_used", {
                    level: this.currentLevel,
                    extra_moves_count: 5,
                    included_swap: true,
                    moves_used: this.movesUsed,
                });

                // Mark that extra moves have been used for this level
                this.extraMovesUsed = true;

                this.maxMoves += 5;
                this.powerUpRemaining.swap++; // Add one use back
                this.persistentPowerUpCounts.swap++; // Also increment persistent count
                savePowerUpCounts(this.persistentPowerUpCounts);
                this.updatePowerUpButtons();
                this.updateMovesDisplay();
                extraMovesDialog.classList.add("hidden");
                this.hideControls();
                this.gameActive = true;
                this.showPowerUps();
            });
        }

        const giveUpWarning = document.getElementById("giveUpWarning");
        const giveUpWarningText = document.getElementById("giveUpWarningText");
        const confirmGiveUpBtn = document.getElementById("confirmGiveUp");
        const cancelGiveUpBtn = document.getElementById("cancelGiveUp");

        if (loseProgressBtn) {
            loseProgressBtn.addEventListener("click", () => {
                // Build warning message
                let warningText = "<h2>You will lose:</h2>";
                warningText += "<p>1 ♥️ Heart</p>";
                if (this.currentStreak > 0) {
                    warningText += `<p>+ 🔥 Your Streak</p>`;
                }
                if (this.superStreak >= SUPER_STREAK_THRESHOLD) {
                    warningText += `<p>+ <img style="display: inline-block; height: 1.3rem; vertical-align: sub" src="assets/upgrade-icon_streak.png" alt="Super Upgrade" /> Super Upgrade</p>`;
                }

                // Show warning box
                giveUpWarningText.innerHTML = warningText;
                giveUpWarning.classList.remove("hidden");
                loseProgressBtn.style.display = "none";
            });
        }

        if (confirmGiveUpBtn) {
            confirmGiveUpBtn.addEventListener("click", () => {
                // Hide warning and dialog
                giveUpWarning.classList.add("hidden");
                loseProgressBtn.style.display = "block";
                extraMovesDialog.classList.add("hidden");
                this.hideControls();

                // Show level failed state
                setTimeout(() => {
                    this.showLevelFailed();
                }, 300);
            });
        }

        if (cancelGiveUpBtn) {
            cancelGiveUpBtn.addEventListener("click", () => {
                // Hide warning, show give up button again
                giveUpWarning.classList.add("hidden");
                loseProgressBtn.style.display = "block";
            });
        }

        if (showBoardBtn) {
            showBoardBtn.addEventListener("click", () => {
                extraMovesDialog.classList.add("hidden");
                this.showControls();

                // Show only continue button
                const continueBtn = document.getElementById("continueBtn");
                const nextBtn = document.getElementById("nextBtn");
                const restartBtn = document.getElementById("restartBtn");
                if (continueBtn) continueBtn.style.display = "inline-block";
                if (nextBtn) nextBtn.style.display = "none";
                if (restartBtn) restartBtn.style.display = "none";
            });
        }

        if (continueBtn) {
            continueBtn.addEventListener("click", () => {
                this.showExtraMovesDialog();
            });
        }
    }

    showExtraMovesDialog() {
        const extraMovesDialog = document.getElementById("extraMovesDialog");
        const showBoardBtn = document.getElementById("showBoardBtn");

        // Always show the review board button
        if (showBoardBtn) {
            showBoardBtn.classList.remove("hidden");
        }

        // Update coins display
        this.updateCoinsDisplays();

        extraMovesDialog.classList.remove("hidden");
    }

    showGiveUpDialog() {
        const giveUpDialog = document.getElementById("giveUpDialog");
        const streakDisplay = document.getElementById("giveUpStreakDisplay");

        // Build streak display
        let streaksHTML = "";

        if (isFeatureUnlocked(FEATURE_KEYS.STREAK) && this.currentStreak > 0) {
            streaksHTML += `<div class="streak-item"><span>🔥</span><span>Your ${this.currentStreak}-win streak</span></div>`;
        }

        if (this.superStreak >= SUPER_STREAK_THRESHOLD) {
            streaksHTML += `<div class="streak-item"><img src="assets/upgrade-icon_streak.png" alt="Super Upgrade" /><span>Super Upgrade</span></div>`;
        }

        if (streakDisplay) {
            streakDisplay.innerHTML = streaksHTML;
        }

        if (giveUpDialog) {
            giveUpDialog.classList.remove("hidden");
        }
    }

    setupGiveUpDialog() {
        const giveUpDialog = document.getElementById("giveUpDialog");
        const cancelGiveUpBtn = document.getElementById("cancelGiveUpBtn");
        const confirmGiveUpBtnDialog = document.getElementById("confirmGiveUpBtnDialog");

        if (cancelGiveUpBtn) {
            cancelGiveUpBtn.addEventListener("click", () => {
                giveUpDialog.classList.add("hidden");
            });
        }

        if (confirmGiveUpBtnDialog) {
            confirmGiveUpBtnDialog.addEventListener("click", () => {
                giveUpDialog.classList.add("hidden");

                // Go back to home screen
                setTimeout(() => {
                    // Decrease heart
                    if (!this.heartDecreasedThisAttempt) {
                        this.decreaseHeart();
                        this.heartDecreasedThisAttempt = true;
                    }

                    // Reset streak on give up - only if streak feature is unlocked
                    if (isFeatureUnlocked(FEATURE_KEYS.STREAK)) {
                        this.currentStreak = 0;
                        saveStreak(this.currentStreak);
                    }

                    if (this.superStreak >= SUPER_STREAK_THRESHOLD) {
                        // Reset super streak on give up
                        this.superStreak = 0;
                        saveSuperStreak(this.superStreak);
                    }

                    // Track that player gave up
                    track("level_gave_up", {
                        level: this.currentLevel,
                        moves_used: this.movesUsed,
                        max_moves: this.maxMoves,
                    });

                    // Show home screen with updated displays (hearts, streaks, etc.)
                    showHomeScreen(this);
                }, 100);
            });
        }

        // Click outside to close
        if (giveUpDialog) {
            giveUpDialog.addEventListener("click", (e) => {
                if (e.target === giveUpDialog) {
                    giveUpDialog.classList.add("hidden");
                }
            });
        }
    }

    setupPowerupShop() {
        const powerupShopDialog = document.getElementById("powerupShopDialog");
        const closePowerupShopBtn = document.getElementById("closePowerupShopBtn");
        const powerupBuyButtons = document.querySelectorAll(".powerup-buy-btn");

        // Close button handler
        if (closePowerupShopBtn) {
            closePowerupShopBtn.addEventListener("click", () => {
                powerupShopDialog.classList.add("hidden");
            });
        }

        // Click outside to close
        if (powerupShopDialog) {
            powerupShopDialog.addEventListener("click", (e) => {
                if (e.target === powerupShopDialog) {
                    powerupShopDialog.classList.add("hidden");
                }
            });
        }

        // Purchase button handlers
        powerupBuyButtons.forEach((button) => {
            // Store original button HTML for restoration
            const originalHTML = button.innerHTML;
            let isPurchasing = false;

            button.addEventListener("click", (e) => {
                e.stopPropagation();

                // Prevent double-clicking during animation
                if (isPurchasing) return;

                const shopItem = button.closest(".powerup-shop-item");
                const powerupType = shopItem.getAttribute("data-powerup");
                const cost = parseInt(shopItem.getAttribute("data-cost"));

                // Validate cost and coins
                if (isNaN(cost) || isNaN(this.coins)) {
                    return;
                }

                // Check if player has enough coins
                if (this.coins >= cost) {
                    isPurchasing = true;

                    // Deduct coins
                    this.coins = Number(this.coins) - Number(cost);
                    this.saveCoins();

                    // Add one use to the powerup
                    this.powerUpRemaining[powerupType]++;
                    this.persistentPowerUpCounts[powerupType]++;
                    savePowerUpCounts(this.persistentPowerUpCounts);

                    // Update powerup buttons to show new count
                    this.updatePowerUpButtons();

                    // Update coins display
                    this.updateCoinsDisplays();

                    // Show purchase feedback
                    const originalBg = button.style.background;
                    button.textContent = "✓";
                    button.style.background = "#8bc34a";
                    setTimeout(() => {
                        button.innerHTML = originalHTML;
                        button.style.background = originalBg;
                        isPurchasing = false;
                    }, 1500);
                } else {
                    // Not enough coins - close powerup shop and open coin shop
                    const shopDialog = document.getElementById("shopDialog");
                    if (shopDialog) {
                        shopDialog.classList.remove("hidden");
                        this.updateCoinsDisplays();
                    }
                }
            });
        });
    }

    openPowerupShop() {
        const powerupShopDialog = document.getElementById("powerupShopDialog");
        if (powerupShopDialog) {
            this.updateCoinsDisplays();
            powerupShopDialog.classList.remove("hidden");
        }
    }

    showLevelSolved() {
        // Track level_solved when level solved screen is shown
        trackLevelSolved(this);

        const levelSolvedSvg = document.getElementById("levelSolvedSvg");
        const levelFailedSvg = document.getElementById("levelFailedSvg");

        if (levelFailedSvg) {
            levelFailedSvg.style.visibility = "hidden";
        }
        if (levelSolvedSvg) {
            levelSolvedSvg.style.visibility = "visible";
            // Trigger animation by adding class
            levelSolvedSvg.classList.remove("animate");
            // Force reflow to restart animation
            void levelSolvedSvg.offsetWidth;
            levelSolvedSvg.classList.add("animate");
        }
    }

    hideLevelSolved() {
        const levelSolvedSvg = document.getElementById("levelSolvedSvg");

        if (levelSolvedSvg) {
            levelSolvedSvg.style.visibility = "hidden";
            levelSolvedSvg.classList.remove("animate");
        }
    }

    showLevelFailed() {
        // Decrease hearts on level loss (if not already decreased)
        // This handles both: giving up and running out of moves after extra moves
        if (!this.heartDecreasedThisAttempt) {
            this.decreaseHeart();
            this.heartDecreasedThisAttempt = true;
        }

        // Reset streak on level loss - only if streak feature is unlocked
        if (isFeatureUnlocked(FEATURE_KEYS.STREAK)) {
            this.currentStreak = 0;
            saveStreak(this.currentStreak);
        }

        if (this.superStreak >= SUPER_STREAK_THRESHOLD) {
            // Reset super streak on level loss
            this.superStreak = 0;
            saveSuperStreak(this.superStreak);
        }

        // Track level_lost when level failed screen is shown
        trackLevelLost(this);

        const levelSolvedSvg = document.getElementById("levelSolvedSvg");
        const levelFailedSvg = document.getElementById("levelFailedSvg");
        const restartBtn = document.getElementById("restartBtn");
        const nextBtn = document.getElementById("nextBtn");
        const continueBtn = document.getElementById("continueBtn");

        if (levelSolvedSvg) {
            levelSolvedSvg.style.visibility = "hidden";
        }
        if (levelFailedSvg) {
            levelFailedSvg.style.visibility = "visible";
            // Trigger animation by adding class
            levelFailedSvg.classList.remove("animate");
            // Force reflow to restart animation
            void levelFailedSvg.offsetWidth;
            levelFailedSvg.classList.add("animate");
        }

        // Show controls and only show restart button
        this.showControls();
        if (restartBtn) restartBtn.style.display = "inline-block";
        if (nextBtn) nextBtn.style.display = "none";
        if (continueBtn) continueBtn.style.display = "none";
    }

    hideLevelFailed() {
        const levelFailedSvg = document.getElementById("levelFailedSvg");

        if (levelFailedSvg) {
            levelFailedSvg.style.visibility = "hidden";
            levelFailedSvg.classList.remove("animate");
        }
    }

    setupSettingsButton() {
        const homeTitle = document.getElementById("homeTitle");
        const settingsDialog = document.getElementById("settingsDialog");
        const saveSettingsBtn = document.getElementById("saveSettings");
        const levelSelect = document.getElementById("levelSelect");
        const levelConfigSelect = document.getElementById("levelConfigSelect");
        const boardUpgradeActionSelect = document.getElementById("boardUpgradeAction");
        const superUpgradeActionSelect = document.getElementById("superUpgradeAction");
        let selectedLevelConfigKey = this.levelConfigKey;

        // Special tile reward selects
        const line4Select = document.getElementById("line4Reward");
        const block4Select = document.getElementById("block4Reward");
        const line5Select = document.getElementById("line5Reward");
        const tFormationSelect = document.getElementById("tFormationReward");
        const lFormationSelect = document.getElementById("lFormationReward");

        // Function to toggle power-up options visibility
        const togglePowerUpOptions = (show) => {
            const powerupOptions = document.querySelectorAll(".powerup-option");
            const regularOptions = document.querySelectorAll(".regular-option");
            const regularHelp = document.querySelector(".special-tile-help:not(.powerup-help)");
            const powerupHelp = document.querySelector(".special-tile-help.powerup-help");

            // Show/hide power-up options
            powerupOptions.forEach((option) => {
                option.style.display = show ? "block" : "none";
            });

            // Show/hide regular special tile options
            regularOptions.forEach((option) => {
                option.style.display = show ? "none" : "block";
            });

            // Show/hide help text
            if (regularHelp) regularHelp.style.display = show ? "none" : "block";
            if (powerupHelp) powerupHelp.style.display = show ? "block" : "none";
        };

        // Function to populate level selector based on current levels
        const populateLevelSelect = () => {
            if (levelSelect) {
                levelSelect.innerHTML = "";
                for (let i = 1; i <= this.levels.length; i++) {
                    const option = document.createElement("option");
                    option.value = i;
                    const levelConfig = this.levels[i - 1];
                    option.textContent = levelConfig.title ? `Level ${i} - ${levelConfig.title}` : `Level ${i}`;
                    levelSelect.appendChild(option);
                }
            }
        };

        // Function to populate level config selector
        const populateLevelConfigSelect = () => {
            if (levelConfigSelect) {
                levelConfigSelect.innerHTML = "";
                LEVEL_CONFIGS.forEach((config) => {
                    const option = document.createElement("option");
                    option.value = config.key;
                    option.textContent = config.name;
                    levelConfigSelect.appendChild(option);
                });
            }
        };

        // Populate selectors initially
        populateLevelConfigSelect();
        populateLevelSelect();

        // Handle level config dropdown change
        if (levelConfigSelect) {
            levelConfigSelect.addEventListener("change", () => {
                selectedLevelConfigKey = levelConfigSelect.value;
                const config = LEVEL_CONFIGS.find((c) => c.key === selectedLevelConfigKey);
                this.levels = config ? config.levels : LEVELS;
                populateLevelSelect();
                if (levelSelect) {
                    levelSelect.value = "1"; // Reset to level 1 when switching
                }
            });
        }

        const openSettings = () => {
            // Repopulate level selector in case levels changed
            populateLevelSelect();

            // Set current values
            if (levelSelect) {
                // Ensure current level is valid for current level set
                const maxLevel = this.levels.length;
                if (this.currentLevel > maxLevel) {
                    this.currentLevel = 1;
                }
                levelSelect.value = this.currentLevel.toString();
            }
            levelConfigSelect.value = selectedLevelConfigKey;
            boardUpgradeActionSelect.value = this.boardUpgradeAction;
            superUpgradeActionSelect.value = this.superUpgradeAction;

            // Always show regular options (power-up rewards mode is removed)
            togglePowerUpOptions(false);

            // Set special tile configuration values
            line4Select.value = this.specialTileConfig.line_4;
            block4Select.value = this.specialTileConfig.block_4;
            line5Select.value = this.specialTileConfig.line_5;
            tFormationSelect.value = this.specialTileConfig.t_formation;
            lFormationSelect.value = this.specialTileConfig.l_formation;

            // Display user ID
            const userIdDisplay = document.getElementById("userIdDisplay");
            if (userIdDisplay) {
                userIdDisplay.textContent = cyrb53(loadUserId());
            }

            // Display version
            const versionDisplay = document.getElementById("versionDisplay");
            if (versionDisplay) {
                versionDisplay.textContent = APP_VERSION;
            }

            // Setup copy button
            const copyUserIdBtn = document.getElementById("copyUserIdBtn");
            if (copyUserIdBtn && userIdDisplay) {
                // Remove any existing event listeners by cloning
                const newCopyBtn = copyUserIdBtn.cloneNode(true);
                copyUserIdBtn.parentNode.replaceChild(newCopyBtn, copyUserIdBtn);

                newCopyBtn.addEventListener("click", async () => {
                    try {
                        await navigator.clipboard.writeText(userIdDisplay.textContent);
                        newCopyBtn.textContent = "Copied!";
                        setTimeout(() => {
                            newCopyBtn.textContent = "Copy";
                        }, 2000);
                    } catch (err) {
                        console.error("Failed to copy:", err);
                        newCopyBtn.textContent = "Failed";
                        setTimeout(() => {
                            newCopyBtn.textContent = "Copy";
                        }, 2000);
                    }
                });
            }

            settingsDialog.classList.remove("hidden");
        };

        if (homeTitle && settingsDialog) {
            homeTitle.addEventListener("click", openSettings);

            // Save settings
            if (saveSettingsBtn) {
                saveSettingsBtn.addEventListener("click", () => {
                    // Check if level changed
                    let levelChanged = false;
                    let levelSetChanged = false;

                    // Save level config preference first
                    if (selectedLevelConfigKey !== this.levelConfigKey) {
                        this.levelConfigKey = selectedLevelConfigKey;
                        const config = LEVEL_CONFIGS.find((c) => c.key === this.levelConfigKey);
                        const respectsLocks = config ? config.respectsFeatureLocks : true;
                        saveLevelConfigKey(this.levelConfigKey);
                        saveRespectsLocks(respectsLocks);
                        levelSetChanged = true;
                        levelChanged = true; // Force reload when switching level sets
                    }

                    // Get selected level and save it
                    if (levelSelect) {
                        const newLevel = parseInt(levelSelect.value, 10);
                        if (newLevel !== this.currentLevel || levelSetChanged) {
                            levelChanged = true;
                            this.currentLevel = newLevel;
                            saveCurrentLevel(this.currentLevel);
                        }
                    }

                    // Save board upgrade actions
                    this.boardUpgradeAction = boardUpgradeActionSelect.value;
                    saveBoardUpgradeAction(this.boardUpgradeAction);
                    this.superUpgradeAction = superUpgradeActionSelect.value;
                    saveSuperUpgradeAction(this.superUpgradeAction);

                    // Save special tile configuration
                    this.specialTileConfig.line_4 = line4Select.value;
                    this.specialTileConfig.block_4 = block4Select.value;
                    this.specialTileConfig.line_5 = line5Select.value;
                    this.specialTileConfig.t_formation = tFormationSelect.value;
                    this.specialTileConfig.l_formation = lFormationSelect.value;
                    saveSpecialTileConfig(this.specialTileConfig);

                    // Mark that settings were changed during this level (if game is active)
                    if (this.gameActive && !levelChanged) {
                        this.settingsChangedDuringLevel = true;
                    }

                    // Reload page if level changed, otherwise just close dialog
                    if (levelChanged) {
                        location.reload();
                    } else {
                        // Just close the dialog - no need to re-render since settings
                        // are only accessible from homescreen (no active game board)
                        settingsDialog.classList.add("hidden");
                    }
                });
            }

            // Close on overlay click
            settingsDialog.addEventListener("click", (e) => {
                if (e.target === settingsDialog) {
                    settingsDialog.classList.add("hidden");
                }
            });

            // Close on Escape key
            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape" && !settingsDialog.classList.contains("hidden")) {
                    settingsDialog.classList.add("hidden");
                }
            });
        }
    }

    /**
     * Check if we need to shift tile levels based on per-level board upgrades
     * This is called after tiles are merged - it just sets a flag
     */
    checkAndShiftTileLevels(newlyCreatedValue) {
        const currentLevelConfig = this.levels[this.currentLevel - 1];

        // Check for per-level board upgrades
        if (currentLevelConfig.boardUpgrades) {
            const upgrades = currentLevelConfig.boardUpgrades;

            // Check if this value triggers an upgrade that hasn't been completed yet
            if (upgrades.includes(newlyCreatedValue) && !this.completedUpgrades.includes(newlyCreatedValue)) {
                this.pendingTileLevelShift = true;
                this.completedUpgrades.push(newlyCreatedValue);
            }
        }
    }

    /**
     * Execute tile level shift with animation
     * Returns a promise that resolves when animation completes
     */
    shiftTileLevels() {
        return new Promise((resolve) => {
            const currentLevelConfig = this.levels[this.currentLevel - 1];
            const hasPerLevelUpgrades = currentLevelConfig?.boardUpgrades?.length > 0;

            // Check if we should proceed with shift
            if (!this.pendingTileLevelShift) {
                resolve();
                return;
            }

            // If no per-level upgrades, return
            if (!hasPerLevelUpgrades) {
                resolve();
                return;
            }

            // Clear the flag
            this.pendingTileLevelShift = false;

            const minValue = Math.min(...this.tileValues);
            const maxValue = Math.max(...this.tileValues);

            // Find all tiles that need to be removed/transformed
            const tilesToRemove = [];
            for (let row = 0; row < this.boardHeight; row++) {
                for (let col = 0; col < this.boardWidth; col++) {
                    const tile = this.board[row][col];
                    if (tile && tile.type === this.TILE_TYPE.NORMAL && tile.value === minValue) {
                        tilesToRemove.push({ row, col });
                    }
                }
            }

            if (tilesToRemove.length === 0) {
                resolve();
                return;
            }

            // Determine which action to use (super streak uses superUpgradeAction, otherwise boardUpgradeAction)
            const effectiveAction =
                this.superStreak >= SUPER_STREAK_THRESHOLD ? this.superUpgradeAction : this.boardUpgradeAction;

            // Animate tiles based on action type
            tilesToRemove.forEach(({ row, col }) => {
                const element = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (element && !element.classList.contains("sliding") && !element.classList.contains("merge-target")) {
                    if (effectiveAction === "blocked" || effectiveAction === "blocked_movable") {
                        // Bump animation for blocked transformation
                        element.classList.add("tile-to-blocked");
                    } else if (effectiveAction === "double") {
                        // Pulse animation for doubling
                        element.style.transition = "transform 0.4s ease";
                        element.style.transform = "scale(1.2)";
                        setTimeout(() => {
                            element.style.transform = "scale(1)";
                        }, 200);
                    } else {
                        // Disappear animation
                        element.style.transition = "transform 0.4s ease, opacity 0.4s ease";
                        element.style.opacity = "0";
                        element.style.transform = "scale(0.5)";
                        element.classList.add("tile-removing");
                    }
                }
            });

            // After animation, update board state
            setTimeout(() => {
                tilesToRemove.forEach(({ row, col }) => {
                    const element = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);

                    if (effectiveAction === "blocked") {
                        // Transform to blocked tile
                        this.board[row][col] = createBlockedTile();
                        // Note: element will be recreated by dropGems' renderBoard
                    } else if (effectiveAction === "blocked_movable") {
                        // Transform to blocked movable tile
                        this.board[row][col] = createBlockedMovableTile();
                        // Note: element will be recreated by dropGems' renderBoard
                    } else if (effectiveAction === "double") {
                        // Double the value (add 1 to internal value: 2→3, 3→4, etc.)
                        const currentTile = this.board[row][col];
                        if (currentTile && currentTile.value === minValue) {
                            this.board[row][col] = createTile(minValue + 1, currentTile.specialType);
                        }
                        // Element will be updated by renderBoard below
                    } else {
                        // Disappear - remove from board state
                        this.board[row][col] = null;
                    }

                    // Remove the element so renderBoard can start fresh (except for double action)
                    if (element && effectiveAction !== "double") {
                        element.remove();
                    }
                });

                // Update spawnableTiles: remove smallest, add next
                this.tileValues = this.tileValues.filter((v) => v !== minValue);
                this.tileValues.push(maxValue + 1);
                this.tileValues.sort((a, b) => a - b);

                // Re-render board for double action to show updated values
                if (effectiveAction === "double") {
                    this.renderBoard();
                }

                // Update board upgrades display to show completion
                renderBoardUpgrades(this);

                // If blocked tiles were added, update the blocked goal target
                if (effectiveAction === "blocked" || effectiveAction === "blocked_movable") {
                    const blockedTilesAdded = tilesToRemove.length;
                    this.levelGoals.forEach((goal) => {
                        if (goal.goalType === "blocked") {
                            goal.target += blockedTilesAdded;
                            // Update initialBlockedTileCount to reflect new total
                            this.initialBlockedTileCount += blockedTilesAdded;
                        }
                    });
                    // Update the goal display to reflect new target
                    updateGoalDisplay(this);
                }

                // Continue with the cascade - dropGems will handle rendering and animation
                resolve();
            }, 400);
        });
    }

    setupInfoButton() {
        const infoBtn = document.getElementById("infoBtn");
        if (infoBtn) {
            infoBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                // Update the goal types list based on seen dialogs
                updateIntroDialogGoalsList();

                // Force show the dialog, ignoring localStorage preference
                const introDialog = document.getElementById("introDialog");
                introDialog.classList.remove("hidden");

                // Set up event listeners (reuse the same logic as showIntroDialog)
                const startBtn = document.getElementById("startGame");

                const closeDialog = () => {
                    introDialog.classList.add("hidden");
                };

                // Remove any existing listeners and add new ones
                const newStartBtn = startBtn.cloneNode(true);
                startBtn.parentNode.replaceChild(newStartBtn, startBtn);

                newStartBtn.addEventListener("click", closeDialog);

                // Close on overlay click
                introDialog.addEventListener(
                    "click",
                    (e) => {
                        if (e.target === introDialog) {
                            closeDialog();
                        }
                    },
                    { once: true }
                );

                // Close on Escape key
                document.addEventListener(
                    "keydown",
                    (e) => {
                        if (e.key === "Escape" && !introDialog.classList.contains("hidden")) {
                            closeDialog();
                        }
                    },
                    { once: true }
                );
            });
        }

        const resetBtn = document.getElementById("resetBtn");
        if (resetBtn) {
            resetBtn.addEventListener("click", () => {
                if (
                    confirm("Are you sure you want to reset all progress? This will delete your saved level and score.")
                ) {
                    // Clear all localStorage
                    localStorage.clear();

                    // Refresh the page
                    location.reload();
                }
            });
        }
    }
}
