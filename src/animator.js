// Animation coordination for swaps, merges, and tile drops

import { createTile } from "./tile-helpers.js";
import { getRandomTileValue } from "./board.js";

export function animateSwap(game, row1, col1, row2, col2, callback) {
    game.animating = true;

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
        game.animating = false;
        if (callback) callback();
    }
}

export function animateRevert(game, row1, col1, row2, col2) {
    game.animating = true;

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
            game.animating = false;
        }, 400);
    } else {
        game.animating = false;
    }
}

export function animateMerges(game, matchGroups, processMergesCallback) {
    matchGroups.forEach((group) => {
        const middlePositions = calculateMiddlePositions(game, group.tiles, group);
        const outerTiles = getOuterTiles(group.tiles, middlePositions);

        // Animate outer tiles sliding to middle positions
        outerTiles.forEach((outerTile, index) => {
            const targetPos = middlePositions[index % middlePositions.length];
            if (targetPos) {
                slideGemTo(outerTile, targetPos);
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
        processMergesCallback(matchGroups);
    }, 400);
}

function slideGemTo(fromTile, toTile) {
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

function getOuterTiles(allTiles, middleTiles) {
    return allTiles.filter(
        (tile) => !middleTiles.some((middle) => middle.row === tile.row && middle.col === tile.col)
    );
}

function calculateMiddlePositions(game, tiles, group = null) {
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

export function animateUnblocking(game, blockedTiles, updateBlockedTileGoalsCallback, updateGoalDisplayCallback) {
    if (blockedTiles.length === 0) return;

    blockedTiles.forEach((blockedTile) => {
        // Use the EXACT same approach as slideGemTo
        // Animate blocked tile to the position of the target tile that exists NOW
        slideGemTo(blockedTile, blockedTile.targetPos);

        // Remove from board data after animation starts
        setTimeout(() => {
            game.board[blockedTile.row][blockedTile.col] = null;
        }, 50);
    });

    // Update blocked tile clearing goals if any blocked tiles were cleared
    if (blockedTiles.length > 0) {
        // Update after a short delay to ensure board state is updated
        setTimeout(() => {
            updateBlockedTileGoalsCallback();
            updateGoalDisplayCallback(true); // Update display and check completion
        }, 100);
    }
}

export function dropGems(game) {
    const movedGems = [];
    const newGems = [];

    // Track which gems moved and which are new
    for (let col = 0; col < game.boardWidth; col++) {
        let writePos = game.boardHeight - 1;
        let emptySpaces = 0;

        // Count empty spaces and drop existing gems
        for (let row = game.boardHeight - 1; row >= 0; row--) {
            if (game.board[row][col] === null) {
                emptySpaces++;
            } else {
                if (row !== writePos) {
                    // This gem will move
                    movedGems.push({ row: writePos, col, fromRow: row });
                    game.board[writePos][col] = game.board[row][col];
                    game.board[row][col] = null;
                }
                writePos--;
            }
        }

        // Fill empty spaces from top with new gems
        for (let i = 0; i < emptySpaces; i++) {
            game.board[i][col] = createTile(getRandomTileValue(game));
            newGems.push({ row: i, col });
        }
    }

    game.renderBoard();

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
        if (game.hasMatches()) {
            game.processMatches();
        } else {
            game.animating = false;
            // Check level completion only after all animations are finished
            game.checkLevelComplete();
        }
    }, 600);
}
