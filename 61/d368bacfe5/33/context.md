# Session Context

## User Prompts

### Prompt 1

So we have the simulator which we use in the ExtraMoves dialog to calculate how many moves you need to complete the level.
This uses the hint-system to get the best moves.
But the hint-system has the feature, that it prefers formation merges if the user did not already use them (to show the formation-tutorial)
Can you confirm that?

### Prompt 2

Ok thats weird. Consider this board state: [Image #1]
Swapping the 16 with the 4 would solve the level, because it would reach the tile-goal. But the hint-system prefers a 4-line match.
So we should always give a merge which makes goal-progress a really high score right? What do you think?

### Prompt 3

[Image: source: REDACTED 2026-04-28 um 09.28.57.png]

### Prompt 4

Ok something does not seem to work. The hint still shows the 4-tile line formation swap.
You can add loggging if this helps you

### Prompt 5

Yeah. It does seem to work.
Here are the logs:
[hint] score components: formation=300 tiles=150 goalProgress=0 goalsCompleted=0
hint-system.js:322 [hint] score components: formation=300 tiles=150 goalProgress=0 goalsCompleted=0
hint-system.js:322 [hint] score components: formation=300 tiles=150 goalProgress=0 goalsCompleted=0
hint-system.js:322 [hint] score components: formation=300 tiles=150 goalProgress=0 goalsCompleted=0
hint-system.js:322 [hint] score components: formation=300 tiles=150 goal...

