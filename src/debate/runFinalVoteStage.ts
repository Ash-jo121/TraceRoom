import type { AgentRoom } from "../domain/agent";
import type { MarketSnapshot } from "../domain/market";
import type { AgentProposal } from "../schemas/proposal";
import type { AgentRebuttal } from "../schemas/rebuttal";
import { generateFinalVote } from "../agents/generateFinalVote";
import { FinalVote } from "../schemas/finalVote";
import { withSpan } from "../telemetry/withSpan";
import { logInfo } from "../telemetry/logger";

export async function runFinalVoteStage(
  agents: AgentRoom,
  snapshot: MarketSnapshot,
  proposals: readonly AgentProposal[],
  rebuttals: readonly AgentRebuttal[],
): Promise<FinalVote[]> {
  if (proposals.length !== agents.length) {
    throw new Error(
      `Expected ${agents.length} proposals, received ${proposals.length}`,
    );
  }

  if (rebuttals.length !== agents.length) {
    throw new Error(
      `Expected ${agents.length} rebuttals, received ${rebuttals.length}`,
    );
  }

  const finalVotePromises = agents.map((agent) =>
    withSpan("agent.final_vote", async (span) => {
      span.setAttributes({
        "agent.id": agent.agentId,
        "agent.name": agent.displayName,
        "agent.persona": agent.persona,
        "agent.risk_appetite": agent.riskAppetite,
        "debate.round.number": 3,
      });

      const finalVote = await generateFinalVote(
        agent,
        snapshot,
        proposals,
        rebuttals,
      );

      span.setAttributes({
        "final_vote.initial_position": finalVote.initialPosition,
        "final_vote.position": finalVote.position,
        "final_vote.confidence": finalVote.confidence,
        "final_vote.changed_from_initial": finalVote.changedFromInitial,
        "final_vote.supported_proposal_agent_id":
          finalVote.supportedProposalAgentId ?? "none",
        "final_vote.critique_response_count":
          finalVote.critiqueResponses.length,
      });

      span.addEvent("agent.final_vote.completed", {
        position: finalVote.position,
        confidence: finalVote.confidence,
        changed: finalVote.changedFromInitial,
      });

      logInfo("Agent final vote generated", {
        "event.name": "agent.final_vote.generated",
        "agent.id": agent.agentId,
        "agent.name": agent.displayName,
        "snapshot.id": finalVote.snapshotId,
        "final_vote.initial_position": finalVote.initialPosition,
        "final_vote.position": finalVote.position,
        "final_vote.confidence": finalVote.confidence,
        "final_vote.changed_from_initial": finalVote.changedFromInitial,
        "final_vote.supported_proposal_agent_id":
          finalVote.supportedProposalAgentId ?? "none",
        "final_vote.critique_response_count":
          finalVote.critiqueResponses.length,
        "final_vote.revised_thesis": finalVote.revisedThesis,
        "final_vote.rationale": finalVote.rationale,
      });

      for (const critiqueResponse of finalVote.critiqueResponses) {
        logInfo("Agent critique response generated", {
          "event.name": "agent.critique_response.generated",
          "agent.id": agent.agentId,
          "agent.name": agent.displayName,
          "snapshot.id": finalVote.snapshotId,
          "critique_response.source_agent_id": critiqueResponse.sourceAgentId,
          "critique_response.disposition": critiqueResponse.disposition,
          "critique_response.response": critiqueResponse.response,
        });
      }

      return finalVote;
    }),
  );

  return Promise.all(finalVotePromises);
}
