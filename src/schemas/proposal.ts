import { z } from "zod";

export const PositionSchema = z.enum(["LONG", "SHORT", "NO_TRADE"]);

export const EvidenceClaimTypeSchema = z.enum([
  "CURRENT_PRICE",
  "PREVIOUS_CLOSE",
  "DAY_OPEN",
  "DAY_HIGH",
  "DAY_LOW",
  "VOLUME",
  "AVERAGE_VOLUME",
  "SMA20",
  "EMA9",
  "RSI14",
]);

export const EvidenceClaimSchema = z
  .object({
    sourceId: z.string().min(1),

    claimType: EvidenceClaimTypeSchema,

    citedValue: z.number(),

    statement: z.string().min(20).max(500),
  })
  .strict();

export const ProposalContentSchema = z
  .object({
    position: PositionSchema,

    confidence: z.number().min(0).max(1),

    thesis: z.string().min(20).max(1000),

    evidence: z.array(EvidenceClaimSchema).min(1).max(5),

    risks: z.array(z.string().min(1)).max(5),
  })
  .strict();

export type Position = z.infer<typeof PositionSchema>;

export type EvidenceClaimType = z.infer<typeof EvidenceClaimTypeSchema>;

export type EvidenceClaim = z.infer<typeof EvidenceClaimSchema>;

export type ProposalContent = z.infer<typeof ProposalContentSchema>;

export type AgentProposal = ProposalContent & {
  agentId: string;
  snapshotId: string;
};
