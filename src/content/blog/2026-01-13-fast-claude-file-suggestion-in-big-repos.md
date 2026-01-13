---
title: 'Fast claude @file suggestion in BIG repositories'
date: 2026-01-12T21:32:00-08:00
author: Martin Emde
description: 'Faster file suggestions in monorepos using Claude code @file suggestions based on git and an auto refreshing cache.'
published: true
slug: fast-claude-file-suggestion-in-big-repos
---

At [Gusto][gusto] we have some _big_ repositories.
Many tools struggle at to handle large codebases and Claude Code is no exception.
In particular, Claude's built-in file suggestion can become choppy and slow when it's trying to filter 110,000 files.

Anthropic [anticipated][file-suggestion] this, and provided the `fileSuggestion` setting to allow customization for big repositories.

> The built-in file suggestion uses fast filesystem traversal, but large monorepos may benefit from project-specific indexing such as a pre-built file index or custom tooling.

Claude code's built-in file suggestions also have a subtle problem that's more obvious in big repositories.
Claude seems to filter suggestions on the main thread on each and every character.
In a repo like [Gusto][gusto]'s core product, this can lag input considerably causing stalled frozen input.
Deleting characters is especially slow as the search area expands.
This UI problem may be the most annoying part, which I hope they can fix.

Hey, claude dev's if you're reading:

```
Move the file suggestion filtering off the main UI thread so suggestions can be teturned
async just like when we spawn a process for a custom fileSuggestion command. 
```

I hacked a solution for this with claude:
[file-suggestion.sh][latest] is a custom file-suggestion command which builds a cache from `git ls-files`, if available and falls back to `fd` or `find` outside of a git repository.
These results then get filtered with `ripgrep` and `fzf`, allowing fast fuzzy searching.

Luckily, using a separate script also seems to fix the input lag.
Running a separate script forces the result to be async, which seems to completely remove UI lag on input during a match.
This surprise bonus guarantees I will use some sort of suggestion script just for this input fix.


There's a small caveat. In order to get this speed and have fuzzy matching, it pre-filters based on the first directory segment using ripgrep.
This allows you to type `pac/payroll` to find `packs/products/payroll/...` but if you type
`pks/payroll` or `papay` it may not return any results.
This is a trade-off for speed, but please do let me know if you find a way around it.

To try it, make sure you have `ripgrep`, `fzf` and optionally `fd` installed.

Grab the script below: (You can view the [latest version][latest] if I didn't break the link by the time you get here):

```bash
curl -o ~/.claude/file-suggestion.sh https://raw.githubusercontent.com/martinemde/dotfiles/edad489e7be462e3469ebb15a5486ddd76bd5834/home/dot_claude/executable_file_suggestion.sh
chmod +x ~/.claude/file-suggestion.sh
```

Then add the following to `~/.claude/settings.json` (ensure the path matches).

```json
  "fileSuggestion": {
    "type": "command",
    "command": "~/.claude/file-suggestion.sh"
  }
```

Restart Claude Code, then test out the search.

On our core repo, this drops the search time to about **62ms** compared to around **1000ms** (one full second per bounce) without the index.
The script watches for the `.git/index` or `.git/HEAD` to be newer than the cache file and automatically refreshes the cache.

The cache is stored in the project's `.claude/` directory, so you'll want to ignore the `.claude/file-suggestions.cache` in your global gitignore file.

If you have any trouble, let me know.

[gusto]: https://gusto.com 'Gusto - #1 Rated HR Platform - (also where I work)'
[file-suggestion]: https://code.claude.com/docs/en/settings#file-suggestion-settings 'Anthropic Help: Claude Code File Suggestion settings'
[latest]: https://raw.githubusercontent.com/martinemde/dotfiles/main/home/dot_claude/executable_file_suggestion.sh 'Link to current version'
