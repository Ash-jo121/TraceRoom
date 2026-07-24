import {
  ArrowSquareOut,
  CheckCircle,
  DownloadSimple,
  Fingerprint,
  PaperPlaneTilt,
  Pulse,
  ShieldCheck,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { askAuditor } from "../api";
import { useTraceRoom } from "../TraceRoomContext";
import type { TelemetryQuestionAnswer } from "../types";

const questions = [
  "Why did TraceRoom stop INFY?",
  "Which span failed?",
  "Show the session logs",
  "Were any alerts firing?",
];

export function EvidencePage() {
  const { selected } = useTraceRoom();
  const reduce = useReducedMotion();
  const [question, setQuestion] = useState(questions[0]);
  const [answer, setAnswer] = useState<TelemetryQuestionAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitQuestion() {
    if (!selected || !question.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      setAnswer(await askAuditor(selected.sessionId, question.trim()));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Auditor search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadReceipt() {
    if (!selected) return;
    const failed = selected.evidenceValidation.agents
      .flatMap((agent) => agent.checkedEvidence)
      .find((claim) => claim.validationStatus !== "valid");
    const proof = {
      kind: "traceroom.decision-block-receipt",
      generatedAt: new Date().toISOString(),
      sessionId: selected.sessionId,
      traceId: selected.signoz.traceId,
      symbol: selected.snapshot.symbol,
      evidence: failed ?? null,
      gate: selected.pipelineGate,
      execution: selected.execution,
      stageStatuses: selected.stageStatuses,
    };
    const encoded = new TextEncoder().encode(JSON.stringify(proof));
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    const checksum = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const receipt = {
      ...proof,
      integrity: {
        algorithm: "SHA-256",
        digest: checksum,
        covers: "JSON.stringify(receipt without integrity)",
      },
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `traceroom-${selected.sessionId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!selected) {
    return (
      <div className="page evidence-empty">
        <Fingerprint />
        <h1>No evidence recorded.</h1>
        <p>Run an incident first, then return to reconstruct it from SigNoz.</p>
      </div>
    );
  }

  return (
    <div className="page evidence-page">
      <header className="page-heading evidence-heading">
        <div>
          <span className="eyebrow">FORENSIC EVIDENCE</span>
          <h1>Do not trust the summary. Inspect the proof.</h1>
        </div>
        <div className="evidence-actions">
          <button className="secondary-button" onClick={() => void downloadReceipt()}>
            <DownloadSimple /> DOWNLOAD RECEIPT
          </button>
          <a className="primary-button" href={selected.signoz.traceUrl} target="_blank" rel="noreferrer">
            OPEN SIGNOZ <ArrowSquareOut />
          </a>
        </div>
      </header>

      <section className="auditor-console">
        <div className="auditor-intro">
          <div className="auditor-icon"><ShieldCheck weight="duotone" /></div>
          <h2>Ask the Auditor</h2>
          <p>Natural-language investigation grounded in the selected decision trace.</p>
        </div>
        <div className="auditor-form">
          <label htmlFor="auditor-question">Question</label>
          <div>
            <input
              id="auditor-question"
              value={question}
              maxLength={500}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submitQuestion();
              }}
            />
            <button className="send-button" onClick={() => void submitQuestion()} disabled={loading || !question.trim()} aria-label="Ask the Auditor">
              {loading ? <Pulse className="spin" /> : <PaperPlaneTilt weight="fill" />}
            </button>
          </div>
          <div className="question-list">
            {questions.map((item) => (
              <button key={item} onClick={() => setQuestion(item)}>{item}</button>
            ))}
          </div>
          {error && <p className="inline-error" role="alert">{error}</p>}
        </div>
      </section>

      <AnimatePresence mode="wait">
        {answer ? (
          <motion.section
            className="auditor-answer"
            key={answer.answer}
            initial={reduce ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <header>
              <span><CheckCircle weight="fill" /> {answer.source === "signoz_mcp" ? "VERIFIED BY SIGNOZ MCP" : "DETERMINISTIC FALLBACK"}</span>
              <small>TRACE {answer.traceId}</small>
            </header>
            <h2>{answer.answer}</h2>
            <div className="evidence-matrix">
              {answer.evidence.map((item, index) => (
                <div key={`${item.label}-${index}`}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </motion.section>
        ) : (
          <section className="auditor-standby">
            <Pulse />
            <span>Auditor standing by for trace {selected.signoz.traceId.slice(0, 12)}</span>
          </section>
        )}
      </AnimatePresence>
    </div>
  );
}
