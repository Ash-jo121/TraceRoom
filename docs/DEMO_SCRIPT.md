# Demo Script

## Current Healthy-Run Flow

1. Open the TraceRoom Command Center.
2. Click **Run Healthy Session**.
3. Explain that the shared ACME snapshot is being sent to three configured agents.
4. Open the returned session and inspect the generated proposals and final votes.
5. Copy the trace ID from the Audit tab.
6. Open SigNoz and show the 27-span `debate.session` trace.
7. Walk through snapshot, proposal/LLM, evidence, rebuttal/LLM, final-vote/LLM, consensus, and risk spans.
8. Close with: “TraceRoom does not promise autonomous financial agents will always be right. It makes sure they can never be opaque.”

The evidence-fault, risk-veto, error, and deadlock flows will be added as
separate replay scenarios. Live and paper trading are not part of the current
demo path.
