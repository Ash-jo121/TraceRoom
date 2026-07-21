import type { MarketSnapshot } from "../domain/market";
import type { EvidenceClaim, EvidenceClaimType } from "../schemas/proposal";

export type EvidenceValidationStatus =
  | "valid"
  | "price_deviation"
  | "unsupported_claim";

export interface CheckedEvidence {
  sourceId: string;
  claimType: EvidenceClaimType;
  statement: string;
  citedValue: number;
  referenceValue: number;
  deviationPct: number;
  validationStatus: EvidenceValidationStatus;
}

export interface EvidenceValidationResult {
  checkedCount: number;
  validCount: number;
  invalidCount: number;
  tolerancePct: number;
  validationStatus: EvidenceValidationStatus;
  checkedEvidence: CheckedEvidence[];
}

export function validateEvidence(
  snapshot: MarketSnapshot,
  evidence: readonly EvidenceClaim[],
  tolerancePct = 2,
): EvidenceValidationResult {
  const expectedSourceId = `market.quote:${snapshot.symbol}`;

  const referenceValues: Record<EvidenceClaimType, number> = {
    CURRENT_PRICE: snapshot.currentPrice,
    PREVIOUS_CLOSE: snapshot.previousClose,
    DAY_OPEN: snapshot.dayOpen,
    DAY_HIGH: snapshot.dayHigh,
    DAY_LOW: snapshot.dayLow,
    VOLUME: snapshot.volume,
    AVERAGE_VOLUME: snapshot.averageVolume,
    SMA20: snapshot.indicators.sma20,
    EMA9: snapshot.indicators.ema9,
    RSI14: snapshot.indicators.rsi14,
  };

  const checkedEvidence = evidence.map((claim): CheckedEvidence => {
    const referenceValue = referenceValues[claim.claimType];

    const deviationPct = calculateDeviationPct(
      claim.citedValue,
      referenceValue,
    );

    let validationStatus: EvidenceValidationStatus;

    if (claim.sourceId !== expectedSourceId) {
      validationStatus = "unsupported_claim";
    } else if (deviationPct > tolerancePct) {
      validationStatus = "price_deviation";
    } else {
      validationStatus = "valid";
    }

    return {
      sourceId: claim.sourceId,
      claimType: claim.claimType,
      statement: claim.statement,
      citedValue: claim.citedValue,
      referenceValue,
      deviationPct,
      validationStatus,
    };
  });

  const validCount = checkedEvidence.filter(
    (claim) => claim.validationStatus === "valid",
  ).length;

  const invalidCount = checkedEvidence.length - validCount;

  return {
    checkedCount: checkedEvidence.length,
    validCount,
    invalidCount,
    tolerancePct,
    validationStatus: determineOverallStatus(checkedEvidence),
    checkedEvidence,
  };
}

function calculateDeviationPct(
  citedValue: number,
  referenceValue: number,
): number {
  if (referenceValue === 0) {
    return citedValue === 0 ? 0 : Number.POSITIVE_INFINITY;
  }

  return (
    (Math.abs(citedValue - referenceValue) / Math.abs(referenceValue)) * 100
  );
}

function determineOverallStatus(
  evidence: readonly CheckedEvidence[],
): EvidenceValidationStatus {
  if (
    evidence.some((claim) => claim.validationStatus === "unsupported_claim")
  ) {
    return "unsupported_claim";
  }

  if (evidence.some((claim) => claim.validationStatus === "price_deviation")) {
    return "price_deviation";
  }

  return "valid";
}
