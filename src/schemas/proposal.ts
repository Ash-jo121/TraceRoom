import { z } from "zod";

export const PositionSchema = z.enum(["LONG", "SHORT", "NO_TRADE"]);

export const ProposalContentSchema = z
  .object({
    position: PositionSchema,

    confidence: z.number().min(0).max(1),

    thesis: z.string().min(20).max(1000),

    evidence: z.array(z.string().min(1)).min(1).max(5),

    risks: z.array(z.string().min(1)).max(5),
  })
  .strict();

export type Position = z.infer<typeof PositionSchema>;

export type ProposalContent = z.infer<typeof ProposalContentSchema>;

export type AgentProposal = ProposalContent & {
  agentId: string;
  snapshotId: string;
};
