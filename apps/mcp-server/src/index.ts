#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { recommend } from "@ai-compass/core";
import type { Model } from "@ai-compass/core";
import bundledModels from "./models-snapshot.json" with { type: "json" };

const GITHUB_RAW_URL =
  "https://raw.githubusercontent.com/akshitkalra/ai-compass/main/packages/dataset/models.json";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cachedModels: { models: Model[]; fetchedAt: number } | null = null;

async function getModels(): Promise<{ models: Model[]; ageHours: number }> {
  if (cachedModels && Date.now() - cachedModels.fetchedAt < CACHE_TTL_MS) {
    const ageHours =
      Math.round(((Date.now() - cachedModels.fetchedAt) / 3600000) * 10) / 10;
    return { models: cachedModels.models, ageHours };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(GITHUB_RAW_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const models = (await res.json()) as Model[];
      cachedModels = { models, fetchedAt: Date.now() };
      return { models, ageHours: 0 };
    }
  } catch {
    // Silently fall back to bundled
  }

  return {
    models: bundledModels as Model[],
    ageHours: -1,
  };
}

const server = new McpServer({
  name: "ai-compass",
  version: "0.1.0",
});

server.tool(
  "recommend_models",
  {
    use_case: z
      .string()
      .describe(
        "Natural language description of what you want to build or do with an AI model",
      ),
  },
  async ({ use_case }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: ANTHROPIC_API_KEY environment variable is required.",
          },
        ],
      };
    }

    try {
      const { models, ageHours } = await getModels();
      const recs = await recommend(use_case, models, apiKey);

      const result = recs.map((r) => ({
        model_id: r.model_id,
        rank: r.rank,
        rank_label: r.rank_label,
        reasoning: r.reasoning,
        cost_estimate: r.estimated_cost_example,
        tradeoffs: r.tradeoffs,
        dataset_age_hours: ageHours,
      }));

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return {
        content: [{ type: "text" as const, text: `Error: ${msg}` }],
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
