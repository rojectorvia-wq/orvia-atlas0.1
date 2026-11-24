-- ORVIA 0.2 — Nébula
-- Run this migration in the Neon SQL Editor before enabling data endpoints.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS restaurant_members (
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','manager','staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (restaurant_id, clerk_user_id)
);
CREATE INDEX IF NOT EXISTS restaurant_members_user_idx ON restaurant_members(clerk_user_id);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer TEXT NOT NULL CHECK (char_length(customer) BETWEEN 1 AND 100),
  items TEXT NOT NULL CHECK (char_length(items) BETWEEN 1 AND 500),
  amount_cop BIGINT NOT NULL CHECK (amount_cop > 0),
  status TEXT NOT NULL DEFAULT 'Nuevo' CHECK (status IN ('Nuevo','Preparando','Listo','Entregado')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_restaurant_created_idx ON orders(restaurant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_restaurant_created_idx ON activity_log(restaurant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_registry (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','configured','testing','operational','paused','error')),
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES agent_registry(id),
  requested_by TEXT NOT NULL,
  task_type TEXT NOT NULL,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','waiting_approval','completed','failed','cancelled')),
  result JSONB,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_tasks_restaurant_created_idx ON agent_tasks(restaurant_id, created_at DESC);


-- Memoria investigativa de LUCY: solo almacena resúmenes aprobados por LEX.
-- Los registros siempre pertenecen a un restaurante y se consultan con su restaurant_id.
CREATE TABLE IF NOT EXISTS lucy_research_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  validated_summary TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  lex_review TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved','superseded')),
  reviewed_by TEXT NOT NULL DEFAULT 'lex',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lucy_research_restaurant_created_idx
  ON lucy_research_knowledge(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lucy_research_fts_idx
  ON lucy_research_knowledge USING GIN (to_tsvector('simple', search_query || ' ' || validated_summary));

INSERT INTO agent_registry (id, display_name) VALUES
 ('lucy','ORVIA LUCY'),('luz','ORVIA LUZ'),('jote','ORVIA JOTE'),
 ('kike','ORVIA KIKE'),('xel','ORVIA XEL'),('nani','ORVIA NANI'),
 ('memo','ORVIA MEMO'),('jhoa','ORVIA JHOA'),('dari','ORVIA DARI'),
 ('vera','ORVIA VERA'),('max','ORVIA MAX')
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
