import assert from "node:assert/strict";
import { resolveConsensus } from "../debate/resolveConsensus";
import { validateEvidence } from "../evidence/validateEvidence";
import { marketSnapshot } from "../fixtures/marketSnapshot";
import { evaluateRisk } from "../risk/evaluationRisk";
import { applyControlledEvidenceFault } from "../scenarios/applyControlledEvidenceFault";
import { applyControlledVoteScenario } from "../scenarios/applyControlledVoteScenario";
import { getRiskReviewScenario } from "../scenarios/getRiskReviewScenario";
import {
  EVIDENCE_FAULT_ENV_VALUE,
  RISK_VETO_ENV_VALUE,
  resolveSessionScenario,
  scenarioEnvironmentValue,
} from "../scenarios/runScenario";
import type { FinalVote } from "../schemas/finalVote";
import type { AgentProposal } from "../schemas/proposal";

const proposals: AgentProposal[] = ["agent-1", "agent-2", "agent-3"].map(
  (agentId) => ({
    agentId,
    snapshotId: marketSnapshot.snapshotId,
    position: "LONG",
    confidence: 0.7,
    thesis:
      "ACME has snapshot-grounded momentum suitable for this replay test.",
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

const fault = applyControlledEvidenceFault(proposals, EVIDENCE_FAULT_ENV_VALUE);
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
      response:
        "The critique was accepted for this deterministic session test.",
    },
    {
      sourceAgentId: "peer-2",
      disposition: "ACCEPTED",
      response: "The second critique was accepted for this session test.",
    },
  ],
  revisedThesis:
    "ACME remains a snapshot-grounded LONG after cross-examination.",
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

const evidenceVeto = evaluateRisk(consensus, marketSnapshot, undefined, true);
assert.equal(evidenceVeto.status, "VETOED");
assert.equal(evidenceVeto.tradeAllowed, false);
assert.deepEqual(evidenceVeto.triggeredRuleIds, ["EVIDENCE_INTEGRITY"]);

const mixedFinalVotes: FinalVote[] = finalVotes.map((vote, index) => ({
  ...vote,
  position: index === 0 ? "SHORT" : index === 1 ? "NO_TRADE" : "LONG",
}));
const riskVoteScenario = applyControlledVoteScenario(
  mixedFinalVotes,
  "risk-veto",
);
assert.equal(riskVoteScenario.applied, true);
assert.equal(riskVoteScenario.votesOverridden, true);
assert.deepEqual(
  riskVoteScenario.voteOverrides.map((vote) => ({
    original: vote.originalPosition,
    forced: vote.forcedPosition,
    overridden: vote.overridden,
  })),
  [
    { original: "SHORT", forced: "LONG", overridden: true },
    { original: "NO_TRADE", forced: "LONG", overridden: true },
    { original: "LONG", forced: "LONG", overridden: false },
  ],
);
assert.ok(
  riskVoteScenario.finalVotes.every((vote) => vote.position === "LONG"),
);
const riskConsensus = resolveConsensus(riskVoteScenario.finalVotes);
const strictRiskScenario = getRiskReviewScenario(RISK_VETO_ENV_VALUE);
const riskVeto = evaluateRisk(
  riskConsensus,
  marketSnapshot,
  strictRiskScenario.policy,
);
assert.equal(riskVeto.status, "VETOED");
assert.equal(riskVeto.tradeAllowed, false);
assert.ok(riskVeto.triggeredRuleIds.includes("MAX_PRICE_MOVE"));
assert.equal(
  riskVeto.rules.find((rule) => rule.ruleId === "CONSENSUS_REQUIRED")?.message,
  "The recorded final positions resolved to LONG.",
);

const deadlockVoteScenario = applyControlledVoteScenario(
  finalVotes,
  "deadlock",
);
assert.equal(deadlockVoteScenario.applied, true);
assert.equal(deadlockVoteScenario.votesOverridden, true);
assert.deepEqual(
  deadlockVoteScenario.voteOverrides.map((vote) => vote.originalPosition),
  ["LONG", "LONG", "LONG"],
);
assert.deepEqual(
  deadlockVoteScenario.finalVotes.map((vote) => vote.position),
  ["LONG", "SHORT", "NO_TRADE"],
);
const deadlockConsensus = resolveConsensus(deadlockVoteScenario.finalVotes);
assert.equal(deadlockConsensus.status, "DEADLOCKED");
assert.equal(deadlockConsensus.position, null);
const deadlockRisk = evaluateRisk(deadlockConsensus, marketSnapshot);
assert.equal(deadlockRisk.status, "DEADLOCKED");
assert.deepEqual(deadlockRisk.triggeredRuleIds, ["CONSENSUS_REQUIRED"]);

assert.equal(resolveSessionScenario("healthy"), "healthy");
assert.equal(resolveSessionScenario("fault"), "evidence-fault");
assert.equal(resolveSessionScenario("risk-veto"), "risk-veto");
assert.equal(resolveSessionScenario("error"), "error");
assert.equal(resolveSessionScenario("deadlock"), "deadlock");
assert.equal(
  scenarioEnvironmentValue("evidence-fault"),
  EVIDENCE_FAULT_ENV_VALUE,
);

console.log("TraceRoom five-scenario unit tests passed");
