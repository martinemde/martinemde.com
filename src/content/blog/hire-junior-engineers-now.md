---
title: 'We Need Junior Engineers Now More Than Ever'
date: 2025-10-28
author: Martin Emde
description: 'AI coding tools are creating a new type of junior engineer: domain experts who can vibe code but need support to deploy safely'
published: true
slug: hire-junior-engineers-now
---

Vibe coding is allowing a new category of junior programmers to emerge from unlikely places.

When a vibe coder joins an engineering channel and asks a simple question: "How do I get a domain name so I can share this with my team?" it's all too easy to assume a level of engineering know-how that isn't yet developed.

When this happened at my work, I joined a Zoom meeting to try to help. What I saw both inspired me and shifted my view about the role of engineering in larger organizations.

Most people think that the massive shift that's coming will put junior engineers out of a job. I disagree.

We're facing a massive shift in how engineering teams need to work, and if you think we'll just fire
all the juniors and then sit around guiding swarms of coding agents, you're going to be surprised.

## The Gap Between Vibes and Infrastructure

The traditional engineering answer to "how do I share this?" goes something like: "Work with platform ops to get a deployment set up. Make a PR to the terraform to allocate a new internal subdomain. If you're deploying a docker container, can you configure an ECR repo too? The app generator should help you do this if it follows our standard framework guidelines."

To a Customer Service manager or Accountant who just vibed out a solution to their problem, this is complete gibberish.

If they're persistent, they'll ask again. They'll probably feel discouraged. Maybe they'll figure it out themselves in ways that would make security teams blush.

This creates problems no company wants:

- Domain experts, people with deep experience in your company, get discouraged from contributing to
  AI driven solutions
