import { metrics } from "@opentelemetry/api";
import type { DemoSession } from "../demo/types";

const meter = metrics.getMeter("traceroom-demo", "0.1.0");

const decisionCounter = meter.createCounter("traceroom.decision.count", {
  description: "Number of TraceRoom demo decisions",
  unit: "{decision}",
});

const evidenceViolationCounter = meter.createCounter(
  "traceroom.evidence.violation.count",
  {
    description: "Number of evidence integrity violations",
    unit: "{violation}",
  },
);

const evidenceIntegrityScoreHistogram = meter.createHistogram(
  "traceroom.evidence.integrity.score",
  {
    description: "Evidence integrity score for a TraceRoom session",
    unit: "{score}",
  },
);

const riskRuleTriggerCounter = meter.createCounter(
  "traceroom.risk.rule.trigger.count",
  {
    description: "Number of failed risk rules",
    unit: "{rule}",
  },
);

const proofPackCounter = meter.createCounter(
  "traceroom.audit.proof_pack.count",
  {
    description: "Number of exported audit proof packs",
    unit: "{proof_pack}",
  },
);

export function recordDemoSessionMetrics(session: DemoSession): void {
  const attributes = {
    mode: session.mode,
    outcome: session.outcome,
    ticker: session.fixture.ticker,
    "evidence_integrity.status": session.evidenceIntegrity.status,
  };

  decisionCounter.add(1, attributes);
  evidenceIntegrityScoreHistogram.record(
    session.evidenceIntegrity.score,
    attributes,
  );

  if (session.evidenceIntegrity.status === "CRITICAL") {
    evidenceViolationCounter.add(1, {
      ...attributes,
      violation_type: "price_deviation",
    });
  }

  for (const rule of session.riskReview.rules) {
    if (!rule.passed) {
      riskRuleTriggerCounter.add(1, {
        ...attributes,
        rule_name: rule.ruleName,
      });
    }
  }
}

export function recordProofPackExport(session: DemoSession): void {
  proofPackCounter.add(1, {
    mode: session.mode,
    outcome: session.outcome,
    ticker: session.fixture.ticker,
  });
}
