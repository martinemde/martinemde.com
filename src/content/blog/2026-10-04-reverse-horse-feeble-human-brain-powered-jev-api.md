---
title: Introducing reverse.horse - The Feeble Human Brain Powered Jev API
date: '2026-10-04T16:20:42.174Z'
author: martinemde
published: true
slug: reverse-horse-feeble-human-brain-powered-jev-api
categories: []
micropub:
  type:
    - h-entry
  properties:
    name:
      - Introducing reverse.horse - The Feeble Human Brain Powered Jev API
    content:
      - "[Reverse.horse](https://reverse.horse) is an attempt to understand and explain the new AI model [Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev), _by using your feeble human brain as the model_. Place yourself in-request and respond as best as you can to incoming questions.\n\nInstead of reading this whole thing, I suggest you go try it: https://reverse.horse. It will run you through the process and types of responses and you can get a feel for what this model does directly.\n\n## What is Jev?\n\n[Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)\_is a new AI model that has taken the internet by storm in recent weeks. The concept is based on the idea that if we make “good enough” intelligence\__cheap_\_and\__fast_, it will explode in usefulness, expanding the use of intelligence into more places than we ever thought practical.\n\nJev is a different direction than most LLMs have taken. ChatGPT and Claude try to be ever bigger and smarter to take over for your brain, while Jev asks only for ever-more-decomposed questions. I picked this model to clone because it impressed me. It opened up new ideas for working with intelligence, and, like all great ideas, it seems so simple.\n\nThe API route\_`systemone`\_(that's \"System One\") implies the behavior of the model. System One comes from Daniel Kahneman’s\_[_Thinking, Fast and Slow_](https://en.wikipedia.org/wiki/Thinking,_Fast_and_Slow), which defines it as quick, gut-reaction thinking. System Two is what almost all modern LLMs are doing:\__Reasoning…_ \n\nThe name \"Jev\" come's from Jevons Paradox, which has been a buzzy term for a little know behavior of demand elasticity: when you make consumption of a resource more efficient, sometimes you use more of that resource than you did before. Cheaper electricity makes people apply electricity in places where it was previously too expensive to do so.\n\n## Why?\n\nBecause! Reverse.horse is something between a tutorial and an art project.\n\nIt is a functioning API that matches the\_[Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)\_`/v1/systemone`\_format. It presents the questions asked on the API to anyone that is connected, and the results become the response from the API. Send real questions to reverse.horse and any human connected can scramble to respond before the 30 second response timeout.\n\nIt’s also a tutorial intended to help you understand exactly what Jev _is_ and what the\_[3 question types](http://127.0.0.1:3000/help#types)\_mean. By using your human brain to answer in place of the model, you get an intuitive sense of what Jev is doing.\n\nIt becomes immediately apparent that you suck at this. Jev can usually answer in under 1/10th of a second, and it can do thousands of questions like this in the time it takes you to answer a single one. You may even notice that for every answer that you carefully answer correctly, Jev is within a few points of what you answered. Remarkable, isn’t it?\n\n## Why “Reverse Horse”?\n\nThe name comes from Cory Doctorow’s\_[reverse centaur](https://pluralistic.net/2022/04/17/revenge-of-the-chickenized-reverse-centaurs/), a situation created by AI that places the human in the position of being a meat body that does what the AI tells it. Instead of a good centaur, a human brain controlling a powerful horse body, you have the opposite: an “unthinking” horse brain controlling the feeble human body.\n\nThe irony here is that I’ve inverted it. By using your feeble human brain to answer as the “unthinking” AI, I’m pointing out just how slow you are at it, and how impressively fast and accurate Jev is. When I started the project, the example questions were actually too complex to answer within a reasonable timeout, so I had to break them down. Feeble human brain!\n\n## Why the 30 second timeout?\n\nIt’s kind of stressful, right? It’s there for 2 reasons:\n\n1. I’m trying to make you give your gut reaction to the question. The timer makes it clear just how slow we are at this. 30 seconds is 300 times longer than Jev usually takes to respond.\n2. This is a real, if impractical, API. You can actually\_[send a request to it](http://127.0.0.1:3000/request)\_with curl. 30 seconds seemed like the longest reasonable timeout for a held-open request. I’m waiting for the moment when this 30 second timeout causes the poor server to get overloaded.\n\n## How does reverse.horse work?\n\nIn theory, everyone answering questions is connected to a web socket and will be asked live the questions that arrive at the API. Their answers are assembled into the response. That’s the goal, and it works across a small group, but it’s almost certainly bound to break if too many people visit. I look forward to finding out the strange new ways this can break.\n\n## How did I not know about the `.horse` TLD!?\n\nWelcome to a whole new world of domain ideas! The domain [reverse.horse](https://reverse.horse) is me stupidly spending $25 on a joke. Secretly, I've been chomping at the bit to have a good reason to buy a `.horse` domain for years. Every new idea I have gets a run through \"could this be a .horse domain?\" I already have another project that planned that may end up on `.horse`. It's my favorite silly TLD because it begs so many questions: Why horse? Why aren't there other animal TLDs? Where's the demand for this TLD coming from? How has this not created a new economic boom in horse related websites?\n## Enough silliness!\n\nPlease go [try it out](https://reverse.horse) and [let me know what you think](https://github.com/martinemde/reverse-horse/discussions/2)."
    slug:
      - reverse-horse-feeble-human-brain-powered-jev-api
    summary:
      - >-
        An attempt to understand and explain the new AI model Jev, by using your
        feeble human brain as the model.
    updated:
      - '2026-10-04T16:20:40.633Z'
    visibility:
      - public
    published:
      - '2026-10-04T16:20:42.174Z'
    post-status:
      - published
    featured: []
    description: []
    category: []
