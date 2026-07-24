import type { MarketSnapshot } from "../domain/market";

export const marketSnapshot: MarketSnapshot = {
  snapshotId: "snapshot-001",
  symbol: "INFY",
  observedAt: "2026-07-15T09:45:00.000Z",
  decisionHorizonMinutes: 30,

  currentPrice: 1684.5,
  previousClose: 1600,
  dayOpen: 1620,
  dayHigh: 1695,
  dayLow: 1595,

  volume: 1_800_000,
  averageVolume: 1_000_000,

  indicators: {
    sma20: 1618,
    ema9: 1660,
    rsi14: 68.5,
  },
};
