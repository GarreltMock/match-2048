# Session Context

## User Prompts

### Prompt 1

Wir haben einige Trigger-Tutorial-Screens, wenn ein neuer Merge passiert ist. Wir zeigen, wie dieser Merge funktioniert. Diese Tutorials finde ich aber nicht so gut, weil sie zwei Dinge falsch machen:
1. Sie sind statisch. Das heißt, man sieht immer dieselben Tiles, obwohl das eigentlich den eigentlichen Merge, den man macht, anders aussieht.
2. Außerdem benutzen sie andere Styles als die schon definierten Gem-Styles, die wir haben.
Kannst du bitte diese Trigger-Tutorial anpassen, dass sie ein...

### Prompt 2

Können wir jetzt Styles aufräumen? Vermutlich nicht oder? Weil sie im tutorial-dialog noch gebraucht werden?

### Prompt 3

<create-pr-command>
## Overview

Create a pull request for the changes in this session.

## Steps

1. Check for uncommitted changes. If any exist, stage and commit them with a message that describes what changed and why.
2. Push the branch to the remote.
3. Open a PR with `gh pr create`. Write a title that summarizes the change and a body that covers what changed, why, and anything a reviewer should know. If the repo has a PR template, follow it.
4. Report the PR URL when done. Wrap the URL in a...

### Prompt 4

Kannst du bitte mal nachprüfen welche Styles in Tiles im Tutorial Dialog nutzen?
Hier würde ich auch gerne vorhandene gem styles nehmen

### Prompt 5

Adressieren mal diesen Kommentar:
The tutorial derives the directional free-swap badge from matchGroup.direction, but the merge code creates directional free-swap tiles from game.lastSwapPosition in src/merge-processor.js. A horizontal swap that completes a vertical 4-line will show a vertical badge here while creating a horizontal free-swap tile, and vice versa.

