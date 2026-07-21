import { SpanStatusCode } from "@opentelemetry/api";
import type { MarketSnapshot } from "../domain/market";
import type { AgentProposal } from "../schemas/proposal";
import { withSpan } from "../telemetry/withSpan";
import {
  validateEvidence,
  type EvidenceValidationResult,
  type EvidenceValidationStatus,
} from "./validateEvidence";

export interface AgentEvidenceValidation extends EvidenceValidationResult {
  agentId: string;
}

export interface EvidenceValidationReport {
  snapshotId: string;
  checkedCount: number;
  validCount: number;
  invalidCount: number;
  invalidAgentCount: number;
  validationStatus: EvidenceValidationStatus;
  blocked: boolean;
  agents: AgentEvidenceValidation[];
}

export async function traceEvidenceValidation(
  snapshot: MarketSnapshot,
  proposals: readonly AgentProposal[],
  tolerancePct = 2,
): Promise<EvidenceValidationReport> {
  return withSpan("evidence.validation", async (span) => {
    const agents = proposals.map(
      (proposal): AgentEvidenceValidation => ({
        agentId: proposal.agentId,
        ...validateEvidence(snapshot, proposal.evidence, tolerancePct),
      }),
    );

    for (const agent of agents) {
      agent.checkedEvidence.forEach((claim, claimIndex) => {
        span.addEvent("evidence.checked", {
          "agent.id": agent.agentId,
          "evidence.claim_index": claimIndex,
          "evidence.source_id": claim.sourceId,
          "evidence.claim_type": claim.claimType,
          "evidence.statement": claim.statement,
          "evidence.cited_value": claim.citedValue,
          "evidence.reference_value": claim.referenceValue,
          "evidence.validation.status": claim.validationStatus,

          ...(Number.isFinite(claim.deviationPct)
            ? {
                "evidence.deviation_pct": claim.deviationPct,
              }
            : {
                "evidence.deviation_unbounded": true,
              }),
        });
      });
    }

    const checkedCount = agents.reduce(
      (total, agent) => total + agent.checkedCount,
      0,
    );

    const validCount = agents.reduce(
      (total, agent) => total + agent.validCount,
      0,
    );

    const invalidCount = agents.reduce(
      (total, agent) => total + agent.invalidCount,
      0,
    );

    const invalidAgentCount = agents.filter(
      (agent) => agent.invalidCount > 0,
    ).length;

    const validationStatus = determineOverallStatus(agents);

    const blocked = invalidCount > 0;

    span.setAttributes({
      "market.snapshot.id": snapshot.snapshotId,
      "evidence.tolerance_pct": tolerancePct,
      "evidence.agent_count": proposals.length,
      "evidence.checked_count": checkedCount,
      "evidence.valid_count": validCount,
      "evidence.invalid_count": invalidCount,
      "evidence.invalid_agent_count": invalidAgentCount,
      "evidence.validation.status": validationStatus,
      "evidence.blocked": blocked,
    });

    span.setStatus(
      blocked
        ? {
            code: SpanStatusCode.ERROR,
            message: `${invalidCount} evidence claim(s) failed validation`,
          }
        : {
            code: SpanStatusCode.OK,
          },
    );

    return {
      snapshotId: snapshot.snapshotId,
      checkedCount,
      validCount,
      invalidCount,
      invalidAgentCount,
      validationStatus,
      blocked,
      agents,
    };
  });
}

function determineOverallStatus(
  agents: readonly AgentEvidenceValidation[],
): EvidenceValidationStatus {
  if (agents.some((agent) => agent.validationStatus === "unsupported_claim")) {
    return "unsupported_claim";
  }

  if (agents.some((agent) => agent.validationStatus === "price_deviation")) {
    return "price_deviation";
  }

  return "valid";
}
