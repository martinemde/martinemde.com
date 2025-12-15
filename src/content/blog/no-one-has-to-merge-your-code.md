---
title: 'No One Has To Merge Your Code'
date: 2025-12-18
author: Martin Emde
description: 'Code review has long been a bottle neck and agents are making it worse. How can we address the increasing demand for review without destroying code review or creating new bottlenecks?'
published: true
slug: no-one-has-to-merge-your-code
---

> "I would have written a shorter letter, but did not have the time." - [Someone](https://www.reddit.com/r/todayilearned/comments/1196bgx/til_mark_twain_is_often_wrongly_credited_with_the/)

A common refrain against the usage of AI coding agents is the burden it places on code reviewers. Engineers often resist switching their mental context to review code. Finding out that you're now expected to review someone else's low-effort slop can almost feel like an insult.

Code review has long been a bottle neck and agents are making it worse. More code, produced faster and with less oversight increases the burden on reviewers. And yet, code reviews are an essential part of sharing knowledge in software engineering. They follow an etiquette that is meant to respect the effort of the author and encourage sharing of knowledge.

Meanwhile, the expectations placed on the code reviewer, and the bleak future where all we do is review the output of coding agents, feels impossibly unbalanced. Much of this etiquette, and the expectations placed on the reviewer, assumes that writing code is slow and hard. This poses a problem if we want engineers to be effective with AI agents. We need code review to teach, learn, and ensure quality.

How can we address the increasing demand for review without destroying code review or creating new bottlenecks?

## Write Reviewable Code

I still remember a code review I received early in my career. My new coworker taught me something I haven't forgotten. I made an early commit to address excess whitespace and improper indentation (painstakingly, by hand, it was the 2000s) and along the way I made a few obvious refactors. I committed them all with the message "Whitespace fixes" and submitted for review.

My colleague quickly called me out. "You said these were just whitespace fixes, why did this code change? If I'm scanning for whitespace changes, I don't want to suddenly have to switch to review code correctness." I had broken their expectation about how long this code review would take and that interrupted his work. I reset my commit, added back only the whitespace changes, and resubmitted along with a separate branch for the refactor. Both were commits accepted, but the lesson stuck with me.

**No one has to merge your code. They got shit to do.**

The burden is on the author to make sure their code can be reviewed easily. This is part of the senior engineering skillset. Before you learn it, you'll sometimes notice than your large changes and clever refactors never get reviewed. The requirement to make your code reviewable does not change when agents write the code. Your responsibility for getting your code merged is the same as always.

And what makes code reviewable? Put simply, **show your work!**

Before agents, your work was a stream of reasonably concise commits, comments, and code, submitted as incremental updates. If you didn't submit code for review every few days, maybe you got lost. Daily stand-ups were there to dig you out and keep you focused. Now, while all of the old stuff still matters, your work now includes the specs, prompts, decisions, and references that you used to feed to your agent. Your work is what you did to get where you got.

Show your PLAN.md early and seek feedback before you begin. **I’d rather critique 2 pages of PLAN.md than 20 pages of code.** The reviewer gets a chance to see your words, your approach, and to offer real feedback about the work you’re actually doing and help you write a better plan. Better yet, pair with your teammate to develop the plan. Showing your work becomes automatic and they'll be prepared to review the output when it's ready.

## Review Etiquette Must Change

The length of a PR is no longer a good predictor of effort. If you're staring down an angry danger noodle bowl of vibe soup, **you'll do them a service by explaining the words they need to say to their agent to produce the quality you're expecting.**

Normally reviewers might shy away from asking for a big architectural change in code reviews. Don't. Big architecture changes are not as difficult as they once were and vibe code can be re-vibed easily with better requirements. **Reviewers should reject sloppy code as long as they make their expectations clear.**

How do we balance the effort to review the code with the effort to generate the code? My advice, keep the effort proportional. If a day of work in the before times took 20 minutes to review, then an hour of work should take only a few minutes. The proof of quality and the ease of review rests on the author.

If the author submitted a big mess, ask for a big solution. If the slop is high, simply scan to understand their goal and then respond with the architecture or solution you expected and why. Leave high level comments for code that lacks deep consideration. Ask questions that help you both understand the problem and the possible solutions. Focus on what would make the code easier to review.

This isn't a blank check to be a jerk, but if something doesn't meet your quality standard and you identify it quickly, you don't need to comment on every problem line-by-line. Be direct about what you expected and ask questions about the process they used to arrive at the solution, and then you improve the quality of the author's future code and how easy it is to review.

When you're reviewing vibed code, don't be afraid to push for big changes. Don't burn your self out on their behalf. This isn't their blood, sweat, and tears, it's just their tokens.

_Unsurprisingly, my first draft of this blog post was about 4x longer than the result here. Thank you to Denis for his review and the ensuing discussion that helped me focus this post on what is most important. My "infinitely patient with me wife" also reviewed this and **definitely gets to be recognized in the footnotes too.** (see!)_
