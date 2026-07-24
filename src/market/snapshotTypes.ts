import type { MarketSnapshot } from "../domain/market";

export type SnapshotExchange = "NSE" | "US";

export type SnapshotStatus =
  | "READY"
  | "STALE"
  | "BLOCKED"
  | "FIXTURE_FALLBACK"
  | "LOCKED";

export type SnapshotCheckStatus = "PASS" | "WARN" | "FAIL";

export interface SnapshotCheck {
  id: string;
  label: string;
  status: SnapshotCheckStatus;
  detail: string;
}

export interface SnapshotSource {
  id: string;
  kind: "MARKET_DATA" | "WEB";
  provider: "Twelve Data" | "OpenAI Web Search" | "TraceRoom Fixture";
  title: string;
  url: string;
  observedAt: string | null;
  fields: string[];
}

export interface SnapshotResearch {
  status: "READY" | "UNAVAILABLE";
  summary: string;
  catalysts: string[];
  risks: string[];
  responseId: string | null;
  model: string | null;
  note: string | null;
}

export interface SnapshotCandidate {
  schemaVersion: 1;
  candidateId: string;
  createdAt: string;
  lockedAt: string | null;
  status: SnapshotStatus;
  canLock: boolean;
  canRun: boolean;
  fallbackReason: string | null;
  instrument: {
    requestedSymbol: string;
    symbol: string;
    exchange: SnapshotExchange;
    providerSymbol: string;
    name: string | null;
    currency: string | null;
  };
  snapshot: MarketSnapshot | null;
  sources: SnapshotSource[];
  fieldProvenance: Record<string, string[]>;
  checks: SnapshotCheck[];
  research: SnapshotResearch;
}

export interface CreateSnapshotRequest {
  symbol: string;
  exchange: SnapshotExchange;
}

export const EMPTY_RESEARCH: SnapshotResearch = {
  status: "UNAVAILABLE",
  summary: "",
  catalysts: [],
  risks: [],
  responseId: null,
  model: null,
  note: "OpenAI web research was not run.",
};
