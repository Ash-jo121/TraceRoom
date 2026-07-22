# Telemetry Map

## Traces

Primary session span:

- `decision.session`

Child spans:

- `market.snapshot`
- `agent.argument`
- `evidence.validation`
- `consensus.resolution`
- `risk.review`
- `trade.execution.attempt`
- `trade.execution` only when approved
- `audit.proof_pack.export`

## Core Attributes

- `session.id`
- `ticker`
- `mode`
- `outcome`
- `agent.name`
- `position`
- `confidence`
- `evidence_integrity.status`
- `risk.approved`
- `failed_rules`
- `traceroom.version`

## Logs

Structured log events should include:

- `session.created`
- `market.snapshot.ready`
- `agent.proposal`
- `agent.critique`
- `agent.final_vote`
- `consensus.resolved`
- `evidence.validation.failure`
- `risk.review.completed`
- `trade.blocked`
- `trade.executed`
- `audit.proof_pack.exported`

## Metrics

Implemented demo metrics:

- `traceroom.decision.count`
- `traceroom.evidence.violation.count`
- `traceroom.evidence.integrity.score`
- `traceroom.risk.rule.trigger.count`
- `traceroom.audit.proof_pack.count`

Existing LLM/evaluation metrics remain available for the earlier prototype path.
