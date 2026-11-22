import test from "node:test";
import assert from "node:assert/strict";
import { estimateModelCostUsd, evaluateRestaurantCostLimit } from "../api/_lib/model-cost.mjs";

const usage = { prompt_tokens: 100000, completion_tokens: 20000 };

test("estimates cost from explicitly supplied input and output rates", () => {
  assert.deepEqual(estimateModelCostUsd({
    usage, ratesUsdPerMillion: { input: 1, output: 2 }
  }), { known: true, costUsd: 0.14, reason: null });
});

test("does not invent prices or treat missing usage as zero", () => {
  assert.equal(estimateModelCostUsd({ usage, ratesUsdPerMillion: null }).known, false);
  assert.equal(estimateModelCostUsd({
    usage: null, ratesUsdPerMillion: { input: 1, output: 2 }
  }).costUsd, null);
});

test("blocks when estimated spend exceeds remaining monthly budget", () => {
  const decision = evaluateRestaurantCostLimit({
    usage, ratesUsdPerMillion: { input: 1, output: 2 },
    monthlyBudgetUsd: 1, spentUsd: 0.9
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.status, "budget_exceeded");
  assert.equal(decision.reason, "MONTHLY_BUDGET_EXCEEDED");
});

test("allows a call within remaining budget", () => {
  const decision = evaluateRestaurantCostLimit({
    usage, ratesUsdPerMillion: { input: 1, output: 2 },
    monthlyBudgetUsd: 1, spentUsd: 0.8
  });
  assert.equal(decision.allowed, true);
  assert.ok(Math.abs(decision.remainingUsd - 0.2) < 1e-12);
});

test("fails closed when budget state is invalid or unknown", () => {
  const decision = evaluateRestaurantCostLimit({
    usage, ratesUsdPerMillion: { input: 1, output: 2 },
    monthlyBudgetUsd: 1, spentUsd: undefined
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.status, "unknown");
});
