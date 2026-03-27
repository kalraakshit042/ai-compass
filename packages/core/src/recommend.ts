import Anthropic from "@anthropic-ai/sdk";
import type { CapabilityFit, Model, Recommendation } from "./types.js";

const SYSTEM_PROMPT = `You are an AI model recommendation expert. Below is a dataset of available AI models in JSON format. Given the user's use case, recommend the top 3-4 models ranked by fit.

Ranking criteria (in priority order):
1. Capability fit — does the model's strengths match the use case?
2. Cost-to-capability ratio — cheapest model that meets the capability bar
3. Context window fit — does it fit the user's data volume?
4. Benchmark scores — tie-breaker for similar models

IMPORTANT: Base your recommendations ONLY on the dataset provided above. Do not use your training knowledge about these models. Do not favor any provider. Use only the fields in the dataset.

COST MATH: The dataset fields "input_cost_per_1m" and "output_cost_per_1m" are in USD per 1 MILLION TOKENS. 1,000 words ≈ 1,333 tokens. To estimate cost for N words: (N × 1.333 / 1,000,000) × cost_per_1m. Example: 10,000 words at $3.00/1M tokens = (10,000 × 1.333 / 1,000,000) × $3.00 = $0.04. For non-token models, use the "cost_per_unit" field directly. Show costs in the estimated_cost_example field — use concrete examples relevant to the user's use case.

Return ONLY a valid JSON array. No markdown. No preamble. No code fences. Raw JSON only.

Schema: [{"model_id": string, "rank": number, "rank_label": string, "capability_fit": "High" | "Medium" | "Low", "reasoning": string, "estimated_cost_example": string, "tradeoffs": string}]

rank_label should be a short, context-specific label like "Best Balance of Cost & Capability" or "Most Capable" or "Budget-Friendly Option".
capability_fit rates how well this specific model matches the user's use case: "High" = excellent fit, "Medium" = adequate, "Low" = usable but not ideal.

Avoid jargon: say "how much text it can read at once" not "context window", "open source (you can run it yourself)" not just "open source", "makes things up sometimes" not "hallucinations".`;

export async function callClaude(
  userQuery: string,
  models: Model[],
  apiKey?: string,
): Promise<string> {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const dataset = JSON.stringify(models, null, 2);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    temperature: 0.3,
    system: `${SYSTEM_PROMPT}\n\nDataset:\n${dataset}`,
    messages: [{ role: "user", content: userQuery }],
  });

  const block = response.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }
  return block.text;
}

export function parseRecommendations(raw: string): Recommendation[] {
  let cleaned = raw;

  // Strip markdown code fences
  const fenceMatch = cleaned.match(/```(?:json)?\n?([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1];
  }

  // Extract first JSON array if prose is present
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    cleaned = arrayMatch[0];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Failed to parse recommendations: ${cleaned.slice(0, 200)}`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Expected an array of recommendations");
  }

  // Normalize capability_fit — Claude may vary casing or omit
  return (parsed as Record<string, unknown>[]).map((rec) => {
    const fit = String(rec.capability_fit || "Medium").toLowerCase();
    let capability_fit: CapabilityFit = "Medium";
    if (fit === "high") capability_fit = "High";
    else if (fit === "low") capability_fit = "Low";
    return { ...rec, capability_fit } as Recommendation;
  });
}

export async function recommend(
  userQuery: string,
  models: Model[],
  apiKey?: string,
): Promise<Recommendation[]> {
  if (!userQuery.trim()) throw new Error("Query cannot be empty");
  if (!models.length) throw new Error("Models array cannot be empty");

  const raw = await callClaude(userQuery, models, apiKey);
  return parseRecommendations(raw);
}
