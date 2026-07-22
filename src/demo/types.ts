export type SessionMode = "healthy" | "fault";

export type SessionState =
  | "SESSION_CREATED"
  | "MARKET_SNAPSHOT_READY"
  | "INDEPENDENT_PROPOSALS"
  | "CROSS_EXAMINATION"
  | "FINAL_VOTES"
  | "CONSENSUS_RESOLUTION"
  | "RISK_REVIEW"
  | "APPROVED"
  | "VETOED"
  | "EXECUTION_ATTEMPT"
  | "EXECUTED"
  | "BLOCKED";

export type Position = "LONG" | "SHORT" | "NO_TRADE";

export interface DemoFixture {
  fixtureId: "INFY_EVIDENCE_INTEGRITY_V1";
  ticker: "INFY";
  referencePrice: number;
  faultPrice: number;
  tolerancePercent: number;
  horizonMinutes: number;
  syntheticCapital: number;
}

export interface DemoEvidenceClaim {
  claimType: "CURRENT_PRICE";
  citedPrice: number;
  authoritativePrice: number;
  deviationPercent: number;
  tolerancePercent: number;
  status: "PASS" | "CRITICAL";
}

export interface DemoAgentProposal {
  agentId: string;
  agentName: string;
  position: Position;
  confidence: number;
  entryPrice: number;
  quantity: number;
  thesis: string;
  evidence: DemoEvidenceClaim[];
  riskFlags: string[];
}

export interface DemoAgentCritique {
  agentId: string;
  critiques: Array<{
    targetAgentId: string;
    summary: string;
  }>;
}

export interface DemoFinalVote {
  agentId: string;
  agentName: string;
  position: Position;
  confidence: number;
  rationale: string;
}

export interface DemoConsensus {
  status: "CONSENSUS" | "DEADLOCKED";
  position: Position | null;
  matchingVotes: number;
  rationale: string;
}

export interface RiskRuleResult {
  ruleName:
    | "REQUIRED_AGENTS_COMPLETED"
    | "MIN_MATCHING_FINAL_VOTES"
    | "MAX_DISAGREEMENT"
    | "SESSION_BUDGET"
    | "EVIDENCE_INTEGRITY"
    | "MARKET_DATA_FRESHNESS";
  passed: boolean;
  severity: "INFO" | "WARN" | "CRITICAL";
  detail: string;
}

export interface EvidenceIntegrityScore {
  score: number;
  status: "PASS" | "WARN" | "CRITICAL";
  explanation: string;
}

export interface RiskReview {
  riskReviewId: string;
  approved: boolean;
  failedRules: string[];
  rules: RiskRuleResult[];
}

export interface ExecutionAttempt {
  executionAllowed: boolean;
  status: "EXECUTED" | "BLOCKED";
  reason: string;
}

export interface ReplayStep {
  order: number;
  title: string;
  detail: string;
}

export interface DemoSession {
  sessionId: string;
  createdAt: string;
  mode: SessionMode;
  fixture: DemoFixture;
  lifecycle: SessionState[];
  proposals: DemoAgentProposal[];
  critiques: DemoAgentCritique[];
  finalVotes: DemoFinalVote[];
  consensus: DemoConsensus;
  evidenceIntegrity: EvidenceIntegrityScore;
  riskReview: RiskReview;
  execution: ExecutionAttempt;
  outcome: "EXECUTED" | "VETOED_BLOCKED";
  replay: ReplayStep[];
  signoz: {
    traceId: string | null;
    traceUrl: string | null;
    logsHint: string;
    dashboardUrl: string | null;
  };
}
