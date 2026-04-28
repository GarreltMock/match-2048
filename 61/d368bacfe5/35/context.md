# Session Context

## User Prompts

### Prompt 1

Our solver hint simulation seems broken.
Look I have this board state:
boardPreset: [
            [1, 2, 1, 3, 4, 4, 3, 4],
            [4, 1, 3, 1, 1, 3, 4, 3],
            [3, 5, 4, 2, 4, 2, 4, 1],
            [1, 1, 2, 1, 2, 3, 3, 2],
            [2, 2, 1, 4, 2, 2, 3, 5],
            [3, 1, 2, 4, 3, 1, 2, 1],
            [4, 1, 5, 3, 2, 3, 4, 1],
            [2, 3, 4, 7, 8, 2, 2, "B"],
        ],


The solve is easy. Just swap (6,4) -> (7,4)
But the solver hint shows: Not solvable in 10 moves...

### Prompt 2

It still shows not solvable in 10 moves. Maybe add logging?

### Prompt 3

[solver] initialBlockedTileCount=0 goals=[{"current":0,"goalType":"blocked","target":1,"created":0}]
solver.js:160 [solver] depth=1 ranked=(6,4)->(7,4) rank=11110 | (0,6)->(0,7) rank=1283 | (4,1)->(4,2) rank=1052
simulation.js:230 [sim] cascade=0 blockedTilesToRemove=[{"row":7,"col":7}]
solver.js:175 [solver]   swap (6,4)->(7,4): valid=true allGoalsSatisfied=false goals=[{"current":0,"goalType":"blocked","target":1,"created":0}]
solver.js:175 [solver]   swap (0,6)->(0,7): valid=true allGoalsSati...

### Prompt 4

[Request interrupted by user]

### Prompt 5

Ah. Maybe it is, because I used a boardPreset and the countBlockedTiles function does not count that correctly. Why does the simulator not use the goal objects, with the target, current fields?

