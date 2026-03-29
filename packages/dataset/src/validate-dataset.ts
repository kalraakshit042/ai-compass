/**
 * Dataset Quality Monitoring — second-pass validation.
 *
 * The Zod schema (schema.ts) validates *shape*.
 * This module validates *values*: every model must have plausible pricing,
 * no duplicate IDs, and category-appropriate fields.
 *
 * Design decision: validation collects ALL issues rather than failing fast,
 * so the GitHub Actions summary shows every problem in one run.
 */

import {
  BaseModelSchema,
  CONTEXT_WINDOW_CEILING,
  CONTEXT_WINDOW_FLOOR,
  PRICE_CEILING,
  PRICE_FLOOR,
  TOKEN_PRICED_CATEGORIES,
  type ValidationResult,
  type ValidationWarning,
} from "./schema.js";

/**
 * Validate the full models array. Returns a result object with all warnings.
 * Does NOT throw — callers decide what to do with the result.
 */
export function validateDataset(models: unknown[]): ValidationResult {
  const warnings: ValidationWarning[] = [];

  // ── 1. Duplicate ID check ──────────────────────────────────────────────
  const seenIds = new Set<string>();
  for (const raw of models) {
    const id = (raw as Record<string, unknown>)?.id;
    if (typeof id === "string") {
      if (seenIds.has(id)) {
        warnings.push({
          modelId: id,
          field: "id",
          message: `Duplicate model id "${id}"`,
          severity: "error",
        });
      }
      seenIds.add(id);
    }
  }

  // ── 2. Per-model validation ────────────────────────────────────────────
  for (const raw of models) {
    const modelId =
      typeof (raw as Record<string, unknown>)?.id === "string"
        ? ((raw as Record<string, unknown>).id as string)
        : "<unknown>";

    // 2a. Schema validation (shape)
    const parsed = BaseModelSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        warnings.push({
          modelId,
          field: issue.path.join(".") || "(root)",
          message: issue.message,
          severity: "error",
        });
      }
      continue; // Can't run value checks on a model that fails shape validation
    }

    const model = parsed.data;

    // 2b. Token-priced models (text, code) must have positive pricing
    const isTokenPriced = (TOKEN_PRICED_CATEGORIES as readonly string[]).includes(
      model.category,
    );

    if (isTokenPriced) {
      if (model.input_cost_per_1m == null || model.input_cost_per_1m <= PRICE_FLOOR) {
        warnings.push({
          modelId,
          field: "input_cost_per_1m",
          message: `Token-priced model has input_cost_per_1m=${model.input_cost_per_1m ?? "undefined"} — expected > ${PRICE_FLOOR}`,
          severity: "error",
        });
      }
      if (model.output_cost_per_1m == null || model.output_cost_per_1m <= PRICE_FLOOR) {
        warnings.push({
          modelId,
          field: "output_cost_per_1m",
          message: `Token-priced model has output_cost_per_1m=${model.output_cost_per_1m ?? "undefined"} — expected > ${PRICE_FLOOR}`,
          severity: "error",
        });
      }
      if (model.context_window == null || model.context_window < CONTEXT_WINDOW_FLOOR) {
        warnings.push({
          modelId,
          field: "context_window",
          message: `Token-priced model has context_window=${model.context_window ?? "undefined"} — expected >= ${CONTEXT_WINDOW_FLOOR}`,
          severity: "error",
        });
      }
    }

    // 2c. Non-token-priced models must have cost_per_unit
    if (!isTokenPriced && !model.cost_per_unit) {
      warnings.push({
        modelId,
        field: "cost_per_unit",
        message: `Non-token-priced model (${model.category}) is missing cost_per_unit`,
        severity: "error",
      });
    }

    // 2d. Plausible ceiling checks (catches scraper field-mapping errors)
    if (model.input_cost_per_1m != null && model.input_cost_per_1m > PRICE_CEILING) {
      warnings.push({
        modelId,
        field: "input_cost_per_1m",
        message: `input_cost_per_1m=${model.input_cost_per_1m} exceeds ceiling of $${PRICE_CEILING}/1M — possible data corruption`,
        severity: "warning",
      });
    }
    if (model.output_cost_per_1m != null && model.output_cost_per_1m > PRICE_CEILING) {
      warnings.push({
        modelId,
        field: "output_cost_per_1m",
        message: `output_cost_per_1m=${model.output_cost_per_1m} exceeds ceiling of $${PRICE_CEILING}/1M — possible data corruption`,
        severity: "warning",
      });
    }
    if (
      model.context_window != null &&
      model.context_window > CONTEXT_WINDOW_CEILING
    ) {
      warnings.push({
        modelId,
        field: "context_window",
        message: `context_window=${model.context_window} exceeds ceiling of ${CONTEXT_WINDOW_CEILING} — possible data corruption`,
        severity: "warning",
      });
    }

    // 2e. Staleness check — flag models not updated in >180 days
    const lastUpdated = new Date(model.last_updated);
    const daysSinceUpdate = Math.floor(
      (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceUpdate > 180) {
      warnings.push({
        modelId,
        field: "last_updated",
        message: `Model data is ${daysSinceUpdate} days old (last_updated: ${model.last_updated}) — may be stale`,
        severity: "warning",
      });
    }
  }

  const hasErrors = warnings.some((w) => w.severity === "error");

  return {
    valid: !hasErrors,
    warnings,
    modelCount: models.length,
  };
}

/**
 * Format validation results for GitHub Actions job summary.
 * Uses GitHub-flavored markdown with collapsible sections.
 */
export function formatGitHubSummary(result: ValidationResult): string {
  const lines: string[] = [];
  const errors = result.warnings.filter((w) => w.severity === "error");
  const warns = result.warnings.filter((w) => w.severity === "warning");

  if (result.valid && warns.length === 0) {
    lines.push(`## ✅ Dataset Validation Passed`);
    lines.push(`${result.modelCount} models validated with no issues.`);
    return lines.join("\n");
  }

  if (!result.valid) {
    lines.push(`## ❌ Dataset Validation Failed`);
  } else {
    lines.push(`## ⚠️ Dataset Validation Passed with Warnings`);
  }

  lines.push(
    `${result.modelCount} models validated — **${errors.length} error(s)**, **${warns.length} warning(s)**`,
  );
  lines.push("");

  if (errors.length > 0) {
    lines.push(`### Errors`);
    lines.push("| Model | Field | Issue |");
    lines.push("|-------|-------|-------|");
    for (const e of errors) {
      lines.push(`| \`${e.modelId}\` | \`${e.field}\` | ${e.message} |`);
    }
    lines.push("");
  }

  if (warns.length > 0) {
    lines.push(`<details><summary>Warnings (${warns.length})</summary>`);
    lines.push("");
    lines.push("| Model | Field | Issue |");
    lines.push("|-------|-------|-------|");
    for (const w of warns) {
      lines.push(`| \`${w.modelId}\` | \`${w.field}\` | ${w.message} |`);
    }
    lines.push("");
    lines.push(`</details>`);
  }

  return lines.join("\n");
}
