import { AgentConfig } from "../domain/agent";
import { AgentProposal } from "../schemas/proposal";
import { MarketSnapshot } from "../domain/market";
import { env } from "../config/env";
import { llmClient } from "../llm/llmClient";
import { toApiMessage } from "../llm/toApiMessage";
import { AgentRebuttal } from "../schemas/rebuttal";
import { buildFinalVotePrompt } from "../prompts/buildFinalVotePrompt";
import { FinalVote, FinalVoteContentSchema } from "../schemas/finalVote";

export async function generateFinalVote(
  agent: AgentConfig,
  snapshot: MarketSnapshot,
  proposals: readonly AgentProposal[],
  rebuttals: readonly AgentRebuttal[],
): Promise<FinalVote> {
  const initialProposal = proposals.find(
    (proposal) => proposal.agentId === agent.agentId,
  );

  if (!initialProposal) {
    throw new Error(`No initial proposal found for ${agent.agentId}`);
  }

  const promptMessages = buildFinalVotePrompt(
    agent,
    snapshot,
    proposals,
    rebuttals,
  );
  const apiMessages = promptMessages.map(toApiMessage);

  const completion = await llmClient.chat.completions.create({
    model: env.LLM_MODEL,
    messages: apiMessages,
    response_format: {
      type: "json_object",
    },
  });

  const rawContent = completion.choices[0].message.content;

  if (!rawContent) {
    throw new Error("LLM returned an empty proposal");
  }

  const parsedContent: unknown = JSON.parse(rawContent);

  const validatedContent = FinalVoteContentSchema.parse(parsedContent);

  const supportedAgentId = validatedContent.supportedProposalAgentId;

  if (supportedAgentId !== null) {
    const supportedProposal = proposals.find(
      (proposal) => proposal.agentId === supportedAgentId,
    );

    if (!supportedProposal) {
      throw new Error(
        `${agent.agentId} supported unknown proposal ` + `${supportedAgentId}`,
      );
    }

    if (supportedProposal.position !== validatedContent.position) {
      throw new Error(
        `${agent.agentId} voted ` +
          `${validatedContent.position} but supported ` +
          `${supportedAgentId}, whose proposal was ` +
          `${supportedProposal.position}`,
      );
    }
  }

  return {
    agentId: agent.agentId,
    snapshotId: snapshot.snapshotId,
    initialPosition: initialProposal.position,
    changedFromInitial: initialProposal.position !== validatedContent.position,
    ...validatedContent,
  };
}
