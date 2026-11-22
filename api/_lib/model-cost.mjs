const MICRO_USD = 1_000_000;
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

function validRate(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function validTokens(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

// Convert a finite non-negative decimal Number into an exact rational pair.
// Parsing its decimal representation avoids binary floating-point arithmetic
// when converting token usage into integer micro-USD.
function decimalFraction(value) {
  const match = String(value).match(/^(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i);
  if (!match) return null;
  const fraction = match[2] || "";
  const exponent = Number(match[3] || 0);
  const digits = BigInt(match[1] + fraction);
  const scale = fraction.length - exponent;
  if (scale <= 0) return { numerator: digits * (10n ** BigInt(-scale)), denominator: 1n };
  return { numerator: digits, denominator: 10n ** BigInt(scale) };
}

function costMicrousd(tokens, rateUsdPerMillion) {
  const fraction = decimalFraction(rateUsdPerMillion);
  if (!fraction) return null;
  const numerator = BigInt(tokens) * fraction.numerator;
  // Conservative rounding: each token category rounds upward to one micro-USD.
  const amount = (numerator + fraction.denominator - 1n) / fraction.denominator;
  return amount <= MAX_SAFE ? Number(amount) : null;
}

/**
 * Rates are USD per one million tokens. Monetary values are returned in
 * integer micro-USD; no provider prices are assumed.
 */
export function estimateModelCostUsd({ usage, ratesUsdPerMillion }) {
  if (!usage || !ratesUsdPerMillion ||
      !validTokens(usage.prompt_tokens) ||
      !validTokens(usage.completion_tokens) ||
      !validRate(ratesUsdPerMillion.input) ||
      !validRate(ratesUsdPerMillion.output)) {
    return { known: false, costUsd: null, costMicrousd: null, reason: "PRICING_OR_USAGE_UNKNOWN" };
  }

  const input = costMicrousd(usage.prompt_tokens, ratesUsdPerMillion.input);
  const output = costMicrousd(usage.completion_tokens, ratesUsdPerMillion.output);
  if (input === null || output === null || input > Number.MAX_SAFE_INTEGER - output) {
    return { known: false, costUsd: null, costMicrousd: null, reason: "COST_OUT_OF_RANGE" };
  }
  const costMicrousd = input + output;
  return {
    known: true,
    costMicrousd,
    costUsd: costMicrousd / MICRO_USD,
    reason: null
  };
}

/**
 * Pure policy decision. Budget and spend must be trusted integer micro-USD
 * values loaded from an authoritative store by the caller.
 */
export function evaluateRestaurantCostLimit({ usage, ratesUsdPerMillion, monthlyBudgetMicrousd, spentMicrousd }) {
  const estimate = estimateModelCostUsd({ usage, ratesUsdPerMillion });
  if (!estimate.known ||
      !Number.isSafeInteger(monthlyBudgetMicrousd) || monthlyBudgetMicrousd < 0 ||
      !Number.isSafeInteger(spentMicrousd) || spentMicrousd < 0) {
    return { allowed: false, status: "unknown", estimatedCostMicrousd: estimate.costMicrousd, remainingMicrousd: null, reason: estimate.reason || "BUDGET_STATE_UNKNOWN" };
  }

  const remainingMicrousd = Math.max(0, monthlyBudgetMicrousd - spentMicrousd);
  const allowed = estimate.costMicrousd <= remainingMicrousd;
  return {
    allowed,
    status: allowed ? "within_budget" : "budget_exceeded",
    estimatedCostMicrousd: estimate.costMicrousd,
    remainingMicrousd,
    reason: allowed ? null : "MONTHLY_BUDGET_EXCEEDED"
  };
}
