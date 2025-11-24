// Animation coordination for swaps, merges, and tile drops

import { createTile } from "./tile-helpers.js";
import { getRandomTileValue } from "./board.js";
import { trySwap } from "./input-handler.js";

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

        // Assign outer tiles to nearest middle positions for better visual flow
        const assignments = assignTilesToTargets(outerTiles, middlePositions);

        // Animate outer tiles sliding to their assigned middle positions
        assignments.forEach(({ tile, target }) => {
            slideGemTo(tile, target);
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
    return allTiles.filter((tile) => !middleTiles.some((middle) => middle.row === tile.row && middle.col === tile.col));
}

// Assign each outer tile to its nearest target position based on Manhattan distance
function assignTilesToTargets(outerTiles, targetPositions) {
    if (targetPositions.length === 0) return [];
    if (targetPositions.length === 1) {
        // If only one target, all tiles go there
        return outerTiles.map((tile) => ({ tile, target: targetPositions[0] }));
    }

    // For multiple targets, assign each tile to its nearest target
    // Track how many tiles are assigned to each target for balanced distribution
    const targetCounts = new Map();
    targetPositions.forEach((pos) => {
        targetCounts.set(`${pos.row},${pos.col}`, 0);
    });

    const assignments = [];

    // Sort outer tiles to process them in a consistent order
    const sortedOuterTiles = [...outerTiles].sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
    });

    for (const tile of sortedOuterTiles) {
        // Find the nearest target position
        let bestTarget = targetPositions[0];
        let bestDistance = Math.abs(tile.row - bestTarget.row) + Math.abs(tile.col - bestTarget.col);

        for (const target of targetPositions) {
            const distance = Math.abs(tile.row - target.row) + Math.abs(tile.col - target.col);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestTarget = target;
            }
        }

        assignments.push({ tile, target: bestTarget });
        const key = `${bestTarget.row},${bestTarget.col}`;
        targetCounts.set(key, targetCounts.get(key) + 1);
    }

    return assignments;
}

function calculateMiddlePositions(_game, tiles, group = null) {
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

    // Special handling for 5-tile lines (should create 1 tile with 4x value)
    if (group && (group.direction === "line_5_horizontal" || group.direction === "line_5_vertical")) {
        // 5 tiles: middle position only (creates 1 tile with 4x value)
        positions.push(tiles[2]);
        return positions;
    }

    // Regular match logic
    if (length === 3) {
        // 3 tiles: middle position (creates 1 tile with 2x value)
        positions.push(tiles[1]);
    } else if (length === 4) {
        // 4 tiles: two middle positions (creates 2 tiles with 2x value)
        positions.push(tiles[1]);
        positions.push(tiles[2]);
    } else if (length >= 5) {
        // 5+ tiles: single middle position (creates 1 tile with 4x value)
        positions.push(tiles[Math.floor(length / 2)]);
    }

    return positions;
}

export function animateUnblocking(game, blockedTiles, updateBlockedTileGoalsCallback, updateGoalDisplayCallback) {
    if (blockedTiles.length === 0) return;

    blockedTiles.forEach((blockedTile) => {
        const blockedElement = document.querySelector(`[data-row="${blockedTile.row}"][data-col="${blockedTile.col}"]`);

        if (blockedElement) {
            // Add disappear animation class (reverse bounce - inflate then shrink)
            blockedElement.classList.add("disappear");
        }

        // Remove from board data after animation completes (350ms)
        setTimeout(() => {
            game.board[blockedTile.row][blockedTile.col] = null;
        }, 400);
    });

    // Update blocked tile clearing goals if any blocked tiles were cleared
    if (blockedTiles.length > 0) {
        // Update after animation completes
        setTimeout(() => {
            updateBlockedTileGoalsCallback();
            updateGoalDisplayCallback(false); // Update display without checking completion
            // Let the natural cascade completion in dropGems handle checkLevelComplete
        }, 400);
    }
}

