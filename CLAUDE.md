# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Match 2048 is a browser-based puzzle game combining match-3 mechanics with 2048-style tile merging. Players swap adjacent tiles to create matches of 3+ identical numbers, merging into higher-value tiles. Each level has specific tile goals within limited moves. Features include power-ups, blocked/cursed tiles, configurable board sizes, a hint system, streaks, hearts/coins economy, and a home screen between levels. PWA-enabled with service worker.

## Architecture

Vanilla JavaScript SPA using ES6 modules, no build process or dependencies:

- `index.html` - Main HTML structure with game UI, home screen, and dialogs
- `style.css` - Root CSS entry point
- `styles/game.css` - Game screen styles (board, tiles, animations, dialogs)
- `styles/home.css` - Home screen styles (hearts, coins, streaks, shop)
- `src/` - Modular JavaScript source files
- `sw.js` - Service worker (cache `match-2048-v0.4.0`)
- `manifest.json` - PWA manifest (standalone, portrait)
- `levelBuilder/` - Node.js CLI tool for analyzing/generating level configs (dev only)
- `assets/` - Static assets (logo, etc.)

### Module Structure

#### Core Game Logic

**`config.js`** - Game constants and level definitions
- `TILE_TYPE`, `SPECIAL_TILE_TYPES`, `FORMATION_TYPES`, `FEATURE_KEYS` constants
- Multiple `LEVEL_CONFIGS` sets (keyed arrays), `DEFAULT_LEVEL`, `SUPER_STREAK_THRESHOLD`
- Special tile types: joker, power, golden, free_swap, freeswap_horizontal/vertical, hammer, halver, teleport, wild_teleport, plus, sticky_freeswap, random_powerup

**`board.js`** - Board state and generation
- `createBoard()` - Generates initial board without matches, places blocked tiles
- `getRandomTileValue()` - Random tile from spawnable values
- `canMatch()` - Power tile matching logic

**`tile-helpers.js`** - Tile object utilities
- Creation: `createTile()`, `createBlockedTile()`, `createJokerTile()`, `createBlockedWithLifeTile()`, `createCursedTile()`, `createWildTeleportTile()`
- Type checks: `isBlocked()`, `isJoker()`, `isNormal()`, `isCursed()`, `isRectangularBlocked()`, `isBlockedMovable()`, `isBlockedWithMergeCount()`, plus checks for all special tile types
- `getDisplayValue()`, `findBestJokerValue()`, `getFontSize()`

**`match-detector.js`** - Match finding logic
- `findMatches()` with priority: 5-line > T > L > 4-line > Block > 3-line
- Formation detection: `checkTFormation()`, `checkLFormation()`, `checkBlockFormation()`
- Supports new tile types (cursed, wild_teleport, plus)

**`merge-processor.js`** - Match processing and merging
- `processMatches()`, `createMergedTiles()`, `determineSpecialTilePosition()`
- `unblockAdjacentTiles()` - Clears blocked tiles near matches
- Handles all tile type variants

**`gravity.js`** - Pure headless gravity logic (no DOM)
- `applyGravity(game)` - Drops tiles, spawns new ones, handles rectangular blocked tiles as section dividers
- Shared by both `animator.js` (visual) and `simulation.js` (headless)

**`simulation.js`** - Headless game simulation for move evaluation
- `simulateMove(game, { row1, col1, row2, col2 })` - Deep-clones board, runs full match→merge→gravity cascade without DOM
- Returns `{ valid, newBoard, scoreDelta, goalProgress, cascades }`

**`hint-system.js`** - Best swap finder with scoring
- `findBestSwap(game)` - Evaluates all valid swaps, scores by formation type, goal progress, blocked tile clearing
- `getMatchTilesForSwap()` - Used during drag preview to show matching tiles

