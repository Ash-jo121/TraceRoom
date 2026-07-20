export interface TechnicalIndicators {
  sma20: number;
  ema9: number;
  rsi14: number;
}

export interface MarketSnapshot {
  snapshotId: string;
  symbol: string;
  observedAt: string;
  decisionHorizonMinutes: number;

  currentPrice: number;
  previousClose: number;
  dayOpen: number;
  dayHigh: number;
  dayLow: number;

  volume: number;
  averageVolume: number;

  indicators: TechnicalIndicators;
}
