import test from "node:test";
import assert from "node:assert/strict";
import { createPostgresModelReservationRepository } from "../api/_lib/postgres-model-reservation-repository.mjs";
import { reserveBudget, settleBudget, releaseBudget, transitionReservation } from "../api/_lib/model-reservations.mjs";

function harness(responder) {
  const calls = [];
  let transactions = 0;
  const repository = createPostgresModelReservationRepository({
    async withTransaction(work) {
      transactions += 1;
      return work({
        async query(sql, params) {
          calls.push({ sql, params });
          return responder(sql, params, calls.length);
        }
      });
    }
  });
  return { repository, calls, get transactions() { return transactions; } };
}

const budget = {
  id: "budget-1", restaurant_id: "restaurant-1",
  limit_microusd: "1000", spent_microusd: "100",
  reserved_microusd: "100", status: "active"
};

test("repository requires an explicit transaction runner", () => {
  assert.throws(() => createPostgresModelReservationRepository({}), /withTransaction/);
});

test("reservation locks the budget before idempotency lookup and writes atomically", async () => {
  const h = harness((sql) => {
    if (sql.includes("FROM public.restaurant_model_budgets")) return { rows: [budget] };
    if (sql.includes("FROM public.model_cost_reservations")) return { rows: [] };
    if (sql.includes("INSERT INTO public.model_cost_reservations")) {
      return { rows: [{ id: "reservation-1", status: "reserved" }] };
    }
    return { rows: [], rowCount: 1 };
  });
  const result = await h.repository.reserveAtomically({
    restaurantId: "restaurant-1", budgetId: "budget-1",
    idempotencyKey: "request-1", provider: "gateway",
    modelId: "model-a", rateCardVersion: "rates-v1",
    amountMicrousd: 200, policy: reserveBudget
  });
  assert.equal(result.allowed, true);
  assert.equal(result.reservation.id, "reservation-1");
  assert.equal(h.transactions, 1);
  assert.match(h.calls[0].sql, /FOR UPDATE/);
  assert.match(h.calls[1].sql, /idempotency_key = \$3/);
  assert.ok(h.calls.some((call) => call.sql.includes("UPDATE public.restaurant_model_budgets")));
  assert.ok(h.calls.every((call) => !call.sql.includes("request-1")));
});

test("same idempotency key with changed immutable request data is rejected", async () => {
  const existing = {
    id: "reservation-existing", provider: "gateway", model_id: "model-a",
    rate_card_version: "rates-v1", reserved_microusd: "200"
  };
  const h = harness((sql) => {
    if (sql.includes("FROM public.restaurant_model_budgets")) return { rows: [budget] };
    if (sql.includes("FROM public.model_cost_reservations")) return { rows: [existing] };
    throw new Error("unexpected write");
  });
  const result = await h.repository.reserveAtomically({
    restaurantId: "restaurant-1", budgetId: "budget-1",
    idempotencyKey: "request-1", provider: "gateway",
    modelId: "model-b", rateCardVersion: "rates-v1",
    amountMicrousd: 200, policy: reserveBudget
  });
  assert.deepEqual(result, { allowed: false, conflict: true, reason: "IDEMPOTENCY_KEY_REUSED" });
  assert.equal(h.calls.length, 2);
});

test("settlement locks parent budget before reservation and records actual overrun", async () => {
  const reservation = {
    id: "reservation-1", restaurant_id: "restaurant-1", budget_id: "budget-1",
    reserved_microusd: "100", actual_microusd: null, status: "reserved"
  };
  const h = harness((sql) => {
    if (sql.includes("SELECT budget_id")) return { rows: [{ budget_id: "budget-1" }] };
    if (sql.includes("FROM public.restaurant_model_budgets")) return { rows: [budget] };
    if (sql.includes("FROM public.model_cost_reservations") && sql.includes("FOR UPDATE")) return { rows: [reservation] };
    if (sql.includes("UPDATE public.model_cost_reservations")) return { rows: [{ id: "reservation-1", status: "settled", actual_microusd: 250 }] };
    return { rows: [], rowCount: 1 };
  });
  const result = await h.repository.settleAtomically({
    restaurantId: "restaurant-1", reservationId: "reservation-1",
    actualMicrousd: 250, policy: settleBudget, transition: transitionReservation
  });
  assert.equal(result.settled, true);
  assert.equal(result.overBudget, false);
  assert.match(h.calls[1].sql, /FROM public.restaurant_model_budgets[\s\S]*FOR UPDATE/);
  assert.match(h.calls[2].sql, /FROM public.model_cost_reservations[\s\S]*FOR UPDATE/);
  assert.ok(h.calls.some((call) => call.sql.includes("SET spent_microusd = $1")));
});

test("ambiguous reservations are not released without provider-confirmed non-processing", async () => {
  const reservation = {
    id: "reservation-1", restaurant_id: "restaurant-1", budget_id: "budget-1",
    reserved_microusd: "100", actual_microusd: null, status: "unknown"
  };
  const h = harness((sql) => {
    if (sql.includes("SELECT budget_id")) return { rows: [{ budget_id: "budget-1" }] };
    if (sql.includes("FROM public.restaurant_model_budgets")) return { rows: [budget] };
    if (sql.includes("FROM public.model_cost_reservations") && sql.includes("FOR UPDATE")) return { rows: [reservation] };
    throw new Error("unknown reservations must not be modified by release()");
  });
  const result = await h.repository.releaseAtomically({
    restaurantId: "restaurant-1", reservationId: "reservation-1",
    confirmedNotSent: true, policy: releaseBudget, transition: transitionReservation
  });
  assert.deepEqual(result, { released: false, reason: "RESERVATION_NOT_RELEASABLE" });
});
