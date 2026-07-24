import { AppShell } from "@astryxdesign/core/AppShell";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { ButtonGroup } from "@astryxdesign/core/ButtonGroup";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Table } from "@astryxdesign/core/Table";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { useToast } from "@astryxdesign/core/Toast";
import { useEffect, useMemo, useState } from "react";
import { DebateTab } from "./DebateTab";

type SessionScenario =
  | "healthy"
  | "evidence-fault"
  | "risk-veto"
  | "error"
  | "deadlock";
type SessionStageStatus = "COMPLETED" | "BLOCKED" | "SKIPPED" | "ERROR";
type ActiveTab = "overview" | "debate" | "agents" | "replay" | "audit";

interface RecordedSession {
  schemaVersion: 4;
  sessionId: string;
  createdAt: string;
  mode: SessionScenario;
  scenario: SessionScenario;
  scenarioInjection: {
    injected: boolean;
    type:
      | "none"
      | "evidence-price-deviation"
      | "directional-risk-veto"
      | "workflow-recording-error"
      | "deadlock";
    description: string;
    votesOverridden: boolean;
    voteOverrides: Array<{
      agentId: string;
      originalPosition: string;
      forcedPosition: string;
      overridden: boolean;
    }>;
    evidenceOverride?: {
      agentId: string;
      claimIndex: number;
      originalValue: number;
      forcedValue: number;
    };
    riskPolicyOverride?: {
      ruleId: "MAX_PRICE_MOVE";
      originalThreshold: number;
      scenarioThreshold: number;
    };
  };
  snapshot: {
    snapshotId: string;
    symbol: string;
    observedAt: string;
    decisionHorizonMinutes: number;
    currentPrice: number;
    previousClose: number;
    dayOpen: number;
    dayHigh: number;
    dayLow: number;
    volume: number;
    averageVolume: number;
    indicators: {
      sma20: number;
      ema9: number;
      rsi14: number;
    };
  };
  agents: Array<{
    agentId: string;
    displayName: string;
    persona: string;
    riskAppetite: string;
  }>;
  lifecycle: string[];
  stageStatuses: {
    marketSnapshot: SessionStageStatus;
    proposals: SessionStageStatus;
    evidenceValidation: SessionStageStatus;
    crossExamination: SessionStageStatus;
    finalVote: SessionStageStatus;
    consensus: SessionStageStatus;
    riskReview: SessionStageStatus;
    evaluation: SessionStageStatus;
  };
  pipelineGate: {
    status: "PASSED" | "BLOCKED";
    blockedAt: "EVIDENCE_VALIDATION" | null;
    reasonCode: "EVIDENCE_INTEGRITY" | null;
    message: string;
  };
  proposals: Array<{
    agentId: string;
    position: string;
    confidence: number;
    thesis: string;
    evidence: Array<{
      sourceId: string;
      claimType: string;
      citedValue: number;
      statement: string;
    }>;
    risks: string[];
  }>;
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
    changedFromInitial: boolean;
  }>;
  consensus: {
    status: string;
    position: string | null;
    unanimous: boolean;
    voteCounts: Record<string, number>;
    supportingAgentIds: string[];
    changedAgentIds: string[];
    dissentingAgentIds?: string[];
  } | null;
  evidenceValidation: {
    checkedCount: number;
    validCount: number;
    invalidCount: number;
    invalidAgentCount: number;
    validationStatus: string;
    blocked: boolean;
    agents: Array<{
      agentId: string;
      validationStatus: string;
      checkedCount: number;
      validCount: number;
      invalidCount: number;
      checkedEvidence: Array<{
        sourceId: string;
        claimType: string;
        statement: string;
        citedValue: number;
        referenceValue: number;
        deviationPct: number;
        validationStatus: string;
      }>;
    }>;
  };
  riskReview: {
    status: "APPROVED" | "VETOED" | "DEADLOCKED";
    tradeAllowed: boolean;
    triggeredRuleIds: string[];
    rules: Array<{
      ruleId: string;
      outcome: "PASSED" | "TRIGGERED" | "NOT_APPLICABLE";
      message: string;
    }>;
  } | null;
  execution: {
    executionAllowed: boolean;
    status: "READY" | "BLOCKED";
    reason: string;
  };
  outcome: string;
  error?: {
    code: string;
    stage: string;
    message: string;
  };
  replay: Array<{
    order: number;
    title: string;
    detail: string;
  }>;
  signoz: {
    traceId: string;
    traceUrl: string;
    logsHint: string;
    dashboardUrl: string;
  };
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

