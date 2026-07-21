import { DEFAULT_RISK_POLICY, type RiskPolicy } from "../risk/evaluationRisk";

const RISK_VETO_SCENARIO = "risk-price-move-veto";

export interface RiskReviewScenario {
  scenario: "normal" | "risk-price-move-veto";
  policyOverridden: boolean;
  policy: Readonly<RiskPolicy>;
  overriddenRuleId?: "MAX_PRICE_MOVE";
  originalThreshold?: number;
  scenarioThreshold?: number;
}

export function getRiskReviewScenario(): RiskReviewScenario {
  if (process.env.TRACEROOM_SCENARIO !== RISK_VETO_SCENARIO) {
    return {
      scenario: "normal",
      policyOverridden: false,
      policy: DEFAULT_RISK_POLICY,
    };
  }

  const scenarioThreshold = 4;

  return {
    scenario: RISK_VETO_SCENARIO,
    policyOverridden: true,
    policy: {
      ...DEFAULT_RISK_POLICY,
      maxPriceMovePct: scenarioThreshold,
    },
    overriddenRuleId: "MAX_PRICE_MOVE",
    originalThreshold: DEFAULT_RISK_POLICY.maxPriceMovePct,
    scenarioThreshold,
  };
}
