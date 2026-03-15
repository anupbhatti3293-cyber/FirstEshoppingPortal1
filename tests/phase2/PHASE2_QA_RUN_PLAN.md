# Phase 2 QA — Ready-to-Run Plan

**Prerequisites:** Supabase SQL Editor open, Next.js dev server running (`npm run dev`), admin logged in at `/admin/login`.

**Project path:** `C:\Anup AI Company Docs\DropShipping Project\FirstEshoppingPortal1`

---

## Step 1: Backup (Supabase SQL Editor)

Copy-paste and run:

```sql
-- Phase 2 QA: Backup supplier_products and automation_rules
DO $$
DECLARE
  ts text := to_char(now(), 'YYYYMMDD_HH24MISS');
  tbl_supplier text := 'supplier_products_backup_' || ts;
  tbl_rules text := 'automation_rules_backup_' || ts;
BEGIN
  EXECUTE format('CREATE TABLE %I AS SELECT * FROM supplier_products', tbl_supplier);
  EXECUTE format('CREATE TABLE %I AS SELECT * FROM automation_rules', tbl_rules);
  RAISE NOTICE 'Backup created: % and %', tbl_supplier, tbl_rules;
END $$;

SELECT tablename FROM pg_tables
WHERE tablename LIKE 'supplier_products_backup_%' OR tablename LIKE 'automation_rules_backup_%'
ORDER BY tablename DESC LIMIT 2;
```

**→ Note the backup table names from the result** (e.g. `supplier_products_backup_20260307_143000`). You’ll need the timestamp part for Step 7.

---

## Step 2: Insert Test Data (Supabase SQL Editor)

Copy-paste and run:

```sql
-- Phase 2 QA: Insert test data
INSERT INTO automation_rules (tenant_id, min_ai_profit_score, min_margin_pct, max_shipping_days, min_supplier_rating, auto_publish_enabled, updated_at)
VALUES (1, 85, 40.00, 10, 4.50, true, now())
ON CONFLICT (tenant_id) DO UPDATE SET
  min_ai_profit_score = 85,
  min_margin_pct = 40.00,
  max_shipping_days = 10,
  min_supplier_rating = 4.50,
  auto_publish_enabled = true,
  updated_at = now();

INSERT INTO supplier_products (tenant_id, supplier_id, external_id, raw_title, raw_description, processing_status, status, raw_images, raw_rating, supplier_price_usd, suggested_retail_price_usd, estimated_margin_pct, ai_profit_score, shipping_days_us, supplier_category)
VALUES
  (1, 1, 'QA_TEST_001', 'Test Product Pass All', 'Description', 'AI_PROCESSED', 'pending_review', '[]', 4.8, 20.00, 29.00, 45.00, 90, 7, 'beauty'),
  (1, 1, 'QA_TEST_002', 'Test Product Pass 2', 'Description', 'AI_PROCESSED', 'pending_review', '[]', 4.6, 15.00, 21.30, 42.00, 88, 5, 'beauty'),
  (1, 1, 'QA_TEST_003', 'Test Product Pass Boundary', 'Description', 'AI_PROCESSED', 'pending_review', '[]', 4.5, 25.00, 35.00, 40.00, 85, 10, 'beauty'),
  (1, 1, 'QA_TEST_004', 'Test Product Fail Score', 'Description', 'AI_PROCESSED', 'pending_review', '[]', 4.0, 10.00, 14.00, 40.00, 80, 5, 'beauty'),
  (1, 1, 'QA_TEST_005', 'Test Product Fail Margin', 'Description', 'AI_PROCESSED', 'pending_review', '[]', 4.8, 20.00, 27.00, 35.00, 90, 5, 'beauty'),
  (1, 1, 'QA_TEST_006', 'Test Product Fail Shipping', 'Description', 'AI_PROCESSED', 'pending_review', '[]', 4.8, 20.00, 29.00, 45.00, 90, 15, 'beauty'),
  (1, 1, 'QA_TEST_007', 'Test Product Fail Rating', 'Description', 'AI_PROCESSED', 'pending_review', '[]', 4.2, 20.00, 29.00, 45.00, 90, 5, 'beauty'),
  (1, 1, 'QA_TEST_008', 'Test Product Pass 3', 'Description', 'AI_PROCESSED', 'pending_review', '[]', 4.9, 30.00, 45.00, 50.00, 92, 3, 'beauty'),
  (1, 1, 'QA_TEST_009', 'Test Product Fail Multiple', 'Description', 'AI_PROCESSED', 'pending_review', '[]', 3.5, 10.00, 13.00, 30.00, 70, 20, 'beauty'),
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
```

---

## Step 3: Get Admin Token

1. Open `http://localhost:3000/admin/login` in your browser.
2. Log in as admin.
3. Open DevTools → Application → Cookies.
4. Copy the value of `admin-token`.

---

## Step 4: Run Evaluate (Terminal)

```powershell
cd "C:\Anup AI Company Docs\DropShipping Project\FirstEshoppingPortal1"
$env:ADMIN_TOKEN = "PASTE_YOUR_ADMIN_TOKEN_HERE"
python tests/phase2/03_run_evaluate_test.py
```

Replace `PASTE_YOUR_ADMIN_TOKEN_HERE` with the token from Step 3.

---

## Step 5: Validate Results (Terminal)

```powershell
python tests/phase2/04_validate_results.py
```

Expected: `[PASS] All validations passed.` and a summary with Inserted: 10, Auto-published: 5, Published: 5, Failed: 5.

---

## Step 6 (Optional): Auto-Disabled Test (Terminal)

```powershell
python tests/phase2/07_test_auto_disabled.py
```

Expected: `[PASS] Auto-publish disabled → no processing`

---

## Step 7: Cleanup (Supabase SQL Editor)

Copy-paste and run:

```sql
-- Phase 2 QA: Cleanup
DELETE FROM supplier_products
WHERE tenant_id = 1 AND supplier_id = 1 AND external_id LIKE 'QA_TEST_%';

DELETE FROM product_images WHERE product_id IN (
  SELECT id FROM products WHERE tenant_id = 1 AND sku LIKE 'SP-QA_TEST_%'
);
DELETE FROM products WHERE tenant_id = 1 AND sku LIKE 'SP-QA_TEST_%';
```

---

## Step 8 (Optional): Restore from Backup (Supabase SQL Editor)

Only if you need to fully restore `supplier_products` and `automation_rules` to their pre-test state.

Replace `20260307_143000` with the timestamp from Step 1, then run:

```sql
-- Phase 2 QA: Restore (replace timestamp with yours)
TRUNCATE supplier_products CASCADE;
INSERT INTO supplier_products SELECT * FROM supplier_products_backup_20260307_143000;

TRUNCATE automation_rules CASCADE;
INSERT INTO automation_rules SELECT * FROM automation_rules_backup_20260307_143000;
```

---

## Quick Reference

| Step | Where        | Action                          |
|------|--------------|----------------------------------|
| 1    | Supabase SQL | Backup tables                   |
| 2    | Supabase SQL | Insert 10 test products         |
| 3    | Browser      | Copy admin-token cookie         |
| 4    | Terminal     | Run evaluate test               |
| 5    | Terminal     | Run validation                  |
| 6    | Terminal     | (Optional) Auto-disabled test   |
| 7    | Supabase SQL | Cleanup test products           |
| 8    | Supabase SQL | (Optional) Restore from backup  |
