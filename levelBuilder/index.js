#!/usr/bin/env node

/**
 * Match 2048 Level Builder
 *
 * A Node.js script to analyze, generate, and balance levels for Match 2048.
 * Uses sophisticated difficulty calculation algorithms to create challenging
 * but fair levels that account for power-ups and game mechanics.
 */

const fs = require('fs');

class LevelBuilder {
    constructor() {
        this.POWER_UP_VALUE = 6; // 3 power-ups × 2 uses each
        this.DEFAULT_BOARD_SIZE = 8;
        this.MIN_BOARD_SIZE = 6;
        this.MAX_BOARD_SIZE = 8;

        // Tile progression (powers of 2)
        this.TILE_VALUES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
        this.DEFAULT_SPAWNABLE = [2, 4, 8, 16];

        // Difficulty thresholds for level classification
        this.DIFFICULTY_THRESHOLDS = {
            'very-easy': 0.25,
            'easy': 0.45,
            'medium': 0.65,
            'hard': 0.8,
            'very-hard': 1.0
        };

        // Load existing levels from script.js
        this.existingLevels = this.loadExistingLevels();
    }

    /**
     * Calculate comprehensive difficulty score for a level
     * @param {Object} level - Level configuration
     * @returns {Object} Difficulty analysis with score and breakdown
     */
    calculateDifficulty(level) {
        const goalComplexity = this.calculateGoalComplexity(level);
        const boardConstraints = this.calculateBoardConstraints(level);
        const resourceEfficiency = this.calculateResourceEfficiency(level);

        // Weighted difficulty score (0.0 to 1.0+)
        // Put more weight on resource efficiency to make hard levels achievable
        const difficulty = (
            goalComplexity.score * 0.3 +
            boardConstraints.score * 0.2 +
            resourceEfficiency.score * 0.5
        );

        return {
            totalScore: Math.round(difficulty * 100) / 100,
            classification: this.classifyDifficulty(difficulty),
            breakdown: {
                goalComplexity,
                boardConstraints,
                resourceEfficiency
            },
            recommendations: this.generateRecommendations(level, difficulty, resourceEfficiency)
        };
    }

    /**
     * Calculate goal complexity based on tile values, quantities, and types
     */
    calculateGoalComplexity(level) {
        const goals = level.goals || [];
        let totalComplexity = 0;
        let details = [];

        for (const goal of goals) {
            // Base complexity from tile value (log scale)
            const tileComplexity = Math.log2(goal.tileValue / 2) / 10; // 0.0 to 1.0+

            // Quantity multiplier
            const quantityMultiplier = Math.min(goal.target / 5, 2.0); // Cap at 2x

            // Goal type modifier
            const typeModifier = goal.goalType === 'current' ? 1.5 : 1.0;

            const goalScore = tileComplexity * quantityMultiplier * typeModifier;
            totalComplexity += goalScore;

            details.push({
                tile: goal.tileValue,
                target: goal.target,
                type: goal.goalType,
                score: Math.round(goalScore * 100) / 100
            });
        }

        // Multiple goals increase complexity
        const multiGoalMultiplier = goals.length > 1 ? 1.0 + (goals.length - 1) * 0.2 : 1.0;
        totalComplexity *= multiGoalMultiplier;

        return {
            score: Math.min(totalComplexity, 1.0), // Cap at 1.0
            details,
            multiGoalMultiplier
        };
    }

