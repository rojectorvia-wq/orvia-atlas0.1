/**
 * Safe orchestration boundary for one billable model invocation.
 *
 * This module deliberately accepts injected dependencies and performs no
 * provider, database, environment, or network access itself.
 *
 * A successful reservation is consumed at most once by this function. Any
 * failure after invocation begins is treated as ambiguous and retained for
 * reconciliation; it is never automatically released or retried.
 */
function requireFunction(value, name) {
  if (typeof value !== "function") throw new TypeError(`${name} must be a function`);
}

async function markUnknownSafely(reservationService, restaurantId, reservationId) {
  try {
    await reservationService.markUnknown({ restaurantId, reservationId });
    return true;
  } catch {
    // The caller must still treat the outcome as unknown. Never resend.
    return false;
  }
}

/**
 * @param {object} options
 * @param {object} options.reservationService Injected reservation service.
 * @param {object} options.reservationInput Immutable reservation request.
 * @param {string} options.restaurantId Tenant identifier used for settlement.
 * @param {Function} options.invoke A single provider invocation; called at most once.
 * @param {Function} options.calculateActualMicrousd Maps provider response to
 *        a trusted integer micro-USD amount using a versioned rate card.
 */
export async function executeReservedModelCall({
  reservationService,
  reservationInput,
  restaurantId,
  invoke,
  calculateActualMicrousd
}) {
  if (!reservationService || typeof reservationService.reserve !== "function" ||
      typeof reservationService.settle !== "function" ||
      typeof reservationService.markUnknown !== "function") {
    throw new TypeError("reservationService is incomplete");
  }
  requireFunction(invoke, "invoke");
  requireFunction(calculateActualMicrousd, "calculateActualMicrousd");
  if (typeof restaurantId !== "string" || restaurantId.trim() === "") {
    throw new TypeError("restaurantId is required");
  }

  // No provider call can occur unless this transaction-authoritative gate allows it.
  const reservationResult = await reservationService.reserve(reservationInput);
  if (!reservationResult?.allowed) {
    return {
      status: reservationResult?.duplicate ? "duplicate_blocked" : "budget_blocked",
      reason: reservationResult?.reason || "RESERVATION_DENIED",
      reservation: reservationResult?.reservation || null,
      providerInvoked: false
    };
  }

  const reservationId = reservationResult.reservation?.id;
  if (typeof reservationId !== "string" || reservationId.trim() === "") {
    // A malformed success response must fail closed before provider invocation.
    return {
      status: "reservation_invalid",
      reason: "RESERVATION_ID_MISSING",
      providerInvoked: false
    };
  }

  let response;
  try {
    // Exactly one invocation. Do not add automatic retries here.
    response = await invoke();
  } catch (error) {
    const markedUnknown = await markUnknownSafely(
      reservationService, restaurantId, reservationId
    );
    return {
      status: "outcome_unknown",
      reason: "PROVIDER_CALL_FAILED_OR_AMBIGUOUS",
      reservationId,
      markedUnknown,
      providerInvoked: true,
      errorCode: typeof error?.code === "string" ? error.code.slice(0, 60) : null
    };
  }

  let actualMicrousd;
  try {
    actualMicrousd = calculateActualMicrousd(response);
    if (!Number.isSafeInteger(actualMicrousd) || actualMicrousd < 0) {
      throw new TypeError("actual cost is not a non-negative safe integer");
    }
  } catch {
    const markedUnknown = await markUnknownSafely(
      reservationService, restaurantId, reservationId
    );
    return {
      status: "reconciliation_required",
      reason: "ACTUAL_COST_UNAVAILABLE",
      reservationId,
      markedUnknown,
      providerInvoked: true
    };
  }

  try {
    const settlement = await reservationService.settle({
      restaurantId, reservationId, actualMicrousd
    });
    if (settlement?.settled === true) {
      return {
        status: "completed",
        reservationId,
        actualMicrousd,
        providerInvoked: true,
        response
      };
    }
  } catch {
    // A failed settlement response may mean commit outcome is ambiguous.
  }

  const markedUnknown = await markUnknownSafely(
    reservationService, restaurantId, reservationId
  );
  return {
    status: "reconciliation_required",
    reason: "SETTLEMENT_NOT_CONFIRMED",
    reservationId,
    actualMicrousd,
    markedUnknown,
    providerInvoked: true
  };
}
