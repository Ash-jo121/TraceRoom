import assert from "node:assert/strict";
import { resolveConsensus } from "../debate/resolveConsensus";
import { validateEvidence } from "../evidence/validateEvidence";
import { marketSnapshot } from "../fixtures/marketSnapshot";
import { evaluateRisk } from "../risk/evaluationRisk";
import { applyControlledEvidenceFault } from "../scenarios/applyControlledEvidenceFault";
import type { FinalVote } from "../schemas/finalVote";
import type { AgentProposal } from "../schemas/proposal";

const proposals: AgentProposal[] = ["agent-1", "agent-2", "agent-3"].map(
  (agentId) => ({
    agentId,
    snapshotId: marketSnapshot.snapshotId,
    position: "LONG",
    confidence: 0.7,
    thesis: "ACME has snapshot-grounded momentum suitable for this replay test.",
    evidence: [
      {
        sourceId: `market.quote:${marketSnapshot.symbol}`,
        claimType: "CURRENT_PRICE",
        citedValue: marketSnapshot.currentPrice,
        statement: "The current ACME price matches the shared replay snapshot.",
      },
    ],
    risks: [],
  }),
);

const healthyEvidence = validateEvidence(
  marketSnapshot,
  proposals.flatMap((proposal) => proposal.evidence),
);
assert.equal(healthyEvidence.validationStatus, "valid");
assert.equal(healthyEvidence.invalidCount, 0);

const originalScenario = process.env.TRACEROOM_SCENARIO;
process.env.TRACEROOM_SCENARIO = "evidence-price-deviation";
const fault = applyControlledEvidenceFault(proposals);

if (originalScenario === undefined) {
  delete process.env.TRACEROOM_SCENARIO;
} else {
  process.env.TRACEROOM_SCENARIO = originalScenario;
}
assert.equal(fault.faultInjected, true);
const faultyEvidence = validateEvidence(
  marketSnapshot,
  fault.proposals.flatMap((proposal) => proposal.evidence),
);
assert.equal(faultyEvidence.validationStatus, "price_deviation");
assert.equal(faultyEvidence.invalidCount, 1);

const finalVotes: FinalVote[] = proposals.map((proposal) => ({
  agentId: proposal.agentId,
  snapshotId: proposal.snapshotId,
  initialPosition: proposal.position,
  changedFromInitial: false,
  critiqueResponses: [
    {
      sourceAgentId: "peer-1",
      disposition: "ACCEPTED",
      response: "The critique was accepted for this deterministic session test.",
    },
    {
      sourceAgentId: "peer-2",
      disposition: "ACCEPTED",
      response: "The second critique was accepted for this session test.",
    },
  ],
  revisedThesis: "ACME remains a snapshot-grounded LONG after cross-examination.",
  position: "LONG",
  confidence: 0.7,
  supportedProposalAgentId: proposal.agentId,
  rationale: "The shared ACME snapshot supports the final LONG vote.",
}));

const consensus = resolveConsensus(finalVotes);
assert.equal(consensus.status, "CONSENSUS");
assert.equal(consensus.position, "LONG");

const riskReview = evaluateRisk(consensus, marketSnapshot);
assert.equal(riskReview.status, "APPROVED");
assert.equal(riskReview.tradeAllowed, true);

console.log("TraceRoom ACME session tests passed");
