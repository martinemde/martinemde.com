---
title: "It's Just Their Tokens: Code Review Etiquette in the Vibe Era"
date: 2025-12-18
author: Martin Emde
description: 'Code review has long been a bottle neck and agents are making it worse. How can we address the increasing demand for review without destroying code review or creating new bottlenecks?'
published: true
slug: its-just-their-tokens
---

A common complaint about the usage of AI coding agents is the burden it places on code reviewers. Engineers often resist switching their mental context to review code. Finding out that you're now expected to review someone else's low-effort slop can almost feel like an insult.

Code review has long been a bottle neck and agents are making it worse. More code, produced faster and with less oversight increases the burden on reviewers. And yet, code reviews are an essential part of sharing knowledge in software engineering. They follow an etiquette that is meant to respect the effort of the author and encourage sharing of knowledge.

Meanwhile, the expectations placed on the code reviewer, and the bleak future where all we do is review the output of coding agents, feels impossibly unbalanced. Much of this etiquette, and the expectations placed on the reviewer, assumes that writing code is slow and hard. This poses a problem if we want engineers to be effective with AI agents. We need code review to teach, learn, and ensure quality.

How can we address the increasing demand for review without destroying code review or creating new bottlenecks?

## Review Etiquette Must Change

The length of a PR is no longer a good predictor of effort. If you're staring down an angry bowl of vibe soup, **you'll do the author a service by explaining the words they need to say to their agent to produce the quality you're expecting.**

Normally reviewers might shy away from asking for a big architectural change in code reviews. Don't. Big architecture changes are not as difficult as they once were and vibe code can be re-vibed easily with better requirements. **Reviewers should reject sloppy code as long as they make their expectations clear.**

How do we balance the effort to review the code with the effort to generate the code? My advice, keep the effort proportional. If a day of work in the before times took 20 minutes to review, then an hour of work should take only a few minutes. The proof of quality and the ease of review rests on the author.

If the author submitted a big mess, ask for a big solution. If the slop is high, simply scan to understand their goal and then respond with the architecture or solution you expected and why. Leave high level comments for code that lacks deep consideration. Ask questions that help you both understand the problem and the possible solutions. Focus on what would make their code easier to review.

This isn't a blank check to be a jerk. Kindness and respect are still table stakes. If something doesn't meet your quality standards, nitpicking every problem line-by-line is counterproductive. Be direct about what you expected overall and ask questions about how they arrived at the solution. Your input may help improve the quality and readability of the author's future code and maybe you'll even learn something yourself.

When you're reviewing vibed code, don't be afraid to push for changes that might necessitate rewrites. Don't burn yourself out on their behalf. It’s ok to ask for a different approach. This isn't their blood, sweat, and tears, it's just their tokens.

---

_My first draft of this blog post was about 4x longer and half as good. Thanks to my teammate Denis and my “infinitely patient with me wife” Kewe for their reviews. You both helped me merge a better blog post._
