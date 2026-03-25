"use client";

import { useState } from "react";
import type { Recommendation, Model } from "@ai-compass/core";

interface EnrichedRecommendation extends Recommendation {
  model?: Model;
}

function formatCost(model?: Model): string {
  if (!model) return "—";
  if (model.input_cost_per_1m != null) return `$${model.input_cost_per_1m}/1M`;
  if (model.cost_per_unit) return model.cost_per_unit;
  return "N/A";
}

function formatContext(model?: Model): string {
  if (!model?.context_window) return "—";
  if (model.context_window >= 1_000_000) return `${(model.context_window / 1_000_000).toFixed(0)}M`;
  if (model.context_window >= 1_000) return `${(model.context_window / 1_000).toFixed(0)}K`;
  return String(model.context_window);
}

const fitColors = {
  High: "bg-[rgba(34,197,94,0.1)] text-[#22c55e]",
  Medium: "bg-[rgba(234,179,8,0.1)] text-[#eab308]",
  Low: "bg-[rgba(239,68,68,0.1)] text-[#ef4444]",
};

function ExpandedRow({ rec }: { rec: EnrichedRecommendation }) {
  const [copied, setCopied] = useState(false);

  async function copyModelId() {
    await navigator.clipboard.writeText(rec.model_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <tr>
      <td colSpan={7} className="p-0">
        <div className="bg-surface border-t border-border p-4 space-y-2">
          <div>
            <span className="text-muted text-xs font-medium uppercase tracking-wider">Why this model</span>
            <p className="text-[15px] leading-relaxed text-[#d4d4d4] mt-1">{rec.reasoning}</p>
          </div>
          <div>
            <span className="text-muted text-xs font-medium uppercase tracking-wider">Tradeoffs</span>
            <p className="text-[13px] text-muted mt-1">{rec.tradeoffs}</p>
          </div>
          <div>
            <span className="text-muted text-xs font-medium uppercase tracking-wider">Est. cost for your use case</span>
            <p className="text-[13px] text-accent mt-1">{rec.estimated_cost_example}</p>
          </div>
          <div className="flex justify-end pt-1">
            <button
              onClick={copyModelId}
              className="text-muted hover:text-foreground text-xs border border-border rounded-md px-3 py-1.5 hover:bg-background transition-colors"
              aria-label={`Copy ${rec.model_id} to clipboard`}
            >
              {copied ? "Copied!" : `Copy: ${rec.model_id}`}
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

export function ComparisonTable({
  recommendations,
  models,
}: {
  recommendations: Recommendation[];
  models: Model[];
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const enriched: EnrichedRecommendation[] = recommendations.map((rec) => ({
    ...rec,
    model: models.find((m) => m.id === rec.model_id),
  }));

  function toggleRow(rank: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rank)) next.delete(rank);
      else next.add(rank);
      return next;
    });
  }

  return (
    <div className="w-full max-w-[960px] mx-auto overflow-x-auto">
      <table className="w-full border-collapse" role="table">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-muted text-xs font-medium uppercase tracking-wider py-3 px-4">Rank</th>
            <th className="text-left text-muted text-xs font-medium uppercase tracking-wider py-3 px-4">Model</th>
            <th className="text-left text-muted text-xs font-medium uppercase tracking-wider py-3 px-4">Provider</th>
            <th className="text-left text-muted text-xs font-medium uppercase tracking-wider py-3 px-4">Cost</th>
            <th className="text-left text-muted text-xs font-medium uppercase tracking-wider py-3 px-4">
              <span title="How well this model matches your specific use case">Fit</span>
            </th>
            <th className="text-left text-muted text-xs font-medium uppercase tracking-wider py-3 px-4 hidden lg:table-cell">Context</th>
            <th className="w-10 py-3 px-4"><span className="sr-only">Expand</span></th>
          </tr>
        </thead>
        {enriched.map((rec) => {
            const isExpanded = expanded.has(rec.rank);
            return (
              <tbody key={rec.model_id}>
                <tr
                  role="row"
                  className="border-b border-border hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                  onClick={() => toggleRow(rec.rank)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleRow(rec.rank);
                    }
                  }}
                  tabIndex={0}
                  aria-expanded={isExpanded}
                >
                  <td className="py-3 px-4">
                    <span className="text-accent text-[13px] font-medium whitespace-nowrap">
                      #{rec.rank}: {rec.rank_label}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[15px] font-semibold">
                      {rec.model?.name ?? rec.model_id}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-muted text-[13px] bg-border/50 px-2 py-0.5 rounded">
                      {rec.model?.provider ?? "—"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[13px] font-medium text-accent">
                      {formatCost(rec.model)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[12px] font-medium px-2 py-0.5 rounded ${fitColors[rec.capability_fit]}`}
                      aria-label={`Capability fit: ${rec.capability_fit}`}
                    >
                      {rec.capability_fit}
                    </span>
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    <span className="text-muted text-[13px]">
                      {formatContext(rec.model)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted">
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </td>
                </tr>
                {isExpanded && <ExpandedRow rec={rec} />}
              </tbody>
            );
          })}
      </table>
    </div>
  );
}