**`serializer.js`** - Board serialization/deserialization
- Tile notation: `B` (blocked), `BM` (blocked with merge), `J` (joker), `JT` (joker type), `2S` (sticky), `2K` (cursed), `2P` (power), `2C5` (cursed with timer)
- `serializeBoard()`/`deserializeBoard()` - 2D array ↔ string format
- `parsePresetArray()` - Converts config presets to tile objects

#### UI & Rendering

**`renderer.js`** - DOM rendering
- `renderBoard()` - Creates DOM elements for all tile types including rectangular blocked (CSS Grid `grid-area`)
- `renderGoals()`, `renderBoardUpgrades()`, `renderPowerUpRewards()`, `renderHintHighlight()`
- `updateMovesDisplay()`, `updateGoalDisplay()`

**`animator.js`** - Animation coordination
- `animateSwap()`/`animateRevert()`, `animateMerges()`, `dropGems()`, `animateUnblocking()`
- Uses `applyGravity` from `gravity.js`

**`input-handler.js`** - User input processing
- Touch/mouse drag-to-swap with preview
- Joker activation by tap, free swap handling
- Tutorial-aware input restrictions

**`components/stroked-text.js`** - `<stroked-text>` web component
- Renders text with SVG stroke outline, emoji fallback via canvas

#### Game Systems

**`power-ups.js`** - All power-up logic (extracted from game.js)
- Three types: hammer (remove), halve (halve value), wildcard (convert to joker)
- Persistent + transient power-up counts, slot unlock gating
- `grantFormationPowerUp()` - Rewards for L/T/line_5 formations
- In-game power-up shop

**`goal-tracker.js`** - Goal and level progression
- `checkLevelComplete()` - Victory/game over detection
- `updateTileCounts()`, `updateBlockedTileGoals()`
- `decrementCursedTileTimers()` - Cursed tile countdown
- `nextLevel()`, `restartLevel()` - Level navigation with streak/super-streak

**`goal-dialogs.js`** - One-time intro dialogs for new goal types and feature unlocks
- `showGoalDialogsSequence()`, `showFeatureUnlockDialog()`

**`formation-tutorial.js`** - One-time formation tutorials on first creation
- `getPendingFormationTutorials()`, `showFormationTutorialDialog()`
- `highlightMergeTiles()`/`highlightBlockedTiles()` - Drag preview highlighting

**`tutorial.js`** - FTUX step-by-step tutorial system
- Driven by `tutorialSwaps` in level configs: swap steps, tap steps, power-up steps
- `initTutorial()`, `isValidTutorialSwap()`, `advanceTutorialStep()`
- Animated hand overlay and hint text

**`home-screen.js`** - Home screen between levels
- Hearts system with regen timer, coins, streaks, super-streaks (SVG circular progress)
- Feature unlock dialogs, shop

**`settings-dialog.js`** - Settings and info dialog (extracted from game.js)
- Level select, special tile rewards config, hints toggle, power-up settings

#### Infrastructure

**`game.js`** - Main `Match3Game` class (central orchestrator)
- Manages game state: board, score, moves, power-ups, hearts, coins, streaks, tutorial state, match stats
- Delegates to all other modules
- Slimmed down after extracting power-ups, settings, and home screen

**`main.js`** - Entry point
- Service worker registration/unregistration, version checking
- Initializes game and home screen, keyboard shortcuts (n/b for level nav)

**`storage.js`** - LocalStorage persistence (keys prefixed "match2048_")
- Core: level, score, numberBase
- Economy: hearts, coins, lastRegenTime, streaks, superStreak
- Power-ups: powerUpCounts (persistent/transient split)
- Settings: hints, hintTimeout, allowNonMatchingSwaps, formationPowerUpRewards, persistentPowerUps, selectedPowerUps
- Dialogs: shownGoalDialogs, shownFormationTutorials, unlockedFeatures
- User: userId (UUID), version

**`tracker.js`** - Analytics event tracking
- `track()` - POSTs to analytics endpoint; skipped on localhost
- `trackLevelSolved()`, `trackLevelLost()` with detailed game data

