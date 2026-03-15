# Phase 2 Zero-Touch Automation — QA Test Suite

## Prerequisites

- Next.js dev server running (`npm run dev`)
- Admin logged in at `http://localhost:3000/admin/login`
- `status` column on `supplier_products` (run migration `20260315150000_011`)
- `automation_rules` table exists (run migration `20260315140000_010`)

## Test Flow

### 1. Backup

Run in **Supabase SQL Editor**:

```sql
-- Copy contents of 01_backup.sql
```

Note the backup table names (e.g. `supplier_products_backup_20260315_143000`).

### 2. Insert Test Data

Run in **Supabase SQL Editor**:

```sql
-- Copy contents of 02_insert_test_data.sql
```

Inserts 10 products: 5 pass rules, 5 fail. Sets `auto_publish_enabled = true`.

### 3. Run Evaluate (requires auth)

```bash
# Get admin JWT from browser: DevTools → Application → Cookies → admin-token
export ADMIN_TOKEN="your-jwt-here"
cd "C:\Anup AI Company Docs\DropShipping Project\FirstEshoppingPortal1"
python tests/phase2/03_run_evaluate_test.py
```

### 4. Validate Database State

```bash
python tests/phase2/04_validate_results.py
```

Checks:
- Passing products → `status=published`, `processing_status=LIVE`
- Failing products → `status=pending_review`
- `system_logs` has `AUTO_PUBLISH_TRIGGERED`, `user_id=0`, `triggered_by=automation_engine`

### 5. Test Auto-Disabled (optional)

```bash
python tests/phase2/07_test_auto_disabled.py
```

Verifies evaluate returns 0 when `auto_publish_enabled=false`.

### 6. Cleanup

Run in **Supabase SQL Editor**:

```sql
-- Copy contents of 05_cleanup.sql
```

Removes QA_TEST_* products and linked products.

### 7. Restore (if needed)

Edit `06_restore_from_backup.sql` with your backup timestamp, then run in Supabase.

---

## Expected Results

| Metric        | Expected |
|---------------|----------|
| Inserted      | 10       |
| Pass rules    | 5 (001, 002, 003, 008, 010) |
| Fail rules    | 5 (004, 005, 006, 007, 009) |
| Auto-published| 5        |
| Remain pending| 5        |
| AUTO_PUBLISH_TRIGGERED logs | 5 |

---

## Summary Report

After step 3, `evaluate_report.json` is written with counts and results.
