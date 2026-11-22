import test from "node:test";
import assert from "node:assert/strict";
import { createModelIdempotencyKey } from "../api/_lib/model-idempotency-key.mjs";

const base = {
  restaurantId: "restaurant-1",
  taskId: "task-1",
  agentId: "lucy",
  stage: "final_response"
};

test("same logical model stage produces the same idempotency key", () => {
  assert.equal(createModelIdempotencyKey(base), createModelIdempotencyKey({ ...base }));
});

test("different task, agent, stage, or restaurant produces a different key", () => {
  const original = createModelIdempotencyKey(base);
  for (const changed of [
    { ...base, restaurantId: "restaurant-2" },
    { ...base, taskId: "task-2" },
    { ...base, agentId: "lex" },
    { ...base, stage: "quality_review" }
  ]) {
    assert.notEqual(createModelIdempotencyKey(changed), original);
  }
});

test("key is bounded and does not expose raw identifiers", () => {
  const key = createModelIdempotencyKey(base);
  assert.match(key, /^orvia-model-v1:[a-f0-9]{64}$/);
  assert.equal(key.includes(base.restaurantId), false);
  assert.equal(key.includes(base.taskId), false);
});

test("missing, blank, and oversized identity components are rejected", () => {
  for (const invalid of [
    { ...base, restaurantId: "" },
    { ...base, taskId: "   " },
    { ...base, agentId: null },
    { ...base, stage: "x".repeat(201) }
  ]) {
    assert.throws(() => createModelIdempotencyKey(invalid), TypeError);
  }
});
