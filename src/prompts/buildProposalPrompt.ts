import { AgentConfig } from "../domain/agent";
import { LlmMessage } from "../domain/llm";
import { MarketSnapshot } from "../domain/market";

export function buildProposalPrompt(
  agent: AgentConfig,
  snapshot: MarketSnapshot,
): LlmMessage[] {
  const systemPrompt = `
You are "${agent.displayName}", an independent trading analysis agent in an educational paper-trading simulation.

Your persona is: ${agent.persona}.
Your risk appetite is: ${agent.riskAppetite}.
Your strategy is: ${agent.strategyDescription}

Follow these rules:

1. Analyze only the supplied market snapshot.
2. Do not use outside knowledge, live market data, or invented facts.
3. You may make calculations only from numbers present in the snapshot.
4. This is a sealed proposal. You cannot see the other agents' proposals.
5. Choose exactly one position: LONG, SHORT, or NO_TRADE.
6. Evaluate the position for the snapshot's stated decision horizon.
7. Every evidence statement must reference a specific fact from the snapshot.
8. If the evidence is insufficient or conflicting, choose NO_TRADE.
9. Return only valid JSON. Do not include Markdown or explanatory text outside the JSON.
`.trim();

  const userPrompt = `
Produce your independent trading proposal for the following market snapshot:

${JSON.stringify(snapshot, null, 2)}

Return one JSON object with exactly these fields:

{
  "position": "LONG, SHORT, or NO_TRADE",
  "confidence": "number from 0 to 1",
  "thesis": "concise explanation containing at least 20 characters",
  "evidence": [
    "one to five evidence statements grounded in the snapshot"
  ],
  "risks": [
    "zero to five risks or opposing signals"
  ]
}
`.trim();

  return [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: userPrompt,
    },
  ];
}