**`version.js`** - `APP_VERSION = "1.0.0"`

### Core Game Systems

**Board Management** (`board.js`): Configurable board sizes (6x6 to 10x10), 2D array, prevents initial matches, supports blocked/rectangular blocked tiles

**Match Detection** (`match-detector.js`): Hierarchical matching prioritizing special formations over regular 3+ matches

**Animation System** (`animator.js`): Coordinated CSS transitions/timeouts for swaps, merges, drops

**Gravity** (`gravity.js`): Shared pure logic for tile dropping, used by both visual and simulation paths

**Level Progression** (`config.js`): Multiple level config sets with configurable everything

**Power-up System** (`power-ups.js`): Three power-ups with persistent/transient counts, formation rewards, shop purchases

**Hint System** (`hint-system.js` + `simulation.js`): Evaluates all possible swaps headlessly, scores by formation type and goal progress

**Tutorial System** (`tutorial.js` + `formation-tutorial.js`): FTUX guided swaps and one-time formation explanations

**Economy** (`home-screen.js` + `storage.js`): Hearts with regen timer, coins, streaks, super-streaks, feature unlocks

**Persistence** (`storage.js`): Comprehensive localStorage for all game state, settings, and progress

### Game Flow

1. **Home Screen** (`home-screen.js`): Hearts check, streak display, feature unlocks, shop
2. **Input Handling** (`input-handler.js`): Drag-to-swap with tutorial awareness and hint preview
3. **Match Processing** (`match-detector.js`): Formation detection with priority system
4. **Tile Merging** (`merge-processor.js`): Formation-dependent merge rules (T/L → 4x, Block → 2 tiles at 2x, Regular → 2x)
5. **Gravity** (`gravity.js` → `animator.js`): Tile dropping with cascading matches
6. **Power-up Effects** (`power-ups.js`): Hammer, halve, wildcard with formation rewards
7. **Goal Checking** (`goal-tracker.js`): Real-time progress, cursed tile timers, completion detection
8. **Level Complete** (`goal-tracker.js` → `home-screen.js`): Streak updates, analytics, return to home

## Key Implementation Details

- **Tile Values**: Powers of 2 from 2 to 2048+ (or powers of 3 in settings)
- **Tile Types**: normal, blocked, blocked_with_life, blocked_with_merge_count, rectangular_blocked, cursed, joker
- **Board Sizes**: 6x6 to 10x10 depending on level
- **Special Formations**: T/L shapes (5 tiles → 1 at 4x), Block (4 tiles → 2 at 2x)
- **Special Tiles**: joker, power, golden, free_swap (+ horizontal/vertical), hammer, halver, teleport, wild_teleport, plus, sticky_freeswap, random_powerup
- **Power-ups**: Hammer (remove), Halver (halve value), Wildcard (convert to joker) — persistent + transient counts
- **Goal Types**: "created" (cumulative), "current" (on board), "blocked" (cleared)
- **Economy**: Hearts (regen over time), coins, streaks, super-streaks with feature unlock gates
- **Animation States**: CSS classes for falling, sliding, merge-target, etc.
- **Responsive Design**: `clamp()` for scalable UI
- **Touch Support**: Full touch/swipe with preventDefault
- **PWA**: Service worker caching, manifest for standalone install

## Code Conventions

- ES6 modules with explicit imports/exports
- Class-based architecture in `game.js`, functional modules elsewhere
- Module functions receive `game` instance as parameter for state access
- CSS Grid and Flexbox throughout
- Animation timing via setTimeout/CSS transitions
- localStorage keys prefixed with "match2048_"
- Vanilla JavaScript DOM APIs only
- `<stroked-text>` web component for styled text

## User Notes

- Do not start any server
- Do not call "open index.html"
- I will test everything manually
- You do not have to add :hover and :active css modifier, since this is a mobile-first game
