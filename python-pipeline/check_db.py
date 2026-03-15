"""Run this to verify which DB connection string the pipeline uses."""
import os

# Load env same way as config
from pathlib import Path
from dotenv import load_dotenv

PIPELINE_DIR = Path(__file__).resolve().parent
load_dotenv(PIPELINE_DIR.parent / ".env")
load_dotenv(PIPELINE_DIR / ".env", override=True)

uri = os.environ.get("DB_SQLALCHEMY_URI") or os.environ.get("SUPABASE_DB_POOLER_URL") or "(not set)"

print("=== Pipeline DB Connection Check ===")
print(f"DB_SQLALCHEMY_URI set: {bool(os.environ.get('DB_SQLALCHEMY_URI'))}")
print(f"SUPABASE_DB_POOLER_URL set: {bool(os.environ.get('SUPABASE_DB_POOLER_URL'))}")

if uri != "(not set)" and "://" in uri and "@" in uri:
    rest = uri.split("://", 1)[1]
    parts = rest.rsplit("@", 1)
    auth = parts[0]
    host_part = parts[1] if len(parts) > 1 else ""
    user = auth.split(":")[0] if ":" in auth else "(none)"
    host = host_part.split("/")[0].split(":")[0] if len(parts) > 1 and host_part else "(none)"
    print(f"Username: {user}")
    print(f"Host: {host}")
    if user != "postgres.hhstzneuaywltphusmde":
        print("\n*** WRONG: Username must be 'postgres.hhstzneuaywltphusmde' for Session Pooler ***")
else:
    print("No connection string found in env.")
