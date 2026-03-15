-- Phase 2 QA: Insert test data
-- Prerequisites: tenants(id=1), supplier_integrations(id=1) exist
-- Run AFTER 01_backup.sql

-- 1. Insert automation_rules for tenant 1 (upsert)
INSERT INTO automation_rules (tenant_id, min_ai_profit_score, min_margin_pct, max_shipping_days, min_supplier_rating, auto_publish_enabled, updated_at)
VALUES (1, 85, 40.00, 10, 4.50, true, now())
ON CONFLICT (tenant_id) DO UPDATE SET
  min_ai_profit_score = 85,
  min_margin_pct = 40.00,
  max_shipping_days = 10,
  min_supplier_rating = 4.50,
  auto_publish_enabled = true,
  updated_at = now();

-- 2. Insert 10 dummy supplier_products (varied scores for rule testing)
-- supplier_id=1, tenant_id=1, processing_status=AI_PROCESSED, status=pending_review
-- Rules: ai_profit_score>=85, margin>=40, shipping<=10, rating>=4.5

INSERT INTO supplier_products (tenant_id, supplier_id, external_id, raw_title, raw_description, processing_status, status, raw_images, raw_rating, supplier_price_usd, suggested_retail_price_usd, estimated_margin_pct, ai_profit_score, shipping_days_us, supplier_category)
VALUES
  -- PASS all rules (score 90, margin 45, shipping 7, rating 4.8)
  (1, 1, 'QA_TEST_001', 'Test Product Pass All', 'Description', 'AI_PROCESSED', 'pending_review', '[]', 4.8, 20.00, 29.00, 45.00, 90, 7, 'beauty'),
  -- PASS (score 88, margin 42, shipping 5, rating 4.6)
  (1, 1, 'QA_TEST_002', 'Test Product Pass 2', 'Description', 'AI_PROCESSED', 'pending_review', '[]', 4.6, 15.00, 21.30, 42.00, 88, 5, 'beauty'),
  -- PASS (score 85, margin 40, shipping 10, rating 4.5) - boundary
  (1, 1, 'QA_TEST_003', 'Test Product Pass Boundary', 'Description', 'AI_PROCESSED', 'pending_review', '[]', 4.5, 25.00, 35.00, 40.00, 85, 10, 'beauty'),
  -- FAIL: score 80 < 85
  (1, 1, 'QA_TEST_004', 'Test Product Fail Score', 'Description', 'AI_PROCESSED', 'pending_review', '[]', 4.0, 10.00, 14.00, 40.00, 80, 5, 'beauty'),
  -- FAIL: margin 35 < 40
  (1, 1, 'QA_TEST_005', 'Test Product Fail Margin', 'Description', 'AI_PROCESSED', 'pending_review', '[]', 4.8, 20.00, 27.00, 35.00, 90, 5, 'beauty'),
  -- FAIL: shipping 15 > 10
  (1, 1, 'QA_TEST_006', 'Test Product Fail Shipping', 'Description', 'AI_PROCESSED', 'pending_review', '[]', 4.8, 20.00, 29.00, 45.00, 90, 15, 'beauty'),
  -- FAIL: rating 4.2 < 4.5
  (1, 1, 'QA_TEST_007', 'Test Product Fail Rating', 'Description', 'AI_PROCESSED', 'pending_review', '[]', 4.2, 20.00, 29.00, 45.00, 90, 5, 'beauty'),
  -- PASS (score 92, margin 50, shipping 3, rating 4.9)
  (1, 1, 'QA_TEST_008', 'Test Product Pass 3', 'Description', 'AI_PROCESSED', 'pending_review', '[]', 4.9, 30.00, 45.00, 50.00, 92, 3, 'beauty'),
  -- FAIL: multiple (score 70, margin 30)
  (1, 1, 'QA_TEST_009', 'Test Product Fail Multiple', 'Description', 'AI_PROCESSED', 'pending_review', '[]', 3.5, 10.00, 13.00, 30.00, 70, 20, 'beauty'),
  -- PASS (score 87, margin 48, shipping 8, rating 4.7)
  (1, 1, 'QA_TEST_010', 'Test Product Pass 4', 'Description', 'AI_PROCESSED', 'pending_review', '[]', 4.7, 22.00, 32.56, 48.00, 87, 8, 'beauty')
ON CONFLICT (tenant_id, supplier_id, external_id) DO UPDATE SET
  processing_status = 'AI_PROCESSED',
  status = 'pending_review',
  ai_profit_score = EXCLUDED.ai_profit_score,
  estimated_margin_pct = EXCLUDED.estimated_margin_pct,
  shipping_days_us = EXCLUDED.shipping_days_us,
  raw_rating = EXCLUDED.raw_rating,
  linked_product_id = NULL,
  processed_at = NULL;
