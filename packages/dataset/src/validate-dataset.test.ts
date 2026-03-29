import { describe, it, expect } from "vitest";
import { validateDataset, formatGitHubSummary } from "./validate-dataset.js";

/** Helper: creates a minimal valid text model */
function makeTextModel(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-model",
    provider: "TestCorp",
    name: "Test Model",
    category: "text",
    input_cost_per_1m: 3,
    output_cost_per_1m: 15,
    context_window: 200000,
    output_tokens: 16000,
    strengths: ["Fast"],
    weaknesses: ["Expensive"],
    tradeoff_summary: "A solid all-rounder.",
    last_updated: "2025-12-01",
    ...overrides,
  };
}

/** Helper: creates a minimal valid image model */
function makeImageModel(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-image-model",
    provider: "ImageCorp",
    name: "Test Image Model",
    category: "image",
    cost_per_unit: "$0.04 per image",
    strengths: ["High quality"],
    weaknesses: ["Slow"],
    tradeoff_summary: "Best image quality.",
    last_updated: "2025-11-01",
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Happy path
// ─────────────────────────────────────────────────────────────────────────────

describe("validateDataset — happy path", () => {
  it("passes for a well-formed dataset", () => {
    const result = validateDataset([makeTextModel(), makeImageModel()]);
    expect(result.valid).toBe(true);
    expect(result.warnings.filter((w) => w.severity === "error")).toHaveLength(0);
    expect(result.modelCount).toBe(2);
  });

  it("returns correct model count", () => {
    const models = [
      makeTextModel({ id: "a" }),
      makeTextModel({ id: "b" }),
      makeTextModel({ id: "c" }),
    ];
    const result = validateDataset(models);
    expect(result.modelCount).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Schema shape validation
// ─────────────────────────────────────────────────────────────────────────────

describe("validateDataset — schema shape", () => {
  it("flags missing required fields", () => {
    const model = { id: "broken" }; // missing almost everything
    const result = validateDataset([model]);
    expect(result.valid).toBe(false);
    const errorFields = result.warnings.map((w) => w.field);
    expect(errorFields).toContain("provider");
    expect(errorFields).toContain("name");
    expect(errorFields).toContain("category");
  });

  it("flags empty strengths array", () => {
    const result = validateDataset([makeTextModel({ strengths: [] })]);
    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.field === "strengths")).toBe(true);
  });

  it("flags invalid category", () => {
    const result = validateDataset([makeTextModel({ category: "quantum" })]);
    expect(result.valid).toBe(false);
  });

  it("flags malformed last_updated date", () => {
    const result = validateDataset([makeTextModel({ last_updated: "Jan 2025" })]);
    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.field === "last_updated")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Duplicate ID detection
// ─────────────────────────────────────────────────────────────────────────────

describe("validateDataset — duplicate IDs", () => {
  it("flags duplicate model IDs", () => {
    const result = validateDataset([
      makeTextModel({ id: "dupe" }),
      makeTextModel({ id: "dupe" }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.field === "id" && w.message.includes("Duplicate"))).toBe(
      true,
    );
  });

  it("does not flag unique IDs", () => {
    const result = validateDataset([
      makeTextModel({ id: "a" }),
      makeTextModel({ id: "b" }),
    ]);
    expect(result.warnings.filter((w) => w.field === "id")).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Token-priced model checks (text, code)
// ─────────────────────────────────────────────────────────────────────────────

describe("validateDataset — token-priced models", () => {
  it("flags text model with input_cost_per_1m = 0", () => {
    const result = validateDataset([makeTextModel({ input_cost_per_1m: 0 })]);
    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.field === "input_cost_per_1m")).toBe(true);
  });

  it("flags text model with missing output_cost_per_1m", () => {
    const model = makeTextModel();
    delete (model as Record<string, unknown>).output_cost_per_1m;
    const result = validateDataset([model]);
    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.field === "output_cost_per_1m")).toBe(true);
  });

  it("flags code model with context_window below floor", () => {
    const result = validateDataset([
      makeTextModel({ id: "code-model", category: "code", context_window: 500 }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.field === "context_window")).toBe(true);
  });

  it("flags code model with missing context_window", () => {
    const model = makeTextModel({ id: "code-model", category: "code" });
    delete (model as Record<string, unknown>).context_window;
    const result = validateDataset([model]);
    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.field === "context_window")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Non-token-priced model checks
// ─────────────────────────────────────────────────────────────────────────────

describe("validateDataset — non-token-priced models", () => {
  it("flags image model missing cost_per_unit", () => {
    const model = makeImageModel();
    delete (model as Record<string, unknown>).cost_per_unit;
    const result = validateDataset([model]);
    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.field === "cost_per_unit")).toBe(true);
  });

  it("passes image model with cost_per_unit", () => {
    const result = validateDataset([makeImageModel()]);
    expect(result.valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Plausible ceiling checks (warnings, not errors)
// ─────────────────────────────────────────────────────────────────────────────

describe("validateDataset — plausible range ceilings", () => {
  it("warns when input_cost exceeds $500/1M", () => {
    const result = validateDataset([makeTextModel({ input_cost_per_1m: 999 })]);
    // Should still be valid (warning, not error) but have a warning
    expect(result.valid).toBe(true);
    const ceilingWarns = result.warnings.filter(
      (w) => w.severity === "warning" && w.field === "input_cost_per_1m",
    );
    expect(ceilingWarns.length).toBe(1);
  });

  it("warns when output_cost exceeds $500/1M", () => {
    const result = validateDataset([makeTextModel({ output_cost_per_1m: 600 })]);
    expect(result.warnings.some((w) => w.severity === "warning" && w.field === "output_cost_per_1m")).toBe(true);
  });

  it("warns when context_window exceeds 10M", () => {
    const result = validateDataset([makeTextModel({ context_window: 20_000_000 })]);
    expect(result.warnings.some((w) => w.severity === "warning" && w.field === "context_window")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Staleness detection
// ─────────────────────────────────────────────────────────────────────────────

describe("validateDataset — staleness", () => {
  it("warns on model data older than 180 days", () => {
    const result = validateDataset([makeTextModel({ last_updated: "2024-01-01" })]);
    expect(result.warnings.some((w) => w.field === "last_updated" && w.message.includes("stale"))).toBe(true);
  });

  it("does not warn on recent data", () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 30);
    const dateStr = recent.toISOString().split("T")[0];
    const result = validateDataset([makeTextModel({ last_updated: dateStr })]);
    expect(result.warnings.filter((w) => w.field === "last_updated")).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GitHub summary formatting
// ─────────────────────────────────────────────────────────────────────────────

describe("formatGitHubSummary", () => {
  it("shows passing summary for clean dataset", () => {
    const result = validateDataset([makeTextModel(), makeImageModel()]);
    const summary = formatGitHubSummary(result);
    expect(summary).toContain("✅");
    expect(summary).toContain("2 models validated");
  });

  it("shows error table for invalid dataset", () => {
    const result = validateDataset([makeTextModel({ input_cost_per_1m: 0 })]);
    const summary = formatGitHubSummary(result);
    expect(summary).toContain("❌");
    expect(summary).toContain("input_cost_per_1m");
  });

  it("shows warning section for ceiling violations", () => {
    const result = validateDataset([makeTextModel({ input_cost_per_1m: 999 })]);
    const summary = formatGitHubSummary(result);
    expect(summary).toContain("⚠️");
    expect(summary).toContain("Warnings");
  });
});
