import { context, SpanStatusCode, trace } from "@opentelemetry/api";
import { INFY_EVIDENCE_INTEGRITY_V1, calculateInfyFaultDeviationPercent } from "./infyFixture";
import type {
  DemoAgentCritique,
  DemoAgentProposal,
  DemoConsensus,
  DemoEvidenceClaim,
  DemoFinalVote,
  DemoSession,
  EvidenceIntegrityScore,
  ExecutionAttempt,
  ReplayStep,
  RiskReview,
  RiskRuleResult,
  SessionMode,
  SessionState,
} from "./types";
import { recordDemoSessionMetrics } from "../telemetry/demoMetrics";
import { logInfo } from "../telemetry/logger";

const tracer = trace.getTracer("traceroom-demo", "0.1.0");

const TRACEROOM_VERSION = "0.1.0";

export async function runDemoSession(mode: SessionMode): Promise<DemoSession> {
  return tracer.startActiveSpan(
    "decision.session",
    {
      attributes: {
        "session.id": "pending",
        ticker: INFY_EVIDENCE_INTEGRITY_V1.ticker,
        mode,
        "traceroom.version": TRACEROOM_VERSION,
      },
    },
    async (sessionSpan) => {
      const sessionId = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      sessionSpan.setAttribute("session.id", sessionId);

      logInfo("Session created", {
        "event_type": "session.created",
        "session.id": sessionId,
        ticker: INFY_EVIDENCE_INTEGRITY_V1.ticker,
        mode,
      });

      await childSpan("market.snapshot", {
        "session.id": sessionId,
        ticker: INFY_EVIDENCE_INTEGRITY_V1.ticker,
        "market.reference_price": INFY_EVIDENCE_INTEGRITY_V1.referencePrice,
      });

      const proposals = await buildProposals(sessionId, mode);
      const critiques = buildCritiques();
      const finalVotes = buildFinalVotes(mode);
      const consensus = await buildConsensus(sessionId, finalVotes);
      const evidenceIntegrity = await validateEvidence(sessionId, proposals);
      const riskReview = await reviewRisk(sessionId, consensus, evidenceIntegrity);
      const execution = await attemptExecution(sessionId, riskReview);
      const lifecycle = buildLifecycle(riskReview, execution);
      const replay = buildReplay(mode);
      const outcome = execution.status === "EXECUTED" ? "EXECUTED" : "VETOED_BLOCKED";
      const spanContext = sessionSpan.spanContext();

      const session: DemoSession = {
        sessionId,
        createdAt,
        mode,
        fixture: INFY_EVIDENCE_INTEGRITY_V1,
        lifecycle,
        proposals,
        critiques,
        finalVotes,
        consensus,
        evidenceIntegrity,
        riskReview,
        execution,
        outcome,
        replay,
        signoz: {
          traceId: spanContext.traceId,
          traceUrl: buildSignozTraceUrl(spanContext.traceId),
          logsHint: `Search logs for session.id="${sessionId}"`,
          dashboardUrl: buildSignozDashboardUrl(),
        },
      };

      sessionSpan.setAttributes({
        outcome,
        "evidence_integrity.status": evidenceIntegrity.status,
        "evidence_integrity.score": evidenceIntegrity.score,
        "risk.approved": riskReview.approved,
        failed_rules: riskReview.failedRules,
      });

      sessionSpan.setStatus({
        code: outcome === "EXECUTED" ? SpanStatusCode.OK : SpanStatusCode.ERROR,
        message: outcome === "EXECUTED" ? "Synthetic execution completed" : "Execution blocked by risk review",
      });

      recordDemoSessionMetrics(session);

      return session;
    },
  );
}

async function childSpan(name: string, attributes: Record<string, string | number | boolean>): Promise<void> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  });
}

