# Checkpoint Status

Current target: ACME replay sessions driven by the real three-agent LLM
pipeline and recorded in SigNoz.

## Completed

- Foundry files exist: `casting.yaml`, `casting.yaml.lock`.
- ACME `snapshot-001` market fixture feeds the agent pipeline.
- Three proposal, rebuttal, and final-vote stages execute through the configured LLM.
- Evidence validation, consensus, risk review, and linked evaluation are traced.
- Node API persists real stage outputs to SQLite.
- React/Vite actions for all five replay scenarios call the API through `/api`.
- Root `npm run dev` starts the API and frontend together.
- A UI-triggered healthy run produces the expected 27-span `debate.session` trace.
- Evidence-fault, risk-veto, deadlock, and controlled-error sessions start from
  the same real ACME agent pipeline and persist their outcomes.
- The evidence-integrity gate persists a terminal blocked session and skips
  every downstream debate and decision stage.
- Deterministic tests cover `EVIDENCE_INTEGRITY`, `MAX_PRICE_MOVE`,
  `CONSENSUS_REQUIRED`, and scenario routing.

## Working Demo Path

1. Run `npm install` and `npm --prefix frontend install` once.
2. Start Foundry/SigNoz and confirm OTLP port `4318` is exposed.
3. Run `npm run dev` from the repository root.
4. Open `http://127.0.0.1:5173`.
5. Select any replay scenario.
6. Copy the trace ID from the API output or Audit tab.
7. Open the `debate.session` trace in SigNoz and inspect its stage hierarchy,
   attributes, events, logs, and error status.

## Pending

- Human-readable Debate tab.
- SigNoz MCP Auditor integration from the teammate branch.
- Final dashboards and alerts.

Live market trading and paper trading are intentionally deprioritized.
