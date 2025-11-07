// Main Match3Game class - orchestrates all game modules

import {
    TILE_TYPE,
    SPECIAL_TILE_TYPES,
    FORMATION_TYPES,
    DEFAULT_TILE_VALUES,
    MAX_POWER_UP_USES,
    LEVELS,
    TEST_LEVELS,
} from "./config.js";
import {
    loadNumberBase,
    saveNumberBase,
    loadShowReviewBoard,
    saveShowReviewBoard,
    loadSpecialTileConfig,
    saveSpecialTileConfig,
    loadCurrentLevel,
    saveCurrentLevel,
    loadScore,
    saveScore,
    loadUseTestLevels,
    saveUseTestLevels,
    loadUserId,
    loadMaxTileLevels,
    saveMaxTileLevels,
    loadSmallestTileAction,
    saveSmallestTileAction,
    loadSpawnableTilesStartCount,
    saveSpawnableTilesStartCount,
    loadUsePowerUpRewards,
    saveUsePowerUpRewards,
    loadStreak,
    saveStreak,
    loadBestStreak,
    saveBestStreak,
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
import { renderBoard, renderGoals, updateGoalDisplay, updateMovesDisplay } from "./renderer.js";
import {
    checkLevelComplete,
    updateTileCounts,
    countBlockedLevelTiles,
    updateBlockedTileGoals,
    nextLevel,
    restartLevel,
    decrementCursedTileTimers,
} from "./goal-tracker.js";
import { showGoalDialog, hasDialogBeenShown, updateIntroDialogGoalsList } from "./goal-dialogs.js";

export class Match3Game {
    constructor() {
        // Tile type constants
        this.TILE_TYPE = TILE_TYPE;
        this.board = [];
        this.boardWidth = 8; // Default width, will be updated by loadLevel
        this.boardHeight = 8; // Default height, will be updated by loadLevel
        this.defaultTileValues = DEFAULT_TILE_VALUES; // Internal representation: 1=2, 2=4, 3=8, 4=16
        this.tileValues = this.defaultTileValues;
        this.numberBase = loadNumberBase(); // 2 or 3
        this.showReviewBoard = loadShowReviewBoard(); // true or false
        this.useTestLevels = loadUseTestLevels(); // true or false
        this.score = loadScore();
        this.maxTileLevels = loadMaxTileLevels(); // number or null
        this.smallestTileAction = loadSmallestTileAction(); // "disappear" or "blocked"
        this.spawnableTilesStartCount = loadSpawnableTilesStartCount(); // array or null
        this.usePowerUpRewards = loadUsePowerUpRewards(); // true or false
        this.currentStreak = loadStreak(); // 0-3 consecutive wins
        this.bestStreak = loadBestStreak(); // All-time best streak
        this.currentMinTileLevel = null; // Track the minimum tile level currently on board
        this.pendingTileLevelShift = false; // Flag to indicate a shift should happen after first merge
        this.selectedGem = null;
        this.isDragging = false;
        this.dragStartPos = null;
        this.animating = false;
        this.lastSwapPosition = null; // Track last swap position for special tile placement
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
        this.powerUpRemaining = {
            hammer: MAX_POWER_UP_USES,
            halve: MAX_POWER_UP_USES,
            swap: MAX_POWER_UP_USES,
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

        // Track app start first, before any level is loaded
        track("app_start", {
            current_level: this.currentLevel,
            number_base: this.numberBase,
            use_test_levels: this.useTestLevels,
        });

        this.initializeLevels();
        this.showIntroDialog();
        this.setupInfoButton();
        this.setupSettingsButton();
        this.setupExtraMovesDialog();
        this.setupControlButtons();
        // Setup event listeners once during initialization
        setupEventListeners(this);
        // Don't auto-create/render board - let home screen handle starting the game
    }

    initializeLevels() {
        this.levels = this.useTestLevels ? TEST_LEVELS : LEVELS;
        this.loadLevel(this.currentLevel);
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

        // Use spawnable tiles override if set in settings, otherwise use level-specific or default
        console.log(this.spawnableTilesStartCount);
        if (this.spawnableTilesStartCount !== null) {
            this.tileValues = this.spawnableTilesStartCount;
        } else {
            this.tileValues = level.spawnableTiles || this.defaultTileValues;
        }

        this.maxMoves = level.maxMoves;
        this.movesUsed = 0;
        this.extraMovesUsed = false; // Reset extra moves flag for new level

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

        renderGoals(this);
        updateMovesDisplay(this);

        // Hide control buttons and show power-ups at start of level
        const restartBtn = document.getElementById("restartBtn");
        const nextBtn = document.getElementById("nextBtn");
        if (restartBtn) {
            restartBtn.style.display = "none";
        }
        if (nextBtn) {
            nextBtn.style.display = "none";
        }

        // Show power-ups during active gameplay
        this.showPowerUps();

        // Reset power-up remaining for new level
        // If using power-up rewards mode, start with 0, otherwise use default
        const initialPowerUpCount = this.usePowerUpRewards ? 0 : MAX_POWER_UP_USES;
        this.powerUpRemaining = {
            hammer: initialPowerUpCount,
            halve: initialPowerUpCount,
            swap: initialPowerUpCount,
        };

        // Apply streak bonus power-ups (stacks with existing power-ups)
        if (this.currentStreak >= 1) {
            this.powerUpRemaining.halve += 1;
        }
        if (this.currentStreak >= 2) {
            this.powerUpRemaining.hammer += 1;
        }
        if (this.currentStreak >= 3) {
            this.powerUpRemaining.swap += 1;
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
    }

    init() {
        this.createBoard();
        this.renderBoard();
        setupEventListeners(this);
        renderGoals(this);
        updateMovesDisplay(this);
        this.showGoalDialogIfNeeded();
    }

    setupControlButtons() {
        const restartBtn = document.getElementById("restartBtn");
        const nextBtn = document.getElementById("nextBtn");

        if (restartBtn) {
            restartBtn.addEventListener("click", () => {
                this.restartLevel();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", () => {
                this.nextLevel();
            });
        }

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
        renderGoals(this);
        updateMovesDisplay(this);
        this.showGoalDialogIfNeeded();
    }

    saveScore() {
        saveScore(this.score);
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

                // Check if power-up has uses remaining
                if (this.powerUpRemaining[powerUpType] <= 0) {
                    return; // Power-up is used up
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
        this.deactivatePowerUp(); // Clear any active power-up first
        this.activePowerUp = type;
        this.powerUpSwapTiles = [];

        // Add visual feedback
        const button = document.querySelector(`[data-powerup="${type}"]`);
        if (button) {
            button.classList.add("active");
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
            powerUpsContainer.style.display = "flex";
        }
    }

    hidePowerUps() {
        const powerUpsContainer = document.querySelector(".power-ups");
        if (powerUpsContainer) {
            powerUpsContainer.style.display = "none";
        }
    }

    updatePowerUpButtons() {
        const powerUpButtons = document.querySelectorAll(".power-up-btn");

        powerUpButtons.forEach((button) => {
            const powerUpType = button.dataset.powerup;
            const usesLeft = this.powerUpRemaining[powerUpType];

            // Remove existing use indicators
            const existingIndicator = button.querySelector(".use-indicator");
            if (existingIndicator) {
                existingIndicator.remove();
            }

            if (usesLeft <= 0) {
                // Power-up is used up
                button.classList.add("disabled");
                button.title = `${button.title.split(" - ")[0]} - No uses left`;
            } else {
                // Power-up has uses left
                button.classList.remove("disabled");

                // Add use indicator
                const indicator = document.createElement("div");
                indicator.className = "use-indicator";
                indicator.innerHTML = `
                    <svg viewBox="0 0 40 40" width="40" height="40">
                        <text x="20" y="28"
                            font-size="26"
                            fill="#fff"
                            stroke="#000"
                            stroke-width="6"
                            paint-order="stroke fill"
                            stroke-linejoin="round"
                            text-anchor="middle">
                        ${usesLeft}
                        </text>
                    </svg>
                `;
                button.appendChild(indicator);

                // Update title
                const baseTitle = button.title.split(" - ")[0];
                button.title = `${baseTitle} - ${usesLeft} uses left`;
            }
        });
    }

    handlePowerUpAction(row, col, element) {
        const tile = this.board[row][col];

        // Skip blocked tiles
        if (tile && tile.type === TILE_TYPE.BLOCKED) return;

        switch (this.activePowerUp) {
            case "hammer":
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
            const displayValue = Math.pow(this.numberBase, halvedValue);
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

    // UI setup methods
    showIntroDialog() {
        // Check if user has opted to not show the dialog
        const dontShowAgain = localStorage.getItem("match2048_dontShowIntro") === "true";
        if (dontShowAgain) {
            return;
        }

        const introDialog = document.getElementById("introDialog");
        const startBtn = document.getElementById("startGame");
        const dontShowCheckbox = document.getElementById("dontShowAgain");

        // Update the goal types list based on seen dialogs
        updateIntroDialogGoalsList();

        // Show the dialog
        introDialog.classList.remove("hidden");

        // Close dialog function
        const closeDialog = () => {
            if (dontShowCheckbox.checked) {
                localStorage.setItem("match2048_dontShowIntro", "true");
            }
            introDialog.classList.add("hidden");
        };

        // Event listeners
        startBtn.addEventListener("click", closeDialog);

        // Close on overlay click (but not on dialog content)
        introDialog.addEventListener("click", (e) => {
            if (e.target === introDialog) {
                closeDialog();
            }
        });

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
                // Track extra moves usage
                track("extra_moves_used", {
                    level: this.currentLevel,
                    extra_moves_count: 5,
                    included_swap: false,
                    moves_used: this.movesUsed,
                });

                // Mark that extra moves have been used for this level
                this.extraMovesUsed = true;

                this.maxMoves += 5;
                this.updateMovesDisplay();
                extraMovesDialog.classList.add("hidden");
                continueBtn.style.display = "none";
                this.gameActive = true;
                this.showPowerUps();
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
                this.updatePowerUpButtons();
                this.updateMovesDisplay();
                extraMovesDialog.classList.add("hidden");
                continueBtn.style.display = "none";
                this.gameActive = true;
                this.showPowerUps();
            });
        }

        if (loseProgressBtn) {
            loseProgressBtn.addEventListener("click", () => {
                extraMovesDialog.classList.add("hidden");
                continueBtn.style.display = "none";
                // Show level failed state instead of immediately restarting
                setTimeout(() => {
                    this.showLevelFailed();
                }, 300);
            });
        }

        if (showBoardBtn) {
            showBoardBtn.addEventListener("click", () => {
                extraMovesDialog.classList.add("hidden");
                continueBtn.style.display = "inline-block";
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

        // Toggle show board button based on setting
        if (showBoardBtn) {
            if (this.showReviewBoard) {
                showBoardBtn.classList.remove("hidden");
            } else {
                showBoardBtn.classList.add("hidden");
            }
        }

        extraMovesDialog.classList.remove("hidden");
    }

    showLevelSolved() {
        // Track level_solved when level solved screen is shown
        trackLevelSolved(this);

        const levelTextSvg = document.getElementById("levelTextSvg");
        const levelSolvedSvg = document.getElementById("levelSolvedSvg");
        const levelFailedSvg = document.getElementById("levelFailedSvg");

        if (levelTextSvg) levelTextSvg.style.display = "none";
        if (levelFailedSvg) levelFailedSvg.style.display = "none";
        if (levelSolvedSvg) {
            levelSolvedSvg.style.display = "block";
            // Trigger animation by adding class
            levelSolvedSvg.classList.remove("animate");
            // Force reflow to restart animation
            void levelSolvedSvg.offsetWidth;
            levelSolvedSvg.classList.add("animate");
        }
    }

    hideLevelSolved() {
        const levelTextSvg = document.getElementById("levelTextSvg");
        const levelSolvedSvg = document.getElementById("levelSolvedSvg");

        if (levelTextSvg) levelTextSvg.style.display = "block";
        if (levelSolvedSvg) {
            levelSolvedSvg.style.display = "none";
            levelSolvedSvg.classList.remove("animate");
        }
    }

    showLevelFailed() {
        // Track level_lost when level failed screen is shown
        trackLevelLost(this);

        const levelTextSvg = document.getElementById("levelTextSvg");
        const levelSolvedSvg = document.getElementById("levelSolvedSvg");
        const levelFailedSvg = document.getElementById("levelFailedSvg");
        const restartBtn = document.getElementById("restartBtn");

        if (levelTextSvg) levelTextSvg.style.display = "none";
        if (levelSolvedSvg) levelSolvedSvg.style.display = "none";
        if (levelFailedSvg) {
            levelFailedSvg.style.display = "block";
            // Trigger animation by adding class
            levelFailedSvg.classList.remove("animate");
            // Force reflow to restart animation
            void levelFailedSvg.offsetWidth;
            levelFailedSvg.classList.add("animate");
        }

        // Show restart button
        if (restartBtn) {
            restartBtn.style.display = "inline-block";
        }
    }

    hideLevelFailed() {
        const levelTextSvg = document.getElementById("levelTextSvg");
        const levelFailedSvg = document.getElementById("levelFailedSvg");
        const restartBtn = document.getElementById("restartBtn");

        if (levelTextSvg) levelTextSvg.style.display = "block";
        if (levelFailedSvg) {
            levelFailedSvg.style.display = "none";
            levelFailedSvg.classList.remove("animate");
        }
        if (restartBtn) {
            restartBtn.style.display = "none";
        }
    }

    setupSettingsButton() {
        const settingsBtn = document.getElementById("settingsBtn");
        const settingsDialog = document.getElementById("settingsDialog");
        const saveSettingsBtn = document.getElementById("saveSettings");
        const levelSelect = document.getElementById("levelSelect");
        const numberBaseSelect = document.getElementById("numberBase");
        const showReviewBoardCheckbox = document.getElementById("showReviewBoard");
        const useTestLevelsCheckbox = document.getElementById("useTestLevels");
        const maxTileLevelsSelect = document.getElementById("maxTileLevels");
        const smallestTileActionSelect = document.getElementById("smallestTileAction");
        const spawnableTilesStartCountSelect = document.getElementById("spawnableTilesStartCount");
        let selectedLevels = this.useTestLevels;

        // Special tile reward selects
        const line4Select = document.getElementById("line4Reward");
        const block4Select = document.getElementById("block4Reward");
        const line5Select = document.getElementById("line5Reward");
        const tFormationSelect = document.getElementById("tFormationReward");
        const lFormationSelect = document.getElementById("lFormationReward");

        // Power-up rewards checkbox
        const usePowerUpRewardsCheckbox = document.getElementById("usePowerUpRewards");
        let usePowerUpRewardsMode = this.usePowerUpRewards;

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

        // Handle power-up rewards checkbox change
        if (usePowerUpRewardsCheckbox) {
            usePowerUpRewardsCheckbox.addEventListener("change", () => {
                usePowerUpRewardsMode = usePowerUpRewardsCheckbox.checked;
                togglePowerUpOptions(usePowerUpRewardsMode);
            });
        }

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

        // Populate level selector initially
        populateLevelSelect();

        // Handle test levels checkbox change
        if (useTestLevelsCheckbox) {
            useTestLevelsCheckbox.addEventListener("change", () => {
                selectedLevels = useTestLevelsCheckbox.checked;
                this.levels = selectedLevels ? TEST_LEVELS : LEVELS;
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
            numberBaseSelect.value = this.numberBase.toString();
            showReviewBoardCheckbox.checked = this.showReviewBoard;
            useTestLevelsCheckbox.checked = selectedLevels;
            maxTileLevelsSelect.value = this.maxTileLevels !== null ? this.maxTileLevels.toString() : "";
            smallestTileActionSelect.value = this.smallestTileAction;
            spawnableTilesStartCountSelect.value =
                this.spawnableTilesStartCount !== null ? JSON.stringify(this.spawnableTilesStartCount) : "";

            // Set power-up rewards mode state
            usePowerUpRewardsMode = this.usePowerUpRewards;
            if (usePowerUpRewardsCheckbox) {
                usePowerUpRewardsCheckbox.checked = usePowerUpRewardsMode;
            }
            togglePowerUpOptions(usePowerUpRewardsMode);

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

        if (settingsBtn && settingsDialog) {
            settingsBtn.addEventListener("click", openSettings);

            // Save settings
            if (saveSettingsBtn) {
                saveSettingsBtn.addEventListener("click", () => {
                    // Check if level changed
                    let levelChanged = false;
                    let levelSetChanged = false;

                    // Save test levels preference first
                    if (selectedLevels !== this.useTestLevels) {
                        this.useTestLevels = selectedLevels;
                        saveUseTestLevels(this.useTestLevels);
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

                    // Save number base
                    const newBase = parseInt(numberBaseSelect.value, 10);
                    this.numberBase = newBase;
                    saveNumberBase(this.numberBase);

                    // Save review board preference
                    this.showReviewBoard = showReviewBoardCheckbox.checked;
                    saveShowReviewBoard(this.showReviewBoard);

                    // Save max tile levels and smallest tile action
                    const maxTileLevelsValue = maxTileLevelsSelect.value;
                    this.maxTileLevels = maxTileLevelsValue ? parseInt(maxTileLevelsValue, 10) : null;
                    saveMaxTileLevels(this.maxTileLevels);
                    this.smallestTileAction = smallestTileActionSelect.value;
                    saveSmallestTileAction(this.smallestTileAction);

                    // Save spawnable tiles start count
                    const spawnableTilesValue = spawnableTilesStartCountSelect.value;
                    this.spawnableTilesStartCount = spawnableTilesValue ? JSON.parse(spawnableTilesValue) : null;
                    saveSpawnableTilesStartCount(this.spawnableTilesStartCount);

                    // Save power-up rewards mode
                    this.usePowerUpRewards = usePowerUpRewardsMode;
                    saveUsePowerUpRewards(this.usePowerUpRewards);

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

                    // Reload page if level changed, otherwise just close and re-render
                    if (levelChanged) {
                        location.reload();
                    } else {
                        settingsDialog.classList.add("hidden");
                        this.renderBoard();
                        renderGoals(this);
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
     * Check if we need to shift tile levels based on maxTileLevels setting
     * This is called after tiles are merged - it just sets a flag
     */
    checkAndShiftTileLevels(newlyCreatedValue) {
        // Only proceed if feature is enabled
        if (this.maxTileLevels === null) {
            return;
        }

        // Get the minimum tile value from spawnableTiles
        const minSpawnableValue = Math.min(...this.tileValues);

        // Calculate the threshold: minSpawnableValue + maxTileLevels
        const threshold = minSpawnableValue + this.maxTileLevels;

        // Check if newly created value reaches or exceeds the threshold
        if (newlyCreatedValue >= threshold) {
            // Set flag - the actual shift will happen after the first merge animation completes
            this.pendingTileLevelShift = true;
        }
    }

    /**
     * Execute tile level shift with animation
     * Returns a promise that resolves when animation completes
     */
    shiftTileLevels() {
        return new Promise((resolve) => {
            if (this.maxTileLevels === null || !this.pendingTileLevelShift) {
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

            // Animate tiles based on action type
            tilesToRemove.forEach(({ row, col }) => {
                const element = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (element && !element.classList.contains("sliding") && !element.classList.contains("merge-target")) {
                    if (this.smallestTileAction === "blocked" || this.smallestTileAction === "blocked_movable") {
                        // Bump animation for blocked transformation
                        element.classList.add("tile-to-blocked");
                    } else if (this.smallestTileAction === "double") {
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

                    if (this.smallestTileAction === "blocked") {
                        // Transform to blocked tile
                        this.board[row][col] = createBlockedTile();
                        // Note: element will be recreated by dropGems' renderBoard
                    } else if (this.smallestTileAction === "blocked_movable") {
                        // Transform to blocked movable tile
                        this.board[row][col] = createBlockedMovableTile();
                        // Note: element will be recreated by dropGems' renderBoard
                    } else if (this.smallestTileAction === "double") {
                        // Double the value (add 1 to internal value: 2→3, 3→4, etc.)
                        const currentTile = this.board[row][col];
                        if (currentTile && currentTile.value === minValue) {
                            this.board[row][col] = createTile(
                                minValue + 1,
                                currentTile.isPowerTile,
                                currentTile.isGoldenTile,
                                currentTile.isFreeSwapTile,
                                currentTile.isStickyFreeSwapTile
                            );
                        }
                        // Element will be updated by renderBoard below
                    } else {
                        // Disappear - remove from board state
                        this.board[row][col] = null;
                    }

                    // Remove the element so renderBoard can start fresh (except for double action)
                    if (element && this.smallestTileAction !== "double") {
                        element.remove();
                    }
                });

                // Update spawnableTiles: remove smallest, add next
                this.tileValues = this.tileValues.filter((v) => v !== minValue);
                this.tileValues.push(maxValue + 1);
                this.tileValues.sort((a, b) => a - b);

                // Re-render board for double action to show updated values
                if (this.smallestTileAction === "double") {
                    this.renderBoard();
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
                const dontShowCheckbox = document.getElementById("dontShowAgain");

                const closeDialog = () => {
                    if (dontShowCheckbox.checked) {
                        localStorage.setItem("match2048_dontShowIntro", "true");
                    }
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
                    // Clear localStorage data
                    localStorage.removeItem("match2048_currentLevel");
                    localStorage.removeItem("match2048_score");

                    // Reset game state
                    this.currentLevel = 1;
                    this.score = 0;
                    saveCurrentLevel(this.currentLevel);
                    saveScore(this.score);

                    // Load level 1 and restart the game
                    this.loadLevel(1);
                    this.createBoard();
                    this.renderBoard();
                    this.showGoalDialogIfNeeded();
                }
            });
        }
    }
}
