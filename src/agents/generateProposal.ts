import { AgentConfig } from "../domain/agent";
import { buildProposalPrompt } from "../prompts/buildProposalPrompt";
import { AgentProposal, ProposalContentSchema } from "../schemas/proposal";
import { MarketSnapshot } from "../domain/market";
import { env } from "../config/env";
import { llmClient } from "../llm/llmClient";
import { toApiMessage } from "../llm/toApiMessage";
import { withLlmCall } from "../llm/withLlmCall";
import { zodResponseFormat } from "openai/helpers/zod.mjs";

export async function generateProposal(
  agent: AgentConfig,
  snapshot: MarketSnapshot,
): Promise<AgentProposal> {
  const promptMessages = buildProposalPrompt(agent, snapshot);
  const apiMessages = promptMessages.map(toApiMessage);

  const completion = await withLlmCall(
    {
      agentId: agent.agentId,
      agentName: agent.displayName,
      stage: "PROPOSAL",
      snapshotId: snapshot.snapshotId,
    },
    () =>
      llmClient.chat.completions.parse({
        model: env.LLM_MODEL,
        messages: apiMessages,
        response_format: zodResponseFormat(
          ProposalContentSchema,
          "agent_proposal",
        ),
      }),
  );

  const validatedContent = completion.choices[0].message.parsed;

  if (!validatedContent) {
    throw new Error("LLM returned an empty or refused proposal");
  }

  return {
    ...validatedContent,
    agentId: agent.agentId,
    snapshotId: snapshot.snapshotId,
  };
}
