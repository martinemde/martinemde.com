---
title: 'starship-claude: Claude Code statusline with progress bars
date: 2026-01-02T06:46:04.079Z
author: martinemde
description: 'starship-claude is a custom statusline script for claude code that renders using Starship and shows context usage as a Ghostty (or other modern terminal) progress bar.'
published: false
slug: starship-claude-with-progress-bars
---

I released a little script over the weekend that uses [Starship][starship] to render [Claude Code][claude-code] to provide a custom statusline that includes progress bars for context usage. You can find the project on GitHub: [martinemde/starship-claude][martinemde/starship-claude].

I've been using this to render my statusline for a few months and [recently][progress-bars] discovered how to use Ghostty's blue progress bars (the lines at the top of the ghostty surface/pane). I was already calculating the context percentage in my script, so I just had it add in the invisible codes to the percentage printout.

- Claude Code compacts at 80% context usage, at least right now, so the progress bar is clamped to
- The progress bar will change color as you get deeper into the context.
  0-45%: Normal - You're good.
  45-65%: Warning - Reset if it's not going well.
  65%+: Error - Compacting soon...
  - Blue up to 45% - You're good
- I picked these percentages based on my experience, but they're easy to adjust.
- This won't render if you're running claude code in `tmux`. It seems to suppress the OSC codes.
  scale that 0-80% range to use the full 100% progress bar width.

[starship]: <https://starship.rs/> "Starship - The cross-shell prompt with easier configuration")
[claude-code]: <https://claude.ai/products/code> "Claude Code: You're using this already right?"
[martinemde/starship-claude]: <https://github.com/martinemde/starship-claude> "martinemde/starship-claude on GitHub"
[progress-bars]: /blog/ghostty-progress-bars "Ghostty Progress Bars blog post"
