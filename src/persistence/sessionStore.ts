import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { DemoSession } from "../demo/types";

const defaultDbPath = resolve(process.cwd(), "data", "traceroom.sqlite");

export class SessionStore {
  private readonly db: DatabaseSync;

  constructor(dbPath = process.env.TRACEROOM_DB_PATH ?? defaultDbPath) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        mode TEXT NOT NULL,
        ticker TEXT NOT NULL,
        outcome TEXT NOT NULL,
        evidence_status TEXT NOT NULL,
        execution_status TEXT NOT NULL,
        data_json TEXT NOT NULL
      );
    `);
  }

  save(session: DemoSession): void {
    const statement = this.db.prepare(`
      INSERT OR REPLACE INTO sessions (
        session_id,
        created_at,
        mode,
        ticker,
        outcome,
        evidence_status,
        execution_status,
        data_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    statement.run(
      session.sessionId,
      session.createdAt,
      session.mode,
      session.fixture.ticker,
      session.outcome,
      session.evidenceIntegrity.status,
      session.execution.status,
      JSON.stringify(session),
    );
  }

  list(): DemoSession[] {
    const rows = this.db
      .prepare(
        "SELECT data_json FROM sessions ORDER BY datetime(created_at) DESC",
      )
      .all() as Array<{ data_json: string }>;

    return rows.map((row) => JSON.parse(row.data_json) as DemoSession);
  }

  get(sessionId: string): DemoSession | null {
    const row = this.db
      .prepare("SELECT data_json FROM sessions WHERE session_id = ?")
      .get(sessionId) as { data_json: string } | undefined;

    return row ? (JSON.parse(row.data_json) as DemoSession) : null;
  }

  close(): void {
    this.db.close();
  }
}
