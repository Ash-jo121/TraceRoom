# SigNoz Setup

TraceRoom includes Foundry files for SigNoz:

- `casting.yaml`
- `casting.yaml.lock`

Install and run SigNoz with Foundry:

```bash
foundryctl gauge -f casting.yaml
foundryctl forge -f casting.yaml
foundryctl cast -f casting.yaml
```

Expected local URLs:

- SigNoz UI: `http://localhost:8080`
- SigNoz MCP: `http://localhost:8000`

## Dashboard: Decision Integrity

Create a dashboard with Query Builder panels for:

- decisions by outcome
- P95 decision latency
- risk veto rate
- evidence integrity violations
- average evidence integrity score
- workflow integrity violations
- token usage/cost by agent
- proof packs exported

## Alerts

Suggested alerts:

- Evidence integrity critical: evidence violation count greater than `0` or status `CRITICAL`
- Workflow integrity critical: execution attempted without approved risk review
- Deadlock: outcome equals `DEADLOCKED`
- Session cost budget: total session cost greater than `0.20`

Alerts are observability responses. The risk engine blocks synchronously before alerts evaluate.
