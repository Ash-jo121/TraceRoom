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

Configure the LLM variables in `.env`, start SigNoz/Foundry, then run:

```bash
npm run dev
```

The root development command waits for the API health check before starting
Vite, preventing the frontend's initial session request from racing API
startup.

Open `http://127.0.0.1:5173` and select one of the five replay runs. The
frontend calls the Node API, which feeds `snapshot-001` for `ACME` into the
real agent pipeline. Every run persists the real agent-stage outputs and emits
a fresh `debate.session` trace.

The API and frontend can also be started separately:

```bash
npm run api
npm --prefix frontend run dev
```

The Vite server proxies `/api` to `http://127.0.0.1:8787`. Set
`VITE_API_BASE_URL` when the API is hosted elsewhere. Run a single ACME session
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

## Human-Readable Debate Record

The decision detail includes a **Debate** tab that renders the persisted session
as one chronological transcript: authoritative snapshot, independent
proposals, validated evidence, cross-examination, final votes, consensus, and
the deterministic risk verdict. Controlled evidence, vote, policy, and error
injections are disclosed inline at the point where they affect the replay.
Skipped stages remain visible, so an evidence-blocked session shows exactly
where the pipeline stopped. The transcript links to the matching SigNoz trace
for structural telemetry inspection.

- Live and paper trading: deprioritized

## SigNoz

The API exports OTLP/HTTP telemetry to `http://127.0.0.1:4318` by default.
See `docs/SIGNOZ_SETUP.md` and `docs/TELEMETRY_MAP.md`.

## AI Disclosure

This project was built with AI assistant support. See `docs/AI_DISCLOSURE.md`.
