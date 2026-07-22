import type { AgentConfig } from "../domain/agent";
import type { MarketSnapshot } from "../domain/market";
import type { ConsensusResult } from "../debate/resolveConsensus";
import type { EvidenceValidationReport } from "../evidence/traceEvidenceValidation";
import type { DecisionEvaluationReport } from "../evaluation/evaluateDecision";
import type { RiskReviewResult } from "../risk/evaluationRisk";
import type { FinalVote } from "../schemas/finalVote";
import type { AgentProposal } from "../schemas/proposal";
import type { AgentRebuttal } from "../schemas/rebuttal";

export type SessionMode = "healthy" | "fault";

export interface ReplayStep {
  order: number;
  title: string;
  detail: string;
}

export interface RecordedSession {
  sessionId: string;
  createdAt: string;
  mode: SessionMode;
  scenario: string;
  snapshot: MarketSnapshot;
  agents: AgentConfig[];
  lifecycle: string[];
  proposals: AgentProposal[];
  rebuttals: AgentRebuttal[];
  finalVotes: FinalVote[];
  consensus: ConsensusResult;
  evidenceValidation: EvidenceValidationReport;
  riskReview: RiskReviewResult;
  evaluation: DecisionEvaluationReport | null;
  execution: {
    executionAllowed: boolean;
    status: "READY" | "BLOCKED";
    reason: string;
  };
  outcome: RiskReviewResult["status"];
  replay: ReplayStep[];
  signoz: {
    traceId: string;
    traceUrl: string;
    logsHint: string;
    dashboardUrl: string;
  };
}
