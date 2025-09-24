# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Match 2048 is a browser-based puzzle game that combines match-3 mechanics with 2048-style tile merging. Players swap adjacent tiles to create matches of 3+ identical numbers, which then merge into higher-value tiles. Each level has specific tile goals that must be achieved within a limited number of moves. The game features power-ups, blocked tiles, and configurable board sizes for increased challenge and strategy.

## Architecture

This is a vanilla JavaScript single-page application with no build process or dependencies:

- `index.html` - Main HTML structure with game UI and tutorial overlay
- `script.js` - Core game logic implemented as a `Match3Game` class
- `style.css` - Complete styling with responsive design and animations

### Core Game Systems

**Board Management** (`script.js:197-254`): Configurable board sizes (6x6 to 8x8) using 2D array, prevents initial matches during board generation, supports blocked tiles

**Match Detection** (`script.js:533-669`): Hierarchical matching system prioritizing special formations (T, L, block) over regular 3+ matches

**Animation System**: Coordinated animations for swaps, merges, and tile drops using CSS transitions and timeouts

**Level Progression** (`script.js:38-127`): 10 predefined levels with configurable board sizes, blocked tile patterns, spawnable tiles, and specific tile goals

**Power-up System** (`script.js:22-31`): Three power-ups with limited uses per level (hammer, double, swap) providing strategic advantages

**Blocked Tiles** (`script.js:3,157`): Immovable tiles that create obstacles and strategic challenges in level design

**Persistence** (`script.js:129-147`): Uses localStorage for current level, score, and tutorial preferences

### Game Flow

1. **Input Handling**: Touch and mouse drag-to-swap mechanics, power-up activation system
2. **Match Processing**: Complex formation detection with priority system
3. **Tile Merging**: Different merge rules for formations (T/L → 4x value, Block → 2 tiles at 2x, Regular → 2x value)
4. **Board Physics**: Gravity-based tile dropping with new tile generation, respects blocked tiles
5. **Power-up Effects**: Strategic tile removal, value doubling, and position swapping
6. **Goal Checking**: Real-time progress tracking with completion detection based on tiles created (not current board state)

## Development Commands

This is a static web application - no build process required. Simply open `index.html` in a browser or serve with a local web server:

```bash
# Serve locally (recommended)
python -m http.server 8000
# or
npx serve .
```

## Key Implementation Details

- **Tile Values**: Powers of 2 from 2 to 2048+
- **Board Sizes**: Configurable from 6x6 to 8x8 depending on level design
- **Special Formations**: T and L shapes (5 tiles → 1 tile at 4x), Block shapes (4 tiles → 2 tiles at 2x)
- **Blocked Tiles**: Immovable obstacles using `BLOCKED_TILE` constant, defined per level with row-based positioning
- **Power-ups**: Three types with 2 uses each per level - Hammer (🔨 remove tile), Double (✨ double value), Swap (🔄 swap any two tiles)
- **Spawnable Tiles**: Level-configurable tile values that can appear during gameplay
- **Goal Tracking**: Changed from current board state to cumulative tiles created during play
- **Animation States**: Uses CSS classes for different animation types (falling, sliding, merge-target, etc.)
- **Responsive Design**: Extensive use of `clamp()` for scalable UI across devices
- **Touch Support**: Full touch/swipe gesture support with preventDefault for mobile

## Code Conventions

- ES6 class-based architecture
- Extensive use of CSS Grid and Flexbox
- Animation timing coordinated with setTimeout/CSS transitions
- localStorage keys prefixed with "match2048_"
- DOM manipulation using vanilla JavaScript APIs