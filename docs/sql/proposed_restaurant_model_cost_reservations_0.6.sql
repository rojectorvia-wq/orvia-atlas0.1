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

-- Tarifas explícitas por proveedor/modelo y versión. No se insertan precios:
-- cada tarifa debe verificarse contra una fuente oficial antes de activarse.
CREATE TABLE IF NOT EXISTS public.model_rate_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  version TEXT NOT NULL,
  input_usd_per_million NUMERIC(20, 10) NOT NULL,
  output_usd_per_million NUMERIC(20, 10) NOT NULL,
  source_url TEXT NOT NULL,
  source_checked_at TIMESTAMPTZ NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT model_rate_cards_provider_valid
    CHECK (length(provider) BETWEEN 1 AND 80),
  CONSTRAINT model_rate_cards_model_valid
    CHECK (length(model_id) BETWEEN 1 AND 160),
  CONSTRAINT model_rate_cards_version_valid
    CHECK (length(version) BETWEEN 1 AND 80),
  CONSTRAINT model_rate_cards_prices_nonnegative
    CHECK (input_usd_per_million >= 0 AND output_usd_per_million >= 0),
  CONSTRAINT model_rate_cards_source_valid
    CHECK (length(source_url) BETWEEN 8 AND 2048),
  CONSTRAINT model_rate_cards_effective_period_valid
    CHECK (effective_until IS NULL OR effective_until > effective_from),
  CONSTRAINT model_rate_cards_status_valid
    CHECK (status IN ('draft', 'active', 'retired')),
  CONSTRAINT model_rate_cards_provider_model_version_unique
    UNIQUE (provider, model_id, version),
  CONSTRAINT model_rate_cards_id_provider_model_version_unique
    UNIQUE (id, provider, model_id, version)
);

-- Impide que dos versiones estén activas simultáneamente para el mismo modelo.
CREATE UNIQUE INDEX IF NOT EXISTS model_rate_cards_one_active_version_idx
  ON public.model_rate_cards (provider, model_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS restaurant_model_budgets_active_period_idx
  ON public.restaurant_model_budgets (restaurant_id, period_start, period_end)
  WHERE status = 'active';

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
  CONSTRAINT model_cost_reservations_rate_card_fk
    FOREIGN KEY (provider, model_id, rate_card_version)
    REFERENCES public.model_rate_cards(provider, model_id, version)
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
