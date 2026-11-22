import test from "node:test";
import assert from "node:assert/strict";
import { executeOrviaModelStage } from "../api/_lib/orvia-model-stage.mjs";

function harness(reserveResult = { allowed: true, reservation: { id: "reservation-1" } }) {
  const calls = { reserve: 0, invoke: 0, settle: 0, unknown: 0, input: null };
  const reservationService = {
    async reserve(input) {
      calls.reserve += 1;
      calls.input = input;
      return reserveResult;
    },
    async settle() { calls.settle += 1; return { settled: true }; },
    async markUnknown() { calls.unknown += 1; return { marked: true }; }
  };
  return { calls, reservationService };
}

const base = {
  identity: { restaurantId: "restaurant-1", taskId: "task-1", agentId: "lucy", stage: "final_response" },
  reservationInput: {
    restaurantId: "restaurant-1", budgetId: "budget-1", provider: "vercel-ai-gateway",
    modelId: "approved-model", rateCardVersion: "rate-card-v1", amountMicrousd: 1000
  },
  calculateActualMicrousd: () => 750
};

test("stage adapter injects deterministic identity key into reservation request", async () => {
  const h = harness();
  const result = await executeOrviaModelStage({
    ...base, reservationService: h.reservationService,
    invoke: async () => { h.calls.invoke += 1; return { usage: true }; }
  });
  assert.equal(result.status, "completed");
  assert.match(h.calls.input.idempotencyKey, /^orvia-model-v1:[a-f0-9]{64}$/);
  assert.equal(h.calls.input.restaurantId, base.identity.restaurantId);
  assert.equal(h.calls.invoke, 1);
  assert.equal(h.calls.settle, 1);
});

test("denied reservation blocks provider invocation", async () => {
  const h = harness({ allowed: false, reason: "MONTHLY_BUDGET_EXCEEDED" });
  const result = await executeOrviaModelStage({
    ...base, reservationService: h.reservationService,
    invoke: async () => { h.calls.invoke += 1; }
  });
  assert.equal(result.status, "budget_blocked");
  assert.equal(result.providerInvoked, false);
  assert.equal(h.calls.invoke, 0);
});

test("duplicate reservation blocks provider invocation", async () => {
  const h = harness({
    allowed: false, duplicate: true, reason: "IDEMPOTENT_RESERVATION_EXISTS",
    reservation: { id: "reservation-existing" }
  });
  const result = await executeOrviaModelStage({
    ...base, reservationService: h.reservationService,
    invoke: async () => { h.calls.invoke += 1; }
  });
  assert.equal(result.status, "duplicate_blocked");
  assert.equal(h.calls.invoke, 0);
});

test("ambiguous provider failure is marked unknown and never retried", async () => {
  const h = harness();
  const result = await executeOrviaModelStage({
    ...base, reservationService: h.reservationService,
    invoke: async () => { h.calls.invoke += 1; throw new Error("ambiguous timeout"); }
  });
  assert.equal(result.status, "outcome_unknown");
  assert.equal(h.calls.invoke, 1);
  assert.equal(h.calls.unknown, 1);
});

test("settlement failure requires reconciliation and does not retry provider", async () => {
  const h = harness();
  h.reservationService.settle = async () => { h.calls.settle += 1; throw new Error("commit outcome unknown"); };
  const result = await executeOrviaModelStage({
    ...base, reservationService: h.reservationService,
    invoke: async () => { h.calls.invoke += 1; return { usage: true }; }
  });
  assert.equal(result.status, "reconciliation_required");
  assert.equal(h.calls.invoke, 1);
  assert.equal(h.calls.unknown, 1);
});

test("mismatched restaurant identity fails before reservation or provider call", async () => {
  const h = harness();
  await assert.rejects(() => executeOrviaModelStage({
    ...base,
    reservationInput: { ...base.reservationInput, restaurantId: "another-restaurant" },
    reservationService: h.reservationService,
    invoke: async () => { h.calls.invoke += 1; }
  }), /identities must match/);
  assert.equal(h.calls.reserve, 0);
  assert.equal(h.calls.invoke, 0);
});

test("incomplete reservation metadata fails closed before reservation", async () => {
  const h = harness();
  await assert.rejects(() => executeOrviaModelStage({
    ...base,
    reservationInput: { ...base.reservationInput, rateCardVersion: "" },
    reservationService: h.reservationService,
    invoke: async () => { h.calls.invoke += 1; }
  }), /rateCardVersion is required/);
  assert.equal(h.calls.reserve, 0);
  assert.equal(h.calls.invoke, 0);
});
