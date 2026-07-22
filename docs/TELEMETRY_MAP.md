# Telemetry Map

## Healthy Debate Trace

Root span:

- `debate.session`

Children:

- `market.snapshot`
  - `market.quote`
- `debate.round.proposal`
  - three `agent.proposal`
    - one `llm.call` per agent
- `evidence.validation`
- `debate.round.cross_examination`
  - three `agent.rebuttal`
    - one `llm.call` per agent
- `debate.round.final_vote`
  - three `agent.final_vote`
    - one `llm.call` per agent
- `consensus.resolve`
- `risk.review`

This totals 27 spans. A separate `decision.evaluation` trace is linked to the
source debate span.

## Core Attributes

- `traceroom.session.id`
- `traceroom.session.mode`
- `traceroom.scenario`
- `market.snapshot.id`
- `market.symbol`
- `agent.id`, `agent.name`, and `agent.persona`
- proposal/final-vote position and confidence
- evidence validation counts and status
- consensus position, supporters, dissenters, and changed agents
- risk status, triggered rules, and `risk.trade_allowed`
- LLM provider, model, token counts, cost, and latency

## Metrics

- `traceroom.llm.calls`
- `traceroom.llm.input_tokens`
- `traceroom.llm.output_tokens`
- `traceroom.llm.cost_usd`
- `traceroom.llm.latency_ms`
- evaluation completion and decision-regret metrics
