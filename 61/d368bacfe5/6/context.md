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

