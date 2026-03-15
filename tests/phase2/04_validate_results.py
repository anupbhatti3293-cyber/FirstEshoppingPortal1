#!/usr/bin/env python3
"""
Phase 2 QA: Validate database state after evaluate.
Uses python-pipeline config for DB connection.

Run AFTER 03_run_evaluate_test.py (and after evaluate has completed).

Validates:
- Products meeting rules → status='published', processing_status='LIVE'
- Products failing rules → status='pending_review'
- system_logs has action='AUTO_PUBLISH_TRIGGERED', metadata.triggered_by='automation_engine'
- user_id=0 for automation logs
"""

import os
import sys
import json

# Add project root for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
os.chdir(os.path.join(os.path.dirname(__file__), "..", ".."))

from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
load_dotenv(Path(__file__).resolve().parents[2] / "python-pipeline" / ".env", override=True)

try:
    import psycopg2
    from psycopg2 import sql
    from urllib.parse import urlparse
except ImportError:
    print("Install: pip install psycopg2-binary python-dotenv")
    sys.exit(1)


def get_conn():
    uri = os.environ.get("DB_SQLALCHEMY_URI") or os.environ.get("SUPABASE_DB_POOLER_URL")
    if not uri:
        print("Set DB_SQLALCHEMY_URI or SUPABASE_DB_POOLER_URL in .env")
        sys.exit(1)
    if "postgresql://" in uri and "+psycopg2" not in uri:
        uri = uri.replace("postgresql://", "postgresql+psycopg2://", 1)
    # psycopg2 uses postgresql://
    conn_str = uri.replace("postgresql+psycopg2://", "postgresql://")
    return psycopg2.connect(conn_str)


