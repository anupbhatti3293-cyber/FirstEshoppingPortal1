-- Migration 008: Add US/UK localisation columns to ai_product_analysis
-- Required for StyleMate AI Phase 1A (F1+F2+F3)

ALTER TABLE ai_product_analysis
  ADD COLUMN IF NOT EXISTS ai_title_us           text,
  ADD COLUMN IF NOT EXISTS ai_title_uk           text,
  ADD COLUMN IF NOT EXISTS ai_description_us     text,
  ADD COLUMN IF NOT EXISTS ai_description_uk     text,
  ADD COLUMN IF NOT EXISTS ai_short_desc_us      text,
  ADD COLUMN IF NOT EXISTS ai_short_desc_uk      text,
  ADD COLUMN IF NOT EXISTS ai_seo_title_us       text,
  ADD COLUMN IF NOT EXISTS ai_seo_title_uk       text,
  ADD COLUMN IF NOT EXISTS ai_seo_desc_us        text,
  ADD COLUMN IF NOT EXISTS ai_seo_desc_uk        text,
  ADD COLUMN IF NOT EXISTS ai_tags_us            text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_tags_uk            text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_faq_us             jsonb  DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS ai_faq_uk             jsonb  DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS review_themes         jsonb  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sentiment_score       integer CHECK (sentiment_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS bundle_suggestions    jsonb  DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS prompt_version        text   DEFAULT 'v1.0',
  ADD COLUMN IF NOT EXISTS stylemate_status      text   DEFAULT 'pending'
    CHECK (stylemate_status IN ('pending','processing','completed','failed'));

CREATE INDEX IF NOT EXISTS idx_ai_analysis_stylemate_status
  ON ai_product_analysis(stylemate_status);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_product_tenant
  ON ai_product_analysis(tenant_id, product_id);
