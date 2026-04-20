// Main Match3Game class - orchestrates all game modules

import {
    TILE_TYPE,
    SPECIAL_TILE_TYPES,
    FORMATION_TYPES,
    DEFAULT_TILE_VALUES,
    SUPER_STREAK_THRESHOLD,
    DEFAULT_LEVEL,
    LEVEL_CONFIGS,
    FEATURE_KEYS,
} from "./config.js";
import {
    loadSpecialTileConfig,
    loadCurrentLevel,
    saveCurrentLevel,
    loadScore,
    saveScore,
    loadLevelConfigKey,
    saveRespectsLocks,
    loadBoardUpgradeAction,
    loadSuperUpgradeAction,
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
    loadHintsEnabled,
    loadShowSwapTargets,
    loadHintTimeoutMs,
    loadAllowNonMatchingSwaps,
    loadExtendedFreeSwap,
    loadFormationPowerUpRewards,
    loadPersistentPowerUpsEnabled,
    loadPowerUpMoveCost,
    loadSelectedPowerUps,
    loadSuperStrikeWildcardTeleport,
    loadMovesMultiplier,
} from "./storage.js";
import { track, trackLevelSolved, trackLevelLost } from "./tracker.js";
import { createTile, createBlockedTile, createBlockedMovableTile } from "./tile-helpers.js";
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
import { animateSwap, animateRevert, dropGems, animateMerges, animateUnblocking } from "./animator.js";
import {
    renderBoard,
    renderGoals,
    renderBoardUpgrades,

    updateGoalDisplay,
    updateMovesDisplay,
    renderHintHighlight,
} from "./renderer.js";
import { findBestSwap } from "./hint-system.js";
import {
    checkLevelComplete,
    updateTileCounts,
    countBlockedLevelTiles,
    updateBlockedTileGoals,
    nextLevel,
    restartLevel,
    decrementCursedTileTimers,
} from "./goal-tracker.js";
import { showGoalDialog, hasDialogBeenShown, showFeatureUnlockDialog, hasFeatureBeenUnlocked } from "./goal-dialogs.js";
import { hasFormationTutorialBeenShown, FORMATION_TUTORIAL_DIALOGS } from "./formation-tutorial.js";
import { showHomeScreen } from "./home-screen.js";
import { initTutorial, isTutorialActive, showTutorialUI } from "./tutorial.js";
import { setupSettingsButton, setupInfoButton } from "./settings-dialog.js";
import {
    setupPowerUps,
    activatePowerUp,
    deactivatePowerUp,
    isPowerUpButtonVisible,
    getVisiblePowerUpTypes,
    grantPowerUp,
    getTotalPowerUpCount,
    consumePowerUp,
    grantFormationPowerUp,
    showPowerUps,
    hidePowerUps,
    updatePowerUpButtons,
    handlePowerUpAction,
    usePowerUpHammer,
    usePowerUpHalve,
    usePowerUpWildcard,
    resetPowerUpBuyCounts,
} from "./power-ups.js";

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
        this.superStrikeWildcardTeleport = loadSuperStrikeWildcardTeleport(); // Replace Wildcard with Wildcard Teleport during super streak

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

        // Hint system
        this.currentHint = null; // {row1, col1, row2, col2}
        this.hintTimer = null; // setTimeout reference
        this.hintTimeout = loadHintTimeoutMs();
        this.hintsEnabled = loadHintsEnabled();
        this.showSwapTargets = loadShowSwapTargets();
        this.allowNonMatchingSwaps = loadAllowNonMatchingSwaps();
        this.extendedFreeSwap = loadExtendedFreeSwap();
        this.formationPowerUpRewards = loadFormationPowerUpRewards();
        this.persistentPowerUpsEnabled = loadPersistentPowerUpsEnabled();
        this.powerUpMoveCost = loadPowerUpMoveCost();
        this.movesMultiplier = loadMovesMultiplier();

        this.currentLevel = loadCurrentLevel();
        this.levelGoals = [];
        this.tileCounts = {};
        this.movesUsed = 0;
        this.maxMoves = 0;
        this.gameActive = true;
        this.extraMovesCount = 0; // Track how many times extra moves have been purchased this level

        // Cursed tile tracking
        this.cursedTileCreatedCount = {}; // Track how many tiles of each cursed value have been created
        this.shouldDecrementCursedTimers = false; // Flag to decrement after turn ends
        this.cursedTileCreatedThisTurn = {}; // Track if cursed tile was created this turn for frequency:0

        // Power-up system
        this.activePowerUp = null;
        this.powerUpBuying = false;
        this.powerUpSwapTiles = [];
        this.selectedPowerUps = loadSelectedPowerUps();
        // Power-up counts: persistent (saved) and transient (temporary for level)
        const savedPowerUps = loadPowerUpCounts();
        this.powerUpCounts = {
            hammer: { persistent: savedPowerUps.hammer, transient: 0 },
            halve: { persistent: savedPowerUps.halve, transient: 0 },
            swap: { persistent: savedPowerUps.swap, transient: 0 },
            teleport: { persistent: savedPowerUps.teleport, transient: 0 },
            wildcard: { persistent: savedPowerUps.wildcard, transient: 0 },
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

        // Power-up usage tracking (per level)
        this.powerUpUsedCounts = {
            hammer: 0,
            halve: 0,
            swap: 0,
            teleport: 0,
            wildcard: 0,
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
        setupInfoButton(this);
        setupSettingsButton(this);
        this.setupExtraMovesDialog();
        // Power-up buying now handled inline on power-up buttons
        this.setupControlButtons();
        // Setup event listeners once during initialization
        setupEventListeners(this);
        // Don't auto-create/render board - let home screen handle starting the game
    }

    initializeLevels() {
        // Find the level config by key
        const config = LEVEL_CONFIGS.find((c) => c.key === this.levelConfigKey);
        this.levels = config ? config.levels : DEFAULT_LEVEL;

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

        this.maxMoves = Math.max(1, Math.round(level.maxMoves * this.movesMultiplier));
        this.movesUsed = 0;
        this.extraMovesCount = 0; // Reset extra moves count for new level
        this.heartDecreasedThisAttempt = false; // Reset heart decrease flag for new level

        // Reset transient power-up counts and buy costs for new level
        this.powerUpCounts.hammer.transient = 0;
        this.powerUpCounts.halve.transient = 0;
        this.powerUpCounts.swap.transient = 0;
        this.powerUpCounts.teleport.transient = 0;
        this.powerUpCounts.wildcard.transient = 0;
        resetPowerUpBuyCounts();

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

        // Reset power-up usage tracking for new level
        this.powerUpUsedCounts = {
            hammer: 0,
            halve: 0,
            swap: 0,
            teleport: 0,
            wildcard: 0,
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

        // Apply streak bonus power-ups (transient for this level only) - only if streak feature is unlocked
        if (isFeatureUnlocked(FEATURE_KEYS.STREAK)) {
            this.selectedPowerUps.forEach((type, i) => {
                if (this.currentStreak >= i + 1) {
                    this.powerUpCounts[type].transient++;
                }
            });
        }

        // Deactivate any power-ups when loading a level
        this.deactivatePowerUp();

        // Update power-up button states
        this.updatePowerUpButtons();
        this.updateCoinsDisplays();

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

        // Re-render board on viewport resize (fixes iOS browser chrome show/hide timing)
        window.visualViewport?.addEventListener("resize", () => {
            if (this.board.length > 0) this.renderBoard();
        });
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
                        this.grantTransientPowerUpOnUnlock(featureKey);

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

    grantTransientPowerUpOnUnlock(featureKey) {
        // Map unlock feature key to slot index
        const unlockKeys = [FEATURE_KEYS.POWER_UP_1, FEATURE_KEYS.POWER_UP_2, FEATURE_KEYS.POWER_UP_3];
        const slotIndex = unlockKeys.indexOf(featureKey);
        if (slotIndex === -1) return;

        // Grant the power-up in that slot position from selectedPowerUps
        const powerUpType = this.selectedPowerUps[slotIndex];
        if (!powerUpType) return;

        // Grant one transient use on first unlock so it can be tried immediately.
        this.grantPowerUp(powerUpType);
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
        setupPowerUps(this);
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
        processMatches(this, { animateMerges, animateUnblocking });
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

        // Start hint timer after board is rendered
        this.startHintTimer();
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

        // Update game screen coins display (hidden when jokers cost moves)
        const gameCoinsDisplay = document.getElementById("game-coins-display");
        if (gameCoinsDisplay) {
            if (this.powerUpMoveCost) {
                gameCoinsDisplay.style.display = "none";
            } else {
                gameCoinsDisplay.style.display = "";
                gameCoinsDisplay.innerHTML = coinsHTML;
            }
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

    // Power-up methods (delegated to power-ups.js)
    activatePowerUp(type) {
        activatePowerUp(this, type);
    }
    deactivatePowerUp() {
        deactivatePowerUp(this);
    }
    isPowerUpButtonVisible(type) {
        return isPowerUpButtonVisible(this, type);
    }
    getVisiblePowerUpTypes() {
        return getVisiblePowerUpTypes(this);
    }
    grantPowerUp(type) {
        grantPowerUp(this, type);
    }
    getTotalPowerUpCount(type) {
        return getTotalPowerUpCount(this, type);
    }
    consumePowerUp(type) {
        consumePowerUp(this, type);
    }
    grantFormationPowerUp(ft) {
        grantFormationPowerUp(this, ft);
    }
    handlePowerUpAction(r, c, el) {
        return handlePowerUpAction(this, r, c, el);
    }
    updatePowerUpButtons() {
        updatePowerUpButtons(this);
    }
    showPowerUps() {
        showPowerUps(this);
    }
    hidePowerUps() {
        hidePowerUps(this);
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

    setupExtraMovesDialog() {
        const extraMovesDialog = document.getElementById("extraMovesDialog");
        const extraMoves5Btn = document.getElementById("extraMoves5");
        const extraMoves5WithSwapBtn = document.getElementById("extraMoves5WithSwap");
        const loseProgressBtn = document.getElementById("loseProgress");
        const showBoardBtn = document.getElementById("showBoardBtn");
        const continueBtn = document.getElementById("continueBtn");

        if (extraMoves5Btn) {
            extraMoves5Btn.addEventListener("click", () => {
                const EXTRA_MOVES_COST = 900 + this.extraMovesCount * 1000;

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
                        cost: EXTRA_MOVES_COST,
                        purchase_number: this.extraMovesCount + 1,
                    });

                    // Increment extra moves purchase count for this level
                    this.extraMovesCount++;

                    this.maxMoves += 5;

                    // Add one of each visible power-up (transient for this level only)
                    this.getVisiblePowerUpTypes().forEach((type) => {
                        this.powerUpCounts[type].transient++;
                    });

                    this.updatePowerUpButtons();

                    this.updateMovesDisplay();
                    extraMovesDialog.classList.add("hidden");
                    this.hideControls();
                    this.gameActive = true;
                    this.showPowerUps();

                    // Remove level-ended opacity from game board
                    const gameBoard = document.getElementById("gameBoard");
                    if (gameBoard) {
                        gameBoard.classList.remove("level-ended");
                    }

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

                // Increment extra moves purchase count for this level
                this.extraMovesCount++;

                this.maxMoves += 5;
                // Add one swap power-up (persistent)
                this.powerUpCounts.swap.persistent++;
                savePowerUpCounts({
                    hammer: this.powerUpCounts.hammer.persistent,
                    halve: this.powerUpCounts.halve.persistent,
                    swap: this.powerUpCounts.swap.persistent,
                    teleport: this.powerUpCounts.teleport.persistent,
                    wildcard: this.powerUpCounts.wildcard.persistent,
                });
                this.updatePowerUpButtons();
                this.updateMovesDisplay();
                extraMovesDialog.classList.add("hidden");
                this.hideControls();
                this.gameActive = true;
                this.showPowerUps();

                // Remove level-ended opacity from game board
                const gameBoard = document.getElementById("gameBoard");
                if (gameBoard) {
                    gameBoard.classList.remove("level-ended");
                }
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

                // Show level failed state with the stored fail reason
                setTimeout(() => {
                    this.showLevelFailed(this.failReason || "No moves left");
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
                const nextLevelContainer = document.getElementById("nextLevelContainer");
                const restartBtn = document.getElementById("restartBtn");
                if (continueBtn) continueBtn.style.display = "inline-block";
                if (nextLevelContainer) nextLevelContainer.style.display = "none";
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
        const fiveExtraMovesText = document.getElementById("fiveExtraMovesText");
        const gameBoard = document.getElementById("gameBoard");

        if (gameBoard) {
            gameBoard.classList.add("level-ended");
        }

        // Always show the review board button
        if (showBoardBtn) {
            showBoardBtn.classList.remove("hidden");
        }

        // Check how many power-up slots are unlocked
        const anyPowerUpUnlocked = isFeatureUnlocked(FEATURE_KEYS.POWER_UP_1);

        // Show/hide extra-moves power-up buttons based on unlock status
        const extraMovesPowerUps = document.querySelectorAll("#extraMovesDialog .power-up-btn");
        extraMovesPowerUps.forEach((btn) => {
            const powerUpType = btn.dataset.powerup;
            btn.style.display = this.isPowerUpButtonVisible(powerUpType) ? "" : "none";
        });

        // Update the text based on whether any power-ups are unlocked
        if (fiveExtraMovesText) {
            const newText = anyPowerUpUnlocked ? "5 Moves +" : "+5 Moves";
            fiveExtraMovesText.setAttribute("text", newText);
        }

        // Update cost display with progressive pricing (900, 1900, 2900, ...)
        const costDisplay = document.getElementById("extraMovesCostDisplay");
        if (costDisplay) {
            costDisplay.textContent = (900 + this.extraMovesCount * 1000).toLocaleString();
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
                this.gameActive = false;

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

    showLevelSolved() {
        // Track level_solved when level solved screen is shown
        trackLevelSolved(this);

        const levelSolvedSvg = document.getElementById("levelSolvedSvg");
        const levelFailedSvg = document.getElementById("levelFailedSvg");
        const gameBoard = document.getElementById("gameBoard");

        if (gameBoard) {
            gameBoard.classList.add("level-ended");
        }
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
        const gameBoard = document.getElementById("gameBoard");

        if (gameBoard) {
            gameBoard.classList.remove("level-ended");
        }
        if (levelSolvedSvg) {
            levelSolvedSvg.style.visibility = "hidden";
            levelSolvedSvg.classList.remove("animate");
        }
    }

    showLevelFailed(reason = "No moves left") {
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
        const failReasonText = document.getElementById("failReasonText");
        const restartBtn = document.getElementById("restartBtn");
        const nextBtn = document.getElementById("nextBtn");
        const continueBtn = document.getElementById("continueBtn");
        const gameBoard = document.getElementById("gameBoard");

        if (gameBoard) {
            gameBoard.classList.add("level-ended");
        }
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
        if (failReasonText) {
            failReasonText.setAttribute("text", reason);
            failReasonText.style.visibility = "visible";
        }

        // Show controls and only show restart button
        this.showControls();
        const nextLevelContainer = document.getElementById("nextLevelContainer");
        if (restartBtn) restartBtn.style.display = "inline-block";
        if (nextLevelContainer) nextLevelContainer.style.display = "none";
        if (continueBtn) continueBtn.style.display = "none";
    }

    hideLevelFailed() {
        const levelFailedSvg = document.getElementById("levelFailedSvg");
        const failReasonText = document.getElementById("failReasonText");
        const gameBoard = document.getElementById("gameBoard");

        if (gameBoard) {
            gameBoard.classList.remove("level-ended");
        }
        if (levelFailedSvg) {
            levelFailedSvg.style.visibility = "hidden";
            levelFailedSvg.classList.remove("animate");
        }
        if (failReasonText) {
            failReasonText.style.visibility = "hidden";
            failReasonText.setAttribute("text", "");
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

    // ===== Hint System Methods =====

    /**
     * Start or restart the hint timer
     */
    startHintTimer() {
        // Clear existing timer
        this.clearHintTimer();

        // Don't start timer if hints disabled, game inactive, animating, or level has tutorial swaps
        if (!this.hintsEnabled || !this.gameActive || this.animating) {
            return;
        }

        // Skip hints while a tutorial step is actively shown
        if (isTutorialActive(this)) {
            return;
        }

        // Use shorter timeout while formation tutorials are still pending, longer after
        const allFormationTypes = Object.keys(FORMATION_TUTORIAL_DIALOGS);
        const allShown = allFormationTypes.every((type) => hasFormationTutorialBeenShown(type));
        const timeout = allShown ? this.hintTimeout : 4000;

        // Start new timer
        this.hintTimer = setTimeout(() => {
            this.showHint();
        }, timeout);
    }

    /**
     * Stop the hint timer without clearing displayed hints
     */
    clearHintTimer() {
        if (this.hintTimer) {
            clearTimeout(this.hintTimer);
            this.hintTimer = null;
        }
    }

    /**
     * Calculate and display the best hint
     */
    showHint() {
        // Prevent during animations or inactive game
        if (!this.gameActive || this.animating) {
            return;
        }

        const bestSwap = findBestSwap(this);

        if (!bestSwap) {
            // No valid moves available - don't show anything
            return;
        }

        this.currentHint = {
            row1: bestSwap.row1,
            col1: bestSwap.col1,
            row2: bestSwap.row2,
            col2: bestSwap.col2,
            direction1: bestSwap.direction1,
            direction2: bestSwap.direction2,
            matchTiles: bestSwap.matchTiles || [],
        };

        renderHintHighlight(this);
    }

    /**
     * Clear the displayed hint
     */
    clearHint() {
        if (!this.currentHint) return;

        // Clear nudge classes from swap tiles
        const gem1 = document.querySelector(
            `[data-row="${this.currentHint.row1}"][data-col="${this.currentHint.col1}"]`,
        );
        const gem2 = document.querySelector(
            `[data-row="${this.currentHint.row2}"][data-col="${this.currentHint.col2}"]`,
        );

        gem1?.classList.remove("hint-nudge-up", "hint-nudge-down", "hint-nudge-left", "hint-nudge-right");
        gem2?.classList.remove("hint-nudge-up", "hint-nudge-down", "hint-nudge-left", "hint-nudge-right");

        // Clear merge preview from all tiles
        document.querySelectorAll(".hint-merge-preview").forEach((el) => {
            el.classList.remove("hint-merge-preview");
        });

        this.currentHint = null;
    }

    /**
     * Clear hint display and restart timer
     */
    resetHintTimer() {
        this.clearHint();
        this.clearHintTimer();
        this.startHintTimer();
    }
}
