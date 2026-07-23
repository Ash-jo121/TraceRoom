import type { FinalVote } from "../schemas/finalVote";
import type { Position } from "../schemas/proposal";
import type { SessionScenario, VoteOverride } from "../session/types";

const deadlockPositions: readonly Position[] = ["LONG", "SHORT", "NO_TRADE"];

export interface ControlledVoteScenario {
  applied: boolean;
  type: "none" | "deadlock" | "directional-risk-veto";
  votesOverridden: boolean;
  voteOverrides: VoteOverride[];
  finalVotes: FinalVote[];
}

export function applyControlledVoteScenario(
  votes: readonly FinalVote[],
  scenario: SessionScenario,
): ControlledVoteScenario {
  if (scenario === "deadlock") {
    const voteOverrides = votes.map((vote, index) => {
      const forcedPosition = deadlockPositions[index] ?? "NO_TRADE";
      return {
        agentId: vote.agentId,
        originalPosition: vote.position,
        forcedPosition,
        overridden: vote.position !== forcedPosition,
      };
    });

    return {
      applied: true,
      type: "deadlock",
      votesOverridden: voteOverrides.some((vote) => vote.overridden),
      voteOverrides,
      finalVotes: votes.map((vote, index) => {
        const position = deadlockPositions[index] ?? "NO_TRADE";
        return {
          ...vote,
          position,
          supportedProposalAgentId: null,
          changedFromInitial: vote.initialPosition !== position,
          rationale: `Controlled deadlock replay: ${vote.agentId} is assigned ${position} so no position receives a majority.`,
        };
      }),
    };
  }

  if (scenario === "risk-veto") {
    const voteOverrides = votes.map((vote) => ({
      agentId: vote.agentId,
      originalPosition: vote.position,
      forcedPosition: "LONG" as const,
      overridden: vote.position !== "LONG",
    }));

    return {
      applied: true,
      type: "directional-risk-veto",
      votesOverridden: voteOverrides.some((vote) => vote.overridden),
      voteOverrides,
      finalVotes: votes.map((vote) => ({
        ...vote,
        position: "LONG",
        supportedProposalAgentId: null,
        changedFromInitial: vote.initialPosition !== "LONG",
        rationale:
          "Controlled risk-veto replay: the room reaches LONG consensus before the stricter price-move policy is evaluated.",
      })),
    };
  }

  return {
    applied: false,
    type: "none",
    votesOverridden: false,
    voteOverrides: [],
    finalVotes: [...votes],
  };
}
