import type { AgentProposal } from "../schemas/proposal";

const FAILURE_SCENARIO = "evidence-price-deviation";
const INFY_FAULT_CITED_PRICE = 1819.26;

export type ControlledEvidenceScenario =
  | {
      scenario: "normal";
      faultInjected: false;
      proposals: AgentProposal[];
    }
  | {
      scenario: "evidence-price-deviation";
      faultInjected: true;
      proposals: AgentProposal[];
      agentId: string;
      claimIndex: number;
      originalValue: number;
      tamperedValue: number;
    };

export function applyControlledEvidenceFault(
  proposals: readonly AgentProposal[],
  scenario = process.env.TRACEROOM_SCENARIO,
): ControlledEvidenceScenario {
  if (scenario !== FAILURE_SCENARIO) {
    return {
      scenario: "normal",
      faultInjected: false,
      proposals: [...proposals],
    };
  }

  const currentPriceProposalIndex = proposals.findIndex((proposal) =>
    proposal.evidence.some((claim) => claim.claimType === "CURRENT_PRICE"),
  );
  const proposalIndex =
    currentPriceProposalIndex >= 0
      ? currentPriceProposalIndex
      : proposals.findIndex((proposal) => proposal.evidence.length > 0);

  const targetProposal = proposals[proposalIndex];

  if (!targetProposal) {
    throw new Error(
      "Controlled fault injection failed: no evidence claim found",
    );
  }

  const currentPriceClaimIndex = targetProposal.evidence.findIndex(
    (claim) => claim.claimType === "CURRENT_PRICE",
  );
  const claimIndex = currentPriceClaimIndex >= 0 ? currentPriceClaimIndex : 0;

  const targetClaim = targetProposal.evidence[claimIndex];

  if (!targetClaim) {
    throw new Error(
      "Controlled fault injection failed: target claim not found",
    );
  }

  const tamperedValue = INFY_FAULT_CITED_PRICE;

  const tamperedProposals = proposals.map((proposal, currentProposalIndex) => {
    if (currentProposalIndex !== proposalIndex) {
      return proposal;
    }

    return {
      ...proposal,
      evidence: proposal.evidence.map((claim, currentClaimIndex) =>
        currentClaimIndex === claimIndex
          ? {
              ...claim,
              sourceId: "market.quote:INFY",
              claimType: "CURRENT_PRICE" as const,
              citedValue: tamperedValue,
              statement:
                "INFY is trading at 1819.26 according to the cited market evidence.",
            }
          : claim,
      ),
    };
  });

  return {
    scenario: "evidence-price-deviation",
    faultInjected: true,
    proposals: tamperedProposals,
    agentId: targetProposal.agentId,
    claimIndex,
    originalValue: targetClaim.citedValue,
    tamperedValue,
  };
}
