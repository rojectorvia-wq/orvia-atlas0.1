const MAX = Number.MAX_SAFE_INTEGER;

function amount(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative safe integer`);
  }
  return value;
}

function add(a, b, name) {
  if (a > MAX - b) throw new RangeError(`${name} exceeds safe integer range`);
  return a + b;
}

function state(value) {
  if (!["active", "paused", "closed"].includes(value)) {
    throw new TypeError("budget status is invalid");
  }
  return value;
}

/**
 * Pure preflight reservation. All values are trusted integer micro-USD.
 * A missing/invalid budget must be handled by the caller as a hard denial.
 */
export function reserveBudget({ limitMicrousd, spentMicrousd, reservedMicrousd, amountMicrousd, budgetStatus }) {
  const limit = amount(limitMicrousd, "limitMicrousd");
  const spent = amount(spentMicrousd, "spentMicrousd");
  const reserved = amount(reservedMicrousd, "reservedMicrousd");
  const requested = amount(amountMicrousd, "amountMicrousd");
  const currentStatus = state(budgetStatus);

  if (spent > limit || reserved > limit - spent) {
    return { allowed: false, reason: "BUDGET_STATE_INCONSISTENT", availableMicrousd: 0 };
  }
  if (currentStatus !== "active") {
    return { allowed: false, reason: "BUDGET_NOT_ACTIVE", availableMicrousd: limit - spent - reserved };
  }
  const availableMicrousd = limit - spent - reserved;
  if (requested === 0) {
    return { allowed: false, reason: "RESERVATION_MUST_BE_POSITIVE", availableMicrousd };
  }
  if (requested > availableMicrousd) {
    return { allowed: false, reason: "MONTHLY_BUDGET_EXCEEDED", availableMicrousd };
  }
  return {
    allowed: true,
    reason: null,
    availableMicrousd,
    nextReservedMicrousd: add(reserved, requested, "reservedMicrousd")
  };
}

/**
 * Settle an existing reservation. Actual spend is never hidden or capped:
 * an overrun is recorded and surfaced even when it exceeds the original reserve.
 */
export function settleBudget({ spentMicrousd, reservedMicrousd, reservationMicrousd, actualMicrousd, limitMicrousd }) {
  const spent = amount(spentMicrousd, "spentMicrousd");
  const reserved = amount(reservedMicrousd, "reservedMicrousd");
  const reservation = amount(reservationMicrousd, "reservationMicrousd");
  const actual = amount(actualMicrousd, "actualMicrousd");
  const limit = amount(limitMicrousd, "limitMicrousd");

  if (reservation > reserved) throw new RangeError("reservation exceeds reserved balance");
  const nextSpentMicrousd = add(spent, actual, "spentMicrousd");
  const nextReservedMicrousd = reserved - reservation;
  // Preserve a confirmed real charge even if other outstanding reservations
  // now exceed the remaining monthly budget. reserveBudget() will fail closed
  // on subsequent requests until the balance is reconciled.
  return {
    nextSpentMicrousd,
    nextReservedMicrousd,
    overBudget: nextSpentMicrousd > limit - nextReservedMicrousd,
    reservationOverrun: actual > reservation
  };
}

/** Release only a known reservation; callers must prove no provider request was sent. */
export function releaseBudget({ reservedMicrousd, reservationMicrousd, confirmedNotSent }) {
  const reserved = amount(reservedMicrousd, "reservedMicrousd");
  const reservation = amount(reservationMicrousd, "reservationMicrousd");
  if (confirmedNotSent !== true) {
    throw new Error("release requires confirmation that no provider request was sent");
  }
  if (reservation > reserved) throw new RangeError("reservation exceeds reserved balance");
  return { nextReservedMicrousd: reserved - reservation };
}

const transitions = {
  reserved: new Set(["settled", "released", "failed", "unknown"]),
  settled: new Set(),
  released: new Set(),
  failed: new Set(),
  unknown: new Set()
};

/** Enforces a one-way lifecycle; unknown stays reserved for reconciliation. */
export function transitionReservation({ currentStatus, nextStatus, actualMicrousd, providerOutcome }) {
  if (!Object.hasOwn(transitions, currentStatus) || !Object.hasOwn(transitions, nextStatus)) {
    throw new TypeError("reservation status is invalid");
  }
  const ordinaryTransition = transitions[currentStatus].has(nextStatus);
  const confirmedReconciliation =
    currentStatus === "unknown" &&
    ((nextStatus === "settled" && providerOutcome === "processed") ||
     (nextStatus === "released" && providerOutcome === "not_processed"));
  if (!ordinaryTransition && !confirmedReconciliation) {
    throw new Error(`invalid reservation transition: ${currentStatus} -> ${nextStatus}`);
  }
  if (nextStatus === "settled") {
    return { status: nextStatus, actualMicrousd: amount(actualMicrousd, "actualMicrousd") };
  }
  if (actualMicrousd !== undefined && actualMicrousd !== null) {
    throw new TypeError("actualMicrousd is only valid when settling");
  }
  return { status: nextStatus, actualMicrousd: null };
}
