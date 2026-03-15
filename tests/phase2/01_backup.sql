-- Phase 2 QA: Backup supplier_products and automation_rules
-- Run in Supabase SQL Editor. Creates timestamped backup tables.
-- NOTE the table names from output for use in 06_restore_from_backup.sql

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

-- List latest backup tables (use these names in 06_restore_from_backup.sql)
SELECT tablename FROM pg_tables
WHERE tablename LIKE 'supplier_products_backup_%' OR tablename LIKE 'automation_rules_backup_%'
ORDER BY tablename DESC LIMIT 2;
