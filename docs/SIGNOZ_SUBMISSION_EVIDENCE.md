# SigNoz Submission Evidence

This file is the canonical evidence manifest for the final recording. Query
definitions live in `docs/SIGNOZ_SETUP.md`.

## Fresh Canonical Run

- Session ID: `764f97ee-fd6c-4634-9e36-842cea29b9d4`
- Trace ID: `26a2c0fcd633a7ffa1cf88a2d2a0614a`
- Trace URL: `http://localhost:8080/trace/26a2c0fcd633a7ffa1cf88a2d2a0614a`
- Scenario: `evidence-fault`
- Cited value: `1819.26`
- Reference value: `1684.50`
- Deviation: `8.00%`
- Tolerance: `2.00%`
- Gate: `EVIDENCE_INTEGRITY`
- Execution: `BLOCKED`

The run was produced on 2026-07-24 through a locked INFY
`FIXTURE_FALLBACK` candidate. TraceRoom persisted one invalid claim and
short-circuited all five downstream stages.

## External Evidence Inventory

The local SigNoz health endpoint returned HTTP 200 during implementation. The
dashboard, alert, and MCP APIs returned 401 without a configured
`SIGNOZ_API_KEY`, so the following fields intentionally remain unclaimed:

- Dashboard name: `TraceRoom / Submission Evidence`
- Dashboard URL: pending authenticated verification
- Dashboard screenshot: pending authenticated verification
- Alert names: pending authenticated verification
- Alert URLs: pending authenticated verification
- Triggered alert screenshot: pending authenticated verification
- MCP answer screenshot: pending authenticated verification

## Capture Checklist

- [ ] Open the fresh trace and confirm `debate.session` plus ten child spans.
- [ ] Confirm the root has `pipeline.block_reason=EVIDENCE_INTEGRITY`.
- [ ] Confirm the five downstream stage spans are absent.
- [ ] Confirm the correlated block log using
  `traceroom.session.id = '764f97ee-fd6c-4634-9e36-842cea29b9d4'`.
- [ ] Confirm the submission dashboard count changes.
- [ ] Confirm **TraceRoom / Evidence Integrity Block** is firing.
- [ ] Ask the MCP auditor why execution was blocked and capture the live answer.
- [ ] Save trace, dashboard, alert, and MCP screenshots under
  `docs/assets/signoz/`.
