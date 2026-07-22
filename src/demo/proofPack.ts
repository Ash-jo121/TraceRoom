import { trace } from "@opentelemetry/api";
import type { DemoSession } from "./types";
import { recordProofPackExport } from "../telemetry/demoMetrics";

const tracer = trace.getTracer("traceroom-demo", "0.1.0");

export interface ProofPack {
  session_id: string;
  timestamp: string;
  ticker: string;
  final_outcome: string;
  agent_proposals: DemoSession["proposals"];
  evidence_claims: DemoSession["proposals"][number]["evidence"];
  evidence_integrity_score: DemoSession["evidenceIntegrity"];
  failed_risk_rules: string[];
  execution_status: string;
  trace_id: string | null;
  log_query_hint: string;
  signoz_links: DemoSession["signoz"];
  auditor_summary: string;
  disclaimer: string;
  ai_assisted_build_disclosure: string;
  markdown: string;
}

export async function buildProofPack(session: DemoSession): Promise<ProofPack> {
  return tracer.startActiveSpan(
    "audit.proof_pack.export",
    {
      attributes: {
        "session.id": session.sessionId,
        ticker: session.fixture.ticker,
        outcome: session.outcome,
      },
    },
    async (span) => {
      const auditorSummary = buildAuditorSummary(session);
      const evidenceClaims = session.proposals.flatMap(
        (proposal) => proposal.evidence,
      );

      const pack: ProofPack = {
        session_id: session.sessionId,
        timestamp: new Date().toISOString(),
        ticker: session.fixture.ticker,
        final_outcome: session.outcome,
        agent_proposals: session.proposals,
        evidence_claims: evidenceClaims,
        evidence_integrity_score: session.evidenceIntegrity,
        failed_risk_rules: session.riskReview.failedRules,
        execution_status: session.execution.status,
        trace_id: session.signoz.traceId,
        log_query_hint: session.signoz.logsHint,
        signoz_links: session.signoz,
        auditor_summary: auditorSummary,
        disclaimer: "Synthetic demo only. TraceRoom performs no real-money trading.",
        ai_assisted_build_disclosure:
          "AI assistants were used to help build and document TraceRoom.",
        markdown: buildProofPackMarkdown(session, auditorSummary),
      };

      span.addEvent("audit.proof_pack.exported", {
        "session.id": session.sessionId,
      });
      span.end();
      recordProofPackExport(session);
      return pack;
    },
  );
}

export function buildAuditorSummary(session: DemoSession): string {
  if (session.outcome === "EXECUTED") {
    return "This session executed synthetically because all agent evidence matched the authoritative INFY fixture and risk review approved execution.";
  }

  return "Momentum Agent cited 1819.26 while the authoritative INFY fixture was 1684.50. The deviation was 8.00%, above the 2.00% tolerance. EVIDENCE_INTEGRITY failed and execution was blocked.";
}

function buildProofPackMarkdown(
  session: DemoSession,
  auditorSummary: string,
): string {
  const failedRules =
    session.riskReview.failedRules.length > 0
      ? session.riskReview.failedRules.join(", ")
      : "None";

  return `# TraceRoom Audit Proof Pack

Session: ${session.sessionId}
Ticker: ${session.fixture.ticker}
Outcome: ${session.outcome}
Execution: ${session.execution.status}

## Auditor Summary

${auditorSummary}

## Evidence Integrity

- Score: ${session.evidenceIntegrity.score}
- Status: ${session.evidenceIntegrity.status}
- Failed rules: ${failedRules}

## SigNoz

- Trace ID: ${session.signoz.traceId ?? "Unavailable"}
- Logs: ${session.signoz.logsHint}

## Disclosure

Synthetic demo only. No real-money trading. AI assistants were used to help build and document TraceRoom.
`;
}
