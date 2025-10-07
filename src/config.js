// Constants and configuration for Match 2048 game

export const TILE_TYPE = {
    NORMAL: "normal",
    BLOCKED: "blocked",
    JOKER: "joker",
};

export const SPECIAL_TILE_TYPES = {
    NONE: "none",
    JOKER: "joker",
    POWER: "power",
    GOLDEN: "golden",
    FREESWAP: "freeswap",
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
];
