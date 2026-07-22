import { randomUUID } from "node:crypto";
import type { SpanContext } from "@opentelemetry/api";
import { agentConfigs } from "../config/agents";
import { runFinalVoteStage } from "../debate/runFinalVoteStage";
import { runProposalStage } from "../debate/runProposalStage";
import { runRebuttalStage } from "../debate/runRebuttalStage";
import { resolveConsensus } from "../debate/resolveConsensus";
import { traceEvidenceValidation } from "../evidence/traceEvidenceValidation";
import { runEvaluationTrace } from "../evaluation/runEvaluationTrace";
import { evaluationFixture } from "../fixtures/evaluationFixture";
import { marketSnapshot } from "../fixtures/marketSnapshot";
import { traceMarketSnapshot } from "../market/traceMarketSnapshot";
import { traceRiskReview } from "../risk/traceRiskreview";
import { applyControlledEvidenceFault } from "../scenarios/applyControlledEvidenceFault";
import { getRiskReviewScenario } from "../scenarios/getRiskReviewScenario";
import type { Position } from "../schemas/proposal";
import { logInfo } from "../telemetry/logger";
import { withSpan } from "../telemetry/withSpan";
import type { RecordedSession, ReplayStep, SessionMode } from "./types";

interface DebateResult {
  sourceSpanContext: SpanContext;
  scenario: string;
  proposals: RecordedSession["proposals"];
  rebuttals: RecordedSession["rebuttals"];
  finalVotes: RecordedSession["finalVotes"];
  consensus: RecordedSession["consensus"];
  evidenceValidation: RecordedSession["evidenceValidation"];
  riskReview: RecordedSession["riskReview"];
}

