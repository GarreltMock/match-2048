class Match3Game {
    constructor() {
        this.board = [];
        this.boardSize = 8;
        this.tileValues = [2, 4, 8, 16];
        this.score = this.loadScore();
        this.selectedGem = null;
        this.isDragging = false;
        this.dragStartPos = null;
        this.animating = false;

        this.currentLevel = this.loadCurrentLevel();
        this.levelGoals = [];
        this.tileCounts = {};
        this.movesUsed = 0;
        this.maxMoves = 0;
        this.gameActive = true;

        this.initializeLevels();
        this.showIntroDialog();
        this.setupInfoButton();
        this.init();
    }

    initializeLevels() {
        this.levels = [
            {
                level: 1,
                maxMoves: 10,
                goals: [{ tileValue: 32, target: 2, current: 0 }],
            },
            {
                level: 2,
                maxMoves: 15,
                goals: [
                    { tileValue: 64, target: 1, current: 0 },
                    { tileValue: 32, target: 3, current: 0 },
                ],
            },
            {
                level: 3,
                maxMoves: 20,
                goals: [
                    { tileValue: 64, target: 2, current: 0 },
                    { tileValue: 32, target: 5, current: 0 },
                ],
            },
            {
                level: 4,
                maxMoves: 30,
                goals: [{ tileValue: 128, target: 1, current: 0 }],
            },
            {
                level: 5,
                maxMoves: 40,
                goals: [{ tileValue: 128, target: 4, current: 0 }],
            },
            {
                level: 6,
                maxMoves: 50,
                goals: [
                    { tileValue: 256, target: 1, current: 0 },
                    { tileValue: 64, target: 4, current: 0 },
                ],
            },
            {
                level: 7,
                maxMoves: 30,
                goals: [{ tileValue: 32, target: 16, current: 0 }],
            },
            {
                level: 8, // das war das harte mit Anne
                maxMoves: 55,
                goals: [
                    { tileValue: 256, target: 1, current: 0 },
                    { tileValue: 128, target: 2, current: 0 },
                    { tileValue: 64, target: 4, current: 0 },
                ],
            },
            {
                level: 9,
                maxMoves: 80,
                goals: [
                    { tileValue: 512, target: 1, current: 0 },
                    { tileValue: 128, target: 2, current: 0 },
                ],
            },
            {
                level: 10,
                maxMoves: 100,
                goals: [{ tileValue: 1024, target: 1, current: 0 }],
            },
        ];

        this.loadLevel(this.currentLevel);
    }

    loadCurrentLevel() {
        // Load saved level from localStorage, default to level 1
        const savedLevel = localStorage.getItem("match2048_currentLevel");
        return savedLevel ? parseInt(savedLevel, 10) : 1;
    }

    saveCurrentLevel() {
        localStorage.setItem("match2048_currentLevel", this.currentLevel.toString());
    }

    loadScore() {
        // Load saved score from localStorage, default to 0
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
        this.maxMoves = level.maxMoves;
        this.movesUsed = 0;
        this.levelGoals = level.goals.map((goal) => ({ ...goal, current: 0 }));
        this.gameActive = true;

        this.renderGoals();
        this.updateMovesDisplay();

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
        for (let row = 0; row < this.boardSize; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.boardSize; col++) {
                do {
                    this.board[row][col] = this.getRandomTileValue();
                } while (this.hasInitialMatch(row, col));
            }
        }
    }

    getRandomTileValue() {
        return this.tileValues[Math.floor(Math.random() * this.tileValues.length)];
    }

    hasInitialMatch(row, col) {
        const value = this.board[row][col];

        // Check horizontal matches
        if (col >= 2 && this.board[row][col - 1] === value && this.board[row][col - 2] === value) {
            return true;
        }

        // Check vertical matches
        if (row >= 2 && this.board[row - 1][col] === value && this.board[row - 2][col] === value) {
            return true;
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
        this.tileCounts = {};
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const value = this.board[row][col];
                if (value !== null) {
                    this.tileCounts[value] = (this.tileCounts[value] || 0) + 1;
                }
            }
        }

        this.levelGoals.forEach((goal) => {
            goal.current = this.tileCounts[goal.tileValue] || 0;
        });

        this.renderGoals();
        this.checkLevelComplete();
    }

    checkLevelComplete() {
        if (!this.gameActive) return;

        const allGoalsComplete = this.levelGoals.every((goal) => goal.current >= goal.target);
        const nextBtn = document.getElementById("nextBtn");

        if (allGoalsComplete) {
            this.gameActive = false;
            if (this.currentLevel < this.levels.length) {
                nextBtn.style.display = "inline-block";
            }
            setTimeout(() => {
                alert(`Level ${this.currentLevel} Complete! 🎉`);
            }, 500);
        } else if (this.movesUsed >= this.maxMoves) {
            this.gameActive = false;
            setTimeout(() => {
                alert(`Game Over! You ran out of moves. Try again!`);
            }, 500);
        } else {
            nextBtn.style.display = "none";
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

        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const gem = document.createElement("div");
                const value = this.board[row][col];
                gem.className = `gem tile-${value}`;
                gem.dataset.row = row;
                gem.dataset.col = col;
                gem.textContent = value;
                gameBoard.appendChild(gem);
            }
        }

        this.updateTileCounts();
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

    startDrag(x, y) {
        if (!this.gameActive || this.animating) return;

        const element = document.elementFromPoint(x, y);
        if (element && element.classList.contains("gem")) {
            this.selectedGem = {
                element: element,
                row: parseInt(element.dataset.row),
                col: parseInt(element.dataset.col),
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
            const targetGem = Array.from(previewGems).find((g) => g !== this.selectedGem.element);
            if (targetGem) {
                const targetRow = parseInt(targetGem.dataset.row);
                const targetCol = parseInt(targetGem.dataset.col);
                this.trySwap(this.selectedGem.row, this.selectedGem.col, targetRow, targetCol);
            }
        }

        // Clean up
        document.querySelectorAll(".gem").forEach((gem) => {
            gem.classList.remove("dragging", "preview");
        });

        this.selectedGem = null;
        this.isDragging = false;
        this.dragStartPos = null;
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

        // Temporarily swap gems
        const temp = this.board[row1][col1];
        this.board[row1][col1] = this.board[row2][col2];
        this.board[row2][col2] = temp;

        // Check if this creates any matches
        if (this.hasMatches()) {
            this.movesUsed++;
            this.updateMovesDisplay();
            this.animateSwap(row1, col1, row2, col2, () => {
                this.renderBoard();
                this.processMatches();
            });
        } else {
            // Revert the swap
            this.board[row2][col2] = this.board[row1][col1];
            this.board[row1][col1] = temp;
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

        // Check for special T and L formations first (they take priority)
        const specialMatches = this.findSpecialFormations();
        matchGroups.push(...specialMatches);

        // If special formations found, don't check for regular matches to avoid overlaps
        if (specialMatches.length > 0) {
            return matchGroups;
        }

        // Check horizontal matches
        for (let row = 0; row < this.boardSize; row++) {
            let count = 1;
            let currentValue = this.board[row][0];
            let startCol = 0;

            for (let col = 1; col < this.boardSize; col++) {
                if (this.board[row][col] === currentValue) {
                    count++;
                } else {
                    if (count >= 3) {
                        const matchGroup = [];
                        for (let i = startCol; i < col; i++) {
                            matchGroup.push({ row, col: i });
                        }
                        matchGroups.push({ tiles: matchGroup, value: currentValue, direction: "horizontal" });
                    }
                    count = 1;
                    currentValue = this.board[row][col];
                    startCol = col;
                }
            }

            if (count >= 3) {
                const matchGroup = [];
                for (let i = startCol; i < this.boardSize; i++) {
                    matchGroup.push({ row, col: i });
                }
                matchGroups.push({ tiles: matchGroup, value: currentValue, direction: "horizontal" });
            }
        }

        // Check vertical matches
        for (let col = 0; col < this.boardSize; col++) {
            let count = 1;
            let currentValue = this.board[0][col];
            let startRow = 0;

            for (let row = 1; row < this.boardSize; row++) {
                if (this.board[row][col] === currentValue) {
                    count++;
                } else {
                    if (count >= 3) {
                        const matchGroup = [];
                        for (let i = startRow; i < row; i++) {
                            matchGroup.push({ row: i, col });
                        }
                        matchGroups.push({ tiles: matchGroup, value: currentValue, direction: "vertical" });
                    }
                    count = 1;
                    currentValue = this.board[row][col];
                    startRow = row;
                }
            }

            if (count >= 3) {
                const matchGroup = [];
                for (let i = startRow; i < this.boardSize; i++) {
                    matchGroup.push({ row: i, col });
                }
                matchGroups.push({ tiles: matchGroup, value: currentValue, direction: "vertical" });
            }
        }

        return matchGroups;
    }

    findSpecialFormations() {
        const allFormations = [];

        // Find all possible formations first
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const value = this.board[row][col];
                if (!value) continue;

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

                // Check block formation
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

            // Check horizontal line (3 tiles including intersection)
            for (const colOffset of formation.horizontal) {
                const row = intersectionRow;
                const col = intersectionCol + colOffset;

                if (
                    row < 0 ||
                    row >= this.boardSize ||
                    col < 0 ||
                    col >= this.boardSize ||
                    this.board[row][col] !== value
                ) {
                    validT = false;
                    break;
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
                    row >= this.boardSize ||
                    col < 0 ||
                    col >= this.boardSize ||
                    this.board[row][col] !== value
                ) {
                    validT = false;
                    break;
                }
                positions.push({ row: row, col: col });
            }

            if (validT && positions.length === 5) {
                return {
                    tiles: positions,
                    value: value,
                    direction: "T-formation",
                    intersection: { row: intersectionRow, col: intersectionCol },
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

            // Check horizontal part (3 tiles from corner)
            for (const colOffset of shape.horizontal) {
                const col = cornerCol + colOffset;
                const row = cornerRow;

                if (
                    col < 0 ||
                    col >= this.boardSize ||
                    row < 0 ||
                    row >= this.boardSize ||
                    this.board[row][col] !== value
                ) {
                    validL = false;
                    break;
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
                    row >= this.boardSize ||
                    col < 0 ||
                    col >= this.boardSize ||
                    this.board[row][col] !== value
                ) {
                    validL = false;
                    break;
                }
                positions.push({ row: row, col: col });
            }

            if (validL && positions.length === 5) {
                return {
                    tiles: positions,
                    value: value,
                    direction: "L-formation",
                    intersection: { row: cornerRow, col: cornerCol },
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
        if (topRow >= this.boardSize - 1 || leftCol >= this.boardSize - 1) {
            return null;
        }

        const positions = [
            { row: topRow, col: leftCol }, // top-left
            { row: topRow, col: leftCol + 1 }, // top-right
            { row: topRow + 1, col: leftCol }, // bottom-left
            { row: topRow + 1, col: leftCol + 1 }, // bottom-right
        ];

        // Check if all 4 positions have the same value
        for (const pos of positions) {
            if (pos.row < 0 || pos.row >= this.boardSize || pos.col < 0 || pos.col >= this.boardSize) {
                return null; // Out of bounds
            }
            if (!this.board[pos.row] || this.board[pos.row][pos.col] !== value) {
                return null; // Position doesn't exist or doesn't match
            }
        }

        return {
            tiles: positions,
            value: value,
            direction: "block-formation",
            intersections: [
                { row: topRow, col: leftCol + 1 }, // top-right becomes one merge point
                { row: topRow + 1, col: leftCol }, // bottom-left becomes other merge point
            ],
        };
    }

    processMatches() {
        const matchGroups = this.findMatches();

        if (matchGroups.length === 0) {
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

    processMerges(matchGroups) {
        // Clear all matched tiles first
        matchGroups.forEach((group) => {
            group.tiles.forEach((tile) => {
                this.board[tile.row][tile.col] = null;
            });
        });

        // Create new merged tiles in middle positions
        matchGroups.forEach((group) => {
            if (group.direction === "T-formation" || group.direction === "L-formation") {
                // Special formations: create one tile with 4x value at intersection
                const newValue = group.value * 4; // 5 tiles -> 1 tile (roughly 2.5x per tile, rounded to 4x total)
                const intersection = group.intersection;
                this.board[intersection.row][intersection.col] = newValue;
            } else if (group.direction === "block-formation") {
                // Block formation: create two tiles with 2x value at intersection points
                const newValue = group.value * 2; // 4 tiles -> 2 tiles (2x each)
                group.intersections.forEach((intersection) => {
                    this.board[intersection.row][intersection.col] = newValue;
                });
            } else {
                // Regular matches: use existing logic
                const middlePositions = this.calculateMiddlePositions(group.tiles);
                const newValue = group.value * 2; // Next power of 2

                middlePositions.forEach((pos) => {
                    this.board[pos.row][pos.col] = newValue;
                });
            }
        });

        // Clean up animation classes
        document.querySelectorAll(".gem").forEach((gem) => {
            gem.classList.remove("sliding", "merge-target");
            gem.style.transform = "";
            gem.style.transition = "";
            gem.style.opacity = "";
        });

        this.dropGems();
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
        if (group && group.direction === "block-formation") {
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
        for (let col = 0; col < this.boardSize; col++) {
            let writePos = this.boardSize - 1;
            let emptySpaces = 0;

            // Count empty spaces and drop existing gems
            for (let row = this.boardSize - 1; row >= 0; row--) {
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
                this.board[i][col] = this.getRandomTileValue();
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

            if (this.gameActive && this.hasMatches()) {
                this.processMatches();
            } else {
                this.animating = false;
            }
        }, 600);
    }

    renderGoals() {
        const goalsContainer = document.getElementById("goals");
        if (!goalsContainer) return;

        goalsContainer.innerHTML = "";

        this.levelGoals.forEach((goal) => {
            const goalCard = document.createElement("div");
            goalCard.className = `goal-card ${goal.current >= goal.target ? "completed" : ""}`;

            goalCard.innerHTML = `
                <div class="goal-tile tile-${goal.tileValue}">${goal.tileValue}</div>
                <div class="goal-progress">${goal.current} / ${goal.target}</div>
                ${goal.current >= goal.target ? '<div class="goal-check">✓</div>' : ""}
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
                    this.init();
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
