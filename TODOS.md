# TODOS

## Dataset Quality Monitoring

**What:** Add schema validation and suspicious-value detection to `packages/dataset/refresh.ts`. After each GitHub Action refresh, validate that all models in `models.json` conform to the expected schema (no missing required fields) and that pricing values are non-zero and within a plausible range (e.g., no model costs $0/1M tokens, no model costs >$500/1M tokens).

**Why:** The current failure guard (>10% of models lose pricing data → abort) catches catastrophic failures. It doesn't catch silent corruption — a scraper returning `0` for a price, or a field mapping error populating `input_cost_per_1m` with benchmark data. Silent bad data is worse than a failed refresh because the recommendation engine will use it.

**Pros:**
- Catches subtle data corruption that the >10% guard misses
- Gives clear GitHub Actions error output when a specific model's data looks wrong
- Prevents Claude from generating misleading cost estimates based on bad data

**Cons:**
- Requires defining plausible price ranges (which may need updating as the market changes)
- Adds ~30 lines to `refresh.ts`

**Context:** The `refresh.ts` script merges live pricing data from provider docs and artificialanalysis.ai into `models.json`. The merge logic updates numeric fields only. A Zod schema already validates the overall structure (added in eng review). This TODO is about adding a second pass that validates the *values*, not just the *shape*: every model must have `input_cost_per_1m > 0`, `output_cost_per_1m > 0`, `context_window > 1000`. If validation fails for any model, write a warning to GitHub Actions summary (don't abort — just flag).

**Depends on / blocked by:** `packages/dataset/refresh.ts` must be implemented first (Step 3 in Next Steps).
