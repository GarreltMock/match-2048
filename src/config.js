// Constants and configuration for Match 2048 game
export const FEATURE_KEYS = {
    HAMMER: "power_hammer",
    HALVE: "power_halve",
    SWAP: "power_swap",
    STREAK: "streak",
    BOARD_UPGRADES: "board_upgrades",
    SUPER_STREAK: "super_streak",
};

export const TILE_TYPE = {
    NORMAL: "normal",
    BLOCKED: "blocked",
    BLOCKED_WITH_LIFE: "blocked_with_life",
    BLOCKED_MOVABLE: "blocked_movable",
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
    FREESWAP_HORIZONTAL: "freeswap_horizontal",
    FREESWAP_VERTICAL: "freeswap_vertical",
    HAMMER: "hammer",
    HALVER: "halver",
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

export const SUPER_STREAK_THRESHOLD = 5;

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
        // 4: "created", // First level with created goals
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
    {
        level: 41,
        title: "Board Upgrades",
        boardWidth: 8,
        boardHeight: 8,
        maxMoves: 30,
        boardUpgrades: [6, 8], // Upgrade when creating 32 and 256
        unlockFeature: "board_upgrades", // First level with board upgrades
        goals: [
            { tileValue: 9, target: 1, current: 0, goalType: "created" }, // 512
            { tileValue: 7, target: 2, current: 0, goalType: "created" }, // 128
        ],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 42,
        maxMoves: 30,
        boardUpgrades: [6, 7, 8],
        blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
        goals: [
            { tileValue: 10, target: 1, current: 0, goalType: "created" }, // 1024
            { current: 0, goalType: "blocked" },
        ],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 43,
        boardWidth: 9,
        maxMoves: 35,
        blockedTiles: [
            { row: 4, col: 0 },
            { row: 4, col: 8 },
            { row: 5, col: [0, 1, 7, 8] },
            { row: 6, col: [0, 1, 2, 6, 7, 8] },
            { row: 7, col: [0, 1, 2, 3, 5, 6, 7, 8] },
            { row: 8 },
        ],
        boardUpgrades: [6, 8],
        goals: [
            { tileValue: 9, target: 2, current: 0, goalType: "created" }, // 512
            { tileValue: 8, target: 4, current: 0, goalType: "current" }, // 256
        ],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 44,
        maxMoves: 20,
        blockedTiles: [{ col: 0 }, { col: 1 }, { col: 6 }, { col: 7 }],
        boardUpgrades: [6],
        goals: [
            { current: 0, goalType: "blocked" },
            { tileValue: 7, target: 4, current: 0, goalType: "current" }, // 128
        ],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 45,
        maxMoves: 35,
        boardHeight: 10,
        boardUpgrades: [7, 8, 9],
        blockedTiles: [{ row: 3 }, { row: 4 }, { row: 8 }, { row: 9 }],
        goals: [
            { tileValue: 9, target: 1, current: 0, goalType: "created" }, // 512
            { tileValue: 8, target: 10, current: 0, goalType: "created" }, // 256
        ],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 46,
        boardHeight: 10,
        maxMoves: 35,
        blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }, { row: 8 }, { row: 9 }],
        boardUpgrades: [6, 7, 8],
        goals: [
            { tileValue: 10, target: 1, current: 0, goalType: "created" }, // 1024
            { tileValue: 9, target: 5, current: 0, goalType: "created" }, // 512
        ],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 47,
        boardWidth: 8,
        boardHeight: 8,
        maxMoves: 35,
        boardUpgrades: [6, 7],
        blockedTiles: [
            { row: 4, lifeValue: 32 },
            { row: 5, lifeValue: 32 },
            { row: 6, lifeValue: 64 },
            { row: 7, lifeValue: 128 },
        ],
        goals: [{ goalType: "blocked", current: 0 }],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 48,
        boardWidth: 9,
        boardHeight: 9,
        maxMoves: 30,
        boardUpgrades: [6, 7],
        blockedTiles: [
            { row: 4, lifeValue: 8 },
            { row: 5, lifeValue: 16 },
            { row: 6, lifeValue: 32 },
            { row: 7, lifeValue: 64 },
            { row: 8, lifeValue: 128 },
        ],
        goals: [{ goalType: "blocked", current: 0 }],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 49,
        boardWidth: 8,
        boardHeight: 8,
        maxMoves: 30,
        boardUpgrades: [6, 7, 8],
        blockedTiles: [
            { row: 4, lifeValue: 16 },
            { row: 5, lifeValue: 16 },
            { row: 6, lifeValue: 32 },
            { row: 7, lifeValue: 32 },
            { row: 7, col: [3, 4], lifeValue: 1024 },
        ],
        goals: [{ goalType: "blocked", current: 0 }],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 50,
        boardWidth: 8,
        boardHeight: 8,
        maxMoves: 45,
        blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
        boardUpgrades: [7, 8, 9],
        goals: [
            { tileValue: 11, target: 1, current: 0, goalType: "created" }, // 1024
            { goalType: "blocked", current: 0 },
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
            [0, 0, 6, 0, 0],
            [0, 6, 0, 6, 0],
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
            [0, 6, 0, 0, 0],
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
            [0, 0, 6, 0, 0, 0],
            [0, 6, 0, 6, 6, 0],
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
            [0, 6, 0, 0, 0],
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
            [0, 0, 0, 6, 0, 0],
            [0, 0, 6, 0, 6, 0],
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
            [0, 0, 0, 6, 0, 0, 0],
            [0, 6, 6, 0, 6, 6, 0],
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
            [0, 6, 0, 0, 0],
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
            [0, 0, 0, 6, 6, 0],
            [0, 0, 6, 0, 0, 0],
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
        boardHeight: 5,
        maxMoves: 5,
        boardPreset: [
            [0, 0, 6, 0, 0],
            [0, 6, 0, 6, 6],
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
            [0, "J", 6, 5, 0],
            [0, 6, 5, 6, 0],
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
    {
        level: 19,
        title: "Next Level State",
        boardWidth: 5,
        boardHeight: 5,
        maxMoves: 10,
        boardPreset: [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 2, 2, 2, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
        ],
        goals: [{ tileValue: 3, target: 1, current: 0, goalType: "created" }], // 32
        spawnableTiles: [0], // 2, 4, 8
    },
    {
        level: 20,
        title: "Loss Level State",
        boardWidth: 5,
        boardHeight: 5,
        maxMoves: 1,
        boardPreset: [
            [0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 1, 0, 1, 0],
            [0, 0, 0, 0, 0],
            [0, 5, 0, 0, 0],
        ],
        goals: [{ tileValue: 4, target: 10, current: 0, goalType: "created" }], // 32
        spawnableTiles: [0], // 2, 4, 8
    },
    {
        level: 21,
        title: "Pending Swap Test",
        boardWidth: 5,
        boardHeight: 9,
        maxMoves: 10,
        boardPreset: [[], [], [], [], [], [0, 0, 0, 0, 0], [0, 1, 2, 1, 0], [0, 0, 0, 0, 0], [1, 2, 1, 1, 0]],
        goals: [{ tileValue: 4, target: 10, current: 0, goalType: "created" }], // 32
        spawnableTiles: [1, 2, 3],
    },
    {
        level: 22,
        title: "Pending Swap Test 2",
        boardWidth: 5,
        boardHeight: 9,
        maxMoves: 10,
        boardPreset: [[], [], [], [], [], [], [], [, 5, 6, 5, 5], [1, 1, 1, 0, 0]],
        goals: [{ tileValue: 4, target: 10, current: 0, goalType: "created" }], // 32
        spawnableTiles: [1, 2, 3],
    },
    {
        level: 23,
        title: "All Tiles",
        boardWidth: 6,
        boardHeight: 2,
        maxMoves: 10,
        boardPreset: [
            [1, 2, 3, 4, 5, 6],
            [7, 8, 9, 10, 11],
        ],
        goals: [{ tileValue: 4, target: 10, current: 0, goalType: "created" }], // 32
        spawnableTiles: [0],
    },
    {
        level: 24,
        title: "Score Goal",
        boardWidth: 5,
        boardHeight: 5,
        maxMoves: 10,
        boardUpgrades: [5, 6],
        // boardPreset: [
        //     [0, 0, 0, 0, 0],
        //     [0, 0, 0, 0, 0],
        //     [0, 2, 2, 2, 0],
        //     [0, 0, 0, 0, 0],
        //     [0, 0, 0, 0, 0],
        // ],
        goals: [
            { goalType: "score", target: 10, current: 0 },
            { tileValue: 4, target: 10, current: 0, goalType: "created" },
            { tileValue: 6, target: 2, current: 0, goalType: "created" },
        ],
        spawnableTiles: [1, 2, 3, 4], //[0, 0, 0],
        showGoalDialog: "score", // First level with score goals
    },
    {
        level: 25,
        title: "Blocked Default Tiles",
        maxMoves: 10,
        boardHeight: 10,
        blockedTiles: [{ row: 3 }, { row: 4 }, { row: 8 }, { row: 9 }],
        goals: [{ current: 0, goalType: "blocked" }],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 26,
        title: "Blocked Immovable Tiles",
        maxMoves: 10,
        boardHeight: 10,
        blockedTiles: [{ row: 3, movable: false }, { row: 4, movable: false }, { row: 8 }, { row: 9 }],
        goals: [{ current: 0, goalType: "blocked" }],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 27,
        title: "Blocked Movable Tiles",
        maxMoves: 10,
        boardHeight: 10,
        blockedTiles: [{ row: 3, movable: true }, { row: 4, movable: true }, { row: 8 }, { row: 9 }],
        goals: [{ current: 0, goalType: "blocked" }],
        spawnableTiles: [1, 2, 3, 4],
    },
    {
        level: 28,
        title: "Blocked Area",
        boardWidth: 6,
        boardHeight: 6,
        maxMoves: 10,
        goals: [{ goalType: "blocked", current: 0 }],
        blockedTiles: [{ row: 3, col: 2, width: 2, height: 3 }],
        spawnableTiles: [1, 2, 3, 4], //[0, 0, 0],
    },
    {
        level: 29,
        title: "Blocked Area with Life",
        boardWidth: 6,
        boardHeight: 6,
        maxMoves: 10,
        goals: [{ goalType: "blocked", current: 0 }],
        blockedTiles: [{ row: 1, col: 2, width: 2, height: 2, lifeValue: 124 }],
        spawnableTiles: [1, 2, 3, 4], //[0, 0, 0],
    },
    {
        level: 30,
        title: "Tutorial Swap",
        boardWidth: 5,
        boardHeight: 5,
        maxMoves: 10,
        boardPreset: [[], [, , 5, ,], [, 5, , 5], [], []],
        goals: [{ tileValue: 5, target: 1, current: 0, goalType: "created" }],
        spawnableTiles: [1, 2, 3], //[0, 0, 0],
        tutorialSwaps: [
            {
                from: { row: 1, col: 2 },
                to: { row: 2, col: 2 },
                text: "Swap these two tiles to create your first match!",
            },
        ],
    },
    {
        level: 31,
        title: "Tutorial Power-Up - Hammer",
        boardWidth: 5,
        boardHeight: 5,
        maxMoves: 10,
        boardPreset: [[, , 5, ,], [, 5, 6, 5], [, , 5, ,], [], []],
        goals: [{ tileValue: 6, target: 1, current: 0, goalType: "created" }],
        spawnableTiles: [1, 2, 3],
        tutorialSwaps: [
            {
                powerUp: {
                    type: "hammer",
                    target: { row: 1, col: 2 },
                },
                text: "Use the hammer power-up to remove this tile!",
            },
        ],
    },
    {
        level: 32,
        title: "Tutorial Power-Up - Halve",
        boardWidth: 5,
        boardHeight: 5,
        maxMoves: 10,
        boardPreset: [[, , 5, ,], [, 5, 7, 5], [, , 5, ,], [], []],
        goals: [{ tileValue: 6, target: 1, current: 0, goalType: "created" }],
        spawnableTiles: [1, 2, 3],
        tutorialSwaps: [
            {
                powerUp: {
                    type: "halve",
                    target: { row: 1, col: 2 },
                },
                text: "Use the halve power-up to reduce this tile's value!",
            },
        ],
    },
    {
        level: 33,
        title: "Tutorial Power-Up - Swap",
        boardWidth: 5,
        boardHeight: 5,
        maxMoves: 10,
        boardPreset: [[, , 5, ,], [5, , , , 5], [, , 5, ,], [], []],
        goals: [{ tileValue: 6, target: 1, current: 0, goalType: "created" }],
        spawnableTiles: [1, 2, 3],
        tutorialSwaps: [
            {
                powerUp: {
                    type: "swap",
                    target: { row: 1, col: 0 },
                },
                text: "First, activate the swap power-up, then tap this tile...",
            },
            {
                from: { row: 1, col: 0 },
                to: { row: 1, col: 2 },
                text: "...now drag it here to swap with a distant tile",
            },
        ],
    },
];

export const NEW_LEVELS = [
    {
        level: 1,
        title: "Tile Goal",
        boardWidth: 5,
        boardHeight: 4,
        boardPreset: [
            [1, 2, 1, 1, 3],
            [3, 1, 4, 3, 2],
            [2, 4, 1, 4, 2],
            [3, 2, 3, 2, 1],
            // [1, 2, 1, 1, 3],
        ],
        maxMoves: 10,
        goals: [{ tileValue: 5, target: 1, current: 0, goalType: "created" }],
        spawnableTiles: [1, 2, 3],
        showGoalDialog: "created",
        tutorialSwaps: [
            {
                from: { row: 1, col: 2 },
                to: { row: 2, col: 2 },
                text: "Swap these two tiles to create your first merge",
            },
        ],
    },
    {
        level: 2,
        title: "4-Tile Merge",
        boardWidth: 5,
        boardHeight: 5,
        boardPreset: [
            [3, 1, 4, 3, 2],
            [2, 4, 1, 4, 4],
            [1, 2, 3, 1, 3],
            [1, 2, 1, 5, 3],
            [3, 1, 5, 5, 1],
        ],
        maxMoves: 10,
        goals: [{ tileValue: 6, target: 1, current: 0, goalType: "created" }],
        spawnableTiles: [1, 2, 3],
        tutorialSwaps: [
            {
                from: { row: 0, col: 2 },
                to: { row: 1, col: 2 },
                text: "Create a 4-tile line merge",
            },
            {
                from: { row: 1, col: 2 },
                to: { row: 2, col: 2 },
                text: "You can move this in the shown direction without a valid merge",
            },
            {
                from: { row: 2, col: 2 },
                to: { row: 3, col: 2 },
                text: "You can also create a 2x2 block merge",
            },
        ],
    },
    {
        level: 3,
        title: "L and T Merge",
        boardWidth: 5,
        boardHeight: 5,
        boardPreset: [
            [1, 4, 3, 2, 3],
            [4, 2, 4, 1, 2],
            [3, 4, 6, 3, 1],
            [2, 4, 6, 2, 1],
            [1, 5, 5, 6, 6],
        ],
        maxMoves: 10,
        goals: [{ tileValue: 8, target: 1, current: 0, goalType: "created" }],
        tutorialSwaps: [
            {
                from: { row: 0, col: 1 },
                to: { row: 1, col: 1 },
                text: "A T-Merge creates an even higher tile",
            },
            {
                from: { row: 3, col: 1 },
                to: { row: 4, col: 1 },
                text: "You can move this in ANY direction without a valid merge",
            },
            {
                from: { row: 4, col: 1 },
                to: { row: 4, col: 2 },
                text: "You can also create a L-Merge",
            },
        ],
    },
    {
        level: 4,
        title: "5-Tile Line Merge",
        boardWidth: 5,
        boardHeight: 5,
        boardPreset: [
            [1, 3, 1, 3, 2],
            [3, 5, 4, 5, 3],
            [4, 4, 1, 4, 4],
            [2, 1, 2, 3, 1],
            [3, 1, 3, 2, 1],
        ],
        maxMoves: 10,
        goals: [{ tileValue: 6, target: 1, current: 0, goalType: "created" }],
        tutorialSwaps: [
            {
                from: { row: 1, col: 2 },
                to: { row: 2, col: 2 },
                text: "Finally the most valuable merge is a 5-Tile line",
            },
            {
                tap: { row: 2, col: 2 },
                text: "This is a wildcard, which can merge with anything or transform on tap",
            },
        ],
    },
    {
        level: 5,
        boardWidth: 6,
        boardHeight: 6,
        maxMoves: 25,
        goals: [{ tileValue: 6, target: 3, current: 0, goalType: "created" }],
    },
    {
        level: 6,
        boardWidth: 6,
        boardHeight: 6,
        maxMoves: 30,
        goals: [
            { tileValue: 6, target: 3, current: 0, goalType: "created" },
            { tileValue: 7, target: 1, current: 0, goalType: "created" },
        ],
    },
    {
        level: 7,
        title: "Blocked Tile Goal",
        boardWidth: 6,
        boardHeight: 6,
        maxMoves: 20,
        blockedTiles: [{ row: 4 }, { row: 5 }],
        goals: [{ current: 0, goalType: "blocked" }],
        spawnableTiles: [1, 2, 3, 4],
        showGoalDialog: "blocked",
    },
    {
        level: 8,
        maxMoves: 30,
        blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
        goals: [{ current: 0, goalType: "blocked" }],
    },
    {
        level: 9,
        title: "🔨",
        maxMoves: 20,
        boardHeight: 10,
        blockedTiles: [{ row: 3 }, { row: 4 }, { row: 8 }, { row: 9 }],
        goals: [{ current: 0, goalType: "blocked" }],
        unlockFeature: "power_hammer",
    },
    {
        level: 10,
        boardWidth: 9,
        maxMoves: 30,
        blockedTiles: [
            { row: 4, col: 0 },
            { row: 4, col: 8 },
            { row: 5, col: [0, 1, 7, 8] },
            { row: 6, col: [0, 1, 2, 6, 7, 8] },
            { row: 7, col: [0, 1, 2, 3, 5, 6, 7, 8] },
            { row: 8 },
        ],
        goals: [{ current: 0, goalType: "blocked" }],
    },
    {
        level: 11,
        title: "✂️",
        maxMoves: 25,
        blockedTiles: [{ col: 0 }, { col: 1 }, { col: 6 }, { col: 7 }],
        goals: [{ current: 0, goalType: "blocked" }],
        unlockFeature: "power_halve",
    },
    {
        level: 12,
        maxMoves: 28,
        blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
        goals: [
            { current: 0, goalType: "blocked" },
            { tileValue: 6, target: 5, current: 0, goalType: "created" },
        ],
    },
    {
        level: 13,
        title: "🔄",
        maxMoves: 28,
        blockedTiles: [{ row: 3 }, { row: 4 }, { row: 8 }, { row: 9 }],
        goals: [
            { current: 0, goalType: "blocked" },
            { tileValue: 6, target: 5, current: 0, goalType: "created" },
        ],
        unlockFeature: "power_swap",
    },
    {
        level: 14,
        maxMoves: 32,
        blockedTiles: [{ row: 3 }, { row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
        goals: [
            { current: 0, goalType: "blocked" },
            { tileValue: 6, target: 5, current: 0, goalType: "created" },
            { tileValue: 7, target: 3, current: 0, goalType: "created" },
        ],
    },
    {
        level: 15,
        title: "Score Goal",
        boardWidth: 6,
        boardHeight: 6,
        maxMoves: 10,
        blockedTiles: [{ row: 4 }, { row: 5 }],
        goals: [{ goalType: "score", target: 128, current: 0 }],
        showGoalDialog: "score",
    },
    {
        level: 16,
        maxMoves: 15,
        blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
        goals: [{ goalType: "score", target: 512, current: 0 }],
    },
    {
        level: 17,
        title: "🔥 Streak",
        maxMoves: 22,
        blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
        goals: [
            { goalType: "score", target: 2048, current: 0 },
            { tileValue: 7, target: 1, current: 0, goalType: "current" },
        ],
        unlockFeature: "streak",
    },
    {
        level: 17,
        maxMoves: 30,
        boardWidth: 6,
        boardHeight: 10,
        blockedTiles: [{ row: 5 }, { row: 6 }, { row: 7 }, { row: 8 }, { row: 9 }],
        goals: [
            { goalType: "score", target: 2048, current: 0 },
            { goalType: "blocked", current: 0 },
        ],
    },
    {
        level: 17,
        maxMoves: 30,
        boardHeight: 9,
        blockedTiles: [{ row: 6 }, { row: 7 }, { row: 8 }, { col: 0 }, { col: 7 }],
        goals: [
            { goalType: "score", target: 2048, current: 0 },
            { goalType: "blocked", current: 0 },
        ],
    },
    {
        level: 18,
        title: "💸 PoS",
        maxMoves: 28,
        blockedTiles: [{ row: 4 }, { row: 5 }, { row: 6 }, { row: 7 }],
        goals: [
            { goalType: "score", target: 2048, current: 0 },
            { tileValue: 8, target: 1, current: 0, goalType: "current" },
            { goalType: "blocked", current: 0 },
        ],
    },
    {
        level: 19,
        title: "Movable Blocked",
        maxMoves: 16,
        blockedTiles: [
            { row: 0, movable: true },
            { row: 1, movable: true },
            { row: 2, movable: true },
            { row: 3, movable: true },
        ],
        goals: [{ goalType: "blocked", current: 0 }],
        showGoalDialog: "blocked_movable",
    },
    {
        level: 20,
        maxMoves: 20,
        blockedTiles: [
            { row: 1, col: [1, 2, 3, 4, 5, 6], movable: true },
            { row: 2, col: [1, 6], movable: true },
            { row: 3, col: [1, 6], movable: true },
            { row: 4, col: [1, 6], movable: true },
            { row: 5, col: [1, 6], movable: true },
            { row: 6, col: [1, 2, 3, 4, 5, 6], movable: true },
        ],
        goals: [{ current: 0, goalType: "blocked" }],
    },
    {
        level: 21,
        maxMoves: 22,
        blockedTiles: [
            { row: 3, movable: true },
            { row: 4, movable: true },
            { row: 5, movable: true },
            { row: 6, movable: true },
            { row: 7, movable: true },
        ],
        goals: [
            { goalType: "score", target: 1024, current: 0 },
            { current: 0, goalType: "blocked" },
        ],
    },
    {
        level: 22,
        boardHeight: 9,
        maxMoves: 24,
        blockedTiles: [
            { row: 0, movable: true },
            { row: 1, movable: true },
            { row: 2, movable: true },
            { row: 3, movable: true },
            { row: 7, movable: true },
            { row: 8, movable: true },
        ],
        goals: [
            { goalType: "score", target: 1024, current: 0 },
            { current: 0, goalType: "blocked" },
        ],
        spawnableTiles: [1, 2, 3],
    },

    {
        level: 24,
        title: "Lifebased Blocked",
        maxMoves: 38,
        blockedTiles: [
            { row: 5, lifeValue: 8 },
            { row: 6, lifeValue: 16 },
            { row: 7, lifeValue: 32 },
        ],
        goals: [{ goalType: "blocked", current: 0 }],
        showGoalDialog: "blocked_with_life",
    },
    {
        level: 23,
        boardHeight: 6,
        maxMoves: 30,
        blockedTiles: [
            { row: 4, movable: true },
            { row: 5, lifeValue: 32 },
        ],
        goals: [{ goalType: "blocked", current: 0 }],
    },
    {
        level: 25,
        maxMoves: 32,
        blockedTiles: [
            { row: 3, col: [3, 4], lifeValue: 64 },
            { row: 4, col: [3, 4], lifeValue: 64 },
            { row: 2, col: [2, 3, 4, 5], lifeValue: 16 },
            { row: 3, col: [2, 5], lifeValue: 16 },
            { row: 4, col: [2, 5], lifeValue: 16 },
            { row: 5, col: [2, 3, 4, 5], lifeValue: 16 },
        ],
        goals: [
            { goalType: "score", target: 1024, current: 0 },
            { goalType: "blocked", current: 0 },
        ],
    },
    {
        level: 26,
        maxMoves: 38,
        blockedTiles: [
            { row: 0, movable: true },
            { row: 1, movable: true },
            { row: 2, movable: true },
            { row: 6, lifeValue: 8 },
            { row: 7, lifeValue: 32 },
        ],
        goals: [
            { goalType: "score", target: 2048, current: 0 },
            { tileValue: 6, target: 10, current: 0, goalType: "created" },
            { current: 0, goalType: "blocked" },
        ],
    },
    {
        level: 27,
        title: "💸 PoS",
        maxMoves: 32,
        boardWidth: 9,
        blockedTiles: [
            { row: 0, col: [4], lifeValue: 128 },
            { row: 1, col: [4], lifeValue: 128 },
            { row: 2, col: [4], lifeValue: 128 },
            { row: 3, col: [4], lifeValue: 128 },
            { row: 4, col: [4], lifeValue: 128 },
            { row: 5, col: [4], lifeValue: 128 },
            { row: 6, col: [4], lifeValue: 128 },
            { row: 7, col: [4], lifeValue: 128 },

            { row: 0, col: [3, 5], movable: true },
            { row: 1, col: [3, 5], movable: true },
            { row: 2, col: [3, 5], movable: true },
            { row: 3, col: [3, 5], movable: true },
            { row: 4, col: [3, 5], movable: true },
            { row: 5, col: [3, 5], movable: true },
            { row: 6, col: [3, 5], movable: true },
            { row: 7, col: [3, 5], movable: true },
        ],
        goals: [
            { goalType: "score", target: 2048, current: 0 },
            { goalType: "blocked", current: 0 },
        ],
    },
    {
        level: 28,
        title: "Board Upgrades",
        maxMoves: 32,
        boardWidth: 9,
        blockedTiles: [
            { row: 0, col: [4], lifeValue: 128 },
            { row: 1, col: [4], lifeValue: 128 },
            { row: 2, col: [4], lifeValue: 128 },
            { row: 3, col: [4], lifeValue: 128 },
            { row: 4, col: [4], lifeValue: 128 },
            { row: 5, col: [4], lifeValue: 128 },
            { row: 6, col: [4], lifeValue: 128 },
            { row: 7, col: [4], lifeValue: 128 },

            { row: 0, col: [3, 5], movable: true },
            { row: 1, col: [3, 5], movable: true },
            { row: 2, col: [3, 5], movable: true },
            { row: 3, col: [3, 5], movable: true },
            { row: 4, col: [3, 5], movable: true },
            { row: 5, col: [3, 5], movable: true },
            { row: 6, col: [3, 5], movable: true },
            { row: 7, col: [3, 5], movable: true },
        ],
        goals: [
            { goalType: "score", target: 2048, current: 0 },
            { goalType: "blocked", current: 0 },
        ],
        boardUpgrades: [5],
        unlockFeature: "board_upgrades",
    },
    {
        level: 29,
        maxMoves: 28,
        blockedTiles: [
            { row: 3, movable: true },
            { row: 4, movable: true },
            { row: 5, movable: true },
            { row: 6, lifeValue: 256 },
            { row: 7, lifeValue: 512 },
        ],
        goals: [
            { current: 0, goalType: "blocked" },
            { tileValue: 9, target: 1, current: 0, goalType: "created" },
        ],
        boardUpgrades: [6, 8],
    },
    {
        level: 30,
        title: "Super Streak",
        maxMoves: 25,
        blockedTiles: [{ row: 4 }, { row: 5, movable: true }, { row: 6 }, { row: 7, lifeValue: 128 }],
        goals: [{ tileValue: 8, target: 10, current: 0, goalType: "created" }],
        boardUpgrades: [5],
        unlockFeature: "super_streak",
    },
    {
        level: 31,
        maxMoves: 20,
        boardHeight: 9,
        blockedTiles: [{ row: 3, movable: true }, { row: 4, movable: true }, { row: 7 }, { row: 8 }],
        goals: [{ goalType: "score", target: 4096, current: 0 }],
        boardUpgrades: [5, 8],
    },
    {
        level: 32,
        maxMoves: 25,
        boardHeight: 9,
        blockedTiles: [
            { row: 3, movable: true },
            { row: 4, movable: true },
            { row: 5, movable: true },
            { row: 6, movable: true },
            { row: 7, movable: true },
            { row: 8, movable: true },
        ],
        goals: [
            { tileValue: 9, target: 1, current: 0, goalType: "created" },
            { goalType: "blocked", current: 0 },
        ],
        boardUpgrades: [5, 6],
    },
    {
        level: 33,
        maxMoves: 22,
        blockedTiles: [
            { row: 4, lifeValue: 8 },
            { row: 5, lifeValue: 16 },
            { row: 6, lifeValue: 32 },
            { row: 7, lifeValue: 128 },
        ],
        goals: [{ goalType: "blocked", current: 0 }],
        boardUpgrades: [6],
    },
    {
        level: 33,
        maxMoves: 28,
        goals: [{ goalType: "score", target: 8192, current: 0 }],
        boardUpgrades: [7, 8],
    },
    {
        level: 34,
        title: "Blocked Area",
        maxMoves: 15,
        blockedTiles: [
            { row: 2, col: 3, width: 2, height: 2 },
            { row: 4, col: 3, width: 2, height: 2 },
            { row: 6, col: 3, width: 2, height: 2 },
        ],
        goals: [{ goalType: "blocked", current: 0 }],
        showGoalDialog: "blocked_area",
    },
    {
        level: 35,
        maxMoves: 18,
        blockedTiles: [
            { row: 4, col: 0, width: 2, height: 2 },
            { row: 4, col: 2, width: 2, height: 2 },
            { row: 4, col: 4, width: 2, height: 2 },
            { row: 4, col: 6, width: 2, height: 2 },
            { row: 6, col: 0, width: 2, height: 2 },
            { row: 6, col: 2, width: 2, height: 2 },
            { row: 6, col: 4, width: 2, height: 2 },
            { row: 6, col: 6, width: 2, height: 2 },
        ],
        goals: [{ goalType: "blocked", current: 0 }],
        boardUpgrades: [6],
    },
    {
        level: 36,
        maxMoves: 20,
        blockedTiles: [
            { row: 3, movable: true },
            { row: 4, movable: true },
            { row: 5, col: 0, width: 2, height: 3 },
            { row: 5, col: 2, width: 2, height: 3 },
            { row: 5, col: 4, width: 2, height: 3 },
            { row: 5, col: 6, width: 2, height: 3 },
        ],
        goals: [
            { goalType: "score", target: 2048, current: 0 },
            { goalType: "blocked", current: 0 },
        ],
        boardUpgrades: [6],
    },
    {
        level: 37,
        boardWidth: 9,
        maxMoves: 20,
        blockedTiles: [
            { row: 3, col: 0, width: 3, height: 1 },
            { row: 3, col: 3, width: 3, height: 1 },
            { row: 3, col: 6, width: 3, height: 1 },
            { row: 6, col: 0, width: 2, height: 2 },
            { row: 6, col: 2, width: 5, height: 2 },
            { row: 6, col: 7, width: 2, height: 2 },
        ],
        goals: [
            { goalType: "score", target: 2048, current: 0 },
            { goalType: "blocked", current: 0 },
        ],
        boardUpgrades: [6, 7],
    },
    {
        level: 38,
        title: "Lifebased Blocked Area",
        maxMoves: 20,
        blockedTiles: [
            { row: 2, col: 3, width: 2, height: 2, lifeValue: 32 },
            { row: 4, col: 3, width: 2, height: 2, lifeValue: 64 },
            { row: 6, col: 3, width: 2, height: 2, lifeValue: 128 },
        ],
        goals: [{ goalType: "blocked", current: 0 }],
        showGoalDialog: "blocked_area_with_life",
        boardUpgrades: [6],
    },
    {
        level: 39,
        maxMoves: 22,
        blockedTiles: [
            { row: 4, movable: true },
            { row: 5, movable: true },
            { row: 6, col: 0, width: 2, height: 2, lifeValue: 256 },
            { row: 6, col: 2, width: 2, height: 2, lifeValue: 256 },
            { row: 6, col: 6, width: 2, height: 2, lifeValue: 256 },
            { row: 6, col: 4, width: 2, height: 2, lifeValue: 256 },
        ],
        goals: [{ goalType: "blocked", current: 0 }],
        boardUpgrades: [6, 8],
    },
    {
        level: 40,
        maxMoves: 22,
        blockedTiles: [{ row: 4, col: 2, width: 4, height: 4, lifeValue: 512 }],
        goals: [
            { goalType: "blocked", current: 0 },
            { goalType: "created", tileValue: 8, target: 1, current: 0 },
        ],
        boardUpgrades: [6],
    },
    {
        level: 33,
        title: "💸 PoS - God Level",
        maxMoves: 36,
        boardHeight: 10,
        blockedTiles: [
            { row: 5, movable: true },
            { row: 6, movable: true },
            { row: 7, movable: true },
            { row: 8, movable: true },
            { row: 9, movable: true },
            { row: 4, col: 3, width: 2, height: 2, lifeValue: 1024 },
            { row: 6, col: 3, width: 2, height: 2, lifeValue: 1024 },
            { row: 8, col: 3, width: 2, height: 2, lifeValue: 1024 },
        ],
        goals: [{ goalType: "blocked", current: 0 }],
        boardUpgrades: [6, 7, 8],
    },
];

// Level configuration options
export const LEVEL_CONFIGS = [
    {
        key: "new",
        name: "New Levels",
        levels: NEW_LEVELS,
        respectsFeatureLocks: true,
    },
    {
        key: "main",
        name: "Legacy Levels",
        levels: LEVELS,
        respectsFeatureLocks: false,
    },
    {
        key: "test",
        name: "Test Levels",
        levels: TEST_LEVELS,
        respectsFeatureLocks: false,
    },
];

export const DEFAULT_LEVEL = NEW_LEVELS;
