// Constants and configuration for Match 2048 game

export const TILE_TYPE = {
    NORMAL: "normal",
    BLOCKED: "blocked",
    BLOCKED_WITH_LIFE: "blocked_with_life",
    JOKER: "joker",
    CURSED: "cursed",
};

export const SPECIAL_TILE_TYPES = {
    NONE: "none",
    JOKER: "joker",
    POWER: "power",
    GOLDEN: "golden",
    FREESWAP: "freeswap",
    STICKY_FREESWAP: "sticky_freeswap",
};

export const FORMATION_TYPES = {
    LINE_4: "line_4",
    BLOCK_4: "block_4",
    LINE_5: "line_5",
    T_FORMATION: "t_formation",
    L_FORMATION: "l_formation",
};

export const DEFAULT_TILE_VALUES = [1, 2, 3, 4]; // Internal representation: 1=2, 2=4, 3=8, 4=16

export const MAX_POWER_UP_USES = 2;

// Level definitions
// Internal representation: 1=2, 2=4, 3=8, 4=16, 5=32, 6=64, 7=128, 8=256, 9=512, 10=1024
export const LEVELS = [
    {
        level: 1,
        boardWidth: 6,
        boardHeight: 6,
        maxMoves: 10,
        blockedTiles: [{ row: 3 }, { row: 4 }, { row: 5 }],
        goals: [{ tileValue: 5, target: 1, current: 0, goalType: "created" }], // 32
        spawnableTiles: [1, 2, 3], // 2, 4, 8
        // showGoalDialog: "created", // First level with created goals
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
        title: "Current Goal",
        maxMoves: 30,
        blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
        goals: [{ tileValue: 5, target: 16, current: 0, goalType: "current" }], // 32
        showGoalDialog: "current", // First level with current goals
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
        title: "Blocked Tile Goal",
        maxMoves: 60,
        blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
        goals: [
            { tileValue: 10, target: 1, current: 0, goalType: "created" }, // 1024
            { current: 0, goalType: "blocked" },
        ],
        spawnableTiles: [2, 3, 4, 5], // 4, 8, 16, 32
        showGoalDialog: "blocked", // First level with blocked goals
    },
    {
        level: 12,
        title: "Blocked V",
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
        level: 13,
        maxMoves: 30,
        blockedTiles: [{ row: 3 }, { row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
        goals: [{ current: 0, goalType: "blocked" }],
        spawnableTiles: [2, 3, 4, 5], // 4, 8, 16, 32
    },
    {
        level: 14,
        maxMoves: 40,
        blockedTiles: [{ col: 0 }, { col: 1 }, { col: 6 }, { col: 7 }],
        goals: [
            { current: 0, goalType: "blocked" },
            { tileValue: 7, target: 4, current: 0, goalType: "current" }, // 128
        ],
        spawnableTiles: [2, 3, 4], // 4, 8, 16
    },
    {
        level: 15,
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
        level: 16,
        boardWidth: 6,
        boardHeight: 10,
        maxMoves: 20,
        blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }, { row: 8 }, { row: 9 }],
        goals: [{ current: 0, goalType: "blocked" }],
        spawnableTiles: [1, 2, 3], // 2, 4, 8
    },
    {
        level: 17,
        boardWidth: 6,
        boardHeight: 8,
        maxMoves: 20,
        goals: [{ tileValue: 6, target: 12, current: 0, goalType: "current" }], // 64
        spawnableTiles: [2, 3, 4, 5], // 4, 8, 16, 32
    },
    {
        level: 18,
        boardWidth: 6,
        boardHeight: 8,
        maxMoves: 20,
        blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
        goals: [{ tileValue: 6, target: 12, current: 0, goalType: "current" }], // 64
        spawnableTiles: [2, 3, 4, 5], // 4, 8, 16, 32
    },
    {
        level: 19,
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
        level: 20,
        boardHeight: 10,
        maxMoves: 60,
        blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }, { row: 8 }, { row: 9 }],
        goals: [
            { tileValue: 10, target: 1, current: 0, goalType: "created" }, // 1024
            { tileValue: 9, target: 1, current: 0, goalType: "current" }, // 512
        ],
        spawnableTiles: [2, 3, 4, 5], // 4, 8, 16, 32
    },
    {
        level: 21,
        title: "Life-based Goal Tile",
        boardWidth: 6,
        boardHeight: 5,
        maxMoves: 10,
        blockedTiles: [{ row: 4, lifeValue: 8 }],
        goals: [{ goalType: "blocked", current: 0 }],
        spawnableTiles: [1, 2, 3],
        showGoalDialog: "blocked_with_life", // First level with life-based blocked tiles
    },
    {
        level: 22,
        boardWidth: 6,
        boardHeight: 6,
        maxMoves: 15,
        blockedTiles: [
            { row: 4, lifeValue: 8 },
            { row: 5, lifeValue: 8 },
        ],
        goals: [{ goalType: "blocked", current: 0 }],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 23,
        boardWidth: 6,
        boardHeight: 6,
        maxMoves: 20,
        blockedTiles: [
            { row: 4, lifeValue: 8 },
            { row: 5, lifeValue: 16 },
        ],
        goals: [{ goalType: "blocked", current: 0 }],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 24,
        boardWidth: 8,
        boardHeight: 8,
        maxMoves: 30,
        blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6, lifeValue: 16 }, { row: 7, lifeValue: 16 }],
        goals: [{ goalType: "blocked", current: 0 }],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 25,
        boardWidth: 6,
        boardHeight: 8,
        maxMoves: 35,
        blockedTiles: [{ row: 4 }, { row: 5, lifeValue: 8 }, { row: 6, lifeValue: 16 }, { row: 7, lifeValue: 32 }],
        goals: [{ goalType: "blocked", current: 0 }],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 26,
        boardWidth: 6,
        boardHeight: 8,
        maxMoves: 35,
        blockedTiles: [
            { row: 3, lifeValue: 32 },
            { row: 4, lifeValue: 32 },
        ],
        goals: [{ goalType: "blocked", current: 0 }],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 27,
        boardWidth: 8,
        boardHeight: 8,
        maxMoves: 40,
        blockedTiles: [{ row: 4, lifeValue: 32 }, { row: 5, lifeValue: 32 }, { row: 6 }, { row: 7 }],
        goals: [{ goalType: "blocked", current: 0 }],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 28,
        boardWidth: 9,
        boardHeight: 9,
        maxMoves: 40,
        blockedTiles: [
            { row: 4, lifeValue: 16 },
            { row: 5, lifeValue: 16 },
            { row: 6, lifeValue: 16 },
            { row: 7, lifeValue: 16 },
            { row: 8, lifeValue: 16 },
        ],
        goals: [{ goalType: "blocked", current: 0 }],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 29,
        boardWidth: 8,
        boardHeight: 8,
        maxMoves: 40,
        blockedTiles: [
            { row: 4, lifeValue: 16 },
            { row: 5, lifeValue: 16 },
            { row: 6, lifeValue: 16 },
            { row: 7, lifeValue: 16 },
            { row: 8, lifeValue: 16 },
        ],
        goals: [{ goalType: "blocked", current: 0 }],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 30,
        boardWidth: 8,
        boardHeight: 8,
        maxMoves: 40,
        blockedTiles: [
            { row: 4, lifeValue: 16 },
            { row: 5, lifeValue: 16 },
            { row: 6, lifeValue: 16 },
            { row: 7, lifeValue: 16 },
            { row: 7, col: [3, 4], lifeValue: 128 },
        ],
        goals: [{ goalType: "blocked", current: 0 }],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 31,
        title: "Cursed Tiles",
        boardWidth: 6,
        boardHeight: 6,
        maxMoves: 10,
        goals: [
            {
                tileValue: 5, // 32
                target: 1,
                current: 0,
                goalType: "cursed",
                frequency: 0,
                strength: 10,
                implode: false,
            },
        ],
        spawnableTiles: [1, 2, 3, 4],
        showGoalDialog: "cursed", // First level with cursed tiles
    },
    {
        level: 32,
        boardWidth: 6,
        boardHeight: 6,
        maxMoves: 20,
        goals: [
            {
                tileValue: 5, // 32
                target: 3,
                current: 0,
                goalType: "cursed",
                frequency: 0,
                strength: 10,
                implode: false,
            },
        ],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 33,
        boardWidth: 8,
        boardHeight: 8,
        maxMoves: 40,
        goals: [
            {
                tileValue: 5, // 32
                target: 3,
                current: 0,
                goalType: "cursed",
                frequency: 0,
                strength: 10,
                implode: false,
            },
            {
                tileValue: 7, // 128
                target: 1,
                current: 0,
                goalType: "cursed",
                frequency: 0,
                strength: 10,
                implode: false,
            },
        ],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 34,
        boardWidth: 8,
        boardHeight: 8,
        maxMoves: 20,
        goals: [
            {
                tileValue: 5, // 32
                target: 1,
                current: 0,
                goalType: "cursed",
                frequency: 0,
                strength: 10,
                implode: false,
            },
            {
                tileValue: 6, // 64
                target: 1,
                current: 0,
                goalType: "cursed",
                frequency: 0,
                strength: 10,
                implode: false,
            },
        ],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 35,
        boardWidth: 8,
        boardHeight: 8,
        maxMoves: 25,
        goals: [
            {
                tileValue: 6, // 32
                target: 1,
                current: 0,
                goalType: "cursed",
                frequency: 0,
                strength: 4,
                implode: false,
            },
        ],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 36,
        boardWidth: 8,
        boardHeight: 8,
        maxMoves: 30,
        goals: [
            {
                tileValue: 6, // 32
                target: 3,
                current: 0,
                goalType: "cursed",
                frequency: 0,
                strength: 4,
                implode: false,
            },
        ],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 37,
        title: "Cursed Tiles - implode",
        boardWidth: 8,
        boardHeight: 8,
        maxMoves: 20,
        goals: [
            {
                tileValue: 5, // 32
                target: 3,
                current: 0,
                goalType: "cursed",
                frequency: 0,
                strength: 4,
                implode: true,
            },
        ],
        spawnableTiles: [1, 2, 3, 4],
        showGoalDialog: "cursed_implode", // First level with imploding cursed tiles
    },
    {
        level: 38,
        boardWidth: 8,
        boardHeight: 8,
        maxMoves: 25,
        goals: [
            {
                tileValue: 5, // 32
                target: 3,
                current: 0,
                goalType: "cursed",
                frequency: 0,
                strength: 4,
                implode: false,
            },
            {
                tileValue: 6, // 32
                target: 2,
                current: 0,
                goalType: "cursed",
                frequency: 0,
                strength: 6,
                implode: true,
            },
        ],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 39,
        boardWidth: 8,
        boardHeight: 8,
        maxMoves: 30,
        goals: [
            {
                tileValue: 5, // 32
                target: 4,
                current: 0,
                goalType: "cursed",
                frequency: 0,
                strength: 4,
                implode: true,
            },
            {
                tileValue: 6, // 64
                target: 2,
                current: 0,
                goalType: "cursed",
                frequency: 0,
                strength: 4,
                implode: true,
            },
        ],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 40,
        boardWidth: 8,
        boardHeight: 8,
        maxMoves: 45,
        goals: [
            {
                tileValue: 5, // 32
                target: 10,
                current: 0,
                goalType: "cursed",
                frequency: 0,
                strength: 4,
                implode: false,
            },
            {
                tileValue: 7, // 32
                target: 2,
                current: 0,
                goalType: "cursed",
                frequency: 0,
                strength: 4,
                implode: true,
            },
        ],
        spawnableTiles: [1, 2, 3, 4],
    },
];

