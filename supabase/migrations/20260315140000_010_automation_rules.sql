-- Phase 2: Zero-Touch Automation Engine
-- automation_rules table + AUTO_PUBLISHING status

DO $$ BEGIN
  ALTER TYPE automation_status ADD VALUE 'AUTO_PUBLISHING';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS automation_rules (
  id serial PRIMARY KEY,
  tenant_id bigint NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  min_ai_profit_score integer DEFAULT 85,
  min_margin_pct decimal(10,2) DEFAULT 40.00,
  max_shipping_days integer DEFAULT 10,
  min_supplier_rating decimal(3,2) DEFAULT 4.50,
  auto_publish_enabled boolean DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant ON automation_rules(tenant_id);

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages automation_rules"
  ON automation_rules FOR ALL TO service_role USING (true) WITH CHECK (true);
