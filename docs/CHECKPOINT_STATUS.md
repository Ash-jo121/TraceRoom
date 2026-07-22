# Checkpoint Status

Current target: revised Node/TypeScript implementation of the 0-to-100 plan.

## Completed

- Existing TypeScript agent/telemetry prototype preserved.
- Foundry files exist: `casting.yaml`, `casting.yaml.lock`.
- Deterministic INFY demo service added.
- Node API added for sessions and proof packs.
- SQLite persistence added.
- React/Vite frontend added.
- Decision Detail shows the canonical evidence failure.

## Demo Path

1. Run `npm run api`.
2. Run `cd frontend && npm install && npm run dev`.
3. Click `Run Fault Session`.
4. Open the session detail.
5. Confirm the UI shows `1819.26`, `1684.50`, `8.00%`, `2.00%`, `EVIDENCE_INTEGRITY`, and `EXECUTION BLOCKED`.

## Known Gaps

- SigNoz MCP live Auditor integration is optional and not required for the local demo.
- Dashboard and alert setup are documented for manual reproduction.
- Real LLM mode remains separate from the deterministic demo flow.