export function App() {
  const toast = useToast();
  const [sessions, setSessions] = useState<RecordedSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingMode, setLoadingMode] = useState<SessionScenario | null>(null);
  const [filter, setFilter] = useState<"all" | SessionScenario>("all");
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [replayIndex, setReplayIndex] = useState(0);

  const filteredSessions = useMemo(
    () =>
      filter === "all"
        ? sessions
        : sessions.filter((session) => session.mode === filter),
    [filter, sessions],
  );

  const selectedSession = useMemo(
    () =>
      sessions.find((session) => session.sessionId === selectedId) ??
      filteredSessions[0] ??
      sessions[0],
    [filteredSessions, selectedId, sessions],
  );

  useEffect(() => {
    void loadSessions();
  }, []);

  useEffect(() => {
    setReplayIndex(0);
    setActiveTab("overview");
  }, [selectedSession?.sessionId]);

  async function loadSessions() {
    try {
      const data = await requestJson<RecordedSession[]>(
        `${apiBaseUrl}/sessions`,
      );
      setSessions(data);
      setSelectedId((current) => current ?? data[0]?.sessionId ?? null);
    } catch (error) {
      toast({
        body: getErrorMessage(error, "Could not connect to the TraceRoom API."),
        uniqueID: "load-sessions-error",
      });
    }
  }

  async function runSession(scenario: SessionScenario) {
    setLoadingMode(scenario);
    try {
      const session = await requestJson<RecordedSession>(
        `${apiBaseUrl}/sessions/run?scenario=${scenario}`,
        { method: "POST" },
      );
      setSessions((current) => [session, ...current]);
      setSelectedId(session.sessionId);
      setFilter("all");
      toast({
        body: scenarioSuccessMessage(session),
        uniqueID: `run-${scenario}`,
      });
    } catch (error) {
      toast({
        body: getErrorMessage(error, `Could not run the ${scenario} session.`),
        uniqueID: `run-${scenario}-error`,
      });
    } finally {
      setLoadingMode(null);
    }
  }

  async function copySessionId(sessionId: string) {
    await navigator.clipboard.writeText(sessionId);
    toast({ body: "Session ID copied.", uniqueID: "copy-session-id" });
  }

  return (
    <AppShell
      contentPadding={0}
      height="fill"
      variant="section"
      sideNav={
        <aside className="tr-side">
          <VStack gap={5}>
            <VStack gap={1}>
              <Text type="label" color="secondary">
                TraceRoom
              </Text>
              <Heading level={1} type="display-3">
                Agent audit layer
              </Heading>
              <Text type="supporting">
                Investigate and govern agent decisions with SigNoz-backed
                evidence.
              </Text>
            </VStack>

            <ButtonGroup
              label="Run session actions"
              orientation="vertical"
              size="md"
            >
              <Button
                label="Run Healthy Session"
                variant="primary"
                isLoading={loadingMode === "healthy"}
                isDisabled={loadingMode !== null}
                clickAction={() => runSession("healthy")}
              />
              <Button
                label="Run Evidence Fault"
                variant="destructive"
                isLoading={loadingMode === "evidence-fault"}
                isDisabled={loadingMode !== null}
                clickAction={() => runSession("evidence-fault")}
              />
              <Button
                label="Run Risk Veto"
                variant="secondary"
                isLoading={loadingMode === "risk-veto"}
                isDisabled={loadingMode !== null}
                clickAction={() => runSession("risk-veto")}
              />
              <Button
                label="Run Error Session"
                variant="destructive"
                isLoading={loadingMode === "error"}
                isDisabled={loadingMode !== null}
                clickAction={() => runSession("error")}
              />
              <Button
                label="Run Deadlock"
                variant="secondary"
                isLoading={loadingMode === "deadlock"}
                isDisabled={loadingMode !== null}
                clickAction={() => runSession("deadlock")}
              />
            </ButtonGroup>

            <VStack gap={2}>
              <Text type="label" color="secondary">
                Session Filter
              </Text>
              <Grid columns={2} gap={1}>
                <Button
                  label="All"
                  variant={filter === "all" ? "primary" : "secondary"}
                  clickAction={() => setFilter("all")}
                />
                <Button
                  label="Healthy"
                  variant={filter === "healthy" ? "primary" : "secondary"}
                  clickAction={() => setFilter("healthy")}
                />
                <Button
                  label="Evidence"
                  variant={
                    filter === "evidence-fault" ? "primary" : "secondary"
                  }
                  clickAction={() => setFilter("evidence-fault")}
                />
                <Button
                  label="Risk"
                  variant={filter === "risk-veto" ? "primary" : "secondary"}
                  clickAction={() => setFilter("risk-veto")}
                />
                <Button
                  label="Error"
                  variant={filter === "error" ? "primary" : "secondary"}
                  clickAction={() => setFilter("error")}
                />
                <Button
                  label="Deadlock"
                  variant={filter === "deadlock" ? "primary" : "secondary"}
                  clickAction={() => setFilter("deadlock")}
                />
              </Grid>
            </VStack>

            <VStack gap={2}>
              <HStack hAlign="between" vAlign="center">
                <Text type="label" color="secondary">
                  Sessions
                </Text>
                <Badge label={filteredSessions.length} variant="neutral" />
              </HStack>
              <VStack gap={1.5}>
                {filteredSessions.map((session) => (
                  <button
                    className={
                      session.sessionId === selectedSession?.sessionId
                        ? "tr-session tr-session-selected"
                        : "tr-session"
                    }
                    key={session.sessionId}
                    onClick={() => setSelectedId(session.sessionId)}
                  >
                    <span>
                      <strong>{session.snapshot.symbol}</strong>
                      <small>{shortId(session.sessionId)}</small>
                    </span>
                    <Badge
                      label={session.outcome}
                      variant={sessionOutcomeVariant(session)}
                    />
                  </button>
                ))}
                {filteredSessions.length === 0 && (
                  <Text type="supporting">
                    No sessions match this filter yet.
                  </Text>
                )}
              </VStack>
            </VStack>
          </VStack>
        </aside>
      }
      mobileNav={false}
    >
      <main className="tr-main">
        {selectedSession ? (
          <VStack gap={5}>
            <Header
              session={selectedSession}
              onCopySession={() =>
                void copySessionId(selectedSession.sessionId)
              }
            />

            <Grid columns={{ minWidth: 190, max: 5 }} gap={3}>
              <MetricCard
                label="Current Price"
                value={formatPrice(selectedSession.snapshot.currentPrice)}
              />
              <MetricCard
                label="Previous Close"
                value={formatPrice(selectedSession.snapshot.previousClose)}
              />
              <MetricCard
                label="Day Range"
                value={`${formatPrice(selectedSession.snapshot.dayLow)}–${formatPrice(selectedSession.snapshot.dayHigh)}`}
              />
              <MetricCard
                label="RSI (14)"
                value={selectedSession.snapshot.indicators.rsi14.toFixed(1)}
              />
              <MetricCard
                label="Valid Evidence"
                value={`${selectedSession.evidenceValidation.validCount}/${selectedSession.evidenceValidation.checkedCount}`}
                status={
                  selectedSession.evidenceValidation.blocked
                    ? "error"
                    : "success"
                }
              />
            </Grid>

            <TabList
              value={activeTab}
              onChange={(value) => setActiveTab(value as ActiveTab)}
              hasDivider
            >
              <Tab value="overview" label="Overview" />
              <Tab value="debate" label="Debate" />
              <Tab value="agents" label="Agents" />
              <Tab value="replay" label="Replay" />
              <Tab value="audit" label="Audit" />
            </TabList>

            {activeTab === "overview" && (
              <OverviewTab session={selectedSession} />
            )}
            {activeTab === "debate" && <DebateTab session={selectedSession} />}
            {activeTab === "agents" && <AgentsTab session={selectedSession} />}
            {activeTab === "replay" && (
              <ReplayTab
                session={selectedSession}
                replayIndex={replayIndex}
                setReplayIndex={setReplayIndex}
              />
            )}
            {activeTab === "audit" && <AuditTab session={selectedSession} />}
          </VStack>
        ) : (
          <div className="tr-empty">
            <EmptyState
              title="Run a session to begin"
              description="Run the ACME replay snapshot through all three agents."
              actions={
                <Button
                  label="Run Healthy Session"
                  variant="primary"
                  clickAction={() => runSession("healthy")}
                />
              }
            />
          </div>
        )}
      </main>
    </AppShell>
  );
}

