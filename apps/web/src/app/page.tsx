"use client";

import { useState, useRef, useEffect } from "react";
import type { Recommendation, Model } from "@ai-compass/core";
import { Header } from "@/components/header";
import { ComparisonTable } from "@/components/comparison-table";
import { RecommendationCard } from "@/components/recommendation-card";
import { SkeletonCard } from "@/components/skeleton-card";
import { ExampleResults } from "@/components/example-results";
import { ErrorBanner } from "@/components/error-banner";
import { getApiKey } from "@/lib/settings";
import { getCached, setCached } from "@/lib/cache";
import { getUsage, incrementUsage } from "@/lib/usage";

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Recommendation[]>([]);
  const [allModels, setAllModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [usageCount, setUsageCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setApiKeyState(getApiKey());
    setUsageCount(getUsage().count);
    setMounted(true);
  }, []);

  const isGuest = !apiKey;
  const quotaExhausted = isGuest && usageCount >= 5;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading || quotaExhausted) return;

    const cached = getCached(query);
    if (cached) {
      setResults(cached);
      setHasSearched(true);
      setError(null);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      // Load models for the comparison table join (both paths need this)
      const { default: models } = await import("@ai-compass/dataset");
      const typedModels = models as Model[];
      setAllModels(typedModels);

      if (apiKey) {
        const { recommend } = await import("@ai-compass/core");
        const recs = await recommend(query, typedModels, apiKey);
        setResults(recs);
        setCached(query, recs);
      } else {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/recommend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        if (res.status === 401) {
          setError(
            "API key required. Add your Anthropic API key in Settings for unlimited use.",
          );
          return;
        }
        if (res.status === 429) {
          setError("Too many requests. Try again in 2 minutes.");
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          setError(body.error ?? "Claude is temporarily unavailable. Please try again.");
          return;
        }

        const recs: Recommendation[] = await res.json();
        setResults(recs);
        setCached(query, recs);
        incrementUsage();
        setUsageCount((c) => c + 1);
      }

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      if (msg.includes("401") || msg.includes("authentication")) {
        setError("Your API key is invalid. Check it in Settings above.");
      } else if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) {
        setError("Claude took too long. Please try again.");
      } else if (msg.includes("429") || msg.includes("rate")) {
        setError("Too many requests. Try again in 2 minutes.");
      } else if (
        msg.includes("Failed to parse") ||
        msg.includes("Expected an array")
      ) {
        setError("Claude's response was incomplete. Please try again.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 flex flex-col items-center px-4 pt-16 pb-24">
        <div className="w-full max-w-[640px]">
          <h1 className="text-[32px] font-bold tracking-tight leading-tight mb-2">
            Find the right AI for your project
          </h1>
          <p className="text-muted text-base mb-6">
            Describe what you&apos;re building — get personalized
            recommendations in 30 seconds.
          </p>

          <form onSubmit={handleSubmit}>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., I want to build a chatbot that summarizes legal documents. Budget is $100/month."
              aria-label="Describe your use case for AI model recommendations"
              className="w-full h-[120px] bg-surface border border-border rounded-lg p-4 text-[15px] text-foreground placeholder:text-muted resize-none focus:outline-none focus:border-accent transition-colors"
            />

            {mounted && isGuest && (
              <p className="text-muted text-xs mt-2" aria-label={`${5 - usageCount} of 5 free recommendations remaining today`}>
                {quotaExhausted ? (
                  <span className="text-error">
                    You&apos;ve used 5 free recommendations today. Add your API
                    key in Settings for unlimited use. Resets tomorrow.
                  </span>
                ) : (
                  <span>
                    {5 - usageCount} of 5 free recommendations remaining today
                  </span>
                )}
              </p>
            )}

            <button
              type="submit"
              disabled={!query.trim() || loading || quotaExhausted}
              className="w-full mt-3 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-[15px] py-3 rounded-lg transition-colors"
            >
              {loading ? "Finding models..." : "Find my model"}
            </button>
          </form>

          {!hasSearched && <ExampleResults />}
        </div>

        {error && (
          <div className="w-full max-w-[960px] mt-8">
            <ErrorBanner
              message={error}
              onDismiss={() => setError(null)}
              onRetry={
                error.includes("incomplete") || error.includes("try again")
                  ? () => {
                      setError(null);
                      const form = document.querySelector("form");
                      form?.requestSubmit();
                    }
                  : undefined
              }
            />
          </div>
        )}

        {loading && (
          <div className="w-full max-w-[960px] mt-8 space-y-3">
            <p className="text-muted text-sm mb-4">Claude is thinking...</p>
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} delay={i * 150} />
            ))}
          </div>
        )}

        {!loading && results.length > 0 && (
          <div
            ref={resultsRef}
            className="w-full max-w-[960px] mt-8"
            aria-live="polite"
          >
            {/* Desktop: comparison table */}
            <div className="hidden sm:block">
              <ComparisonTable recommendations={results} models={allModels} />
            </div>
            {/* Mobile: stacked cards */}
            <div className="sm:hidden space-y-3">
              {results.map((rec, i) => (
                <RecommendationCard
                  key={rec.model_id}
                  recommendation={rec}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && !error && (
          <div className="w-full max-w-[960px] mt-8 text-center text-muted">
            <p>
              No recommendations found. Try describing your use case with more
              detail.
            </p>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-muted text-xs border-t border-border">
        Built by{" "}
        <a
          href="https://akshitkalra.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Akshit Kalra
        </a>
      </footer>
    </div>
  );
}
