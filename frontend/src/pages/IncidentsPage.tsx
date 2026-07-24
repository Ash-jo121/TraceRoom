import {
  ArrowRight,
  CheckCircle,
  ClockCounterClockwise,
  LockKey,
  Pulse,
  WarningDiamond,
  XCircle,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTraceRoom } from "../TraceRoomContext";
import { formatScenario, StatusChip } from "../components/SessionUI";
import type { SessionScenario } from "../types";

const scenarios: Array<{
  id: SessionScenario;
  label: string;
  detail: string;
  icon: typeof Pulse;
}> = [
  { id: "evidence-fault", label: "Evidence breach", detail: "8% corrupted price claim", icon: WarningDiamond },
  { id: "healthy", label: "Healthy baseline", detail: "All gates pass", icon: CheckCircle },
  { id: "risk-veto", label: "Risk veto", detail: "Price move policy fires", icon: LockKey },
  { id: "deadlock", label: "Agent deadlock", detail: "No majority decision", icon: ClockCounterClockwise },
  { id: "error", label: "Workflow fault", detail: "Recording stage fails", icon: XCircle },
];

export function IncidentsPage() {
  const {
    sessions,
    selected,
    selectSession,
    loadingScenario,
    runScenario,
  } = useTraceRoom();
  const reduce = useReducedMotion();

  return (
    <div className="page incidents-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">INCIDENT LAB</span>
          <h1>Break the system on purpose.</h1>
          <p>Five deterministic failures. One observable decision pipeline.</p>
        </div>
      </header>

      <section className="scenario-rack" aria-label="Run incident scenarios">
        {scenarios.map(({ id, label, detail, icon: Icon }) => (
          <button
            key={id}
            className={id === "evidence-fault" ? "scenario-trigger primary" : "scenario-trigger"}
            disabled={loadingScenario !== null}
            onClick={() => void runScenario(id)}
          >
            <Icon weight={id === "evidence-fault" ? "fill" : "regular"} />
            <span><strong>{label}</strong><small>{detail}</small></span>
            {loadingScenario === id ? <Pulse className="spin" /> : <ArrowRight />}
          </button>
        ))}
      </section>

      <div className="incident-workspace">
        <aside className="session-rail">
          <div className="rail-heading">
            <span>RECORDED RUNS</span>
            <strong>{sessions.length}</strong>
          </div>
          {sessions.map((session) => (
            <button
              key={session.sessionId}
              className={selected?.sessionId === session.sessionId ? "session-row active" : "session-row"}
              onClick={() => selectSession(session.sessionId)}
            >
              <span>{session.snapshot.symbol}</span>
              <div>
                <strong>{formatScenario(session.scenario)}</strong>
                <small>{new Date(session.createdAt).toLocaleString()}</small>
              </div>
              <i>{session.outcome}</i>
            </button>
          ))}
          {sessions.length === 0 && <p className="rail-empty">No incidents recorded yet.</p>}
        </aside>

        <section className="incident-detail">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.sessionId}
                initial={reduce ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <header className="incident-detail-header">
                  <div>
                    <span>{formatScenario(selected.scenario)}</span>
                    <h2>{selected.snapshot.symbol} decision</h2>
                  </div>
                  <StatusChip session={selected} />
                </header>

                <div className="decision-numbers">
                  <div><span>PRICE</span><strong>{selected.snapshot.currentPrice.toFixed(2)}</strong></div>
                  <div><span>EVIDENCE</span><strong>{selected.evidenceValidation.validCount}/{selected.evidenceValidation.checkedCount}</strong></div>
                  <div><span>CONSENSUS</span><strong>{selected.consensus?.position ?? "STOPPED"}</strong></div>
                  <div><span>RISK</span><strong>{selected.riskReview?.status ?? "NOT RUN"}</strong></div>
                </div>

                <div className="pipeline-strip">
                  {Object.entries(selected.stageStatuses).map(([stage, status]) => (
                    <div key={stage} className={`pipeline-stage ${status.toLowerCase()}`}>
                      <span>{stage.replace(/([A-Z])/g, " $1")}</span>
                      <strong>{status}</strong>
                    </div>
                  ))}
                </div>

                <div className="incident-reason">
                  <span>FINAL VERDICT</span>
                  <h3>{selected.pipelineGate.reasonCode ?? selected.outcome}</h3>
                  <p>{selected.execution.reason}</p>
                </div>
              </motion.div>
            ) : (
              <div className="incident-placeholder">
                <Pulse />
                <h2>Select or run an incident.</h2>
              </div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}

