# Demo Script

## Five-Run Flow

1. Open the TraceRoom Command Center.
2. Click **Run Healthy Session**.
3. Explain that the shared ACME snapshot is being sent to three configured agents.
4. Open the **Debate** tab and scroll through the readable snapshot, proposals,
   validated claims, cross-examination, final votes, consensus, and risk
   verdict.
5. Use **View as trace in SigNoz** to open the matching telemetry.
6. Show the 27-span `debate.session` trace.
7. Walk through snapshot, proposal/LLM, evidence, rebuttal/LLM,
   final-vote/LLM, consensus, and risk spans.
8. Return to TraceRoom and run the four controlled incident replays:
   - **Evidence Fault** shifts one generated evidence value by 8%; show the
     inline injection, failed evidence chip, `EVIDENCE_INTEGRITY` gate, skipped
     transcript stages, and the shorter 11-span trace. Point out that no
     rebuttal, final-vote, consensus, risk-review, or evaluation spans exist
     because the gate stopped the pipeline.
   - **Risk Veto** transparently normalizes the final room to `LONG`; show
     the inline generated-to-recorded vote mapping, tightened risk-policy
     injection, and `MAX_PRICE_MOVE` blocking the decision.
   - **Deadlock** transparently normalizes the final votes to `LONG`, `SHORT`,
     and `NO_TRADE`; show the inline vote injection, 1/1/1 split, missing
     majority, and `CONSENSUS_REQUIRED`.
   - **Error Session** injects a controlled post-stage recording error; show
     the inline disclosure, readable terminal error, and error spans in SigNoz.
9. Close with: “TraceRoom does not promise autonomous financial agents will
   always be right. It makes sure they can never be opaque.”

Every scenario starts with the real ACME proposal LLM stage. The evidence-fault
scenario stops there when validation fails; the other scenarios continue
through the real rebuttal and final-vote LLM stages. Controlled changes are
explicitly labeled in the replay and telemetry. Live and paper trading are not
part of the current demo path.

Use this line when introducing the deadlock:

> Deadlocks are rare organically, so TraceRoom ships controlled scenario
> injection to prove the detection path works. Here is the forced 1-1-1 split,
> the original LLM votes, and the corresponding SigNoz evidence.
