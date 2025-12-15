---
title: 'Adapting Engineering Orgs for Non-Technical Coders'
date: 2025-12-14
author: Martin Emde
description: 'These are the action items for engineering organizations that want to empower the new vibe coding juniors'
published: true
slug: adapt-engineering-orgs-to-non-technical-coders
---

Vibe coding is allowing a new category of junior programmers to emerge from unlikely places. Engineering is going to change.
Here's the `TODO` items that I think will help address the shift that I see happening.

As I addressed in my previous article,
[in the era of Opus vibe coding, junior engineers aren't useless](/blog/hire-junior-engineers-now).
We need them to fill in the gap between domain experts and senior engineers so that we can realize
the efficiency gains that we want to see from coding agents.

I've extracted the TODO list here since the previous article got very long. As per the article, I'm
using "domain expert" here to indicate someone that has years of experience in your company but
little to no experience writing code. Many of these experts are excited about fixing their own
problems, and this motivation is special and valuable. Let's empower them.

## Technical TODOs

1. Template projects that encode best practices and security controls from the start, these are your blessed paths that every new Cursor project should start with.
2. Push-button deployment paths that work safely for non-engineers. Make it one click or it's too complicated. Look at [Fastly][1], [Cloudflare][2], or [Heroku][3] to see how they approach push-button deployment. They're surprisingly easy to get started despite targeting engineers.
3. Agent rules and context that guide AI coding agents toward your company's blessed paths before anyone writes a line of code.
4. Guardrails that catch sensitive data access and security issues automatically.
5. Code review agents that help onboard people into safe practices and explain what they're catching and why.
6. Tiered GitHub organization structures that give power to the right people without locking people out. Access to GitHub is no longer an indicator of good engineering judgement. Not everyone needs the _same_ access to GitHub, but everyone needs a safe place to share code.

## Organizational TODOs

1. Create a reach-out team to find the vibe-newbs in your organization who are already using AI tools to code. They're already there, in operations, in customer support, in finance. Find them before they create shadow IT problems.
2. Hire supportive junior engineers who are familiar with AI-assisted coding. Hire them explicitly with the mandate to teach. Value tutoring or mentoring experience.
3. Pair these early-career engineers with domain experts who are vibe coding. Their primary job is to support the domain experts to contribute and bridge the gap with platform engineers.
4. Senior engineering talent should guide and support these entry-level engineers. As you build the platform, grow your early career engineers to contribute to the platform.
5. Invest heavily in your platform. Are you ready for non-engineers to deploy new applications?
6. Investments in better bootstrapping, templates, context, and blessed paths support ALL engineers, not just the most junior. The investments we made in generators have already paid off, but be prepared to support them.
7. A repeat of the above, but go look at how [Fastly][1], [Cloudflare][2], and [Heroku][3] provide templates for new projects with push-button deploys. You need to create your company's preferred templates and push-button deploys that reinforce your company's best practices. AI agents will build to the structures you give them.

The domain experts turning to vibe coding are showing that they're up for a challenge and they're willing to solve problems that no one has solved for them yet. This of the inside of your company as a microcosm of the outside world. The bigger your company is, the more you need to create on-ramps for people to grow into stronger contributors.

If [senior engineers ship 2.5x more AI code than juniors][4] and [AI Savy music producers outperform][5] their peers, then how might your most experienced marketers, corporate financiers, or business developer perform if they're supported with the tools and team mates they need?

[1]: https://www.fastly.com/documentation/solutions/starters/compute-starter-kit-go-default/ 'Fastly 1-click deployment starter kit'
[2]: https://github.com/cloudflare/workflows-starter 'Cloudflare work starter apps with 1 click deploys'
[3]: https://devcenter.heroku.com/start 'Heroku quick start guide'
[4]: https://www.fastly.com/blog/senior-developers-ship-more-ai-code 'survey of 791 developers found a notable difference in how much AI-generated code is making it into production'
[5]: https://www.sonarworks.com/blog/research/ai-music-production-2025 '1 in 4 producers now use AI tools in their workflow'
