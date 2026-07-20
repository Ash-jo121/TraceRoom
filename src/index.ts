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
  await telemetrySdk.shutdown();
  console.log("Telemetry SDK shutdown complete");
}

async function runDebateSession() {
  const sessionId = crypto.randomUUID();

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

    return {
      sourceSpanContext: sessionSpan.spanContext(),
      consensus,
      finalVoteReports,
    };
  });

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
