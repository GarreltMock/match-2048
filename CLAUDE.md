# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Match 2048 is a browser-based puzzle game that combines match-3 mechanics with 2048-style tile merging. Players swap adjacent tiles to create matches of 3+ identical numbers, which then merge into higher-value tiles. Each level has specific tile goals that must be achieved within a limited number of moves.

## Architecture

This is a vanilla JavaScript single-page application with no build process or dependencies:

- `index.html` - Main HTML structure with game UI and tutorial overlay
- `script.js` - Core game logic implemented as a `Match3Game` class
- `style.css` - Complete styling with responsive design and animations

### Core Game Systems

**Board Management** (`script.js:145-201`): 8x8 grid using 2D array, prevents initial matches during board generation

**Match Detection** (`script.js:533-669`): Hierarchical matching system prioritizing special formations (T, L, block) over regular 3+ matches

**Animation System**: Coordinated animations for swaps, merges, and tile drops using CSS transitions and timeouts

**Level Progression** (`script.js:25-96`): 10 predefined levels with increasing difficulty, move limits, and specific tile goals

**Persistence** (`script.js:98-116`): Uses localStorage for current level, score, and tutorial preferences

### Game Flow

1. **Input Handling**: Touch and mouse drag-to-swap mechanics
2. **Match Processing**: Complex formation detection with priority system
3. **Tile Merging**: Different merge rules for formations (T/L → 4x value, Block → 2 tiles at 2x, Regular → 2x value)
4. **Board Physics**: Gravity-based tile dropping with new tile generation
5. **Goal Checking**: Real-time progress tracking with completion detection

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
- **Special Formations**: T and L shapes (5 tiles → 1 tile at 4x), Block shapes (4 tiles → 2 tiles at 2x)
- **Animation States**: Uses CSS classes for different animation types (falling, sliding, merge-target, etc.)
- **Responsive Design**: Extensive use of `clamp()` for scalable UI across devices
- **Touch Support**: Full touch/swipe gesture support with preventDefault for mobile

## Code Conventions

- ES6 class-based architecture
- Extensive use of CSS Grid and Flexbox
- Animation timing coordinated with setTimeout/CSS transitions
- localStorage keys prefixed with "match2048_"
- DOM manipulation using vanilla JavaScript APIs