# TraceRoom

TraceRoom is a decision-observability and audit platform for autonomous
financial agents. It turns every proposed financial action into a traceable,
inspectable, and replayable decision record backed by SigNoz.

The multi-agent financial workflow is the instrumented workload, not the
product. TraceRoom is the audit and governance layer around that workload;
SigNoz provides the traces, correlated logs, metrics, dashboards, and alerts
used to investigate its behavior.

No real trades, broker credentials, or live order placement are used.

```text
Agents recommend.
Consensus selects.
The risk engine governs.
TraceRoom audits.
SigNoz makes the evidence observable.
```

## Stack

- Node/TypeScript API and agent pipeline
- React/Vite frontend
- SQLite persistence using Node's built-in `node:sqlite`
- OpenTelemetry traces, logs, and metrics exported to SigNoz
- Foundry deployment files: `casting.yaml` and `casting.yaml.lock`

## Run Locally

Install dependencies:

```bash
npm install
npm --prefix frontend install
```

Use Node.js 22.13 or newer. TraceRoom uses the built-in `node:sqlite` module,
which is not available in Node.js 20.

Configure the LLM variables in `.env`, start SigNoz/Foundry, then run:

```bash
npm run dev
```

Open `http://127.0.0.1:5173`. The command page launches the canonical INFY
evidence breach, then moves into a live agent room while the pipeline runs.
The incident lab exposes all five deterministic scenarios, and the evidence
page combines natural-language SigNoz MCP investigation with a downloadable
SHA-256 proof receipt. Every run persists the real agent-stage outputs and
emits a fresh `debate.session` trace.

The interface is split into four purpose-built spaces:

- **Command** tells the product story and launches the breach.
- **Agent room** renders the active reasoning network on an interactive canvas,
  then replays recorded agent transmissions.
- **Incidents** compares healthy, evidence-fault, risk-veto, error, and deadlock
  sessions without collapsing them into a generic dashboard.
- **Evidence** reconstructs a selected decision through SigNoz MCP and exports
  an integrity-stamped receipt.

The API and frontend can also be started separately:

```bash
npm run api
npm --prefix frontend run dev
```

The Vite server proxies `/api` to `http://127.0.0.1:8787`. Set
`VITE_API_BASE_URL` when the API is hosted elsewhere. Run a single INFY session
without the UI with `npm run run:once`.

## Replay Scenarios

| Run            | Controlled condition                                                                             | Expected outcome                                                 |
| -------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Healthy        | No injected condition                                                                            | Risk policy evaluates the agents' real majority decision         |
| Evidence fault | One generated evidence value is shifted by 8%                                                    | `EVIDENCE_INTEGRITY` stops the pipeline before cross-examination |
| Risk veto      | Final positions are transparently normalized to `LONG` and the replay uses a 4% price-move limit | `MAX_PRICE_MOVE` veto                                            |
| Error          | Post-stage decision recording raises a controlled failure                                        | Persisted `ERROR` session and error spans                        |
| Deadlock       | Final positions are transparently normalized to `LONG`, `SHORT`, and `NO_TRADE`                  | `CONSENSUS_REQUIRED` deadlock                                    |

All five runs start with the real proposal LLM stage. The healthy, risk-veto,
error, and deadlock runs continue through the real rebuttal and final-vote LLM
stages. The evidence-fault run intentionally stops after proposal evidence
fails validation, so it does not spend calls on rebuttals or final votes.
Controlled changes are identified in telemetry and the readable replay.
Vote-injected runs show an **Injected Scenario** badge and preserve a
generated-to-forced mapping for every controlled final vote.

- Live and paper trading: deprioritized

## SigNoz

The API exports OTLP/HTTP telemetry to `http://127.0.0.1:4318` by default.
See `docs/SIGNOZ_SETUP.md` and `docs/TELEMETRY_MAP.md`.

The Evidence page also provides **Ask the Auditor**, a natural-language search
surface backed by the SigNoz MCP server at `SIGNOZ_MCP_URL` (default
`http://localhost:8000/mcp`). Searches are scoped to the selected session and
use read-only trace, log, metric, alert, or dashboard tools. When MCP is
offline, the result is clearly labeled as a deterministic session fallback.

## AI Disclosure

This project was built with AI assistant support. See `docs/AI_DISCLOSURE.md`.
