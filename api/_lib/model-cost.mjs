const MICRO_USD = 1_000_000;

function validRate(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function validTokens(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

/**
 * Estimate a call's cost using explicitly supplied provider rates.
 * Rates are USD per one million tokens. No default prices are assumed.
 */
export function estimateModelCostUsd({ usage, ratesUsdPerMillion }) {
  if (!usage || !ratesUsdPerMillion ||
      !validTokens(usage.prompt_tokens) ||
      !validTokens(usage.completion_tokens) ||
      !validRate(ratesUsdPerMillion.input) ||
      !validRate(ratesUsdPerMillion.output)) {
    return { known: false, costUsd: null, reason: "PRICING_OR_USAGE_UNKNOWN" };
  }

  const inputUsd = usage.prompt_tokens * ratesUsdPerMillion.input / MICRO_USD;
  const outputUsd = usage.completion_tokens * ratesUsdPerMillion.output / MICRO_USD;
  const costUsd = Math.ceil((inputUsd + outputUsd) * MICRO_USD) / MICRO_USD;
  if (!Number.isFinite(costUsd)) {
    return { known: false, costUsd: null, reason: "COST_OUT_OF_RANGE" };
  }
  return { known: true, costUsd, reason: null };
}

/**
 * Pure policy decision. The caller must obtain trusted, current budget and
 * spend values from an authoritative store before using this decision.
 */
export function evaluateRestaurantCostLimit({ usage, ratesUsdPerMillion, monthlyBudgetUsd, spentUsd }) {
  const estimate = estimateModelCostUsd({ usage, ratesUsdPerMillion });
  if (!estimate.known ||
      typeof monthlyBudgetUsd !== "number" || !Number.isFinite(monthlyBudgetUsd) || monthlyBudgetUsd < 0 ||
      typeof spentUsd !== "number" || !Number.isFinite(spentUsd) || spentUsd < 0) {
    return { allowed: false, status: "unknown", estimatedCostUsd: estimate.costUsd, remainingUsd: null, reason: estimate.reason || "BUDGET_STATE_UNKNOWN" };
  }

  const remainingUsd = Math.max(0, monthlyBudgetUsd - spentUsd);
  const allowed = estimate.costUsd <= remainingUsd;
  return {
    allowed,
    status: allowed ? "within_budget" : "budget_exceeded",
    estimatedCostUsd: estimate.costUsd,
    remainingUsd,
    reason: allowed ? null : "MONTHLY_BUDGET_EXCEEDED"
  };
}
