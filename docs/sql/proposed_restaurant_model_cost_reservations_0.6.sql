-- PROPUESTA DE MIGRACIÓN — NO EJECUTAR.
-- Este archivo prepara el esquema para revisión. No se ha aplicado a Neon.
-- Requiere aprobación independiente, revisión de tarifas y pruebas en una rama aislada.

CREATE TABLE IF NOT EXISTS public.restaurant_model_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL
    REFERENCES public.restaurants(id) ON DELETE RESTRICT,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  limit_microusd BIGINT NOT NULL,
  spent_microusd BIGINT NOT NULL DEFAULT 0,
  reserved_microusd BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'paused',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_model_budgets_period_valid
    CHECK (period_end > period_start),
  CONSTRAINT restaurant_model_budgets_currency_usd
    CHECK (currency = 'USD'),
  CONSTRAINT restaurant_model_budgets_amounts_nonnegative
    CHECK (
      limit_microusd >= 0 AND
      spent_microusd >= 0 AND
      reserved_microusd >= 0
    ),
  CONSTRAINT restaurant_model_budgets_amounts_safe
    CHECK (
      limit_microusd <= 9007199254740991 AND
      spent_microusd <= 9007199254740991 AND
      reserved_microusd <= 9007199254740991
    ),
  -- No se impone aquí spent + reserved <= limit: una liquidación real
  -- puede superar la reserva. Ese exceso debe registrarse sin truncarlo;
  -- la política de aplicación bloqueará reservas nuevas mientras el saldo
  -- disponible sea cero o negativo.
  CONSTRAINT restaurant_model_budgets_status_valid
    CHECK (status IN ('active', 'paused', 'closed')),
  CONSTRAINT restaurant_model_budgets_restaurant_period_unique
    UNIQUE (restaurant_id, period_start, period_end),
  CONSTRAINT restaurant_model_budgets_id_restaurant_unique
    UNIQUE (id, restaurant_id)
);

CREATE TABLE IF NOT EXISTS public.model_cost_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  budget_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  rate_card_version TEXT NOT NULL,
  reserved_microusd BIGINT NOT NULL,
  actual_microusd BIGINT,
  status TEXT NOT NULL DEFAULT 'reserved',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ,
  CONSTRAINT model_cost_reservations_budget_fk
    FOREIGN KEY (budget_id, restaurant_id)
    REFERENCES public.restaurant_model_budgets(id, restaurant_id)
    ON DELETE RESTRICT,
  CONSTRAINT model_cost_reservations_idempotency_unique
    UNIQUE (restaurant_id, budget_id, idempotency_key),
  CONSTRAINT model_cost_reservations_idempotency_valid
    CHECK (length(idempotency_key) BETWEEN 1 AND 160),
  CONSTRAINT model_cost_reservations_provider_valid
    CHECK (length(provider) BETWEEN 1 AND 80),
  CONSTRAINT model_cost_reservations_model_valid
    CHECK (length(model_id) BETWEEN 1 AND 160),
  CONSTRAINT model_cost_reservations_rate_version_valid
    CHECK (length(rate_card_version) BETWEEN 1 AND 80),
  CONSTRAINT model_cost_reservations_amounts_valid
    CHECK (
      reserved_microusd >= 0 AND
      reserved_microusd <= 9007199254740991 AND
      (actual_microusd IS NULL OR
        (actual_microusd >= 0 AND actual_microusd <= 9007199254740991))
    ),
  CONSTRAINT model_cost_reservations_status_valid
    CHECK (status IN ('reserved', 'settled', 'released', 'failed', 'unknown')),
  CONSTRAINT model_cost_reservations_settlement_valid
    CHECK (
      (status = 'settled' AND actual_microusd IS NOT NULL AND settled_at IS NOT NULL)
      OR
      (status <> 'settled')
    )
);

CREATE INDEX IF NOT EXISTS model_cost_reservations_budget_status_idx
  ON public.model_cost_reservations (budget_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS model_cost_reservations_unknown_idx
  ON public.model_cost_reservations (created_at)
  WHERE status = 'unknown';

-- La actualización de spent_microusd / reserved_microusd debe ocurrir
-- transaccionalmente junto con cada transición de reserva y bajo SELECT FOR UPDATE
-- de la fila del presupuesto. Ningún endpoint debe confiar en importes del navegador.
