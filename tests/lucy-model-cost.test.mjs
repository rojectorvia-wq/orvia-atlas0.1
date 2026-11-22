import test from "node:test";
import assert from "node:assert/strict";
import { estimateModelCostUsd, evaluateRestaurantCostLimit } from "../api/_lib/model-cost.mjs";

const usage = { prompt_tokens: 100000, completion_tokens: 20000 };

test("estimates cost from explicitly supplied input and output rates in integer micro-USD", () => {
  assert.deepEqual(estimateModelCostUsd({
    usage, ratesUsdPerMillion: { input: 1, output: 2 }
  }), { known: true, costMicrousd: 140000, costUsd: 0.14, reason: null });
});

test("rounds fractional micro-USD upward without binary floating-point drift", () => {
  assert.equal(estimateModelCostUsd({
    usage: { prompt_tokens: 100000, completion_tokens: 0 },
    ratesUsdPerMillion: { input: 0.1, output: 0 }
  }).costMicrousd, 10000);
});

test("does not invent prices or treat missing usage as zero", () => {
  assert.equal(estimateModelCostUsd({ usage, ratesUsdPerMillion: null }).known, false);
  assert.equal(estimateModelCostUsd({
    usage: null, ratesUsdPerMillion: { input: 1, output: 2 }
  }).costMicrousd, null);
});

test("blocks when estimated spend exceeds remaining monthly budget", () => {
  const decision = evaluateRestaurantCostLimit({
    usage, ratesUsdPerMillion: { input: 1, output: 2 },
    monthlyBudgetMicrousd: 1000000, spentMicrousd: 900000
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.status, "budget_exceeded");
  assert.equal(decision.reason, "MONTHLY_BUDGET_EXCEEDED");
});

test("allows a call within remaining budget using integer accounting", () => {
  const decision = evaluateRestaurantCostLimit({
    usage, ratesUsdPerMillion: { input: 1, output: 2 },
    monthlyBudgetMicrousd: 1000000, spentMicrousd: 800000
  });
  assert.equal(decision.allowed, true);
  assert.equal(decision.remainingMicrousd, 200000);
});

test("fails closed when budget state is invalid or unknown", () => {
  const decision = evaluateRestaurantCostLimit({
    usage, ratesUsdPerMillion: { input: 1, output: 2 },
    monthlyBudgetMicrousd: 1000000, spentMicrousd: undefined
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.status, "unknown");
});

test("fails closed when monetary integer range would overflow", () => {
  const decision = estimateModelCostUsd({
    usage: { prompt_tokens: Number.MAX_SAFE_INTEGER, completion_tokens: 0 },
    ratesUsdPerMillion: { input: 2, output: 0 }
  });
  assert.equal(decision.known, false);
  assert.equal(decision.reason, "COST_OUT_OF_RANGE");
});
