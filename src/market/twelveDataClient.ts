import type { MarketSnapshot } from "../domain/market";
import {
  calculateAverage,
  calculateEma,
  calculateRsi,
  calculateSma,
} from "./indicators";
import type { SnapshotExchange } from "./snapshotTypes";

const TWELVE_DATA_BASE_URL = "https://api.twelvedata.com";

export class MarketProviderError extends Error {
  constructor(
    message: string,
    readonly code:
      | "CONFIGURATION"
      | "NOT_FOUND"
      | "RATE_LIMITED"
      | "MALFORMED"
      | "UNAVAILABLE",
  ) {
    super(message);
    this.name = "MarketProviderError";
  }
}

export interface TwelveDataInstrument {
  providerSymbol: string;
  symbol: string;
  name: string | null;
  currency: string | null;
  exchange: SnapshotExchange;
}

export interface TwelveDataSnapshotResult {
  snapshot: MarketSnapshot;
  instrument: TwelveDataInstrument;
}

export async function fetchTwelveDataSnapshot(
  symbol: string,
  exchange: SnapshotExchange,
  snapshotId: string,
): Promise<TwelveDataSnapshotResult> {
  const apiKey = process.env.TWELVE_DATA_API_KEY?.trim();
  if (!apiKey) {
    throw new MarketProviderError(
      "TWELVE_DATA_API_KEY is not configured.",
      "CONFIGURATION",
    );
  }

  const providerSymbol = toProviderSymbol(symbol, exchange);
  const quoteUrl = new URL("/quote", TWELVE_DATA_BASE_URL);
  quoteUrl.searchParams.set("symbol", providerSymbol);

  const seriesUrl = new URL("/time_series", TWELVE_DATA_BASE_URL);
  seriesUrl.searchParams.set("symbol", providerSymbol);
  seriesUrl.searchParams.set("interval", "1day");
  seriesUrl.searchParams.set("outputsize", "40");
  seriesUrl.searchParams.set("order", "asc");
  const requestInit = {
    headers: { Authorization: `apikey ${apiKey}` },
    signal: AbortSignal.timeout(8_000),
  };

  let quoteResponse: Response;
  let seriesResponse: Response;
  try {
    [quoteResponse, seriesResponse] = await Promise.all([
      fetch(quoteUrl, requestInit),
      fetch(seriesUrl, requestInit),
    ]);
  } catch {
    throw new MarketProviderError(
      "Twelve Data could not be reached.",
      "UNAVAILABLE",
    );
  }

  if (!quoteResponse.ok || !seriesResponse.ok) {
    const rateLimited =
      quoteResponse.status === 429 || seriesResponse.status === 429;
    throw new MarketProviderError(
      rateLimited
        ? "Twelve Data rate limit reached."
        : "Twelve Data returned an unsuccessful response.",
      rateLimited ? "RATE_LIMITED" : "UNAVAILABLE",
    );
  }

  const quote = (await quoteResponse.json()) as unknown;
  const series = (await seriesResponse.json()) as unknown;
  return mapTwelveDataSnapshot(
    quote,
    series,
    symbol,
    exchange,
    snapshotId,
  );
}