    /**
     * Calculate board constraint difficulty from size and blocked tiles
     */
    calculateBoardConstraints(level) {
        const boardWidth = level.boardWidth || this.DEFAULT_BOARD_SIZE;
        const boardHeight = level.boardHeight || this.DEFAULT_BOARD_SIZE;
        const totalSpaces = boardWidth * boardHeight;

        // Count blocked spaces
        const blockedTiles = level.blockedTiles || [];
        let blockedSpaces = 0;

        for (const blocked of blockedTiles) {
            if (blocked.row !== undefined && blocked.col !== undefined) {
                blockedSpaces += 1; // Specific tile
            } else if (blocked.row !== undefined) {
                blockedSpaces += boardWidth; // Entire row
            } else if (blocked.col !== undefined) {
                blockedSpaces += boardHeight; // Entire column
            }
        }

        const availableSpaces = totalSpaces - blockedSpaces;
        const spaceRatio = availableSpaces / totalSpaces;

        // Smaller boards and more blocked tiles = higher difficulty
        const sizeScore = 1.0 - ((totalSpaces - 36) / (64 - 36)); // 6x6 to 8x8 range
        const blockageScore = 1.0 - spaceRatio;

        const constraintScore = (sizeScore * 0.4 + blockageScore * 0.6) * 0.8; // Max 0.8

        return {
            score: Math.max(0, Math.min(constraintScore, 1.0)),
            totalSpaces,
            availableSpaces,
            blockedSpaces,
            spaceRatio: Math.round(spaceRatio * 100) / 100
        };
    }

    /**
     * Calculate resource efficiency (moves vs. requirements)
     */
    calculateResourceEfficiency(level) {
        const maxMoves = level.maxMoves || 20;
        const goals = level.goals || [];
        const spawnableTiles = level.spawnableTiles || this.DEFAULT_SPAWNABLE;

        // Validate goals are achievable with spawnable tiles
        const validation = this.validateGoalsVsSpawnables(goals, spawnableTiles);
        if (!validation.valid) {
            return {
                score: 0.0,
                maxMoves,
                effectiveMoves: maxMoves + this.POWER_UP_VALUE,
                estimatedMovesNeeded: 0,
                efficiency: 0,
                error: validation.error,
                impossible: true
            };
        }

        // Calculate realistic moves needed
        let totalMovesNeeded = 0;

        for (const goal of goals) {
            const movesPerTile = this.calculateMovesNeededForTile(goal.tileValue, spawnableTiles);
            totalMovesNeeded += movesPerTile * goal.target;
        }

        // Account for power-ups (equivalent to ~6 moves of efficiency)
        const effectiveMoves = maxMoves + this.POWER_UP_VALUE;

        // Efficiency score
        const efficiency = totalMovesNeeded / effectiveMoves;
        const efficiencyScore = Math.min(efficiency, 1.2) / 1.2; // Cap and normalize

        return {
            score: efficiencyScore,
            maxMoves,
            effectiveMoves,
            estimatedMovesNeeded: Math.round(totalMovesNeeded),
            efficiency: Math.round(efficiency * 100) / 100,
            validation
        };
    }

    /**
     * Validate that goals are achievable with given spawnable tiles
     */
    validateGoalsVsSpawnables(goals, spawnableTiles) {
        const maxSpawnable = Math.max(...spawnableTiles);

        for (const goal of goals) {
            if (goal.tileValue <= maxSpawnable) {
                return {
                    valid: false,
                    error: `Goal ${goal.tileValue} is <= max spawnable ${maxSpawnable} - makes level trivial or impossible`
                };
            }

            // Check if goal is reachable (must be power of 2)
            if ((goal.tileValue & (goal.tileValue - 1)) !== 0) {
                return {
                    valid: false,
                    error: `Goal ${goal.tileValue} is not a power of 2`
                };
            }
        }

        return { valid: true };
    }

    /**
     * Calculate realistic moves needed to create one tile of target value
     */
    calculateMovesNeededForTile(targetValue, spawnableTiles) {
        const maxSpawnable = Math.max(...spawnableTiles);

        if (targetValue <= maxSpawnable) {
            return 0; // Trivial or impossible
        }

        // Calculate progression steps needed
        let currentValue = maxSpawnable;
        let stepsNeeded = 0;

        while (currentValue < targetValue) {
            stepsNeeded++;
            currentValue *= 2;
        }

        if (currentValue !== targetValue) {
            return 999; // Impossible to reach exactly
        }

        // Each step requires approximately:
        // - 3-4 matches to generate enough tiles for next level
        // - Account for chain reactions (reduces by ~30%)
        // - Account for special formations (T/L shapes give 4x multiplier)

        const baseMovesPerStep = 3.0;
        const chainEfficiency = 0.7; // 30% reduction from chain reactions
        const formationBonus = 0.85; // 15% reduction from special formations

        const movesPerStep = baseMovesPerStep * chainEfficiency * formationBonus;
        const totalMoves = stepsNeeded * movesPerStep;

        return Math.ceil(totalMoves);
    }

