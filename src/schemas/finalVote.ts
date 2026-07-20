import { z } from "zod";
import { PositionSchema, type Position } from "./proposal";

export const CritiqueDispositionSchema = z.enum([
  "ACCEPTED",
  "PARTIALLY_ACCEPTED",
  "REJECTED",
]);

export const CritiqueResponseSchema = z
  .object({
    sourceAgentId: z.string().min(1),

    disposition: CritiqueDispositionSchema,

    response: z.string().min(20).max(1000),
  })
  .strict();

export const FinalVoteContentSchema = z
  .object({
    critiqueResponses: z.array(CritiqueResponseSchema).length(2),

    revisedThesis: z.string().min(20).max(1000),

    position: PositionSchema,

    confidence: z.number().min(0).max(1),

    supportedProposalAgentId: z.string().min(1).nullable(),

    rationale: z.string().min(20).max(1000),
  })
  .strict();

export type FinalVoteContent = z.infer<typeof FinalVoteContentSchema>;

export type FinalVote = FinalVoteContent & {
  agentId: string;
  snapshotId: string;
  initialPosition: Position;
  changedFromInitial: boolean;
};
