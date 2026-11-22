import test from "node:test";
import assert from "node:assert/strict";
import { createModelBudget } from "../api/_lib/model-budget.mjs";

test("allows up to seven bounded model calls", () => {
  const budget = createModelBudget();
  for (let i = 0; i < 7; i += 1) {
    budget.reserve({ system: "role", user: "request" });
  }
  assert.equal(budget.snapshot().calls, 7);
  assert.throws(() => budget.reserve({ system: "role", user: "one more" }), {
    code: "MODEL_BUDGET_EXCEEDED"
  });
});

test("rejects oversized input before a model call", () => {
  const budget = createModelBudget({ maxInputCharsPerCall: 10 });
  assert.throws(() => budget.reserve({ system: "role", user: "x".repeat(20) }), {
    code: "MODEL_BUDGET_EXCEEDED"
  });
  assert.equal(budget.snapshot().calls, 0);
});

test("rejects output limits above the configured per-call ceiling", () => {
  const budget = createModelBudget();
  assert.throws(() => budget.reserve({
    system: "role", user: "request", maxOutputTokens: 521
  }), { code: "MODEL_BUDGET_EXCEEDED" });
  assert.equal(budget.snapshot().reservedOutputTokens, 0);
});

test("supports a lower explicit budget for isolated tests", () => {
  const budget = createModelBudget({ maxCalls: 1, maxOutputTokensPerCall: 100 });
  budget.reserve({ system: "", user: "", maxOutputTokens: 100 });
  assert.throws(() => budget.reserve({ system: "", user: "" }), {
    code: "MODEL_BUDGET_EXCEEDED"
  });
});
