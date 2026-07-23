import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { SessionStore } from "../persistence/sessionStore";
import { resolveSessionScenario } from "../scenarios/runScenario";
import { runDebateSession } from "../session/runDebateSession";
import { telemetrySdk } from "../telemetry/tracing";

const port = Number(process.env.PORT ?? 8787);
const store = new SessionStore();

const server = createServer(async (request, response) => {
  try {
    await route(request, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    sendJson(response, 500, { error: message });
  }
});

server.listen(port, () => {
  console.log(`TraceRoom API listening on http://localhost:${port}`);
});

process.on("SIGINT", () => {
  shutdown();
});

process.on("SIGTERM", () => {
  shutdown();
});

async function shutdown(): Promise<void> {
  server.close();
  store.close();
  await telemetrySdk.shutdown();
  process.exit(0);
}

async function route(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  applyCors(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const requestUrl = new URL(
    request.url ?? "/",
    `http://${request.headers.host}`,
  );
  const pathname = requestUrl.pathname;

  if (request.method === "GET" && pathname === "/health") {
    sendJson(response, 200, {
      ok: true,
      service: "traceroom-api",
      version: "0.1.0",
    });
    return;
  }

  if (request.method === "POST" && pathname === "/sessions/run") {
    const scenario = resolveSessionScenario(
      requestUrl.searchParams.get("scenario") ??
        requestUrl.searchParams.get("mode"),
    );
    const session = await runDebateSession(scenario);
    store.save(session);
    console.log(
      `Session completed: scenario=${session.scenario} sessionId=${session.sessionId} traceId=${session.signoz.traceId} outcome=${session.outcome}`,
    );
    sendJson(response, 201, session);
    return;
  }

  if (request.method === "GET" && pathname === "/sessions") {
    sendJson(response, 200, store.list());
    return;
  }

  const sessionMatch = pathname.match(/^\/sessions\/([^/]+)$/);
  if (request.method === "GET" && sessionMatch) {
    const session = store.get(decodeURIComponent(sessionMatch[1]));
    if (!session) {
      sendJson(response, 404, { error: "Session not found" });
      return;
    }
    sendJson(response, 200, session);
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

function applyCors(response: ServerResponse): void {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body, null, 2));
}
