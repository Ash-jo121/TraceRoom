# Checkpoint Status

Current target: ACME replay sessions driven by the real three-agent LLM
pipeline and recorded in SigNoz.

## Completed

- Foundry files exist: `casting.yaml`, `casting.yaml.lock`.
- ACME `snapshot-001` market fixture feeds the agent pipeline.
- Three proposal, rebuttal, and final-vote stages execute through the configured LLM.
- Evidence validation, consensus, risk review, and linked evaluation are traced.
- Node API persists real stage outputs to SQLite.
- React/Vite healthy-session action calls the API through `/api`.
- Root `npm run dev` starts the API and frontend together.
- A UI-triggered healthy run produces the expected 27-span `debate.session` trace.

## Working Demo Path

1. Run `npm install` and `npm --prefix frontend install` once.
2. Start Foundry/SigNoz and confirm OTLP port `4318` is exposed.
3. Run `npm run dev` from the repository root.
4. Open `http://127.0.0.1:5173`.
5. Click **Run Healthy Session**.
6. Copy the trace ID from the API output or Audit tab.
7. Open the `debate.session` trace in SigNoz and inspect all 27 spans.

## Pending

- Evidence-fault, risk-veto, error, and deadlock replay sessions.
- Human-readable Debate tab.
- SigNoz MCP Auditor integration from the teammate branch.
- Final dashboards and alerts.

Live market trading and paper trading are intentionally deprioritized.
