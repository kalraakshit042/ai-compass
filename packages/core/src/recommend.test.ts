import { describe, it, expect } from "vitest";
import { parseRecommendations } from "./recommend.js";

describe("parseRecommendations", () => {
  it("parses clean JSON array", () => {
    const raw = `[{"model_id":"claude-sonnet-4-6","rank":1,"rank_label":"Best Match","reasoning":"Great fit","estimated_cost_example":"~$0.30","tradeoffs":"None"}]`;
    const result = parseRecommendations(raw);
    expect(result).toHaveLength(1);
    expect(result[0].model_id).toBe("claude-sonnet-4-6");
    expect(result[0].rank_label).toBe("Best Match");
  });

  it("strips markdown code fences", () => {
    const raw = '```json\n[{"model_id":"gpt-4o","rank":1,"rank_label":"Top Pick","reasoning":"Good","estimated_cost_example":"$1","tradeoffs":"Cost"}]\n```';
    const result = parseRecommendations(raw);
    expect(result).toHaveLength(1);
    expect(result[0].model_id).toBe("gpt-4o");
  });

  it("strips code fences without json language tag", () => {
    const raw = '```\n[{"model_id":"test","rank":1,"rank_label":"A","reasoning":"B","estimated_cost_example":"C","tradeoffs":"D"}]\n```';
    const result = parseRecommendations(raw);
    expect(result).toHaveLength(1);
  });

  it("extracts JSON array from surrounding prose", () => {
    const raw = 'Here are my recommendations:\n[{"model_id":"test","rank":1,"rank_label":"A","reasoning":"B","estimated_cost_example":"C","tradeoffs":"D"}]\nHope this helps!';
    const result = parseRecommendations(raw);
    expect(result).toHaveLength(1);
  });

  it("handles multiple recommendations", () => {
    const raw = JSON.stringify([
      { model_id: "a", rank: 1, rank_label: "Best", reasoning: "r", estimated_cost_example: "c", tradeoffs: "t" },
      { model_id: "b", rank: 2, rank_label: "Runner-up", reasoning: "r", estimated_cost_example: "c", tradeoffs: "t" },
      { model_id: "c", rank: 3, rank_label: "Budget", reasoning: "r", estimated_cost_example: "c", tradeoffs: "t" },
    ]);
    const result = parseRecommendations(raw);
    expect(result).toHaveLength(3);
    expect(result[0].rank).toBe(1);
    expect(result[2].rank).toBe(3);
  });

  it("throws on non-JSON input", () => {
    expect(() => parseRecommendations("I cannot help with that")).toThrow(
      "Failed to parse recommendations",
    );
  });

  it("throws on non-array JSON", () => {
    expect(() => parseRecommendations('{"model_id":"test"}')).toThrow(
      "Expected an array",
    );
  });

  it("throws on empty string", () => {
    expect(() => parseRecommendations("")).toThrow();
  });

  it("normalizes capability_fit casing", () => {
    const raw = JSON.stringify([
      { model_id: "a", rank: 1, rank_label: "Best", capability_fit: "high", reasoning: "r", estimated_cost_example: "c", tradeoffs: "t" },
      { model_id: "b", rank: 2, rank_label: "OK", capability_fit: "LOW", reasoning: "r", estimated_cost_example: "c", tradeoffs: "t" },
    ]);
    const result = parseRecommendations(raw);
    expect(result[0].capability_fit).toBe("High");
    expect(result[1].capability_fit).toBe("Low");
  });

  it("defaults capability_fit to Medium when missing", () => {
    const raw = `[{"model_id":"test","rank":1,"rank_label":"A","reasoning":"B","estimated_cost_example":"C","tradeoffs":"D"}]`;
    const result = parseRecommendations(raw);
    expect(result[0].capability_fit).toBe("Medium");
  });
});
