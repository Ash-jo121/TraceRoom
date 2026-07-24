# Demo Script

## Final Submission Flow

1. Open the TraceRoom Command page and frame it as a circuit breaker, not a
   trading app.
2. Click **Run the Breach**.
3. In the live Agent Room, show Momentum, Mean Reversion, and Skeptic
   transmitting while the evidence gate holds execution.
4. When the persisted replay replaces the live state, show `1819.26` against
   the authoritative `1684.50`, the `8.00%` deviation, and the `2.00%` limit.
5. Show `EVIDENCE_INTEGRITY` and `EXECUTION BLOCKED`.
6. Open Evidence, ask why TraceRoom stopped INFY, and download the proof receipt.
7. Open SigNoz from the trace link and walk through snapshot, proposal/LLM,
   evidence, rebuttal/LLM, final-vote/LLM, consensus, and risk spans.
8. Return to the Incident Lab and compare the five controlled replays:
   - **Healthy** shows the complete allowed path.
   - **Evidence Fault** shifts one generated evidence value by 8%; show the
     failed validation, `EVIDENCE_INTEGRITY`, and the shorter 11-span trace.
     Point out that no rebuttal, final-vote, consensus, risk-review, or
     evaluation spans exist because the gate stopped the pipeline.
   - **Risk Veto** transparently normalizes the final room to `LONG`; show
     the **Injected Scenario** badge, generated-to-forced vote table, and
     `MAX_PRICE_MOVE` blocking the decision.
   - **Deadlock** transparently normalizes the final votes to `LONG`, `SHORT`,
     and `NO_TRADE`; show the **Injected Scenario** badge,
     generated-to-forced vote table, missing majority, and
     `CONSENSUS_REQUIRED`.
   - **Error Session** injects a controlled post-stage recording error; show
     the readable error in TraceRoom and the error spans in SigNoz.
9. Open Snapshot Forge and enter a second supported stock. Show Twelve Data
   supplying the numeric snapshot while OpenAI web search supplies cited
   contextual research on a separate trust rail.
10. Select several fields to show their provenance, copy or download the JSON,
    then click **Lock and Release Agents**.
11. Watch the selected symbol enter the live Agent Room. Explain that custom
    stocks skip historical evaluation unless a matching fixture exists.
12. Close with: "TraceRoom can onboard new decisions without weakening its
    evidence boundary."

Every scenario starts with the real INFY proposal LLM stage. The evidence-fault
scenario stops there when validation fails; the other scenarios continue
through the real rebuttal and final-vote LLM stages. Controlled changes are
explicitly labeled in the replay and telemetry. Live and paper trading are not
part of the current demo path.

Use this line when introducing the deadlock:

> Deadlocks are rare organically, so TraceRoom ships controlled scenario
> injection to prove the detection path works. Here is the forced 1-1-1 split,
> the original LLM votes, and the corresponding SigNoz evidence.
