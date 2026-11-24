-- ORVIA AI CORE 0.7 — canonical team registry
-- Apply only to the isolated Preview/development database.
BEGIN;
UPDATE agent_registry SET display_name = 'ORVIA JHOA', updated_at = now() WHERE id = 'jhoa';
UPDATE agent_registry SET display_name = 'ORVIA DARI', updated_at = now() WHERE id = 'dari';
INSERT INTO agent_registry (id, display_name, status, capabilities)
VALUES ('vera', 'ORVIA VERA', 'planned', '["security_review","risk_detection","privacy_checks","error_prevention"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, capabilities = EXCLUDED.capabilities, updated_at = now();
UPDATE agent_registry SET display_name = 'ORVIA MAX', capabilities = '["quality_review","consistency_checks","test_planning","acceptance_criteria"]'::jsonb, updated_at = now() WHERE id = 'max';
ALTER TABLE lucy_research_knowledge ALTER COLUMN reviewed_by SET DEFAULT 'vera';
-- LEX is retained for historical task references but hidden from the active roster.
UPDATE agent_registry SET status = 'paused', display_name = 'ORVIA LEX (legacy)', updated_at = now() WHERE id = 'lex';
COMMIT;
