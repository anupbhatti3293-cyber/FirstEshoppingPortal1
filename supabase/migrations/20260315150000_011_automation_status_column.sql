-- Add business status column for automation workflow (prevents infinite loops)
-- status: pending_review | auto_publishing | published | failed

ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE supplier_products DROP CONSTRAINT IF EXISTS supplier_products_status_check;
ALTER TABLE supplier_products ADD CONSTRAINT supplier_products_status_check
  CHECK (status IS NULL OR status IN ('pending_review', 'auto_publishing', 'published', 'failed'));

UPDATE supplier_products SET status = 'pending_review' WHERE processing_status = 'AI_PROCESSED';
UPDATE supplier_products SET status = 'published' WHERE processing_status = 'LIVE';
UPDATE supplier_products SET status = 'failed' WHERE processing_status = 'REJECTED';
UPDATE supplier_products SET status = 'auto_publishing' WHERE processing_status = 'AUTO_PUBLISHING';

ALTER TABLE supplier_products ALTER COLUMN status SET DEFAULT 'pending_review';

CREATE INDEX IF NOT EXISTS idx_supplier_products_status ON supplier_products(tenant_id, status);
