# TraceRoom

TraceRoom is a black box recorder for autonomous financial agents. It captures agent evidence, proposals, critiques, votes, risk checks, execution attempts, SigNoz telemetry, incident replay, and audit proof packs.

## Demo Stack

- Node/TypeScript API
- React/Vite frontend
- SQLite persistence using Node's built-in `node:sqlite`
- OpenTelemetry traces, logs, and metrics for SigNoz
- Foundry `casting.yaml` and `casting.yaml.lock`

## Run Locally

Install dependencies if needed:

```bash
npm install
```

Start the API:

```bash
npm run api
```

Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the frontend and run a healthy or fault session. The fault demo uses the deterministic `INFY_EVIDENCE_INTEGRITY_V1` fixture.

## Fault Demo Story

In the fault session, Momentum Agent receives a corrupted market price:

- Momentum cited price: `1819.26`
- Authoritative INFY price: `1684.50`
- Deviation: `8.00%`
- Allowed tolerance: `2.00%`
- Failed rule: `EVIDENCE_INTEGRITY`
- Result: `VETOED - EXECUTION BLOCKED`

No real trades are placed. Execution is synthetic only.

## SigNoz

TraceRoom includes `casting.yaml` and `casting.yaml.lock`. The API emits OpenTelemetry when an OTLP-compatible collector is available at the configured endpoint.

See:

- `docs/SIGNOZ_SETUP.md`
- `docs/TELEMETRY_MAP.md`
- `docs/DEMO_SCRIPT.md`

## AI Disclosure

This project was built with AI assistant support. See `docs/AI_DISCLOSURE.md`.
