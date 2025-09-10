class Match3Game {
    constructor() {
        this.board = [];
        this.boardSize = 8;
        this.tileValues = [2, 4, 8, 16];
        this.score = 0;
        this.selectedGem = null;
        this.isDragging = false;
        this.dragStartPos = null;

        this.init();
    }

    init() {
        this.createBoard();
        this.renderBoard();
        this.setupEventListeners();
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

        return false;
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

    handleMouseUp(e) {
        this.endDrag();
    }

    startDrag(x, y) {
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
        // Temporarily swap gems
        const temp = this.board[row1][col1];
        this.board[row1][col1] = this.board[row2][col2];
        this.board[row2][col2] = temp;

        // Check if this creates any matches
        if (this.hasMatches()) {
            this.renderBoard();
            this.processMatches();
        } else {
            // Revert the swap
            this.board[row2][col2] = this.board[row1][col1];
            this.board[row1][col1] = temp;
            this.animateRevert(row1, col1, row2, col2);
        }
    }

    animateRevert(row1, col1, row2, col2) {
        const gem1 = document.querySelector(`[data-row="${row1}"][data-col="${col1}"]`);
        const gem2 = document.querySelector(`[data-row="${row2}"][data-col="${col2}"]`);

        if (gem1 && gem2) {
            gem1.style.animation = "shake 0.5s ease-in-out";
            gem2.style.animation = "shake 0.5s ease-in-out";

            setTimeout(() => {
                gem1.style.animation = "";
                gem2.style.animation = "";
            }, 500);
        }
    }

    hasMatches() {
        return this.findMatches().length > 0;
    }

    findMatches() {
        const matchGroups = [];

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

        // Start merge animations
        this.animateMerges(matchGroups);
    }

    animateMerges(matchGroups) {
        matchGroups.forEach((group) => {
            const middlePositions = this.calculateMiddlePositions(group.tiles);
            const outerTiles = this.getOuterTiles(group.tiles, middlePositions);

            // Animate outer tiles sliding to middle positions
            outerTiles.forEach((outerTile, index) => {
                const targetPos = middlePositions[index % middlePositions.length];
                if (targetPos) {
                    this.slideGemTo(outerTile, targetPos, group.direction);
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
        }, 600);
    }

    getOuterTiles(allTiles, middleTiles) {
        return allTiles.filter(
            (tile) => !middleTiles.some((middle) => middle.row === tile.row && middle.col === tile.col)
        );
    }

    slideGemTo(fromTile, toTile, direction) {
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
            const middlePositions = this.calculateMiddlePositions(group.tiles);
            const newValue = group.value * 2; // Next power of 2

            middlePositions.forEach((pos) => {
                this.board[pos.row][pos.col] = newValue;
            });
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

    calculateMiddlePositions(tiles) {
        const positions = [];
        const length = tiles.length;

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

            if (this.hasMatches()) {
                this.processMatches();
            }
        }, 600);
    }

    updateScore(points) {
        this.score += points;
        document.getElementById("score").textContent = this.score;
    }
}

// Add shake animation to CSS dynamically
const style = document.createElement("style");
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// Initialize the game when the page loads
document.addEventListener("DOMContentLoaded", () => {
    new Match3Game();
});
