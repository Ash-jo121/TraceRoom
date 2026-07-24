import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod.mjs";
import { z } from "zod";
import { withSpan } from "../telemetry/withSpan";
import type {
  SnapshotExchange,
  SnapshotResearch,
  SnapshotSource,
} from "./snapshotTypes";

const ResearchSchema = z.object({
  summary: z.string().max(600),
  catalysts: z.array(z.string().max(240)).max(3),
  risks: z.array(z.string().max(240)).max(3),
});

export interface SnapshotResearchResult {
  research: SnapshotResearch;
  sources: SnapshotSource[];
}

export async function researchSnapshotContext(
  symbol: string,
  exchange: SnapshotExchange,
): Promise<SnapshotResearchResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_SEARCH_MODEL?.trim() || "gpt-5.4-nano";

  if (!apiKey) {
    return unavailableResearch(
      "OPENAI_API_KEY is not configured. Numeric market validation can continue.",
    );
  }

  return withSpan("openai.web_search", async (span) => {
    span.setAttributes({
      "gen_ai.provider.name": "openai",
      "gen_ai.request.model": model,
      "market.symbol": symbol,
      "market.exchange": exchange,
      "snapshot.research.numeric_authority": false,
    });

    try {
      const client = new OpenAI({ apiKey });
      const response = await client.responses.parse({
        model,
        store: false,
        tools: [{ type: "web_search", search_context_size: "medium" }],
        include: ["web_search_call.action.sources"],
        instructions:
          "You research public company context for an audit record. Return concise, source-grounded context only. Never claim that your response is an authoritative quote or use it to override supplied market data.",
        input: `Research recent, decision-relevant public context for ${symbol} on ${exchange}. Summarize the company context, up to three catalysts, and up to three risks. Prefer recent primary or high-quality financial sources.`,
        text: {
          format: zodTextFormat(ResearchSchema, "snapshot_research"),
        },
      });

      const parsed = response.output_parsed;
      if (!parsed) {
        return unavailableResearch(
          "OpenAI web search returned no structured research.",
        );
      }

      const sources = collectWebSources(response.output);
      span.setAttributes({
        "gen_ai.response.id": response.id,
        "gen_ai.response.model": response.model,
        "gen_ai.usage.input_tokens": response.usage?.input_tokens ?? 0,
        "gen_ai.usage.output_tokens": response.usage?.output_tokens ?? 0,
        "snapshot.research.source_count": sources.length,
      });

      return {
        research: {
          status: "READY",
          summary: parsed.summary,
          catalysts: parsed.catalysts,
          risks: parsed.risks,
          responseId: response.id,
          model: response.model,
          note:
            "Context is web-sourced and non-authoritative. Numeric fields come only from the market-data provider.",
        },
        sources,
      };
    } catch (error) {
      span.setAttribute(
        "snapshot.research.error",
        error instanceof Error ? error.name : "UnknownError",
      );
      return unavailableResearch(
        "OpenAI web research was unavailable. Numeric market validation can continue.",
      );
    }
  });
}

function collectWebSources(output: readonly unknown[]): SnapshotSource[] {
  const found = new Map<string, { title: string; url: string }>();

  for (const item of output) {
    const record = asRecord(item);
    if (record.type === "message" && Array.isArray(record.content)) {
      for (const content of record.content) {
        const contentRecord = asRecord(content);
        if (!Array.isArray(contentRecord.annotations)) continue;
        for (const annotation of contentRecord.annotations) {
          const citation = asRecord(annotation);
          if (
            citation.type === "url_citation" &&
            typeof citation.url === "string"
          ) {
            found.set(citation.url, {
              url: citation.url,
              title:
                typeof citation.title === "string"
                  ? citation.title
                  : citation.url,
            });
          }
        }
      }
    }

    if (record.type === "web_search_call") {
      const action = asRecord(record.action);
      if (Array.isArray(action.sources)) {
        for (const source of action.sources) {
          const sourceRecord = asRecord(source);
          if (typeof sourceRecord.url === "string") {
            found.set(sourceRecord.url, {
              url: sourceRecord.url,
              title: sourceRecord.url,
            });
          }
        }
      }
    }
  }

  return [...found.values()].slice(0, 8).map((source, index) => ({
    id: `web-${index + 1}`,
    kind: "WEB",
    provider: "OpenAI Web Search",
    title: source.title,
    url: source.url,
    observedAt: null,
    fields: ["research.summary", "research.catalysts", "research.risks"],
  }));
}

function unavailableResearch(note: string): SnapshotResearchResult {
  return {
    research: {
      status: "UNAVAILABLE",
      summary: "",
      catalysts: [],
      risks: [],
      responseId: null,
      model: null,
      note,
    },
    sources: [],
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}
