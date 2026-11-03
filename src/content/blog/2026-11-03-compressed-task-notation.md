---
name: Compressed Task Notation
published: '2026-11-03T23:05:06.546Z'
updated: '2026-11-03T23:05:07.387Z'
author: Martin Emde
summary: Learning the language of clearly expressing a task.
post-status: published
slug: compressed-task-notation
---
My article about [agents dropping spaces](https://martinemde.com/2026/10/10/agents-drop-spaces-when-talking-to-each-other) has come up a few times. I found it interesting and tried to dig into how to learn it. It's clearly very efficient, very clear. I aspire to be able to instruct the agent so clearly.

The agent calls this **compressed task notation**. Sol says, "It saves space by packing instructions together. Some of it is useful; the missing spaces mostly make it harder to read".

Compressed task notation lays out a clear **goal**, it clarifies the **authorization**, it sets out the **task**, the **approval** criteria, any **limits**, and an explicit **deliverable**. Reading it made it clear just how wibbly wobbly my usual prompting language is.

```
The useful technique is to separate intent, authority, limits, evidence, and next action:

  GOAL: Find a supported status query.
  SCOPE: Read-only research.
  EVIDENCE: Exact-model docs, source, or tests.
  OUTPUT: Proposed query + expected response + risks.
  APPROVAL: Report before sending; wait for GO.
  FORBIDDEN: Control commands, ACKs, recurring polling.
```

Sol encouraged me to "Learn the structure, not the word-cramming. Clear labels and explicit verbs give you most of the efficiency with far less ambiguity".

The following is a full example of a the compressed task notation, marked up so we can learn what's going on, and maybe learn to be better at prompting. *Note that Blastoise is my washing machine... and yes the dryer is obviously Charizard.*

```markdown
[AUTHORIZATION — one status request permitted in principle]
USERNOWAUTHORIZESoneactiveBlastoiseSTATUSQUERY "lets try gettingBlastoisegiveusstate"

[SUPERSEDES — replaces the earlier passive-only restriction]
supersedespassiveonlyONLYoneboundedread-onlystatusrequest notcontrol/ACK/cloud/pollschedule.

[EVIDENCE REQUIREMENT — verify the query; do not guess]
NeedidentifyGENUINEsupportedexactmodelstatus-queryexistingrethinkprotocol docs source upstream tests, no guessedreplay.

[CURRENT MODE — research first; disclose behavior and risks]
Readonlyresearchfirst exposeexactpacket/opcode API intent expectedresponse no wake/control semantics unknownrisks;

[APPROVAL GATE — report before transmitting]
reportparentbeforeSEND.

[CONTEXT — device identity and current information]
DeviceFAFXU22007 connectedOff stalecontacts.

[DECISION AUTHORITY — parent selects and approves the query]
ParentwillchooseoneknownqueryandGO.

[PROHIBITIONS — no recurring polling or control actions]
No autonomousperiodicpoll, no start/power/door/ACK/setProperty.

[ASSIGNMENT AND DELIVERABLE — investigate and write the proposal]
Ownsourceprotocolinvestigation/tmp/rethink-washer-state-query-plan.md shortcommand+evidence.

[RESEARCH SCOPE — suggested code to inspect]
Caninspectdevice.ts sends/handlers upstream genericrequeststatus.

[REPLY REQUIREMENT — explicitly report readiness or a blocker]
Replyexplicitready/blocker.

[IMMEDIATE STOP CONDITION — transmission is not yet permitted]
No SENDyet.
```
