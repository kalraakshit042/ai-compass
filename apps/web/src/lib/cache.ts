import type { Recommendation } from "@ai-compass/core";

const CACHE_PREFIX = "ai-compass-cache-";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 20;

interface CacheEntry {
  result: Recommendation[];
  expiresAt: number;
}

function hashQuery(query: string): string {
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return CACHE_PREFIX + hash.toString(36);
}

export function getCached(query: string): Recommendation[] | null {
  if (typeof window === "undefined") return null;
  const key = hashQuery(query.trim().toLowerCase());
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.result;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function setCached(query: string, result: Recommendation[]): void {
  if (typeof window === "undefined") return;
  const key = hashQuery(query.trim().toLowerCase());
  const entry: CacheEntry = {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  localStorage.setItem(key, JSON.stringify(entry));

  // Evict oldest if over max
  const cacheKeys: { key: string; expiresAt: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(CACHE_PREFIX)) {
      try {
        const e: CacheEntry = JSON.parse(localStorage.getItem(k)!);
        cacheKeys.push({ key: k, expiresAt: e.expiresAt });
      } catch {
        localStorage.removeItem(k!);
      }
    }
  }

  if (cacheKeys.length > MAX_ENTRIES) {
    cacheKeys.sort((a, b) => a.expiresAt - b.expiresAt);
    const toRemove = cacheKeys.length - MAX_ENTRIES;
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(cacheKeys[i].key);
    }
  }
}
