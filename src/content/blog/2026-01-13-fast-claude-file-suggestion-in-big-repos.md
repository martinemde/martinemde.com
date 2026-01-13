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
In particular, the built in file suggestion in Claude Code can become choppy and slow when it's trying to filter 110,000 files.

Anthropic [anticipated][file-suggestion] this and provided the `fileSuggestion` setting to allow us to improve performance on these big repositories.

> The built-in file suggestion uses fast filesystem traversal, but large monorepos may benefit from project-specific indexing such as a pre-built file index or custom tooling.

Claude code's current file suggestion also have a subtle problem for big repositories.
`claude` seems to filter suggestions on the main thread on every character.
In a repo like [Gusto][gusto]'s core product, this can lag input considerably.
Deleting characters is especially slow as the search expands.
This UI problem may be the worst part, since slow searches without a frozen UI would at least be tolerable.

Tonight I hacked a solution for this with claude. [file-suggestion.sh][latest] is a custom file-suggestion command which builds a cache from `git ls-files`, if available and falls back to `fd` or `find` outside of a git repository.
These results then get filtered with `ripgrep` and `fzf`, allowing fast fuzzy searching.

Luckily, using a separate script also seems to fix the input lag.
When running a separate script, it forces `claude` to run it async, which seems to completely remove UI lag on input during a match.
This surprise bonus all but guarantees I will use some sort of suggestion script for the foreseeable future.

On our core repo, this drops the search time to about **62ms** compared to around **1000ms** without the index
The script watches for the `.git/index` or `.git/HEAD` to be newer than the cache file and automatically refreshes the cache.

There's a small caveat. In order to get this speed and have fuzzy matching, it pre-filters based on the first directory segment using ripgrep.
This allows you to type `pac/payroll` to find `packs/products/payroll/...` but if you type
`pks/payroll` or `papay` it may not return any results.
This is a trade-off for speed, but please do let me know if you find a way around it.

To try it, make sure you have `ripgrep`, `fzf` and optionally `fd` installed.

Grab the script below: (You can view the [latest version][latest] if I didn't break the link by the time you get here):

```bash
curl -o ~/.claude/file_suggestion.sh https://raw.githubusercontent.com/martinemde/dotfiles/edad489e7be462e3469ebb15a5486ddd76bd5834/home/dot_claude/executable_file_suggestion.sh
chmod +x ~/.claude/file_suggestion.sh
```

Then add the following to `~/.claude/settings.json` (ensure the path matches).

```json
  "fileSuggestion": {
    "type": "command",
    "command": "~/.claude/file_suggestion.sh"
  }
```

Restart Claude Code, then test out the search.

You might want to ignore the `~/.claude/file-suggestions.cache` in your global gitignore file.

If you have any trouble, let me know.

[gusto]: https://gusto.com 'Gusto - #1 Rated HR Platform - (also where I work)'
[file-suggestion]: https://code.claude.com/docs/en/settings#file-suggestion-settings 'Anthropic Help: Claude Code File Suggestion settings'
[latest]: https://raw.githubusercontent.com/martinemde/dotfiles/main/home/dot_claude/executable_file_suggestion.sh 'Link to current version'