    /**
     * Classify difficulty level based on score
     */
    classifyDifficulty(score) {
        for (const [label, threshold] of Object.entries(this.DIFFICULTY_THRESHOLDS)) {
            if (score <= threshold) {
                return label;
            }
        }
        return 'extreme';
    }

    /**
     * Generate recommendations for level improvement
     */
    generateRecommendations(level, difficultyScore, resourceData) {
        const recommendations = [];

        // Check for impossible levels first
        if (resourceData?.impossible) {
            recommendations.push(`❌ IMPOSSIBLE: ${resourceData.error}`);
            return recommendations;
        }

        if (difficultyScore < 0.4) {
            recommendations.push("Level is too easy - consider reducing moves or increasing goal requirements");
            recommendations.push("Add more blocked tiles or reduce board size for constraint");
        } else if (difficultyScore > 0.9) {
            recommendations.push("Level may be too difficult - consider increasing moves or reducing goals");
            recommendations.push("Provide better spawnable tiles or reduce blocked areas");
        }

        if (level.maxMoves > 60) {
            recommendations.push("Move limit seems excessive - consider reducing for better challenge");
        }

        if ((level.goals || []).every(g => g.goalType === 'created')) {
            recommendations.push("Consider mixing 'current' and 'created' goal types for variety");
        }

        // Check if moves vs estimated moves makes sense
        if (resourceData?.estimatedMovesNeeded) {
            const ratio = level.maxMoves / resourceData.estimatedMovesNeeded;
            if (ratio < 1.2) {
                recommendations.push("Moves are too tight - level may be nearly impossible");
            } else if (ratio > 2.5) {
                recommendations.push("Too many moves provided - level will be too easy");
            }
        }

        return recommendations;
    }

    /**
     * Generate a new level with target difficulty
     */
    generateLevel(options = {}) {
        const {
            targetDifficulty = 0.6,
            levelNumber = 1,
            boardWidth = 6,
            boardHeight = 6,
            goalTypes = ['created'],
            maxIterations = 100
        } = options;

        let bestLevel = null;
        let bestScore = Infinity;

        for (let i = 0; i < maxIterations; i++) {
            const level = this.generateRandomLevel({
                levelNumber,
                boardWidth,
                boardHeight,
                goalTypes,
                targetDifficulty
            });

            const analysis = this.calculateDifficulty(level);
            const scoreDiff = Math.abs(analysis.totalScore - targetDifficulty);

            if (scoreDiff < bestScore) {
                bestScore = scoreDiff;
                bestLevel = { ...level };

                // If we're close enough, use this level
                if (scoreDiff < 0.05) break;
            }
        }

        return {
            level: bestLevel,
            analysis: this.calculateDifficulty(bestLevel),
            targetDifficulty,
            accuracy: Math.round((1 - bestScore) * 100)
        };
    }

    /**
     * Generate a random level configuration
     */
    generateRandomLevel(options) {
        const { levelNumber, boardWidth, boardHeight, goalTypes, targetDifficulty = 0.6 } = options;

        // Generate spawnable tiles first
        const spawnableTiles = this.generateSpawnableTiles(levelNumber);

        // Generate goals that make sense with these spawnable tiles and target difficulty
        const goals = this.generateGoals(levelNumber, goalTypes, spawnableTiles, targetDifficulty);

        // Calculate realistic move limit based on goals and target difficulty
        let estimatedMoves = 0;
        for (const goal of goals) {
            const movesPerTile = this.calculateMovesNeededForTile(goal.tileValue, spawnableTiles);
            estimatedMoves += movesPerTile * goal.target;
        }

        // Adjust buffer based on target difficulty - higher difficulty = tighter moves
        let buffer;
        if (targetDifficulty > 0.8) {
            buffer = 1.0 + Math.random() * 0.15; // 0-15% buffer for very hard (very tight!)
        } else if (targetDifficulty > 0.7) {
            buffer = 1.05 + Math.random() * 0.15; // 5-20% buffer for hard
        } else if (targetDifficulty > 0.6) {
            buffer = 1.15 + Math.random() * 0.2; // 15-35% buffer for medium
        } else {
            buffer = 1.2 + Math.random() * 0.3; // 20-50% buffer for easy
        }

        const maxMoves = Math.max(10, Math.ceil(estimatedMoves * buffer));

        // Random blocked tiles
        const blockedTiles = this.generateBlockedTiles(boardHeight);

        return {
            level: levelNumber,
            boardWidth,
            boardHeight,
            maxMoves,
            blockedTiles,
            goals,
            spawnableTiles
        };
    }

