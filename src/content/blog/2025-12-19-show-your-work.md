---
title: 'Show Your Work: How to write reviewable code'
date: 2025-12-19
author: Martin Emde
description: "As authors of code, we're responsible for writing reviewable code. When agents write the code, you still need to show your work, even if that work looks different now."
published: true
slug: show-your-work
---

I still remember a code review I received early in my career. I had just started a new job and my new coworker taught me something in a code review I haven't forgotten. I think the lesson applies more than ever now that agents are writing more (most?) of our code.

Having freshly joined, I made an commit to address excess white space and improper indentation that were bugging me (painstakingly, by hand, it was the 2000s) and along the way I made a few refactors that seemed obvious to me. I committed this all with the message "White space fixes" and submitted for review.

My colleague quickly called me out. "You said these were just white space fixes, why did this code here change?" My explanation was something about not wasting the overhead of splitting it out. "If I'm scanning for white space changes, I don't want to suddenly have to review for code correctness." OK. I reset my commit, added back only the white space changes, and resubmitted them each separately. Both were commits accepted easily.

However, the lesson stuck with me. Even though the code was fine, I had made it much harder for him to review. White space changes are easy to scroll through. Your only job is to catch accidental code changes, which is exactly what I inserted. I had broken his expectation about how long this code review would take, what level of care he needed to use, and how big an interruption this would be to his workflow.

**No one has to merge your code. They got shit to do.**

The burden is on the author to submit code that can be reviewed easily. This is an often unspoken part of the senior engineer skill set, [transferred by working together][senior] rather than explicitly taught. Before you learn this skill, you'll sometimes notice than your larger commits and clever refactors take a long time to get reviewed. You may even think this is the fault of your team or your process. Maybe it is, or maybe the whole team assumes that code review always takes forever so they should do it in big batches.

The requirement to make your code reviewable does not change when agents write your code. With [code reviewers overwhelmed][review], your responsibility for making your code reviewable is more important than ever. And what makes code reviewable? Put simply, **show your work!**

Before agents, your work was a stream of reasonably concise commits, comments, tests, and code, submitted as incremental updates. Now, while all of the old stuff still matters, your work includes the specs, prompts, decisions, and references that you used to supply context to your agent. Combined these artifacts [prove][prove] that your change does what you claim it does.

When a reviewer tries to understand the code, they need to assess whether you effectively achieved your goal. The larger your change the harder it is to understand all the various goals you had while making it. As the author, it's also much harder to prove, since there's so much more code to justify.

If you're looking for somewhere to start, I encourage you to try this: pair on a plan before you write a line of code. If you can't, at least share your PLAN.md early and seek feedback. **I would jump at the chance to critique 2 pages of `PLAN.md` rather than 20 pages of code.** I've seen this work and along with other good practices, you'll have a easier time generating code that can be reviewed effectively.

Reviewing the plan, and including it with your code for review, also give the reviewer a chance to see your words and approach, and to offer real feedback about the work you’re actually doing. If you can pair with your teammate to develop the plan, you'll know that they're ready to review it later. Resist the urge to add more than one plan to a unit of reviewable code. If you want to keep building after completing a plan, wait! [Go review someone else's code][review]
first, then develop your next plan and run it by your team for review.

Review doesn't have to be a slow bottleneck if we ensure that our code is easy to review. Prove that you did what you set out to do, break code into smaller chunks, build them in layers of abstraction and refinement, and keep changes focused.

[senior]: https://obie.medium.com/what-happens-when-the-coding-becomes-the-least-interesting-part-of-the-work-ab10c213c660 'Teams rarely standardize or document senior thinking'
[review]: /blog/its-just-their-tokens 'Reviewing AI agent produced code should change how we code review'
[prove]: https://simonwillison.net/2025/Dec/18/code-proven-to-work/
