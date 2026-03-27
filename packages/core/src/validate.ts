import Anthropic from "@anthropic-ai/sdk";

const VALIDATION_SYSTEM_PROMPT = `You are a strict classifier. Determine if the user input is a description of an AI use case — something a developer, PM, or founder wants to build or accomplish using AI.

Reply with JSON only. No prose. No markdown. No preamble.
- If valid use case: {"valid": true}
- If not: {"valid": false, "message": "One sentence, 20 words or fewer, telling the user what to type instead."}

Not valid: greetings, general questions about AI models, model comparisons, gibberish, requests for information.
Valid: describing something to build, a workflow to automate, a product feature, a task to accomplish with AI.`;

export async function validateQuery(
  query: string,
  apiKey: string,
): Promise<{ valid: boolean; message?: string }> {
  try {
    const client = new Anthropic({ apiKey }); // No dangerouslyAllowBrowser — server-side only
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 128, // 128 is safe headroom; Haiku is cheap enough
      system: VALIDATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: query }],
    });

    const block = response.content[0];
    if (block.type !== "text") return { valid: true }; // fail open

    // Strip any prose/markdown the model may have prepended before the JSON
    const jsonMatch = block.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { valid: true }; // fail open on non-JSON

    const parsed = JSON.parse(jsonMatch[0]) as {
      valid?: boolean;
      message?: string;
    };

    return {
      valid: parsed.valid ?? true,
      message: parsed.message ?? undefined,
    };
  } catch {
    return { valid: true }; // fail open on any Anthropic error
  }
}
