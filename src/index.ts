import { randomUUID } from "node:crypto";
import { agentConfigs } from "./config/agents";
import { runProposalStage } from "./debate/runProposalStage";
import { marketSnapshot } from "./fixtures/marketSnapshot";
import { runRebuttalStage } from "./debate/runRebuttalStage";
import { runFinalVoteStage } from "./debate/runFinalVoteStage";
import { resolveConsensus } from "./debate/resolveConsensus";
import { withSpan } from "./telemetry/withSpan";
import { telemetrySdk } from "./telemetry/tracing";
import { logInfo } from "./telemetry/logger";
import { evaluationFixture } from "./fixtures/evaluationFixture";
import { Position } from "./schemas/proposal";
import { runEvaluationTrace } from "./evaluation/runEvaluationTrace";
import { traceMarketSnapshot } from "./market/traceMarketSnapshot";
import { traceEvidenceValidation } from "./evidence/traceEvidenceValidation";
import { applyControlledEvidenceFault } from "./scenarios/applyControlledEvidenceFault";
import { traceRiskReview } from "./risk/traceRiskreview";
import { getRiskReviewScenario } from "./scenarios/getRiskReviewScenario";

console.log("TraceRoom Debate Simulation Starting...");

console.log("\nShared market snapshot:");
console.log(JSON.stringify(marketSnapshot, null, 2));

console.log("\nConfigured agents:");

for (const agent of agentConfigs) {
  console.log(
    `- ${agent.displayName} | ${agent.persona} | Risk: ${agent.riskAppetite}`,
  );
}

try {
  await runDebateSession();
} catch (error) {
  console.error("Error running debate session:");

  if (error instanceof Error) {
    console.error("Error message:", error.message);
  } else {
    console.error("Unknown error:", error);
  }

  process.exitCode = 1;
} finally {
  try {
    await telemetrySdk.shutdown();
    console.log("Telemetry SDK shutdown complete");
  } catch (error) {
    console.warn(
      "Telemetry SDK shutdown failed; continuing because the debate run completed.",
    );

    if (error instanceof Error) {
      console.warn("Telemetry error message:", error.message);
    }
  }
}

async function runDebateSession() {
  const sessionId = randomUUID();

  const debateResult = await withSpan("debate.session", async (sessionSpan) => {
    sessionSpan.setAttributes({
      "traceroom.session.id": sessionId,
      "market.snapshot.id": marketSnapshot.snapshotId,
      "market.symbol": marketSnapshot.symbol,
      "decision.horizon_minutes": marketSnapshot.decisionHorizonMinutes,
      "debate.agent_count": agentConfigs.length,
      "debate.max_rounds": 3,
    });

    await traceMarketSnapshot(marketSnapshot);

    // Move your existing pipeline here:
    const proposals = await withSpan("debate.round.proposal", async (span) => {
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
    });

    // Keep your existing proposal logging here.

    const controlledScenario = applyControlledEvidenceFault(proposals);

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

    const evidenceReport = await traceEvidenceValidation(
      marketSnapshot,
      controlledScenario.proposals,
    );

    sessionSpan.setAttributes({
      "evidence.checked_count": evidenceReport.checkedCount,
      "evidence.valid_count": evidenceReport.validCount,
      "evidence.invalid_count": evidenceReport.invalidCount,
      "evidence.invalid_agent_count": evidenceReport.invalidAgentCount,
      "evidence.validation.status": evidenceReport.validationStatus,
      "evidence.blocked": evidenceReport.blocked,
    });

    sessionSpan.addEvent("evidence.validation.completed", {
      "evidence.checked_count": evidenceReport.checkedCount,
      "evidence.valid_count": evidenceReport.validCount,
      "evidence.invalid_count": evidenceReport.invalidCount,
      "evidence.validation.status": evidenceReport.validationStatus,
      "evidence.blocked": evidenceReport.blocked,
    });

    if (evidenceReport.blocked) {
      throw new Error(
        `Debate blocked: ${evidenceReport.invalidCount} evidence claim(s) failed validation`,
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
          controlledScenario.proposals,
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

    const finalVoteReports = await withSpan(
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
          controlledScenario.proposals,
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

    // Keep your existing final-vote logging here.

    const consensus = await withSpan("consensus.resolve", async (span) => {
      const result = resolveConsensus(finalVoteReports);

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

    if (riskScenario.policyOverridden) {
      sessionSpan.setAttributes({
        "traceroom.scenario": riskScenario.scenario,
        "risk.policy.overridden": true,
        "risk.policy.overridden_rule_id":
          riskScenario.overriddenRuleId ?? "NONE",
        "risk.policy.original_threshold": riskScenario.originalThreshold ?? 0,
        "risk.policy.scenario_threshold": riskScenario.scenarioThreshold ?? 0,
      });

      sessionSpan.addEvent("controlled_risk_policy.applied", {
        "risk.rule.id": riskScenario.overriddenRuleId ?? "NONE",
        "risk.policy.original_threshold": riskScenario.originalThreshold ?? 0,
        "risk.policy.scenario_threshold": riskScenario.scenarioThreshold ?? 0,
      });
    }

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
      consensus,
      riskReview,
      finalVoteReports,
    };
  });

  console.log("\nRisk review:");
  console.log(JSON.stringify(debateResult.riskReview, null, 2));

  if (
    debateResult.consensus.status === "CONSENSUS" &&
    debateResult.consensus.position
  ) {
    if (evaluationFixture.snapshotId !== marketSnapshot.snapshotId) {
      throw new Error("Evaluation fixture does not match the debate snapshot");
    }

    const dissentingPositions: Position[] = debateResult.finalVoteReports
      .filter((vote) =>
        debateResult.consensus.dissentingAgentIds?.includes(vote.agentId),
      )
      .map((vote) => vote.position);

    const evaluationReport = await runEvaluationTrace({
      sessionId,
      sourceSpanContext: debateResult.sourceSpanContext,
      fixture: evaluationFixture,
      selectedPosition: debateResult.consensus.position,
      dissentingPositions,
    });

    console.log("\nLinked evaluation report:");
    console.log(JSON.stringify(evaluationReport, null, 2));
  } else {
    console.log("\nEvaluation skipped because the debate deadlocked");
  }
}
