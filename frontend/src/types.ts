export type SessionScenario =
  | "healthy"
  | "evidence-fault"
  | "risk-veto"
  | "error"
  | "deadlock";

export type StageStatus = "COMPLETED" | "BLOCKED" | "SKIPPED" | "ERROR";

export interface CheckedEvidence {
  sourceId: string;
  claimType: string;
  statement: string;
  citedValue: number;
  referenceValue: number;
  deviationPct: number;
  validationStatus: string;
}

export interface MarketSnapshot {
  snapshotId: string;
  symbol: string;
  observedAt: string;
  decisionHorizonMinutes: number;
  currentPrice: number;
  previousClose: number;
  dayOpen: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  averageVolume: number;
  indicators: {
    sma20: number;
    ema9: number;
    rsi14: number;
  };
}

export type SnapshotExchange = "NSE" | "US";
export type SnapshotStatus =
  | "READY"
  | "STALE"
  | "BLOCKED"
  | "FIXTURE_FALLBACK"
  | "LOCKED";

export interface SnapshotCandidate {
  schemaVersion: 1;
  candidateId: string;
  status: SnapshotStatus;
  createdAt: string;
  lockedAt: string | null;
  fallbackReason: string | null;
  instrument: {
    requestedSymbol: string;
    symbol: string;
    exchange: SnapshotExchange;
    providerSymbol: string;
    name: string | null;
    currency: string | null;
  };
  snapshot: MarketSnapshot | null;
  research: {
    status: "READY" | "UNAVAILABLE";
    summary: string;
    catalysts: string[];
    risks: string[];
    responseId: string | null;
    model: string | null;
    note: string | null;
  };
  sources: Array<{
    id: string;
    kind: "MARKET_DATA" | "WEB";
    provider: string;
    title: string;
    url: string;
    observedAt: string | null;
    fields: string[];
  }>;
  fieldProvenance: Record<string, string[]>;
  checks: Array<{
    id: string;
    label: string;
    status: "PASS" | "WARN" | "FAIL";
    detail: string;
  }>;
  canLock: boolean;
  canRun: boolean;
}

export interface RecordedSession {
  schemaVersion: 4;
  sessionId: string;
  createdAt: string;
  mode: SessionScenario;
  scenario: SessionScenario;
  scenarioInjection: {
    injected: boolean;
    type: string;
    description: string;
    votesOverridden: boolean;
    voteOverrides: Array<{
      agentId: string;
      originalPosition: string;
      forcedPosition: string;
      overridden: boolean;
    }>;
    evidenceOverride?: {
      agentId: string;
      claimIndex: number;
      originalValue: number;
      forcedValue: number;
    };
  };
  snapshot: MarketSnapshot;
  agents: Array<{
    agentId: string;
    displayName: string;
    persona: string;
    riskAppetite: string;
  }>;
  lifecycle: string[];
  stageStatuses: Record<string, StageStatus>;
  pipelineGate: {
    status: "PASSED" | "BLOCKED";
    blockedAt: "EVIDENCE_VALIDATION" | null;
    reasonCode: "EVIDENCE_INTEGRITY" | null;
    message: string;
  };
  proposals: Array<{
    agentId: string;
    position: string;
    confidence: number;
    thesis: string;
    evidence: Array<{
      sourceId: string;
      claimType: string;
      citedValue: number;
      statement: string;
    }>;
    risks: string[];
  }>;
  rebuttals: Array<{
    agentId: string;
    critiques?: Array<{
      targetAgentId?: string;
      critique?: string;
      concern?: string;
    }>;
  }>;
  finalVotes: Array<{
    agentId: string;
    position: string;
    confidence: number;
    rationale: string;
    initialPosition: string;
    changedFromInitial: boolean;
  }>;
  consensus: {
    status: string;
    position: string | null;
    unanimous: boolean;
    voteCounts: Record<string, number>;
    supportingAgentIds: string[];
    changedAgentIds: string[];
    dissentingAgentIds?: string[];
  } | null;
  evidenceValidation: {
    checkedCount: number;
    validCount: number;
    invalidCount: number;
    invalidAgentCount: number;
    validationStatus: string;
    blocked: boolean;
    agents: Array<{
      agentId: string;
      validationStatus: string;
      checkedCount: number;
      validCount: number;
      invalidCount: number;
      tolerancePct: number;
      checkedEvidence: CheckedEvidence[];
    }>;
  };
  riskReview: {
    status: "APPROVED" | "VETOED" | "DEADLOCKED";
    tradeAllowed: boolean;
    triggeredRuleIds: string[];
    rules: Array<{
      ruleId: string;
      outcome: "PASSED" | "TRIGGERED" | "NOT_APPLICABLE";
      message: string;
      observedValue?: number;
      thresholdValue?: number;
    }>;
  } | null;
  evaluationNote?: string | null;
  execution: {
    executionAllowed: boolean;
    status: "READY" | "BLOCKED";
    reason: string;
  };
  outcome: string;
  error?: {
    code: string;
    stage: string;
    message: string;
  };
  replay: Array<{
    order: number;
    title: string;
    detail: string;
  }>;
  signoz: {
    traceId: string;
    traceUrl: string;
    logsHint: string;
    dashboardUrl: string;
  };
}

export interface TelemetryQuestionAnswer {
  answer: string;
  evidence: Array<{ label: string; value: string }>;
  traceId: string;
  signozLinks: RecordedSession["signoz"];
  source: "signoz_mcp" | "session_fallback";
}
