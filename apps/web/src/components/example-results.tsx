"use client";

import { useState } from "react";

const EXAMPLE_QUERY =
  "I need to generate product photos for my online store — realistic images of furniture in different room settings, about 500 images per month.";

const EXAMPLE_RESULTS = [
  {
    rank: 1,
    rank_label: "Cheapest Option",
    model_id: "stable-diffusion-3",
    reasoning:
      "Open-source image model you can run yourself — no per-image cost after setup. Produces high-quality realistic images. Community fine-tunes available for product photography. At 500 images/month, self-hosting pays for itself quickly.",
    estimated_cost_example: "Free (self-hosted) or ~$0.02/image via API",
    tradeoffs:
      "Requires technical setup for self-hosting. API option exists but less polished than DALL-E.",
  },
  {
    rank: 2,
    rank_label: "Best Quality for Product Photos",
    model_id: "dall-e-3",
    reasoning:
      "Excellent at photorealistic product scenes with precise control over composition. Strong understanding of spatial layout — great for placing furniture in room settings. At $0.04 per image, 500 images/month = ~$20.",
    estimated_cost_example: "~$20/month for 500 images",
    tradeoffs:
      "More expensive than open-source alternatives, but consistently high quality with less prompt engineering.",
  },
  {
    rank: 3,
    rank_label: "Most Photorealistic",
    model_id: "flux-1.1-pro",
    reasoning:
      "State-of-the-art photorealism — often indistinguishable from real photography. Excellent at lighting, textures, and spatial composition. Ideal for e-commerce where realism matters most.",
    estimated_cost_example: "~$0.04/image via API",
    tradeoffs:
      "Newer model with a smaller community. Less prompt documentation available compared to DALL-E or Stable Diffusion.",
  },
];

export function ExampleResults() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-muted hover:text-foreground text-sm transition-colors flex items-center gap-1.5"
      >
        <span className="text-xs">{expanded ? "▾" : "▸"}</span>
        See an example
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          <p className="text-muted text-xs">
            Query: &ldquo;{EXAMPLE_QUERY}&rdquo;
          </p>
          {EXAMPLE_RESULTS.map((rec) => (
            <div
              key={rec.model_id}
              className="bg-surface border border-border rounded-lg p-4 opacity-75"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span className="text-accent text-xs font-medium">
                    #{rec.rank}: {rec.rank_label}
                  </span>
                  <h3 className="text-sm font-semibold mt-0.5">
                    {rec.model_id}
                  </h3>
                </div>
                <span className="text-accent bg-accent/10 text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap">
                  {rec.estimated_cost_example}
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-[#d4d4d4] mb-2">
                {rec.reasoning}
              </p>
              <p className="text-muted text-xs">{rec.tradeoffs}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
