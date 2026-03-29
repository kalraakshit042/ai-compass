import { z } from "zod";

// ── Categories ──────────────────────────────────────────────────────────────
export const MODEL_CATEGORIES = [
  "text",
  "image",
  "video",
  "voice-tts",
  "voice-stt",
  "music",
  "embedding",
  "code",
] as const;

/** Categories where token-based pricing (input/output per 1M) is expected */
export const TOKEN_PRICED_CATEGORIES = ["text", "code"] as const;

// ── Plausible-range constants ───────────────────────────────────────────────
// These may need updating as the market evolves. Keep them generous enough to
// avoid false positives but tight enough to catch scraper errors.
export const PRICE_FLOOR = 0; // $0/1M is suspicious for token-priced models
export const PRICE_CEILING = 500; // No model should exceed $500/1M tokens
export const CONTEXT_WINDOW_FLOOR = 1_000; // Minimum plausible context window
export const CONTEXT_WINDOW_CEILING = 10_000_000; // 10M tokens — generous ceiling

// ── Zod schemas ─────────────────────────────────────────────────────────────

/** Base schema: fields required on every model regardless of category */
export const BaseModelSchema = z.object({
  id: z.string().min(1, "id must be a non-empty string"),
  provider: z.string().min(1, "provider must be a non-empty string"),
  name: z.string().min(1, "name must be a non-empty string"),
  category: z.enum(MODEL_CATEGORIES),
  strengths: z.array(z.string()).min(1, "strengths must have at least one entry"),
  weaknesses: z.array(z.string()).min(1, "weaknesses must have at least one entry"),
  tradeoff_summary: z.string().min(1, "tradeoff_summary must be non-empty"),
  last_updated: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "last_updated must be YYYY-MM-DD"),

  // Optional fields present on some models
  input_cost_per_1m: z.number().optional(),
  output_cost_per_1m: z.number().optional(),
  cost_per_unit: z.string().optional(),
  context_window: z.number().optional(),
  output_tokens: z.number().optional(),
  benchmark_swebench: z.number().optional(),
});

export type ValidatedModel = z.infer<typeof BaseModelSchema>;

// ── Validation result types ─────────────────────────────────────────────────

export interface ValidationWarning {
  modelId: string;
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  warnings: ValidationWarning[];
  modelCount: number;
}
