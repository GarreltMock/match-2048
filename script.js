document.addEventListener("DOMContentLoaded", () => {
    const gameBoard = document.getElementById("game-board");
    const scoreDisplay = document.createElement("div");
    document.body.insertBefore(scoreDisplay, document.body.firstChild);

    const gridWidth = 8;
    const gridHeight = 8;
    const colors = ["#FED714", "#E21B05", "#1370EB", "#19C519"];
    let grid = [];
    let score = 0;

    let draggedItem = null;
    let isDragging = false;
    let isProcessing = false;
    let startX, startY;

    function createGrid() {
        for (let i = 0; i < gridWidth * gridHeight; i++) {
            const square = document.createElement("div");
            square.classList.add("grid-item");
            square.setAttribute("data-id", i);
            square.style.left = `${(i % gridWidth) * 50}px`;
            square.style.top = `${Math.floor(i / gridWidth) * 50}px`;
            gameBoard.appendChild(square);
            grid.push(square);
        }

        gameBoard.addEventListener('mousedown', onDragStart);
        gameBoard.addEventListener('touchstart', onDragStart);
        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('touchmove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
        document.addEventListener('touchend', onDragEnd);

        updateScore(0);
        initializeBoard();
    }

    function initializeBoard() {
        for (let i = 0; i < grid.length; i++) {
            grid[i].style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        }

        while (true) {
            const matches = findMatches();
            if (matches.size === 0) {
                break;
            }
            matches.forEach(index => {
                grid[index].style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            });
        }
    }

    function onDragStart(e) {
        if (isProcessing || !e.target.classList.contains('grid-item')) return;
        isDragging = true;
        draggedItem = e.target;
        draggedItem.classList.add('dragging');

        const event = e.touches ? e.touches[0] : e;
        startX = event.clientX;
        startY = event.clientY;
    }

    function onDragMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        const event = e.touches ? e.touches[0] : e;
        const x = event.clientX;
        const y = event.clientY;

        const gameBoardRect = gameBoard.getBoundingClientRect();
        const relX = x - gameBoardRect.left;
        const relY = y - gameBoardRect.top;

        draggedItem.style.left = `${relX - draggedItem.offsetWidth / 2}px`;
        draggedItem.style.top = `${relY - draggedItem.offsetHeight / 2}px`;
    }

    function onDragEnd(e) {
        if (!isDragging) return;
        isDragging = false;
        draggedItem.classList.remove('dragging');

        const draggedId = parseInt(draggedItem.getAttribute('data-id'));
        resetPosition(draggedItem, draggedId);

        const event = e.changedTouches ? e.changedTouches[0] : e;
        const endX = event.clientX;
        const endY = event.clientY;

        const diffX = endX - startX;
        const diffY = endY - startY;

        let direction;
        if (Math.abs(diffX) > Math.abs(diffY)) {
            direction = diffX > 0 ? 'right' : 'left';
        } else {
            direction = diffY > 0 ? 'down' : 'up';
        }

        let targetId;
        if (direction === 'right') targetId = draggedId + 1;
        else if (direction === 'left') targetId = draggedId - 1;
        else if (direction === 'up') targetId = draggedId - gridWidth;
        else if (direction === 'down') targetId = draggedId + gridWidth;

        const targetItem = grid[targetId];
        if (targetItem && areAdjacent(draggedId, targetId)) {
            handleSwap(draggedItem, targetItem);
        }
    }

    function handleSwap(item1, item2) {
        isProcessing = true;
        swapItems(item1, item2);

        setTimeout(() => {
            if (!findAndClearPlayerMatches()) {
                swapItems(item1, item2); // Swap back
                isProcessing = false;
            } else {
                processGravityAndRefill();
            }
        }, 100);
    }

    function findMatches() {
        const matches = new Set();
        // Check horizontal
        for (let r = 0; r < gridHeight; r++) {
            for (let c = 0; c < gridWidth - 2; c++) {
                const i1 = r * gridWidth + c;
                const i2 = i1 + 1;
                const i3 = i1 + 2;
                if (grid[i1].style.backgroundColor && grid[i1].style.backgroundColor === grid[i2].style.backgroundColor && grid[i1].style.backgroundColor === grid[i3].style.backgroundColor) {
                    [i1, i2, i3].forEach(i => matches.add(i));
                }
            }
        }
        // Check vertical
        for (let c = 0; c < gridWidth; c++) {
            for (let r = 0; r < gridHeight - 2; r++) {
                const i1 = r * gridWidth + c;
                const i2 = i1 + gridWidth;
                const i3 = i1 + 2 * gridWidth;
                if (grid[i1].style.backgroundColor && grid[i1].style.backgroundColor === grid[i2].style.backgroundColor && grid[i1].style.backgroundColor === grid[i3].style.backgroundColor) {
                    [i1, i2, i3].forEach(i => matches.add(i));
                }
            }
        }
        return matches;
    }

    function findAndClearPlayerMatches() {
        const matches = findMatches();
        if (matches.size > 0) {
            matches.forEach(index => {
                grid[index].classList.add('remove');
            });
            setTimeout(() => {
                matches.forEach(index => {
                    grid[index].style.backgroundColor = '';
                    grid[index].classList.remove('remove');
                });
                updateScore(matches.size);
            }, 200);
            return true;
        }
        return false;
    }

    function processGravityAndRefill() {
        gravity();
        refill();
        setTimeout(() => {
            if (findAndClearPlayerMatches()) {
                processGravityAndRefill();
            } else {
                isProcessing = false;
            }
        }, 500);
    }

    function gravity() {
        for (let c = 0; c < gridWidth; c++) {
            let emptyRow = gridHeight - 1;
            for (let r = gridHeight - 1; r >= 0; r--) {
                const index = r * gridWidth + c;
                if (grid[index].style.backgroundColor !== '') {
                    const targetIndex = emptyRow * gridWidth + c;
                    if (index !== targetIndex) {
                        grid[targetIndex].style.backgroundColor = grid[index].style.backgroundColor;
                        grid[index].style.backgroundColor = '';
                    }
                    emptyRow--;
                }
            }
        }
    }

    function refill() {
        for (let c = 0; c < gridWidth; c++) {
            let emptyCount = 0;
            for (let r = gridHeight - 1; r >= 0; r--) {
                const index = r * gridWidth + c;
                if (grid[index].style.backgroundColor === '') {
                    emptyCount++;
                    grid[index].style.top = `${-emptyCount * 50}px`;
                    grid[index].style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    setTimeout(() => resetPosition(grid[index], index), 10);
                }
            }
        }
    }

    function resetPosition(item, id) {
        item.style.left = `${(id % gridWidth) * 50}px`;
        item.style.top = `${Math.floor(id / gridWidth) * 50}px`;
    }

    function areAdjacent(id1, id2) {
        const row1 = Math.floor(id1 / gridWidth);
        const col1 = id1 % gridWidth;
        const row2 = Math.floor(id2 / gridWidth);
        const col2 = id2 % gridWidth;
        return Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1;
    }

    function swapItems(item1, item2) {
        const color1 = item1.style.backgroundColor;
        item1.style.backgroundColor = item2.style.backgroundColor;
        item2.style.backgroundColor = color1;
    }

    function updateScore(points) {
        score += points;
        scoreDisplay.textContent = `Score: ${score}`;
    }

    createGrid();
});
