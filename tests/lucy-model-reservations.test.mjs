import test from "node:test";
import assert from "node:assert/strict";
import {
  reserveBudget,
  settleBudget,
  releaseBudget,
  transitionReservation
} from "../api/_lib/model-reservations.mjs";

test("reserves only when active budget has enough available funds", () => {
  assert.deepEqual(
    reserveBudget({
      limitMicrousd: 1_000_000,
      spentMicrousd: 200_000,
      reservedMicrousd: 100_000,
      amountMicrousd: 300_000,
      budgetStatus: "active"
    }),
    {
      allowed: true,
      reason: null,
      availableMicrousd: 700_000,
      nextReservedMicrousd: 400_000
    }
  );
});

test("fails closed for paused budgets and budget overruns", () => {
  const input = {
    limitMicrousd: 1_000_000,
    spentMicrousd: 200_000,
    reservedMicrousd: 100_000,
    amountMicrousd: 800_000,
    budgetStatus: "active"
  };
  assert.equal(reserveBudget(input).reason, "MONTHLY_BUDGET_EXCEEDED");
  assert.equal(reserveBudget({ ...input, budgetStatus: "paused" }).reason, "BUDGET_NOT_ACTIVE");
});

test("rejects invalid, zero, and unsafe reservation amounts", () => {
  const input = {
    limitMicrousd: 1_000_000,
    spentMicrousd: 0,
    reservedMicrousd: 0,
    budgetStatus: "active"
  };
  assert.equal(reserveBudget({ ...input, amountMicrousd: 0 }).reason, "RESERVATION_MUST_BE_POSITIVE");
  assert.throws(() => reserveBudget({ ...input, amountMicrousd: -1 }), TypeError);
  assert.throws(() => reserveBudget({ ...input, amountMicrousd: Number.MAX_SAFE_INTEGER + 1 }), TypeError);
});

test("settles actual spend and surfaces overruns without hiding them", () => {
  assert.deepEqual(
    settleBudget({
      limitMicrousd: 500,
      spentMicrousd: 100,
      reservedMicrousd: 200,
      reservationMicrousd: 150,
      actualMicrousd: 450
    }),
    {
      nextSpentMicrousd: 550,
      nextReservedMicrousd: 50,
      overBudget: true,
      reservationOverrun: true
    }
  );
});

test("records an overrun and blocks later reservations instead of hiding real spend", () => {
  const settled = settleBudget({
    limitMicrousd: 500,
    spentMicrousd: 100,
    reservedMicrousd: 200,
    reservationMicrousd: 150,
    actualMicrousd: 450
  });
  assert.equal(settled.nextSpentMicrousd, 550);
  assert.equal(settled.overBudget, true);

  const next = reserveBudget({
    limitMicrousd: 500,
    spentMicrousd: settled.nextSpentMicrousd,
    reservedMicrousd: settled.nextReservedMicrousd,
    amountMicrousd: 1,
    budgetStatus: "active"
  });
  assert.equal(next.allowed, false);
  assert.equal(next.reason, "BUDGET_STATE_INCONSISTENT");
});

test("rejects settlement that would overflow safe integer accounting", () => {
  assert.throws(() => settleBudget({
    limitMicrousd: Number.MAX_SAFE_INTEGER,
    spentMicrousd: Number.MAX_SAFE_INTEGER,
    reservedMicrousd: 1,
    reservationMicrousd: 1,
    actualMicrousd: 1
  }), RangeError);
});

test("releases only when caller confirms provider request was not sent", () => {
  assert.throws(() => releaseBudget({
    reservedMicrousd: 300,
    reservationMicrousd: 100,
    confirmedNotSent: false
  }), /confirmation/);
  assert.deepEqual(
    releaseBudget({ reservedMicrousd: 300, reservationMicrousd: 100, confirmedNotSent: true }),
    { nextReservedMicrousd: 200 }
  );
});

test("reservation lifecycle permits only explicit transitions from reserved", () => {
  assert.deepEqual(
    transitionReservation({ currentStatus: "reserved", nextStatus: "settled", actualMicrousd: 125 }),
    { status: "settled", actualMicrousd: 125 }
  );
  assert.deepEqual(
    transitionReservation({ currentStatus: "reserved", nextStatus: "unknown" }),
    { status: "unknown", actualMicrousd: null }
  );
  assert.throws(() => transitionReservation({ currentStatus: "unknown", nextStatus: "released" }), /invalid reservation transition/);
  assert.throws(() => transitionReservation({ currentStatus: "settled", nextStatus: "settled", actualMicrousd: 125 }), /invalid reservation transition/);
});

test("non-settled transitions cannot carry an actual cost", () => {
  assert.throws(() => transitionReservation({
    currentStatus: "reserved",
    nextStatus: "failed",
    actualMicrousd: 12
  }), /only valid when settling/);
});