export function animateCursedExpiration(game, cursedTilesToRemove, cursedTilesToImplode, dropGemsCallback) {
    // Animate disappearing cursed tiles
    if (cursedTilesToRemove.length > 0) {
        cursedTilesToRemove.forEach((pos) => {
            const gem = document.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
            if (gem) {
                gem.classList.add("cursed-disappear");
            }
        });

        // Remove from board after animation
        setTimeout(() => {
            cursedTilesToRemove.forEach((pos) => {
                game.board[pos.row][pos.col] = null;
            });
            dropGemsCallback();
        }, 400);
    }

    // Animate imploding cursed tiles (adjacent tiles slide in)
    if (cursedTilesToImplode.length > 0) {
        cursedTilesToImplode.forEach((pos) => {
            const adjacentPositions = [
                { row: pos.row - 1, col: pos.col }, // Up
                { row: pos.row + 1, col: pos.col }, // Down
                { row: pos.row, col: pos.col - 1 }, // Left
                { row: pos.row, col: pos.col + 1 }, // Right
            ];

            // First, mark adjacent tiles with purple background
            adjacentPositions.forEach((adjPos) => {
                if (
                    adjPos.row >= 0 &&
                    adjPos.row < game.boardHeight &&
                    adjPos.col >= 0 &&
                    adjPos.col < game.boardWidth
                ) {
                    const adjTile = game.board[adjPos.row][adjPos.col];
                    if (adjTile && (adjTile.type === "normal" || adjTile.type === "cursed")) {
                        const adjGem = document.querySelector(`[data-row="${adjPos.row}"][data-col="${adjPos.col}"]`);
                        if (adjGem) {
                            adjGem.classList.add("cursed-sucked");
                        }
                    }
                }
            });

            // After 100ms delay, animate sliding toward cursed tile
            setTimeout(() => {
                adjacentPositions.forEach((adjPos) => {
                    if (
                        adjPos.row >= 0 &&
                        adjPos.row < game.boardHeight &&
                        adjPos.col >= 0 &&
                        adjPos.col < game.boardWidth
                    ) {
                        const adjTile = game.board[adjPos.row][adjPos.col];
                        if (adjTile && (adjTile.type === "normal" || adjTile.type === "cursed")) {
                            const adjGem = document.querySelector(
                                `[data-row="${adjPos.row}"][data-col="${adjPos.col}"]`
                            );
                            const cursedGem = document.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);

                            if (adjGem && cursedGem) {
                                const adjRect = adjGem.getBoundingClientRect();
                                const cursedRect = cursedGem.getBoundingClientRect();

                                const deltaX = cursedRect.left - adjRect.left;
                                const deltaY = cursedRect.top - adjRect.top;

                                adjGem.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                                adjGem.style.transition = "transform 0.4s ease-out, opacity 0.4s ease-out";
                                adjGem.classList.add("sliding");

                                // Fade out the sliding tile
                                setTimeout(() => {
                                    adjGem.style.opacity = "0";
                                }, 300);
                            }
                        }
                    }
                });
            }, 100);

            // Mark cursed tile for implosion effect
            const cursedGem = document.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
            if (cursedGem) {
                cursedGem.classList.add("cursed-implode");
            }
        });

        // Remove tiles from board after animation (400ms slide + 100ms delay)
        setTimeout(() => {
            cursedTilesToImplode.forEach((pos) => {
                const adjacentPositions = [
                    { row: pos.row - 1, col: pos.col },
                    { row: pos.row + 1, col: pos.col },
                    { row: pos.row, col: pos.col - 1 },
                    { row: pos.row, col: pos.col + 1 },
                ];

                adjacentPositions.forEach((adjPos) => {
                    if (
                        adjPos.row >= 0 &&
                        adjPos.row < game.boardHeight &&
                        adjPos.col >= 0 &&
                        adjPos.col < game.boardWidth
                    ) {
                        const adjTile = game.board[adjPos.row][adjPos.col];
                        if (adjTile && (adjTile.type === "normal" || adjTile.type === "cursed")) {
                            game.board[adjPos.row][adjPos.col] = null;
                        }
                    }
                });

                // Remove the cursed tile itself
                game.board[pos.row][pos.col] = null;
            });
            dropGemsCallback();
        }, 500);
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

    // Only render board if we have moves/new gems to show
    // This prevents breaking ongoing animations
    if (movedGems.length > 0 || newGems.length > 0) {
        game.renderBoard();

        // IMMEDIATELY hide new gems before they're visible
        newGems.forEach((gem) => {
            const element = document.querySelector(`[data-row="${gem.row}"][data-col="${gem.col}"]`);
            if (element) {
                element.style.opacity = "0";
            }
        });

        // Animate only the gems that actually moved - NO DELAY for existing tiles
        // Use CSS transition instead of keyframe animation for smooth drops
        movedGems.forEach((gem) => {
            const element = document.querySelector(`[data-row="${gem.row}"][data-col="${gem.col}"]`);
            if (element) {
                // Calculate how far the gem fell
                const distance = (gem.row - gem.fromRow) * (element.offsetHeight + 3); // 3 is the gap

                // Start from above and animate down
                element.style.transform = `translateY(-${distance}px)`;
                element.style.transition = "none";

                // Force reflow
                void element.offsetWidth;

                // Animate to final position
                element.style.transition = "transform 0.3s ease-in";
                element.style.transform = "translateY(0)";
                element.classList.add("falling");
            }
        });

        // Animate new gems with a different animation (from above) - WITH DELAY for spawn effect
        newGems.forEach((gem, index) => {
            const element = document.querySelector(`[data-row="${gem.row}"][data-col="${gem.col}"]`);
            if (element) {
                element.classList.add("new-gem");
                element.style.animationDelay = `${index * 0.03}s`; // Faster: 30ms instead of 50ms
            }
        });
    }

    // Calculate timeout: base animation (600ms for new-gem) + longest delay
    const longestDelay = newGems.length > 0 ? (newGems.length - 1) * 0.03 * 1000 : 0; // Updated to 30ms
    const totalTimeout = 400 + longestDelay;

    // Check for more matches after dropping
    setTimeout(() => {
        document.querySelectorAll(".gem").forEach((gem) => {
            gem.classList.remove("falling", "new-gem");
            gem.style.animationDelay = "";
            gem.style.opacity = ""; // Clear inline opacity style
        });

        // Check if cascade was interrupted by user input
        if (game.interruptCascade) {
            game.interruptCascade = false;
            // Resolve the animation promise to signal old cascade is done
            game.animating = false;

            // Execute the pending swap if it exists and moves are available
            if (game.pendingSwap) {
                const { row1, col1, row2, col2, tile1, tile2 } = game.pendingSwap;
                game.pendingSwap = null;

                // Clear preview visualization
                document.querySelectorAll(".gem.pending-preview").forEach((gem) => {
                    gem.classList.remove("pending-preview");
                });

                // Check if the tiles at those positions are still the same ones that were queued
                // Skip the swap if the tiles have changed during cascading
                const tilesUnchanged = game.board[row1][col1] === tile1 && game.board[row2][col2] === tile2;

                // Only execute swap if tiles haven't changed, player has moves remaining, and game is active
                if (tilesUnchanged && game.movesUsed < game.maxMoves && game.gameActive) {
                    const didSwap = trySwap(game, row1, col1, row2, col2);
                    if (!!didSwap) {
                        return;
                    }
                }
            }
        }

        // Check for matches regardless of gameActive state to handle cascading after running out of moves
        if (game.hasMatches()) {
            game.processMatches();
        } else {
            game.animating = false;

            // Decrement cursed timers after all cascades complete
            if (game.shouldDecrementCursedTimers) {
                game.decrementCursedTileTimers();
                game.shouldDecrementCursedTimers = false;
            }

            // Check level completion only after all animations are finished
            game.checkLevelComplete();
        }
    }, totalTimeout);
}
