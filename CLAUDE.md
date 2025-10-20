# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Match 2048 is a browser-based puzzle game that combines match-3 mechanics with 2048-style tile merging. Players swap adjacent tiles to create matches of 3+ identical numbers, which then merge into higher-value tiles. Each level has specific tile goals that must be achieved within a limited number of moves. The game features power-ups, blocked tiles, and configurable board sizes for increased challenge and strategy.

## Architecture

This is a vanilla JavaScript single-page application using ES6 modules with no build process or dependencies:

- `index.html` - Main HTML structure with game UI and tutorial overlay
- `style.css` - Complete styling with responsive design and animations
- `src/` - Modular JavaScript source files using ES6 modules

### Module Structure

The game is organized into focused, single-responsibility modules:

**`config.js`** - Game constants and level definitions
- `TILE_TYPE`, `SPECIAL_TILE_TYPES`, `FORMATION_TYPES` constants
- All 19 level configurations with goals, board sizes, blocked tiles, and spawnable tiles
- Default tile values and power-up limits

**`storage.js`** - LocalStorage persistence
- Load/save functions for: current level, score, numberBase, showReviewBoard, specialTileConfig
- All keys prefixed with "match2048_"

**`tile-helpers.js`** - Tile object utilities
- Tile creation functions: `createTile()`, `createBlockedTile()`, `createJokerTile()`
- Type checking: `isBlocked()`, `isJoker()`, `isNormal()`, `isTilePowerTile()`, etc.
- Value display conversion with `getDisplayValue()`

**`board.js`** - Board state and generation
- `createBoard()` - Generates initial board without matches, places blocked tiles
- `getRandomTileValue()` - Random tile selection from spawnable values
- `canMatch()` - Power tile matching logic

**`input-handler.js`** - User input processing
- Touch and mouse event handlers
- Drag-to-swap mechanics with preview
- Joker activation by tap
- Free swap tile handling

**`match-detector.js`** - Match finding logic
- `findMatches()` - Main matching algorithm with priority system
- Special formation detection: `checkTFormation()`, `checkLFormation()`, `checkBlockFormation()`
- Joker tile integration during user swaps
- Match priority: 5-line > T > L > 4-line > Block > 3-line

**`merge-processor.js`** - Match processing and merging
- `processMatches()` - Entry point for match processing
- `createMergedTiles()` - Creates merged tiles with special tile types
- `determineSpecialTilePosition()` - Smart positioning based on swap location
- `unblockAdjacentTiles()` - Removes blocked tiles near matches

**`animator.js`** - Animation coordination
- `animateSwap()` / `animateRevert()` - Tile swap animations
- `animateMerges()` - Match merge animations
- `dropGems()` - Gravity physics with cascading matches
- `animateUnblocking()` - Blocked tile removal animations

**`renderer.js`** - DOM rendering
- `renderBoard()` - Creates DOM elements for all tiles with proper classes
- `renderGoals()` - Goal cards with progress indicators
- `updateMovesDisplay()`, `updateGoalDisplay()` - UI updates

**`goal-tracker.js`** - Goal and level progression
- `checkLevelComplete()` - Victory/game over detection
- `updateTileCounts()` - Tracks tiles on board for "current" goals
- `updateBlockedTileGoals()` - Tracks blocked tile clearing progress
- `nextLevel()`, `restartLevel()` - Level navigation

**`game.js`** - Main Match3Game class
- Orchestrates all modules as the central controller
- Manages game state (board, score, moves, power-ups, etc.)
- UI setup methods (dialogs, settings, power-ups)
- Delegates to module functions while maintaining state

**`main.js`** - Entry point
- Initializes game on DOMContentLoaded
- Injects dynamic CSS styles

### Core Game Systems

**Board Management** (`board.js`): Configurable board sizes (6x6 to 8x8) using 2D array, prevents initial matches during board generation, supports blocked tiles

**Match Detection** (`match-detector.js`): Hierarchical matching system prioritizing special formations (T, L, block) over regular 3+ matches

**Animation System** (`animator.js`): Coordinated animations for swaps, merges, and tile drops using CSS transitions and timeouts

**Level Progression** (`config.js`): 19 predefined levels with configurable board sizes, blocked tile patterns, spawnable tiles, and specific tile goals

**Power-up System** (`game.js`): Three power-ups with limited uses per level (hammer, halve, swap) providing strategic advantages

**Blocked Tiles** (`board.js`, `merge-processor.js`): Immovable tiles that create obstacles and are cleared by adjacent matches

**Persistence** (`storage.js`): Uses localStorage for current level, score, and user preferences

### Game Flow

1. **Input Handling** (`input-handler.js`): Touch and mouse drag-to-swap mechanics, power-up activation system
2. **Match Processing** (`match-detector.js`): Complex formation detection with priority system
3. **Tile Merging** (`merge-processor.js`): Different merge rules for formations (T/L → 4x value, Block → 2 tiles at 2x, Regular → 2x value)
4. **Board Physics** (`animator.js`): Gravity-based tile dropping with new tile generation, respects blocked tiles
5. **Power-up Effects** (`game.js`): Strategic tile removal, value halving, and position swapping
6. **Goal Checking** (`goal-tracker.js`): Real-time progress tracking with completion detection based on tiles created (not current board state)

## Key Implementation Details

- **Tile Values**: Powers of 2 from 2 to 2048+ (or powers of 3 in settings)
- **Board Sizes**: Configurable from 6x6 to 10x10 depending on level design
- **Special Formations**: T and L shapes (5 tiles → 1 tile at 4x), Block shapes (4 tiles → 2 tiles at 2x)
- **Blocked Tiles**: Immovable obstacles defined per level with row/column-based positioning
- **Power-ups**: Three types with 2 uses each per level - Hammer (🔨 remove tile), Halve (🖖 halve value), Swap (🔄 swap any two tiles)
- **Special Tiles**: Configurable rewards for formations - Joker, Power (bonus matches), Golden (+1 value), Free Swap
- **Spawnable Tiles**: Level-configurable tile values that can appear during gameplay
- **Goal Types**: "created" (cumulative tiles made), "current" (tiles on board), "blocked" (blocked tiles cleared)
- **Animation States**: Uses CSS classes for different animation types (falling, sliding, merge-target, etc.)
- **Responsive Design**: Extensive use of `clamp()` for scalable UI across devices
- **Touch Support**: Full touch/swipe gesture support with preventDefault for mobile

## Code Conventions

- ES6 modules with explicit imports/exports
- Class-based architecture in `game.js`, functional modules elsewhere
- Extensive use of CSS Grid and Flexbox
- Animation timing coordinated with setTimeout/CSS transitions
- localStorage keys prefixed with "match2048_"
- DOM manipulation using vanilla JavaScript APIs
- Module functions receive `game` instance as parameter for state access

## User Notes

- Do not start any server
- Do not call "open index.html"
- I will test everything manually
