-- ORVIA LUCY — conocimiento de investigación revisado por LEX.
-- Ejecutar en la base de datos aislada de Preview después de db/schema.sql.
CREATE TABLE IF NOT EXISTS lucy_research_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL CHECK (char_length(search_query) BETWEEN 1 AND 500),
  validated_summary TEXT NOT NULL CHECK (char_length(validated_summary) BETWEEN 20 AND 5000),
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  lex_review TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved','superseded')),
  reviewed_by TEXT NOT NULL DEFAULT 'lex',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lucy_research_restaurant_created_idx
  ON lucy_research_knowledge(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lucy_research_fts_idx
  ON lucy_research_knowledge USING GIN (
    to_tsvector('simple', search_query || ' ' || validated_summary)
  );
