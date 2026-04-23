# Session Context

## User Prompts

### Prompt 1

Lets think about improving the UX for the teleport and full-line swap tiles.
This often leads to miss-swaps, because of two reasons.
1. The user is used to only being able two swap 1 tile velocity. So he gets used to doing a drag a little further. 
2. The swap target is right below the thumb. So you can not see which tile the app would swap.
Maybe the swap-preview is not the best at the moment (scale down + opactiy). Maybe we need scale up?

What are you improvment suggestions?

### Prompt 2

We already have a lane-highlight, because we add opacity to other tiles. This is the show swap targets setting.

For now I lik 1. scale-up plus halo. And also lets do 5. but keep the implementation lean.

Before we do that, lets think about solving the unintentional to far swap for teleport and full-lane swap tiles.
Because often the swap gesture is quite fast normally, both of the fixes would not probably be to slow to notice. Any idea? But I think this is not better solvable

### Prompt 3

I like your velocity-gated commit idea.
Please explain the Optional supporting tweak a little more

### Prompt 4

Ok I like all your ideas. Lets do #1, #5 plus velocity-gated thing + your supporting tweak you just described.
Please put them in 4 sepearte commits.
Go for it

### Prompt 5

Vibrations do not seem to work on my iPhone 13 mini in Safari

### Prompt 6

yeah do the hack

### Prompt 7

Our haptics do not really work.
Look at this package and probably copy the relevant code you need for our app: https://github.com/lochie/web-haptics

### Prompt 8

In which scenario should it have haptic feedback?

### Prompt 9

No, you fixed our implementation, but I want to use the implementation from the lib I just showed you.

### Prompt 10

Weird. It seemed to me that the first press down on a tile had a vibration, but everything after not. But after a refresh it does not work either.
On the test page of web-haptics it works for me.

### Prompt 11

I do not see a switch

### Prompt 12

[Request interrupted by user]

### Prompt 13

No. Do not change the sw.js
Its not active

### Prompt 14

Ok I see the switch and it also changes on the preview change. But not haptic. But pressing the switch itself does vibrate :D

### Prompt 15

Ok but then remove the haptic altogether please

