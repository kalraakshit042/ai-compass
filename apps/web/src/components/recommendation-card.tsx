"use client";

import { useState } from "react";
import type { Recommendation } from "@ai-compass/core";

export function RecommendationCard({
  recommendation: rec,
  index,
}: {
  recommendation: Recommendation;
  index: number;
}) {
  const [copied, setCopied] = useState(false);

  async function copyModelId() {
    await navigator.clipboard.writeText(rec.model_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="bg-surface border border-border rounded-lg p-5 transition-opacity duration-200"
      style={{
        animation: `fadeIn 200ms ease-out ${index * 50}ms both`,
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Primary: Rank + Name */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-accent text-xs font-medium">
            #{rec.rank}: {rec.rank_label}
          </span>
          <h3 className="text-lg font-semibold mt-0.5">{rec.model_id}</h3>
        </div>
        <span className="text-accent bg-accent/10 text-[13px] font-medium px-2.5 py-1 rounded-md whitespace-nowrap">
          {rec.estimated_cost_example}
        </span>
      </div>

      {/* Secondary: Reasoning */}
      <p className="text-[15px] leading-relaxed text-[#d4d4d4] mb-3">
        {rec.reasoning}
      </p>

      {/* Tertiary: Tradeoffs */}
      <p className="text-muted text-[13px] mb-4">{rec.tradeoffs}</p>

      {/* Action: Copy */}
      <div className="flex items-center justify-end">
        <button
          onClick={copyModelId}
          className="text-muted hover:text-foreground text-xs border border-border rounded-md px-3 py-1.5 hover:bg-background transition-colors"
          aria-label={`Copy ${rec.model_id} to clipboard`}
        >
          {copied ? "Copied!" : `Copy: ${rec.model_id}`}
        </button>
      </div>
    </div>
  );
}
