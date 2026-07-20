import type { EvaluationFixture } from "../fixtures/evaluationFixture";
import { Position } from "../schemas/proposal";

export interface PositionOutcome {
  position: Position;
  quantity: number;
  grossPnlUsd: number;
  slippageCostUsd: number;
  transactionCostUsd: number;
  netPnlUsd: number;
  pnlPct: number;
}

export function calculatePositionOutcome(
  position: Position,
  fixture: EvaluationFixture,
): PositionOutcome {
  if (position === "NO_TRADE") {
    return {
      position,
      quantity: 0,
      grossPnlUsd: 0,
      slippageCostUsd: 0,
      transactionCostUsd: 0,
      netPnlUsd: 0,
      pnlPct: 0,
    };
  }

  const quantity = fixture.notionalUsd / fixture.entryPrice;

  const priceDifference = fixture.exitPrice - fixture.entryPrice;

  const direction = position === "LONG" ? 1 : -1;

  const grossPnlUsd = quantity * priceDifference * direction;

  const slippageRate = fixture.slippageBps / 10_000;

  // Slippage is charged once at entry and once at exit.
  const slippageCostUsd = fixture.notionalUsd * slippageRate * 2;

  const transactionCostUsd = fixture.transactionCostUsd;

  const netPnlUsd = grossPnlUsd - slippageCostUsd - transactionCostUsd;

  const pnlPct = (netPnlUsd / fixture.notionalUsd) * 100;

  return {
    position,
    quantity,
    grossPnlUsd,
    slippageCostUsd,
    transactionCostUsd,
    netPnlUsd,
    pnlPct,
  };
}
