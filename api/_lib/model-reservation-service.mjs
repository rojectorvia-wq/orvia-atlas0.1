import {
  reserveBudget,
  settleBudget,
  releaseBudget,
  transitionReservation
} from "./model-reservations.mjs";

function requireMethod(repository, method) {
  if (!repository || typeof repository[method] !== "function") {
    throw new TypeError(`repository.${method} must be implemented`);
  }
}

/**
 * Application service over an injected atomic repository.
 *
 * The repository contract is intentionally explicit: each method must run
 * in one database transaction and serialize operations for the budget row.
 * This module contains no database client and performs no I/O itself.
 */
export function createModelReservationService({ repository }) {
  requireMethod(repository, "reserveAtomically");
  requireMethod(repository, "settleAtomically");
  requireMethod(repository, "releaseAtomically");
  requireMethod(repository, "markUnknownAtomically");
  requireMethod(repository, "reconcileUnknownAtomically");

  return Object.freeze({
    async reserve(input) {
      const {
        restaurantId,
        budgetId,
        idempotencyKey,
        provider,
        modelId,
        rateCardVersion,
        amountMicrousd
      } = input || {};
      for (const [name, value, max] of [
        ["restaurantId", restaurantId, 80],
        ["budgetId", budgetId, 80],
        ["idempotencyKey", idempotencyKey, 160],
        ["provider", provider, 80],
        ["modelId", modelId, 160],
        ["rateCardVersion", rateCardVersion, 80]
      ]) {
        if (typeof value !== "string" || value.trim().length === 0 || value.length > max) {
          throw new TypeError(`${name} is invalid`);
        }
      }
      if (!Number.isSafeInteger(amountMicrousd) || amountMicrousd <= 0) {
        throw new TypeError("amountMicrousd must be a positive safe integer");
      }

      // Must atomically lock/read budget, enforce idempotency, insert reservation,
      // and increment reserved balance. A duplicate key returns its original row.
      return repository.reserveAtomically({
        restaurantId, budgetId, idempotencyKey, provider, modelId,
        rateCardVersion, amountMicrousd, policy: reserveBudget
      });
    },

    async settle(input) {
      const { restaurantId, reservationId, actualMicrousd } = input || {};
      if (typeof restaurantId !== "string" || !restaurantId ||
          typeof reservationId !== "string" || !reservationId ||
          !Number.isSafeInteger(actualMicrousd) || actualMicrousd < 0) {
        throw new TypeError("settlement input is invalid");
      }
      return repository.settleAtomically({
        restaurantId, reservationId, actualMicrousd,
        policy: settleBudget,
        transition: transitionReservation
      });
    },

    async release(input) {
      const { restaurantId, reservationId, confirmedNotSent } = input || {};
      if (typeof restaurantId !== "string" || !restaurantId ||
          typeof reservationId !== "string" || !reservationId ||
          confirmedNotSent !== true) {
        throw new TypeError("release requires identity and confirmedNotSent=true");
      }
      return repository.releaseAtomically({
        restaurantId, reservationId, confirmedNotSent,
        policy: releaseBudget,
        transition: transitionReservation
      });
    },

    async markUnknown(input) {
      const { restaurantId, reservationId } = input || {};
      if (typeof restaurantId !== "string" || !restaurantId ||
          typeof reservationId !== "string" || !reservationId) {
        throw new TypeError("unknown reservation identity is invalid");
      }
      return repository.markUnknownAtomically({
        restaurantId, reservationId, transition: transitionReservation
      });
    },

    async reconcileUnknown(input) {
      const { restaurantId, reservationId, providerOutcome, actualMicrousd } = input || {};
      if (typeof restaurantId !== "string" || !restaurantId ||
          typeof reservationId !== "string" || !reservationId ||
          !["processed", "not_processed"].includes(providerOutcome)) {
        throw new TypeError("reconciliation requires an authoritative provider outcome");
      }
      if (providerOutcome === "processed" &&
          (!Number.isSafeInteger(actualMicrousd) || actualMicrousd < 0)) {
        throw new TypeError("processed outcome requires actualMicrousd");
      }
      if (providerOutcome === "not_processed" && actualMicrousd !== undefined) {
        throw new TypeError("not_processed outcome cannot include actualMicrousd");
      }
      return repository.reconcileUnknownAtomically({
        restaurantId, reservationId, providerOutcome, actualMicrousd,
        confirmedNotSent: providerOutcome === "not_processed",
        policy: providerOutcome === "processed" ? settleBudget : releaseBudget,
        transition: transitionReservation
      });
    }
  });
}
