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

## Controlled Scenario Signals

- Evidence fault: root `fault.type=evidence-price-deviation`,
  `evidence.blocked=true`, `pipeline.short_circuited=true`, and
  `pipeline.block_reason=EVIDENCE_INTEGRITY`. The root and evidence spans have
  error status; no cross-examination, final-vote, consensus, risk-review, or
  evaluation spans are created.
- Risk veto: `scenario.type=directional-risk-veto`,
  `scenario.votes_overridden`, the original and forced vote mappings, the
  original and forced `MAX_PRICE_MOVE` thresholds, and risk rule
  `MAX_PRICE_MOVE`
- Deadlock: `scenario.type=deadlock`, `scenario.votes_overridden`, the original
  and forced vote mappings, 1/1/1 final-vote counts,
  `consensus.status=DEADLOCKED`, and risk rule `CONSENSUS_REQUIRED`
- Error: an additional `workflow.recording` span and the root `debate.session`
  span have error status; the session record exposes
  `CONTROLLED_WORKFLOW_ERROR`

Healthy, risk-veto, and deadlock runs retain the 27-span workflow. The
controlled-error run has 28 spans because it adds the failed recording span
after all normal stages have executed. The evidence-fault run has 11 spans:
the root, market snapshot and quote, proposal round with three agent/LLM pairs,
and evidence validation. Its shorter trace is evidence that the gate prevented
five downstream stages from running.

## Core Attributes

- `traceroom.session.id`
- `traceroom.session.mode`
- `traceroom.scenario`
- `scenario.injected`, `scenario.type`, and `scenario.votes_overridden`
- `scenario.vote_override_count`
- `pipeline.gate.status`, `pipeline.blocked_at`,
  `pipeline.block_reason`, and `pipeline.short_circuited`
- `market.snapshot.id`
- `market.symbol`
- `agent.id`, `agent.name`, and `agent.persona`
- proposal/final-vote position and confidence
- evidence validation counts and status
- consensus position, supporters, dissenters, and changed agents
- risk status, triggered rules, and `risk.trade_allowed`
- `decision.outcome`, controlled fault type, and error stage where applicable
- LLM provider, model, token counts, cost, and latency

For risk-veto and deadlock runs, `debate.round.final_vote` has one
`scenario.vote_override` event per agent:

- `agent.id`
- `vote.original_position`
- `vote.forced_position`
- `vote.overridden`

The `agent.final_vote` and child `llm.call` spans retain the real generated
output. The round-span events disclose exactly how the test harness transformed
that output before consensus.

## Metrics

- `traceroom.llm.calls`
- `traceroom.llm.input_tokens`
- `traceroom.llm.output_tokens`
- `traceroom.llm.cost_usd`
- `traceroom.llm.latency_ms`
- evaluation completion and decision-regret metrics
