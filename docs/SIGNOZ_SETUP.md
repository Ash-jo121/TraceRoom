# SigNoz Setup

TraceRoom includes Foundry deployment files:

- `casting.yaml`
- `casting.yaml.lock`

Install and run SigNoz with Foundry:

```bash
foundryctl gauge -f casting.yaml
foundryctl forge -f casting.yaml
foundryctl cast -f casting.yaml
```

Expected local endpoints:

- SigNoz UI: `http://localhost:8080`
- SigNoz MCP: `http://localhost:8000`
- OTLP/HTTP collector: `http://127.0.0.1:4318`

When Foundry runs inside WSL, ensure port `4318` is exposed to Windows.

The API connects to the MCP HTTP transport with:

```dotenv
SIGNOZ_MCP_URL=http://localhost:8000/mcp
SIGNOZ_MCP_TIMEOUT_MS=2500
```

If the MCP server does not already hold the SigNoz credentials, also set
`SIGNOZ_API_KEY`. The backend only selects read-only MCP tools. In the UI,
open a recorded session's **Audit** tab and use **Ask the Auditor**. The
response badge distinguishes live `SigNoz MCP` evidence from the deterministic
session fallback used when MCP is unavailable.

The API route is:

```text
POST /sessions/:sessionId/auditor/search
Content-Type: application/json

{"question":"Why was execution blocked?"}
```

## Verify A UI-Triggered INFY Trace

1. Run `npm run dev` from the repository root.
2. Open `http://127.0.0.1:5173`.
3. Click **Run Healthy Session**.
4. Copy the trace ID printed by the API or shown on the Evidence page.
5. Search the `traceroom-debate-simulation` service for that trace ID.

The expected root is `debate.session`. A successful healthy run has 27 spans:

- `market.snapshot` and `market.quote`
- `debate.round.proposal`, three `agent.proposal`, and three `llm.call`
- `evidence.validation`
- `debate.round.cross_examination`, three `agent.rebuttal`, and three `llm.call`
- `debate.round.final_vote`, three `agent.final_vote`, and three `llm.call`
- `consensus.resolve`
- `risk.review`

The separate `decision.evaluation` trace links back to the debate trace.
Batch export can take a few seconds before a trace appears in SigNoz.

## Suggested Dashboard Panels

- decisions by outcome
- P95 debate latency
- risk veto rate
- evidence-integrity violations
- LLM latency and cost by agent/stage
- final-vote changes
- decision regret

## Suggested Alerts

- evidence validation status is not `valid`
- risk review status is `VETOED`
- consensus status is `DEADLOCKED`
- LLM call or debate session has error status
- session cost exceeds the configured budget
