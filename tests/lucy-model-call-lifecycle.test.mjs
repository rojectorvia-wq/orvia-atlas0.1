import test from "node:test";
import assert from "node:assert/strict";
import { executeReservedModelCall } from "../api/_lib/model-call-lifecycle.mjs";

function harness(overrides = {}) {
  const calls = { reserve: 0, invoke: 0, settle: 0, markUnknown: 0 };
  const service = {
    async reserve() {
      calls.reserve += 1;
      return overrides.reserveResult || {
        allowed: true, reservation: { id: "reservation-1" }
      };
    },
    async settle(input) {
      calls.settle += 1;
      calls.settlementInput = input;
      if (overrides.settle) return overrides.settle(input);
      return { settled: true };
    },
    async markUnknown(input) {
      calls.markUnknown += 1;
      calls.unknownInput = input;
      if (overrides.markUnknown) return overrides.markUnknown(input);
      return { marked: true };
    }
  };
  return { calls, service };
}

const base = {
  reservationInput: { idempotencyKey: "request-1" },
  restaurantId: "restaurant-1",
  calculateActualMicrousd: () => 42
};

test("does not invoke provider when reservation is denied", async () => {
  const h = harness({ reserveResult: { allowed: false, reason: "MONTHLY_BUDGET_EXCEEDED" } });
  const result = await executeReservedModelCall({
    ...base, reservationService: h.service,
    invoke: async () => { h.calls.invoke += 1; }
  });
  assert.equal(result.status, "budget_blocked");
  assert.equal(result.providerInvoked, false);
  assert.equal(h.calls.invoke, 0);
});

test("an existing idempotency reservation blocks a second provider invocation", async () => {
  const h = harness({ reserveResult: {
    allowed: false, duplicate: true, reason: "IDEMPOTENT_RESERVATION_EXISTS",
    reservation: { id: "reservation-existing" }
  } });
  const result = await executeReservedModelCall({
    ...base, reservationService: h.service,
    invoke: async () => { h.calls.invoke += 1; }
  });
  assert.equal(result.status, "duplicate_blocked");
  assert.equal(h.calls.invoke, 0);
});

test("invokes once and settles the measured cost on success", async () => {
  const h = harness();
  const result = await executeReservedModelCall({
    ...base, reservationService: h.service,
    invoke: async () => { h.calls.invoke += 1; return { usage: "measured" }; },
    calculateActualMicrousd: response => response.usage === "measured" ? 42 : null
  });
  assert.equal(result.status, "completed");
  assert.equal(result.actualMicrousd, 42);
  assert.equal(result.response.usage, "measured");
  assert.equal(h.calls.invoke, 1);
  assert.equal(h.calls.settle, 1);
  assert.equal(h.calls.markUnknown, 0);
  assert.equal(h.calls.settlementInput.reservationId, "reservation-1");
});

test("provider errors become unknown and are never automatically retried", async () => {
  const h = harness();
  const result = await executeReservedModelCall({
    ...base, reservationService: h.service,
    invoke: async () => {
      h.calls.invoke += 1;
      const error = new Error("network outcome ambiguous");
      error.code = "ETIMEDOUT";
      throw error;
    }
  });
  assert.equal(result.status, "outcome_unknown");
  assert.equal(result.markedUnknown, true);
  assert.equal(result.errorCode, "ETIMEDOUT");
  assert.equal(h.calls.invoke, 1);
  assert.equal(h.calls.settle, 0);
  assert.equal(h.calls.markUnknown, 1);
});

test("missing or invalid actual cost requires reconciliation", async () => {
  const h = harness();
  const result = await executeReservedModelCall({
    ...base, reservationService: h.service,
    invoke: async () => { h.calls.invoke += 1; return { usage: null }; },
    calculateActualMicrousd: () => null
  });
  assert.equal(result.status, "reconciliation_required");
  assert.equal(result.reason, "ACTUAL_COST_UNAVAILABLE");
  assert.equal(h.calls.invoke, 1);
  assert.equal(h.calls.settle, 0);
  assert.equal(h.calls.markUnknown, 1);
});

test("unconfirmed settlement is retained for reconciliation", async () => {
  const h = harness({ settle: async () => ({ settled: false, reason: "DB_UNAVAILABLE" }) });
  const result = await executeReservedModelCall({
    ...base, reservationService: h.service,
    invoke: async () => { h.calls.invoke += 1; return { ok: true }; }
  });
  assert.equal(result.status, "reconciliation_required");
  assert.equal(result.reason, "SETTLEMENT_NOT_CONFIRMED");
  assert.equal(h.calls.invoke, 1);
  assert.equal(h.calls.markUnknown, 1);
});

test("a missing reservation id fails closed before provider invocation", async () => {
  const h = harness({ reserveResult: { allowed: true, reservation: {} } });
  const result = await executeReservedModelCall({
    ...base, reservationService: h.service,
    invoke: async () => { h.calls.invoke += 1; }
  });
  assert.equal(result.status, "reservation_invalid");
  assert.equal(result.providerInvoked, false);
  assert.equal(h.calls.invoke, 0);
});

test("unknown-marking failure does not trigger a provider retry", async () => {
  const h = harness({ markUnknown: async () => { throw new Error("database unavailable"); } });
  const result = await executeReservedModelCall({
    ...base, reservationService: h.service,
    invoke: async () => { h.calls.invoke += 1; throw new Error("timeout"); }
  });
  assert.equal(result.status, "outcome_unknown");
  assert.equal(result.markedUnknown, false);
  assert.equal(h.calls.invoke, 1);
});
