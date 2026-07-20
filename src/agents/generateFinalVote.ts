import { AgentConfig } from "../domain/agent";
import { AgentProposal } from "../schemas/proposal";
import { MarketSnapshot } from "../domain/market";
import { env } from "../config/env";
import { llmClient } from "../llm/llmClient";
import { toApiMessage } from "../llm/toApiMessage";
import { AgentRebuttal } from "../schemas/rebuttal";
import { buildFinalVotePrompt } from "../prompts/buildFinalVotePrompt";
import { FinalVote, FinalVoteContentSchema } from "../schemas/finalVote";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { withLlmCall } from "../llm/withLlmCall";

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

  const completion = await withLlmCall(
    {
      agentId: agent.agentId,
      agentName: agent.displayName,
      stage: "FINAL_VOTE",
      snapshotId: snapshot.snapshotId,
    },
    () =>
      llmClient.chat.completions.parse({
        model: env.LLM_MODEL,
        messages: apiMessages,
        response_format: zodResponseFormat(
          FinalVoteContentSchema,
          "final_vote",
        ),
      }),
  );

  const validatedContent = completion.choices[0].message.parsed;

  if (!validatedContent) {
    throw new Error("LLM returned an empty or refused final vote");
  }

  const expectedSourceAgentIds = rebuttals.flatMap((rebuttal) =>
    rebuttal.critiques.some(
      (critique) => critique.targetAgentId === agent.agentId,
    )
      ? [rebuttal.agentId]
      : [],
  );

  const actualSourceAgentIds = validatedContent.critiqueResponses.map(
    (response) => response.sourceAgentId,
  );

  const expectedIds = [...expectedSourceAgentIds].sort();
  const actualIds = [...actualSourceAgentIds].sort();

  const hasDuplicateIds =
    new Set(actualSourceAgentIds).size !== actualSourceAgentIds.length;

  if (
    hasDuplicateIds ||
    JSON.stringify(expectedIds) !== JSON.stringify(actualIds)
  ) {
    throw new Error(
      `${agent.agentId} returned invalid critique response IDs. ` +
        `Expected ${JSON.stringify(expectedIds)}, ` +
        `received ${JSON.stringify(actualIds)}`,
    );
  }

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
