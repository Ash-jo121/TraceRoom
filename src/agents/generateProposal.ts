import { AgentConfig } from "../domain/agent";
import { buildProposalPrompt } from "../prompts/buildProposalPrompt";
import { AgentProposal, ProposalContentSchema } from "../schemas/proposal";
import { MarketSnapshot } from "../domain/market";
import { env } from "../config/env";
import { llmClient } from "../llm/llmClient";
import { toApiMessage } from "../llm/toApiMessage";
import { withLlmCall } from "../llm/withLlmCall";

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
      llmClient.chat.completions.create({
        model: env.LLM_MODEL,
        messages: apiMessages,
        response_format: {
          type: "json_object",
        },
      }),
  );

  const rawContent = completion.choices[0].message.content;

  if (!rawContent) {
    throw new Error("LLM returned an empty proposal");
  }

  const parsedContent: unknown = JSON.parse(rawContent);

  const validateContent = ProposalContentSchema.parse(parsedContent);

  return {
    ...validateContent,
    agentId: agent.agentId,
    snapshotId: snapshot.snapshotId,
  };
}
