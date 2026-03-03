# Session Context

## User Prompts

### Prompt 1

Implement the following plan:

# Nerf Hammer: Disallow on Blocked Tiles

## Context
Hammer powerup can destroy blocked tiles (including rectangular blocks), making it too powerful.

## Changes

### `src/power-ups.js`

1. **Line 358-363**: Remove `BLOCKED_MOVABLE`, `BLOCKED`, `BLOCKED_WITH_LIFE` from `allowedTypes` — only keep `TILE_TYPE.NORMAL`
2. **Lines 396-490**: Delete all blocked-tile branches in `usePowerUpHammer()` (the `isBlockedWithLife`, `isBlockedWithMergeCount`, and `isBlocked || i...

