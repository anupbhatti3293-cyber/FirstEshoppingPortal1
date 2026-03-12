/*
  # AI & Supplier Automation Schema — Migration 005
  
  ## Overview
  Extends LuxeHaven with the full AI automation and supplier management layer.
  Designed to be flexible: any supplier (CJDropshipping, AliExpress/DSers, Zendrop,
  or future vendors) plugs in via the supplier_integrations registry pattern.

  ## Tables Added
  1.  supplier_integrations   — registry of all connected suppliers (vendor-agnostic)
  2.  supplier_products        — raw product data pulled from suppliers before QA
  3.  automation_jobs          — scheduler / job queue for all background workers
  4.  automation_logs          — full audit trail of every automation run
  5.  ai_product_analysis      — AI scoring, SEO rewrites, competitor analysis per product
  6.  competitor_prices        — competitor price snapshots over time
  7.  price_rules              — dynamic pricing rules (margin targets, floor/ceiling)

  ## Columns Added to Existing Tables
  - products: ai_description, ai_tags, ai_seo_title, ai_seo_description,
              quality_score, competitor_price_usd, competitor_price_gbp,
              supplier_id, supplier_product_id, cost_price_usd, cost_price_gbp,
              last_ai_updated_at, last_price_synced_at, automation_status

  ## Design Principles
  - Every table has tenant_id (multi-tenant safe from day 1)
  - All supplier communication goes through supplier_integrations (swap vendors freely)
  - automation_jobs is the single source of truth for scheduled tasks
  - ai_product_analysis is append-only (history preserved, never overwritten)
  - price_rules supports per-tenant and per-category margin configuration
*/

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE supplier_platform AS ENUM (
    'CJDROPSHIPPING',
    'ALIEXPRESS_DSERS',
    'ZENDROP',
    'SPOCKET',
    'CUSTOM_API',
    'CSV_IMPORT'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE job_status AS ENUM (
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE job_type AS ENUM (
    'PRODUCT_SYNC',
    'PRICE_SYNC',
    'INVENTORY_SYNC',
    'AI_DESCRIPTION_REWRITE',
    'AI_SEO_OPTIMISE',
    'AI_QUALITY_SCORE',
    'COMPETITOR_PRICE_CHECK',
    'ORDER_FULFIL'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE automation_status AS ENUM (
    'PENDING_AI',
    'AI_PROCESSED',
    'LIVE',
    'PAUSED',
    'REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─────────────────────────────────────────────
-- 1. SUPPLIER INTEGRATIONS (vendor registry)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS supplier_integrations (
  id                    bigserial PRIMARY KEY,
  tenant_id             bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  platform              supplier_platform NOT NULL,
  display_name          text NOT NULL,
  api_key_encrypted     text,
  api_secret_encrypted  text,
  webhook_secret        text,
  base_url              text,
  config                jsonb DEFAULT '{}',
  is_active             boolean NOT NULL DEFAULT true,
  last_synced_at        timestamptz,
  sync_interval_minutes integer NOT NULL DEFAULT 60,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, platform, display_name)
);

-- ─────────────────────────────────────────────
-- 2. SUPPLIER PRODUCTS (raw import staging area)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS supplier_products (
  id                    bigserial PRIMARY KEY,
  tenant_id             bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id           bigint NOT NULL REFERENCES supplier_integrations(id) ON DELETE CASCADE,
  external_id           text NOT NULL,
  external_url          text,
  raw_title             text NOT NULL,
  raw_description       text,
  raw_images            jsonb DEFAULT '[]',
  raw_variants          jsonb DEFAULT '[]',
  supplier_price_usd    decimal(10,2),
  supplier_price_gbp    decimal(10,2),
  supplier_category     text,
  supplier_tags         text[] DEFAULT '{}',
  raw_rating            decimal(3,2),
  raw_review_count      integer DEFAULT 0,
  shipping_days_us      integer,
  shipping_days_uk      integer,
  processing_status     automation_status NOT NULL DEFAULT 'PENDING_AI',
  linked_product_id     bigint REFERENCES products(id) ON DELETE SET NULL,
  rejection_reason      text,
  fetched_at            timestamptz NOT NULL DEFAULT now(),
  processed_at          timestamptz,
  UNIQUE(tenant_id, supplier_id, external_id)
);

-- ─────────────────────────────────────────────
-- 3. AI PRODUCT ANALYSIS (append-only history)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_product_analysis (
  id                        bigserial PRIMARY KEY,
  tenant_id                 bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id                bigint REFERENCES products(id) ON DELETE SET NULL,
  supplier_product_id       bigint REFERENCES supplier_products(id) ON DELETE SET NULL,
  ai_model                  text NOT NULL DEFAULT 'claude-sonnet-4-6',
  ai_title                  text,
  ai_description            text,
  ai_short_description      text,
  ai_tags                   text[] DEFAULT '{}',
  ai_seo_title              text,
  ai_seo_description        text,
  ai_seo_keywords           text[] DEFAULT '{}',
  quality_score             integer CHECK (quality_score BETWEEN 0 AND 100),
  image_quality_score       integer CHECK (image_quality_score BETWEEN 0 AND 100),
  description_quality_score integer CHECK (description_quality_score BETWEEN 0 AND 100),
  review_sentiment_score    integer CHECK (review_sentiment_score BETWEEN 0 AND 100),
  market_fit_score          integer CHECK (market_fit_score BETWEEN 0 AND 100),
  is_qa_verified            boolean NOT NULL DEFAULT false,
  is_engineer_verified      boolean NOT NULL DEFAULT false,
  qa_badge_label            text,
  suitable_for_us           boolean DEFAULT true,
  suitable_for_uk           boolean DEFAULT true,
  uk_compliance_notes       text,
  us_compliance_notes       text,
  raw_ai_response           jsonb,
  approved_by_admin_id      bigint REFERENCES admin_users(id) ON DELETE SET NULL,
  approved_at               timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 4. COMPETITOR PRICES (time-series snapshots)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS competitor_prices (
  id              bigserial PRIMARY KEY,
  tenant_id       bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id      bigint REFERENCES products(id) ON DELETE SET NULL,
  competitor_name text NOT NULL,
  competitor_url  text,
  price_usd       decimal(10,2),
  price_gbp       decimal(10,2),
  currency        text NOT NULL DEFAULT 'USD',
  in_stock        boolean,
  captured_at     timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 5. PRICE RULES (dynamic pricing engine)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS price_rules (
  id                      bigserial PRIMARY KEY,
  tenant_id               bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                    text NOT NULL,
  applies_to_category     text,
  applies_to_supplier_id  bigint REFERENCES supplier_integrations(id) ON DELETE SET NULL,
  target_margin_pct       decimal(5,2) NOT NULL DEFAULT 30,
  min_margin_pct          decimal(5,2) NOT NULL DEFAULT 15,
  floor_price_usd         decimal(10,2),
  floor_price_gbp         decimal(10,2),
  ceiling_price_usd       decimal(10,2),
  ceiling_price_gbp       decimal(10,2),
  beat_competitor_by_pct  decimal(5,2),
  round_to_nearest        decimal(5,2) DEFAULT 0.99,
  is_active               boolean NOT NULL DEFAULT true,
  priority                integer NOT NULL DEFAULT 0,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 6. AUTOMATION JOBS (job queue / scheduler)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS automation_jobs (
  id              bigserial PRIMARY KEY,
  tenant_id       bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_type        job_type NOT NULL,
  status          job_status NOT NULL DEFAULT 'PENDING',
  supplier_id     bigint REFERENCES supplier_integrations(id) ON DELETE SET NULL,
  product_id      bigint REFERENCES products(id) ON DELETE SET NULL,
  payload         jsonb DEFAULT '{}',
  result          jsonb DEFAULT '{}',
  error_message   text,
  retry_count     integer NOT NULL DEFAULT 0,
  max_retries     integer NOT NULL DEFAULT 3,
  scheduled_at    timestamptz NOT NULL DEFAULT now(),
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 7. AUTOMATION LOGS (full audit trail)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS automation_logs (
  id          bigserial PRIMARY KEY,
  tenant_id   bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id      bigint REFERENCES automation_jobs(id) ON DELETE SET NULL,
  level       text NOT NULL DEFAULT 'INFO',
  action      text NOT NULL,
  entity      text,
  entity_id   text,
  message     text NOT NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 8. ADD AI COLUMNS TO EXISTING PRODUCTS TABLE
-- ─────────────────────────────────────────────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS ai_description          text,
  ADD COLUMN IF NOT EXISTS ai_short_description    text,
  ADD COLUMN IF NOT EXISTS ai_tags                 text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_seo_title            text,
  ADD COLUMN IF NOT EXISTS ai_seo_description      text,
  ADD COLUMN IF NOT EXISTS quality_score           integer DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS qa_badge                text,
  ADD COLUMN IF NOT EXISTS automation_status       automation_status DEFAULT 'LIVE',
  ADD COLUMN IF NOT EXISTS supplier_id             bigint REFERENCES supplier_integrations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_product_id     bigint REFERENCES supplier_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost_price_usd          decimal(10,2),
  ADD COLUMN IF NOT EXISTS cost_price_gbp          decimal(10,2),
  ADD COLUMN IF NOT EXISTS competitor_price_usd    decimal(10,2),
  ADD COLUMN IF NOT EXISTS competitor_price_gbp    decimal(10,2),
  ADD COLUMN IF NOT EXISTS last_ai_updated_at      timestamptz,
  ADD COLUMN IF NOT EXISTS last_price_synced_at    timestamptz,
  ADD COLUMN IF NOT EXISTS last_inventory_synced_at timestamptz;

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_supplier_integrations_tenant ON supplier_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_integrations_platform ON supplier_integrations(platform);
CREATE INDEX IF NOT EXISTS idx_supplier_integrations_active ON supplier_integrations(is_active);

CREATE INDEX IF NOT EXISTS idx_supplier_products_tenant ON supplier_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_status ON supplier_products(processing_status);
CREATE INDEX IF NOT EXISTS idx_supplier_products_external ON supplier_products(external_id);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_product ON ai_product_analysis(product_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_supplier_product ON ai_product_analysis(supplier_product_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_tenant ON ai_product_analysis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_created ON ai_product_analysis(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_score ON ai_product_analysis(quality_score DESC);

CREATE INDEX IF NOT EXISTS idx_competitor_prices_product ON competitor_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_competitor_prices_tenant ON competitor_prices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_competitor_prices_captured ON competitor_prices(captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_jobs_tenant ON automation_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_status ON automation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_type ON automation_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_scheduled ON automation_jobs(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_automation_logs_tenant ON automation_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_job ON automation_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_level ON automation_logs(level);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created ON automation_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_quality_score ON products(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_products_automation_status ON products(automation_status);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

ALTER TABLE supplier_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_product_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages supplier_integrations"
  ON supplier_integrations FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages supplier_products"
  ON supplier_products FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages ai_product_analysis"
  ON ai_product_analysis FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages competitor_prices"
  ON competitor_prices FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages price_rules"
  ON price_rules FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages automation_jobs"
  ON automation_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages automation_logs"
  ON automation_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────
-- UPDATED_AT TRIGGERS
-- ─────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_supplier_integrations_updated_at') THEN
    CREATE TRIGGER update_supplier_integrations_updated_at
      BEFORE UPDATE ON supplier_integrations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_price_rules_updated_at') THEN
    CREATE TRIGGER update_price_rules_updated_at
      BEFORE UPDATE ON price_rules
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- SEED: Default supplier integrations for tenant 1
-- ─────────────────────────────────────────────

INSERT INTO supplier_integrations
  (tenant_id, platform, display_name, is_active, sync_interval_minutes, config)
VALUES
  (1, 'CJDROPSHIPPING',   'CJ Dropshipping (Primary)', false, 60,
   '{"note": "Add API key in admin → Settings → Suppliers to activate"}'),
  (1, 'ALIEXPRESS_DSERS', 'AliExpress via DSers',      false, 120,
   '{"note": "Connect DSers account in admin → Settings → Suppliers"}'),
  (1, 'ZENDROP',          'Zendrop',                   false, 60,
   '{"note": "Add Zendrop API key in admin → Settings → Suppliers"}')
ON CONFLICT (tenant_id, platform, display_name) DO NOTHING;

-- ─────────────────────────────────────────────
-- SEED: Default price rule for tenant 1
-- ─────────────────────────────────────────────

INSERT INTO price_rules
  (tenant_id, name, target_margin_pct, min_margin_pct, round_to_nearest, is_active, priority)
VALUES
  (1, 'Default — 30% Margin', 30, 15, 0.99, true, 0)
ON CONFLICT DO NOTHING;