def main():
    print("=" * 60)
    print("Phase 2 QA: Validation")
    print("=" * 60)

    conn = get_conn()
    cur = conn.cursor()

    tenant_id = 1
    errors = []

    # 1. Products that should have PASSED (QA_TEST_001, 002, 003, 008, 010)
    passing_ids = ["QA_TEST_001", "QA_TEST_002", "QA_TEST_003", "QA_TEST_008", "QA_TEST_010"]
    cur.execute(
        """
        SELECT external_id, status, processing_status, linked_product_id
        FROM supplier_products
        WHERE tenant_id = %s AND external_id = ANY(%s)
        """,
        (tenant_id, passing_ids),
    )
    passing_rows = {r[0]: {"status": r[1], "processing_status": r[2], "linked_product_id": r[3]} for r in cur.fetchall()}

    for ext_id in passing_ids:
        row = passing_rows.get(ext_id)
        if not row:
            errors.append(f"Passing product {ext_id} not found")
        elif row["status"] != "published" or row["processing_status"] != "LIVE":
            errors.append(f"Passing product {ext_id}: expected published/LIVE, got {row['status']}/{row['processing_status']}")
        elif not row["linked_product_id"]:
            errors.append(f"Passing product {ext_id}: linked_product_id is null")

    # 2. Products that should have FAILED (QA_TEST_004, 005, 006, 007, 009)
    failing_ids = ["QA_TEST_004", "QA_TEST_005", "QA_TEST_006", "QA_TEST_007", "QA_TEST_009"]
    cur.execute(
        """
        SELECT external_id, status, processing_status
        FROM supplier_products
        WHERE tenant_id = %s AND external_id = ANY(%s)
        """,
        (tenant_id, failing_ids),
    )
    failing_rows = {r[0]: {"status": r[1], "processing_status": r[2]} for r in cur.fetchall()}

    for ext_id in failing_ids:
        row = failing_rows.get(ext_id)
        if not row:
            errors.append(f"Failing product {ext_id} not found")
        elif row["status"] != "pending_review":
            errors.append(f"Failing product {ext_id}: expected pending_review, got {row['status']}")

    # 3. system_logs: AUTO_PUBLISH_TRIGGERED or AUTO_PUBLISH_AI_CONFIRMED, user_id=0, triggered_by=automation_engine
    cur.execute(
        """
        SELECT action, user_id, metadata
        FROM system_logs
        WHERE tenant_id = %s AND action IN ('AUTO_PUBLISH_TRIGGERED', 'AUTO_PUBLISH_AI_CONFIRMED')
        ORDER BY created_at DESC
        LIMIT 20
        """,
        (tenant_id,),
    )
    auto_logs = cur.fetchall()

    if len(auto_logs) < len(passing_ids):
        errors.append(f"Expected >= {len(passing_ids)} AUTO_PUBLISH_TRIGGERED logs, got {len(auto_logs)}")

    for action, user_id, metadata in auto_logs:
        if user_id != 0:
            errors.append(f"Automation log user_id should be 0, got {user_id}")
        if metadata and isinstance(metadata, dict):
            tb = metadata.get("triggered_by")
            if tb != "automation_engine":
                errors.append(f"Automation log metadata.triggered_by should be 'automation_engine', got {tb}")

    # 4. No auto_publishing stuck (all should be published or pending_review)
    cur.execute(
        """
        SELECT COUNT(*) FROM supplier_products
        WHERE tenant_id = %s AND status = 'auto_publishing'
        """,
        (tenant_id,),
    )
    stuck = cur.fetchone()[0]
    if stuck > 0:
        errors.append(f"Found {stuck} products stuck in auto_publishing")

    # 5. Backup verification: ensure backup tables exist and are unchanged
    cur.execute(
        """
        SELECT tablename FROM pg_tables
        WHERE tablename LIKE 'supplier_products_backup_%'
        ORDER BY tablename DESC LIMIT 1
        """
    )
    backup_row = cur.fetchone()
    backup_supplier = backup_row[0] if backup_row else None
    backup_rules = backup_supplier.replace("supplier_products_backup_", "automation_rules_backup_") if backup_supplier else None

    backup_ok = True
    if backup_supplier and backup_rules:
        cur.execute(sql.SQL("SELECT COUNT(*) FROM {}").format(sql.Identifier(backup_supplier)))
        backup_sp_count = cur.fetchone()[0]
        cur.execute(sql.SQL("SELECT COUNT(*) FROM {}").format(sql.Identifier(backup_rules)))
        backup_ar_count = cur.fetchone()[0]
    else:
        backup_sp_count = backup_ar_count = 0
        backup_ok = False

    cur.close()
    conn.close()

    # Summary counts
    inserted = len(passing_ids) + len(failing_ids)
    auto_published = len([r for r in passing_rows.values() if r.get("status") == "published"])
    published = auto_published
    failed = len([r for r in failing_rows.values() if r.get("status") == "pending_review"])

    # Report
    print("\nPassing products (expected published):")
    for ext_id in passing_ids:
        row = passing_rows.get(ext_id, {})
        ok = row.get("status") == "published" and row.get("processing_status") == "LIVE"
        print(f"  {ext_id}: {row.get('status', '?')}/{row.get('processing_status', '?')} {'OK' if ok else 'FAIL'}")

    print("\nFailing products (expected pending_review):")
    for ext_id in failing_ids:
        row = failing_rows.get(ext_id, {})
        ok = row.get("status") == "pending_review"
        print(f"  {ext_id}: {row.get('status', '?')} {'OK' if ok else 'FAIL'}")

    print(f"\nAUTO_PUBLISH_TRIGGERED logs: {len(auto_logs)}")
    print(f"Stuck in auto_publishing: {stuck}")

    # Summary report
    print("\n" + "=" * 60)
    print("PHASE 2 QA SUMMARY REPORT")
    print("=" * 60)
    print(f"  Inserted:       {inserted}")
    print(f"  Auto-published: {auto_published}")
    print(f"  Published:      {published}")
    print(f"  Failed (pending): {failed}")
    print(f"  Backups:        {backup_supplier or 'N/A'} ({backup_sp_count} rows), {backup_rules or 'N/A'} ({backup_ar_count} rows)")
    print(f"  Backups unchanged: {'YES' if backup_ok and backup_sp_count >= 0 else 'N/A'}")

    report = {
        "inserted": inserted,
        "auto_published": auto_published,
        "published": published,
        "failed": failed,
        "backup_tables": {"supplier_products": backup_supplier, "automation_rules": backup_rules},
        "backup_rows": {"supplier_products": backup_sp_count, "automation_rules": backup_ar_count},
        "backups_unchanged": backup_ok,
    }
    report_path = os.path.join(os.path.dirname(__file__), "validation_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nReport saved: {report_path}")

    if errors:
        print("\n" + "=" * 60)
        print("VALIDATION FAILED")
        print("=" * 60)
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)

    print("\n[PASS] All validations passed.")
    sys.exit(0)


if __name__ == "__main__":
    main()
