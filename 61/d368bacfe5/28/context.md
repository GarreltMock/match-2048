# Session Context

## User Prompts

### Prompt 1

What do you think about those two comments:
P1
Fast far-swaps are silently rewritten to adjacent moves
Verwerfen
endDrag now snaps any previewed target more than one tile away to an adjacent tile whenever the drag finishes within 150ms. That changes the actual move after the user has already targeted a valid distant destination, so teleport/free-swap tiles can no longer be used reliably with a quick flick. This is a gameplay regression, not just a UX hint, because the committed swap can differ f...

### Prompt 2

Hm ok. Lets try P2.
Thinking about P1: I think it is very unlikely that a user would do a far distance flick. 150ms are very fast. I think now user would do the flick this fast really. What do you think?

### Prompt 3

No. Only do P2

### Prompt 4

We did break something. In the swap animation both tiles have a weird offset. One is like top-left off positioned, the other is then bottom-right off. 
You can probably look at all the changes in this branch to find the fix.

