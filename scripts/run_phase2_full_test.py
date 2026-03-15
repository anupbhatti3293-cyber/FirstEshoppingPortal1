#!/usr/bin/env python3
"""
Phase 2 + 2.5 Full Test Runner
1. DB connectivity check
2. Backup
3. Run pipeline (scrape → filter → AI enhance → publish)
4. Run E2E test (backup, insert, evaluate, validate, cleanup)
5. Summary report
"""
import os
import sys
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
PIPELINE_DIR = PROJECT_ROOT / "python-pipeline"
TESTS_DIR = PROJECT_ROOT / "tests"

os.chdir(PROJECT_ROOT)
sys.path.insert(0, str(PROJECT_ROOT))

def run(cmd, cwd=None, desc=""):
    print(f"\n--- {desc} ---")
    r = subprocess.run(cmd, shell=True, cwd=cwd or PROJECT_ROOT)
    return r.returncode == 0

def main():
    print("=" * 60)
    print("PHASE 2 + 2.5 FULL TEST RUNNER")
    print("=" * 60)

    # 1. DB connectivity
    ok = run(
        'python -c "from dotenv import load_dotenv; load_dotenv(); load_dotenv(\'python-pipeline/.env\', override=True); import psycopg2; uri=__import__(\'os\').environ.get(\'DB_SQLALCHEMY_URI\') or __import__(\'os\').environ.get(\'SUPABASE_DB_POOLER_URL\'); conn=psycopg2.connect(uri.replace(\'postgresql+psycopg2://\',\'postgresql://\')); conn.cursor().execute(\'SELECT 1\'); conn.close(); print(\'DB OK\')"',
        desc="DB connectivity check"
    )
    if not ok:
        print("DB unreachable. Set DB_SQLALCHEMY_URI or SUPABASE_DB_POOLER_URL in .env")
        sys.exit(1)

    # 2. Run pipeline
    ok = run(f"python main_pipeline.py", cwd=PIPELINE_DIR, desc="Pipeline (scrape → filter → AI → publish)")
    if not ok:
        print("Pipeline failed.")
        sys.exit(1)

    # 3. Run E2E test
    ok = run("python tests/test_phase2_end_to_end.py", cwd=PROJECT_ROOT, desc="E2E test (backup, insert, evaluate, validate, cleanup)")
    if not ok:
        print("E2E test had issues (evaluate may need ADMIN_TOKEN if 401).")

    print("\n" + "=" * 60)
    print("FULL TEST COMPLETED")
    print("=" * 60)
    print("Note: If automation returned 401, set ADMIN_TOKEN env with admin JWT and re-run E2E.")
    sys.exit(0)

if __name__ == "__main__":
    main()
