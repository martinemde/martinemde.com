---
title: "It's Just Their Tokens: Code Review Etiquette in the Vibe Era"
date: 2025-12-18
author: Martin Emde
description: "Code review has long been a bottle neck and agents are making it worse. How can we address the increasing demand for review without destroying code review or creating new bottlenecks?"
published: true
slug: its-just-their-tokens
---

A common complaint about the usage of AI coding agents is the burden it places on code reviewers. Engineers often resist switching their mental context to review code. Finding out that you're now expected to review someone else's low-effort slop can almost feel like an insult.

Code review has long been a bottle neck and agents are making it worse. More code, produced faster and with less oversight increases the burden on reviewers. And yet, code reviews are an essential part of sharing knowledge in software engineering. They follow an etiquette that is meant to respect the effort of the author and encourage sharing of knowledge.

Meanwhile, the expectations placed on the code reviewer, and the bleak future where all we do is review the output of coding agents, feels impossibly unbalanced. Much of this etiquette, and the expectations placed on the reviewer, assumes that writing code is slow and hard. This poses a problem if we want engineers to be effective with AI agents. We need code review to teach, learn, and ensure quality.

How can we address the increasing demand for review without destroying code review or creating new bottlenecks?

## Review Etiquette Must Change

The length of a PR is no longer a good predictor of effort. If you're staring down an angry danger noodle bowl of vibe soup, **you'll do them a service by explaining the words they need to say to their agent to produce the quality you're expecting.**

Normally reviewers might shy away from asking for a big architectural change in code reviews. Don't. Big architecture changes are not as difficult as they once were and vibe code can be re-vibed easily with better requirements. **Reviewers should reject sloppy code as long as they make their expectations clear.**

How do we balance the effort to review the code with the effort to generate the code? My advice, keep the effort proportional. If a day of work in the before times took 20 minutes to review, then an hour of work should take only a few minutes. The proof of quality and the ease of review rests on the author.

If the author submitted a big mess, ask for a big solution. If the slop is high, simply scan to understand their goal and then respond with the architecture or solution you expected and why. Leave high level comments for code that lacks deep consideration. Ask questions that help you both understand the problem and the possible solutions. Focus on what would make the code easier to review.

This isn't a blank check to be a jerk, but if something doesn't meet your quality standard and you identify it quickly, you don't need to comment on every problem line-by-line. Be direct about what you expected and ask questions about the process they used to arrive at the solution, and then you improve the quality of the author's future code and how easy it is to review.

When you're reviewing vibed code, don't be afraid to push for big changes. Don't burn your self out on their behalf. This isn't their blood, sweat, and tears, it's just their tokens.

_My first draft of this blog post was about 4x longer and half as good. Thank you to my reviewers, my teammate Denis and my “infinitely patient with me wife” Kewe. You both helped me eritr a better blog post and get it merged._