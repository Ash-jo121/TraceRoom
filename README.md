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

Open `http://127.0.0.1:5173` and click **Run Healthy Session**. The frontend
calls the Node API, which feeds `snapshot-001` for `ACME` into the real agent
pipeline. A successful run persists the stage outputs and emits a fresh
27-span `debate.session` trace.

The API and frontend can also be started separately:

```bash
npm run api
npm --prefix frontend run dev
```

The Vite server proxies `/api` to `http://127.0.0.1:8787`. Set
`VITE_API_BASE_URL` when the API is hosted elsewhere. Run a single ACME session
without the UI with `npm run run:once`.

## Current Scenario Status

- Healthy ACME agent run: wired and verified
- Evidence-fault run: pending completion
- Risk-veto run: pending completion
- Error run: pending completion
- Deadlock run: pending completion
- Live and paper trading: deprioritized

## SigNoz

The API exports OTLP/HTTP telemetry to `http://127.0.0.1:4318` by default.
See `docs/SIGNOZ_SETUP.md` and `docs/TELEMETRY_MAP.md`.

## AI Disclosure

This project was built with AI assistant support. See `docs/AI_DISCLOSURE.md`.