    /**
     * Generate blocked tile configurations - only at bottom to act as floor obstacles
     * Tiles drop down due to gravity, so blocked tiles should only be at the bottom
     */
    generateBlockedTiles(boardHeight) {
        const patterns = [
            [{ row: boardHeight - 1 }], // Bottom row only
            [{ row: boardHeight - 2 }, { row: boardHeight - 1 }], // Bottom two rows
            [{ row: boardHeight - 3 }, { row: boardHeight - 2 }, { row: boardHeight - 1 }], // Bottom three rows
            [{ row: boardHeight - 2 }], // Second to last row only
            [{ row: boardHeight - 3 }, { row: boardHeight - 1 }], // Bottom and third from bottom
        ];

        return patterns[Math.floor(Math.random() * patterns.length)];
    }

    /**
     * Generate goal configurations that make sense
     */
    generateGoals(levelNumber, goalTypes, spawnableTiles, targetDifficulty = 0.6) {
        const maxSpawnable = Math.max(...spawnableTiles);
        const goals = [];

        // More goals for higher difficulty
        const numGoals = targetDifficulty > 0.7 ?
            (Math.floor(Math.random() * 2) + 2) : // 2-3 goals for hard levels
            (Math.floor(Math.random() * 2) + 1);  // 1-2 goals for normal levels

        for (let i = 0; i < numGoals; i++) {
            // More aggressive doubling for higher difficulties
            let doublings;
            if (targetDifficulty > 0.8) {
                doublings = Math.min(4 + Math.floor(Math.random() * 3), 7); // 4-6 doublings for very hard
            } else if (targetDifficulty > 0.7) {
                doublings = Math.min(3 + Math.floor(Math.random() * 3), 6); // 3-5 doublings for hard
            } else {
                doublings = Math.min(2 + Math.floor(Math.random() * 3), 5); // 2-4 doublings for normal
            }

            const tileValue = maxSpawnable * Math.pow(2, doublings);

            // More aggressive target counts for higher difficulties
            let target;
            if (targetDifficulty > 0.8) {
                if (doublings <= 3) {
                    target = Math.floor(Math.random() * 6) + 4; // 4-9 tiles
                } else if (doublings <= 5) {
                    target = Math.floor(Math.random() * 3) + 2; // 2-4 tiles
                } else {
                    target = Math.floor(Math.random() * 2) + 1; // 1-2 tiles
                }
            } else if (targetDifficulty > 0.7) {
                if (doublings <= 3) {
                    target = Math.floor(Math.random() * 4) + 3; // 3-6 tiles
                } else {
                    target = Math.floor(Math.random() * 2) + 1; // 1-2 tiles
                }
            } else {
                // Normal difficulty logic
                if (doublings <= 2) {
                    target = Math.floor(Math.random() * 4) + 2; // 2-5 tiles
                } else if (doublings <= 4) {
                    target = Math.floor(Math.random() * 2) + 1; // 1-2 tiles
                } else {
                    target = 1; // Only 1 tile for very high values
                }
            }

            const goalType = goalTypes[Math.floor(Math.random() * goalTypes.length)];

            goals.push({
                tileValue,
                target,
                current: 0,
                goalType
            });
        }

        return goals;
    }

    /**
     * Generate sensible spawnable tile configurations
     */
    generateSpawnableTiles(levelNumber) {
        // Progressive spawnable tiles based on level
        if (levelNumber <= 3) {
            return [2, 4, 8]; // Early levels
        } else if (levelNumber <= 6) {
            return [2, 4, 8, 16]; // Mid levels
        } else if (levelNumber <= 8) {
            return [4, 8, 16]; // Later levels (higher floor)
        } else {
            return [4, 8, 16, 32]; // End game levels
        }
    }

