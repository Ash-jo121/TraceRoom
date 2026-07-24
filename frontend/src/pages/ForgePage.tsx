import {
  ArrowRight,
  Check,
  Copy,
  DownloadSimple,
  GlobeHemisphereWest,
  LockKey,
  Pulse,
  ShieldCheck,
  Warning,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSnapshot, lockSnapshot } from "../api";
import { useTraceRoom } from "../TraceRoomContext";
import type {
  SnapshotCandidate,
  SnapshotExchange,
  SnapshotStatus,
} from "../types";

const forgeStages = [
  { label: "MARKET", detail: "Quote and OHLCV" },
  { label: "RESEARCH", detail: "Cited public context" },
  { label: "VALIDATE", detail: "Freshness and fields" },
  { label: "LOCK", detail: "Immutable handoff" },
];

function statusLabel(status: SnapshotStatus) {
  return status === "FIXTURE_FALLBACK" ? "FIXTURE FALLBACK" : status;
}

function sourceForField(candidate: SnapshotCandidate, field: string) {
  const sourceIds = candidate.fieldProvenance[field] ?? [];
  return candidate.sources.filter((source) => sourceIds.includes(source.id));
}

export function ForgePage() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { runScenario } = useTraceRoom();
  const [symbol, setSymbol] = useState("AAPL");
  const [exchange, setExchange] = useState<SnapshotExchange>("US");
  const [candidate, setCandidate] = useState<SnapshotCandidate | null>(null);
  const [selectedField, setSelectedField] = useState("currentPrice");
  const [loading, setLoading] = useState(false);
  const [locking, setLocking] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading || reduce) return;
    const timer = window.setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, 2));
    }, 850);
    return () => window.clearInterval(timer);
  }, [loading, reduce]);

  const json = useMemo(
    () => candidate?.snapshot ? JSON.stringify(candidate.snapshot, null, 2) : "",
    [candidate],
  );
  const selectedSources = candidate
    ? sourceForField(candidate, selectedField)
    : [];

  async function forgeSnapshot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanSymbol = symbol.trim().toUpperCase();
    if (!cleanSymbol) return;
    setLoading(true);
    setError(null);
    setCandidate(null);
    setStageIndex(0);
    try {
      const nextCandidate = await createSnapshot(cleanSymbol, exchange);
      setCandidate(nextCandidate);
      setSelectedField(Object.keys(nextCandidate.fieldProvenance)[0] ?? "currentPrice");
      setStageIndex(nextCandidate.canLock ? 3 : 2);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Snapshot creation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function copyJson() {
    if (!json) return;
    await navigator.clipboard.writeText(json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function downloadJson() {
    if (!json || !candidate) return;
    const url = URL.createObjectURL(
      new Blob([json], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${candidate.instrument.symbol.toLowerCase()}-market-snapshot.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function releaseAgents() {
    if (!candidate) return;
    setLocking(true);
    setError(null);
    try {
      const locked = candidate.status === "LOCKED"
        ? candidate
        : await lockSnapshot(candidate.candidateId);
      setCandidate(locked);
      navigate("/room");
      void runScenario("healthy", locked.candidateId, locked.instrument.symbol);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Snapshot lock failed.");
      setLocking(false);
    }
  }

  return (
    <div className="page forge-page">
      <header className="forge-hero">
        <div>
          <span className="eyebrow">SNAPSHOT FORGE / EVIDENCE INTAKE</span>
          <h1>Turn a ticker into evidence.</h1>
        </div>
        <p>
          Market numbers come from Twelve Data. OpenAI adds cited context on a
          separate rail. Only validated numbers can cross into the Agent Room.
        </p>
      </header>

      <section className="forge-console">
        <form className="forge-form" onSubmit={forgeSnapshot}>
          <div className="forge-input">
            <label htmlFor="forge-symbol">SYMBOL</label>
            <input
              id="forge-symbol"
              maxLength={16}
              onChange={(event) => setSymbol(event.target.value)}
              placeholder="AAPL"
              value={symbol}
            />
          </div>
          <div className="forge-input">
            <label htmlFor="forge-exchange">EXCHANGE</label>
            <select
              id="forge-exchange"
              onChange={(event) => setExchange(event.target.value as SnapshotExchange)}
              value={exchange}
            >
              <option value="US">US EQUITIES</option>
              <option value="NSE">NSE</option>
            </select>
          </div>
          <button className="primary-button forge-submit" disabled={loading} type="submit">
            {loading ? <Pulse weight="fill" /> : <GlobeHemisphereWest />}
            {loading ? "FORGING" : "BUILD SNAPSHOT"}
          </button>
        </form>

        <div className="forge-stage-rail" aria-label="Snapshot processing stages">
          <div className="forge-stage-line" aria-hidden="true">
            <motion.span
              animate={{ scaleX: (stageIndex + 1) / forgeStages.length }}
              initial={false}
              transition={reduce ? { duration: 0 } : { duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          {forgeStages.map((stage, index) => {
            const completed = index < stageIndex || Boolean(candidate && index <= 2);
            const active = index === stageIndex;
            return (
              <div
                className={`forge-stage ${completed ? "completed" : ""} ${active ? "active" : ""}`}
                key={stage.label}
              >
                <span className="forge-stage-node">
                  {completed ? <Check weight="bold" /> : String(index + 1).padStart(2, "0")}
                </span>
                <strong>{stage.label}</strong>
                <small>{stage.detail}</small>
              </div>
            );
          })}
        </div>
      </section>

      {error && <div className="inline-error forge-error" role="alert">{error}</div>}

      <AnimatePresence mode="wait">
        {loading && (
          <motion.section
            className="forge-loading"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="forge-orbit" aria-hidden="true"><span /><span /><span /></div>
            <div>
              <span className="eyebrow">SEPARATE TRUST RAILS ACTIVE</span>
              <h2>{forgeStages[stageIndex].detail}</h2>
              <p>Numeric authority and contextual research cannot overwrite each other.</p>
            </div>
          </motion.section>
        )}

        {!loading && !candidate && (
          <motion.section className="forge-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <span>01</span>
            <div>
              <h2>No candidate in the chamber.</h2>
              <p>Enter a supported ticker to begin evidence intake. INFY on NSE can fall back to the labeled deterministic fixture.</p>
            </div>
          </motion.section>
        )}

        {!loading && candidate && (
          <motion.div
            className="forge-result"
            key={candidate.candidateId}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <section className="forge-snapshot-panel">
              <header className="forge-panel-header">
                <div>
                  <span className="eyebrow">CANDIDATE / {candidate.candidateId.slice(0, 12)}</span>
                  <h2>{candidate.instrument.symbol}</h2>
                </div>
                <span className={`snapshot-state state-${candidate.status.toLowerCase()}`}>
                  {statusLabel(candidate.status)}
                </span>
              </header>

              {candidate.snapshot ? (
                <>
                  <div className="snapshot-numbers">
                    <div>
                      <span>LAST PRICE</span>
                      <strong>{candidate.snapshot.currentPrice.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>RSI 14</span>
                      <strong>{candidate.snapshot.indicators.rsi14.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>SMA 20</span>
                      <strong>{candidate.snapshot.indicators.sma20.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>VOLUME</span>
                      <strong>{candidate.snapshot.volume.toLocaleString()}</strong>
                    </div>
                  </div>
                  <div className="json-toolbar">
                    <span>MARKET_SNAPSHOT.JSON</span>
                    <div>
                      <button className="icon-button" onClick={() => void copyJson()} aria-label="Copy snapshot JSON">
                        {copied ? <Check /> : <Copy />}
                      </button>
                      <button className="icon-button" onClick={downloadJson} aria-label="Download snapshot JSON">
                        <DownloadSimple />
                      </button>
                    </div>
                  </div>
                  <pre className="snapshot-json">{json}</pre>
                </>
              ) : (
                <div className="blocked-snapshot">
                  <Warning weight="fill" />
                  <h3>Numeric authority unavailable.</h3>
                  <p>{candidate.checks.find((check) => check.status === "FAIL")?.detail}</p>
                </div>
              )}
            </section>

            <aside className="forge-evidence-panel">
              <section>
                <header className="forge-section-title">
                  <ShieldCheck />
                  <span>VALIDATION GATE</span>
                </header>
                <div className="check-list">
                  {candidate.checks.map((check) => (
                    <article className={`check-item check-${check.status.toLowerCase()}`} key={check.id}>
                      <span>{check.status === "PASS" ? <Check /> : <Warning />}</span>
                      <div>
                        <strong>{check.label}</strong>
                        <p>{check.detail}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section>
                <header className="forge-section-title">
                  <Pulse />
                  <span>FIELD PROVENANCE</span>
                </header>
                <div className="provenance-fields">
                  {Object.keys(candidate.fieldProvenance).map((field) => (
                    <button
                      className={selectedField === field ? "active" : ""}
                      key={field}
                      onClick={() => setSelectedField(field)}
                    >
                      {field}
                    </button>
                  ))}
                </div>
                <div className="provenance-readout">
                  <span>{selectedField}</span>
                  <ArrowRight />
                  <strong>
                    {selectedSources.map((source) => source.provider).join(", ") || "No source bound"}
                  </strong>
                </div>
              </section>

              <section>
                <header className="forge-section-title">
                  <GlobeHemisphereWest />
                  <span>SOURCES AND CONTEXT</span>
                </header>
                <div className="source-list">
                  {candidate.sources.map((source) => (
                    <article key={source.id}>
                      <div>
                        <strong>{source.provider}</strong>
                        <span>{source.kind === "MARKET_DATA" ? "AUTHORITATIVE" : "CONTEXT ONLY"}</span>
                      </div>
                      {source.url.startsWith("http") ? (
                        <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
                      ) : (
                        <p>{source.title}</p>
                      )}
                    </article>
                  ))}
                  {!candidate.sources.length && <p className="muted-copy">No sources were returned.</p>}
                </div>
                {candidate.research.status === "READY" ? (
                  <div className="research-brief">
                    <p>{candidate.research.summary}</p>
                    <strong>CATALYSTS</strong>
                    <ul>{candidate.research.catalysts.map((item) => <li key={item}>{item}</li>)}</ul>
                    <strong>RISKS</strong>
                    <ul>{candidate.research.risks.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                ) : (
                  <p className="research-unavailable">
                    Context search unavailable. Trusted numeric data remains independently valid.
                  </p>
                )}
              </section>

              <button
                className="primary-button release-button"
                disabled={!candidate.canLock || locking}
                onClick={() => void releaseAgents()}
              >
                <LockKey weight="fill" />
                {locking ? "LOCKING EVIDENCE" : "LOCK AND RELEASE AGENTS"}
              </button>
              {!candidate.canLock && (
                <p className="lock-reason">
                  {candidate.checks.find((check) => check.status === "FAIL")?.detail ??
                    "This candidate cannot cross the evidence gate."}
                </p>
              )}
            </aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
