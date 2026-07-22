import type { DemoFixture } from "./types";

export const INFY_EVIDENCE_INTEGRITY_V1: DemoFixture = {
  fixtureId: "INFY_EVIDENCE_INTEGRITY_V1",
  ticker: "INFY",
  referencePrice: 1684.5,
  faultPrice: 1819.26,
  tolerancePercent: 2,
  horizonMinutes: 30,
  syntheticCapital: 100_000,
};

export function calculateInfyFaultDeviationPercent(): number {
  return Number(
    (
      (Math.abs(
        INFY_EVIDENCE_INTEGRITY_V1.faultPrice -
          INFY_EVIDENCE_INTEGRITY_V1.referencePrice,
      ) /
        INFY_EVIDENCE_INTEGRITY_V1.referencePrice) *
      100
    ).toFixed(2),
  );
}
