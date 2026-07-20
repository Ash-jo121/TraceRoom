import { metrics } from "@opentelemetry/api";

type EvaluationVerdict = "win" | "loss" | "flat";
type EvaluationPosition = "LONG" | "SHORT" | "NO_TRADE";

interface RecordEvaluationMetricsInput {
  verdict: EvaluationVerdict;
  selectedPosition: EvaluationPosition;
  decisionRegretPct: number;
}

const meter = metrics.getMeter("traceroom-debate-simulation", "0.1.0");

const evaluationCompletedCounter = meter.createCounter(
  "traceroom.evaluation.completed.count",
  {
    description: "Number of completed decision evaluations",
    unit: "{evaluation}",
  },
);

const decisionRegretHistogram = meter.createHistogram(
  "traceroom.decision.regret",
  {
    description:
      "Difference between the best available counterfactual return and the selected decision return",
    unit: "%",
  },
);

export function recordEvaluationMetrics({
  verdict,
  selectedPosition,
  decisionRegretPct,
}: RecordEvaluationMetricsInput): void {
  evaluationCompletedCounter.add(1, {
    verdict,
  });

  decisionRegretHistogram.record(decisionRegretPct, {
    position: selectedPosition,
  });
}
