import { ConsensusResult } from "../debate/resolveConsensus";
import type { MarketSnapshot } from "../domain/market";
import type { Position } from "../schemas/proposal";

export type RiskReviewStatus = "APPROVED" | "VETOED" | "DEADLOCKED";

export type RiskRuleId =
  | "CONSENSUS_REQUIRED"
  | "MARKET_DATA_INTEGRITY"
  | "MAX_INTRADAY_RANGE"
  | "MAX_PRICE_MOVE"
  | "LONG_RSI_LIMIT"
  | "SHORT_RSI_LIMIT";

export type RiskRuleOutcome = "PASSED" | "TRIGGERED" | "NOT_APPLICABLE";

export interface RiskRuleResult {
  ruleId: RiskRuleId;
  outcome: RiskRuleOutcome;
  message: string;
  observedValue?: number;
  thresholdValue?: number;
}

export interface RiskPolicy {
  maxIntradayRangePct: number;
  maxPriceMovePct: number;
  maxRsiForLong: number;
  minRsiForShort: number;
}

export interface RiskReviewResult {
  status: RiskReviewStatus;
  position: Position | null;
  tradeAllowed: boolean;
  unanimous: boolean;
  supportingAgentCount: number;
  triggeredRuleIds: RiskRuleId[];
  rules: RiskRuleResult[];
}

export const DEFAULT_RISK_POLICY: Readonly<RiskPolicy> = {
  maxIntradayRangePct: 8,
  maxPriceMovePct: 10,
  maxRsiForLong: 75,
  minRsiForShort: 25,
};

export function evaluateRisk(
  consensus: ConsensusResult,
  snapshot: MarketSnapshot,
  policy: Readonly<RiskPolicy> = DEFAULT_RISK_POLICY,
): RiskReviewResult {
  if (consensus.status === "DEADLOCKED" || consensus.position === null) {
    return {
      status: "DEADLOCKED",
      position: null,
      tradeAllowed: false,
      unanimous: false,
      supportingAgentCount: 0,
      triggeredRuleIds: ["CONSENSUS_REQUIRED"],
      rules: [
        {
          ruleId: "CONSENSUS_REQUIRED",
          outcome: "TRIGGERED",
          message:
            "No majority position was available for deterministic risk review.",
        },
      ],
    };
  }

  const rules: RiskRuleResult[] = [
    {
      ruleId: "CONSENSUS_REQUIRED",
      outcome: "PASSED",
      message: `Consensus resolved to ${consensus.position}.`,
    },
  ];

  if (consensus.position === "NO_TRADE") {
    return buildResult(consensus, rules);
  }

  const marketDataValid = hasValidMarketData(snapshot);

  rules.push({
    ruleId: "MARKET_DATA_INTEGRITY",
    outcome: marketDataValid ? "PASSED" : "TRIGGERED",
    message: marketDataValid
      ? "Market snapshot passed deterministic integrity checks."
      : "Market snapshot contains invalid or internally inconsistent values.",
  });

  if (!marketDataValid) {
    return buildResult(consensus, rules);
  }

  const intradayRangePct =
    ((snapshot.dayHigh - snapshot.dayLow) / snapshot.dayOpen) * 100;

  rules.push({
    ruleId: "MAX_INTRADAY_RANGE",
    outcome:
      intradayRangePct > policy.maxIntradayRangePct ? "TRIGGERED" : "PASSED",
    message:
      intradayRangePct > policy.maxIntradayRangePct
        ? "Intraday range exceeds the configured risk limit."
        : "Intraday range is within the configured risk limit.",
    observedValue: intradayRangePct,
    thresholdValue: policy.maxIntradayRangePct,
  });

  const priceMovePct =
    (Math.abs(snapshot.currentPrice - snapshot.previousClose) /
      snapshot.previousClose) *
    100;

  rules.push({
    ruleId: "MAX_PRICE_MOVE",
    outcome: priceMovePct > policy.maxPriceMovePct ? "TRIGGERED" : "PASSED",
    message:
      priceMovePct > policy.maxPriceMovePct
        ? "Price movement from the previous close exceeds the risk limit."
        : "Price movement from the previous close is within the risk limit.",
    observedValue: priceMovePct,
    thresholdValue: policy.maxPriceMovePct,
  });

  rules.push(
    evaluateDirectionalRsiRule(
      consensus.position,
      snapshot.indicators.rsi14,
      policy,
    ),
  );

  return buildResult(consensus, rules);
}

function hasValidMarketData(snapshot: MarketSnapshot): boolean {
  const prices = [
    snapshot.currentPrice,
    snapshot.previousClose,
    snapshot.dayOpen,
    snapshot.dayHigh,
    snapshot.dayLow,
    snapshot.indicators.sma20,
    snapshot.indicators.ema9,
  ];

  return (
    prices.every((value) => Number.isFinite(value) && value > 0) &&
    Number.isFinite(snapshot.volume) &&
    snapshot.volume >= 0 &&
    Number.isFinite(snapshot.averageVolume) &&
    snapshot.averageVolume > 0 &&
    snapshot.dayLow <= snapshot.dayHigh &&
    snapshot.currentPrice >= snapshot.dayLow &&
    snapshot.currentPrice <= snapshot.dayHigh &&
    snapshot.dayOpen >= snapshot.dayLow &&
    snapshot.dayOpen <= snapshot.dayHigh &&
    Number.isFinite(snapshot.indicators.rsi14) &&
    snapshot.indicators.rsi14 >= 0 &&
    snapshot.indicators.rsi14 <= 100
  );
}

function evaluateDirectionalRsiRule(
  position: Position,
  rsi14: number,
  policy: Readonly<RiskPolicy>,
): RiskRuleResult {
  if (position === "LONG") {
    const triggered = rsi14 > policy.maxRsiForLong;

    return {
      ruleId: "LONG_RSI_LIMIT",
      outcome: triggered ? "TRIGGERED" : "PASSED",
      message: triggered
        ? "RSI exceeds the maximum permitted for a new long position."
        : "RSI is within the permitted long-entry limit.",
      observedValue: rsi14,
      thresholdValue: policy.maxRsiForLong,
    };
  }

  if (position === "SHORT") {
    const triggered = rsi14 < policy.minRsiForShort;

    return {
      ruleId: "SHORT_RSI_LIMIT",
      outcome: triggered ? "TRIGGERED" : "PASSED",
      message: triggered
        ? "RSI is below the minimum permitted for a new short position."
        : "RSI is within the permitted short-entry limit.",
      observedValue: rsi14,
      thresholdValue: policy.minRsiForShort,
    };
  }

  return {
    ruleId: "LONG_RSI_LIMIT",
    outcome: "NOT_APPLICABLE",
    message: "Directional RSI limits do not apply to NO_TRADE.",
  };
}

function buildResult(
  consensus: ConsensusResult,
  rules: RiskRuleResult[],
): RiskReviewResult {
  const triggeredRuleIds = rules
    .filter((rule) => rule.outcome === "TRIGGERED")
    .map((rule) => rule.ruleId);

  const directionalTrade =
    consensus.position === "LONG" || consensus.position === "SHORT";

  return {
    status: triggeredRuleIds.length > 0 ? "VETOED" : "APPROVED",
    position: consensus.position,
    tradeAllowed: directionalTrade && triggeredRuleIds.length === 0,
    unanimous: consensus.unanimous,
    supportingAgentCount: consensus.supportingAgentIds.length,
    triggeredRuleIds,
    rules,
  };
}
