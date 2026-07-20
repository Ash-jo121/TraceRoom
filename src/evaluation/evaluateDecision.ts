import type { EvaluationFixture } from "../fixtures/evaluationFixture";
import {
  calculatePositionOutcome,
  type PositionOutcome,
} from "./calculatePositionOutcome";
import {
  calculateDecisionRegret,
  type DecisionRegretResult,
} from "./calculateDecisionRegret";
import { Position } from "../schemas/proposal";

export type EvaluationVerdict = "win" | "loss" | "flat";

export interface DecisionEvaluationReport extends DecisionRegretResult {
  evaluationId: string;
  snapshotId: string;
  symbol: string;
  entryTimestamp: string;
  exitTimestamp: string;
  horizonMinutes: number;
  selectedNetPnlUsd: number;
  verdict: EvaluationVerdict;
  outcomes: PositionOutcome[];
}

const positions: Position[] = ["LONG", "SHORT", "NO_TRADE"];

export function evaluateDecision(
  fixture: EvaluationFixture,
  selectedPosition: Position,
  dissentingPositions: Position[],
): DecisionEvaluationReport {
  const outcomes = positions.map((position) =>
    calculatePositionOutcome(position, fixture),
  );

  const regret = calculateDecisionRegret(
    selectedPosition,
    outcomes,
    dissentingPositions,
  );

  const selectedOutcome = outcomes.find(
    (outcome) => outcome.position === selectedPosition,
  );

  if (!selectedOutcome) {
    throw new Error(`Missing selected outcome: ${selectedPosition}`);
  }

  const verdict: EvaluationVerdict =
    selectedOutcome.netPnlUsd > 0
      ? "win"
      : selectedOutcome.netPnlUsd < 0
        ? "loss"
        : "flat";

  return {
    evaluationId: fixture.evaluationId,
    snapshotId: fixture.snapshotId,
    symbol: fixture.symbol,
    entryTimestamp: fixture.entryTimestamp,
    exitTimestamp: fixture.exitTimestamp,
    horizonMinutes: fixture.horizonMinutes,
    selectedNetPnlUsd: selectedOutcome.netPnlUsd,
    verdict,
    outcomes,
    ...regret,
  };
}