    /**
     * Load and parse existing levels from script.js
     */
    loadExistingLevels() {
        // Use hardcoded levels that match the current game exactly
        return this.getHardcodedLevels();
    }

    /**
     * Hardcoded levels based on the current game
     */
    getHardcodedLevels() {
        return [
            {
                level: 1,
                boardWidth: 6,
                boardHeight: 6,
                maxMoves: 10,
                blockedTiles: [{ row: 3 }, { row: 4 }, { row: 5 }], // Bottom 3 rows (rows 3,4,5 in 6x6)
                goals: [{ tileValue: 32, target: 1, current: 0, goalType: "created" }],
                spawnableTiles: [2, 4, 8]
            },
            {
                level: 2,
                boardWidth: 6,
                boardHeight: 6,
                maxMoves: 15,
                blockedTiles: [{ row: 3 }, { row: 4 }, { row: 5 }], // Bottom 3 rows (rows 3,4,5 in 6x6)
                goals: [
                    { tileValue: 64, target: 1, current: 0, goalType: "created" },
                    { tileValue: 32, target: 3, current: 0, goalType: "created" }
                ],
                spawnableTiles: [2, 4, 8]
            },
            {
                level: 3,
                maxMoves: 20,
                boardWidth: 6,
                boardHeight: 6,
                blockedTiles: [{ row: 4 }, { row: 5 }],
                goals: [
                    { tileValue: 64, target: 2, current: 0, goalType: "created" },
                    { tileValue: 32, target: 5, current: 0, goalType: "created" }
                ],
                spawnableTiles: [2, 4, 8, 16]
            },
            {
                level: 4,
                maxMoves: 30,
                boardWidth: 8,
                boardHeight: 8,
                blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
                goals: [{ tileValue: 128, target: 1, current: 0, goalType: "created" }],
                spawnableTiles: [2, 4, 8, 16]
            },
            {
                level: 5,
                maxMoves: 40,
                boardWidth: 8,
                boardHeight: 8,
                blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
                goals: [{ tileValue: 128, target: 4, current: 0, goalType: "created" }],
                spawnableTiles: [2, 4, 8, 16]
            },
            {
                level: 6,
                maxMoves: 50,
                boardWidth: 8,
                boardHeight: 8,
                blockedTiles: [{ row: 5 }, { row: 6 }, { row: 7 }],
                goals: [
                    { tileValue: 256, target: 1, current: 0, goalType: "created" },
                    { tileValue: 64, target: 4, current: 0, goalType: "created" }
                ],
                spawnableTiles: [2, 4, 8, 16]
            },
            {
                level: 7,
                maxMoves: 30,
                boardWidth: 8,
                boardHeight: 8,
                blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
                goals: [{ tileValue: 64, target: 8, current: 0, goalType: "current" }],
                spawnableTiles: [2, 4, 8, 16]
            },
            {
                level: 8,
                maxMoves: 55,
                boardWidth: 8,
                boardHeight: 8,
                blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
                goals: [
                    { tileValue: 256, target: 1, current: 0, goalType: "created" },
                    { tileValue: 128, target: 2, current: 0, goalType: "created" },
                    { tileValue: 64, target: 4, current: 0, goalType: "created" }
                ],
                spawnableTiles: [2, 4, 8, 16]
            },
            {
                level: 9,
                maxMoves: 60,
                boardWidth: 8,
                boardHeight: 8,
                blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
                goals: [
                    { tileValue: 512, target: 1, current: 0, goalType: "created" },
                    { tileValue: 128, target: 2, current: 0, goalType: "created" }
                ],
                spawnableTiles: [2, 4, 8, 16]
            },
            {
                level: 10,
                maxMoves: 70,
                boardWidth: 8,
                boardHeight: 8,
                blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
                goals: [{ tileValue: 1024, target: 1, current: 0, goalType: "created" }],
                spawnableTiles: [4, 8, 16, 32]
            }
        ];
    }

