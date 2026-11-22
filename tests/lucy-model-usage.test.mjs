import test from "node:test";
import assert from "node:assert/strict";
import { createModelUsageLedger, normalizeModelUsage } from "../api/_lib/model-usage.mjs";

test("normalizes only numeric provider token counters", () => {
  assert.deepEqual(normalizeModelUsage({
    prompt_tokens: 12, completion_tokens: 8, total_tokens: 20, prompt: "private"
  }), { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 });
  assert.equal(normalizeModelUsage({ prompt: "private" }), null);
});

test("records safe per-agent metadata and aggregates usage without prompts", () => {
  const ledger = createModelUsageLedger();
  ledger.record({
    agentId: "luz", stage: "specialist", status: "completed",
    durationMs: 42.4, maxOutputTokens: 520,
    usage: { prompt_tokens: 100, completion_tokens: 30, total_tokens: 130, prompt: "secret" }
  });
  ledger.record({ agentId: "lex", stage: "quality_review", status: "failed", errorCode: "GATEWAY_FAILED" });
  assert.deepEqual(ledger.summary(), {
    calls: 2, completed: 1, failed: 1,
    prompt_tokens: 100, completion_tokens: 30, total_tokens: 130
  });
  assert.equal("prompt" in ledger.snapshot()[0], false);
  assert.equal("prompt" in ledger.snapshot()[0].usage, false);
});

test("handles absent or malformed provider usage", () => {
  const ledger = createModelUsageLedger();
  ledger.record({ agentId: "lucy", usage: null, status: "completed" });
  assert.equal(ledger.snapshot()[0].usage, null);
  assert.equal(ledger.summary().total_tokens, 0);
});
