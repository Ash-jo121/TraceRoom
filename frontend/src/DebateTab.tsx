import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useState, type ReactNode } from "react";

type StageStatus = "COMPLETED" | "BLOCKED" | "SKIPPED" | "ERROR";

interface CheckedEvidence {
  claimType: string;
  citedValue: number;
  referenceValue: number;
  deviationPct: number;
  validationStatus: string;
}

export interface DebateSession {
  snapshot: {
    symbol: string;
    currentPrice: number;
    previousClose: number;
    dayHigh: number;
    dayLow: number;
    volume: number;
    indicators: { rsi14: number };
  };
  agents: Array<{
    agentId: string;
    displayName: string;
    persona: string;
  }>;
  proposals: Array<{
    agentId: string;
    position: string;
    confidence: number;
    thesis: string;
    evidence: Array<{
      claimType: string;
      citedValue: number;
      statement: string;
    }>;
  }>;
  evidenceValidation: {
    checkedCount: number;
    validCount: number;
    invalidCount: number;
    blocked: boolean;
    agents: Array<{
      agentId: string;
      checkedEvidence: CheckedEvidence[];
    }>;
  };
  rebuttals: Array<{
    agentId: string;
    critiques: Array<{
      targetAgentId: string;
      strongestAgreement: string;
      strongestObjection: string;
      evidenceConflicts: string[];
    }>;
    overallAssessment: string;
  }>;
  finalVotes: Array<{
    agentId: string;
    position: string;
    confidence: number;
    rationale: string;
    initialPosition: string;
  }>;
  consensus: {
    status: string;
    position: string | null;
    voteCounts: Record<string, number>;
    supportingAgentIds: string[];
  } | null;
  riskReview: {
    status: "APPROVED" | "VETOED" | "DEADLOCKED";
    rules: Array<{
      ruleId: string;
      outcome: "PASSED" | "TRIGGERED" | "NOT_APPLICABLE";
      message: string;
    }>;
  } | null;
  pipelineGate: {
    status: "PASSED" | "BLOCKED";
    reasonCode: "EVIDENCE_INTEGRITY" | null;
    message: string;
  };
  stageStatuses: {
    marketSnapshot: StageStatus;
    proposals: StageStatus;
    evidenceValidation: StageStatus;
    crossExamination: StageStatus;
    finalVote: StageStatus;
    consensus: StageStatus;
    riskReview: StageStatus;
  };
  scenario: string;
  scenarioInjection: {
    injected: boolean;
    type:
      | "none"
      | "evidence-price-deviation"
      | "directional-risk-veto"
      | "workflow-recording-error"
      | "deadlock";
    description: string;
    evidenceOverride?: {
      agentId: string;
      claimIndex: number;
      originalValue: number;
      forcedValue: number;
    };
    voteOverrides: Array<{
      agentId: string;
      originalPosition: string;
      forcedPosition: string;
      overridden: boolean;
    }>;
    riskPolicyOverride?: {
      ruleId: string;
      originalThreshold: number;
      scenarioThreshold: number;
    };
  };
  execution: {
    status: "READY" | "BLOCKED";
    reason: string;
  };
  outcome: string;
  error?: {
    code: string;
    stage: string;
    message: string;
  };
  signoz: {
    traceUrl: string;
  };
}

