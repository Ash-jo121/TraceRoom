import type { MarketSnapshot } from "../domain/market";
import { withSpan } from "../telemetry/withSpan";

const MARKET_SOURCE = "simulation_fixture";
const MARKET_CURRENCY = "USD";
const MARKET_MAX_AGE_MS = 5_000;

export async function traceMarketSnapshot(
  snapshot: MarketSnapshot,
): Promise<void> {
  await withSpan("market.snapshot", async (snapshotSpan) => {
    snapshotSpan.setAttributes({
      "market.snapshot.id": snapshot.snapshotId,
      "market.source": MARKET_SOURCE,
      "market.captured_at": snapshot.observedAt,
      "market.max_age_ms": MARKET_MAX_AGE_MS,
      "market.is_fresh": true,
      "market.symbol_count": 1,
      "market.is_replay": true,
    });

    await withSpan("market.quote", async (quoteSpan) => {
      quoteSpan.setAttributes({
        "market.snapshot.id": snapshot.snapshotId,
        "market.symbol": snapshot.symbol,
        "market.price": snapshot.currentPrice,
        "market.currency": MARKET_CURRENCY,
        "market.source": MARKET_SOURCE,
        "market.observed_at": snapshot.observedAt,
        "market.age_ms": 0,

        "market.previous_close": snapshot.previousClose,
        "market.day_open": snapshot.dayOpen,
        "market.day_high": snapshot.dayHigh,
        "market.day_low": snapshot.dayLow,
        "market.volume": snapshot.volume,
        "market.average_volume": snapshot.averageVolume,

        "market.indicator.sma20": snapshot.indicators.sma20,
        "market.indicator.ema9": snapshot.indicators.ema9,
        "market.indicator.rsi14": snapshot.indicators.rsi14,
      });

      quoteSpan.addEvent("market.quote.captured", {
        symbol: snapshot.symbol,
        price: snapshot.currentPrice,
      });
    });

    snapshotSpan.addEvent("market.snapshot.ready", {
      "snapshot.id": snapshot.snapshotId,
      symbol: snapshot.symbol,
      "quote.count": 1,
    });
  });
}
