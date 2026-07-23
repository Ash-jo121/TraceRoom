import type { MarketSnapshot } from "../domain/market";
import type { ConsensusResult } from "../debate/resolveConsensus";
import { withSpan } from "../telemetry/withSpan";
import {
  DEFAULT_RISK_POLICY,
  evaluateRisk,
  type RiskPolicy,
  type RiskReviewResult,
} from "./evaluationRisk";

export async function traceRiskReview(
  consensus: ConsensusResult,
  snapshot: MarketSnapshot,
  policy: Readonly<RiskPolicy> = DEFAULT_RISK_POLICY,
  evidenceBlocked = false,
): Promise<RiskReviewResult> {
  return withSpan("risk.review", async (span) => {
    const result = evaluateRisk(consensus, snapshot, policy, evidenceBlocked);

    span.setAttributes({
      "market.snapshot.id": snapshot.snapshotId,
      "risk.review.status": result.status,
      "risk.position": result.position ?? "NONE",
      "risk.trade_allowed": result.tradeAllowed,
      "risk.unanimous": result.unanimous,
      "risk.supporting_agent_count": result.supportingAgentCount,
      "risk.rule_count": result.rules.length,
      "risk.triggered_rule_count": result.triggeredRuleIds.length,
      "risk.triggered_rule_ids": [...result.triggeredRuleIds],
      "risk.vetoed": result.status === "VETOED",
      "evidence.blocked": evidenceBlocked,

      "risk.policy.max_intraday_range_pct": policy.maxIntradayRangePct,

      "risk.policy.max_price_move_pct": policy.maxPriceMovePct,

      "risk.policy.max_rsi_for_long": policy.maxRsiForLong,

      "risk.policy.min_rsi_for_short": policy.minRsiForShort,
    });

    for (const rule of result.rules) {
      const ruleAttributes = {
        "risk.rule.id": rule.ruleId,
        "risk.rule.outcome": rule.outcome,
        "risk.rule.message": rule.message,

        ...(rule.observedValue !== undefined
          ? {
              "risk.rule.observed_value": rule.observedValue,
            }
          : {}),

        ...(rule.thresholdValue !== undefined
          ? {
              "risk.rule.threshold_value": rule.thresholdValue,
            }
          : {}),
      };

      span.addEvent("risk.rule_evaluated", ruleAttributes);

      if (rule.outcome === "TRIGGERED") {
        span.addEvent("risk.rule_triggered", ruleAttributes);
      }
    }

    return result;
  });
}
