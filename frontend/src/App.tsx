import { AppShell } from "@astryxdesign/core/AppShell";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { ButtonGroup } from "@astryxdesign/core/ButtonGroup";
import { Card } from "@astryxdesign/core/Card";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
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

type SessionMode = "healthy" | "fault";
type ActiveTab = "overview" | "agents" | "replay" | "audit";

interface EvidenceClaim {
  citedPrice: number;
  authoritativePrice: number;
  deviationPercent: number;
  tolerancePercent: number;
  status: "PASS" | "CRITICAL";
}

interface AgentProposal {
  agentId: string;
  agentName: string;
  position: string;
  confidence: number;
  entryPrice: number;
  quantity: number;
  thesis: string;
  evidence: EvidenceClaim[];
  riskFlags: string[];
}

interface DemoSession {
  sessionId: string;
  createdAt: string;
  mode: SessionMode;
  fixture: {
    ticker: string;
    referencePrice: number;
    faultPrice: number;
    tolerancePercent: number;
    syntheticCapital: number;
  };
  lifecycle: string[];
  proposals: AgentProposal[];
  finalVotes: Array<{
    agentName: string;
    position: string;
    confidence: number;
    rationale: string;
  }>;
  consensus: {
    status: string;
    position: string | null;
    matchingVotes: number;
    rationale: string;
  };
  evidenceIntegrity: {
    score: number;
    status: "PASS" | "WARN" | "CRITICAL";
    explanation: string;
  };
  riskReview: {
    approved: boolean;
    failedRules: string[];
    rules: Array<{
      ruleName: string;
      passed: boolean;
      severity: string;
      detail: string;
    }>;
  };
  execution: {
    executionAllowed: boolean;
    status: "EXECUTED" | "BLOCKED";
    reason: string;
  };
  outcome: string;
  replay: Array<{
    order: number;
    title: string;
    detail: string;
  }>;
  signoz: {
    traceId: string | null;
    traceUrl: string | null;
    logsHint: string;
    dashboardUrl: string | null;
  };
}

