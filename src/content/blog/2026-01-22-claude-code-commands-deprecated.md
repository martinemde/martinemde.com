---
title: 'Claude Code commands deprecated in favor of skills'
date: 2026-01-21T21:51:35-08:00
author: Martin Emde
description: 'Anthropic pushed out a change to the docs that deprecates commands, pointing everyone te use the new improved skills with support for most of the same feature set.'
published: true
slug: claude-code-commands-deprecated
---

I've been looking closely at Claude Code's Skills and Commands lately as I build [skillet][skillet].

Today, I noticed I could no longer find the [Slash commands][slash-commands] documentation that I was using.
The link is still named Slash commands, but it renders the [Skills](https://code.claude.com/docs/en/skills) docs.

Sure enough, if you read the big blue box at the top of the docs, it says:

> [!NOTE] For built-in commands like /help and /compact, see [interactive mode](https://code.claude.com/docs/en/interactive-mode#built-in-commands).
>
> Custom slash commands have been merged into skills. A file at .claude/commands/review.md and a skill at .claude/skills/review/SKILL.md both create /review and work the same way. Your existing .claude/commands/ files keep working. Skills add optional features: a directory for supporting files, frontmatter to [control whether you or Claude invokes them](https://code.claude.com/docs/en/skills#control-who-invokes-a-skill), and the ability for Claude to load them automatically when relevant.

They merged some of the command-only features into skills too.
You can now use `hooks` in a skill, and they added support for injecting bash into the context,
like this example from the docs:

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

One thing that is still missing is the nupport for numbered arguments, like `$1`, `$2` etc.
I think these may have been a rather complicated and under-utilized feature.
I chose to skip it myself when I went to implement command support, both because it only worked in
commands and because it's complicated to implement.
You have to bring in shell quoting to do it properly.
For [skillet][skillet] this meant two layers of shell quoting, so I lazily ignored it. (lucky me!)

I'm excited to see this merger. It seemed inevitable. Commands and skills were so similar.

Skillet will keep command support for now, commands still exist, but I suggest migrating all
your commands now to take advantage of the combined set of features.
I'm not aware of any downside to converting now.

[skillet]: https://github.com/martinemde/skillet 'Run claude skills as beautiful shell scripts'
[slash-commands]: https://code.claude.com/docs/en/slash-commands 'The old link to slash command documentation'
[skills]: https://code.claude.com/docs/en/skills 'The new skills documentation'
