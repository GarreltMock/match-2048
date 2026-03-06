# Session Context

## User Prompts

### Prompt 1

Ich hab gestern für User Interviews zu dem Spiel match-2048 gemacht. Die ersten zwei hatten die Einstellung "Joker cost moves" die letzten zwei nicht (haben also Coins für Joker bezahlt)\
Hier sind die Notizen:\
1. Jonas (L1-8, Joker kosten Moves)
Hätte Lust, einfach Combos zu machen, anstatt Blöcke zu entfernen.
Allow non-matching swaps erwartet
Preview war sehr hilfreich.
Es könnte noch mehr passieren visuell, wenn man Combos macht.
Bewertung am Ende der Runde wäre cool. Bringt es mir wa...

### Prompt 2

Ok lets do following things:\
- 2: Lets keep the 4000ms Timeout for hints as long as there are open formation-dialogs. After that maybe go to 6000ms.\
- 7: add Labels below the Joker\
- lets add back the functionality that the hammer can remove blocked tiles. If the blocked tile has a life value, instead of removing it, half the current life value

### Prompt 3

Please use the hintTimeout from localstorage for the second (6000ms) timeout. Make 6000ms the default.\
For the rectangular blocked tiles without life, you can remove one X from it.

### Prompt 4

> Rectangular blocks with  
  life are still excluded since they don't use the merge-count system.\
What do you mean by that?\
We should include them in the hammer