function Header({
  session,
  onCopySession,
}: {
  session: RecordedSession;
  onCopySession: () => void;
}) {
  return (
    <header className="tr-header">
      <VStack gap={1}>
        <HStack gap={2} wrap="wrap" vAlign="center">
          <Text type="label" color="secondary">
            Decision Detail
          </Text>
          <Badge
            label={session.mode.toUpperCase()}
            variant={scenarioBadgeVariant(session.scenario)}
          />
          {session.scenarioInjection.injected && (
            <Badge label="INJECTED SCENARIO" variant="orange" />
          )}
          <Badge
            label={session.outcome}
            variant={sessionOutcomeVariant(session)}
          />
        </HStack>
        <Heading level={2} type="display-2">
          {session.snapshot.symbol} agent debate
        </Heading>
        <HStack gap={3} wrap="wrap">
          <Text type="supporting">Session {shortId(session.sessionId)}</Text>
          <Text type="supporting">
            Captured <Timestamp value={session.createdAt} format="date_time" />
          </Text>
          <Text type="supporting">
            Snapshot {session.snapshot.snapshotId} ·{" "}
            {session.snapshot.decisionHorizonMinutes}-minute horizon
          </Text>
        </HStack>
      </VStack>
      <ButtonGroup label="Session actions" size="sm">
        <Button
          label="Copy Session ID"
          variant="secondary"
          clickAction={onCopySession}
        />
      </ButtonGroup>
    </header>
  );
}

