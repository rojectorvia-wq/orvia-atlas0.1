import test from "node:test";
import assert from "node:assert/strict";
import { createModelReservationService } from "../api/_lib/model-reservation-service.mjs";

function createAtomicMemoryRepository({ limitMicrousd }) {
  const budget = {
    limitMicrousd,
    spentMicrousd: 0,
    reservedMicrousd: 0,
    budgetStatus: "active"
  };
  const reservations = new Map();
  let sequence = 0;
  let tail = Promise.resolve();

  // Test-only serializable critical section. This models the repository contract;
  // it is not a substitute for PostgreSQL row locks or transaction tests.
  async function withLock(operation) {
    const previous = tail;
    let unlock;
    tail = new Promise((resolve) => { unlock = resolve; });
    await previous;
    try {
      return await operation();
    } finally {
      unlock();
    }
  }

  return {
    budget,
    reservations,
    async reserveAtomically(input) {
      return withLock(async () => {
        const key = [
          input.restaurantId,
          input.budgetId,
          input.idempotencyKey
        ].join(":");
        const existing = reservations.get(key);
        if (existing) return { allowed: true, duplicate: true, reservation: existing };

        const decision = input.policy({
          ...budget,
          amountMicrousd: input.amountMicrousd
        });
        if (!decision.allowed) return decision;

        const reservation = {
          id: `reservation-${++sequence}`,
          amountMicrousd: input.amountMicrousd,
          status: "reserved"
        };
        budget.reservedMicrousd = decision.nextReservedMicrousd;
        reservations.set(key, reservation);
        return { allowed: true, duplicate: false, reservation };
      });
    },
    async settleAtomically() { throw new Error("not used in this test"); },
    async releaseAtomically() { throw new Error("not used in this test"); },
    async markUnknownAtomically() { throw new Error("not used in this test"); },
    async reconcileUnknownAtomically() { throw new Error("not used in this test"); }
  };
}

function reservationInput(idempotencyKey, amountMicrousd) {
  return {
    restaurantId: "restaurant-test",
    budgetId: "budget-test",
    idempotencyKey,
    provider: "test-provider",
    modelId: "test-model",
    rateCardVersion: "test-rates-v1",
    amountMicrousd
  };
}

test("concurrent reservations cannot spend the same available balance twice", async () => {
  const repository = createAtomicMemoryRepository({ limitMicrousd: 100 });
  const service = createModelReservationService({ repository });

  const results = await Promise.all([
    service.reserve(reservationInput("request-a", 80)),
    service.reserve(reservationInput("request-b", 80))
  ]);

  assert.equal(results.filter((result) => result.allowed).length, 1);
  assert.equal(results.filter((result) => !result.allowed).length, 1);
  assert.equal(repository.budget.reservedMicrousd, 80);
  assert.equal(repository.reservations.size, 1);
});

test("retries with the same idempotency key return the original reservation", async () => {
  const repository = createAtomicMemoryRepository({ limitMicrousd: 100 });
  const service = createModelReservationService({ repository });

  const [first, retry] = await Promise.all([
    service.reserve(reservationInput("same-request", 60)),
    service.reserve(reservationInput("same-request", 60))
  ]);

  assert.equal(first.allowed, true);
  assert.equal(retry.allowed, true);
  assert.equal(repository.reservations.size, 1);
  assert.equal(repository.budget.reservedMicrousd, 60);
  assert.equal(first.reservation.id, retry.reservation.id);
  assert.equal([first.duplicate, retry.duplicate].filter(Boolean).length, 1);
});