export function mapTwelveDataSnapshot(
  quoteValue: unknown,
  seriesValue: unknown,
  requestedSymbol: string,
  exchange: SnapshotExchange,
  snapshotId: string,
): TwelveDataSnapshotResult {
  const quote = asRecord(quoteValue);
  const series = asRecord(seriesValue);
  throwForProviderMessage(quote);
  throwForProviderMessage(series);

  const rawValues = Array.isArray(series.values) ? series.values : [];
  if (rawValues.length < 20) {
    throw new MarketProviderError(
      "Twelve Data did not return enough daily history.",
      "MALFORMED",
    );
  }

  const bars = rawValues
    .map((value) => {
      const record = asRecord(value);
      return {
        datetime: requiredString(record.datetime, "datetime"),
        close: requiredNumber(record.close, "close"),
        volume: requiredNumber(record.volume, "volume"),
      };
    })
    .sort((left, right) => left.datetime.localeCompare(right.datetime));

  const closes = bars.map((bar) => bar.close);
  const volumes = bars.map((bar) => bar.volume);
  const currentPrice = requiredNumber(quote.close, "close");
  const previousClose =
    optionalNumber(quote.previous_close) ?? bars.at(-2)?.close;

  if (previousClose === undefined) {
    throw new MarketProviderError(
      "Twelve Data response did not include a previous close.",
      "MALFORMED",
    );
  }

  const observedAt = resolveObservedAt(quote, bars.at(-1)?.datetime);
  const normalizedSymbol =
    optionalString(quote.symbol)?.split(":")[0]?.toUpperCase() ??
    requestedSymbol.toUpperCase();

  return {
    instrument: {
      providerSymbol: toProviderSymbol(requestedSymbol, exchange),
      symbol: normalizedSymbol,
      name: optionalString(quote.name) ?? null,
      currency: optionalString(quote.currency) ?? null,
      exchange,
    },
    snapshot: {
      snapshotId,
      symbol: normalizedSymbol,
      observedAt,
      decisionHorizonMinutes: 30,
      currentPrice,
      previousClose,
      dayOpen: requiredNumber(quote.open, "open"),
      dayHigh: requiredNumber(quote.high, "high"),
      dayLow: requiredNumber(quote.low, "low"),
      volume:
        optionalNumber(quote.volume) ?? Math.round(bars.at(-1)?.volume ?? 0),
      averageVolume: calculateAverage(volumes, 20),
      indicators: {
        sma20: calculateSma(closes, 20),
        ema9: calculateEma(closes, 9),
        rsi14: calculateRsi(closes, 14),
      },
    },
  };
}

export function toProviderSymbol(
  symbol: string,
  exchange: SnapshotExchange,
): string {
  const normalized = symbol.trim().toUpperCase();
  return exchange === "NSE" ? `${normalized}:NSE` : normalized;
}

function throwForProviderMessage(value: Record<string, unknown>): void {
  const status = optionalString(value.status);
  const message =
    optionalString(value.message) ??
    optionalString(value.code) ??
    optionalString(value.detail);
  if (status === "error" || message) {
    const normalized = message?.toLowerCase() ?? "";
    throw new MarketProviderError(
      message ?? "Twelve Data returned an error.",
      normalized.includes("credit") || normalized.includes("limit")
        ? "RATE_LIMITED"
        : normalized.includes("symbol")
          ? "NOT_FOUND"
          : "UNAVAILABLE",
    );
  }
}

function resolveObservedAt(
  quote: Record<string, unknown>,
  fallbackDate?: string,
): string {
  const timestamp = optionalNumber(quote.timestamp);
  if (timestamp !== undefined) {
    const milliseconds = timestamp > 10_000_000_000 ? timestamp : timestamp * 1000;
    const date = new Date(milliseconds);
    if (!Number.isNaN(date.valueOf())) return date.toISOString();
  }

  const datetime = optionalString(quote.datetime) ?? fallbackDate;
  if (datetime) {
    const date = new Date(datetime.includes("T") ? datetime : `${datetime}T00:00:00Z`);
    if (!Number.isNaN(date.valueOf())) return date.toISOString();
  }

  throw new MarketProviderError(
    "Twelve Data response did not include a valid timestamp.",
    "MALFORMED",
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function requiredString(value: unknown, field: string): string {
  const parsed = optionalString(value);
  if (!parsed) {
    throw new MarketProviderError(
      `Twelve Data field ${field} is missing.`,
      "MALFORMED",
    );
  }
  return parsed;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requiredNumber(value: unknown, field: string): number {
  const parsed = optionalNumber(value);
  if (parsed === undefined) {
    throw new MarketProviderError(
      `Twelve Data field ${field} is invalid.`,
      "MALFORMED",
    );
  }
  return parsed;
}

function optionalNumber(value: unknown): number | undefined {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}