async function buildProposals(
  sessionId: string,
  mode: SessionMode,
): Promise<DemoAgentProposal[]> {
  const momentumPrice =
    mode === "fault"
      ? INFY_EVIDENCE_INTEGRITY_V1.faultPrice
      : INFY_EVIDENCE_INTEGRITY_V1.referencePrice;

  const proposals: DemoAgentProposal[] = [
    {
      agentId: "momentum",
      agentName: "Momentum Agent",
      position: "LONG",
      confidence: mode === "fault" ? 0.86 : 0.74,
      entryPrice: momentumPrice,
      quantity: 29,
      thesis:
        mode === "fault"
          ? "Momentum sees a breakout because its corrupted context shows INFY at 1819.26."
          : "Momentum sees a controlled upward move with evidence aligned to the authoritative INFY fixture.",
      evidence: [priceClaim(momentumPrice)],
      riskFlags: mode === "fault" ? ["price_context_outlier"] : [],
    },
    {
      agentId: "relative-value",
      agentName: "Relative Value Agent",
      position: "LONG",
      confidence: 0.68,
      entryPrice: INFY_EVIDENCE_INTEGRITY_V1.referencePrice,
      quantity: 28,
      thesis:
        "Relative value supports a small synthetic long because the authoritative fixture is internally consistent.",
      evidence: [priceClaim(INFY_EVIDENCE_INTEGRITY_V1.referencePrice)],
      riskFlags: [],
    },
    {
      agentId: "contrarian",
      agentName: "Contrarian Agent",
      position: mode === "fault" ? "NO_TRADE" : "LONG",
      confidence: mode === "fault" ? 0.71 : 0.61,
      entryPrice: INFY_EVIDENCE_INTEGRITY_V1.referencePrice,
      quantity: mode === "fault" ? 0 : 27,
      thesis:
        mode === "fault"
          ? "Contrarian refuses the trade because one agent's cited price conflicts with the authoritative source."
          : "Contrarian accepts the trade after finding no material evidence conflict.",
      evidence: [priceClaim(INFY_EVIDENCE_INTEGRITY_V1.referencePrice)],
      riskFlags: mode === "fault" ? ["evidence_disagreement"] : [],
    },
  ];

  for (const proposal of proposals) {
    await childSpan("agent.argument", {
      "session.id": sessionId,
      "agent.name": proposal.agentName,
      position: proposal.position,
      confidence: proposal.confidence,
      ticker: INFY_EVIDENCE_INTEGRITY_V1.ticker,
    });

    logInfo("Agent proposal", {
      "event_type": "agent.proposal",
      "session.id": sessionId,
      "agent.name": proposal.agentName,
      position: proposal.position,
      confidence: proposal.confidence,
    });
  }

  return proposals;
}

function priceClaim(citedPrice: number): DemoEvidenceClaim {
  const deviationPercent = Number(
    (
      (Math.abs(citedPrice - INFY_EVIDENCE_INTEGRITY_V1.referencePrice) /
        INFY_EVIDENCE_INTEGRITY_V1.referencePrice) *
      100
    ).toFixed(2),
  );

  return {
    claimType: "CURRENT_PRICE",
    citedPrice,
    authoritativePrice: INFY_EVIDENCE_INTEGRITY_V1.referencePrice,
    deviationPercent,
    tolerancePercent: INFY_EVIDENCE_INTEGRITY_V1.tolerancePercent,
    status:
      deviationPercent > INFY_EVIDENCE_INTEGRITY_V1.tolerancePercent
        ? "CRITICAL"
        : "PASS",
  };
}

function buildCritiques(): DemoAgentCritique[] {
  return [
    {
      agentId: "momentum",
      critiques: [
        { targetAgentId: "relative-value", summary: "Agrees with controlled exposure sizing." },
        { targetAgentId: "contrarian", summary: "Notes that no trade is too conservative when evidence passes." },
      ],
    },
    {
      agentId: "relative-value",
      critiques: [
        { targetAgentId: "momentum", summary: "Checks whether the cited entry price matches the source fixture." },
        { targetAgentId: "contrarian", summary: "Accepts caution when evidence conflicts appear." },
      ],
    },
    {
      agentId: "contrarian",
      critiques: [
        { targetAgentId: "momentum", summary: "Challenges any price claim that deviates from authoritative data." },
        { targetAgentId: "relative-value", summary: "Requests explicit risk review before execution." },
      ],
    },
  ];
}

function buildFinalVotes(mode: SessionMode): DemoFinalVote[] {
  return [
    {
      agentId: "momentum",
      agentName: "Momentum Agent",
      position: "LONG",
      confidence: mode === "fault" ? 0.82 : 0.73,
      rationale:
        mode === "fault"
          ? "Still votes LONG from corrupted momentum context."
          : "Votes LONG after evidence remains consistent.",
    },
    {
      agentId: "relative-value",
      agentName: "Relative Value Agent",
      position: "LONG",
      confidence: 0.67,
      rationale: "Votes LONG with synthetic size controls.",
    },
    {
      agentId: "contrarian",
      agentName: "Contrarian Agent",
      position: mode === "fault" ? "NO_TRADE" : "LONG",
      confidence: mode === "fault" ? 0.76 : 0.6,
      rationale:
        mode === "fault"
          ? "Votes NO_TRADE because the evidence mismatch must block execution."
          : "Votes LONG after no evidence integrity failure is found.",
    },
  ];
}

