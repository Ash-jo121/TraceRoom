import { Position } from "../schemas/proposal";
import type { PositionOutcome } from "./calculatePositionOutcome";

export interface DecisionRegretResult {
  selectedPosition: Position;
  selectedPnlPct: number;
  bestAvailablePosition: Position;
  bestAvailableCounterfactualPnlPct: number;
  bestDissentingPosition: Position | null;
  bestDissentingCounterfactualPnlPct: number | null;
  decisionRegretPct: number;
  dissentValuePct: number | null;
}

export function calculateDecisionRegret(
  selectedPosition: Position,
  outcomes: PositionOutcome[],
  dissentingPositions: Position[],
): DecisionRegretResult {
  if (outcomes.length === 0) {
    throw new Error("At least one position outcome is required");
  }

  const selectedOutcome = outcomes.find(
    (outcome) => outcome.position === selectedPosition,
  );

  if (!selectedOutcome) {
    throw new Error(
      `Missing outcome for selected position: ${selectedPosition}`,
    );
  }

  const bestAvailableOutcome = outcomes.reduce((best, current) =>
    current.pnlPct > best.pnlPct ? current : best,
  );

  const dissentingOutcomes = outcomes.filter((outcome) =>
    dissentingPositions.includes(outcome.position),
  );

  const bestDissentingOutcome =
    dissentingOutcomes.length > 0
      ? dissentingOutcomes.reduce((best, current) =>
          current.pnlPct > best.pnlPct ? current : best,
        )
      : null;

  return {
    selectedPosition,
    selectedPnlPct: selectedOutcome.pnlPct,
    bestAvailablePosition: bestAvailableOutcome.position,
    bestAvailableCounterfactualPnlPct: bestAvailableOutcome.pnlPct,
    bestDissentingPosition: bestDissentingOutcome?.position ?? null,
    bestDissentingCounterfactualPnlPct: bestDissentingOutcome?.pnlPct ?? null,
    decisionRegretPct: bestAvailableOutcome.pnlPct - selectedOutcome.pnlPct,
    dissentValuePct: bestDissentingOutcome
      ? bestDissentingOutcome.pnlPct - selectedOutcome.pnlPct
      : null,
  };
}
