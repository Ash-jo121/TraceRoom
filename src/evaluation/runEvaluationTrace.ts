import {
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
  trace,
  type SpanContext,
} from "@opentelemetry/api";
import type { EvaluationFixture } from "../fixtures/evaluationFixture";
import { logInfo } from "../telemetry/logger";
import {
  evaluateDecision,
  type DecisionEvaluationReport,
} from "./evaluateDecision";
import { Position } from "../schemas/proposal";
import { recordEvaluationMetrics } from "../telemetry/metrics";

const tracer = trace.getTracer("traceroom-debate-simulation", "0.1.0");

export interface RunEvaluationTraceInput {
  sessionId: string;
  sourceSpanContext: SpanContext;
  fixture: EvaluationFixture;
  selectedPosition: Position;
  dissentingPositions: Position[];
}

export async function runEvaluationTrace(
  input: RunEvaluationTraceInput,
): Promise<DecisionEvaluationReport> {
  return tracer.startActiveSpan(
    "decision.evaluation",
    {
      kind: SpanKind.INTERNAL,
      links: [
        {
          context: input.sourceSpanContext,
          attributes: {
            "link.type": "debate.session",
          },
        },
      ],
    },
    ROOT_CONTEXT,
    async (span) => {
      try {
        span.setAttributes({
          "traceroom.session.id": input.sessionId,
          "source.trace_id": input.sourceSpanContext.traceId,
          "evaluation.id": input.fixture.evaluationId,
          "market.snapshot.id": input.fixture.snapshotId,
          "market.symbol": input.fixture.symbol,
          "eval.entry_timestamp": input.fixture.entryTimestamp,
          "eval.exit_timestamp": input.fixture.exitTimestamp,
          "eval.horizon_minutes": input.fixture.horizonMinutes,
          "decision.position": input.selectedPosition,
        });

        const report = evaluateDecision(
          input.fixture,
          input.selectedPosition,
          input.dissentingPositions,
        );

        span.setAttributes({
          "eval.executed_pnl_usd": report.selectedNetPnlUsd,
          "eval.executed_pnl_pct": report.selectedPnlPct,
          "eval.best_counterfactual_position": report.bestAvailablePosition,
          "eval.best_counterfactual_pnl_pct":
            report.bestAvailableCounterfactualPnlPct,
          "eval.has_dissent": report.bestDissentingPosition !== null,
          "eval.best_dissenting_position":
            report.bestDissentingPosition ?? "none",
          "eval.dissent_value_pct": report.dissentValuePct ?? 0,
          "eval.decision_regret_pct": report.decisionRegretPct,
          "eval.verdict": report.verdict,
        });

        logInfo("Decision evaluation completed", {
          "event.name": "decision.evaluation.completed",
          "traceroom.session.id": input.sessionId,
          "evaluation.id": report.evaluationId,
          "decision.position": report.selectedPosition,
          "eval.executed_pnl_pct": report.selectedPnlPct,
          "eval.best_counterfactual_position": report.bestAvailablePosition,
          "eval.best_counterfactual_pnl_pct":
            report.bestAvailableCounterfactualPnlPct,
          "eval.best_dissenting_position":
            report.bestDissentingPosition ?? "none",
          "eval.dissent_value_pct": report.dissentValuePct ?? 0,
          "eval.decision_regret_pct": report.decisionRegretPct,
          "eval.verdict": report.verdict,
        });

        recordEvaluationMetrics({
          verdict: report.verdict,
          selectedPosition: report.selectedPosition,
          decisionRegretPct: report.decisionRegretPct,
        });

        span.setStatus({
          code: SpanStatusCode.OK,
        });

        return report;
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error);
        }

        span.setStatus({
          code: SpanStatusCode.ERROR,
          message:
            error instanceof Error ? error.message : "Unknown evaluation error",
        });

        throw error;
      } finally {
        span.end();
      }
    },
  );
}
