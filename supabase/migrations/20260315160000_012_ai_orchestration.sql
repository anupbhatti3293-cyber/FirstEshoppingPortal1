-- Phase 2.5: Pluggable AI Orchestration Layer
-- Adds selected_model to automation_rules, creates ai_credentials table

-- 1. Add AI model selection to automation_rules
ALTER TABLE automation_rules
ADD COLUMN IF NOT EXISTS selected_model TEXT DEFAULT 'gemini';

-- 2. Create ai_credentials table (multi-tenant: filter by store_id)
CREATE TABLE IF NOT EXISTS ai_credentials (
    id SERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    encrypted_api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, provider_name)
);

CREATE INDEX IF NOT EXISTS idx_ai_credentials_store ON ai_credentials(store_id);
CREATE INDEX IF NOT EXISTS idx_ai_credentials_provider ON ai_credentials(store_id, provider_name);

ALTER TABLE ai_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages ai_credentials"
  ON ai_credentials FOR ALL TO service_role USING (true) WITH CHECK (true);
