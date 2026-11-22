import test from "node:test";
import assert from "node:assert/strict";
import { createModelReservationService } from "../api/_lib/model-reservation-service.mjs";
import { transitionReservation } from "../api/_lib/model-reservations.mjs";

function repositoryStub() {
  const calls = [];
  const repository = {};
  for (const method of [
    "reserveAtomically",
    "settleAtomically",
    "releaseAtomically",
    "markUnknownAtomically",
    "reconcileUnknownAtomically"
  ]) {
    repository[method] = async (input) => {
      calls.push({ method, input });
      return { ok: true, method };
    };
  }
  return { repository, calls };
}

test("service delegates reservation to atomic repository with validated input", async () => {
  const { repository, calls } = repositoryStub();
  const service = createModelReservationService({ repository });
  const result = await service.reserve({
    restaurantId: "restaurant-1",
    budgetId: "budget-1",
    idempotencyKey: "request-unique-1",
    provider: "gateway",
    modelId: "approved-model",
    rateCardVersion: "test-rates-v1",
    amountMicrousd: 250
  });
  assert.deepEqual(result, { ok: true, method: "reserveAtomically" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input.amountMicrousd, 250);
  assert.equal(typeof calls[0].input.policy, "function");
});

test("service rejects invalid reservation data before repository access", async () => {
  const { repository, calls } = repositoryStub();
  const service = createModelReservationService({ repository });
  await assert.rejects(() => service.reserve({
    restaurantId: "restaurant-1",
    budgetId: "budget-1",
    idempotencyKey: "",
    provider: "gateway",
    modelId: "model",
    rateCardVersion: "v1",
    amountMicrousd: 10
  }), /idempotencyKey/);
  await assert.rejects(() => service.reserve({
    restaurantId: "restaurant-1",
    budgetId: "budget-1",
    idempotencyKey: "key",
    provider: "gateway",
    modelId: "model",
    rateCardVersion: "v1",
    amountMicrousd: 0
  }), /positive safe integer/);
  assert.equal(calls.length, 0);
});

test("settlement, release, and unknown operations delegate with explicit policies", async () => {
  const { repository, calls } = repositoryStub();
  const service = createModelReservationService({ repository });
  await service.settle({ restaurantId: "r1", reservationId: "x1", actualMicrousd: 90 });
  await service.release({ restaurantId: "r1", reservationId: "x2", confirmedNotSent: true });
  await service.markUnknown({ restaurantId: "r1", reservationId: "x3" });
  assert.deepEqual(calls.map((call) => call.method), [
    "settleAtomically", "releaseAtomically", "markUnknownAtomically"
  ]);
});

test("release cannot be requested without proof that provider was not sent", async () => {
  const { repository, calls } = repositoryStub();
  const service = createModelReservationService({ repository });
  await assert.rejects(() => service.release({
    restaurantId: "r1", reservationId: "x1", confirmedNotSent: false
  }), /confirmedNotSent=true/);
  assert.equal(calls.length, 0);
});

test("unknown reservation reconciliation requires explicit provider outcome", async () => {
  const { repository, calls } = repositoryStub();
  const service = createModelReservationService({ repository });
  await assert.rejects(() => service.reconcileUnknown({
    restaurantId: "r1", reservationId: "x1", providerOutcome: "timeout"
  }), /authoritative provider outcome/);
  await assert.rejects(() => service.reconcileUnknown({
    restaurantId: "r1", reservationId: "x1", providerOutcome: "processed"
  }), /requires actualMicrousd/);
  await service.reconcileUnknown({
    restaurantId: "r1", reservationId: "x1", providerOutcome: "processed", actualMicrousd: 35
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input.providerOutcome, "processed");
});

test("only provider-confirmed outcomes can move unknown reservation to terminal state", () => {
  assert.deepEqual(
    transitionReservation({
      currentStatus: "unknown", nextStatus: "settled",
      actualMicrousd: 45, providerOutcome: "processed"
    }),
    { status: "settled", actualMicrousd: 45 }
  );
  assert.deepEqual(
    transitionReservation({
      currentStatus: "unknown", nextStatus: "released",
      providerOutcome: "not_processed"
    }),
    { status: "released", actualMicrousd: null }
  );
  assert.throws(() => transitionReservation({
    currentStatus: "unknown", nextStatus: "released"
  }), /invalid reservation transition/);
});

test("service refuses incomplete repository adapters", () => {
  assert.throws(() => createModelReservationService({ repository: {} }), /reserveAtomically/);
});
