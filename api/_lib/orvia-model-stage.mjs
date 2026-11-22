import { createModelIdempotencyKey } from "./model-idempotency-key.mjs";
import { executeReservedModelCall } from "./model-call-lifecycle.mjs";

/**
 * Executes one logical ORVIA agent stage through the reservation boundary.
 *
 * This adapter is dependency-injected and is not wired to API routes. The
 * caller must provide a transaction-backed reservation service and a
 * versioned, trusted cost calculator before any provider integration.
 */
export async function executeOrviaModelStage({
  reservationService,
  identity,
  reservationInput,
  invoke,
  calculateActualMicrousd
}) {
  if (!identity || typeof identity !== "object") {
    throw new TypeError("identity is required");
  }
  const idempotencyKey = createModelIdempotencyKey(identity);
  const input = reservationInput && typeof reservationInput === "object"
    ? reservationInput
    : null;
  if (!input) throw new TypeError("reservationInput is required");

  const required = ["restaurantId", "budgetId", "provider", "modelId", "rateCardVersion", "amountMicrousd"];
  for (const field of required) {
    if (input[field] === undefined || input[field] === null || input[field] === "") {
      throw new TypeError(`reservationInput.${field} is required`);
    }
  }
  if (input.restaurantId !== identity.restaurantId) {
    throw new TypeError("reservation and idempotency restaurant identities must match");
  }

  return executeReservedModelCall({
    reservationService,
    restaurantId: identity.restaurantId,
    reservationInput: { ...input, idempotencyKey },
    invoke,
    calculateActualMicrousd
  });
}
