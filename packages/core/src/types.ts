export type ModelCategory =
  | "text"
  | "image"
  | "video"
  | "voice-tts"
  | "voice-stt"
  | "music"
  | "embedding"
  | "code"

export interface Model {
  id: string
  provider: string
  name: string
  category: ModelCategory
  input_cost_per_1m?: number
  output_cost_per_1m?: number
  cost_per_unit?: string
  context_window?: number
  output_tokens?: number
  strengths: string[]
  weaknesses: string[]
  tradeoff_summary: string
  benchmark_swebench?: number
  last_updated: string
}

export type CapabilityFit = "High" | "Medium" | "Low"

export interface Recommendation {
  model_id: string
  rank: number
  rank_label: string
  capability_fit: CapabilityFit
  reasoning: string
  estimated_cost_example: string
  tradeoffs: string
}
