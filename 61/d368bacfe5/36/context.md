# Session Context

## User Prompts

### Prompt 1

We want to radically improve the Hint system, or better say expand its functionality. Especially I want it to include the special tile features and also the joker usages. We need to probably include them in the possible moves. For now let's just keep that we can do one move with it and check the score as we have it before, I guess.

For the UX I probably for the special tiles just want to have the same UI as for a normal swap, I guess. Two tiles that should move should wiggle to each other so we...

### Prompt 2

[Request interrupted by user for tool use]

### Prompt 3

Continue

### Prompt 4

[Request interrupted by user]

### Prompt 5

continue

### Prompt 6

This seems to work quite well.
A few adjustments maybe.
1. You said: Hammer-on-normal skipped. But actually because of the gravity it can actually have a score right?
2. For the teleport hint-ux / design. Can we maybe even have a diagonal transform on that?
3. Make sure to give the hint-tiles a really high z-index.
4. Maybe we should also adjust the penalty for Joker based on their usage cost (free, or coin cost)

What do you think?

### Prompt 7

continue

### Prompt 8

continue

### Prompt 9

continue

### Prompt 10

Continue

### Prompt 11

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   The user requested a major expansion of the Hint system in the match-2048 project to:
   - Include special tile features as candidate moves: free swap, sticky free swap, directional free swap (horizontal/vertical), teleport — including the "extended free swap" mode
   - Include joker (power-up) uses a...

### Prompt 12

We need to check if the joker is already unlocked before the hint-system can suggest it.

### Prompt 13

Lets make the penalty for using joker overall a little higher. Maybe we can add a factor value we can fine tune?

### Prompt 14

Hm I have situations where almost the same result can be reached either through a joker usage, but also through a normal swap. Like there is the last blocked tile and I can just do a 3-tile merge next to it, but the hint is to use the joker, which even costs 1 coin.
Can we prefer the swap there

### Prompt 15

We added the cascade for the hammer joker without new spawning tiles.
Maybe we should do that for every action the hint-system tries?

### Prompt 16

But do we also do cascadeAndScore for normal swaps? Nothing to do with joker

### Prompt 17

But this was not the case before right?

### Prompt 18

How do you think does that change affect performance of the hint-system?

### Prompt 19

but I think it is more correct to evaluate what value the chain reactions have too right? The first swap itself does not need to have such a strong position in the value

