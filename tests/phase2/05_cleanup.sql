-- Phase 2 QA: Cleanup - Remove test products, optionally restore from backup
-- Run AFTER validation. Safe, idempotent.

-- 1. Delete test supplier_products (by external_id pattern)
DELETE FROM supplier_products
WHERE tenant_id = 1
  AND supplier_id = 1
  AND external_id LIKE 'QA_TEST_%';

-- 2. Delete products created by test (linked from supplier_products - already deleted)
-- Products created have sku like 'SP-QA_TEST_%'
DELETE FROM product_images WHERE product_id IN (
  SELECT id FROM products WHERE tenant_id = 1 AND sku LIKE 'SP-QA_TEST_%'
);
DELETE FROM products WHERE tenant_id = 1 AND sku LIKE 'SP-QA_TEST_%';

-- 3. Delete automation test logs (optional - keeps audit trail if you comment this out)
-- DELETE FROM system_logs WHERE tenant_id = 1 AND action = 'AUTO_PUBLISH_TRIGGERED' AND metadata->>'triggered_by' = 'automation_engine';

-- 4. Restore automation_rules from backup (if you created one)
-- Uncomment and replace TIMESTAMP with your backup table name:
-- DELETE FROM automation_rules WHERE tenant_id = 1;
-- INSERT INTO automation_rules SELECT * FROM automation_rules_backup_20260315_120000;