function OverviewTab({ session }: { session: RecordedSession }) {
  return (
    <Grid columns={{ minWidth: 340, max: 2 }} gap={4}>
      <VStack gap={4}>
        <OutcomeCard session={session} />
        {session.scenarioInjection.injected && (
          <ScenarioInjectionCard session={session} />
        )}

        <Card padding={4}>
          <VStack gap={3}>
            <HStack hAlign="between" vAlign="center">
              <Heading level={3}>Evidence Integrity</Heading>
              <Badge
                label={session.evidenceValidation.validationStatus.toUpperCase()}
                variant={
                  session.evidenceValidation.blocked ? "error" : "success"
                }
              />
            </HStack>
            <ProgressBar
              label="Valid evidence claims"
              value={evidenceProgress(session)}
              hasValueLabel
              variant={session.evidenceValidation.blocked ? "error" : "success"}
            />
            <Text>
              {session.evidenceValidation.validCount} of{" "}
              {session.evidenceValidation.checkedCount} cited claims matched the
              shared ACME snapshot.
            </Text>
          </VStack>
        </Card>

        <Card padding={4}>
          <VStack gap={3}>
            <Heading level={3}>Consensus</Heading>
            {session.consensus ? (
              <HStack gap={2} wrap="wrap">
                <Badge label={session.consensus.status} variant="info" />
                <Badge
                  label={session.consensus.position ?? "NONE"}
                  variant="blue"
                />
                <Badge
                  label={`${matchingVoteCount(session)}/3 votes`}
                  variant="neutral"
                />
              </HStack>
            ) : (
              <Badge label="NOT RUN" variant="warning" />
            )}
            <Text>{consensusExplanation(session)}</Text>
          </VStack>
        </Card>
      </VStack>

      <VStack gap={4}>
        <Card padding={4}>
          <VStack gap={3}>
            <HStack hAlign="between" vAlign="center">
              <Heading level={3}>Risk Review</Heading>
              {!session.riskReview && (
                <Badge label="NOT RUN" variant="warning" />
              )}
            </HStack>
            {session.riskReview ? (
              <Table
                idKey="ruleId"
                density="compact"
                dividers="rows"
                data={session.riskReview.rules}
                columns={[
                  {
                    key: "ruleId",
                    header: "Rule",
                    renderCell: (rule) => (
                      <Text type="code">{rule.ruleId}</Text>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    renderCell: (rule) => (
                      <Badge
                        label={rule.outcome}
                        variant={
                          rule.outcome === "TRIGGERED" ? "error" : "success"
                        }
                      />
                    ),
                  },
                  {
                    key: "message",
                    header: "Detail",
                    renderCell: (rule) => (
                      <Text type="supporting">{rule.message}</Text>
                    ),
                  },
                ]}
              />
            ) : (
              <VStack gap={2}>
                <Badge
                  label={session.pipelineGate.reasonCode ?? "UPSTREAM_BLOCK"}
                  variant="error"
                />
                <Text>{session.pipelineGate.message}</Text>
              </VStack>
            )}
          </VStack>
        </Card>

        <Card padding={4}>
          <VStack gap={3}>
            <Heading level={3}>Lifecycle</Heading>
            <div className="tr-timeline">
              {session.lifecycle.map((state, index) => (
                <div className="tr-step" key={`${state}-${index}`}>
                  <span>{index + 1}</span>
                  <Text type="label">{state}</Text>
                </div>
              ))}
            </div>
          </VStack>
        </Card>
      </VStack>
    </Grid>
  );
}

function OutcomeCard({ session }: { session: RecordedSession }) {
  const isBlocked = session.execution.status === "BLOCKED";
  const title =
    session.outcome === "ERROR"
      ? "WORKFLOW ERROR RECORDED"
      : session.outcome === "DEADLOCKED"
        ? "DEADLOCK - NO CONSENSUS"
        : session.outcome === "EVIDENCE_BLOCKED"
          ? "EVIDENCE FAILURE - EXECUTION BLOCKED"
          : session.outcome === "VETOED"
            ? "RISK VETO - EXECUTION BLOCKED"
            : "APPROVED - DECISION READY";

  return (
    <Card padding={4} variant={isBlocked ? "red" : "green"}>
      <VStack gap={2}>
        <HStack hAlign="between" vAlign="center" wrap="wrap">
          <Heading level={3}>{title}</Heading>
          <Badge
            label={session.outcome}
            variant={sessionOutcomeVariant(session)}
          />
        </HStack>
        <Text>{session.execution.reason}</Text>
        {session.error && (
          <Text type="supporting">
            {session.error.stage}: {session.error.message} ({session.error.code}
            )
          </Text>
        )}
      </VStack>
    </Card>
  );
}

function ScenarioInjectionCard({ session }: { session: RecordedSession }) {
  const injection = session.scenarioInjection;

  return (
    <Card padding={4}>
      <VStack gap={3}>
        <HStack hAlign="between" vAlign="center" wrap="wrap">
          <Heading level={3}>Controlled Fault Injection</Heading>
          <Badge label="INJECTED SCENARIO" variant="orange" />
        </HStack>
        <Text>{injection.description}</Text>

        {injection.voteOverrides.length > 0 && (
          <Table
            idKey={(vote) => vote.agentId}
            density="compact"
            dividers="rows"
            data={injection.voteOverrides}
            columns={[
              {
                key: "agentId",
                header: "Agent",
                renderCell: (vote) => (
                  <Text weight="semibold">
                    {agentName(session, vote.agentId)}
                  </Text>
                ),
              },
              {
                key: "originalPosition",
                header: "Generated Vote",
                renderCell: (vote) => (
                  <Badge label={vote.originalPosition} variant="neutral" />
                ),
              },
              {
                key: "forcedPosition",
                header: "Forced Vote",
                renderCell: (vote) => (
                  <Badge label={vote.forcedPosition} variant="orange" />
                ),
              },
              {
                key: "overridden",
                header: "Changed",
                renderCell: (vote) => (
                  <Badge
                    label={vote.overridden ? "YES" : "NO"}
                    variant={vote.overridden ? "warning" : "neutral"}
                  />
                ),
              },
            ]}
          />
        )}

        {injection.riskPolicyOverride && (
          <Text type="supporting">
            Risk policy override: {injection.riskPolicyOverride.ruleId} changed
            from {injection.riskPolicyOverride.originalThreshold}% to{" "}
            {injection.riskPolicyOverride.scenarioThreshold}%.
          </Text>
        )}

        {injection.evidenceOverride && (
          <Text type="supporting">
            Evidence override:{" "}
            {agentName(session, injection.evidenceOverride.agentId)} claim{" "}
            {injection.evidenceOverride.claimIndex + 1} changed from{" "}
            {injection.evidenceOverride.originalValue} to{" "}
            {injection.evidenceOverride.forcedValue}.
          </Text>
        )}
      </VStack>
    </Card>
  );
}

function AgentsTab({ session }: { session: RecordedSession }) {
  const hasScenarioVoteOverrides = sessionHasVoteOverrides(session);

  return (
    <VStack gap={4}>
      <Grid columns={{ minWidth: 280, max: 3 }} gap={4}>
        {session.proposals.map((proposal) => (
          <Card key={proposal.agentId} padding={4}>
            <VStack gap={3}>
              <HStack hAlign="between" vAlign="center">
                <Heading level={3}>
                  {agentName(session, proposal.agentId)}
                </Heading>
                <Badge label={proposal.position} variant="blue" />
              </HStack>
              <Text>{proposal.thesis}</Text>
              <Divider />
              <Grid columns={2} gap={2}>
                <MiniDatum
                  label="Persona"
                  value={agentPersona(session, proposal.agentId)}
                />
                <MiniDatum
                  label="Confidence"
                  value={`${Math.round(proposal.confidence * 100)}%`}
                />
                <MiniDatum
                  label="Evidence claims"
                  value={`${proposal.evidence.length}`}
                />
                <MiniDatum
                  label="Validation"
                  value={agentEvidenceStatus(session, proposal.agentId)}
                />
              </Grid>
            </VStack>
          </Card>
        ))}
      </Grid>

      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={3}>Final Votes</Heading>
          {session.finalVotes.length > 0 ? (
            <Table
              idKey={(vote) => vote.agentId}
              density="balanced"
              dividers="rows"
              data={session.finalVotes}
              columns={[
                {
                  key: "agentId",
                  header: "Agent",
                  renderCell: (vote) => (
                    <Text weight="semibold">
                      {agentName(session, vote.agentId)}
                    </Text>
                  ),
                },
                {
                  key: "position",
                  header: hasScenarioVoteOverrides
                    ? "Generated → Recorded"
                    : "Initial → Final",
                  renderCell: (vote) => {
                    const generated = generatedVotePosition(
                      session,
                      vote.agentId,
                      vote.position,
                    );
                    const transitionStart = hasScenarioVoteOverrides
                      ? generated
                      : vote.initialPosition;
                    return (
                      <HStack gap={1} vAlign="center">
                        <Badge label={transitionStart} variant="neutral" />
                        <Text type="supporting">→</Text>
                        <Badge label={vote.position} variant="blue" />
                      </HStack>
                    );
                  },
                },
                {
                  key: "confidence",
                  header: "Confidence",
                  renderCell: (vote) => `${Math.round(vote.confidence * 100)}%`,
                },
                {
                  key: "rationale",
                  header: "Rationale",
                  renderCell: (vote) => (
                    <Text type="supporting">{vote.rationale}</Text>
                  ),
                },
              ]}
            />
          ) : (
            <VStack gap={2}>
              <Badge label="NOT RUN" variant="warning" />
              <Text>
                Final voting was skipped because the evidence-integrity gate
                stopped the pipeline.
              </Text>
            </VStack>
          )}
        </VStack>
      </Card>
    </VStack>
  );
}

function ReplayTab({
  session,
  replayIndex,
  setReplayIndex,
}: {
  session: RecordedSession;
  replayIndex: number;
  setReplayIndex: (value: number | ((current: number) => number)) => void;
}) {
  const step = session.replay[replayIndex];
  const replayPercent =
    session.replay.length <= 1
      ? 100
      : Math.round((replayIndex / (session.replay.length - 1)) * 100);

  return (
    <Grid columns={{ minWidth: 360, max: 2 }} gap={4}>
      <Card padding={5}>
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="center">
            <Heading level={3}>Replay Incident</Heading>
            <Badge
              label={`Step ${replayIndex + 1}/${session.replay.length}`}
              variant={session.scenario === "healthy" ? "green" : "red"}
            />
          </HStack>
          <ProgressBar
            label="Replay progress"
            value={replayPercent}
            hasValueLabel
            variant={session.scenario === "healthy" ? "success" : "warning"}
          />
          <VStack gap={1}>
            <Heading level={4}>{step?.title}</Heading>
            <Text>{step?.detail}</Text>
          </VStack>
          <ButtonGroup label="Replay controls">
            <Button
              label="Previous"
              variant="secondary"
              isDisabled={replayIndex === 0}
              clickAction={() =>
                setReplayIndex((current) => Math.max(current - 1, 0))
              }
            />
            <Button
              label="Next Step"
              variant="primary"
              isDisabled={replayIndex >= session.replay.length - 1}
              clickAction={() =>
                setReplayIndex((current) =>
                  Math.min(current + 1, session.replay.length - 1),
                )
              }
            />
          </ButtonGroup>
        </VStack>
      </Card>

      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={3}>Replay Log</Heading>
          <div className="tr-replay-list">
            {session.replay.map((item, index) => (
              <button
                className={
                  index === replayIndex
                    ? "tr-replay-item tr-replay-item-active"
                    : "tr-replay-item"
                }
                key={item.order}
                onClick={() => setReplayIndex(index)}
              >
                <span>{item.order}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </div>
              </button>
            ))}
          </div>
        </VStack>
      </Card>
    </Grid>
  );
}

function AuditTab({ session }: { session: RecordedSession }) {
  const auditorAnswer = buildAuditorAnswer(session);

  return (
    <Grid columns={{ minWidth: 360, max: 2 }} gap={4}>
      <Card padding={4}>
        <VStack gap={3}>
          <HStack hAlign="between" vAlign="center">
            <Heading level={3}>Recorded Decision Evidence</Heading>
            <Badge label="TraceRoom Audit" variant="info" />
          </HStack>
          <Text>{auditorAnswer}</Text>
          <Divider />
          <MiniDatum label="Session ID" value={session.sessionId} />
          <MiniDatum label="Snapshot" value={session.snapshot.snapshotId} />
          <MiniDatum
            label="Validated evidence"
            value={`${session.evidenceValidation.validCount}/${session.evidenceValidation.checkedCount}`}
          />
          <MiniDatum
            label="Risk verdict"
            value={session.riskReview?.status ?? "NOT RUN"}
          />
          <MiniDatum
            label="Pipeline gate"
            value={
              session.pipelineGate.reasonCode
                ? `${session.pipelineGate.status}: ${session.pipelineGate.reasonCode}`
                : session.pipelineGate.status
            }
          />
          <MiniDatum label="Session outcome" value={session.outcome} />
          {session.error && (
            <MiniDatum
              label="Recorded error"
              value={`${session.error.stage}: ${session.error.message}`}
            />
          )}
        </VStack>
      </Card>

      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={3}>Investigate In SigNoz</Heading>
          <Text type="supporting">
            SigNoz is the observability backend for the supporting trace,
            correlated logs, aggregate metrics, dashboards, and alerts.
          </Text>
          <MiniDatum label="Trace ID" value={session.signoz.traceId} />
          <MiniDatum label="Related logs" value={session.signoz.logsHint} />
          <HStack gap={2} wrap="wrap">
            <Button
              label="View Full Decision Trace"
              href={session.signoz.traceUrl}
              target="_blank"
              rel="noreferrer"
              variant="primary"
            />
            <Button
              label="Investigate Dashboard"
              href={session.signoz.dashboardUrl}
              target="_blank"
              rel="noreferrer"
              variant="secondary"
            />
          </HStack>
        </VStack>
      </Card>
    </Grid>
  );
}

function MetricCard({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: "success" | "error";
}) {
  return (
    <Card padding={4} variant={status === "error" ? "red" : "default"}>
      <VStack gap={1}>
        <Text type="label" color="secondary">
          {label}
        </Text>
        <Text type="display-3" weight="bold">
          {value}
        </Text>
      </VStack>
    </Card>
  );
}

function MiniDatum({ label, value }: { label: string; value: string }) {
  return (
    <VStack gap={0.5}>
      <Text type="label" color="secondary">
        {label}
      </Text>
      <Text weight="semibold" wordBreak="break-word">
        {value}
      </Text>
    </VStack>
  );
}

function evidenceProgress(session: RecordedSession): number {
  if (session.evidenceValidation.checkedCount === 0) {
    return 0;
  }

  return Math.round(
    (session.evidenceValidation.validCount /
      session.evidenceValidation.checkedCount) *
      100,
  );
}

function matchingVoteCount(session: RecordedSession): number {
  if (!session.consensus) {
    return 0;
  }

  return Math.max(...Object.values(session.consensus.voteCounts));
}

function consensusExplanation(session: RecordedSession): string {
  if (!session.consensus) {
    return "Consensus was not run because the evidence-integrity gate stopped the pipeline before cross-examination and final voting.";
  }

  if (session.scenarioInjection.votesOverridden) {
    if (session.scenario === "risk-veto") {
      return "Consensus was calculated from the injected LONG positions for deterministic risk testing. The agents did not organically converge; their generated votes are preserved in the mapping above.";
    }

    if (session.scenario === "deadlock") {
      return "The deadlock was calculated from the injected LONG/SHORT/NO_TRADE split. The agents' generated votes are preserved in the mapping above.";
    }

    return "Consensus was calculated from controlled scenario positions rather than organic agent convergence.";
  }

  if (session.consensus.unanimous) {
    return session.scenarioInjection.injected
      ? "All generated final votes already matched; this scenario did not change their positions."
      : "All agents organically converged on the same final position.";
  }

  if (session.consensus.status === "DEADLOCKED") {
    return "The generated final votes produced no majority position.";
  }

  return `${session.consensus.supportingAgentIds.length} agents organically supported the selected position.`;
}

function scenarioSuccessMessage(session: RecordedSession): string {
  switch (session.scenario) {
    case "healthy":
      return "Healthy ACME debate completed and traced.";
    case "evidence-fault":
      return "Evidence fault detected, blocked, and traced.";
    case "risk-veto":
      return "Directional consensus was vetoed by risk policy and traced.";
    case "error":
      return "Controlled workflow error was recorded and traced.";
    case "deadlock":
      return "Controlled consensus deadlock was recorded and traced.";
  }
}

function scenarioBadgeVariant(
  scenario: SessionScenario,
): "green" | "red" | "orange" | "blue" {
  switch (scenario) {
    case "healthy":
      return "green";
    case "deadlock":
      return "orange";
    case "risk-veto":
      return "blue";
    case "evidence-fault":
    case "error":
      return "red";
  }
}

function sessionOutcomeVariant(
  session: RecordedSession,
): "success" | "warning" | "error" {
  if (session.outcome === "APPROVED") {
    return "success";
  }

  if (session.outcome === "DEADLOCKED") {
    return "warning";
  }

  return "error";
}

function buildAuditorAnswer(session: RecordedSession): string {
  if (session.pipelineGate.status === "BLOCKED") {
    return `${session.snapshot.symbol} was blocked at ${session.pipelineGate.blockedAt} by ${session.pipelineGate.reasonCode}. ${session.evidenceValidation.validCount}/${session.evidenceValidation.checkedCount} evidence claims passed validation. Cross-examination, final voting, consensus, risk review, evaluation, and execution were not run.`;
  }

  const base = `${session.snapshot.symbol} reached ${session.consensus?.status ?? "no consensus"} ${session.consensus?.position ?? "without a position"}. ${session.evidenceValidation.validCount}/${session.evidenceValidation.checkedCount} evidence claims passed validation and risk review was ${session.riskReview?.status ?? "not run"}.`;
  const error = session.error
    ? ` A controlled ${session.error.code} was recorded at ${session.error.stage}.`
    : "";

  return `${base}${error} No real trade was placed.`;
}

function agentName(session: RecordedSession, agentId: string): string {
  return (
    session.agents.find((agent) => agent.agentId === agentId)?.displayName ??
    agentId
  );
}

function agentPersona(session: RecordedSession, agentId: string): string {
  return (
    session.agents.find((agent) => agent.agentId === agentId)?.persona ??
    "UNKNOWN"
  );
}

function agentEvidenceStatus(
  session: RecordedSession,
  agentId: string,
): string {
  return (
    session.evidenceValidation.agents.find((agent) => agent.agentId === agentId)
      ?.validationStatus ?? "unknown"
  ).toUpperCase();
}

function generatedVotePosition(
  session: RecordedSession,
  agentId: string,
  fallback: string,
): string {
  return (
    session.scenarioInjection.voteOverrides.find(
      (vote) => vote.agentId === agentId,
    )?.originalPosition ?? fallback
  );
}

function sessionHasVoteOverrides(session: RecordedSession): boolean {
  return session.scenarioInjection.voteOverrides.some(
    (vote) => vote.overridden,
  );
}

function shortId(sessionId: string): string {
  return sessionId.slice(0, 8);
}

function formatPrice(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch {
    throw new Error(
      "TraceRoom API is unavailable. Start the app with npm run dev from the repository root.",
    );
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      payload?.error ?? `TraceRoom API request failed (${response.status}).`,
    );
  }

  return (await response.json()) as T;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