    /**
     * Analyze all existing levels
     */
    analyzeExistingLevels() {
        console.log('=== EXISTING LEVEL ANALYSIS ===\n');

        const analyses = [];

        for (const level of this.existingLevels) {
            const analysis = this.calculateDifficulty(level);
            analyses.push({ level: level.level, ...analysis });

            console.log(`Level ${level.level}: ${analysis.classification.toUpperCase()} (${analysis.totalScore})`);
            console.log(`  Moves: ${level.maxMoves}, Goals: ${level.goals?.length || 0}`);
            console.log(`  Board: ${level.boardWidth || 8}x${level.boardHeight || 8}, Blocked: ${level.blockedTiles?.length || 0} patterns`);

            if (analysis.recommendations.length > 0) {
                console.log('  Recommendations:');
                analysis.recommendations.forEach(rec => console.log(`    - ${rec}`));
            }
            console.log();
        }

        return analyses;
    }

    /**
     * Generate a level sequence with progressive difficulty
     */
    generateLevelSequence(options = {}) {
        const {
            startLevel = 1,
            numLevels = 10,
            startDifficulty = 0.2,
            endDifficulty = 0.95, // Increased to reach very-hard levels
            boardProgression = true
        } = options;

        const levels = [];
        const difficultyStep = (endDifficulty - startDifficulty) / (numLevels - 1);

        for (let i = 0; i < numLevels; i++) {
            const levelNum = startLevel + i;
            const targetDifficulty = startDifficulty + (i * difficultyStep);

            // Progressive board size
            const boardSize = boardProgression ?
                Math.min(6 + Math.floor(i / 3), 8) : 6;

            const result = this.generateLevel({
                targetDifficulty,
                levelNumber: levelNum,
                boardWidth: boardSize,
                boardHeight: boardSize,
                goalTypes: i > 5 ? ['created', 'current'] : ['created']
            });

            levels.push(result);
        }

        return levels;
    }

    /**
     * Export levels to JSON format
     */
    exportLevels(levels, filename = 'generated-levels.json') {
        const exportData = {
            generated: new Date().toISOString(),
            levels: levels.map(l => l.level || l),
            metadata: levels.map(l => ({
                level: l.level?.level || l.level,
                difficulty: l.analysis?.totalScore,
                classification: l.analysis?.classification
            }))
        };

        fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
        console.log(`Exported ${levels.length} levels to ${filename}`);
    }

    /**
     * CLI interface
     */
    run() {
        const args = process.argv.slice(2);
        const command = args[0] || 'analyze';

        switch (command) {
            case 'analyze':
                this.analyzeExistingLevels();
                break;

            case 'generate':
                const numLevels = parseInt(args[1]) || 5;
                const difficulty = parseFloat(args[2]) || 0.6;
                console.log(`Generating ${numLevels} levels with target difficulty ${difficulty}...\n`);

                const levels = [];
                for (let i = 1; i <= numLevels; i++) {
                    const result = this.generateLevel({
                        targetDifficulty: difficulty,
                        levelNumber: i
                    });
                    levels.push(result);

                    console.log(`Level ${i}: ${result.analysis.classification} (${result.analysis.totalScore})`);
                }

                this.exportLevels(levels);
                break;

            case 'sequence':
                const seqLevels = parseInt(args[1]) || 10;
                console.log(`Generating progressive sequence of ${seqLevels} levels...\n`);

                const sequence = this.generateLevelSequence({ numLevels: seqLevels });

                sequence.forEach((result, i) => {
                    console.log(`Level ${i + 1}: ${result.analysis.classification} (${result.analysis.totalScore}) - ${result.accuracy}% accuracy`);
                });

                this.exportLevels(sequence, 'level-sequence.json');
                break;

            default:
                console.log(`
Match 2048 Level Builder

Commands:
  analyze           Analyze existing levels for difficulty
  generate [n] [d]  Generate n levels with difficulty d (0.0-1.0)
  sequence [n]      Generate progressive sequence of n levels

Examples:
  node levelBuilder.js analyze
  node levelBuilder.js generate 5 0.7
  node levelBuilder.js sequence 15
                `);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const builder = new LevelBuilder();
    builder.run();
}

module.exports = LevelBuilder;