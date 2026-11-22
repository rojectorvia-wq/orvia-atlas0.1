const DEFAULTS = Object.freeze({
  maxCalls: 7,
  maxOutputTokensPerCall: 520,
  maxInputCharsPerCall: 12000
});

/**
 * In-memory guardrail for one orchestration request.
 * This is a safety ceiling, not provider billing or exact token accounting.
 */
export function createModelBudget(overrides = {}) {
  const limits = { ...DEFAULTS, ...overrides };
  let calls = 0;
  let reservedOutputTokens = 0;

  return {
    reserve({ system = "", user = "", maxOutputTokens = limits.maxOutputTokensPerCall } = {}) {
      const inputChars = String(system).length + String(user).length;
      if (!Number.isSafeInteger(maxOutputTokens) || maxOutputTokens < 1 ||
          maxOutputTokens > limits.maxOutputTokensPerCall) {
        const error = new Error("MODEL_BUDGET_EXCEEDED");
        error.code = "MODEL_BUDGET_EXCEEDED";
        throw error;
      }
      if (inputChars > limits.maxInputCharsPerCall ||
          calls + 1 > limits.maxCalls ||
          reservedOutputTokens + maxOutputTokens > limits.maxCalls * limits.maxOutputTokensPerCall) {
        const error = new Error("MODEL_BUDGET_EXCEEDED");
        error.code = "MODEL_BUDGET_EXCEEDED";
        throw error;
      }
      calls += 1;
      reservedOutputTokens += maxOutputTokens;
      return { maxOutputTokens, inputChars };
    },
    snapshot() {
      return {
        calls,
        maxCalls: limits.maxCalls,
        reservedOutputTokens,
        maxOutputTokens: limits.maxCalls * limits.maxOutputTokensPerCall
      };
    }
  };
}
