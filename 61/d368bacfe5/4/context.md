# Session Context

## User Prompts

### Prompt 1

Implement the following plan:

# Add "Move Cost" PowerUp Buy Mode

## Context
Add setting where buying a powerUp costs 1 move instead of gold (when user has no persistent/transient powerUp).

## Files to modify

### 1. `src/storage.js` — add load/save for `powerUpMoveCost`
- Add `loadPowerUpMoveCost()` (default `false`) and `savePowerUpMoveCost(enabled)` following existing pattern (lines ~475-490)

### 2. `src/game.js` — load setting on init
- Add `this.powerUpMoveCost = loadPowerUpMoveCost(...

