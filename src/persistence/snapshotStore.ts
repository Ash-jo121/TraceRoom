import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { withSpan } from "../telemetry/withSpan";
import type { SnapshotCandidate } from "../market/snapshotTypes";

const defaultDbPath = resolve(process.cwd(), "data", "traceroom.sqlite");

export class SnapshotStore {
  private readonly db: DatabaseSync;

  constructor(dbPath = process.env.TRACEROOM_DB_PATH ?? defaultDbPath) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS snapshot_candidates (
        candidate_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL,
        ticker TEXT NOT NULL,
        exchange TEXT NOT NULL,
        data_json TEXT NOT NULL
      );
    `);
  }

  save(candidate: SnapshotCandidate): void {
    const existing = this.get(candidate.candidateId);
    if (existing?.status === "LOCKED") {
      throw new Error("Locked snapshots are immutable.");
    }

    this.db
      .prepare(`
        INSERT OR REPLACE INTO snapshot_candidates (
          candidate_id,
          created_at,
          status,
          ticker,
          exchange,
          data_json
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        candidate.candidateId,
        candidate.createdAt,
        candidate.status,
        candidate.instrument.symbol,
        candidate.instrument.exchange,
        JSON.stringify(candidate),
      );
  }

  get(candidateId: string): SnapshotCandidate | null {
    const row = this.db
      .prepare(
        "SELECT data_json FROM snapshot_candidates WHERE candidate_id = ?",
      )
      .get(candidateId) as { data_json: string } | undefined;

    if (!row) return null;
    const candidate = JSON.parse(row.data_json) as unknown;
    return isSnapshotCandidate(candidate) ? candidate : null;
  }

  async lock(candidateId: string): Promise<SnapshotCandidate> {
    return withSpan("snapshot.lock", async (span) => {
      const candidate = this.get(candidateId);
      if (!candidate) {
        throw new Error("Snapshot candidate not found.");
      }
      if (candidate.status === "LOCKED") return candidate;
      if (!candidate.canLock || !candidate.snapshot) {
        throw new Error("Snapshot candidate did not pass validation.");
      }
      const snapshot = candidate.snapshot;

      const locked: SnapshotCandidate = {
        ...candidate,
        status: "LOCKED",
        canLock: false,
        canRun: true,
        lockedAt: new Date().toISOString(),
      };
      this.saveUnlocked(locked);
      span.setAttributes({
        "snapshot.candidate.id": locked.candidateId,
        "market.snapshot.id": snapshot.snapshotId,
        "market.symbol": snapshot.symbol,
        "snapshot.status": locked.status,
      });
      return locked;
    });
  }

  close(): void {
    this.db.close();
  }

  private saveUnlocked(candidate: SnapshotCandidate): void {
    this.db
      .prepare(`
        UPDATE snapshot_candidates
        SET status = ?, data_json = ?
        WHERE candidate_id = ?
      `)
      .run(
        candidate.status,
        JSON.stringify(candidate),
        candidate.candidateId,
      );
  }
}

function isSnapshotCandidate(value: unknown): value is SnapshotCandidate {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SnapshotCandidate>;
  return Boolean(
    candidate.schemaVersion === 1 &&
      candidate.candidateId &&
      candidate.instrument &&
      candidate.research &&
      Array.isArray(candidate.checks) &&
      Array.isArray(candidate.sources),
  );
}
