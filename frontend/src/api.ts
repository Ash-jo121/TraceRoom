import type {
  RecordedSession,
  SessionScenario,
  TelemetryQuestionAnswer,
} from "./types";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function loadSessions(): Promise<RecordedSession[]> {
  return requestJson<RecordedSession[]>(`${apiBaseUrl}/sessions`);
}

export async function runSession(
  scenario: SessionScenario,
): Promise<RecordedSession> {
  return requestJson<RecordedSession>(
    `${apiBaseUrl}/sessions/run?scenario=${scenario}`,
    { method: "POST" },
  );
}

export async function askAuditor(
  sessionId: string,
  question: string,
): Promise<TelemetryQuestionAnswer> {
  return requestJson<TelemetryQuestionAnswer>(
    `${apiBaseUrl}/sessions/${encodeURIComponent(sessionId)}/auditor/search`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    },
  );
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new Error("TraceRoom API is offline. Start it with npm run dev.");
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? `Request failed (${response.status}).`);
  }
  return (await response.json()) as T;
}

