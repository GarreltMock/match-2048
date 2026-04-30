# Session Context

## User Prompts

### Prompt 1

Please adress/fix these findings:
Persistent power-up counts bypass affordability
Verwerfen
getPowerUpCount counts persistent inventory even when persistentPowerUpsEnabled is false. canAffordPowerUp then treats disabled saved counts as usable stock and skips coin or move affordability, so hints can suggest power-up moves the player cannot actually use and the no-moves check can stay alive incorrectly.


/Users/garreltmock/Projects/match-2048/src/hint-system.js:230-233
[P1] hint-system.js (line 2...

