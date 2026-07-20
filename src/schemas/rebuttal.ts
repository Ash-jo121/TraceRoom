import z from "zod";

export const ProposalCritiqueSchema = z
  .object({
    targetAgentId: z.string().min(1),

    strongestAgreement: z.string().min(10).max(500),

    strongestObjection: z.string().min(10).max(500),

    evidenceConflicts: z.array(z.string().min(1)).max(5),
  })
  .strict();

export const RebuttalContentSchema = z
  .object({
    critiques: z.array(ProposalCritiqueSchema).length(2),

    overallAssessment: z.string().min(20).max(1000),
  })
  .strict();

export type RebuttalContent = z.infer<typeof RebuttalContentSchema>;

export type AgentRebuttal = RebuttalContent & {
  agentId: string;
  snapshotId: string;
};
