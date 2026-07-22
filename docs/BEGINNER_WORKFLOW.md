# TraceRoom Beginner Workflow

This guide explains TraceRoom for someone who has never seen the project, does not know the hackathon plan, and does not know stock-market terms.

## The Idea In One Minute

TraceRoom is a recorder for automated decision-making systems.

Imagine a team of AI helpers is allowed to recommend a financial action. Before anything happens, TraceRoom records:

- what information each helper saw
- what each helper recommended
- whether the information was trustworthy
- whether safety rules approved the decision
- why the final action was allowed or blocked

The demo is not real trading. It uses fake, fixed data so the story is repeatable every time.

## What Problem TraceRoom Solves

Autonomous systems can make decisions quickly, but that creates a question:

> If the system made a bad or risky decision, can we prove exactly why it happened?

TraceRoom answers that question. It acts like a flight recorder for AI decisions.

In the demo, one AI helper receives the wrong price for a company. TraceRoom catches the mismatch before execution and blocks the action.

## Tiny Glossary

**Stock**

A small ownership piece of a company. In this demo, no stock is actually bought or sold.

**Ticker**

A short code for a company. The demo uses `INFY`, which represents Infosys.

**Price**

The amount one share is worth in the demo data.

**Agent**

An AI helper that looks at the same situation and gives a recommendation.

**Evidence**

The facts an agent uses to justify its recommendation.

**Authoritative price**

The trusted price TraceRoom uses as the source of truth.

**Cited price**

The price an agent claims it saw.

**Deviation**

How far the cited price is from the trusted price.

**Tolerance**

The maximum mismatch TraceRoom will allow before calling the evidence unsafe.

**Risk review**

A safety check that decides whether execution is allowed.

**Execution**

In this project, execution means a fake simulated action. It never places a real trade.

**Proof Pack**

A downloadable audit summary that explains what happened and why.

**SigNoz**

An observability tool used to inspect traces, logs, and metrics. In plain language, it helps you see what happened inside the system.

## The Demo Story

TraceRoom has two main demo paths.

## Healthy Session

A healthy session is the normal case.

1. The user clicks **Run Healthy Session**.
2. TraceRoom creates a new recorded session.
3. The trusted price for `INFY` is `1684.50`.
4. All agents use evidence that matches the trusted price.
5. TraceRoom checks the evidence.
6. The evidence passes.
7. The risk review approves the session.
8. TraceRoom marks the fake execution as completed.

What this proves:

TraceRoom can record a clean decision from start to finish.

## Fault Session

A fault session is the important demo.

1. The user clicks **Run Fault Session**.
2. TraceRoom creates a new recorded session.
3. The trusted price for `INFY` is still `1684.50`.
4. One agent, called **Momentum Agent**, receives a corrupted price: `1819.26`.
5. Momentum Agent cites `1819.26` as evidence.
6. TraceRoom compares that cited price against the trusted price.
7. The mismatch is `8.00%`.
8. The allowed tolerance is only `2.00%`.
9. TraceRoom marks `EVIDENCE_INTEGRITY` as failed.
10. The risk review vetoes the session.
11. Execution is blocked.

What this proves:

TraceRoom can catch bad evidence before an autonomous system acts on it.

## What The User Sees In The App

### Command Area

The left side shows:

- buttons to run healthy or fault sessions
- a filter for all, healthy, or fault sessions
- previous recorded sessions

### Decision Detail

This is the main screen for a selected session.

For the fault session, the key values are:

- Momentum claim: `1819.26`
- Authoritative price: `1684.50`
- Deviation: `8.00%`
- Tolerance: `2.00%`
- Failed rule: `EVIDENCE_INTEGRITY`
- Result: `EXECUTION BLOCKED`

A judge should understand the failure from this screen in under 10 seconds.

### Overview Tab

This tab explains the final result.

It shows:

- whether the session was executed or blocked
- the Evidence Integrity Score
- the consensus result
- the safety rules that passed or failed
- the lifecycle timeline

### Agents Tab

This tab shows what each AI helper recommended.

The demo agents are:

- Momentum Agent
- Relative Value Agent
- Contrarian Agent

You do not need to understand their trading styles. For the demo, the important part is that one of them used bad evidence and TraceRoom caught it.

### Replay Tab

This tab walks through the incident one step at a time.

For the fault session, it explains:

1. The trusted market snapshot was captured.
2. Momentum Agent received the corrupted price.
3. Momentum Agent cited the wrong price.
4. TraceRoom checked the trusted price.
5. TraceRoom calculated the mismatch.
6. The mismatch exceeded the allowed tolerance.
7. The safety rule failed.
8. Execution was blocked.
9. Telemetry recorded the incident.

### Audit Tab

This tab is for someone reviewing the decision later.

It includes:

- a plain-language answer from the Auditor Panel
- a SigNoz trace link or search hint
- an Audit Proof Pack export
- a markdown preview of the proof pack

## What Happens Behind The Scenes

When a session runs, TraceRoom does this:

1. Creates a session ID.
2. Loads the fixed `INFY` demo data.
3. Builds three agent recommendations.
4. Runs a final vote.
5. Checks evidence against the trusted fixture.
6. Calculates an evidence score.
7. Runs risk rules.
8. Allows or blocks fake execution.
9. Saves the full session to SQLite.
10. Emits telemetry for SigNoz.
11. Makes the session available in the UI.

## Why The Fault Is Blocked

The fault is blocked because the agent's claim is too far away from the trusted price.

The trusted price is:

```text
1684.50
```

Momentum Agent claimed:

```text
1819.26
```

That is an `8.00%` difference.

TraceRoom only allows a `2.00%` difference.

Because `8.00%` is larger than `2.00%`, TraceRoom fails the `EVIDENCE_INTEGRITY` rule and blocks execution.

## What Makes This A Good Demo

The demo is strong because it is simple:

- one trusted number
- one corrupted number
- one clear mismatch
- one failed safety rule
- one blocked execution
- one proof pack explaining why

It shows the product idea without needing real markets, real trades, or a complex model.

## What To Say When Explaining TraceRoom

Use this short explanation:

> TraceRoom records how autonomous financial agents make decisions. In this demo, one agent sees a corrupted price. TraceRoom compares that claim against the trusted price, detects an 8% mismatch where only 2% is allowed, fails the evidence-integrity rule, and blocks execution. Then it gives auditors a replay and proof pack showing exactly what happened.

## What TraceRoom Does Not Do

TraceRoom does not:

- place real trades
- connect to broker accounts
- use real money
- promise that agents are always correct
- replace human review

TraceRoom does:

- record decisions
- explain failures
- block unsafe execution
- create audit evidence
- connect the product story to SigNoz telemetry
