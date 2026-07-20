import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { env } from "../config/env";
import { recordLlmMetrics } from "../telemetry/llmMetrics";

const tracer = trace.getTracer("traceroom-debate-simulation", "0.1.0");

interface LlmCompletionLike {
  id?: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: {
      cached_tokens?: number | null;
    } | null;
  } | null;
  choices?: Array<{
    finish_reason?: string | null;
  }>;
}

export interface LlmCallContext {
  agentId: string;
  agentName: string;
  stage: "PROPOSAL" | "CROSS_EXAMINATION" | "FINAL_VOTE";
  snapshotId: string;
}

export async function withLlmCall<T extends LlmCompletionLike>(
  context: LlmCallContext,
  call: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(
    "llm.call",
    {
      kind: SpanKind.CLIENT,
      attributes: {
        "gen_ai.operation.name": "chat",
        "gen_ai.provider.name": env.LLM_PROVIDER,
        "gen_ai.request.model": env.LLM_MODEL,

        "agent.id": context.agentId,
        "agent.name": context.agentName,
        "debate.stage": context.stage,
        "market.snapshot.id": context.snapshotId,

        "llm.pricing_version": env.LLM_PRICING_VERSION,
      },
    },
    async (span) => {
      const startedAt = performance.now();

      let responseModel: string | undefined;
      let inputTokens: number | undefined;
      let outputTokens: number | undefined;
      let totalCostUsd: number | undefined;
      let outcome: "success" | "error" = "error";

      try {
        const completion = await call();

        responseModel = completion.model;

        inputTokens = completion.usage?.prompt_tokens;
        outputTokens = completion.usage?.completion_tokens;

        const reportedCachedTokens =
          completion.usage?.prompt_tokens_details?.cached_tokens ?? 0;

        if (completion.id) {
          span.setAttribute("gen_ai.response.id", completion.id);
        }

        if (completion.model) {
          span.setAttribute("gen_ai.response.model", completion.model);
        }

        const finishReasons =
          completion.choices
            ?.map((choice) => choice.finish_reason)
            .filter(
              (reason): reason is string =>
                reason !== null && reason !== undefined,
            ) ?? [];

        if (finishReasons.length > 0) {
          span.setAttribute("gen_ai.response.finish_reasons", finishReasons);
        }

        if (inputTokens !== undefined) {
          span.setAttribute("gen_ai.usage.input_tokens", inputTokens);
        }

        if (outputTokens !== undefined) {
          span.setAttribute("gen_ai.usage.output_tokens", outputTokens);
        }

        if (inputTokens !== undefined && outputTokens !== undefined) {
          const cachedInputTokens = Math.min(inputTokens, reportedCachedTokens);

          const uncachedInputTokens = inputTokens - cachedInputTokens;

          const uncachedInputCostUsd =
            (uncachedInputTokens / 1_000_000) * env.LLM_INPUT_COST_PER_1M_USD;

          const cachedInputCostUsd =
            (cachedInputTokens / 1_000_000) *
            env.LLM_CACHED_INPUT_COST_PER_1M_USD;

          const outputCostUsd =
            (outputTokens / 1_000_000) * env.LLM_OUTPUT_COST_PER_1M_USD;

          totalCostUsd =
            uncachedInputCostUsd + cachedInputCostUsd + outputCostUsd;

          span.setAttributes({
            "gen_ai.usage.cached_input_tokens": cachedInputTokens,
            "llm.input_cost_usd": uncachedInputCostUsd + cachedInputCostUsd,
            "llm.output_cost_usd": outputCostUsd,
            "llm.cost_usd": totalCostUsd,
          });
        }

        outcome = "success";

        span.setStatus({
          code: SpanStatusCode.OK,
        });

        return completion;
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error);
          span.setAttribute("error.type", error.name);
        }

        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : "Unknown LLM error",
        });

        throw error;
      } finally {
        const latencyMs = performance.now() - startedAt;

        span.setAttribute("llm.latency_ms", latencyMs);

        recordLlmMetrics({
          agentId: context.agentId,
          agentName: context.agentName,
          stage: context.stage,
          requestModel: env.LLM_MODEL,
          responseModel,
          inputTokens,
          outputTokens,
          costUsd: totalCostUsd,
          latencyMs,
          outcome,
        });

        span.end();
      }
    },
  );
}
