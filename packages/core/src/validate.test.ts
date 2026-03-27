import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateQuery } from "./validate.js";
import Anthropic from "@anthropic-ai/sdk";

vi.mock("@anthropic-ai/sdk");

function mockHaikuResponse(text: string) {
  const MockAnthropic = vi.mocked(Anthropic);
  MockAnthropic.mockImplementation(
    () =>
      ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text }],
          }),
        },
      }) as unknown as Anthropic,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("validateQuery", () => {
  it("returns valid for a real use case", async () => {
    mockHaikuResponse('{"valid": true}');
    const result = await validateQuery(
      "I want to build a chatbot that summarizes legal documents",
      "test-key",
    );
    expect(result.valid).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it("returns invalid with message for a greeting", async () => {
    mockHaikuResponse(
      '{"valid": false, "message": "Describe what you want to build with AI."}',
    );
    const result = await validateQuery("How are you doing", "test-key");
    expect(result.valid).toBe(false);
    expect(result.message).toBe("Describe what you want to build with AI.");
  });

  it("returns invalid for a general AI question", async () => {
    mockHaikuResponse(
      '{"valid": false, "message": "Describe a specific use case or project, not a general question."}',
    );
    const result = await validateQuery("Tell me about GPT-4", "test-key");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("use case");
  });

  it("returns invalid for gibberish", async () => {
    mockHaikuResponse('{"valid": false, "message": "Please describe a real use case."}');
    const result = await validateQuery("asdfqwer", "test-key");
    expect(result.valid).toBe(false);
  });

  it("fails open when valid is false but message is absent", async () => {
    mockHaikuResponse('{"valid": false}');
    const result = await validateQuery("some input", "test-key");
    expect(result.valid).toBe(false);
    expect(result.message).toBeUndefined(); // callers handle undefined with fallback
  });

  it("fails open when Haiku throws an error", async () => {
    const MockAnthropic = vi.mocked(Anthropic);
    MockAnthropic.mockImplementation(
      () =>
        ({
          messages: {
            create: vi.fn().mockRejectedValue(new Error("network error")),
          },
        }) as unknown as Anthropic,
    );
    const result = await validateQuery("How are you doing", "test-key");
    expect(result.valid).toBe(true); // fail open
  });

  it("fails open when Haiku returns non-JSON text", async () => {
    mockHaikuResponse("Sorry, I cannot process this request.");
    const result = await validateQuery("some input", "test-key");
    expect(result.valid).toBe(true); // fail open
  });

  it("fails open when Haiku returns prose-wrapped JSON that is malformed", async () => {
    mockHaikuResponse("Here is my answer: {invalid json}");
    const result = await validateQuery("some input", "test-key");
    expect(result.valid).toBe(true); // fail open
  });
});
