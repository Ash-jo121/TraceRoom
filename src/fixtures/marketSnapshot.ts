import type { MarketSnapshot } from "../domain/market";

export const marketSnapshot: MarketSnapshot = {
  snapshotId: "snapshot-001",
  symbol: "ACME",
  observedAt: "2026-07-15T09:45:00.000Z",
  decisionHorizonMinutes: 30,

  currentPrice: 104.5,
  previousClose: 99.5,
  dayOpen: 100,
  dayHigh: 105.2,
  dayLow: 99.8,

  volume: 1_800_000,
  averageVolume: 1_000_000,

  indicators: {
    sma20: 100.8,
    ema9: 103.2,
    rsi14: 68.5,
  },
};
