import type { AgentRoom } from "../domain/agent";
import type { MarketSnapshot } from "../domain/market";
import type { AgentProposal } from "../schemas/proposal";
import type { AgentRebuttal } from "../schemas/rebuttal";
import { generateRebuttal } from "../agents/generateRebuttal";
import { withSpan } from "../telemetry/withSpan";
import { logInfo } from "../telemetry/logger";

export async function runRebuttalStage(
  agents: AgentRoom,
  snapshot: MarketSnapshot,
  proposals: readonly AgentProposal[],
): Promise<AgentRebuttal[]> {
  if (proposals.length !== agents.length) {
    throw new Error(
      `Expected ${agents.length} proposals, received ${proposals.length}`,
    );
  }

  const rebuttalPromises = agents.map((agent) =>
    withSpan("agent.rebuttal", async (span) => {
      span.setAttributes({
        "agent.id": agent.agentId,
        "agent.name": agent.displayName,
        "agent.persona": agent.persona,
        "agent.risk_appetite": agent.riskAppetite,
        "debate.round.number": 2,
      });

      const rebuttal = await generateRebuttal(agent, snapshot, proposals);

      span.setAttributes({
        "rebuttal.critique_count": rebuttal.critiques.length,
        "rebuttal.target_agent_ids": rebuttal.critiques.map(
          (critique) => critique.targetAgentId,
        ),
      });

      span.addEvent("agent.rebuttal.completed", {
        "critique.count": rebuttal.critiques.length,
      });

      logInfo("Agent rebuttal generated", {
        "event.name": "agent.rebuttal.generated",
        "agent.id": agent.agentId,
        "agent.name": agent.displayName,
        "snapshot.id": rebuttal.snapshotId,
        "rebuttal.critique_count": rebuttal.critiques.length,
        "rebuttal.overall_assessment": rebuttal.overallAssessment,
      });

      for (const critique of rebuttal.critiques) {
        logInfo("Agent critique generated", {
          "event.name": "agent.critique.generated",
          "agent.id": agent.agentId,
          "agent.name": agent.displayName,
          "snapshot.id": rebuttal.snapshotId,
          "critique.target_agent_id": critique.targetAgentId,
          "critique.strongest_agreement": critique.strongestAgreement,
          "critique.strongest_objection": critique.strongestObjection,
          "critique.evidence_conflicts": critique.evidenceConflicts,
        });
      }

      return rebuttal;
    }),
  );

  return Promise.all(rebuttalPromises);
}
