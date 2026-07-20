export type AgentPersona = "MOMENTUM" | "MEAN_REVERSION" | "SKEPTIC";

export type RiskAppetite = "LOW" | "MEDIUM" | "HIGH";

export interface AgentConfig {
  agentId: string;
  displayName: string;
  persona: AgentPersona;
  riskAppetite: RiskAppetite;
  strategyDescription: string;
}

export type AgentRoom = readonly [AgentConfig, AgentConfig, AgentConfig];
