#!/usr/bin/env python3
"""
Verify Phase 2 + 2.5 pipeline products in Supabase and optionally publish unpublished ones.
Uses: id, raw_title, raw_description, ai_profit_score, status (supplier_products schema).
"""
import os
import sys
from pathlib import Path

# Load env
PROJECT_ROOT = Path(__file__).resolve().parents[1]
os.chdir(PROJECT_ROOT)
from dotenv import load_dotenv
load_dotenv()
load_dotenv(PROJECT_ROOT / "python-pipeline" / ".env", override=True)

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("Install: pip install psycopg2-binary python-dotenv")
    sys.exit(1)


def get_conn():
    uri = os.environ.get("DB_SQLALCHEMY_URI") or os.environ.get("SUPABASE_DB_POOLER_URL")
    if not uri:
        print("Set DB_SQLALCHEMY_URI or SUPABASE_DB_POOLER_URL in .env")
        sys.exit(1)
    conn_str = uri.strip().replace("postgresql+psycopg2://", "postgresql://")
    return psycopg2.connect(conn_str)


def main():
    print("=" * 90)
    print("PHASE 2 + 2.5 - VERIFY & PUBLISH PRODUCTS")
    print("=" * 90)

    try:
        conn = get_conn()
    except Exception as e:
        print(f"Database connection failed: {e}")
        sys.exit(1)

    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Fetch latest 20 supplier_products
    # Schema: id, raw_title, raw_description, ai_profit_score, status (published = status='published')
    cur.execute("""
        SELECT id, raw_title, raw_description, ai_profit_score, status, processing_status
        FROM supplier_products
        ORDER BY id DESC
        LIMIT 20
    """)
    rows = cur.fetchall()

    if not rows:
        print("No products found in supplier_products.")
        cur.close()
        conn.close()
        return

    # Build table
    # ID | Raw Title (40) | AI Title (40) | Final Score | Published
    # In our schema, raw_title stores the AI-enhanced title when published from pipeline
    print(f"\n{'ID':<6} {'Raw Title':<42} {'AI Title':<42} {'Score':<8} {'Published'}")
    print("-" * 90)

    unpublished_ids = []
    for r in rows:
        pid = r["id"]
        raw_title = (r["raw_title"] or "")[:40].ljust(40)
        ai_title = (r["raw_title"] or "")[:40].ljust(40)  # same in our schema
        score = r["ai_profit_score"] or 0
        is_published = (r["status"] or "").lower() == "published"
        pub_str = "Yes" if is_published else "No"
        if not is_published:
            unpublished_ids.append(pid)
        print(f"{pid:<6} {raw_title:<42} {ai_title:<42} {score:<8} {pub_str}")

    print("-" * 90)
    total = len(rows)
    unpublished_count = len(unpublished_ids)
    already_live = total - unpublished_count

    # Publish unpublished products
    if unpublished_ids:
        print(f"\nPublishing {unpublished_count} product(s)...")
        cur.execute("""
            UPDATE supplier_products
            SET status = 'published', processing_status = 'LIVE'
            WHERE id = ANY(%s) AND (status IS NULL OR status != 'published')
        """, (unpublished_ids,))
        updated = cur.rowcount
        conn.commit()
        print(f"Updated {updated} product(s) to published.")
    else:
        updated = 0
        print("\nAll products already published.")

    # Summary
    print("\n" + "=" * 90)
    print("SUMMARY")
    print("=" * 90)
    print(f"  Total products fetched:     {total}")
    print(f"  Unpublished -> published:  {updated}")
    print(f"  Already live:               {already_live}")
    print("=" * 90)

    cur.close()
    conn.close()
    print("\nDatabase connection closed.")


if __name__ == "__main__":
    main()
