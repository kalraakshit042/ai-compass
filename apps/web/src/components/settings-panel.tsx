"use client";

import { useState, useEffect } from "react";
import { getApiKey, setApiKey, clearApiKey } from "@/lib/settings";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = getApiKey();
    if (existing) {
      setKey(existing);
      setSaved(true);
    }
  }, []);

  function handleSave() {
    if (key.trim()) {
      setApiKey(key.trim());
      setSaved(true);
    }
  }

  function handleClear() {
    clearApiKey();
    setKey("");
    setSaved(false);
  }

  return (
    <div className="border-b border-border bg-surface">
      <div className="max-w-[960px] mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">
            {saved
              ? "API key stored"
              : "Add API key for unlimited use"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground text-sm"
          >
            Close
          </button>
        </div>

        {saved ? (
          <div className="flex items-center gap-3">
            <span className="text-success text-sm">
              Key stored — unlimited recommendations
            </span>
            <button
              onClick={handleClear}
              className="text-muted hover:text-error text-xs underline"
            >
              Remove key
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk-ant-..."
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
              />
              <button
                onClick={handleSave}
                disabled={!key.trim()}
                className="bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
            <p className="text-muted text-xs mt-2">
              Your key stays in your browser only. We recommend a temporary key
              with a $5 spend limit.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
