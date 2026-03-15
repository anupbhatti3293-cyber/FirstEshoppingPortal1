-- Phase 2 QA: Restore supplier_products and automation_rules from backup
-- 1. Run 01_backup.sql first - note the table names in the output (e.g. supplier_products_backup_20260315_143000)
-- 2. Replace BACKUP_TS below with your timestamp (e.g. 20260315_143000)
-- 3. Execute this script in Supabase SQL Editor

-- CHANGE THIS to match your backup table suffix:
-- BACKUP_TS = 20260315_143000  (example)

-- Restore supplier_products
TRUNCATE supplier_products CASCADE;
INSERT INTO supplier_products
SELECT * FROM supplier_products_backup_20260315_120000;  -- Replace 20260315_120000

-- Restore automation_rules
TRUNCATE automation_rules CASCADE;
INSERT INTO automation_rules
SELECT * FROM automation_rules_backup_20260315_120000;  -- Replace 20260315_120000