interface ProofPack {
  markdown: string;
  auditor_summary: string;
}

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export function App() {
  const toast = useToast();
  const [sessions, setSessions] = useState<DemoSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingMode, setLoadingMode] = useState<SessionMode | null>(null);
  const [filter, setFilter] = useState<"all" | SessionMode>("all");
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [proofPack, setProofPack] = useState<ProofPack | null>(null);
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
    setProofPack(null);
    setReplayIndex(0);
    setActiveTab("overview");
  }, [selectedSession?.sessionId]);

  async function loadSessions() {
    const response = await fetch(`${apiBaseUrl}/sessions`);
    if (response.ok) {
      const data = (await response.json()) as DemoSession[];
      setSessions(data);
      setSelectedId((current) => current ?? data[0]?.sessionId ?? null);
    }
  }

  async function runSession(mode: SessionMode) {
    setLoadingMode(mode);
    try {
      const response = await fetch(`${apiBaseUrl}/sessions/run?mode=${mode}`, {
        method: "POST",
      });
      const session = (await response.json()) as DemoSession;
      setSessions((current) => [session, ...current]);
      setSelectedId(session.sessionId);
      setFilter("all");
      toast({
        body:
          mode === "fault"
            ? "Fault session blocked by EVIDENCE_INTEGRITY."
            : "Healthy session executed synthetically.",
        uniqueID: `run-${mode}`,
      });
    } finally {
      setLoadingMode(null);
    }
  }

  async function exportProofPack(sessionId: string) {
    const response = await fetch(`${apiBaseUrl}/sessions/${sessionId}/proof-pack`);
    const pack = (await response.json()) as ProofPack;
    setProofPack(pack);
    setActiveTab("audit");
    toast({ body: "Audit proof pack exported.", uniqueID: "proof-pack" });
  }

  async function copySessionId(sessionId: string) {
    await navigator.clipboard.writeText(sessionId);
    toast({ body: "Session ID copied.", uniqueID: "copy-session-id" });
  }

  async function copyMarkdown(markdown: string) {
    await navigator.clipboard.writeText(markdown);
    toast({ body: "Proof pack markdown copied.", uniqueID: "copy-proof-pack" });
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
                Decision recorder
              </Heading>
              <Text type="supporting">
                INFY evidence integrity demo backed by persisted telemetry.
              </Text>
            </VStack>

            <ButtonGroup label="Run session actions" orientation="vertical" size="md">
              <Button
                label="Run Healthy Session"
                variant="primary"
                isLoading={loadingMode === "healthy"}
                isDisabled={loadingMode !== null}
                clickAction={() => runSession("healthy")}
              />
              <Button
                label="Run Fault Session"
                variant="destructive"
                isLoading={loadingMode === "fault"}
                isDisabled={loadingMode !== null}
                clickAction={() => runSession("fault")}
              />
            </ButtonGroup>

            <VStack gap={2}>
              <Text type="label" color="secondary">
                Session Filter
              </Text>
              <ButtonGroup label="Filter sessions" size="sm">
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
                  label="Fault"
                  variant={filter === "fault" ? "primary" : "secondary"}
                  clickAction={() => setFilter("fault")}
                />
              </ButtonGroup>
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
                      <strong>{session.fixture.ticker}</strong>
                      <small>{shortId(session.sessionId)}</small>
                    </span>
                    <Badge
                      label={session.execution.status}
                      variant={
                        session.execution.status === "BLOCKED"
                          ? "error"
                          : "success"
                      }
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
              onCopySession={() => void copySessionId(selectedSession.sessionId)}
              onExport={() => void exportProofPack(selectedSession.sessionId)}
            />

            <Grid columns={{ minWidth: 190, max: 5 }} gap={3}>
              <MetricCard
                label="Momentum Claim"
                value={formatPrice(momentumClaim(selectedSession).citedPrice)}
                status="error"
              />
              <MetricCard
                label="Authoritative Price"
                value={formatPrice(momentumClaim(selectedSession).authoritativePrice)}
              />
              <MetricCard
                label="Deviation"
                value={`${momentumClaim(selectedSession).deviationPercent.toFixed(2)}%`}
                status="error"
              />
              <MetricCard
                label="Tolerance"
                value={`${momentumClaim(selectedSession).tolerancePercent.toFixed(2)}%`}
              />
              <MetricCard
                label="Integrity Score"
                value={`${selectedSession.evidenceIntegrity.score}`}
                status={
                  selectedSession.evidenceIntegrity.status === "CRITICAL"
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
              <Tab value="agents" label="Agents" />
              <Tab value="replay" label="Replay" />
              <Tab value="audit" label="Audit" />
            </TabList>

            {activeTab === "overview" && (
              <OverviewTab session={selectedSession} />
            )}
            {activeTab === "agents" && <AgentsTab session={selectedSession} />}
            {activeTab === "replay" && (
              <ReplayTab
                session={selectedSession}
                replayIndex={replayIndex}
                setReplayIndex={setReplayIndex}
              />
            )}
            {activeTab === "audit" && (
              <AuditTab
                session={selectedSession}
                proofPack={proofPack}
                onExport={() => void exportProofPack(selectedSession.sessionId)}
                onCopyMarkdown={(markdown) => void copyMarkdown(markdown)}
              />
            )}
          </VStack>
        ) : (
          <div className="tr-empty">
            <EmptyState
              title="Run a session to begin"
              description="The fault path creates the canonical INFY evidence-integrity incident."
              actions={
                <Button
                  label="Run Fault Session"
                  variant="destructive"
                  clickAction={() => runSession("fault")}
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
  onExport,
}: {
  session: DemoSession;
  onCopySession: () => void;
  onExport: () => void;
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
            variant={session.mode === "fault" ? "red" : "green"}
          />
          <Badge
            label={session.execution.status}
            variant={session.execution.status === "BLOCKED" ? "error" : "success"}
          />
        </HStack>
        <Heading level={2} type="display-2">
          {session.fixture.ticker} evidence integrity review
        </Heading>
        <HStack gap={3} wrap="wrap">
          <Text type="supporting">
            Session {shortId(session.sessionId)}
          </Text>
          <Text type="supporting">
            Captured <Timestamp value={session.createdAt} format="date_time" />
          </Text>
          <Text type="supporting">
            Synthetic capital {formatPrice(session.fixture.syntheticCapital)}
          </Text>
        </HStack>
      </VStack>
      <ButtonGroup label="Session actions" size="sm">
        <Button label="Copy Session ID" variant="secondary" clickAction={onCopySession} />
        <Button label="Export Proof Pack" variant="primary" clickAction={onExport} />
      </ButtonGroup>
    </header>
  );
}

function OverviewTab({ session }: { session: DemoSession }) {
  return (
    <Grid columns={{ minWidth: 340, max: 2 }} gap={4}>
      <VStack gap={4}>
        <OutcomeCard session={session} />

        <Card padding={4}>
          <VStack gap={3}>
            <HStack hAlign="between" vAlign="center">
              <Heading level={3}>Evidence Integrity</Heading>
              <Badge
                label={session.evidenceIntegrity.status}
                variant={
                  session.evidenceIntegrity.status === "CRITICAL"
                    ? "error"
                    : "success"
                }
              />
            </HStack>
            <ProgressBar
              label="Evidence integrity score"
              value={session.evidenceIntegrity.score}
              hasValueLabel
              variant={
                session.evidenceIntegrity.status === "CRITICAL"
                  ? "error"
                  : "success"
              }
            />
            <Text>{session.evidenceIntegrity.explanation}</Text>
          </VStack>
        </Card>

        <Card padding={4}>
          <VStack gap={3}>
            <Heading level={3}>Consensus</Heading>
            <HStack gap={2} wrap="wrap">
              <Badge label={session.consensus.status} variant="info" />
              <Badge label={session.consensus.position ?? "NONE"} variant="blue" />
              <Badge
                label={`${session.consensus.matchingVotes}/3 votes`}
                variant="neutral"
              />
            </HStack>
            <Text>{session.consensus.rationale}</Text>
          </VStack>
        </Card>
      </VStack>

      <VStack gap={4}>
        <Card padding={4}>
          <VStack gap={3}>
            <Heading level={3}>Risk Rules</Heading>
            <Table
              idKey="ruleName"
              density="compact"
              dividers="rows"
              data={session.riskReview.rules}
              columns={[
                {
                  key: "ruleName",
                  header: "Rule",
                  renderCell: (rule) => <Text type="code">{rule.ruleName}</Text>,
                },
                {
                  key: "status",
                  header: "Status",
                  renderCell: (rule) => (
                    <Badge
                      label={rule.passed ? "PASS" : rule.severity}
                      variant={rule.passed ? "success" : "error"}
                    />
                  ),
                },
                {
                  key: "detail",
                  header: "Detail",
                  renderCell: (rule) => <Text type="supporting">{rule.detail}</Text>,
                },
              ]}
            />
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

function OutcomeCard({ session }: { session: DemoSession }) {
  const isBlocked = session.execution.status === "BLOCKED";

  return (
    <Card padding={4} variant={isBlocked ? "red" : "green"}>
      <VStack gap={2}>
        <HStack hAlign="between" vAlign="center" wrap="wrap">
          <Heading level={3}>
            {isBlocked
              ? "VETOED - EXECUTION BLOCKED"
              : "APPROVED - SYNTHETIC EXECUTION"}
          </Heading>
          <Badge
            label={session.execution.status}
            variant={isBlocked ? "error" : "success"}
          />
        </HStack>
        <Text>{session.execution.reason}</Text>
      </VStack>
    </Card>
  );
}

function AgentsTab({ session }: { session: DemoSession }) {
  return (
    <VStack gap={4}>
      <Grid columns={{ minWidth: 280, max: 3 }} gap={4}>
        {session.proposals.map((proposal) => (
          <Card key={proposal.agentId} padding={4}>
            <VStack gap={3}>
              <HStack hAlign="between" vAlign="center">
                <Heading level={3}>{proposal.agentName}</Heading>
                <Badge label={proposal.position} variant="blue" />
              </HStack>
              <Text>{proposal.thesis}</Text>
              <Divider />
              <Grid columns={2} gap={2}>
                <MiniDatum label="Entry" value={formatPrice(proposal.entryPrice)} />
                <MiniDatum
                  label="Confidence"
                  value={`${Math.round(proposal.confidence * 100)}%`}
                />
                <MiniDatum label="Quantity" value={`${proposal.quantity}`} />
                <MiniDatum
                  label="Evidence"
                  value={proposal.evidence[0]?.status ?? "PASS"}
                />
              </Grid>
            </VStack>
          </Card>
        ))}
      </Grid>

      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={3}>Final Votes</Heading>
          <Table
            idKey={(vote) => vote.agentName}
            density="balanced"
            dividers="rows"
            data={session.finalVotes}
            columns={[
              {
                key: "agentName",
                header: "Agent",
                renderCell: (vote) => <Text weight="semibold">{vote.agentName}</Text>,
              },
              {
                key: "position",
                header: "Vote",
                renderCell: (vote) => <Badge label={vote.position} variant="blue" />,
              },
              {
                key: "confidence",
                header: "Confidence",
                renderCell: (vote) => `${Math.round(vote.confidence * 100)}%`,
              },
              {
                key: "rationale",
                header: "Rationale",
                renderCell: (vote) => <Text type="supporting">{vote.rationale}</Text>,
              },
            ]}
          />
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
  session: DemoSession;
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
              variant={session.mode === "fault" ? "red" : "green"}
            />
          </HStack>
          <ProgressBar
            label="Replay progress"
            value={replayPercent}
            hasValueLabel
            variant={session.mode === "fault" ? "warning" : "success"}
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
              clickAction={() => setReplayIndex((current) => Math.max(current - 1, 0))}
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

function AuditTab({
  session,
  proofPack,
  onExport,
  onCopyMarkdown,
}: {
  session: DemoSession;
  proofPack: ProofPack | null;
  onExport: () => void;
  onCopyMarkdown: (markdown: string) => void;
}) {
  const auditorAnswer =
    session.outcome === "EXECUTED"
      ? "This session executed synthetically because all evidence passed risk review."
      : "Momentum Agent cited 1819.26, the authoritative fixture was 1684.50, deviation was 8.00%, tolerance was 2.00%, EVIDENCE_INTEGRITY failed, and execution was blocked.";

  return (
    <Grid columns={{ minWidth: 360, max: 2 }} gap={4}>
      <VStack gap={4}>
        <Card padding={4}>
          <VStack gap={3}>
            <HStack hAlign="between" vAlign="center">
              <Heading level={3}>Auditor Panel</Heading>
              <Badge label="Demo Fallback" variant="warning" />
            </HStack>
            <Text>{auditorAnswer}</Text>
            <Divider />
            <VStack gap={2}>
              <Text type="label">Supported questions</Text>
              {[
                "Why was this session blocked?",
                "Which agent caused the evidence integrity failure?",
                "What evidence did the risk engine reject?",
                "Was execution allowed?",
                "Export the audit summary.",
              ].map((question) => (
                <Text type="supporting" key={question}>
                  {question}
                </Text>
              ))}
            </VStack>
            <Button label="Export Proof Pack" variant="primary" clickAction={onExport} />
          </VStack>
        </Card>

        <Card padding={4}>
          <VStack gap={3}>
            <Heading level={3}>SigNoz Search</Heading>
            <MiniDatum label="Trace ID" value={session.signoz.traceId ?? "Unavailable"} />
            <MiniDatum label="Logs hint" value={session.signoz.logsHint} />
            <HStack gap={2} wrap="wrap">
              {session.signoz.traceUrl && (
                <Button
                  label="Open Trace"
                  href={session.signoz.traceUrl}
                  target="_blank"
                  rel="noreferrer"
                />
              )}
              {session.signoz.dashboardUrl && (
                <Button
                  label="Open Dashboard"
                  href={session.signoz.dashboardUrl}
                  target="_blank"
                  rel="noreferrer"
                />
              )}
            </HStack>
          </VStack>
        </Card>
      </VStack>

      <Card padding={4}>
        <VStack gap={3}>
          <HStack hAlign="between" vAlign="center">
            <Heading level={3}>Audit Proof Pack</Heading>
            {proofPack && (
              <Button
                label="Copy Markdown"
                size="sm"
                variant="secondary"
                clickAction={() => onCopyMarkdown(proofPack.markdown)}
              />
            )}
          </HStack>
          {proofPack ? (
            <CodeBlock
              code={proofPack.markdown}
              language="markdown"
              title="proof-pack.md"
              width="100%"
              maxHeight={520}
              isWrapped
            />
          ) : (
            <EmptyState
              title="No proof pack exported"
              description="Export a proof pack to preview and copy the markdown audit record."
              isCompact
              actions={
                <Button label="Export Proof Pack" variant="primary" clickAction={onExport} />
              }
            />
          )}
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

function momentumClaim(session: DemoSession): EvidenceClaim {
  return session.proposals.find((proposal) => proposal.agentId === "momentum")!
    .evidence[0];
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