- [Shadow IT](https://en.wikipedia.org/wiki/Shadow_IT) starts cropping up everywhere, allowing customer data, financial information, or company IP to leak outside of IT controls
- Senior engineers spending days supporting small contributions from inexperienced vibe coders, erasing the productivity promise of AI
- Security vulnerabilities created by well-meaning people who don't know any better

The technical solutions that might work for an engineer could be dangerous for inexperienced vibe-coders. The gap is huge between a working prototype in cursor and a safe deployment.

## Vibe Coding

As an experienced engineer, I see huge productivity gains from using AI coding tools, but they're not without their problems.

Engineers can see when our coding agents are going sideways. When Claude starts dropping a new `ALLCAPS.md` for every prompt, when it create the 3rd copy of a script it already wrote, we know it's time to reign it in and adjust rules or clarify requirements. When Claude does something stupid, we reset back to the last commit.

New vibe coders don't know any of this. They don't use git. They don't reset context. They use one conversation in cursor for the entire program they're writing.

Junior vibe coders end up with a directory containing a mix of sensitive data, cross-linked python files, 20 random scripts for one off changes, and 50 variations of `SIMPLE_QUICK_STARTUP_README_FIXED.md`. Worse still, they do not know which files might contain PII or financial data. Working with sensitive data is their job. The concept of sanitized test data is foreign to them.

Vibe Coding is its own skill set. It's an offshoot of engineering that benefits from the skills we've built as engineers. Knowing what a good application looks like help you build a good application.

After helping my son and my wife get started with Cursor, I can see how sharing my [senior thinking](https://obie.medium.com/what-happens-when-the-coding-becomes-the-least-interesting-part-of-the-work-ab10c213c660) with them as they learn changes the sorts of outcomes they get.

> If I’m working alone, it all stays internal. If I’m pairing with someone else that’s senior, then the thinking surfaces naturally in conversation but is taken for granted. If I’m pairing with someone less experienced, I might slow down enough to explain parts of my senior thinking, but definitely not all. It would bog us down too much.
>
> - Obie Fernandez

Life-long engineers, ones that grew up with an engineer parent or were introduced to abstract
systems early, have this deeply engrained in their approach to life. When things go wrong or get
difficult for vibe coders, if they don't have any of this to fall back on, they end up with very
different results than experienced engineers.

It used to be that this rite of passage, understanding the system, also meant that once you got access to `rm -rf` you had enough background to know it was dangerous. Now we're facing a shift in who is capable of what, and we're going to need to decide where we want to go.

## We've Been Here Before

Engineers faced a similar crossroads years ago. Dan McKinley captured it perfectly in his ["Egoless Engineering"](https://egoless.engineeriang/) talk.

He describes a designer who was encouraged to contribute to an application. When the designer accidentally broke the build late at night, the team had a choice: lock it down so only "real engineers" could deploy, or make deploys safe for everyone.

McKinley made chose the path of empowerment: "Randy is in the deploy group now. The how and when can be worked out off-list, but it is now _possible_ for him to deploy to prod."

That decision required a mindset shift. Engineers had to ensure deploys were safe for _anyone_ to run. They had to build systems that enabled contribution instead of building gates that prevented it.

This empowerment is what unlocked what we might call modern DevOps.

Now we're doing it again, but the "deploy group" is much larger than it was before and contains
a much more junior set of people.

## The Skill Spectrum

Traditionally, a "junior engineer" meant someone fresh from college or a programming bootcamp. They were people that proved they could program _before_ getting hired. They could make commits, install dependencies, and maybe run simple deployments. They knew the lingo. They could speak like an engineer.

Now the code skill spectrum is doubling. A new "expert junior" tier has been added. They know a ton about the business domain, but they know next-to-nothing about engineering. There may be as many people in this new group as our entire existing engineering organization.

## The New Engineering

Some of the best junior hires were teachers, healthcare workers, or business analysts who brought 10+ years of domain expertise along with their junior engineering skill set. They had _senior thinking_ from a different domain, and these executive skills somewhat compensated for their lack of engineering knowledge.

Domain Expert Vibe Coders (the new "expert juniors") bring deep domain knowledge, and now that they come from within our businesses, they have direct useful experience. They can build prototypes with AI assistance that solve very specific problems that impact only their jobs. Stuff they would struggle to ask an engineer to help them with (if they were lucky enough to have an engineer contact in the company).

We used to consider someone junior when they were a _Classically Trained Entry-Level Engineer_. They have 4 year CS degrees or equivalent experience. They understood coding enough to convince a series of instructors, employers and peers.

These entry-level engineers are some of the people that AI Doomers and AGI-Optimists are trying to convince us that we won't need anymore. The doom and gloom story says that juniors are useless now because a senior has a fleet of juniors to do their work. People (rightly) worry how we will train the next generation of engineers if the engineering org is just senior talent now.

## The Full-Stack Team

Engineering needs to spread out across the entire company. We need to redefine the full-stack team
to span from accounting to engineering. Including a designer and a product manager on your team is no
longer "full-stack" enough. You need a gradient of engineers embedded in every part of your company.

To get the most of their expertise, we can pair domain experts with entry-level engineers. You get domain expertise (accounting, legal, HR, operations) combined with the growing system thinker with the engineering vocabulary. The entry-level engineer provides a bridge from accounting speak into infrastructure speak. They help the Senior Engineers focus on capital-E engineering.

Senior Engineers become platform builders. In the before times, senior engineers would work with
product managers and designers to understand the domain. Now we need seniors to focus on the hard
stuff. Engineers are domains expert in engineering. They are need to create the systems that make
safe self-service possible. They need to support the entry-level and junior experts, help them
level up, and give them the tools to contribute effectively.

This gradient of engineer skill, from vibe-newb to junior to senior, improves the efficiency of
each conversation while allowing work to continue at the right level of abstraction, where each
person is most skilled.

## What This Means for Hiring

Now the shift begins: Domain experts are the new junior engineering talent. Entry-level
engineers fresh out of college have a natural progression to senior while filling a need in the
company that keeps seniors effective and productive.

It would be a huge mistake to stop hiring early career "junior" programmers. They're comparatively
less junior than the domain experts that just picked up cursor. A 4-year CS degree puts them
squarely in the middle of the pack, now that the spectrum has doubled.

If you fail to have these juniors around, you'll end up spending senior engineering time to prevent
vibe coders from leaking company documents or creating headaches. Worse yet, since engineering
management is afraid to waste their team's time, it's often the managers that deal with these new
vibe coders. The cost of deploying a quick script that generates a power point presentation, when
supported by department lead engineering managers and a platform ops team, is astronomical. This is
not what coding agents were supposed to do.

## In the weeds

Here's what I'm thinking about for supporting this next wave of engineers:

1. Template projects that encode best practices and security controls from the start, these are your blessed paths that every new Cursor project should start with.
2. Push-button deployment paths that work safely for non-experts. Make it one click or it's too complicated.
3. Agent rules and context that guide AI coding agents toward your company's blessed paths before anyone writes a line of code.
4. Guardrails that catch sensitive data access and security issues automatically.
5. Code review agents that help onboard people into safe practices and explain what they're catching and why.
6. Tiered GitHub organization structures with appropriate access controls, not everyone needs the _same_ access to GitHub, but everyone needs a safe place to share code.
7. Data movement controls that prevent accidental leaks to unapproved channels.

If _anyone_ can push vibe-coded apps straight to production, the guardrails need to match this new reality.

## tl;dr

1. Create a reach-out team to find the vibe-newbs in your organization who are already using AI tools to code. They're already there, in operations, in customer support, in finance. Find them before they create shadow IT problems.
2. Hire supportive junior engineers who are familiar with AI-assisted coding. Hire them explicitly with the mandate to teach. Value tutoring or mentoring experience.
3. Pair these early-career engineers with domain experts who are vibe coding. Their primary job is to support the domain experts to contribute and bridge the gap with platform engineers.
4. Senior engineering talent should guide and support these entry-level engineers. As you build the platform, grow your early career engineers to contribute to the platform.
5. Invest heavily in your platform. _Are you ready for non-engineers to deploy new applications?_
6. Investments in better bootstrapping, templates, context, and blessed paths support ALL engineers, not just the most junior. This is not a "nice to have", it's foundational infrastructure.
7. Look at how Fastly, Cloudflare, and Heroku set up templates for new projects with push-button deploys. You need to create your company's preferred templates and push-button deploys that reinforce your company's best practices. AI agents will build to the structures you give them.
8. The people writing code now might not even know what language they've written their application with (it's probably Python). Your infrastructure needs to encode best practices so deeply that it becomes automatic.

Get this right, and we unlock an enormous amount of domain expertise that was previously bottlenecked behind engineering teams. Get it wrong, and we create security nightmares, devalue or discourage talent, or destroy efficiency by applying senior engineering time ineffectively.

The technical problems are solvable. We've done this before with the DevOps movement. We can do it again with vibe coding domain experts. It requires acknowledging that the spectrum of "engineer" is now much broader than it used to be and building our teams accordingly.