async function buildConsensus(
  sessionId: string,
  votes: DemoFinalVote[],
): Promise<DemoConsensus> {
  const longVotes = votes.filter((vote) => vote.position === "LONG").length;
  const noTradeVotes = votes.filter((vote) => vote.position === "NO_TRADE").length;
  const position = longVotes >= 2 ? "LONG" : noTradeVotes >= 2 ? "NO_TRADE" : null;
  const matchingVotes = Math.max(longVotes, noTradeVotes);

  await childSpan("consensus.resolution", {
    "session.id": sessionId,
    position: position ?? "NONE",
    "consensus.matching_votes": matchingVotes,
  });

  return {
    status: position ? "CONSENSUS" : "DEADLOCKED",
    position,
    matchingVotes,
    rationale:
      position === "LONG"
        ? `${matchingVotes} of 3 agents support a synthetic LONG before risk review.`
        : "No executable consensus was reached.",
  };
}

async function validateEvidence(
  sessionId: string,
  proposals: DemoAgentProposal[],
): Promise<EvidenceIntegrityScore> {
  const failedClaim = proposals
    .flatMap((proposal) =>
      proposal.evidence.map((claim) => ({
        agentName: proposal.agentName,
        claim,
      })),
    )
    .find((entry) => entry.claim.status === "CRITICAL");

  const score = failedClaim ? 60 : 100;
  const status = score >= 85 ? "PASS" : score >= 60 ? "WARN" : "CRITICAL";
  const normalizedStatus = failedClaim ? "CRITICAL" : status;

  await tracer.startActiveSpan(
    "evidence.validation",
    {
      attributes: {
        "session.id": sessionId,
        ticker: INFY_EVIDENCE_INTEGRITY_V1.ticker,
        "evidence_integrity.status": normalizedStatus,
        "evidence_integrity.score": failedClaim ? 60 : 100,
        "evidence.deviation_pct": failedClaim?.claim.deviationPercent ?? 0,
        "evidence.tolerance_pct": INFY_EVIDENCE_INTEGRITY_V1.tolerancePercent,
      },
    },
    async (span) => {
      if (failedClaim) {
        span.addEvent("evidence.validation.failure", {
          "agent.name": failedClaim.agentName,
          "evidence.cited_value": failedClaim.claim.citedPrice,
          "evidence.reference_value": failedClaim.claim.authoritativePrice,
          "evidence.deviation_pct": failedClaim.claim.deviationPercent,
        });
        span.setStatus({ code: SpanStatusCode.ERROR, message: "EVIDENCE_INTEGRITY failed" });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      span.end();
    },
  );

  if (failedClaim) {
    logInfo("Evidence validation failure", {
      "event_type": "evidence.validation.failure",
      "session.id": sessionId,
      "agent.name": failedClaim.agentName,
      "evidence.cited_value": failedClaim.claim.citedPrice,
      "evidence.reference_value": failedClaim.claim.authoritativePrice,
      "evidence.deviation_pct": failedClaim.claim.deviationPercent,
    });
  }

  return {
    score: failedClaim ? 60 : 100,
    status: failedClaim ? "CRITICAL" : "PASS",
    explanation: failedClaim
      ? `Momentum Agent cited 1819.26 while the authoritative INFY fixture was 1684.50. The deviation was ${calculateInfyFaultDeviationPercent().toFixed(2)}%, above the 2.00% tolerance.`
      : "All agent price claims matched the authoritative INFY fixture within the 2.00% tolerance.",
  };
}

async function reviewRisk(
  sessionId: string,
  consensus: DemoConsensus,
  evidenceIntegrity: EvidenceIntegrityScore,
): Promise<RiskReview> {
  const rules: RiskRuleResult[] = [
    {
      ruleName: "REQUIRED_AGENTS_COMPLETED",
      passed: true,
      severity: "INFO",
      detail: "Three of three agents completed proposals and final votes.",
    },
    {
      ruleName: "MIN_MATCHING_FINAL_VOTES",
      passed: consensus.matchingVotes >= 2,
      severity: consensus.matchingVotes >= 2 ? "INFO" : "CRITICAL",
      detail: `${consensus.matchingVotes} of 3 final votes matched.`,
    },
    {
      ruleName: "MAX_DISAGREEMENT",
      passed: (3 - consensus.matchingVotes) / 3 <= 0.34,
      severity: (3 - consensus.matchingVotes) / 3 <= 0.34 ? "INFO" : "WARN",
      detail: "Disagreement is within the configured threshold.",
    },
    {
      ruleName: "SESSION_BUDGET",
      passed: true,
      severity: "INFO",
      detail: "Deterministic mock session cost is below 0.20 USD.",
    },
    {
      ruleName: "EVIDENCE_INTEGRITY",
      passed: evidenceIntegrity.status !== "CRITICAL",
      severity: evidenceIntegrity.status === "CRITICAL" ? "CRITICAL" : "INFO",
      detail:
        evidenceIntegrity.status === "CRITICAL"
          ? "Momentum Agent cited 1819.26 against authoritative 1684.50, an 8.00% deviation above 2.00% tolerance."
          : "Evidence integrity passed.",
    },
    {
      ruleName: "MARKET_DATA_FRESHNESS",
      passed: true,
      severity: "INFO",
      detail: "The deterministic fixture timestamp is valid for the demo horizon.",
    },
  ];

  const failedRules = rules
    .filter((rule) => !rule.passed)
    .map((rule) => rule.ruleName);

  await childSpan("risk.review", {
    "session.id": sessionId,
    "risk.approved": failedRules.length === 0,
    failed_rules: failedRules.join(","),
  });

  return {
    riskReviewId: crypto.randomUUID(),
    approved: failedRules.length === 0,
    failedRules,
    rules,
  };
}

async function attemptExecution(
  sessionId: string,
  riskReview: RiskReview,
): Promise<ExecutionAttempt> {
  const executionAllowed = riskReview.approved;
  const status = executionAllowed ? "EXECUTED" : "BLOCKED";

  await childSpan("trade.execution.attempt", {
    "session.id": sessionId,
    "execution.allowed": executionAllowed,
    "execution.status": status,
  });

  if (executionAllowed) {
    await childSpan("trade.execution", {
      "session.id": sessionId,
      "execution.synthetic": true,
    });
  }

  logInfo(executionAllowed ? "Trade executed" : "Trade blocked", {
    "event_type": executionAllowed ? "trade.executed" : "trade.blocked",
    "session.id": sessionId,
    "execution.status": status,
  });

  return {
    executionAllowed,
    status,
    reason: executionAllowed
      ? "Synthetic execution completed after approved risk review."
      : "Execution blocked because risk_approved was not true.",
  };
}

function buildLifecycle(
  riskReview: RiskReview,
  execution: ExecutionAttempt,
): SessionState[] {
  return [
    "SESSION_CREATED",
    "MARKET_SNAPSHOT_READY",
    "INDEPENDENT_PROPOSALS",
    "CROSS_EXAMINATION",
    "FINAL_VOTES",
    "CONSENSUS_RESOLUTION",
    "RISK_REVIEW",
    riskReview.approved ? "APPROVED" : "VETOED",
    "EXECUTION_ATTEMPT",
    execution.status,
  ];
}

function buildReplay(mode: SessionMode): ReplayStep[] {
  if (mode === "healthy") {
    return [
      { order: 1, title: "Market snapshot captured", detail: "INFY authoritative price was 1684.50." },
      { order: 2, title: "Agents proposed", detail: "All agents cited fixture-aligned evidence." },
      { order: 3, title: "Risk review passed", detail: "Evidence integrity passed and synthetic execution was allowed." },
    ];
  }

  return [
    { order: 1, title: "Market snapshot captured", detail: "INFY authoritative price was 1684.50." },
    { order: 2, title: "Momentum context corrupted", detail: "Momentum Agent received 1819.26." },
    { order: 3, title: "Momentum cited fault price", detail: "Momentum cited 1819.26 in its proposal." },
    { order: 4, title: "Authoritative source checked", detail: "The fixture still showed 1684.50." },
    { order: 5, title: "Deviation computed", detail: "Evidence validator computed 8.00% deviation." },
    { order: 6, title: "Tolerance compared", detail: "Allowed tolerance was 2.00%." },
    { order: 7, title: "Risk rule failed", detail: "EVIDENCE_INTEGRITY failed with CRITICAL severity." },
    { order: 8, title: "Execution blocked", detail: "The risk engine vetoed execution before any synthetic trade." },
    { order: 9, title: "Telemetry recorded", detail: "TraceRoom emitted decision, evidence, risk, and execution telemetry." },
  ];
}

function buildSignozTraceUrl(traceId: string): string | null {
  const baseUrl = process.env.SIGNOZ_BASE_URL ?? "http://localhost:8080";
  return `${baseUrl}/trace/${traceId}`;
}

function buildSignozDashboardUrl(): string | null {
  const baseUrl = process.env.SIGNOZ_BASE_URL ?? "http://localhost:8080";
  return `${baseUrl}/dashboard`;
}
