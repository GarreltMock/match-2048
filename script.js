class Match3Game {
    constructor() {
        // Tile type constants
        this.TILE_TYPE = {
            NORMAL: "normal",
            BLOCKED: "blocked",
            JOKER: "joker",
        };
        this.board = [];
        this.boardWidth = 8; // Default width, will be updated by loadLevel
        this.boardHeight = 8; // Default height, will be updated by loadLevel
        this.defaultTileValues = [1, 2, 3, 4]; // Internal representation: 1=2, 2=4, 3=8, 4=16
        this.tileValues = this.defaultTileValues;
        this.numberBase = this.loadNumberBase(); // 2 or 3
        this.showReviewBoard = this.loadShowReviewBoard(); // true or false
        this.score = this.loadScore();
        this.selectedGem = null;
        this.isDragging = false;
        this.dragStartPos = null;
        this.animating = false;
        this.lastSwapPosition = null; // Track last swap position for special tile placement
        this.isUserSwap = false; // Track if we're processing a user swap

        this.currentLevel = this.loadCurrentLevel();
        this.levelGoals = [];
        this.tileCounts = {};
        this.movesUsed = 0;
        this.maxMoves = 0;
        this.gameActive = true;

        // Power-up system
        this.activePowerUp = null;
        this.powerUpSwapTiles = [];
        this.powerUpUses = {
            hammer: 0,
            halve: 0,
            swap: 0,
        };
        this.maxPowerUpUses = 2;

        // Special tiles configuration
        this.specialTileConfig = this.loadSpecialTileConfig();
        this.SPECIAL_TILE_TYPES = {
            NONE: "none",
            JOKER: "joker",
            POWER: "power",
            GOLDEN: "golden",
            FREESWAP: "freeswap",
        };
        this.FORMATION_TYPES = {
            LINE_4: "line_4",
            BLOCK_4: "block_4",
            LINE_5: "line_5",
            T_FORMATION: "t_formation",
            L_FORMATION: "l_formation",
        };

        this.initializeLevels();
        this.showIntroDialog();
        this.setupInfoButton();
        this.setupSettingsButton();
        this.setupExtraMovesDialog();
        this.init();
    }

    // Helper methods for tile objects
    createTile(value, isPowerTile = false, isGoldenTile = false, isFreeSwapTile = false) {
        return {
            type: this.TILE_TYPE.NORMAL,
            value: value,
            isPowerTile: isPowerTile,
            isGoldenTile: isGoldenTile,
            isFreeSwapTile: isFreeSwapTile,
            hasBeenSwapped: false,
        };
    }

    createBlockedTile() {
        return {
            type: this.TILE_TYPE.BLOCKED,
            value: null,
            isPowerTile: false,
            isGoldenTile: false,
            isFreeSwapTile: false,
            hasBeenSwapped: false,
        };
    }

    createJokerTile() {
        return {
            type: this.TILE_TYPE.JOKER,
            value: null,
            isPowerTile: false,
            isGoldenTile: false,
            isFreeSwapTile: false,
            hasBeenSwapped: false,
        };
    }

    getTileValue(tile) {
        if (!tile || tile.type !== this.TILE_TYPE.NORMAL) {
            return null;
        }
        return tile.value;
    }

    getTileType(tile) {
        if (!tile) return null;
        return tile.type;
    }

    isBlocked(tile) {
        return tile && tile.type === this.TILE_TYPE.BLOCKED;
    }

    isJoker(tile) {
        return tile && tile.type === this.TILE_TYPE.JOKER;
    }

    isNormal(tile) {
        return tile && tile.type === this.TILE_TYPE.NORMAL;
    }

    isTilePowerTile(tile) {
        return tile && tile.type === this.TILE_TYPE.NORMAL && tile.isPowerTile === true;
    }

    isTileGoldenTile(tile) {
        return tile && tile.type === this.TILE_TYPE.NORMAL && tile.isGoldenTile === true;
    }

    isTileFreeSwapTile(tile) {
        return tile && tile.type === this.TILE_TYPE.NORMAL && tile.isFreeSwapTile === true;
    }

    // Convert internal value (1, 2, 3...) to display value based on numberBase
    getDisplayValue(internalValue) {
        if (this.numberBase === 3) {
            // Powers of 3: 3^1=3, 3^2=9, 3^3=27, 3^4=81, etc.
            return Math.pow(3, internalValue);
        } else {
            // Powers of 2: 2^1=2, 2^2=4, 2^3=8, 2^4=16, etc.
            return Math.pow(2, internalValue);
        }
    }

    loadNumberBase() {
        const saved = localStorage.getItem("match2048_numberBase");
        return saved ? parseInt(saved, 10) : 2;
    }

    saveNumberBase() {
        localStorage.setItem("match2048_numberBase", this.numberBase.toString());
    }

    loadShowReviewBoard() {
        const saved = localStorage.getItem("match2048_showReviewBoard");
        return saved === null ? true : saved === "true";
    }

    saveShowReviewBoard() {
        localStorage.setItem("match2048_showReviewBoard", this.showReviewBoard.toString());
    }

    loadSpecialTileConfig() {
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

    saveSpecialTileConfig() {
        localStorage.setItem("match2048_specialTileConfig", JSON.stringify(this.specialTileConfig));
    }

    initializeLevels() {
        // Internal representation: 1=2, 2=4, 3=8, 4=16, 5=32, 6=64, 7=128, 8=256, 9=512, 10=1024
        this.levels = [
            {
                level: 1,
                boardWidth: 6,
                boardHeight: 6,
                maxMoves: 10,
                // blockedTiles: [{ row: 3 }, { row: 4 }, { row: 5 }],
                goals: [{ tileValue: 6, target: 1, current: 0, goalType: "created" }], // 32
                spawnableTiles: [1, 2, 3], // 2, 4, 8
            },
            {
                level: 2,
                boardWidth: 6,
                boardHeight: 6,
                maxMoves: 15,
                blockedTiles: [{ row: 3 }, { row: 4 }, { row: 5 }],
                goals: [
                    { tileValue: 6, target: 1, current: 0, goalType: "created" }, // 64
                    { tileValue: 5, target: 3, current: 0, goalType: "created" }, // 32
                ],
            },
            {
                level: 3,
                maxMoves: 20,
                boardWidth: 6,
                boardHeight: 6,
                blockedTiles: [{ row: 4 }, { row: 5 }],
                goals: [
                    { tileValue: 6, target: 2, current: 0, goalType: "created" }, // 64
                    { tileValue: 5, target: 3, current: 0, goalType: "created" }, // 32
                ],
            },
            {
                level: 4,
                maxMoves: 30,
                blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
                goals: [{ tileValue: 7, target: 1, current: 0, goalType: "created" }], // 128
            },
            {
                level: 5,
                maxMoves: 40,
                blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
                goals: [{ tileValue: 7, target: 4, current: 0, goalType: "created" }], // 128
            },
            {
                level: 6,
                maxMoves: 50,
                blockedTiles: [{ row: 5 }, { row: 6 }, { row: 7 }],
                goals: [
                    { tileValue: 8, target: 1, current: 0, goalType: "created" }, // 256
                    { tileValue: 6, target: 4, current: 0, goalType: "created" }, // 64
                ],
            },
            {
                level: 7,
                maxMoves: 30,
                blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
                goals: [{ tileValue: 5, target: 16, current: 0, goalType: "current" }], // 32
            },
            {
                level: 8,
                maxMoves: 55,
                blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
                goals: [
                    { tileValue: 8, target: 1, current: 0, goalType: "created" }, // 256
                    { tileValue: 7, target: 2, current: 0, goalType: "created" }, // 128
                    { tileValue: 6, target: 4, current: 0, goalType: "created" }, // 64
                ],
            },
            {
                level: 9,
                maxMoves: 60,
                blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
                goals: [
                    { tileValue: 9, target: 1, current: 0, goalType: "created" }, // 512
                    { tileValue: 7, target: 2, current: 0, goalType: "created" }, // 128
                ],
            },
            {
                level: 10,
                maxMoves: 70,
                blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
                goals: [{ tileValue: 10, target: 1, current: 0, goalType: "created" }], // 1024
                spawnableTiles: [2, 3, 4, 5], // 4, 8, 16, 32
            },

            {
                level: 11,
                maxMoves: 60,
                blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
                goals: [
                    { tileValue: 10, target: 1, current: 0, goalType: "created" }, // 1024
                    { current: 0, goalType: "blocked" },
                ],
                spawnableTiles: [2, 3, 4, 5], // 4, 8, 16, 32
            },
            {
                level: 11,
                boardWidth: 9,
                maxMoves: 50,
                blockedTiles: [
                    { row: 4, col: 0 },
                    { row: 4, col: 8 },
                    { row: 5, col: [0, 1, 7, 8] },
                    { row: 6, col: [0, 1, 2, 6, 7, 8] },
                    { row: 7, col: [0, 1, 2, 3, 5, 6, 7, 8] },
                    { row: 8 },
                ],
                goals: [
                    { tileValue: 9, target: 2, current: 0, goalType: "created" }, // 512
                    { tileValue: 8, target: 4, current: 0, goalType: "current" }, // 256
                ],
                spawnableTiles: [2, 3, 4, 5], // 4, 8, 16, 32
            },
            {
                level: 12,
                maxMoves: 30,
                blockedTiles: [{ row: 3 }, { row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
                goals: [{ current: 0, goalType: "blocked" }],
                spawnableTiles: [2, 3, 4, 5], // 4, 8, 16, 32
            },
            {
                level: 13,
                maxMoves: 40,
                blockedTiles: [{ col: 0 }, { col: 1 }, { col: 6 }, { col: 7 }],
                goals: [
                    { current: 0, goalType: "blocked" },
                    { tileValue: 7, target: 4, current: 0, goalType: "current" }, // 128
                ],
                spawnableTiles: [2, 3, 4], // 4, 8, 16
            },
            {
                level: 14,
                maxMoves: 50,
                boardHeight: 10,
                blockedTiles: [{ row: 3 }, { row: 4 }, { row: 8 }, { row: 9 }],
                goals: [
                    { tileValue: 9, target: 1, current: 0, goalType: "created" }, // 512
                    { tileValue: 8, target: 3, current: 0, goalType: "current" }, // 256
                ],
                spawnableTiles: [2, 3, 4, 5], // 4, 8, 16, 32
            },
            {
                level: 15,
                boardWidth: 6,
                boardHeight: 10,
                maxMoves: 20,
                blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }, { row: 8 }, { row: 9 }],
                goals: [{ current: 0, goalType: "blocked" }],
                spawnableTiles: [1, 2, 3], // 2, 4, 8
            },
            {
                level: 16,
                boardWidth: 6,
                boardHeight: 8,
                maxMoves: 20,
                goals: [{ tileValue: 6, target: 12, current: 0, goalType: "current" }], // 64
                spawnableTiles: [2, 3, 4, 5], // 4, 8, 16, 32
            },
            {
                level: 17,
                boardWidth: 6,
                boardHeight: 8,
                maxMoves: 20,
                blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
                goals: [{ tileValue: 6, target: 12, current: 0, goalType: "current" }], // 64
                spawnableTiles: [2, 3, 4, 5], // 4, 8, 16, 32
            },
            {
                level: 18,
                boardWidth: 6,
                boardHeight: 8,
                maxMoves: 20,
                blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
                goals: [
                    { tileValue: 6, target: 12, current: 0, goalType: "current" }, // 64
                    { current: 0, goalType: "blocked" },
                ],
                spawnableTiles: [2, 3, 4, 5], // 4, 8, 16, 32
            },
            {
                level: 19,
                boardHeight: 10,
                maxMoves: 60,
                blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }, { row: 8 }, { row: 9 }],
                goals: [
                    { tileValue: 10, target: 1, current: 0, goalType: "created" }, // 1024
                    { tileValue: 9, target: 1, current: 0, goalType: "current" }, // 512
                ],
                spawnableTiles: [2, 3, 4, 5], // 4, 8, 16, 32
            },
        ];

        this.loadLevel(this.currentLevel);
    }

    loadCurrentLevel() {
        const savedLevel = localStorage.getItem("match2048_currentLevel");
        return savedLevel ? parseInt(savedLevel, 10) : 1;
    }

    saveCurrentLevel() {
        localStorage.setItem("match2048_currentLevel", this.currentLevel.toString());
    }

    loadScore() {
        const savedScore = localStorage.getItem("match2048_score");
        return savedScore ? parseInt(savedScore, 10) : 0;
    }

    saveScore() {
        localStorage.setItem("match2048_score", this.score.toString());
    }

    loadLevel(levelNum) {
        const level = this.levels[levelNum - 1];
        if (!level) return;

        this.currentLevel = levelNum;
        this.saveCurrentLevel(); // Save progress to localStorage
        this.boardWidth = level.boardWidth || 8; // Use level-specific board width or default to 8
        this.boardHeight = level.boardHeight || 8; // Use level-specific board height or default to 8
        this.blockedTiles = level.blockedTiles || []; // Store blocked tile positions
        this.tileValues = level.spawnableTiles || this.defaultTileValues; // Use level-specific spawnable tiles or default
        this.maxMoves = level.maxMoves;
        this.movesUsed = 0;

        this.initialBlockedTileCount = this.countBlockedLevelTiles();

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
        this.gameActive = true;

        this.renderGoals();
        this.updateMovesDisplay();

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

        // Reset power-up usage for new level
        this.powerUpUses = {
            hammer: 0,
            halve: 0,
            swap: 0,
        };

        // Deactivate any power-ups when loading a level
        this.deactivatePowerUp();

        // Update power-up button states
        this.updatePowerUpButtons();

        // Update score display on level load
        document.getElementById("score").textContent = this.score;
    }

    init() {
        this.createBoard();
        this.renderBoard();
        this.setupEventListeners();
        this.setupControlButtons();
        this.renderGoals();
        this.updateMovesDisplay();
    }

    createBoard() {
        this.board = [];
        for (let row = 0; row < this.boardHeight; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.boardWidth; col++) {
                do {
                    this.board[row][col] = this.createTile(this.getRandomTileValue());
                } while (this.hasInitialMatch(row, col));
            }
        }

        // Place blocked tiles
        if (this.blockedTiles) {
            this.blockedTiles.forEach((blockedPos) => {
                if (blockedPos.row !== undefined && blockedPos.col !== undefined) {
                    const colArray = Array.isArray(blockedPos.col) ? blockedPos.col : [blockedPos.col];
                    for (const col of colArray) {
                        if (blockedPos.row < this.boardHeight && col < this.boardWidth) {
                            this.board[blockedPos.row][col] = this.createBlockedTile();
                        }
                    }
                } else if (blockedPos.row !== undefined && blockedPos.col === undefined) {
                    // Entire row: { row: 2 }
                    if (blockedPos.row < this.boardHeight) {
                        for (let col = 0; col < this.boardWidth; col++) {
                            this.board[blockedPos.row][col] = this.createBlockedTile();
                        }
                    }
                } else if (blockedPos.col !== undefined && blockedPos.row === undefined) {
                    // Entire column: { col: 3 }
                    if (blockedPos.col < this.boardWidth) {
                        for (let row = 0; row < this.boardHeight; row++) {
                            this.board[row][blockedPos.col] = this.createBlockedTile();
                        }
                    }
                }
            });
        }
    }

    getRandomTileValue() {
        return this.tileValues[Math.floor(Math.random() * this.tileValues.length)];
    }

    canMatch(tile1, tile2) {
        // Helper function to check if two tiles can match
        const val1 = this.getTileValue(tile1);
        const val2 = this.getTileValue(tile2);

        if (val1 === val2) return true;

        // Check if either tile is a power tile
        const isPower1 = this.isTilePowerTile(tile1);
        const isPower2 = this.isTilePowerTile(tile2);

        // Power tile matches with its value or higher
        if (isPower1 && val2 >= val1) return true;
        if (isPower2 && val1 >= val2) return true;

        return false;
    }

    hasInitialMatch(row, col) {
        const tile = this.board[row][col];
        const value = this.getTileValue(tile);

        // Check horizontal matches
        if (col >= 2 && this.board[row][col - 1] && this.board[row][col - 2]) {
            const val1 = this.getTileValue(this.board[row][col - 1]);
            const val2 = this.getTileValue(this.board[row][col - 2]);
            if (value === val1 && value === val2) {
                return true;
            }
        }

        // Check vertical matches
        if (row >= 2 && this.board[row - 1][col] && this.board[row - 2][col]) {
            const val1 = this.getTileValue(this.board[row - 1][col]);
            const val2 = this.getTileValue(this.board[row - 2][col]);
            if (value === val1 && value === val2) {
                return true;
            }
        }

        // Check special formations that could be created by placing this tile

        // Check if this position completes a T-formation
        if (this.checkTFormation(row, col, value)) {
            return true;
        }

        // Check if this position completes an L-formation
        if (this.checkLFormation(row, col, value)) {
            return true;
        }

        // Check if this position completes a block formation (check all possible 2x2 blocks this tile could be part of)
        const blockPositions = [
            [row - 1, col - 1], // This tile is bottom-right of block
            [row - 1, col], // This tile is bottom-left of block
            [row, col - 1], // This tile is top-right of block
            [row, col], // This tile is top-left of block
        ];

        for (const [blockRow, blockCol] of blockPositions) {
            if (this.checkBlockFormation(blockRow, blockCol, value)) {
                return true;
            }
        }

        return false;
    }

    updateTileCounts() {
        // Count tiles currently on the board for "current" type goals
        this.tileCounts = {};
        for (let row = 0; row < this.boardHeight; row++) {
            for (let col = 0; col < this.boardWidth; col++) {
                const tile = this.board[row][col];
                if (this.isNormal(tile)) {
                    const value = this.getTileValue(tile);
                    this.tileCounts[value] = (this.tileCounts[value] || 0) + 1;
                }
            }
        }

        // Update current counts for "current" type goals
        this.levelGoals.forEach((goal) => {
            if (goal.goalType === "current") {
                goal.current = this.tileCounts[goal.tileValue] || 0;
            }
        });
    }

    countBlockedLevelTiles() {
        if (!this.blockedTiles || this.blockedTiles.length === 0) return 0;

        let count = 0;
        this.blockedTiles.forEach((blockedPos) => {
            if (blockedPos.row !== undefined && blockedPos.col !== undefined) {
                if (blockedPos.row < this.boardHeight && blockedPos.col < this.boardWidth) {
                    count++;
                }
            } else if (blockedPos.row !== undefined && blockedPos.col === undefined) {
                if (blockedPos.row < this.boardHeight) {
                    count += this.boardWidth;
                }
            } else if (blockedPos.col !== undefined && blockedPos.row === undefined) {
                if (blockedPos.col < this.boardWidth) {
                    count += this.boardHeight;
                }
            }
        });
        return count;
    }

    countBlockedTiles() {
        if (!this.board || !this.board[0]) return 0;

        let count = 0;
        for (let row = 0; row < this.boardHeight; row++) {
            for (let col = 0; col < this.boardWidth; col++) {
                if (this.isBlocked(this.board[row][col])) {
                    count++;
                }
            }
        }
        return count;
    }

    updateBlockedTileGoals() {
        const currentBlockedCount = this.countBlockedTiles();
        const clearedCount = this.initialBlockedTileCount - currentBlockedCount;

        this.levelGoals.forEach((goal) => {
            if (goal.goalType === "blocked") {
                goal.current = clearedCount;
            }
        });
    }

    updateGoalDisplay(checkComplete = false) {
        // Update tile counts for current-type goals
        this.updateTileCounts();
        this.renderGoals();
        if (checkComplete) {
            this.checkLevelComplete();
        }
    }

    checkLevelComplete() {
        // Don't check while animations are running
        if (this.animating) return;

        const allGoalsComplete = this.levelGoals.every((goal) => {
            if (goal.goalType === "current") {
                return goal.current >= goal.target;
            } else if (goal.goalType === "blocked") {
                return goal.current >= goal.target;
            } else {
                return goal.created >= goal.target;
            }
        });
        const nextBtn = document.getElementById("nextBtn");
        const restartBtn = document.getElementById("restartBtn");

        if (allGoalsComplete) {
            this.gameActive = false;
            this.deactivatePowerUp();

            // Hide power-ups and show control buttons
            this.hidePowerUps();
            restartBtn.style.display = "inline-block";
            if (this.currentLevel < this.levels.length) {
                nextBtn.style.display = "inline-block";
            }
            setTimeout(() => {
                alert(`Level ${this.currentLevel} Complete! 🎉`);
            }, 500);
        } else if (this.movesUsed >= this.maxMoves && !this.hasMatches()) {
            // Only trigger game over if there are no more cascading matches AND no animations running
            this.gameActive = false;
            this.deactivatePowerUp();

            // Hide power-ups
            this.hidePowerUps();

            // Show extra moves dialog after a delay to let final animations settle
            setTimeout(() => {
                this.showExtraMovesDialog();
            }, 800);
        } else if (this.gameActive) {
            nextBtn.style.display = "none";
            restartBtn.style.display = "none";
            // Show power-ups during active gameplay
            this.showPowerUps();
        }
    }

    nextLevel() {
        const nextBtn = document.getElementById("nextBtn");
        nextBtn.style.display = "none";

        if (this.currentLevel < this.levels.length) {
            this.currentLevel++;
            this.saveCurrentLevel(); // Save progress to localStorage
            this.loadLevel(this.currentLevel);
            this.createBoard();
            this.renderBoard();
        } else {
            alert("Congratulations! You've completed all levels! 🏆");
        }
    }

    restartLevel() {
        this.loadLevel(this.currentLevel);
        this.createBoard();
        this.renderBoard();
    }

    renderBoard() {
        const gameBoard = document.getElementById("gameBoard");
        gameBoard.innerHTML = "";

        // Update CSS grid template to match current board size
        gameBoard.style.gridTemplateColumns = `repeat(${this.boardWidth}, 1fr)`;
        gameBoard.style.gridTemplateRows = `repeat(${this.boardHeight}, 1fr)`;

        // Calculate width based on board aspect ratio to fit within 50vh height
        const aspectRatio = this.boardWidth / this.boardHeight;
        const maxHeight = window.innerHeight * 0.5; // 50vh
        const padding = 30; // Approximate padding from CSS clamp(6px, 3vw, 15px) * 2
        const maxContentHeight = maxHeight - padding;
        const calculatedWidth = maxContentHeight * aspectRatio + padding;
        const maxWidth = Math.min(calculatedWidth, window.innerWidth * 0.9, 550);

        gameBoard.style.width = `${maxWidth}px`;

        for (let row = 0; row < this.boardHeight; row++) {
            for (let col = 0; col < this.boardWidth; col++) {
                const gem = document.createElement("div");
                const tile = this.board[row][col];
                gem.dataset.row = row;
                gem.dataset.col = col;

                // Set CSS class based on tile type
                if (this.isBlocked(tile)) {
                    gem.className = `gem tile-BLOCKED`;
                } else if (this.isJoker(tile)) {
                    gem.className = `gem tile-JOKER`;
                    gem.textContent = "*"; //"🃏";
                    gem.classList.add("joker-tile");
                } else if (this.isNormal(tile)) {
                    const value = this.getTileValue(tile);
                    gem.className = `gem tile-${value}`;
                    const displayValue = this.getDisplayValue(value);
                    gem.textContent = displayValue;

                    // Add power-tile class if this is a power tile
                    if (this.isTilePowerTile(tile)) {
                        gem.classList.add("power-tile");
                    }

                    // Add golden-tile class if this is a golden tile
                    if (this.isTileGoldenTile(tile)) {
                        gem.classList.add("golden-tile");
                    }

                    // Add freeswap-tile class if this is a free swap tile that hasn't been used
                    if (this.isTileFreeSwapTile(tile) && !tile.hasBeenSwapped) {
                        gem.classList.add("freeswap-tile");
                    }
                }

                gameBoard.appendChild(gem);
            }
        }

        this.updateGoalDisplay();
    }

    setupEventListeners() {
        const gameBoard = document.getElementById("gameBoard");

        // Touch events for mobile
        gameBoard.addEventListener("touchstart", this.handleTouchStart.bind(this), { passive: false });
        gameBoard.addEventListener("touchmove", this.handleTouchMove.bind(this), { passive: false });
        gameBoard.addEventListener("touchend", this.handleTouchEnd.bind(this), { passive: false });

        // Mouse events for desktop
        gameBoard.addEventListener("mousedown", this.handleMouseDown.bind(this));
        gameBoard.addEventListener("mousemove", this.handleMouseMove.bind(this));
        gameBoard.addEventListener("mouseup", this.handleMouseUp.bind(this));
        gameBoard.addEventListener("mouseleave", this.handleMouseUp.bind(this));
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

    setupPowerUps() {
        const powerUpButtons = document.querySelectorAll(".power-up-btn");

        powerUpButtons.forEach((button) => {
            button.addEventListener("click", () => {
                if (!this.gameActive) return;

                const powerUpType = button.dataset.powerup;

                // Check if power-up has uses remaining
                if (this.powerUpUses[powerUpType] >= this.maxPowerUpUses) {
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
            const usesLeft = this.maxPowerUpUses - this.powerUpUses[powerUpType];

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
                indicator.textContent = usesLeft;
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
        if (this.isBlocked(tile)) return;

        const value = this.getTileValue(tile);

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
        // Increment usage count
        this.powerUpUses.hammer++;
        this.updatePowerUpButtons();

        // Block interactions during animation
        this.animating = true;

        // Remove the tile from the board
        this.board[row][col] = null;

        // Animate the tile shrinking away
        element.style.transition = "transform 0.3s ease, opacity 0.3s ease";
        element.style.opacity = "0";
        element.style.transform = "scale(0)";

        setTimeout(() => {
            // Remove the element from DOM to prevent re-rendering issues
            element.remove();

            this.dropGems();
            this.deactivatePowerUp();

            // Process any matches after tiles drop
            setTimeout(() => {
                this.animating = false; // Allow interactions again
                this.processMatches();
            }, 600);
        }, 300);
    }

    usePowerUpHalve(row, col, element) {
        const tile = this.board[row][col];
        const currentValue = this.getTileValue(tile);
        if (currentValue && this.isNormal(tile) && currentValue > 1) {
            // Increment usage count
            this.powerUpUses.halve++;
            this.updatePowerUpButtons();

            // Block interactions during animation
            this.animating = true;

            // Decrement by 1 to go to previous level (halving in display terms)
            const halvedValue = currentValue - 1;
            this.board[row][col] = this.createTile(halvedValue);

            // Track goal progress for the newly created tile
            this.trackGoalProgress(halvedValue, 1);

            // Update the visual element
            const displayValue = this.getDisplayValue(halvedValue);
            element.textContent = displayValue;
            element.className = `gem tile-${halvedValue}`;
            element.dataset.row = row;
            element.dataset.col = col;

            // Add animation effect
            element.style.transform = "scale(1.2)";
            setTimeout(() => {
                element.style.transform = "scale(1)";

                // Update goal display and check for level completion
                this.updateGoalDisplay(true);

                // Process any matches after halving
                setTimeout(() => {
                    this.animating = false; // Allow interactions again
                    this.processMatches();
                }, 100);
            }, 200);

            this.deactivatePowerUp();
        }
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.startDrag(touch.clientX, touch.clientY);
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.updateDrag(touch.clientX, touch.clientY);
    }

    handleTouchEnd(e) {
        e.preventDefault();
        this.endDrag();
    }

    handleMouseDown(e) {
        this.startDrag(e.clientX, e.clientY);
    }

    handleMouseMove(e) {
        this.updateDrag(e.clientX, e.clientY);
    }

    handleMouseUp() {
        this.endDrag();
    }

    getUniqueTileValues() {
        // Get all unique tile values on the board (excluding blocked and joker tiles)
        const allValues = [];
        for (let r = 0; r < this.boardHeight; r++) {
            for (let c = 0; c < this.boardWidth; c++) {
                const tile = this.board[r][c];
                if (this.isNormal(tile)) {
                    const val = this.getTileValue(tile);
                    if (!allValues.includes(val)) {
                        allValues.push(val);
                    }
                }
            }
        }
        return allValues;
    }

    findBestJokerValue(jokerRow, jokerCol) {
        // Find the best value to transform the joker into
        // Returns the value if a match is found, null otherwise

        const allValues = this.getUniqueTileValues();

        // Sort from highest to lowest
        allValues.sort((a, b) => b - a);

        // Try each value from highest to lowest
        for (const testValue of allValues) {
            // Temporarily set joker to this value
            this.board[jokerRow][jokerCol] = this.createTile(testValue);

            // Use existing findMatches to check if this creates a valid match
            const matches = this.findMatches();

            // Check if any match includes our joker position AND has no other jokers
            const validMatch = matches.find((match) => {
                // Check if this match includes our joker position
                const includesJokerPos = match.tiles.some((tile) => tile.row === jokerRow && tile.col === jokerCol);

                if (!includesJokerPos) return false;

                // Check that no other jokers are in this match
                const hasOtherJokers = match.tiles.some((tile) => {
                    // Skip the joker we're testing
                    if (tile.row === jokerRow && tile.col === jokerCol) return false;
                    // Check if this tile is a joker
                    return this.isJoker(this.board[tile.row][tile.col]);
                });

                return !hasOtherJokers;
            });

            if (validMatch) {
                // Found a valid match! Return the value (board is already set)
                return testValue;
            }

            // No match, try next value
            this.board[jokerRow][jokerCol] = this.createJokerTile();
        }

        // No valid matches found, restore joker
        this.board[jokerRow][jokerCol] = this.createJokerTile();
        return null;
    }

    startDrag(x, y) {
        if (!this.gameActive || this.animating) return;

        const element = document.elementFromPoint(x, y);
        if (element && element.classList.contains("gem")) {
            const row = parseInt(element.dataset.row);
            const col = parseInt(element.dataset.col);
            const tile = this.board[row][col];
            const value = this.getTileValue(tile);

            // Handle power-ups
            if (this.activePowerUp) {
                const handled = this.handlePowerUpAction(row, col, element);
                if (handled !== false) {
                    return;
                }
                // If handlePowerUpAction returns false (swap case), continue with normal drag
            }
            // Normal drag behavior (including joker)
            this.selectedGem = {
                element: element,
                row: row,
                col: col,
                tile: value, // Store tile to detect joker taps later
            };
            this.isDragging = true;
            this.dragStartPos = { x, y };
            element.classList.add("dragging");
        }
    }

    updateDrag(x, y) {
        if (!this.isDragging || !this.selectedGem) return;

        const element = document.elementFromPoint(x, y);
        if (element && element.classList.contains("gem") && element !== this.selectedGem.element) {
            const targetRow = parseInt(element.dataset.row);
            const targetCol = parseInt(element.dataset.col);

            // Check if gems are adjacent
            if (this.areAdjacent(this.selectedGem.row, this.selectedGem.col, targetRow, targetCol)) {
                this.previewSwap(this.selectedGem.row, this.selectedGem.col, targetRow, targetCol);
            }
        }
    }

    endDrag() {
        if (!this.isDragging || !this.selectedGem) return;

        const previewGems = document.querySelectorAll(".gem.preview");

        if (previewGems.length > 0) {
            // User dragged to swap
            const targetGem = Array.from(previewGems).find((g) => g !== this.selectedGem.element);
            if (targetGem) {
                const targetRow = parseInt(targetGem.dataset.row);
                const targetCol = parseInt(targetGem.dataset.col);
                this.trySwap(this.selectedGem.row, this.selectedGem.col, targetRow, targetCol);
            }
        } else if (this.isJoker(this.selectedGem.tile)) {
            // User tapped on joker without dragging - try to activate it
            this.activateJokerByTap(this.selectedGem.row, this.selectedGem.col, this.selectedGem.element);
        }

        // Clean up
        document.querySelectorAll(".gem").forEach((gem) => {
            gem.classList.remove("dragging", "preview");
        });

        this.selectedGem = null;
        this.isDragging = false;
        this.dragStartPos = null;
    }

    activateJokerByTap(row, col, element) {
        // Activate joker when tapped
        const bestValue = this.findBestJokerValue(row, col);

        if (bestValue !== null) {
            // Transform and animate
            this.animating = true;
            element.style.transform = "scale(1.2)";
            element.textContent = this.getDisplayValue(bestValue);
            element.className = `gem tile-${bestValue}`;

            setTimeout(() => {
                element.style.transform = "scale(1)";
                this.board[row][col] = this.createTile(bestValue); // Update board
                setTimeout(() => {
                    this.animating = false;
                    this.isUserSwap = true; // Treat tap as user action
                    this.processMatches();
                }, 200);
            }, 300);
        }
    }

    areAdjacent(row1, col1, row2, col2) {
        const rowDiff = Math.abs(row1 - row2);
        const colDiff = Math.abs(col1 - col2);
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }

    previewSwap(row1, col1, row2, col2) {
        // Clear previous previews
        document.querySelectorAll(".gem.preview").forEach((gem) => {
            gem.classList.remove("preview");
        });

        // Add preview to both gems
        const gem1 = document.querySelector(`[data-row="${row1}"][data-col="${col1}"]`);
        const gem2 = document.querySelector(`[data-row="${row2}"][data-col="${col2}"]`);

        if (gem1 && gem2) {
            gem1.classList.add("preview");
            gem2.classList.add("preview");
        }
    }

    trySwap(row1, col1, row2, col2) {
        if (!this.gameActive || this.animating) return;

        // Prevent swapping if either tile is blocked
        if (this.isBlocked(this.board[row1][col1]) || this.isBlocked(this.board[row2][col2])) {
            return;
        }

        // Check if either tile is a free swap tile that hasn't been used
        const tile1 = this.board[row1][col1];
        const tile2 = this.board[row2][col2];
        const isFreeSwap1 = this.isTileFreeSwapTile(tile1) && !tile1.hasBeenSwapped;
        const isFreeSwap2 = this.isTileFreeSwapTile(tile2) && !tile2.hasBeenSwapped;
        const hasFreeSwap = isFreeSwap1 || isFreeSwap2;

        // Temporarily swap gems
        const temp = this.board[row1][col1];
        this.board[row1][col1] = this.board[row2][col2];
        this.board[row2][col2] = temp;

        // Track which tile was moved (the one that changed position)
        this.lastSwapPosition = { row: row2, col: col2, movedFrom: { row: row1, col: col1 } };

        // Mark this as a user swap for match detection
        this.isUserSwap = true;

        // Check if this creates any matches (or if using swap power-up or free swap tile)
        const isSwapPowerUp = this.activePowerUp === "swap";

        if (this.hasMatches() || isSwapPowerUp || hasFreeSwap) {
            this.movesUsed++;
            this.updateMovesDisplay();

            // Mark free swap tile as used
            if (hasFreeSwap) {
                if (isFreeSwap1) {
                    this.board[row2][col2].hasBeenSwapped = true;
                }
                if (isFreeSwap2) {
                    this.board[row1][col1].hasBeenSwapped = true;
                }
            }

            this.animateSwap(row1, col1, row2, col2, () => {
                this.renderBoard();

                if (isSwapPowerUp) {
                    // Increment usage count and deactivate power-up after successful swap
                    this.powerUpUses.swap++;
                    this.updatePowerUpButtons();
                    this.deactivatePowerUp();
                }

                this.processMatches();
            });
        } else {
            // Revert the swap
            this.board[row2][col2] = this.board[row1][col1];
            this.board[row1][col1] = temp;
            this.lastSwapPosition = null;
            this.isUserSwap = false;
            this.animateRevert(row1, col1, row2, col2);
        }
    }

    animateSwap(row1, col1, row2, col2, callback) {
        this.animating = true;

        const gem1 = document.querySelector(`[data-row="${row1}"][data-col="${col1}"]`);
        const gem2 = document.querySelector(`[data-row="${row2}"][data-col="${col2}"]`);

        if (gem1 && gem2) {
            const rect1 = gem1.getBoundingClientRect();
            const rect2 = gem2.getBoundingClientRect();

            const deltaX = rect2.left - rect1.left;
            const deltaY = rect2.top - rect1.top;

            // Animate both gems swapping positions
            gem1.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            gem2.style.transform = `translate(${-deltaX}px, ${-deltaY}px)`;
            gem1.style.transition = "transform 0.3s ease-out";
            gem2.style.transition = "transform 0.3s ease-out";
            gem1.style.zIndex = "100";
            gem2.style.zIndex = "100";

            setTimeout(() => {
                // Clean up transform and transition
                gem1.style.transform = "";
                gem2.style.transform = "";
                gem1.style.transition = "";
                gem2.style.transition = "";
                gem1.style.zIndex = "";
                gem2.style.zIndex = "";

                // Execute callback (render board and process matches)
                // Note: callback (processMatches) will handle setting this.animating = false
                if (callback) callback();
            }, 300);
        } else {
            // Fallback if elements not found
            this.animating = false;
            if (callback) callback();
        }
    }

    animateRevert(row1, col1, row2, col2) {
        this.animating = true;

        const gem1 = document.querySelector(`[data-row="${row1}"][data-col="${col1}"]`);
        const gem2 = document.querySelector(`[data-row="${row2}"][data-col="${col2}"]`);

        if (gem1 && gem2) {
            const gem1Rect = gem1.getBoundingClientRect();
            const gem2Rect = gem2.getBoundingClientRect();

            const deltaX = gem2Rect.left - gem1Rect.left;
            const deltaY = gem2Rect.top - gem1Rect.top;

            // Apply initial swap animation (fast)
            gem1.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            gem2.style.transform = `translate(${-deltaX}px, ${-deltaY}px)`;
            gem1.style.transition = "transform 0.20s ease-out";
            gem2.style.transition = "transform 0.20s ease-out";
            gem1.classList.add("invalid-swap");
            gem2.classList.add("invalid-swap");

            // Revert back to original position (fast)
            setTimeout(() => {
                gem1.style.transform = "translate(0, 0)";
                gem2.style.transform = "translate(0, 0)";
                gem1.style.transition = "transform 0.20s ease-in";
                gem2.style.transition = "transform 0.20s ease-in";
            }, 200);

            // Clean up after animation
            setTimeout(() => {
                gem1.style.transform = "";
                gem2.style.transform = "";
                gem1.style.transition = "";
                gem2.style.transition = "";
                gem1.classList.remove("invalid-swap");
                gem2.classList.remove("invalid-swap");
                this.animating = false;
            }, 400);
        } else {
            this.animating = false;
        }
    }

    hasMatches() {
        return this.findMatches().length > 0;
    }

    findMatches() {
        const matchGroups = [];

        // During user swap, try to activate jokers first
        if (this.isUserSwap) {
            for (let row = 0; row < this.boardHeight; row++) {
                for (let col = 0; col < this.boardWidth; col++) {
                    const tile = this.board[row][col];
                    if (this.isJoker(tile)) {
                        const bestValue = this.findBestJokerValue(row, col);
                        if (bestValue !== null) {
                            // Transform joker to the best value
                            this.board[row][col] = this.createTile(bestValue);
                        }
                    }
                }
            }
        }

        // Check for special T and L formations first (they take priority)
        const specialMatches = this.findSpecialFormations();
        matchGroups.push(...specialMatches);

        // If special formations found, don't check for regular matches to avoid overlaps
        if (specialMatches.length > 0) {
            return matchGroups;
        }

        // Check horizontal matches (track formation types)
        for (let row = 0; row < this.boardHeight; row++) {
            let matchGroup = [];
            let baseValue = null; // The lowest value in the match (for power tiles)
            let hasGoldenTile = false;

            for (let col = 0; col < this.boardWidth; col++) {
                const currentTile = this.board[row][col];
                const currentValue = this.getTileValue(currentTile);

                if (!this.isNormal(currentTile)) {
                    // End current match
                    if (matchGroup.length >= 3) {
                        const formationType =
                            matchGroup.length === 4
                                ? "line_4_horizontal"
                                : matchGroup.length === 5
                                ? "line_5_horizontal"
                                : "horizontal";
                        matchGroups.push({
                            tiles: [...matchGroup],
                            value: baseValue,
                            direction: formationType,
                            hasGoldenTile,
                        });
                    }
                    matchGroup = [];
                    baseValue = null;
                    hasGoldenTile = false;
                    continue;
                }

                // Check if this tile can be added to the current match
                if (matchGroup.length === 0) {
                    // Start new match
                    matchGroup.push({ row, col });
                    baseValue = currentValue;
                    hasGoldenTile = this.isTileGoldenTile(currentTile);
                } else {
                    // Check if current tile matches with the previous tile
                    const prevTile = matchGroup[matchGroup.length - 1];
                    if (this.canMatch(currentTile, this.board[prevTile.row][prevTile.col])) {
                        matchGroup.push({ row, col });
                        // Update base value to the minimum
                        baseValue = Math.min(baseValue, currentValue);
                        // Track if any tile is golden
                        if (this.isTileGoldenTile(currentTile)) {
                            hasGoldenTile = true;
                        }
                    } else {
                        // End current match and start new one
                        if (matchGroup.length >= 3) {
                            const formationType =
                                matchGroup.length === 4
                                    ? "line_4_horizontal"
                                    : matchGroup.length === 5
                                    ? "line_5_horizontal"
                                    : "horizontal";
                            matchGroups.push({
                                tiles: [...matchGroup],
                                value: baseValue,
                                direction: formationType,
                                hasGoldenTile,
                            });
                        }
                        matchGroup = [{ row, col }];
                        baseValue = currentValue;
                        hasGoldenTile = this.isTileGoldenTile(currentTile);
                    }
                }
            }

            // Check remaining match at end of row
            if (matchGroup.length >= 3) {
                const formationType =
                    matchGroup.length === 4
                        ? "line_4_horizontal"
                        : matchGroup.length === 5
                        ? "line_5_horizontal"
                        : "horizontal";
                matchGroups.push({ tiles: matchGroup, value: baseValue, direction: formationType, hasGoldenTile });
            }
        }

        // Check vertical matches (track formation types)
        for (let col = 0; col < this.boardWidth; col++) {
            let matchGroup = [];
            let baseValue = null; // The lowest value in the match (for power tiles)
            let hasGoldenTile = false;

            for (let row = 0; row < this.boardHeight; row++) {
                const currentTile = this.board[row][col];
                const currentValue = this.getTileValue(currentTile);

                if (!this.isNormal(currentTile)) {
                    // End current match
                    if (matchGroup.length >= 3) {
                        const formationType =
                            matchGroup.length === 4
                                ? "line_4_vertical"
                                : matchGroup.length === 5
                                ? "line_5_vertical"
                                : "vertical";
                        matchGroups.push({
                            tiles: [...matchGroup],
                            value: baseValue,
                            direction: formationType,
                            hasGoldenTile,
                        });
                    }
                    matchGroup = [];
                    baseValue = null;
                    hasGoldenTile = false;
                    continue;
                }

                // Check if this tile can be added to the current match
                if (matchGroup.length === 0) {
                    // Start new match
                    matchGroup.push({ row, col });
                    baseValue = currentValue;
                    hasGoldenTile = this.isTileGoldenTile(currentTile);
                } else {
                    // Check if current tile matches with the previous tile
                    const prevTile = matchGroup[matchGroup.length - 1];
                    if (this.canMatch(currentTile, this.board[prevTile.row][prevTile.col])) {
                        matchGroup.push({ row, col });
                        // Update base value to the minimum
                        baseValue = Math.min(baseValue, currentValue);
                        // Track if any tile is golden
                        if (this.isTileGoldenTile(currentTile)) {
                            hasGoldenTile = true;
                        }
                    } else {
                        // End current match and start new one
                        if (matchGroup.length >= 3) {
                            const formationType =
                                matchGroup.length === 4
                                    ? "line_4_vertical"
                                    : matchGroup.length === 5
                                    ? "line_5_vertical"
                                    : "vertical";
                            matchGroups.push({
                                tiles: [...matchGroup],
                                value: baseValue,
                                direction: formationType,
                                hasGoldenTile,
                            });
                        }
                        matchGroup = [{ row, col }];
                        baseValue = currentValue;
                        hasGoldenTile = this.isTileGoldenTile(currentTile);
                    }
                }
            }

            // Check remaining match at end of column
            if (matchGroup.length >= 3) {
                const formationType =
                    matchGroup.length === 4
                        ? "line_4_vertical"
                        : matchGroup.length === 5
                        ? "line_5_vertical"
                        : "vertical";
                matchGroups.push({ tiles: matchGroup, value: baseValue, direction: formationType, hasGoldenTile });
            }
        }

        return matchGroups;
    }

    findSpecialFormations() {
        const allFormations = [];

        // Find all possible formations first
        for (let row = 0; row < this.boardHeight; row++) {
            for (let col = 0; col < this.boardWidth; col++) {
                const tile = this.board[row][col];
                if (!this.isNormal(tile)) continue;
                const value = this.getTileValue(tile);

                // Check T-formation
                const tFormation = this.checkTFormation(row, col, value);
                if (tFormation) {
                    tFormation.priority = 1; // Highest priority
                    allFormations.push(tFormation);
                }

                // Check L-formation
                const lFormation = this.checkLFormation(row, col, value);
                if (lFormation) {
                    lFormation.priority = 2; // Medium priority
                    allFormations.push(lFormation);
                }

                // Check block formation (4-tile 2x2)
                const blockFormation = this.checkBlockFormation(row, col, value);
                if (blockFormation) {
                    blockFormation.priority = 3; // Lowest priority
                    allFormations.push(blockFormation);
                }
            }
        }

        // Filter out overlapping formations based on priority (T > L > Block)
        const selectedFormations = [];
        const usedTiles = new Set();

        // Sort by priority (lower number = higher priority)
        allFormations.sort((a, b) => a.priority - b.priority);

        for (const formation of allFormations) {
            // Check if any tile in this formation is already used
            const hasOverlap = formation.tiles.some((tile) => usedTiles.has(`${tile.row},${tile.col}`));

            if (!hasOverlap) {
                // No overlap, add this formation and mark tiles as used
                selectedFormations.push(formation);
                formation.tiles.forEach((tile) => {
                    usedTiles.add(`${tile.row},${tile.col}`);
                });
            }
        }

        return selectedFormations;
    }

    checkTFormation(intersectionRow, intersectionCol, value) {
        // T-formation: 4 different orientations
        // 1. xxx  2.  x   3.  x   4.   x
        //     x      xxx      x       xxx
        //     x       x      xxx       x

        const tFormations = [
            // 1. T pointing down: xxx
            //                      x
            //                      x
            {
                horizontal: [-1, 0, 1], // 3 tiles horizontally through intersection
                vertical: [1, 2], // 2 tiles down from intersection
            },
            // 2. T pointing right: x
            //                      xxx
            //                      x
            {
                vertical: [-1, 0, 1], // 3 tiles vertically through intersection
                horizontal: [1, 2], // 2 tiles right from intersection
            },
            // 3. T pointing up:  x
            //                    x
            //                   xxx
            {
                horizontal: [-1, 0, 1], // 3 tiles horizontally through intersection
                vertical: [-2, -1], // 2 tiles up from intersection
            },
            // 4. T pointing left: x
            //                   xxx
            //                     x
            {
                vertical: [-1, 0, 1], // 3 tiles vertically through intersection
                horizontal: [-2, -1], // 2 tiles left from intersection
            },
        ];

        for (const formation of tFormations) {
            const positions = [];
            let validT = true;
            let hasGoldenTile = false;

            // Check horizontal line (3 tiles including intersection)
            for (const colOffset of formation.horizontal) {
                const row = intersectionRow;
                const col = intersectionCol + colOffset;

                if (
                    row < 0 ||
                    row >= this.boardHeight ||
                    col < 0 ||
                    col >= this.boardWidth ||
                    !this.board[row] ||
                    this.board[row][col] === undefined
                ) {
                    validT = false;
                    break;
                }
                const tile = this.board[row][col];
                const tileValue = this.getTileValue(tile);
                if (tileValue !== value) {
                    validT = false;
                    break;
                }
                if (this.isTileGoldenTile(tile)) {
                    hasGoldenTile = true;
                }
                positions.push({ row: row, col: col });
            }

            if (!validT) continue;

            // Check vertical extension (2 additional tiles)
            for (const rowOffset of formation.vertical) {
                const row = intersectionRow + rowOffset;
                const col = intersectionCol;

                if (
                    row < 0 ||
                    row >= this.boardHeight ||
                    col < 0 ||
                    col >= this.boardWidth ||
                    !this.board[row] ||
                    this.board[row][col] === undefined
                ) {
                    validT = false;
                    break;
                }
                const tile = this.board[row][col];
                const tileValue = this.getTileValue(tile);
                if (tileValue !== value) {
                    validT = false;
                    break;
                }
                if (this.isTileGoldenTile(tile)) {
                    hasGoldenTile = true;
                }
                positions.push({ row: row, col: col });
            }

            if (validT && positions.length === 5) {
                return {
                    tiles: positions,
                    value: value,
                    direction: "T-formation",
                    intersection: { row: intersectionRow, col: intersectionCol },
                    hasGoldenTile,
                };
            }
        }

        return null;
    }

    checkLFormation(cornerRow, cornerCol, value) {
        // L-formation: 3 tiles in one direction + 3 tiles in perpendicular direction with shared corner
        // Check 4 possible L orientations from this corner

        const lShapes = [
            // L pointing right-down:   x
            //                          x
            //                          xxx
            { horizontal: [0, 1, 2], vertical: [0, 1, 2] },

            // L pointing left-down:     x
            //                           x
            //                         xxx
            { horizontal: [0, -1, -2], vertical: [0, 1, 2] },

            // L pointing right-up:   xxx
            //                        x
            //                        x
            { horizontal: [0, 1, 2], vertical: [0, -1, -2] },

            // L pointing left-up:   xxx
            //                         x
            //                         x
            { horizontal: [0, -1, -2], vertical: [0, -1, -2] },
        ];

        for (const shape of lShapes) {
            const positions = [];
            let validL = true;
            let hasGoldenTile = false;

            // Check horizontal part (3 tiles from corner)
            for (const colOffset of shape.horizontal) {
                const col = cornerCol + colOffset;
                const row = cornerRow;

                if (
                    col < 0 ||
                    col >= this.boardWidth ||
                    row < 0 ||
                    row >= this.boardHeight ||
                    !this.board[row] ||
                    this.board[row][col] === undefined
                ) {
                    validL = false;
                    break;
                }
                const tile = this.board[row][col];
                const tileValue = this.getTileValue(tile);
                if (tileValue !== value) {
                    validL = false;
                    break;
                }
                if (this.isTileGoldenTile(tile)) {
                    hasGoldenTile = true;
                }
                positions.push({ row: row, col: col });
            }

            if (!validL) continue;

            // Check vertical part (3 tiles from corner, but corner is already added, so 2 more)
            for (let i = 1; i < shape.vertical.length; i++) {
                const rowOffset = shape.vertical[i];
                const row = cornerRow + rowOffset;
                const col = cornerCol;

                if (
                    row < 0 ||
                    row >= this.boardHeight ||
                    col < 0 ||
                    col >= this.boardWidth ||
                    !this.board[row] ||
                    this.board[row][col] === undefined
                ) {
                    validL = false;
                    break;
                }
                const tile = this.board[row][col];
                const tileValue = this.getTileValue(tile);
                if (tileValue !== value) {
                    validL = false;
                    break;
                }
                if (this.isTileGoldenTile(tile)) {
                    hasGoldenTile = true;
                }
                positions.push({ row: row, col: col });
            }

            if (validL && positions.length === 5) {
                return {
                    tiles: positions,
                    value: value,
                    direction: "L-formation",
                    intersection: { row: cornerRow, col: cornerCol },
                    hasGoldenTile,
                };
            }
        }

        return null;
    }

    checkBlockFormation(topRow, leftCol, value) {
        // Block formation: 2x2 square of same tiles
        // Check if we can form: xx
        //                       xx

        // Check bounds
        if (topRow >= this.boardHeight - 1 || leftCol >= this.boardWidth - 1) {
            return null;
        }

        const positions = [
            { row: topRow, col: leftCol }, // top-left
            { row: topRow, col: leftCol + 1 }, // top-right
            { row: topRow + 1, col: leftCol }, // bottom-left
            { row: topRow + 1, col: leftCol + 1 }, // bottom-right
        ];

        let hasGoldenTile = false;

        // Check if all 4 positions have the same value
        for (const pos of positions) {
            if (pos.row < 0 || pos.row >= this.boardHeight || pos.col < 0 || pos.col >= this.boardWidth) {
                return null; // Out of bounds
            }
            if (!this.board[pos.row] || this.board[pos.row][pos.col] === undefined) {
                return null; // Position doesn't exist
            }
            const tile = this.board[pos.row][pos.col];
            const tileValue = this.getTileValue(tile);
            if (tileValue !== value) {
                return null; // Doesn't match
            }
            if (this.isTileGoldenTile(tile)) {
                hasGoldenTile = true;
            }
        }

        return {
            tiles: positions,
            value: value,
            direction: "block_4_formation",
            intersections: [
                { row: topRow, col: leftCol + 1 }, // top-right becomes one merge point
                { row: topRow + 1, col: leftCol }, // bottom-left becomes other merge point
            ],
            hasGoldenTile,
        };
    }

    processMatches() {
        const matchGroups = this.findMatches();

        // Reset user swap flag after finding matches
        this.isUserSwap = false;

        if (matchGroups.length === 0) {
            // No matches found, allow interactions again
            this.animating = false;
            return;
        }

        // Calculate score
        let totalScore = 0;
        matchGroups.forEach((group) => {
            totalScore += group.value * group.tiles.length;
        });

        // Update score
        this.score += totalScore;
        document.getElementById("score").textContent = this.score;
        this.saveScore(); // Save score to localStorage

        // Check for blocked tiles adjacent to original match positions and unblock them
        this.unblockAdjacentTiles(matchGroups);

        // Start merge animations
        this.animateMerges(matchGroups);
    }

    animateMerges(matchGroups) {
        matchGroups.forEach((group) => {
            const middlePositions = this.calculateMiddlePositions(group.tiles, group);
            const outerTiles = this.getOuterTiles(group.tiles, middlePositions);

            // Animate outer tiles sliding to middle positions
            outerTiles.forEach((outerTile, index) => {
                const targetPos = middlePositions[index % middlePositions.length];
                if (targetPos) {
                    this.slideGemTo(outerTile, targetPos);
                }
            });

            // Mark middle tiles for transformation
            middlePositions.forEach((pos) => {
                const gem = document.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
                if (gem) {
                    gem.classList.add("merge-target");
                }
            });
        });

        // Process merges after animation
        setTimeout(() => {
            this.processMerges(matchGroups);
        }, 400);
    }

    getOuterTiles(allTiles, middleTiles) {
        return allTiles.filter(
            (tile) => !middleTiles.some((middle) => middle.row === tile.row && middle.col === tile.col)
        );
    }

    slideGemTo(fromTile, toTile) {
        const fromElement = document.querySelector(`[data-row="${fromTile.row}"][data-col="${fromTile.col}"]`);
        const toElement = document.querySelector(`[data-row="${toTile.row}"][data-col="${toTile.col}"]`);

        if (fromElement && toElement) {
            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();

            const deltaX = toRect.left - fromRect.left;
            const deltaY = toRect.top - fromRect.top;

            fromElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            fromElement.style.transition = "transform 0.4s ease-out";
            fromElement.classList.add("sliding");

            // Fade out the sliding tile
            setTimeout(() => {
                fromElement.style.opacity = "0";
            }, 300);
        }
    }

    getFormationConfig(direction) {
        // Map direction to formation type for special tile config
        const formationMap = {
            "T-formation": "t_formation",
            "L-formation": "l_formation",
            block_4_formation: "block_4",
            line_4_horizontal: "line_4",
            line_4_vertical: "line_4",
            line_5_horizontal: "line_5",
            line_5_vertical: "line_5",
        };
        return formationMap[direction] || null;
    }

    createMergedTiles(group) {
        const formationType = this.getFormationConfig(group.direction);
        const specialTileType = formationType ? this.specialTileConfig[formationType] : null;

        // Calculate positions and value based on formation type
        const isTLFormation = group.direction === "T-formation" || group.direction === "L-formation";
        const positions = isTLFormation ? [group.intersection] : this.calculateMiddlePositions(group.tiles);
        const valueIncrement = isTLFormation ? 2 : 1;

        // Check if any tile in the match was a golden tile - if so, add +1 to the result
        const goldenBonus = group.hasGoldenTile ? 1 : 0;
        const newValue = group.value + valueIncrement + goldenBonus;

        // Handle special tile types
        if (specialTileType === "joker") {
            if (positions.length > 1) {
                const formationKey = group.direction.includes("block") ? "block_4" : "line_4";
                const specialPos = this.determineSpecialTilePosition(group, formationKey);
                const normalPos = positions.find((p) => p.row !== specialPos.row || p.col !== specialPos.col);

                this.board[specialPos.row][specialPos.col] = this.createJokerTile();
                this.board[normalPos.row][normalPos.col] = this.createTile(newValue);
                this.trackGoalProgress(newValue, 1);
            } else {
                this.board[positions[0].row][positions[0].col] = this.createJokerTile();
            }
        } else if (specialTileType === "power") {
            if (positions.length > 1) {
                const formationKey = group.direction.includes("block") ? "block_4" : "line_4";
                const specialPos = this.determineSpecialTilePosition(group, formationKey);
                const normalPos = positions.find((p) => p.row !== specialPos.row || p.col !== specialPos.col);

                this.board[specialPos.row][specialPos.col] = this.createTile(newValue, true);
                this.board[normalPos.row][normalPos.col] = this.createTile(newValue);
                this.trackGoalProgress(newValue, 2);
            } else {
                this.board[positions[0].row][positions[0].col] = this.createTile(newValue, true);
                this.trackGoalProgress(newValue, 1);
            }
        } else if (specialTileType === "golden") {
            if (positions.length > 1) {
                const formationKey = group.direction.includes("block") ? "block_4" : "line_4";
                const specialPos = this.determineSpecialTilePosition(group, formationKey);
                const normalPos = positions.find((p) => p.row !== specialPos.row || p.col !== specialPos.col);

                this.board[specialPos.row][specialPos.col] = this.createTile(newValue, false, true);
                this.board[normalPos.row][normalPos.col] = this.createTile(newValue);
                this.trackGoalProgress(newValue, 2);
            } else {
                this.board[positions[0].row][positions[0].col] = this.createTile(newValue, false, true);
                this.trackGoalProgress(newValue, 1);
            }
        } else if (specialTileType === "freeswap") {
            if (positions.length > 1) {
                const formationKey = group.direction.includes("block") ? "block_4" : "line_4";
                const specialPos = this.determineSpecialTilePosition(group, formationKey);
                const normalPos = positions.find((p) => p.row !== specialPos.row || p.col !== specialPos.col);

                this.board[specialPos.row][specialPos.col] = this.createTile(newValue, false, false, true);
                this.board[normalPos.row][normalPos.col] = this.createTile(newValue);
                this.trackGoalProgress(newValue, 2);
            } else {
                this.board[positions[0].row][positions[0].col] = this.createTile(newValue, false, false, true);
                this.trackGoalProgress(newValue, 1);
            }
        } else {
            // No special tile - create normal tiles at all positions
            positions.forEach((pos) => {
                this.board[pos.row][pos.col] = this.createTile(newValue);
            });
            this.trackGoalProgress(newValue, positions.length);
        }
    }

    processMerges(matchGroups) {
        // Clear all matched tiles first
        matchGroups.forEach((group) => {
            group.tiles.forEach((tile) => {
                this.board[tile.row][tile.col] = null;
            });
        });

        // Create new merged tiles
        matchGroups.forEach((group) => {
            this.createMergedTiles(group);
        });

        // Clear swap position after processing
        this.lastSwapPosition = null;

        // Update goal display after creating new tiles
        this.updateGoalDisplay(true);

        // Clean up animation classes
        document.querySelectorAll(".gem").forEach((gem) => {
            gem.classList.remove("sliding", "merge-target", "unblocking");
            gem.style.transform = "";
            gem.style.transition = "";
            gem.style.opacity = "";
            gem.style.zIndex = "";
        });

        this.dropGems();
    }

    determineSpecialTilePosition(group, formationType) {
        // For 4-tile formations, determine which of the 2 middle positions should get the special tile
        // based on where the last swap was made
        if (!this.lastSwapPosition) {
            // If no swap info, default to first middle position
            if (formationType === "block_4") {
                return group.intersections[0];
            } else {
                const middlePositions = this.calculateMiddlePositions(group.tiles);
                return middlePositions[0];
            }
        }

        const swapPos = this.lastSwapPosition;

        if (formationType === "block_4") {
            // For block formation, choose the intersection closest to swap position
            const distances = group.intersections.map((pos) => {
                const dist = Math.abs(pos.row - swapPos.row) + Math.abs(pos.col - swapPos.col);
                return { pos, dist };
            });
            distances.sort((a, b) => a.dist - b.dist);
            return distances[0].pos;
        } else if (formationType === "line_4") {
            // For line formation, choose the middle position that contains the swapped tile
            const middlePositions = this.calculateMiddlePositions(group.tiles);

            // Check if swap position matches one of the middle positions
            const matchingPos = middlePositions.find((pos) => pos.row === swapPos.row && pos.col === swapPos.col);

            if (matchingPos) {
                return matchingPos;
            }

            // If swap position doesn't match, choose closest middle position
            const distances = middlePositions.map((pos) => {
                const dist = Math.abs(pos.row - swapPos.row) + Math.abs(pos.col - swapPos.col);
                return { pos, dist };
            });
            distances.sort((a, b) => a.dist - b.dist);
            return distances[0].pos;
        }

        return null;
    }

    trackGoalProgress(newValue, count = 1) {
        // Update goal progress when tiles are created
        this.levelGoals.forEach((goal) => {
            if (goal.tileValue === newValue) {
                goal.created += count;
            }
        });
    }

    unblockAdjacentTiles(matchGroups) {
        const blockedTilesToRemove = [];

        matchGroups.forEach((group) => {
            // Get where the new merged tile(s) will be created
            let targetPositions = [];
            if (group.direction === "T-formation" || group.direction === "L-formation") {
                targetPositions.push(group.intersection);
            } else if (group.direction === "block_4_formation") {
                targetPositions.push(...group.intersections);
            } else {
                const middlePositions = this.calculateMiddlePositions(group.tiles);
                targetPositions.push(...middlePositions);
            }

            // Check each tile in the original match for adjacent blocked tiles
            group.tiles.forEach((matchTile) => {
                const adjacentPositions = [
                    { row: matchTile.row - 1, col: matchTile.col }, // Up
                    { row: matchTile.row + 1, col: matchTile.col }, // Down
                    { row: matchTile.row, col: matchTile.col - 1 }, // Left
                    { row: matchTile.row, col: matchTile.col + 1 }, // Right
                ];

                adjacentPositions.forEach((pos) => {
                    // Check bounds and if tile is blocked
                    if (
                        pos.row >= 0 &&
                        pos.row < this.boardHeight &&
                        pos.col >= 0 &&
                        pos.col < this.boardWidth &&
                        this.isBlocked(this.board[pos.row][pos.col])
                    ) {
                        // Avoid duplicates
                        if (!blockedTilesToRemove.some((tile) => tile.row === pos.row && tile.col === pos.col)) {
                            // Find the closest target position for animation
                            let closestTarget = targetPositions[0];
                            let closestDistance =
                                Math.abs(pos.row - closestTarget.row) + Math.abs(pos.col - closestTarget.col);

                            targetPositions.forEach((target) => {
                                const distance = Math.abs(pos.row - target.row) + Math.abs(pos.col - target.col);
                                if (distance < closestDistance) {
                                    closestDistance = distance;
                                    closestTarget = target;
                                }
                            });

                            blockedTilesToRemove.push({
                                row: pos.row,
                                col: pos.col,
                                targetPos: closestTarget,
                            });
                        }
                    }
                });
            });
        });

        // Animate and remove blocked tiles
        this.animateUnblocking(blockedTilesToRemove);
    }

    animateUnblocking(blockedTiles) {
        if (blockedTiles.length === 0) return;

        blockedTiles.forEach((blockedTile) => {
            // Use the EXACT same approach as slideGemTo
            // Animate blocked tile to the position of the target tile that exists NOW
            this.slideGemTo(blockedTile, blockedTile.targetPos);

            // Remove from board data after animation starts
            setTimeout(() => {
                this.board[blockedTile.row][blockedTile.col] = null;
            }, 50);
        });

        // Update blocked tile clearing goals if any blocked tiles were cleared
        if (blockedTiles.length > 0) {
            // Update after a short delay to ensure board state is updated
            setTimeout(() => {
                this.updateBlockedTileGoals();
                this.updateGoalDisplay(true); // Update display and check completion
            }, 100);
        }
    }

    calculateMiddlePositions(tiles, group = null) {
        const positions = [];
        const length = tiles.length;

        // Special handling for T and L formations
        if (group && (group.direction === "T-formation" || group.direction === "L-formation")) {
            // For special formations, the "middle" position is the intersection
            positions.push(group.intersection);
            return positions;
        }

        // Special handling for block formations
        if (group && group.direction === "block_4_formation") {
            // For block formations, the "middle" positions are the two intersections
            return group.intersections;
        }

        // Regular match logic
        if (length === 3) {
            // 3 tiles: middle position (3-2=1 tile)
            positions.push(tiles[1]);
        } else if (length === 4) {
            // 4 tiles: two middle positions (4-2=2 tiles)
            positions.push(tiles[1]);
            positions.push(tiles[2]);
        } else if (length >= 5) {
            // 5+ tiles: length-2 middle positions
            const newTileCount = length - 2;
            const startIndex = Math.floor((length - newTileCount) / 2);

            for (let i = 0; i < newTileCount; i++) {
                positions.push(tiles[startIndex + i]);
            }
        }

        return positions;
    }

    dropGems() {
        const movedGems = [];
        const newGems = [];

        // Track which gems moved and which are new
        for (let col = 0; col < this.boardWidth; col++) {
            let writePos = this.boardHeight - 1;
            let emptySpaces = 0;

            // Count empty spaces and drop existing gems
            for (let row = this.boardHeight - 1; row >= 0; row--) {
                if (this.board[row][col] === null) {
                    emptySpaces++;
                } else {
                    if (row !== writePos) {
                        // This gem will move
                        movedGems.push({ row: writePos, col, fromRow: row });
                        this.board[writePos][col] = this.board[row][col];
                        this.board[row][col] = null;
                    }
                    writePos--;
                }
            }

            // Fill empty spaces from top with new gems
            for (let i = 0; i < emptySpaces; i++) {
                this.board[i][col] = this.createTile(this.getRandomTileValue());
                newGems.push({ row: i, col });
            }
        }

        this.renderBoard();

        // Animate only the gems that actually moved or are new
        movedGems.forEach((gem, index) => {
            const element = document.querySelector(`[data-row="${gem.row}"][data-col="${gem.col}"]`);
            if (element) {
                element.classList.add("falling");
                element.style.animationDelay = `${index * 0.05}s`;
            }
        });

        // Animate new gems with a different animation (from above)
        newGems.forEach((gem, index) => {
            const element = document.querySelector(`[data-row="${gem.row}"][data-col="${gem.col}"]`);
            if (element) {
                element.classList.add("new-gem");
                element.style.animationDelay = `${(movedGems.length + index) * 0.05}s`;
            }
        });

        // Check for more matches after dropping
        setTimeout(() => {
            document.querySelectorAll(".gem").forEach((gem) => {
                gem.classList.remove("falling", "new-gem");
                gem.style.animationDelay = "";
            });

            // Check for matches regardless of gameActive state to handle cascading after running out of moves
            if (this.hasMatches()) {
                this.processMatches();
            } else {
                this.animating = false;
                // Check level completion only after all animations are finished
                this.checkLevelComplete();
            }
        }, 600);
    }

    renderGoals() {
        const goalsContainer = document.getElementById("goals");
        if (!goalsContainer) return;

        goalsContainer.innerHTML = "";

        this.levelGoals.forEach((goal) => {
            const goalCard = document.createElement("div");
            let isCompleted, currentProgress, goalTypeClass, goalIcon, goalContent;

            if (goal.goalType === "current") {
                isCompleted = goal.current >= goal.target;
                currentProgress = goal.current;
                goalTypeClass = "goal-current";
                goalIcon = "📍";
                const displayValue = this.getDisplayValue(goal.tileValue);
                goalContent = `<div class="goal-tile tile-${goal.tileValue}">${displayValue}</div>`;
            } else if (goal.goalType === "blocked") {
                isCompleted = goal.current >= goal.target;
                currentProgress = goal.current;
                goalTypeClass = "goal-blocked";
                goalIcon = "♻️";
                goalContent = `<div class="goal-tile blocked-goal-tile"></div>`;
            } else {
                isCompleted = goal.created >= goal.target;
                currentProgress = goal.created;
                goalTypeClass = "goal-created";
                goalIcon = "⭐";
                const displayValue = this.getDisplayValue(goal.tileValue);
                goalContent = `<div class="goal-tile tile-${goal.tileValue}">${displayValue}</div>`;
            }

            goalCard.className = `goal-card ${goalTypeClass} ${isCompleted ? "completed" : ""}`;

            goalCard.innerHTML = `
                ${goalContent}
                <div class="goal-progress">${goalIcon} ${currentProgress} / ${goal.target}</div>
                ${isCompleted ? '<div class="goal-check">✓</div>' : ""}
            `;

            goalsContainer.appendChild(goalCard);
        });
    }

    updateMovesDisplay() {
        const movesElement = document.getElementById("moves");
        if (movesElement) {
            movesElement.textContent = `${this.maxMoves - this.movesUsed}`; //`${this.movesUsed}/${this.maxMoves}`;
        }

        const levelElement = document.getElementById("level");
        if (levelElement) {
            levelElement.textContent = this.currentLevel;
        }
    }

    updateScore(points) {
        this.score += points;
        document.getElementById("score").textContent = this.score;
        this.saveScore(); // Save score to localStorage
    }

    showIntroDialog() {
        // Check if user has opted to not show the dialog
        const dontShowAgain = localStorage.getItem("match2048_dontShowIntro") === "true";
        if (dontShowAgain) {
            return;
        }

        const introDialog = document.getElementById("introDialog");
        const startBtn = document.getElementById("startGame");
        const dontShowCheckbox = document.getElementById("dontShowAgain");

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
                this.maxMoves += 5;
                this.powerUpUses.swap = Math.max(0, this.powerUpUses.swap - 1); // Add one use back (by decrementing usage)
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
                this.restartLevel();
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

    setupSettingsButton() {
        const settingsBtn = document.getElementById("settingsBtn");
        const settingsDialog = document.getElementById("settingsDialog");
        const saveSettingsBtn = document.getElementById("saveSettings");
        const numberBaseSelect = document.getElementById("numberBase");
        const showReviewBoardCheckbox = document.getElementById("showReviewBoard");
        const titleElement = document.querySelector("h1");

        // Special tile reward selects
        const line4Select = document.getElementById("line4Reward");
        const block4Select = document.getElementById("block4Reward");
        const line5Select = document.getElementById("line5Reward");
        const tFormationSelect = document.getElementById("tFormationReward");
        const lFormationSelect = document.getElementById("lFormationReward");

        const openSettings = () => {
            // Set current values
            numberBaseSelect.value = this.numberBase.toString();
            showReviewBoardCheckbox.checked = this.showReviewBoard;

            // Set special tile configuration values
            line4Select.value = this.specialTileConfig.line_4;
            block4Select.value = this.specialTileConfig.block_4;
            line5Select.value = this.specialTileConfig.line_5;
            tFormationSelect.value = this.specialTileConfig.t_formation;
            lFormationSelect.value = this.specialTileConfig.l_formation;

            settingsDialog.classList.remove("hidden");
        };

        // Open settings when clicking the title
        if (titleElement && settingsDialog) {
            titleElement.addEventListener("click", openSettings);
        }

        if (settingsBtn && settingsDialog) {
            settingsBtn.addEventListener("click", openSettings);

            // Save settings
            if (saveSettingsBtn) {
                saveSettingsBtn.addEventListener("click", () => {
                    const newBase = parseInt(numberBaseSelect.value, 10);
                    this.numberBase = newBase;
                    this.saveNumberBase();

                    this.showReviewBoard = showReviewBoardCheckbox.checked;
                    this.saveShowReviewBoard();

                    // Save special tile configuration
                    this.specialTileConfig.line_4 = line4Select.value;
                    this.specialTileConfig.block_4 = block4Select.value;
                    this.specialTileConfig.line_5 = line5Select.value;
                    this.specialTileConfig.t_formation = tFormationSelect.value;
                    this.specialTileConfig.l_formation = lFormationSelect.value;
                    this.saveSpecialTileConfig();

                    settingsDialog.classList.add("hidden");

                    // Re-render to show new number base
                    this.renderBoard();
                    this.renderGoals();
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

    setupInfoButton() {
        const infoBtn = document.getElementById("infoBtn");
        if (infoBtn) {
            infoBtn.addEventListener("click", () => {
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
                    this.saveCurrentLevel();
                    this.saveScore();

                    // Load level 1 and restart the game
                    this.loadLevel(1);
                    this.createBoard();
                    this.renderBoard();
                }
            });
        }
    }
}

// Add invalid swap animation to CSS dynamically
const style = document.createElement("style");
style.textContent = `
    .invalid-swap {
        z-index: 100;
        box-shadow: 0 4px 12px rgba(255, 100, 100, 0.4);
        filter: brightness(1.1);
    }
`;
document.head.appendChild(style);

// Initialize the game when the page loads
document.addEventListener("DOMContentLoaded", () => {
    new Match3Game();
});
