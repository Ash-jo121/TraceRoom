# TraceRoom Product Spec

TraceRoom is a black box recorder for autonomous financial agents. It records the full decision trail for a synthetic trading decision: market snapshot, agent proposals, cross-examination, final votes, consensus, evidence validation, risk review, execution attempt, incident replay, SigNoz telemetry, and proof pack export.

## Demo Fixture

`INFY_EVIDENCE_INTEGRITY_V1` is the canonical demo fixture.

- Ticker: `INFY`
- Authoritative reference price: `1684.50`
- Fault price shown to Momentum Agent: `1819.26`
- Tolerance: `2.00%`
- Deviation: `8.00%`
- Horizon: `30` minutes
- Synthetic capital: `100000`

## Demo Outcomes

Healthy sessions pass evidence integrity and execute synthetically.

Fault sessions fail evidence integrity, receive a risk veto, and are blocked before execution.
