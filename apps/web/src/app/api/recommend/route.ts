import { recommend, validateQuery } from "@ai-compass/core";
import models from "@ai-compass/dataset/models.json";
import type { Model } from "@ai-compass/core";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "API key required. Add your Anthropic API key in Settings." },
      { status: 401 },
    );
  }

  let body: { query?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query) {
    return Response.json(
      { error: "Query is required" },
      { status: 400 },
    );
  }

  try {
    const validation = await validateQuery(query, apiKey);
    if (!validation.valid) {
      return Response.json(
        {
          error:
            validation.message ??
            "Please describe an AI use case you want to build.",
        },
        { status: 422 },
      );
    }

    const recs = await recommend(query, models as Model[], apiKey);
    return Response.json(recs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("401") || msg.includes("authentication")) {
      return Response.json({ error: "Server API key is invalid" }, { status: 500 });
    }
    if (msg.includes("429") || msg.includes("rate")) {
      return Response.json({ error: "Rate limited" }, { status: 429 });
    }
    return Response.json({ error: msg }, { status: 500 });
  }
}
