import type { Position } from "../schemas/proposal";
import type { FinalVote } from "../schemas/finalVote";

export interface ConsensusResult {
  status: "CONSENSUS" | "DEADLOCKED";
  position: Position | null;
  unanimous: boolean;
  voteCounts: Record<Position, number>;
  supportingAgentIds: string[];
  changedAgentIds: string[];
  dissentingAgentIds?: string[];
}

export function resolveConsensus(votes: readonly FinalVote[]): ConsensusResult {
  if (votes.length !== 3) {
    throw new Error(`Expected three final votes, received ${votes.length}`);
  }

  const uniqueAgentIds = new Set(votes.map((vote) => vote.agentId));

  if (uniqueAgentIds.size !== votes.length) {
    throw new Error("Final votes contain duplicate agent IDs");
  }

  const uniqueSnapshotIds = new Set(votes.map((vote) => vote.snapshotId));

  if (uniqueSnapshotIds.size !== 1) {
    throw new Error("Final votes do not reference the same snapshot");
  }

  const voteCounts: Record<Position, number> = {
    LONG: 0,
    SHORT: 0,
    NO_TRADE: 0,
  };

  for (const vote of votes) {
    voteCounts[vote.position] += 1;
  }

  const positions: Position[] = ["LONG", "SHORT", "NO_TRADE"];

  const winningPosition =
    positions.find((position) => voteCounts[position] >= 2) ?? null;

  return {
    status: winningPosition === null ? "DEADLOCKED" : "CONSENSUS",

    position: winningPosition,

    unanimous:
      winningPosition !== null && voteCounts[winningPosition] === votes.length,

    voteCounts,

    supportingAgentIds:
      winningPosition === null
        ? []
        : votes
            .filter((vote) => vote.position === winningPosition)
            .map((vote) => vote.agentId),

    changedAgentIds: votes
      .filter((vote) => vote.changedFromInitial)
      .map((vote) => vote.agentId),

    dissentingAgentIds:
      winningPosition === null
        ? votes.map((vote) => vote.agentId)
        : votes
            .filter((vote) => vote.position !== winningPosition)
            .map((vote) => vote.agentId),
  };
}
