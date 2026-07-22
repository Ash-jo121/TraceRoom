# TraceRoom Repo Rules

TraceRoom is a black box recorder for autonomous financial agents. The demo must show healthy and fault financial-agent sessions, evidence validation, risk review, execution blocking, SigNoz telemetry, replay, and audit proof packs.

Current stack:
- Node/TypeScript API and deterministic demo engine
- React/Vite frontend
- SQLite persistence through Node's built-in `node:sqlite`
- OpenTelemetry export to SigNoz installed through Foundry

Rules:
- Preserve a working demo path at every checkpoint.
- Do not use real-money trading, broker credentials, or live order placement.
- Keep deterministic mock mode as the main demo path.
- Use the INFY evidence-integrity fixture unless the core demo is complete.
- Preserve both healthy and fault sessions.
- Update docs when changing demo behavior, telemetry, setup, or checkpoint status.
- Disclose AI assistant usage in the submission docs.

Definition of done:
- `npm run typecheck` passes.
- `npm test` passes.
- The Node API can run healthy and fault sessions.
- The fault Decision Detail shows `1819.26`, `1684.50`, `8.00%`, `2.00%`, `EVIDENCE_INTEGRITY`, and `EXECUTION BLOCKED`.
