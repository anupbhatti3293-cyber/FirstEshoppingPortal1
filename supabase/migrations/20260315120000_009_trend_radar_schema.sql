-- Predictive Dropshipping Engine Phase 1: Trend Radar
-- Adds ai_profit_score, suggested_retail_price, estimated_margin to supplier_products
-- Creates system_logs for audit trail

ALTER TABLE supplier_products
  ADD COLUMN IF NOT EXISTS ai_profit_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suggested_retail_price_usd decimal(10,2),
  ADD COLUMN IF NOT EXISTS estimated_margin_pct decimal(5,2);

CREATE INDEX IF NOT EXISTS idx_supplier_products_profit_score
  ON supplier_products(tenant_id, ai_profit_score);

CREATE TABLE IF NOT EXISTS system_logs (
  id bigserial PRIMARY KEY,
  tenant_id bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id bigint,
  product_id bigint REFERENCES products(id) ON DELETE SET NULL,
  supplier_product_id bigint REFERENCES supplier_products(id) ON DELETE SET NULL,
  action text NOT NULL,
  ai_score integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_tenant ON system_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at DESC);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages system_logs"
  ON system_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
