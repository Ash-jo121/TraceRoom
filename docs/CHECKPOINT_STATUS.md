# Checkpoint Status

Current target: INFY replay sessions driven by the real three-agent LLM
pipeline and recorded in SigNoz.

## Completed

- Foundry files exist: `casting.yaml`, `casting.yaml.lock`.
- INFY `snapshot-001` market fixture feeds the agent pipeline.
- Three proposal, rebuttal, and final-vote stages execute through the configured LLM.
- Evidence validation, consensus, risk review, and linked evaluation are traced.
- Node API persists real stage outputs to SQLite.
- React/Vite actions for all five replay scenarios call the API through `/api`.
- Root `npm run dev` starts the API and frontend together.
- A UI-triggered healthy run produces the expected 27-span `debate.session` trace.
- Evidence-fault, risk-veto, deadlock, and controlled-error sessions start from
  the same real INFY agent pipeline and persist their outcomes.
- The evidence-integrity gate persists a terminal blocked session and skips
  every downstream debate and decision stage.
- The Debate tab renders the complete saved decision transcript, including
  validated evidence, cross-examination, vote changes, controlled injections,
  consensus, risk verdicts, errors, and explicit skipped-stage stubs.
- Deterministic tests cover `EVIDENCE_INTEGRITY`, `MAX_PRICE_MOVE`,
  `CONSENSUS_REQUIRED`, and scenario routing.
- The Evidence page accepts natural-language session questions and searches
  read-only SigNoz MCP trace, log, metric, alert, and dashboard tools through
  the API.
- Ask the Auditor labels live MCP results and preserves a deterministic
  persisted-session fallback when the local MCP service is unavailable.
- The cinematic four-page interface separates the command story, live canvas
  agent room, five-scenario incident lab, and forensic evidence workflow.
- The live room visualizes active agent transmissions while a session runs,
  then switches to the persisted replay without inventing execution results.
- Downloaded block receipts include a SHA-256 checksum over their proof payload.
- Snapshot Forge supports NSE and US equity candidates backed by Twelve Data.
- SMA20, EMA9, RSI14, and average volume are computed locally and tested.
- OpenAI web search adds cited context on a non-authoritative rail that cannot
  replace numeric fields.
- Candidates expose explicit ready, stale, blocked, fixture fallback, and locked
  states with field-level provenance.
- Only validated immutable snapshots can enter the existing agent pipeline.
- Custom snapshots retain healthy and evidence-fault runs; evaluation is
  skipped unless a matching fixture exists.

## Working Demo Path

1. Run `npm install` and `npm --prefix frontend install` once.
2. Start Foundry/SigNoz and confirm OTLP port `4318` is exposed.
3. Run `npm run dev` from the repository root.
4. Open `http://127.0.0.1:5173`.
5. Run the canonical breach from Command, or choose any replay in Incidents.
6. Watch the agents talk in the live canvas room, then inspect the persisted replay.
7. Open the Evidence page and ask `Why was execution blocked?`, `Which span
   failed?`, or `Show the session logs`.
8. Download the proof receipt or copy the trace ID from the Evidence page.
9. Open the `debate.session` trace in SigNoz and inspect its stage hierarchy,
   attributes, events, logs, and error status.
10. Open Snapshot Forge, create and lock a second stock, then watch the agents
    deliberate over the new evidence.

## Pending

- Capture final dashboard and alert screenshots plus their live URLs.

Live market trading and paper trading are intentionally deprioritized.
