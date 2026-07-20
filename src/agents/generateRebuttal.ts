import type { AgentConfig } from "../domain/agent";
import type { MarketSnapshot } from "../domain/market";
import type { AgentProposal } from "../schemas/proposal";
import { RebuttalContentSchema, type AgentRebuttal } from "../schemas/rebuttal";
import { env } from "../config/env";
import { llmClient } from "../llm/llmClient";
import { toApiMessage } from "../llm/toApiMessage";
import { buildRebuttalPrompt } from "../prompts/buildRebuttalPrompt";
import { withLlmCall } from "../llm/withLlmCall";
import { zodResponseFormat } from "openai/helpers/zod.mjs";

export async function generateRebuttal(
  agent: AgentConfig,
  snapshot: MarketSnapshot,
  proposals: readonly AgentProposal[],
): Promise<AgentRebuttal> {
  const promptMessages = buildRebuttalPrompt(agent, snapshot, proposals);

  const apiMessages = promptMessages.map(toApiMessage);

  const completion = await withLlmCall(
    {
      agentId: agent.agentId,
      agentName: agent.displayName,
      stage: "CROSS_EXAMINATION",
      snapshotId: snapshot.snapshotId,
    },
    () =>
      llmClient.chat.completions.parse({
        model: env.LLM_MODEL,
        messages: apiMessages,
        response_format: zodResponseFormat(
          RebuttalContentSchema,
          "agent_rebuttal",
        ),
      }),
  );

  const rawContent = completion.choices[0]?.message.content;

  if (!rawContent) {
    throw new Error("The model returned an empty rebuttal");
  }

  const parsedContent: unknown = JSON.parse(rawContent);

  const validatedContent = RebuttalContentSchema.parse(parsedContent);

  const expectedTargetIds = proposals
    .filter((proposal) => proposal.agentId !== agent.agentId)
    .map((proposal) => proposal.agentId);

  const actualTargetIds = validatedContent.critiques.map(
    (critique) => critique.targetAgentId,
  );

  const hasUniqueTargets =
    new Set(actualTargetIds).size === actualTargetIds.length;

  const hasEveryExpectedTarget = expectedTargetIds.every((agentId) =>
    actualTargetIds.includes(agentId),
  );

  if (!hasUniqueTargets || !hasEveryExpectedTarget) {
    throw new Error(
      `${agent.agentId} returned incorrect critique targets. ` +
        `Expected ${expectedTargetIds.join(", ")}, ` +
        `received ${actualTargetIds.join(", ")}`,
    );
  }

  return {
    agentId: agent.agentId,
    snapshotId: snapshot.snapshotId,
    ...validatedContent,
  };
}
