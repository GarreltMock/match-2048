# Session Context

## User Prompts

### Prompt 1

Implement the following plan:

# Highlight Valid Swap Targets

## Context
When pressing a tile, it's unclear which tiles are valid swap targets — especially for extended free-swap and teleport tiles that allow non-adjacent swaps. Dimming invalid targets makes this immediately visible.

## Approach
On drag start, compute valid swap targets for the selected tile and add `.swap-dimmed` CSS class to all **invalid** targets. Remove on drag end.

## Changes

### 1. `src/input-handler.js`

**Add `sho...

### Prompt 2

input-handler.js:355 Uncaught TypeError: Cannot read properties of undefined (reading 'NaN')
    at isTeleportSwapAllowed (input-handler.js:355:35)
    at canPreviewSwap (input-handler.js:346:9)
    at showValidSwapTargets (input-handler.js:331:14)
    at startDrag (input-handler.js:135:9)
    at Match3Game.handleTouchStart (input-handler.js:57:5)

### Prompt 3

Hm the highlights are removed if I move the mouse while having mousedown

### Prompt 4

Ah we have the merge preview class. Maybe this should also reset the opacity.

### Prompt 5

Can we also dimm the swap options if the merge preview is active?

### Prompt 6

[Request interrupted by user]

### Prompt 7

Please undo the last changes

### Prompt 8

Could you put showValidSwapTargets behind a setting please. Disabled is default

