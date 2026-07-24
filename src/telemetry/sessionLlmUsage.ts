import { AsyncLocalStorage } from "node:async_hooks";
import type { Span } from "@opentelemetry/api";
import { metrics } from "@opentelemetry/api";

export interface SessionLlmUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  finalized: boolean;
}

const storage = new AsyncLocalStorage<SessionLlmUsage>();
const meter = metrics.getMeter("traceroom-debate-simulation", "0.1.0");
const sessionCost = meter.createHistogram("traceroom.session.cost_usd", {
  description: "Estimated LLM cost for one completed TraceRoom session",
  unit: "USD",
});

export function createSessionLlmUsage(): SessionLlmUsage {
  return {
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    finalized: false,
  };
}

export function withSessionLlmUsage<T>(
  usage: SessionLlmUsage,
  operation: () => Promise<T>,
): Promise<T> {
  return storage.run(usage, operation);
}

export function recordSessionLlmCall(input: {
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}): void {
  const usage = storage.getStore();
  if (!usage) return;
  usage.calls += 1;
  usage.inputTokens += input.inputTokens ?? 0;
  usage.outputTokens += input.outputTokens ?? 0;
  usage.costUsd += input.costUsd ?? 0;
}

export function finalizeSessionLlmUsage(
  span: Span,
  usage: SessionLlmUsage,
  scenario: string,
  outcome: string,
): void {
  if (usage.finalized) return;
  usage.finalized = true;
  const thresholdUsd = configuredCostThreshold();
  const roundedCost = Number(usage.costUsd.toFixed(8));

  span.setAttributes({
    "llm.session.call_count": usage.calls,
    "llm.session.input_tokens": usage.inputTokens,
    "llm.session.output_tokens": usage.outputTokens,
    "llm.session.cost_usd": roundedCost,
    "llm.session.cost_threshold_usd": thresholdUsd,
    "llm.session.cost_threshold_exceeded": roundedCost > thresholdUsd,
  });
  sessionCost.record(roundedCost, {
    "traceroom.scenario": scenario,
    "decision.outcome": outcome,
  });
}

function configuredCostThreshold(): number {
  const parsed = Number(process.env.SESSION_COST_ALERT_THRESHOLD_USD ?? 0.1);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0.1;
}
