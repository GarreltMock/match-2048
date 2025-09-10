class Match3Game {
    constructor() {
        this.board = [];
        this.boardSize = 8;
        this.colors = ['red', 'blue', 'green', 'yellow'];
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
                    this.board[row][col] = this.getRandomColor();
                } while (this.hasInitialMatch(row, col));
            }
        }
    }
    
    getRandomColor() {
        return this.colors[Math.floor(Math.random() * this.colors.length)];
    }
    
    hasInitialMatch(row, col) {
        const color = this.board[row][col];
        
        // Check horizontal matches
        if (col >= 2 && 
            this.board[row][col-1] === color && 
            this.board[row][col-2] === color) {
            return true;
        }
        
        // Check vertical matches
        if (row >= 2 && 
            this.board[row-1][col] === color && 
            this.board[row-2][col] === color) {
            return true;
        }
        
        return false;
    }
    
    renderBoard() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const gem = document.createElement('div');
                gem.className = `gem ${this.board[row][col]}`;
                gem.dataset.row = row;
                gem.dataset.col = col;
                gameBoard.appendChild(gem);
            }
        }
    }
    
    setupEventListeners() {
        const gameBoard = document.getElementById('gameBoard');
        
        // Touch events for mobile
        gameBoard.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        gameBoard.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        gameBoard.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        // Mouse events for desktop
        gameBoard.addEventListener('mousedown', this.handleMouseDown.bind(this));
        gameBoard.addEventListener('mousemove', this.handleMouseMove.bind(this));
        gameBoard.addEventListener('mouseup', this.handleMouseUp.bind(this));
        gameBoard.addEventListener('mouseleave', this.handleMouseUp.bind(this));
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
        if (element && element.classList.contains('gem')) {
            this.selectedGem = {
                element: element,
                row: parseInt(element.dataset.row),
                col: parseInt(element.dataset.col)
            };
            this.isDragging = true;
            this.dragStartPos = { x, y };
            element.classList.add('dragging');
        }
    }
    
    updateDrag(x, y) {
        if (!this.isDragging || !this.selectedGem) return;
        
        const element = document.elementFromPoint(x, y);
        if (element && element.classList.contains('gem') && element !== this.selectedGem.element) {
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
        
        const previewGems = document.querySelectorAll('.gem.preview');
        if (previewGems.length > 0) {
            const targetGem = Array.from(previewGems).find(g => g !== this.selectedGem.element);
            if (targetGem) {
                const targetRow = parseInt(targetGem.dataset.row);
                const targetCol = parseInt(targetGem.dataset.col);
                this.trySwap(this.selectedGem.row, this.selectedGem.col, targetRow, targetCol);
            }
        }
        
        // Clean up
        document.querySelectorAll('.gem').forEach(gem => {
            gem.classList.remove('dragging', 'preview');
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
        document.querySelectorAll('.gem.preview').forEach(gem => {
            gem.classList.remove('preview');
        });
        
        // Add preview to both gems
        const gem1 = document.querySelector(`[data-row="${row1}"][data-col="${col1}"]`);
        const gem2 = document.querySelector(`[data-row="${row2}"][data-col="${col2}"]`);
        
        if (gem1 && gem2) {
            gem1.classList.add('preview');
            gem2.classList.add('preview');
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
            gem1.style.animation = 'shake 0.5s ease-in-out';
            gem2.style.animation = 'shake 0.5s ease-in-out';
            
            setTimeout(() => {
                gem1.style.animation = '';
                gem2.style.animation = '';
            }, 500);
        }
    }
    
    hasMatches() {
        return this.findMatches().length > 0;
    }
    
    findMatches() {
        const matches = [];
        
        // Check horizontal matches
        for (let row = 0; row < this.boardSize; row++) {
            let count = 1;
            let currentColor = this.board[row][0];
            
            for (let col = 1; col < this.boardSize; col++) {
                if (this.board[row][col] === currentColor) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let i = col - count; i < col; i++) {
                            matches.push({ row, col: i });
                        }
                    }
                    count = 1;
                    currentColor = this.board[row][col];
                }
            }
            
            if (count >= 3) {
                for (let i = this.boardSize - count; i < this.boardSize; i++) {
                    matches.push({ row, col: i });
                }
            }
        }
        
        // Check vertical matches
        for (let col = 0; col < this.boardSize; col++) {
            let count = 1;
            let currentColor = this.board[0][col];
            
            for (let row = 1; row < this.boardSize; row++) {
                if (this.board[row][col] === currentColor) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let i = row - count; i < row; i++) {
                            matches.push({ row: i, col });
                        }
                    }
                    count = 1;
                    currentColor = this.board[row][col];
                }
            }
            
            if (count >= 3) {
                for (let i = this.boardSize - count; i < this.boardSize; i++) {
                    matches.push({ row: i, col });
                }
            }
        }
        
        return matches;
    }
    
    processMatches() {
        const matches = this.findMatches();
        
        if (matches.length === 0) {
            return;
        }
        
        // Add matched class for animation
        matches.forEach(match => {
            const gem = document.querySelector(`[data-row="${match.row}"][data-col="${match.col}"]`);
            if (gem) {
                gem.classList.add('matched');
            }
        });
        
        // Update score
        this.score += matches.length * 10;
        document.getElementById('score').textContent = this.score;
        
        // Remove matched gems after animation
        setTimeout(() => {
            matches.forEach(match => {
                this.board[match.row][match.col] = null;
            });
            
            this.dropGems();
        }, 500);
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
                this.board[i][col] = this.getRandomColor();
                newGems.push({ row: i, col });
            }
        }
        
        this.renderBoard();
        
        // Animate only the gems that actually moved or are new
        movedGems.forEach((gem, index) => {
            const element = document.querySelector(`[data-row="${gem.row}"][data-col="${gem.col}"]`);
            if (element) {
                element.classList.add('falling');
                element.style.animationDelay = `${index * 0.05}s`;
            }
        });
        
        // Animate new gems with a different animation (from above)
        newGems.forEach((gem, index) => {
            const element = document.querySelector(`[data-row="${gem.row}"][data-col="${gem.col}"]`);
            if (element) {
                element.classList.add('new-gem');
                element.style.animationDelay = `${(movedGems.length + index) * 0.05}s`;
            }
        });
        
        // Check for more matches after dropping
        setTimeout(() => {
            document.querySelectorAll('.gem').forEach(gem => {
                gem.classList.remove('falling', 'new-gem');
                gem.style.animationDelay = '';
            });
            
            if (this.hasMatches()) {
                this.processMatches();
            }
        }, 600);
    }
    
    updateScore(points) {
        this.score += points;
        document.getElementById('score').textContent = this.score;
    }
}

// Add shake animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new Match3Game();
});