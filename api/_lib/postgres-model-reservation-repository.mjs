import {
  reserveBudget,
  settleBudget,
  releaseBudget,
  transitionReservation
} from "./model-reservations.mjs";

function requireText(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} is required`);
  }
  return value;
}

function safeMicrousd(value, name) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new RangeError(`${name} is outside the safe micro-USD range`);
  }
  return parsed;
}

function oneRow(result, message) {
  if (!result || !Array.isArray(result.rows) || result.rows.length !== 1) {
    throw new Error(message);
  }
  return result.rows[0];
}

function requireTransactionRunner(withTransaction) {
  if (typeof withTransaction !== "function") {
    throw new TypeError("withTransaction must provide one PostgreSQL transaction");
  }
}

/**
 * PostgreSQL repository for model-cost reservations.
 *
 * withTransaction must acquire one dedicated PostgreSQL connection, issue
 * BEGIN, pass a query-capable client to the callback, then COMMIT or ROLLBACK
 * and release the client. Do not pass neon()'s HTTP query function here.
 *
 * This module is deliberately not wired to API routes. The caller owns driver
 * lifecycle, connection configuration, and transaction isolation.
 */
export function createPostgresModelReservationRepository({ withTransaction }) {
  requireTransactionRunner(withTransaction);

  async function lockBudget(tx, restaurantId, budgetId) {
    const result = await tx.query(
      `SELECT id, restaurant_id, limit_microusd, spent_microusd,
              reserved_microusd, status
         FROM public.restaurant_model_budgets
        WHERE id = $1 AND restaurant_id = $2
        FOR UPDATE`,
      [budgetId, restaurantId]
    );
    return result.rows?.[0] || null;
  }

  async function lockReservation(tx, restaurantId, reservationId) {
    const result = await tx.query(
      `SELECT id, restaurant_id, budget_id, idempotency_key, provider,
              model_id, rate_card_version, reserved_microusd,
              actual_microusd, status
         FROM public.model_cost_reservations
        WHERE id = $1 AND restaurant_id = $2
        FOR UPDATE`,
      [reservationId, restaurantId]
    );
    return result.rows?.[0] || null;
  }

  async function locateReservation(tx, restaurantId, reservationId) {
    const result = await tx.query(
      `SELECT budget_id
         FROM public.model_cost_reservations
        WHERE id = $1 AND restaurant_id = $2`,
      [reservationId, restaurantId]
    );
    return result.rows?.[0] || null;
  }

  function budgetValues(row) {
    return {
      limitMicrousd: safeMicrousd(row.limit_microusd, "limit_microusd"),
      spentMicrousd: safeMicrousd(row.spent_microusd, "spent_microusd"),
      reservedMicrousd: safeMicrousd(row.reserved_microusd, "reserved_microusd"),
      budgetStatus: row.status
    };
  }

  async function lockBudgetAndReservation(tx, restaurantId, reservationId) {
    // budget_id is immutable; this first read only discovers the parent row.
    const located = await locateReservation(tx, restaurantId, reservationId);
    if (!located) return { missing: true };
    const budget = await lockBudget(tx, restaurantId, located.budget_id);
    if (!budget) return { missing: true };
    const reservation = await lockReservation(tx, restaurantId, reservationId);
    if (!reservation || reservation.budget_id !== budget.id) return { missing: true };
    return { budget, reservation };
  }

  return Object.freeze({
    async reserveAtomically(input) {
      return withTransaction(async (tx) => {
        const budget = await lockBudget(tx, input.restaurantId, input.budgetId);
        if (!budget) return { allowed: false, reason: "BUDGET_NOT_FOUND" };

        const duplicateResult = await tx.query(
          `SELECT id, restaurant_id, budget_id, idempotency_key, provider,
                  model_id, rate_card_version, reserved_microusd,
                  actual_microusd, status
             FROM public.model_cost_reservations
            WHERE restaurant_id = $1 AND budget_id = $2 AND idempotency_key = $3
            FOR UPDATE`,
          [input.restaurantId, input.budgetId, input.idempotencyKey]
        );
        const duplicate = duplicateResult.rows?.[0];
        if (duplicate) {
          const sameRequest =
            duplicate.provider === input.provider &&
            duplicate.model_id === input.modelId &&
            duplicate.rate_card_version === input.rateCardVersion &&
            safeMicrousd(duplicate.reserved_microusd, "reserved_microusd") === input.amountMicrousd;
          if (!sameRequest) {
            return { allowed: false, conflict: true, reason: "IDEMPOTENCY_KEY_REUSED" };
          }
          // Never authorize a second provider send for an existing idempotency key.
          // The caller may inspect the original reservation/task to recover its outcome.
          return {
            allowed: false,
            duplicate: true,
            reason: "IDEMPOTENT_RESERVATION_EXISTS",
            reservation: duplicate
          };
        }

        const decision = input.policy({
          ...budgetValues(budget),
          amountMicrousd: input.amountMicrousd
        });
        if (!decision.allowed) return decision;

        const inserted = oneRow(await tx.query(
          `INSERT INTO public.model_cost_reservations
             (restaurant_id, budget_id, idempotency_key, provider, model_id,
              rate_card_version, reserved_microusd, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'reserved')
           RETURNING id, restaurant_id, budget_id, idempotency_key, provider,
                     model_id, rate_card_version, reserved_microusd,
                     actual_microusd, status`,
          [input.restaurantId, input.budgetId, input.idempotencyKey,
           input.provider, input.modelId, input.rateCardVersion, input.amountMicrousd]
        ), "reservation insert did not return one row");

        await tx.query(
          `UPDATE public.restaurant_model_budgets
              SET reserved_microusd = $1, updated_at = now()
            WHERE id = $2 AND restaurant_id = $3`,
          [decision.nextReservedMicrousd, input.budgetId, input.restaurantId]
        );
        return { allowed: true, duplicate: false, reservation: inserted, availableMicrousd: decision.availableMicrousd - input.amountMicrousd };
      });
    },

    async settleAtomically(input) {
      return withTransaction(async (tx) => {
        const locked = await lockBudgetAndReservation(tx, input.restaurantId, input.reservationId);
        if (locked.missing) return { settled: false, reason: "RESERVATION_NOT_FOUND" };
        const { budget, reservation } = locked;
        if (reservation.status === "settled") {
          const sameAmount = safeMicrousd(reservation.actual_microusd, "actual_microusd") === input.actualMicrousd;
          return sameAmount
            ? { settled: true, duplicate: true, reservation }
            : { settled: false, conflict: true, reason: "SETTLEMENT_CONFLICT" };
        }
        if (reservation.status !== "reserved") {
          return { settled: false, reason: "RESERVATION_NOT_SETTLEABLE" };
        }
        const next = input.policy({
          spentMicrousd: safeMicrousd(budget.spent_microusd, "spent_microusd"),
          reservedMicrousd: safeMicrousd(budget.reserved_microusd, "reserved_microusd"),
          reservationMicrousd: safeMicrousd(reservation.reserved_microusd, "reservation_microusd"),
          actualMicrousd: input.actualMicrousd,
          limitMicrousd: safeMicrousd(budget.limit_microusd, "limit_microusd")
        });
        const transition = input.transition({
          currentStatus: reservation.status,
          nextStatus: "settled",
          actualMicrousd: input.actualMicrousd
        });
        await tx.query(
          `UPDATE public.restaurant_model_budgets
              SET spent_microusd = $1, reserved_microusd = $2, updated_at = now()
            WHERE id = $3 AND restaurant_id = $4`,
          [next.nextSpentMicrousd, next.nextReservedMicrousd, budget.id, input.restaurantId]
        );
        const updated = oneRow(await tx.query(
          `UPDATE public.model_cost_reservations
              SET status = $1, actual_microusd = $2, settled_at = now()
            WHERE id = $3 AND restaurant_id = $4
            RETURNING id, status, actual_microusd, reserved_microusd`,
          [transition.status, transition.actualMicrousd, reservation.id, input.restaurantId]
        ), "settlement update did not return one row");
        return { settled: true, duplicate: false, overBudget: next.overBudget, reservation: updated };
      });
    },

    async releaseAtomically(input) {
      return withTransaction(async (tx) => {
        const locked = await lockBudgetAndReservation(tx, input.restaurantId, input.reservationId);
        if (locked.missing) return { released: false, reason: "RESERVATION_NOT_FOUND" };
        const { budget, reservation } = locked;
        if (reservation.status === "released") return { released: true, duplicate: true, reservation };
        if (reservation.status !== "reserved" || input.confirmedNotSent !== true) {
          return { released: false, reason: "RESERVATION_NOT_RELEASABLE" };
        }
        const next = input.policy({
          reservedMicrousd: safeMicrousd(budget.reserved_microusd, "reserved_microusd"),
          reservationMicrousd: safeMicrousd(reservation.reserved_microusd, "reservation_microusd"),
          confirmedNotSent: true
        });
        const transition = input.transition({ currentStatus: reservation.status, nextStatus: "released" });
        await tx.query(
          `UPDATE public.restaurant_model_budgets
              SET reserved_microusd = $1, updated_at = now()
            WHERE id = $2 AND restaurant_id = $3`,
          [next.nextReservedMicrousd, budget.id, input.restaurantId]
        );
        const updated = oneRow(await tx.query(
          `UPDATE public.model_cost_reservations
              SET status = $1
            WHERE id = $2 AND restaurant_id = $3
            RETURNING id, status`,
          [transition.status, reservation.id, input.restaurantId]
        ), "release update did not return one row");
        return { released: true, duplicate: false, reservation: updated };
      });
    },

    async markUnknownAtomically(input) {
      return withTransaction(async (tx) => {
        const locked = await lockBudgetAndReservation(tx, input.restaurantId, input.reservationId);
        if (locked.missing) return { marked: false, reason: "RESERVATION_NOT_FOUND" };
        const { reservation } = locked;
        if (reservation.status === "unknown") return { marked: true, duplicate: true, reservation };
        if (reservation.status !== "reserved") return { marked: false, reason: "RESERVATION_NOT_MARKABLE" };
        const transition = input.transition({ currentStatus: reservation.status, nextStatus: "unknown" });
        const updated = oneRow(await tx.query(
          `UPDATE public.model_cost_reservations
              SET status = $1
            WHERE id = $2 AND restaurant_id = $3
            RETURNING id, status, reserved_microusd`,
          [transition.status, reservation.id, input.restaurantId]
        ), "unknown update did not return one row");
        return { marked: true, duplicate: false, reservation: updated };
      });
    },

    async reconcileUnknownAtomically(input) {
      return withTransaction(async (tx) => {
        const locked = await lockBudgetAndReservation(tx, input.restaurantId, input.reservationId);
        if (locked.missing) return { reconciled: false, reason: "RESERVATION_NOT_FOUND" };
        const { budget, reservation } = locked;
        if (reservation.status !== "unknown") {
          return { reconciled: false, reason: "RESERVATION_NOT_UNKNOWN" };
        }
        if (input.providerOutcome === "processed") {
          const next = input.policy({
            spentMicrousd: safeMicrousd(budget.spent_microusd, "spent_microusd"),
            reservedMicrousd: safeMicrousd(budget.reserved_microusd, "reserved_microusd"),
            reservationMicrousd: safeMicrousd(reservation.reserved_microusd, "reservation_microusd"),
            actualMicrousd: input.actualMicrousd,
            limitMicrousd: safeMicrousd(budget.limit_microusd, "limit_microusd")
          });
          const transition = input.transition({
            currentStatus: "unknown", nextStatus: "settled",
            actualMicrousd: input.actualMicrousd, providerOutcome: "processed"
          });
          await tx.query(
            `UPDATE public.restaurant_model_budgets
                SET spent_microusd = $1, reserved_microusd = $2, updated_at = now()
              WHERE id = $3 AND restaurant_id = $4`,
            [next.nextSpentMicrousd, next.nextReservedMicrousd, budget.id, input.restaurantId]
          );
          const updated = oneRow(await tx.query(
            `UPDATE public.model_cost_reservations
                SET status = $1, actual_microusd = $2, settled_at = now()
              WHERE id = $3 AND restaurant_id = $4
              RETURNING id, status, actual_microusd`,
            [transition.status, transition.actualMicrousd, reservation.id, input.restaurantId]
          ), "reconciliation settlement did not return one row");
          return { reconciled: true, outcome: "processed", overBudget: next.overBudget, reservation: updated };
        }
        if (input.providerOutcome === "not_processed" && input.confirmedNotSent === true) {
          const next = input.policy({
            reservedMicrousd: safeMicrousd(budget.reserved_microusd, "reserved_microusd"),
            reservationMicrousd: safeMicrousd(reservation.reserved_microusd, "reservation_microusd"),
            confirmedNotSent: true
          });
          const transition = input.transition({
            currentStatus: "unknown", nextStatus: "released", providerOutcome: "not_processed"
          });
          await tx.query(
            `UPDATE public.restaurant_model_budgets
                SET reserved_microusd = $1, updated_at = now()
              WHERE id = $2 AND restaurant_id = $3`,
            [next.nextReservedMicrousd, budget.id, input.restaurantId]
          );
          const updated = oneRow(await tx.query(
            `UPDATE public.model_cost_reservations
                SET status = $1
              WHERE id = $2 AND restaurant_id = $3
              RETURNING id, status`,
            [transition.status, reservation.id, input.restaurantId]
          ), "reconciliation release did not return one row");
          return { reconciled: true, outcome: "not_processed", reservation: updated };
        }
        return { reconciled: false, reason: "PROVIDER_OUTCOME_UNKNOWN" };
      });
    }
  });
}
