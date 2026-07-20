import type { AgentRoom } from "../domain/agent";

export const agentConfigs = [
  {
    agentId: "agent-1",
    displayName: "Momentum Scout",
    persona: "MOMENTUM",
    riskAppetite: "MEDIUM",
    strategyDescription:
      "Focus on price trends, trading volume, moving averages, and breakout strength.",
  },
  {
    agentId: "agent-2",
    displayName: "Mean Reversion Analyst",
    persona: "MEAN_REVERSION",
    riskAppetite: "MEDIUM",
    strategyDescription:
      "Look for overextended price movements and opportunities for price to return toward recent fair value.",
  },
  {
    agentId: "agent-3",
    displayName: "Market Skeptic",
    persona: "SKEPTIC",
    riskAppetite: "LOW",
    strategyDescription:
      "Challenge weak assumptions, identify conflicting evidence, and prefer NO_TRADE when evidence is insufficient.",
  },
] satisfies AgentRoom;
