const STORAGE_KEY = "ai-compass-usage";

interface Usage {
  count: number;
  resetAt: number;
}

export function getUsage(): Usage {
  if (typeof window === "undefined") return { count: 0, resetAt: 0 };

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { count: 0, resetAt: 0 };

  try {
    const usage: Usage = JSON.parse(raw);
    if (Date.now() > usage.resetAt) {
      return { count: 0, resetAt: 0 };
    }
    return usage;
  } catch {
    return { count: 0, resetAt: 0 };
  }
}

export function incrementUsage(): void {
  if (typeof window === "undefined") return;

  const usage = getUsage();
  const newUsage: Usage = {
    count: usage.count + 1,
    resetAt: usage.resetAt || Date.now() + 86400000,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newUsage));
}