---
[Reverse.horse](https://reverse.horse) is an attempt to understand and explain the new AI model [Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev), _by using your feeble human brain as the model_. Place yourself in-request and respond as best as you can to incoming questions.

Instead of reading this whole thing, I suggest you go try it: https://reverse.horse. It will run you through the process and types of responses and you can get a feel for what this model does directly.

## What is Jev?

[Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev) is a new AI model that has taken the internet by storm in recent weeks. The concept is based on the idea that if we make “good enough” intelligence _cheap_ and _fast_, it will explode in usefulness, expanding the use of intelligence into more places than we ever thought practical.

Jev is a different direction than most LLMs have taken. ChatGPT and Claude try to be ever bigger and smarter to take over for your brain, while Jev asks only for ever-more-decomposed questions. I picked this model to clone because it impressed me. It opened up new ideas for working with intelligence, and, like all great ideas, it seems so simple.

The API route `systemone` (that's "System One") implies the behavior of the model. System One comes from Daniel Kahneman’s [_Thinking, Fast and Slow_](https://en.wikipedia.org/wiki/Thinking,_Fast_and_Slow), which defines it as quick, gut-reaction thinking. System Two is what almost all modern LLMs are doing: _Reasoning…_ 

The name "Jev" come's from Jevons Paradox, which has been a buzzy term for a little know behavior of demand elasticity: when you make consumption of a resource more efficient, sometimes you use more of that resource than you did before. Cheaper electricity makes people apply electricity in places where it was previously too expensive to do so.

## Why?

Because! Reverse.horse is something between a tutorial and an art project.

It is a functioning API that matches the [Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev) `/v1/systemone` format. It presents the questions asked on the API to anyone that is connected, and the results become the response from the API. Send real questions to reverse.horse and any human connected can scramble to respond before the 30 second response timeout.

It’s also a tutorial intended to help you understand exactly what Jev _is_ and what the [3 question types](http://127.0.0.1:3000/help#types) mean. By using your human brain to answer in place of the model, you get an intuitive sense of what Jev is doing.

It becomes immediately apparent that you suck at this. Jev can usually answer in under 1/10th of a second, and it can do thousands of questions like this in the time it takes you to answer a single one. You may even notice that for every answer that you carefully answer correctly, Jev is within a few points of what you answered. Remarkable, isn’t it?

## Why “Reverse Horse”?

The name comes from Cory Doctorow’s [reverse centaur](https://pluralistic.net/2022/04/17/revenge-of-the-chickenized-reverse-centaurs/), a situation created by AI that places the human in the position of being a meat body that does what the AI tells it. Instead of a good centaur, a human brain controlling a powerful horse body, you have the opposite: an “unthinking” horse brain controlling the feeble human body.

The irony here is that I’ve inverted it. By using your feeble human brain to answer as the “unthinking” AI, I’m pointing out just how slow you are at it, and how impressively fast and accurate Jev is. When I started the project, the example questions were actually too complex to answer within a reasonable timeout, so I had to break them down. Feeble human brain!

## Why the 30 second timeout?

It’s kind of stressful, right? It’s there for 2 reasons:

1. I’m trying to make you give your gut reaction to the question. The timer makes it clear just how slow we are at this. 30 seconds is 300 times longer than Jev usually takes to respond.
2. This is a real, if impractical, API. You can actually [send a request to it](http://127.0.0.1:3000/request) with curl. 30 seconds seemed like the longest reasonable timeout for a held-open request. I’m waiting for the moment when this 30 second timeout causes the poor server to get overloaded.

## How does reverse.horse work?

In theory, everyone answering questions is connected to a web socket and will be asked live the questions that arrive at the API. Their answers are assembled into the response. That’s the goal, and it works across a small group, but it’s almost certainly bound to break if too many people visit. I look forward to finding out the strange new ways this can break.

## How did I not know about the `.horse` TLD!?

Welcome to a whole new world of domain ideas! The domain [reverse.horse](https://reverse.horse) is me stupidly spending $25 on a joke. Secretly, I've been chomping at the bit to have a good reason to buy a `.horse` domain for years. Every new idea I have gets a run through "could this be a .horse domain?" I already have another project that planned that may end up on `.horse`. It's my favorite silly TLD because it begs so many questions: Why horse? Why aren't there other animal TLDs? Where's the demand for this TLD coming from? How has this not created a new economic boom in horse related websites?
## Enough silliness!

Please go [try it out](https://reverse.horse) and [let me know what you think](https://github.com/martinemde/reverse-horse/discussions/2).
