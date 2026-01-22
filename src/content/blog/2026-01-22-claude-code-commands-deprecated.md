---
title: 'Claude Code commands deprecated in favor of skills'
date: 2026-01-21T21:51:35-08:00
author: Martin Emde
description: 'Anthropic pushed out a change to the docs that deprecates commands, pointing everyone te use the new improved skills with support for most of the same feature set.'
published: true
slug: claude-code-commands-deprecated
---

Today, I noticed I could no longer find the [Slash commands][slash-commands] documentation that I was using.
The link is still named Slash commands, but it renders the [Skills](https://code.claude.com/docs/en/skills) docs.

I had been looking closely at Claude Code's Skills and Commands lately as I build [skillet][skillet], and all today I kept trying to remind myself what was different between them. Sure enough, if you read the big blue box at the top of the docs, it says:

> [!NOTE] For built-in commands like /help and /compact, see [interactive mode](https://code.claude.com/docs/en/interactive-mode#built-in-commands).
>
> Custom slash commands have been merged into skills. A file at .claude/commands/review.md and a skill at .claude/skills/review/SKILL.md both create /review and work the same way. Your existing .claude/commands/ files keep working. Skills add optional features: a directory for supporting files, frontmatter to [control whether you or Claude invokes them](https://code.claude.com/docs/en/skills#control-who-invokes-a-skill), and the ability for Claude to load them automatically when relevant.

They merged some of the command-only features into skills.
You can now use `hooks` in skills which were previously command only, and
they added support for injecting command output into the prompt.
Check out this example from the docs (note the `!` preceding the inline commands).

```md
---
name: pr-summary
description: Summarize changes in a pull request
context: fork
agent: Explore
allowed-tools: Bash(gh:*)
---

## Pull request context

- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## Your task

Summarize this pull request...!`gh pr diff`
```

The inline commands will be processed and interpolated before evaluating the skill.

One thing that is still missing is support for numbered arguments, like `$1` and `$2`.
These were complicated, and may have been under-utilized.
I chose to skip it myself when I went to implement command support.

I'm excited to see this merger. It seemed inevitable and their timing, at least for me, is impeccable.
Skillet will keep command support for now, as commands still exist, but I suggest
migrating all your commands now to take advantage of the newly combined set of features.

[skillet]: https://github.com/martinemde/skillet 'Run claude skills as beautiful shell scripts'
[slash-commands]: https://code.claude.com/docs/en/slash-commands 'The old link to slash command documentation'
[skills]: https://code.claude.com/docs/en/skills 'The new skills documentation'
