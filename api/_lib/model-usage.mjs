const USAGE_KEYS = ["prompt_tokens", "completion_tokens", "total_tokens"];

export function normalizeModelUsage(usage) {
  if (!usage || typeof usage !== "object" || Array.isArray(usage)) return null;
  const normalized = {};
  for (const key of USAGE_KEYS) {
    const value = usage[key];
    if (Number.isSafeInteger(value) && value >= 0) normalized[key] = value;
  }
  return Object.keys(normalized).length ? normalized : null;
}

export function createModelUsageLedger() {
  const entries = [];

  return {
    record(entry = {}) {
      const usage = normalizeModelUsage(entry.usage);
      entries.push({
        agentId: String(entry.agentId || "unknown").slice(0, 40),
        stage: String(entry.stage || "model_call").slice(0, 40),
        status: entry.status === "completed" ? "completed" : "failed",
        durationMs: Number.isFinite(entry.durationMs) && entry.durationMs >= 0
          ? Math.round(entry.durationMs) : null,
        maxOutputTokens: Number.isSafeInteger(entry.maxOutputTokens) && entry.maxOutputTokens > 0
          ? entry.maxOutputTokens : null,
        usage,
        errorCode: entry.errorCode ? String(entry.errorCode).slice(0, 60) : null
      });
    },
    snapshot() {
      return entries.map(entry => ({ ...entry, usage: entry.usage ? { ...entry.usage } : null }));
    },
    summary() {
      return entries.reduce((total, entry) => {
        total.calls += 1;
        if (entry.status === "completed") total.completed += 1;
        else total.failed += 1;
        for (const key of USAGE_KEYS) {
          if (entry.usage && Number.isSafeInteger(entry.usage[key])) total[key] += entry.usage[key];
        }
        return total;
      }, { calls: 0, completed: 0, failed: 0, prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
    }
  };
}
