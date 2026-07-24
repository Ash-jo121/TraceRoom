import {
  ArrowRight,
  Fingerprint,
  LockKeyOpen,
  Play,
  Pulse,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useTraceRoom } from "../TraceRoomContext";
import { AgentCanvas } from "../components/AgentCanvas";
import { BlockReceipt, EvidenceRupture, StatusChip } from "../components/SessionUI";

export function HomePage() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { sessions, loadingScenario, runScenario, booting } = useTraceRoom();
  const breachSession =
    sessions.find((session) => session.scenario === "evidence-fault") ?? null;

  function launchBreach() {
    navigate("/room");
    void runScenario("evidence-fault");
  }

  return (
    <div className="page home-page">
      <section className="hero">
        <motion.div
          className="hero-copy"
          initial={reduce ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="eyebrow">AUTONOMOUS FINANCE CIRCUIT BREAKER</span>
          <h1>Bad evidence stops here.</h1>
          <p>Trace every agent claim. Block unsafe actions before execution. Prove the decision in SigNoz.</p>
          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={launchBreach}
              disabled={loadingScenario !== null}
            >
              {loadingScenario === "evidence-fault" ? <Pulse className="spin" /> : <Play weight="fill" />}
              {loadingScenario === "evidence-fault" ? "BREACH RUNNING" : "RUN THE BREACH"}
            </button>
            <button className="secondary-button" onClick={() => navigate("/room")}>
              ENTER AGENT ROOM <ArrowRight />
            </button>
          </div>
        </motion.div>

        <motion.div
          className="hero-visual"
          initial={reduce ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="hero-visual-header">
            <span>LIVE DECISION NETWORK</span>
            {breachSession && <StatusChip session={breachSession} />}
          </div>
          <AgentCanvas session={breachSession} compact />
        </motion.div>
      </section>

      <section className="signal-band" aria-label="Product capabilities">
        <div><Fingerprint /><span>Every claim attributable</span></div>
        <div><LockKeyOpen /><span>Every gate inspectable</span></div>
        <div><Pulse /><span>Every decision observable</span></div>
      </section>

      <EvidenceRupture session={breachSession} />

      {breachSession ? (
        <BlockReceipt session={breachSession} />
      ) : (
        <section className="receipt empty-receipt">
          <div>
            <span className="receipt-index">AWAITING INCIDENT</span>
            <h2>{booting ? "Connecting to TraceRoom" : "Run the breach to generate proof."}</h2>
          </div>
        </section>
      )}
    </div>
  );
}