export async function runDebateSession(
  mode: SessionMode,
): Promise<RecordedSession> {
  const sessionId = randomUUID();
  const createdAt = new Date().toISOString();

  const debateResult = await withSpan("debate.session", async (sessionSpan) => {
    sessionSpan.setAttributes({
      "traceroom.session.id": sessionId,
      "traceroom.session.mode": mode,
      "market.snapshot.id": marketSnapshot.snapshotId,
      "market.symbol": marketSnapshot.symbol,
      "decision.horizon_minutes": marketSnapshot.decisionHorizonMinutes,
      "debate.agent_count": agentConfigs.length,
      "debate.max_rounds": 3,
    });

    await traceMarketSnapshot(marketSnapshot);

    const generatedProposals = await withSpan(
      "debate.round.proposal",
      async (span) => {
        span.setAttributes({
          "debate.round.number": 1,
          "debate.stage": "PROPOSAL",
          "debate.agent_count": agentConfigs.length,
        });

        const results = await runProposalStage(agentConfigs, marketSnapshot);

        span.setAttributes({
          "proposal.long_count": results.filter(
            (proposal) => proposal.position === "LONG",
          ).length,
          "proposal.short_count": results.filter(
            (proposal) => proposal.position === "SHORT",
          ).length,
          "proposal.no_trade_count": results.filter(
            (proposal) => proposal.position === "NO_TRADE",
          ).length,
        });
        span.addEvent("proposal.stage.completed", {
          "proposal.count": results.length,
        });

        return results;
      },
    );

    const controlledScenario = applyControlledEvidenceFault(generatedProposals);
    const proposals = controlledScenario.proposals;

    sessionSpan.setAttribute("traceroom.scenario", controlledScenario.scenario);

    if (controlledScenario.faultInjected) {
      sessionSpan.setAttributes({
        "fault.injected": true,
        "fault.type": "evidence-price-deviation",
        "fault.agent_id": controlledScenario.agentId,
        "fault.claim_index": controlledScenario.claimIndex,
        "fault.original_value": controlledScenario.originalValue,
        "fault.tampered_value": controlledScenario.tamperedValue,
      });
      sessionSpan.addEvent("controlled_fault.injected", {
        "fault.type": "evidence-price-deviation",
        "agent.id": controlledScenario.agentId,
        "evidence.claim_index": controlledScenario.claimIndex,
        "evidence.original_value": controlledScenario.originalValue,
        "evidence.tampered_value": controlledScenario.tamperedValue,
      });
    }

    const evidenceValidation = await traceEvidenceValidation(
      marketSnapshot,
      proposals,
    );

    sessionSpan.setAttributes({
      "evidence.checked_count": evidenceValidation.checkedCount,
      "evidence.valid_count": evidenceValidation.validCount,
      "evidence.invalid_count": evidenceValidation.invalidCount,
      "evidence.invalid_agent_count": evidenceValidation.invalidAgentCount,
      "evidence.validation.status": evidenceValidation.validationStatus,
      "evidence.blocked": evidenceValidation.blocked,
    });
    sessionSpan.addEvent("evidence.validation.completed", {
      "evidence.checked_count": evidenceValidation.checkedCount,
      "evidence.valid_count": evidenceValidation.validCount,
      "evidence.invalid_count": evidenceValidation.invalidCount,
      "evidence.validation.status": evidenceValidation.validationStatus,
      "evidence.blocked": evidenceValidation.blocked,
    });

    if (evidenceValidation.blocked) {
      throw new Error(
        `Debate blocked: ${evidenceValidation.invalidCount} evidence claim(s) failed validation`,
      );
    }

    const rebuttals = await withSpan(
      "debate.round.cross_examination",
      async (span) => {
        span.setAttributes({
          "debate.round.number": 2,
          "debate.stage": "CROSS_EXAMINATION",
          "debate.agent_count": agentConfigs.length,
        });

        const results = await runRebuttalStage(
          agentConfigs,
          marketSnapshot,
          proposals,
        );
        const critiqueCount = results.reduce(
          (total, rebuttal) => total + rebuttal.critiques.length,
          0,
        );

        span.setAttributes({
          "rebuttal.count": results.length,
          "critique.count": critiqueCount,
        });
        span.addEvent("cross_examination.stage.completed", {
          "rebuttal.count": results.length,
          "critique.count": critiqueCount,
        });

        return results;
      },
    );

    const finalVotes = await withSpan(
      "debate.round.final_vote",
      async (span) => {
        span.setAttributes({
          "debate.round.number": 3,
          "debate.stage": "FINAL_VOTE",
          "debate.agent_count": agentConfigs.length,
        });

        const results = await runFinalVoteStage(
          agentConfigs,
          marketSnapshot,
          proposals,
          rebuttals,
        );

        span.setAttributes({
          "final_vote.long_count": results.filter(
            (vote) => vote.position === "LONG",
          ).length,
          "final_vote.short_count": results.filter(
            (vote) => vote.position === "SHORT",
          ).length,
          "final_vote.no_trade_count": results.filter(
            (vote) => vote.position === "NO_TRADE",
          ).length,
          "final_vote.changed_count": results.filter(
            (vote) => vote.changedFromInitial,
          ).length,
        });
        span.addEvent("final_vote.stage.completed", {
          "final_vote.count": results.length,
        });

        return results;
      },
    );

    const consensus = await withSpan("consensus.resolve", async (span) => {
      const result = resolveConsensus(finalVotes);

      span.setAttributes({
        "consensus.status": result.status,
        "consensus.position": result.position ?? "NONE",
        "consensus.unanimous": result.unanimous,
        "consensus.supporting_agent_ids": [...result.supportingAgentIds],
        "consensus.dissenting_agent_ids": [
          ...(result.dissentingAgentIds ?? []),
        ],
      });

      return result;
    });

    sessionSpan.setAttributes({
      "consensus.status": consensus.status,
      "consensus.position": consensus.position ?? "NONE",
      "consensus.unanimous": consensus.unanimous,
      "consensus.changed_agent_count": consensus.changedAgentIds.length,
      "consensus.dissenting_agent_count": consensus.dissentingAgentIds?.length,
      "consensus.supporting_agent_ids": [...consensus.supportingAgentIds],
      "consensus.dissenting_agent_ids": [
        ...(consensus.dissentingAgentIds ?? []),
      ],
    });
    sessionSpan.addEvent("consensus.resolved", {
      status: consensus.status,
      position: consensus.position ?? "NONE",
      unanimous: consensus.unanimous,
    });

    logInfo("Consensus resolved", {
      "event.name": "debate.consensus.resolved",
      "traceroom.session.id": sessionId,
      "snapshot.id": marketSnapshot.snapshotId,
      "consensus.status": consensus.status,
      "consensus.position": consensus.position ?? "none",
      "consensus.unanimous": consensus.unanimous,
      "consensus.supporting_agent_ids": consensus.supportingAgentIds,
      "consensus.dissenting_agent_ids": consensus.dissentingAgentIds,
      "consensus.changed_agent_ids": consensus.changedAgentIds,
      "consensus.long_count": consensus.voteCounts.LONG,
      "consensus.short_count": consensus.voteCounts.SHORT,
      "consensus.no_trade_count": consensus.voteCounts.NO_TRADE,
    });

    const riskScenario = getRiskReviewScenario();
    const riskReview = await traceRiskReview(
      consensus,
      marketSnapshot,
      riskScenario.policy,
    );

    sessionSpan.setAttributes({
      "risk.review.status": riskReview.status,
      "risk.position": riskReview.position ?? "NONE",
      "risk.trade_allowed": riskReview.tradeAllowed,
      "risk.triggered_rule_count": riskReview.triggeredRuleIds.length,
      "risk.triggered_rule_ids": [...riskReview.triggeredRuleIds],
    });
    sessionSpan.addEvent("risk.review.completed", {
      "risk.review.status": riskReview.status,
      "risk.position": riskReview.position ?? "NONE",
      "risk.trade_allowed": riskReview.tradeAllowed,
      "risk.triggered_rule_count": riskReview.triggeredRuleIds.length,
    });

    return {
      sourceSpanContext: sessionSpan.spanContext(),
      scenario: controlledScenario.scenario,
      proposals,
      rebuttals,
      finalVotes,
      consensus,
      evidenceValidation,
      riskReview,
    } satisfies DebateResult;
  });

  const evaluation = await evaluateConsensus(sessionId, debateResult);
  const executionAllowed = debateResult.riskReview.tradeAllowed;

  return {
    sessionId,
    createdAt,
    mode,
    scenario: debateResult.scenario,
    snapshot: marketSnapshot,
    agents: [...agentConfigs],
    lifecycle: buildLifecycle(debateResult),
    proposals: debateResult.proposals,
    rebuttals: debateResult.rebuttals,
    finalVotes: debateResult.finalVotes,
    consensus: debateResult.consensus,
    evidenceValidation: debateResult.evidenceValidation,
    riskReview: debateResult.riskReview,
    evaluation,
    execution: {
      executionAllowed,
      status: executionAllowed ? "READY" : "BLOCKED",
      reason: executionAllowed
        ? "Risk review approved the replay decision. No trade was placed."
        : "Risk review blocked execution. No trade was placed.",
    },
    outcome: debateResult.riskReview.status,
    replay: buildReplay(debateResult),
    signoz: {
      traceId: debateResult.sourceSpanContext.traceId,
      traceUrl: `${signozBaseUrl()}/trace/${debateResult.sourceSpanContext.traceId}`,
      logsHint: `Search logs for traceroom.session.id="${sessionId}"`,
      dashboardUrl: `${signozBaseUrl()}/dashboard`,
    },
  };
}

