---
title: 'Progress Bars in Ghostty Terminals'
date: 2025-12-31T22:00:09Z
author: Martin Emde
description: 'The blue bar at the top of the Ghostty terminal can display more information than I realized.'
published: true
slug: ghostty-progress-bars
---

I notice that the blue bar at the top of the Ghostty terminal can do more than just bounce back and forth (like it does in Claude Code). I was tinkering with Ghostty (to add additional shader uniforms for focus change events) and when Zig builds, it updates the Ghostty progress bar as it builds, turning red if it fails.

I [found this "one-liner"](https://github.com/ghostty-org/ghostty/pull/8477#issuecomment-3302958474) (it's a _long_ line) by [@jcollie](https://github.com/jcollie) that outputs the OSC9;4 progress bar sequences:

```bash
 counter=1; while [ $counter -le 25 ]; do printf "\x1b]9;4;2;${counter}\x07"; ((counter++)); sleep 0.1; done; while [ $counter -le 50 ]; do printf "\x1b]9;4;1;${counter}\x07"; ((counter++)); sleep 0.1; done; while [ $counter -le 75 ]; do printf "\x1b]9;4;3\x07"; ((counter++)); sleep 0.1; done; while [ $counter -le 100 ]; do printf "\x1b]9;4;1;${counter}\x07"; ((counter++)); sleep 0.1; done; printf "\x1b]9;4;0\x07"
```

And here's the breakdown of the escape sequence (from the [Windows Terminal docs of all places](https://learn.microsoft.com/en-us/windows/terminal/tutorials/progress-bar-sequences)):

> `ESC ] 9 ; 4 ; <state> ; <progress> BEL`
>
> `ESC` is the escape character, ASCII 27.
> `BEL` is the bell character, ASCII 7.
> `<state>` is one of `0`, `1`, `2`, `3`, or `4`.
> `0` is the default state, and indicates that the progress bar should be hidden. Use this state when the command is complete, to clear out any progress state.
> `1`: set progress value to `<progress>`, in the "default" state.
> `2`: set progress value to `<progress>`, in the "Error" state
> `3`: set the taskbar to the "Indeterminate" state. This is useful for commands that don't have a progress value, but are still running. This state ignores the `<progress>` value.
> `4`: set progress value to `<progress>`, in the "Warning" state
> `<progress>` is a number between 0 and 100, inclusive.

How great would it be to add that to other tools that compile or churn for a while? It's no replacement for other feedback since not all terminals implement this, but it seems like a good way to give extra information without an excess of printed characters that get picked up by logs.
