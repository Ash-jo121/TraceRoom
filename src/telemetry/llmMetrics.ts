import { metrics } from "@opentelemetry/api";

function createLlmInstruments() {
  const meter = metrics.getMeter("traceroom-debate-simulation", "0.1.0");

  return {
    callCounter: meter.createCounter("traceroom.llm.calls", {
      description: "Number of completed LLM calls",
      unit: "{call}",
    }),

    inputTokenCounter: meter.createCounter("traceroom.llm.input_tokens", {
      description: "Number of input tokens consumed",
      unit: "{token}",
    }),

    outputTokenCounter: meter.createCounter("traceroom.llm.output_tokens", {
      description: "Number of output tokens generated",
      unit: "{token}",
    }),

    costCounter: meter.createCounter("traceroom.llm.cost_usd", {
      description: "Estimated LLM API cost",
      unit: "USD",
    }),

    latencyHistogram: meter.createHistogram("traceroom.llm.latency_ms", {
      description: "Duration of an LLM API call",
      unit: "ms",
    }),
  };
}

let instruments: ReturnType<typeof createLlmInstruments> | undefined;

function getLlmInstruments() {
  instruments ??= createLlmInstruments();
  return instruments;
}

export interface LlmMetricInput {
  agentId: string;
  agentName: string;
  stage: "PROPOSAL" | "CROSS_EXAMINATION" | "FINAL_VOTE";
  requestModel: string;
  responseModel?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  latencyMs: number;
  outcome: "success" | "error";
}

export function recordLlmMetrics(input: LlmMetricInput): void {
  const {
    callCounter,
    inputTokenCounter,
    outputTokenCounter,
    costCounter,
    latencyHistogram,
  } = getLlmInstruments();

  const attributes: Record<string, string> = {
    "agent.id": input.agentId,
    "agent.name": input.agentName,
    "debate.stage": input.stage,
    "gen_ai.request.model": input.requestModel,
    "llm.outcome": input.outcome,
  };

  if (input.responseModel) {
    attributes["gen_ai.response.model"] = input.responseModel;
  }

  callCounter.add(1, attributes);
  latencyHistogram.record(input.latencyMs, attributes);

  if (input.inputTokens !== undefined) {
    inputTokenCounter.add(input.inputTokens, attributes);
  }

  if (input.outputTokens !== undefined) {
    outputTokenCounter.add(input.outputTokens, attributes);
  }

  if (input.costUsd !== undefined) {
    costCounter.add(input.costUsd, attributes);
  }
}