async function evaluateConsensus(
  sessionId: string,
  debateResult: DebateResult,
): Promise<RecordedSession["evaluation"]> {
  if (
    debateResult.consensus.status !== "CONSENSUS" ||
    !debateResult.consensus.position
  ) {
    return null;
  }

  if (evaluationFixture.snapshotId !== marketSnapshot.snapshotId) {
    throw new Error("Evaluation fixture does not match the debate snapshot");
  }

  const dissentingPositions: Position[] = debateResult.finalVotes
    .filter((vote) =>
      debateResult.consensus.dissentingAgentIds?.includes(vote.agentId),
    )
    .map((vote) => vote.position);

  return runEvaluationTrace({
    sessionId,
    sourceSpanContext: debateResult.sourceSpanContext,
    fixture: evaluationFixture,
    selectedPosition: debateResult.consensus.position,
    dissentingPositions,
  });
}

function buildLifecycle(debateResult: DebateResult): string[] {
  return [
    "SESSION_CREATED",
    "MARKET_SNAPSHOT_READY",
    "INDEPENDENT_PROPOSALS",
    "EVIDENCE_VALIDATED",
    "CROSS_EXAMINATION",
    "FINAL_VOTES",
    "CONSENSUS_RESOLUTION",
    "RISK_REVIEW",
    debateResult.riskReview.status,
    debateResult.riskReview.tradeAllowed ? "EXECUTION_READY" : "BLOCKED",
    ...(debateResult.consensus.status === "CONSENSUS"
      ? ["EVALUATED"]
      : []),
  ];
}

function buildReplay(debateResult: DebateResult): ReplayStep[] {
  return [
    {
      order: 1,
      title: "ACME snapshot captured",
      detail: `Snapshot ${marketSnapshot.snapshotId} captured ACME at ${marketSnapshot.currentPrice}.`,
    },
    {
      order: 2,
      title: "Independent proposals completed",
      detail: `${debateResult.proposals.length} agents produced snapshot-grounded proposals.`,
    },
    {
      order: 3,
      title: "Evidence validated",
      detail: `${debateResult.evidenceValidation.validCount}/${debateResult.evidenceValidation.checkedCount} claims matched the snapshot.`,
    },
    {
      order: 4,
      title: "Cross-examination completed",
      detail: `${debateResult.rebuttals.length} agents challenged the other proposals.`,
    },
    {
      order: 5,
      title: "Final votes submitted",
      detail: `${debateResult.finalVotes.length} final votes were recorded.`,
    },
    {
      order: 6,
      title: "Consensus resolved",
      detail: `${debateResult.consensus.status}: ${debateResult.consensus.position ?? "no position"}.`,
    },
    {
      order: 7,
      title: "Risk review completed",
      detail: `${debateResult.riskReview.status}; trade allowed=${debateResult.riskReview.tradeAllowed}.`,
    },
  ];
}

function signozBaseUrl(): string {
  return process.env.SIGNOZ_BASE_URL ?? "http://localhost:8080";
}
