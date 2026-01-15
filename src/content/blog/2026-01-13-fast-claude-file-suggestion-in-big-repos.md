---
title: 'Fast claude @file suggestion in BIG repositories'
date: 2026-01-12T21:32:00-08:00
author: Martin Emde
description: 'Faster file suggestions in monorepos using Claude code @file suggestions based on git and an auto refreshing cache.'
published: true
slug: fast-claude-file-suggestion-in-big-repos
---

At [Gusto][gusto] we have some _big_ repositories.
Many tools struggle with large codebases and Claude Code is no exception.

File suggestion, when you type `@rea` and it suggests `@README.md`, is one area where the number of files in a project has an outsize impact on a UI interaction. Filtering 110,000 files every time you type a character can make claude choppy and slow.

Anthropic has offered [a worksround][file-suggestion] for this problem by providing the `fileSuggestion` setting to allow customization for big repositories.

> The built-in file suggestion uses fast filesystem traversal, but large monorepos may benefit from project-specific indexing such as a pre-built file index or custom tooling.

I hacked my own solution for our giant repo with claude:
[file-suggestion.sh][latest] is a custom file-suggestion command which builds a cache from `git ls-files`, if available.
It falls back to `fd` or `find` outside of a git repository.
These results are filtered with `ripgrep` and `fzf`, allowing fast fuzzy searching.

As a surprise bonus, using a custom script seems to fix the choppiness and UI lag that plagues big repos.
My guess is that the need to spawn a custom script forces the app to run the filtering async.
In a repo like [Gusto][gusto]'s core product, this can lag input considerably to where your keypresses stop rendering. Deleting characters is even worse, slowing to a crawl as the search space expands.

_Hey, claude code devs, if you're reading:_

```
Move the file suggestion filtering off the main
UI thread so suggestions are returned async,
following an approach similar to spawning a
process for a custom fileSuggestion command.
```

If you want to try my script, make sure you have `ripgrep`, `fzf` and optionally `fd` installed.

Grab the script below (or point your own claude at it and ask for a version that works for you). You can also view the [latest version][latest] if I didn't already break the link by the time you get here.

```bash
curl -o ~/.claude/file-suggestion.sh https://raw.githubusercontent.com/martinemde/dotfiles/36f670bda583065f634f1e83c4a195b9ac39c17b/home/dot_claude/executable_file-suggestion.sh
chmod +x ~/.claude/file-suggestion.sh
```

Then add the following to `~/.claude/settings.json` (ensure the path matches and the file is executable).

```json
  "fileSuggestion": {
    "type": "command",
    "command": "~/.claude/file-suggestion.sh"
  }
```

Restart Claude Code, then test out the search by typing an `@` and the start of a file. Fuzzy matching should let you match any fuzzy path after the first slash.

On our biggest repo, this drops the search time to about **62ms** compared to around **1000ms** without the index (one full second per bounce).
The script watches for the `.git/index` or `.git/HEAD` to be newer than the cache file and automatically refreshes the cache.

The cache is stored in the project's `.claude/` directory, so you'll want to ignore the `.claude/file-suggestions.cache` in your global gitignore file.

In order to attain speed and retain fuzzy matching, it pre-filters based on the first directory segment using ripgrep to cut down on results.
This allows you to type `pac/payroll` to find `packs/products/payroll/...` but if you type
`pks/payroll` or `papay` it may not return any results.
This is a trade-off for speed that I'd don't love since I was expecting neovim level fuzzy find.

I may experiment with dropping the pre-filter and accepting the slower results just to get more reliable fuzziness.
Please let me know if you find a better way around it.

[gusto]: https://gusto.com 'Gusto - #1 Rated HR Platform - (also where I work)'
[file-suggestion]: https://code.claude.com/docs/en/settings#file-suggestion-settings 'Anthropic Help: Claude Code File Suggestion settings'
[latest]: https://raw.githubusercontent.com/martinemde/dotfiles/main/home/dot_claude/executable_file-suggestion.sh 'Link to current version'
