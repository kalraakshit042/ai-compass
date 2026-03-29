#!/usr/bin/env tsx
/**
 * Dataset refresh + quality validation.
 *
 * Called by: pnpm --filter @ai-compass/dataset run refresh
 * Called from: .github/workflows/refresh-dataset.yml (daily at 6 AM UTC)
 *
 * Current behavior:
 *   1. Load models.json
 *   2. Run schema + value validation (the ROADMAP item)
 *   3. Write results to GitHub Actions job summary (if running in CI)
 *   4. Print results to stdout (always)
 *
 * Future: Step 1 will be replaced with live pricing fetches from provider
 * APIs / artificialanalysis.ai, merging updated values into models.json.
 * The validation pass (steps 2-4) will run on the merged result.
 */

import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateDataset, formatGitHubSummary } from "./src/validate-dataset.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS_PATH = resolve(__dirname, "models.json");

// ── Load dataset ────────────────────────────────────────────────────────────
console.log(`Loading models from ${MODELS_PATH}…`);

let models: unknown[];
try {
  const raw = readFileSync(MODELS_PATH, "utf-8");
  models = JSON.parse(raw) as unknown[];
} catch (err) {
  console.error(`❌ Failed to read/parse models.json: ${err}`);
  process.exit(1);
}

if (!Array.isArray(models)) {
  console.error("❌ models.json root is not an array");
  process.exit(1);
}

console.log(`Loaded ${models.length} models.`);

// ── Validate ────────────────────────────────────────────────────────────────
const result = validateDataset(models);

const errors = result.warnings.filter((w) => w.severity === "error");
const warns = result.warnings.filter((w) => w.severity === "warning");

// ── Console output (always) ─────────────────────────────────────────────────
if (result.valid && warns.length === 0) {
  console.log(`\n✅ All ${result.modelCount} models passed validation.\n`);
} else {
  if (errors.length > 0) {
    console.error(`\n❌ ${errors.length} validation error(s):\n`);
    for (const e of errors) {
      console.error(`  [${e.modelId}] ${e.field}: ${e.message}`);
    }
  }
  if (warns.length > 0) {
    console.warn(`\n⚠️  ${warns.length} validation warning(s):\n`);
    for (const w of warns) {
      console.warn(`  [${w.modelId}] ${w.field}: ${w.message}`);
    }
  }
  console.log();
}

// ── GitHub Actions job summary (CI only) ────────────────────────────────────
const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  const markdown = formatGitHubSummary(result);
  appendFileSync(summaryPath, markdown + "\n");
  console.log("Wrote validation summary to GitHub Actions job summary.");
}

// ── Exit code ───────────────────────────────────────────────────────────────
// Per ROADMAP: don't abort on validation failures — just flag them.
// The >10% catastrophic guard (future) would be the one to abort.
// We exit 0 even with warnings/errors so the Action continues to commit.
// If you want CI to fail on errors, change this to: process.exit(errors.length > 0 ? 1 : 0)
process.exit(0);