// Test levels for development and testing
export const TEST_LEVELS = [
    {
        level: 1,
        title: "3-Tile Horizontal",
        boardWidth: 5,
        boardHeight: 5,
        maxMoves: 5,
        boardPreset: [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 6, 6, 6, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
        ],
        goals: [
            { tileValue: 1, target: 1, current: 0, goalType: "created" },
            { tileValue: 7, target: 1, current: 0, goalType: "created" },
        ],
        spawnableTiles: [0],
    },
    {
        level: 2,
        title: "3-Tile Vertical",
        boardWidth: 5,
        boardHeight: 5,
        maxMoves: 5,
        boardPreset: [
            [0, 0, 0, 0, 0],
            [0, 0, 6, 0, 0],
            [0, 0, 6, 0, 0],
            [0, 0, 6, 0, 0],
            [0, 0, 0, 0, 0],
        ],
        goals: [
            { tileValue: 1, target: 1, current: 0, goalType: "created" },
            { tileValue: 7, target: 1, current: 0, goalType: "created" },
        ],
        spawnableTiles: [0],
    },
    {
        level: 3,
        title: "4-Tile Horizontal",
        boardWidth: 6,
        boardHeight: 5,
        maxMoves: 5,
        boardPreset: [
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 6, 6, 6, 6, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
        ],
        goals: [
            { tileValue: 1, target: 1, current: 0, goalType: "created" },
            { tileValue: 7, target: 2, current: 0, goalType: "created" },
        ],
        spawnableTiles: [0],
    },
    {
        level: 4,
        title: "4-Tile Vertical",
        boardWidth: 5,
        boardHeight: 6,
        maxMoves: 5,
        boardPreset: [
            [0, 0, 0, 0, 0],
            [0, 0, 6, 0, 0],
            [0, 0, 6, 0, 0],
            [0, 0, 6, 0, 0],
            [0, 0, 6, 0, 0],
            [0, 0, 0, 0, 0],
        ],
        goals: [
            { tileValue: 1, target: 1, current: 0, goalType: "created" },
            { tileValue: 7, target: 2, current: 0, goalType: "created" },
        ],
        spawnableTiles: [0],
    },
    {
        level: 5,
        title: "4-Tile Block (2x2)",
        boardWidth: 6,
        boardHeight: 6,
        maxMoves: 5,
        boardPreset: [
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 6, 6, 6, 0],
            [0, 0, 6, 6, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
        ],
        goals: [
            { tileValue: 1, target: 1, current: 0, goalType: "created" },
            { tileValue: 7, target: 2, current: 0, goalType: "created" },
        ],
        spawnableTiles: [0],
    },
    {
        level: 6,
        title: "5-Tile Horizontal",
        boardWidth: 7,
        boardHeight: 5,
        maxMoves: 5,
        boardPreset: [
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 6, 6, 6, 6, 6, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
        ],
        goals: [
            { tileValue: 1, target: 1, current: 0, goalType: "created" },
            { tileValue: 8, target: 1, current: 0, goalType: "created" },
        ],
        spawnableTiles: [0],
    },
    {
        level: 7,
        title: "5-Tile Vertical",
        boardWidth: 5,
        boardHeight: 7,
        maxMoves: 5,
        boardPreset: [
            [0, 0, 0, 0, 0],
            [0, 0, 6, 0, 0],
            [0, 0, 6, 0, 0],
            [0, 0, 6, 0, 0],
            [0, 0, 6, 0, 0],
            [0, 0, 6, 0, 0],
            [0, 0, 0, 0, 0],
        ],
        goals: [
            { tileValue: 1, target: 1, current: 0, goalType: "created" },
            { tileValue: 8, target: 1, current: 0, goalType: "created" },
        ],
        spawnableTiles: [0],
    },
    {
        level: 8,
        title: "L-Formation",
        boardWidth: 6,
        boardHeight: 6,
        maxMoves: 5,
        boardPreset: [
            [0, 0, 0, 0, 0, 0],
            [0, 0, 6, 0, 0, 0],
            [0, 0, 6, 0, 0, 0],
            [0, 0, 6, 6, 6, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
        ],
        goals: [
            { tileValue: 1, target: 1, current: 0, goalType: "created" },
            { tileValue: 8, target: 1, current: 0, goalType: "created" },
        ],
        spawnableTiles: [0],
    },
    {
        level: 9,
        title: "T-Formation",
        boardWidth: 5,
        boardHeight: 6,
        maxMoves: 5,
        boardPreset: [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 6, 6, 6, 0],
            [0, 0, 6, 0, 0],
            [0, 0, 6, 0, 0],
            [0, 0, 0, 0, 0],
        ],
        goals: [
            { tileValue: 1, target: 1, current: 0, goalType: "created" },
            { tileValue: 8, target: 1, current: 0, goalType: "created" },
        ],
        spawnableTiles: [0],
    },
    {
        level: 10,
        title: "Power Tile Match",
        boardWidth: 5,
        boardHeight: 5,
        maxMoves: 5,
        boardPreset: [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, "5B", 6, 6, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
        ],
        goals: [
            { tileValue: 1, target: 1, current: 0, goalType: "created" },
            { tileValue: 7, target: 1, current: 0, goalType: "created" },
        ],
        spawnableTiles: [0],
    },
    {
        level: 11,
        title: "Golden Tile Match",
        boardWidth: 5,
        boardHeight: 5,
        maxMoves: 5,
        boardPreset: [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, "6G", 6, 6, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
        ],
        goals: [
            { tileValue: 1, target: 1, current: 0, goalType: "created" },
            { tileValue: 7, target: 1, current: 0, goalType: "created" },
            { tileValue: 8, target: 1, current: 0, goalType: "created" },
        ],
        spawnableTiles: [0],
    },
    {
        level: 12,
        title: "Joker Tile",
        boardWidth: 5,
        boardHeight: 5,
        maxMoves: 5,
        boardPreset: [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, "J", 6, 6, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
        ],
        goals: [
            { tileValue: 1, target: 1, current: 0, goalType: "created" },
            { tileValue: 7, target: 1, current: 0, goalType: "created" },
        ],
        spawnableTiles: [0],
    },
    {
        level: 13,
        title: "Free Swap Tile",
        boardWidth: 5,
        boardHeight: 5,
        maxMoves: 5,
        boardPreset: [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, "6S", 7, 7, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
        ],
        goals: [{ tileValue: 1, target: 1, current: 0, goalType: "created" }],
        spawnableTiles: [0],
    },
    {
        level: 14,
        title: "Sticky Free Swap Tile",
        boardWidth: 5,
        boardHeight: 5,
        maxMoves: 5,
        boardPreset: [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, "7K", 7, 7, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
        ],
        goals: [{ tileValue: 1, target: 1, current: 0, goalType: "created" }],
        spawnableTiles: [0],
    },
    {
        level: 15,
        title: "Life-based Goal Tile",
        boardWidth: 5,
        boardHeight: 5,
        maxMoves: 10,
        blockedTiles: [
            { row: 4, lifeValue: 16 }, // Single blocked tile
        ],
        goals: [{ goalType: "blocked", current: 0 }],
        spawnableTiles: [1, 2, 3],
    },
    {
        level: 16,
        title: "Cursed Tiles - Disappear",
        boardWidth: 6,
        boardHeight: 6,
        maxMoves: 15,
        goals: [
            {
                tileValue: 5, // 32
                target: 2, // Merge 3 cursed 32s successfully
                current: 0,
                goalType: "cursed",
                frequency: 0, // Every 2nd tile of value 32 becomes cursed
                strength: 5, // Player has 5 moves to merge it
                implode: false, // Just disappears
            },
            {
                tileValue: 8, // 32
                target: 1, // Merge 3 cursed 32s successfully
                current: 0,
                goalType: "created",
            },
        ],
        spawnableTiles: [1, 2, 3, 4], // 2, 4, 8, 16
    },
    {
        level: 17,
        title: "Cursed Tiles - Implode",
        boardWidth: 6,
        boardHeight: 6,
        maxMoves: 20,
        goals: [
            {
                tileValue: 5, // 16
                target: 2, // Merge 2 cursed 16s successfully
                current: 0,
                goalType: "cursed",
                frequency: 1, // Every 3rd tile of value 16 becomes cursed
                strength: 2, // Player has 4 moves to merge it
                implode: true, // Sucks in adjacent tiles when it expires
            },
        ],
        spawnableTiles: [1, 2, 3, 4], // 2, 4, 8
    },
    {
        level: 18,
        title: "Font-Size",
        boardWidth: 5,
        boardHeight: 6,
        maxMoves: 5,
        boardPreset: [
            [1, 2, 3, 4, 5],
            [6, 7, 8, 9, 10],
        ],
        goals: [{ tileValue: 1, target: 1, current: 0, goalType: "created" }],
        spawnableTiles: [0],
    },
];
