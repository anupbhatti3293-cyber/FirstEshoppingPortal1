"""
Phase 2 + 2.5 End-to-End Test
Uses correct supplier_products schema: tenant_id, supplier_id, external_id, raw_title, etc.
"""
import os
import requests
import json
import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / ".env")
load_dotenv(Path(__file__).resolve().parents[1] / "python-pipeline" / ".env", override=True)

API_BASE = os.environ.get("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
STORE_ID = 1
TENANT_ID = 1
HEADERS = {"Content-Type": "application/json"}


def get_conn():
    uri = os.environ.get("DB_SQLALCHEMY_URI") or os.environ.get("SUPABASE_DB_POOLER_URL")
    if not uri:
        raise RuntimeError("Set DB_SQLALCHEMY_URI or SUPABASE_DB_POOLER_URL in .env")
    conn_str = uri.strip().replace("postgresql+psycopg2://", "postgresql://")
    return psycopg2.connect(conn_str)


def backup_tables():
    print("Creating database backup...")
    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    tables = ["supplier_products", "automation_rules"]
    backup = {}
    for table in tables:
        cur.execute(f"SELECT * FROM {table}")
        backup[table] = cur.fetchall()
    filename = f"backup_phase2_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, "w") as f:
        json.dump(backup, f, default=str)
    print(f"Backup saved: {filename}")
    cur.close()
    conn.close()
    return filename


def insert_test_products():
    print("Inserting test products...")
    conn = get_conn()
    cur = conn.cursor()
    products = [
        (TENANT_ID, 1, "E2E_WIN_1", "Winning Product 1", "Desc", "[]", 4.8, 20.0, 29.0, 60.0, 6, "beauty"),
        (TENANT_ID, 1, "E2E_SLOW_1", "Slow Shipping Product", "Desc", "[]", 4.7, 20.0, 31.0, 55.0, 20, "beauty"),
        (TENANT_ID, 1, "E2E_LOW_1", "Low Margin Product", "Desc", "[]", 4.9, 10.0, 11.5, 15.0, 5, "beauty"),
        (TENANT_ID, 1, "E2E_AVG_1", "Average Product", "Desc", "[]", 4.3, 25.0, 34.0, 35.0, 9, "beauty"),
    ]
    cur.executemany("""
        INSERT INTO supplier_products
        (tenant_id, supplier_id, external_id, raw_title, raw_description, raw_images, raw_rating,
         supplier_price_usd, suggested_retail_price_usd, estimated_margin_pct, shipping_days_us, supplier_category,
         processing_status, status)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'AI_PROCESSED','pending_review')
        ON CONFLICT (tenant_id, supplier_id, external_id) DO UPDATE SET
        raw_title=EXCLUDED.raw_title, estimated_margin_pct=EXCLUDED.estimated_margin_pct,
        shipping_days_us=EXCLUDED.shipping_days_us, raw_rating=EXCLUDED.raw_rating,
        processing_status='AI_PROCESSED', status='pending_review'
    """, products)
    conn.commit()
    cur.close()
    conn.close()
    print("Test products inserted")


def run_automation():
    print("Triggering automation evaluation...")
    url = f"{API_BASE.rstrip('/')}/api/v1/automation/evaluate"
    headers = dict(HEADERS)
    token = os.environ.get("ADMIN_TOKEN")
    if token:
        headers["Cookie"] = f"admin-token={token}"
    response = requests.post(url, headers=headers, json={"store_id": STORE_ID}, timeout=60)
    print("Automation response:", response.status_code)
    print(response.text[:500] if response.text else "")


def validate_results():
    print("Validating results...")
    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT external_id, raw_title, status, ai_profit_score, processing_status
        FROM supplier_products
        WHERE tenant_id = %s AND external_id LIKE 'E2E_%%'
    """, (TENANT_ID,))
    rows = cur.fetchall()
    for r in rows:
        print(f"  {r['external_id']}: {r['raw_title'][:30]} | status={r['status']} | score={r['ai_profit_score']}")
    cur.close()
    conn.close()


def cleanup():
    print("Cleaning test products...")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        DELETE FROM supplier_products
        WHERE tenant_id = %s AND external_id LIKE 'E2E_%%'
    """, (TENANT_ID,))
    conn.commit()
    cur.close()
    conn.close()
    print("Cleanup complete")


def run():
    print("=" * 50)
    print("PHASE 2 + 2.5 END TO END TEST")
    print("=" * 50)
    backup_tables()
    insert_test_products()
    run_automation()
    validate_results()
    cleanup()
    print("TEST COMPLETED")


if __name__ == "__main__":
    run()
