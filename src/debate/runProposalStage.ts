import { AgentRoom } from "../domain/agent";
import { MarketSnapshot } from "../domain/market";
import { AgentProposal } from "../schemas/proposal";
import { generateProposal } from "../agents/generateProposal";
import { withSpan } from "../telemetry/withSpan";
import { logInfo } from "../telemetry/logger";

export async function runProposalStage(
  agents: AgentRoom,
  snapshot: MarketSnapshot,
): Promise<AgentProposal[]> {
  const proposalPromises = agents.map((agent) =>
    withSpan("agent.proposal", async (span) => {
      span.setAttributes({
        "agent.id": agent.agentId,
        "agent.name": agent.displayName,
        "agent.persona": agent.persona,
        "agent.risk_appetite": agent.riskAppetite,
        "debate.round.number": 1,
      });

      const proposal = await generateProposal(agent, snapshot);

      span.setAttributes({
        "proposal.position": proposal.position,
        "proposal.confidence": proposal.confidence,
        "proposal.evidence_count": proposal.evidence.length,
        "proposal.risk_count": proposal.risks.length,
      });

      span.addEvent("agent.proposal.completed", {
        position: proposal.position,
        confidence: proposal.confidence,
      });

      logInfo("Agent proposal generated", {
        "event.name": "agent.proposal.generated",
        "agent.id": agent.agentId,
        "agent.name": agent.displayName,
        "snapshot.id": proposal.snapshotId,
        "proposal.position": proposal.position,
        "proposal.confidence": proposal.confidence,
        "proposal.thesis": proposal.thesis,
        "proposal.evidence": proposal.evidence,
        "proposal.risks": proposal.risks,
      });

      return proposal;
    }),
  );

  return Promise.all(proposalPromises);
}
