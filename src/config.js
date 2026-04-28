import testLevels from "./level-configs/test-levels.js";
import newLevels from "./level-configs/default-levels.js";

// Constants and configuration for Match 2048 game
export const FEATURE_KEYS = {
    POWER_UP_1: "power_up_1",
    POWER_UP_2: "power_up_2",
    POWER_UP_3: "power_up_3",
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
    FREESWAP: "freeswap",
    STICKY_FREESWAP: "sticky_freeswap",
    FREESWAP_HORIZONTAL: "freeswap_horizontal",
    FREESWAP_VERTICAL: "freeswap_vertical",
    HAMMER: "hammer",
    HALVER: "halver",
    TELEPORT: "teleport",
    WILD_TELEPORT: "wild_teleport",
    PLUS: "plus",
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

// Test levels for development and testing
export const TEST_LEVELS = testLevels;

export const NEW_LEVELS = newLevels;

// Level configuration options
export const LEVEL_CONFIGS = [
    {
        key: "new",
        name: "Default",
        levels: NEW_LEVELS,
        respectsFeatureLocks: true,
    },
    {
        key: "test",
        name: "Test Levels",
        levels: TEST_LEVELS,
        respectsFeatureLocks: false,
    },
];

export const DEFAULT_LEVEL = NEW_LEVELS;
