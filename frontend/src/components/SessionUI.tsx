import { ArrowSquareOut, LockKey, ShieldCheck, Warning } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import type { RecordedSession } from "../types";

export function StatusChip({ session }: { session: RecordedSession }) {
  const blocked = session.execution.status === "BLOCKED";
  return (
    <span className={blocked ? "status-chip blocked" : "status-chip ready"}>
      {blocked ? <LockKey weight="fill" /> : <ShieldCheck weight="fill" />}
      {blocked ? "EXECUTION BLOCKED" : "DECISION READY"}
    </span>
  );
}

export function EvidenceRupture({ session }: { session: RecordedSession | null }) {
  const failed = session?.evidenceValidation.agents
    .flatMap((agent) => agent.checkedEvidence)
    .find((claim) => claim.validationStatus !== "valid");
  const cited = failed?.citedValue ?? 1819.26;
  const reference = failed?.referenceValue ?? 1684.5;
  const deviation = failed?.deviationPct ?? 8;
  const tolerance =
    session?.evidenceValidation.agents.find((agent) =>
      agent.checkedEvidence.includes(failed!),
    )?.tolerancePct ?? 2;
  const reduce = useReducedMotion();

  return (
    <section className="rupture" aria-labelledby="rupture-title">
      <div className="rupture-copy">
        <span className="eyebrow">EVIDENCE BREACH</span>
        <h2 id="rupture-title">One bad number. Zero second chances.</h2>
        <p>
          TraceRoom checks every agent claim against the authoritative market snapshot before consensus or execution.
        </p>
      </div>
      <div className="rupture-stage">
        <motion.div
          className="price-readout cited"
          initial={reduce ? false : { opacity: 0, x: -48 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <span>AGENT CITED</span>
          <strong>{cited.toFixed(2)}</strong>
        </motion.div>
        <div className="rupture-mark">
          <Warning weight="fill" />
          <strong>{deviation.toFixed(2)}%</strong>
          <span>LIMIT {tolerance.toFixed(2)}%</span>
        </div>
        <motion.div
          className="price-readout reference"
          initial={reduce ? false : { opacity: 0, x: 48 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <span>AUTHORITATIVE</span>
          <strong>{reference.toFixed(2)}</strong>
        </motion.div>
      </div>
    </section>
  );
}

export function BlockReceipt({ session }: { session: RecordedSession }) {
  const skipped = Object.entries(session.stageStatuses)
    .filter(([, status]) => status === "SKIPPED")
    .map(([stage]) => stage);
  return (
    <section className="receipt" aria-labelledby="receipt-title">
      <div>
        <span className="receipt-index">BLOCK RECEIPT</span>
        <h2 id="receipt-title">{session.pipelineGate.reasonCode ?? session.outcome}</h2>
        <p>{session.pipelineGate.message || session.execution.reason}</p>
      </div>
      <dl className="receipt-grid">
        <div><dt>Decision</dt><dd>{session.snapshot.symbol}</dd></div>
        <div><dt>Gate</dt><dd>{session.pipelineGate.blockedAt ?? "RISK_REVIEW"}</dd></div>
        <div><dt>Execution</dt><dd>{session.execution.status}</dd></div>
        <div><dt>Stages skipped</dt><dd>{skipped.length}</dd></div>
        <div className="receipt-trace"><dt>Trace</dt><dd>{session.signoz.traceId}</dd></div>
      </dl>
      <a className="text-link" href={session.signoz.traceUrl} target="_blank" rel="noreferrer">
        Verify trace <ArrowSquareOut />
      </a>
    </section>
  );
}

export function formatScenario(scenario: string): string {
  return scenario.replaceAll("-", " ").toUpperCase();
}