export function DebateTab({ session }: { session: DebateSession }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [passedRulesExpanded, setPassedRulesExpanded] = useState(false);
  const failedEvidence = collectFailedEvidence(session);
  const triggeredRules =
    session.riskReview?.rules.filter((rule) => rule.outcome === "TRIGGERED") ??
    [];
  const passedRules =
    session.riskReview?.rules.filter((rule) => rule.outcome === "PASSED") ?? [];

  function toggleExpanded(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <section className="tr-debate">
      <div className="tr-debate-header">
        <Text weight="semibold">
          Debate transcript — {session.agents.length} agents ·{" "}
          {session.evidenceValidation.validCount}/
          {session.evidenceValidation.checkedCount} claims validated
        </Text>
        <a
          className="tr-debate-trace-link"
          href={session.signoz.traceUrl}
          target="_blank"
          rel="noreferrer"
        >
          View as trace in SigNoz ↗
        </a>
      </div>

      <div className="tr-debate-timeline">
        <TimelineStage
          label="Market Snapshot"
          status={session.stageStatuses.marketSnapshot}
        >
          <Card padding={3}>
            <Grid columns={{ minWidth: 130, max: 6 }} gap={3}>
              <TranscriptDatum label="Symbol" value={session.snapshot.symbol} />
              <TranscriptDatum
                label="Current"
                value={formatNumber(session.snapshot.currentPrice)}
              />
              <TranscriptDatum
                label="Previous close"
                value={formatNumber(session.snapshot.previousClose)}
              />
              <TranscriptDatum
                label="Day range"
                value={`${formatNumber(session.snapshot.dayLow)}–${formatNumber(session.snapshot.dayHigh)}`}
              />
              <TranscriptDatum
                label="RSI"
                value={session.snapshot.indicators.rsi14.toFixed(1)}
              />
              <TranscriptDatum
                label="Volume"
                value={formatCompactNumber(session.snapshot.volume)}
              />
            </Grid>
            <Text type="supporting">
              Shared authoritative snapshot — every cited claim below is
              validated against these values.
            </Text>
          </Card>
        </TimelineStage>

        {session.scenarioInjection.evidenceOverride && (
          <InjectionEvent
            text={evidenceInjectionText(
              session,
              session.scenarioInjection.evidenceOverride,
            )}
          />
        )}

        <TimelineStage
          label="Independent Proposals"
          status={session.stageStatuses.proposals}
          subtitle="Proposals are sealed — agents do not see each other's first answers."
        >
          <Grid columns={{ minWidth: 270, max: 3 }} gap={3}>
            {session.proposals.map((proposal) => (
              <Card key={proposal.agentId} padding={4}>
                <VStack gap={3}>
                  <HStack gap={2} wrap="wrap" vAlign="center">
                    <Heading level={4}>
                      {agentName(session, proposal.agentId)}
                    </Heading>
                    <Badge
                      label={agentPersona(session, proposal.agentId)}
                      variant="neutral"
                    />
                    <Badge
                      label={proposal.position}
                      variant={positionVariant(proposal.position)}
                    />
                    <Text type="supporting">
                      {formatConfidence(proposal.confidence)}
                    </Text>
                  </HStack>
                  <ExpandableText
                    id={`proposal-${proposal.agentId}`}
                    text={proposal.thesis}
                    isExpanded={expanded.has(`proposal-${proposal.agentId}`)}
                    onToggle={() =>
                      toggleExpanded(`proposal-${proposal.agentId}`)
                    }
                  />
                  <div className="tr-evidence-chip-list">
                    {proposal.evidence.map((claim, claimIndex) => {
                      const validation = checkedEvidence(
                        session,
                        proposal.agentId,
                        claimIndex,
                      );
                      return (
                        <span
                          className={`tr-evidence-chip ${
                            validation?.validationStatus === "valid"
                              ? "tr-evidence-chip-valid"
                              : "tr-evidence-chip-invalid"
                          }`}
                          title={evidenceTitle(validation, claim.statement)}
                          key={`${proposal.agentId}-${claimIndex}`}
                        >
                          {claim.claimType}: {formatNumber(claim.citedValue)}
                        </span>
                      );
                    })}
                  </div>
                </VStack>
              </Card>
            ))}
          </Grid>
        </TimelineStage>

        <TimelineStage
          label="Evidence Validation"
          status={session.stageStatuses.evidenceValidation}
        >
          {failedEvidence.length === 0 ? (
            <div className="tr-debate-valid-line">
              ✓ {session.evidenceValidation.validCount}/
              {session.evidenceValidation.checkedCount} cited claims matched the
              snapshot.
            </div>
          ) : (
            <div className="tr-debate-failure-callout">
              <VStack gap={3}>
                <Heading level={4}>Evidence integrity failure</Heading>
                {failedEvidence.map((failure) => (
                  <div
                    className="tr-debate-failed-claim"
                    key={`${failure.agentId}-${failure.claimIndex}`}
                  >
                    <Text weight="semibold">
                      {agentName(session, failure.agentId)} ·{" "}
                      {failure.claim.claimType}
                    </Text>
                    <Text type="supporting">
                      Cited {formatNumber(failure.claim.citedValue)} · Reference{" "}
                      {formatNumber(failure.claim.referenceValue)} · Deviation{" "}
                      {formatDeviation(failure.claim.deviationPct)} ·{" "}
                      {failure.claim.validationStatus.toUpperCase()}
                    </Text>
                  </div>
                ))}
                {session.pipelineGate.status === "BLOCKED" && (
                  <div className="tr-debate-gate-message">
                    <Badge
                      label={
                        session.pipelineGate.reasonCode ?? "PIPELINE_BLOCKED"
                      }
                      variant="error"
                    />
                    <Text>{session.pipelineGate.message}</Text>
                  </div>
                )}
              </VStack>
            </div>
          )}
        </TimelineStage>

        <TimelineStage
          label="Cross-Examination"
          status={session.stageStatuses.crossExamination}
          skippedMessage={skippedMessage(session, "cross-examination")}
        >
          <VStack gap={3}>
            {session.rebuttals.map((rebuttal) => (
              <Card key={rebuttal.agentId} padding={4}>
                <VStack gap={3}>
                  <Heading level={4}>
                    {agentName(session, rebuttal.agentId)} challenges the room
                  </Heading>
                  {rebuttal.critiques.map((critique) => (
                    <div
                      className="tr-critique"
                      key={`${rebuttal.agentId}-${critique.targetAgentId}`}
                    >
                      <Text weight="semibold">
                        → vs {agentName(session, critique.targetAgentId)}
                      </Text>
                      <Text>
                        <span className="tr-positive-mark">✓</span> Strongest
                        agreement: {critique.strongestAgreement}
                      </Text>
                      <Text>
                        <span className="tr-negative-mark">×</span> Strongest
                        objection: {critique.strongestObjection}
                      </Text>
                      {critique.evidenceConflicts.length > 0 && (
                        <div className="tr-evidence-chip-list">
                          {critique.evidenceConflicts.map((conflict) => (
                            <span
                              className="tr-evidence-chip tr-evidence-chip-warning"
                              key={conflict}
                            >
                              ⚠ {conflict}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <Text type="supporting">
                    <em>{rebuttal.overallAssessment}</em>
                  </Text>
                </VStack>
              </Card>
            ))}
          </VStack>
        </TimelineStage>

        {session.scenarioInjection.voteOverrides.some(
          (vote) => vote.overridden,
        ) && (
          <InjectionEvent
            text={`${session.scenarioInjection.description} Recorded mapping: ${voteOverrideSummary(session)}.`}
          />
        )}

        <TimelineStage
          label="Final Votes"
          status={session.stageStatuses.finalVote}
          skippedMessage={skippedMessage(session, "final voting")}
        >
          <VStack gap={2}>
            {session.finalVotes.map((vote) => {
              const generatedPosition = generatedVotePosition(session, vote);
              const override = session.scenarioInjection.voteOverrides.find(
                (candidate) => candidate.agentId === vote.agentId,
              );
              const hasScenarioVoteOverrides = sessionHasVoteOverrides(session);
              const transitionStart = hasScenarioVoteOverrides
                ? generatedPosition
                : vote.initialPosition;
              const organicFlip = generatedPosition !== vote.initialPosition;
              return (
                <Card key={vote.agentId} padding={3}>
                  <div className="tr-final-vote-row">
                    <VStack gap={1}>
                      <Text weight="semibold">
                        {agentName(session, vote.agentId)}
                      </Text>
                      <Text type="supporting">
                        {formatConfidence(vote.confidence)} confidence
                      </Text>
                    </VStack>
                    <VStack gap={1}>
                      <Text type="label" color="secondary">
                        {hasScenarioVoteOverrides
                          ? "Generated → Recorded"
                          : "Initial → Final"}
                      </Text>
                      <HStack gap={1} wrap="wrap" vAlign="center">
                        <Badge label={transitionStart} variant="neutral" />
                        <Text type="supporting">→</Text>
                        <Badge
                          label={vote.position}
                          variant={positionVariant(vote.position)}
                        />
                        {override?.overridden && (
                          <Badge label="SCENARIO-FORCED" variant="orange" />
                        )}
                      </HStack>
                    </VStack>
                    <ExpandableText
                      id={`vote-${vote.agentId}`}
                      text={vote.rationale}
                      isExpanded={expanded.has(`vote-${vote.agentId}`)}
                      onToggle={() => toggleExpanded(`vote-${vote.agentId}`)}
                      compact
                    />
                  </div>
                  {organicFlip && (
                    <div className="tr-organic-flip">
                      Changed {vote.initialPosition} → {generatedPosition} after
                      debate
                    </div>
                  )}
                </Card>
              );
            })}
          </VStack>
        </TimelineStage>

        <TimelineStage
          label="Consensus"
          status={session.stageStatuses.consensus}
          skippedMessage={skippedMessage(session, "consensus")}
        >
          {session.consensus && (
            <Card padding={3}>
              <HStack gap={2} wrap="wrap" vAlign="center">
                <Badge
                  label={session.consensus.status}
                  variant={
                    session.consensus.status === "DEADLOCKED"
                      ? "warning"
                      : "info"
                  }
                />
                <Badge
                  label={session.consensus.position ?? "NO POSITION"}
                  variant="blue"
                />
                <Text weight="semibold">{consensusSplit(session)}</Text>
              </HStack>
              <Text type="supporting">
                {session.consensus.status === "DEADLOCKED"
                  ? "No majority position — 1/1/1 split."
                  : consensusSupportingLine(session)}
              </Text>
            </Card>
          )}
        </TimelineStage>

        {session.scenarioInjection.riskPolicyOverride && (
          <InjectionEvent
            text={`Risk policy tightened: ${session.scenarioInjection.riskPolicyOverride.ruleId} ${session.scenarioInjection.riskPolicyOverride.originalThreshold}% → ${session.scenarioInjection.riskPolicyOverride.scenarioThreshold}%.`}
          />
        )}

        <TimelineStage
          label="Risk Verdict"
          status={terminalStageStatus(session)}
          skippedMessage={skippedMessage(session, "risk review")}
          showChildrenWhenSkipped
          isTerminal
        >
          <VStack gap={3}>
            {session.riskReview && (
              <Card padding={4}>
                <VStack gap={3}>
                  <HStack gap={2} wrap="wrap" vAlign="center">
                    <Heading level={4}>Deterministic risk verdict</Heading>
                    <Badge
                      label={session.riskReview.status}
                      variant={riskVariant(session.riskReview.status)}
                    />
                  </HStack>
                  {triggeredRules.map((rule) => (
                    <div className="tr-triggered-rule" key={rule.ruleId}>
                      <Text type="code" weight="semibold">
                        {rule.ruleId}
                      </Text>
                      <Text>{rule.message}</Text>
                    </div>
                  ))}
                  {passedRules.length > 0 && (
                    <div>
                      <button
                        type="button"
                        className="tr-expand-button"
                        aria-expanded={passedRulesExpanded}
                        onClick={() =>
                          setPassedRulesExpanded((current) => !current)
                        }
                      >
                        {passedRules.length} rules passed{" "}
                        {passedRulesExpanded ? "▾" : "▸"}
                      </button>
                      {passedRulesExpanded && (
                        <div className="tr-passed-rules">
                          {passedRules.map((rule) => (
                            <Text type="supporting" key={rule.ruleId}>
                              ✓ {rule.ruleId}: {rule.message}
                            </Text>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </VStack>
              </Card>
            )}

            {session.scenarioInjection.type === "workflow-recording-error" && (
              <InjectionCallout text={session.scenarioInjection.description} />
            )}

            {!session.riskReview &&
              session.pipelineGate.status === "BLOCKED" && (
                <Card padding={4} variant="red">
                  <VStack gap={2}>
                    <Badge
                      label={
                        session.pipelineGate.reasonCode ?? "PIPELINE_BLOCKED"
                      }
                      variant="error"
                    />
                    <Heading level={4}>
                      Evidence violation recorded — no execution permitted
                    </Heading>
                    <Text>{session.execution.reason}</Text>
                  </VStack>
                </Card>
              )}

            {session.error && (
              <Card padding={4} variant="red">
                <VStack gap={2}>
                  <HStack gap={2} wrap="wrap">
                    <Badge label={session.error.code} variant="error" />
                    <Badge label={session.error.stage} variant="red" />
                  </HStack>
                  <Heading level={4}>Workflow error recorded</Heading>
                  <Text>{session.error.message}</Text>
                </VStack>
              </Card>
            )}

            <div className="tr-debate-outcome">
              <Text type="label" color="secondary">
                Terminal outcome
              </Text>
              <Badge
                label={terminalOutcome(session)}
                variant={outcomeVariant(session)}
              />
            </div>
          </VStack>
        </TimelineStage>
      </div>
    </section>
  );
}

function TimelineStage({
  label,
  status,
  subtitle,
  skippedMessage,
  showChildrenWhenSkipped = false,
  isTerminal = false,
  children,
}: {
  label: string;
  status: StageStatus;
  subtitle?: string;
  skippedMessage?: string;
  showChildrenWhenSkipped?: boolean;
  isTerminal?: boolean;
  children: ReactNode;
}) {
  const skipped = status === "SKIPPED";
  return (
    <article
      className={`tr-debate-stage ${skipped ? "tr-debate-stage-skipped" : ""}`}
    >
      <div className="tr-debate-rail" aria-hidden="true">
        <span
          className={`tr-debate-node tr-debate-node-${status.toLowerCase()}`}
        />
        {!isTerminal && <span className="tr-debate-rail-line" />}
      </div>
      <div className="tr-debate-stage-content">
        <div className="tr-debate-stage-heading">
          <div>
            <Heading level={3}>{label}</Heading>
            {subtitle && <Text type="supporting">{subtitle}</Text>}
          </div>
          <Badge label={status} variant={stageVariant(status)} />
        </div>
        {skipped && (
          <div className="tr-debate-skipped">
            Skipped —{" "}
            {skippedMessage ?? "the pipeline did not reach this stage"}
          </div>
        )}
        {(!skipped || showChildrenWhenSkipped) && children}
      </div>
    </article>
  );
}

function InjectionEvent({ text }: { text: string }) {
  return (
    <div className="tr-debate-injection-row">
      <div className="tr-debate-rail" aria-hidden="true">
        <span className="tr-debate-injection-node">⚡</span>
        <span className="tr-debate-rail-line" />
      </div>
      <InjectionCallout text={text} />
    </div>
  );
}

function InjectionCallout({ text }: { text: string }) {
  return (
    <div className="tr-debate-injection">
      <Text weight="semibold">⚡ Controlled injection</Text>
      <Text>{text}</Text>
    </div>
  );
}

function ExpandableText({
  id,
  text,
  isExpanded,
  onToggle,
  compact = false,
}: {
  id: string;
  text: string;
  isExpanded: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  const canExpand = text.length > (compact ? 180 : 320);

  return (
    <div
      className={
        compact ? "tr-expandable tr-expandable-compact" : "tr-expandable"
      }
    >
      <Text>
        <span
          id={id}
          className={!isExpanded && canExpand ? "tr-clamped-text" : undefined}
        >
          {text}
        </span>
      </Text>
      {canExpand && (
        <button
          type="button"
          className="tr-expand-button"
          aria-controls={id}
          aria-expanded={isExpanded}
          onClick={onToggle}
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function TranscriptDatum({ label, value }: { label: string; value: string }) {
  return (
    <VStack gap={0.5}>
      <Text type="label" color="secondary">
        {label}
      </Text>
      <Text weight="semibold">{value}</Text>
    </VStack>
  );
}

function collectFailedEvidence(session: DebateSession) {
  return session.evidenceValidation.agents.flatMap((agent) =>
    agent.checkedEvidence.flatMap((claim, claimIndex) =>
      claim.validationStatus === "valid"
        ? []
        : [{ agentId: agent.agentId, claimIndex, claim }],
    ),
  );
}

function checkedEvidence(
  session: DebateSession,
  agentId: string,
  claimIndex: number,
) {
  return session.evidenceValidation.agents.find(
    (agent) => agent.agentId === agentId,
  )?.checkedEvidence[claimIndex];
}

function evidenceTitle(
  validation: CheckedEvidence | undefined,
  statement: string,
) {
  if (!validation) {
    return statement;
  }
  const base = `${statement} Reference: ${formatNumber(validation.referenceValue)}.`;
  return validation.validationStatus === "valid"
    ? `${base} Validated.`
    : `${base} Deviation: ${formatDeviation(validation.deviationPct)}. ${validation.validationStatus.toUpperCase()}.`;
}

function evidenceInjectionText(
  session: DebateSession,
  override: NonNullable<DebateSession["scenarioInjection"]["evidenceOverride"]>,
) {
  const claim = session.proposals.find(
    (proposal) => proposal.agentId === override.agentId,
  )?.evidence[override.claimIndex];
  return `${session.scenarioInjection.description} ${agentName(session, override.agentId)}'s claim ${override.claimIndex + 1} (${claim?.claimType ?? "UNKNOWN"}) was corrupted: ${formatNumber(override.originalValue)} → ${formatNumber(override.forcedValue)} — before deterministic validation.`;
}

function generatedVotePosition(
  session: DebateSession,
  vote: DebateSession["finalVotes"][number],
) {
  return (
    session.scenarioInjection.voteOverrides.find(
      (override) => override.agentId === vote.agentId,
    )?.originalPosition ?? vote.position
  );
}

function sessionHasVoteOverrides(session: DebateSession) {
  return session.scenarioInjection.voteOverrides.some(
    (vote) => vote.overridden,
  );
}

function voteOverrideSummary(session: DebateSession) {
  return session.scenarioInjection.voteOverrides
    .filter((vote) => vote.overridden)
    .map(
      (vote) =>
        `${agentName(session, vote.agentId)} ${vote.originalPosition}→${vote.forcedPosition}`,
    )
    .join(", ");
}

function consensusSplit(session: DebateSession) {
  if (!session.consensus) {
    return "No vote";
  }
  const counts = Object.values(session.consensus.voteCounts);
  if (session.consensus.status === "DEADLOCKED") {
    return counts.join("/");
  }
  return `${Math.max(...counts)}/${session.agents.length}`;
}

function consensusSupportingLine(session: DebateSession) {
  if (!session.consensus) {
    return "";
  }
  const injected = session.scenarioInjection.voteOverrides.some(
    (vote) => vote.overridden,
  );
  return injected
    ? `Consensus was calculated from scenario-recorded positions; ${session.consensus.supportingAgentIds.length} agents are recorded as supporting ${session.consensus.position}.`
    : `${session.consensus.supportingAgentIds.length} agents organically supported ${session.consensus.position}.`;
}

function skippedMessage(session: DebateSession, stage: string) {
  return session.pipelineGate.status === "BLOCKED"
    ? `${stage} was not run because the pipeline was blocked at evidence validation`
    : `${stage} was not run`;
}

function terminalStageStatus(session: DebateSession): StageStatus {
  if (session.error) {
    return "ERROR";
  }
  return session.stageStatuses.riskReview;
}

function terminalOutcome(session: DebateSession) {
  if (session.error) {
    return "ERROR";
  }
  if (session.outcome === "VETOED") {
    return "VETOED";
  }
  if (session.outcome === "DEADLOCKED") {
    return "DEADLOCKED";
  }
  return session.execution.status;
}

function agentName(session: DebateSession, agentId: string) {
  return (
    session.agents.find((agent) => agent.agentId === agentId)?.displayName ??
    "Unknown agent"
  );
}

function agentPersona(session: DebateSession, agentId: string) {
  return (
    session.agents.find((agent) => agent.agentId === agentId)?.persona ??
    "UNKNOWN"
  );
}

function stageVariant(status: StageStatus): "success" | "warning" | "error" {
  if (status === "COMPLETED") {
    return "success";
  }
  if (status === "SKIPPED") {
    return "warning";
  }
  return "error";
}

function positionVariant(position: string): "green" | "red" | "neutral" {
  if (position === "LONG") {
    return "green";
  }
  if (position === "SHORT") {
    return "red";
  }
  return "neutral";
}

function riskVariant(
  status: "APPROVED" | "VETOED" | "DEADLOCKED",
): "success" | "warning" | "error" {
  if (status === "APPROVED") {
    return "success";
  }
  return status === "DEADLOCKED" ? "warning" : "error";
}

function outcomeVariant(
  session: DebateSession,
): "success" | "warning" | "error" {
  if (terminalOutcome(session) === "READY") {
    return "success";
  }
  if (terminalOutcome(session) === "DEADLOCKED") {
    return "warning";
  }
  return "error";
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDeviation(value: number) {
  return Number.isFinite(value) ? `${value.toFixed(2)}%` : "unbounded";
}
