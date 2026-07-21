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
7. Every evidence item must cite exactly one numeric field from the snapshot.
8. Use only one of these claim types:
   CURRENT_PRICE, PREVIOUS_CLOSE, DAY_OPEN, DAY_HIGH, DAY_LOW,
   VOLUME, AVERAGE_VOLUME, SMA20, EMA9, or RSI14.
9. citedValue must exactly match the corresponding number in the supplied snapshot.
10. sourceId must be "market.quote:${snapshot.symbol}".
11. The statement may interpret that value, but it must not introduce unsupported facts.
12. If the evidence is insufficient or conflicting, choose NO_TRADE.
13. Return only valid JSON. Do not include Markdown or explanatory text outside the JSON.
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
    {
      "sourceId": "market.quote:${snapshot.symbol}",
      "claimType": "CURRENT_PRICE",
      "citedValue": ${snapshot.currentPrice},
      "statement": "an explanation of how this particular value affects the proposal"
    }
  ],
  "risks": [
    "zero to five risks or opposing signals"
  ]
}

Each evidence item must cite only one field. If your argument uses three
different snapshot values, return three separate evidence items.
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
