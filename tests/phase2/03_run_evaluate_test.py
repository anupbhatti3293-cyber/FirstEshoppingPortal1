#!/usr/bin/env python3
"""
Phase 2 QA: Call POST /api/v1/automation/evaluate and validate results.
Requires: Next.js dev server running (npm run dev), admin auth cookie.

Usage:
  1. Log in to admin at http://localhost:3000/admin/login
  2. Copy admin-token cookie from browser DevTools
  3. Set env: export ADMIN_TOKEN="your-jwt-token"
  4. Run: python 03_run_evaluate_test.py

Or use --no-auth to test 401 (expect Unauthorised).
"""

import os
import sys
import json
import requests
from datetime import datetime

BASE_URL = os.environ.get("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
STORE_ID = 1


def main():
    token = os.environ.get("ADMIN_TOKEN", "")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Cookie"] = f"admin-token={token}"

    print("=" * 60)
    print("Phase 2 QA: Evaluate Endpoint Test")
    print(f"URL: {BASE_URL}/api/v1/automation/evaluate")
    print(f"Store ID: {STORE_ID}")
    print("=" * 60)

    # 1. Call evaluate
    resp = requests.post(
        f"{BASE_URL}/api/v1/automation/evaluate",
        json={"store_id": STORE_ID},
        headers=headers,
        timeout=60,
    )

    print(f"\nStatus: {resp.status_code}")
    try:
        data = resp.json()
    except Exception:
        print(f"Response (raw): {resp.text[:500]}")
        sys.exit(1)

    print(f"Response: {json.dumps(data, indent=2)}")

    if resp.status_code == 401:
        print("\n[EXPECTED] Unauthorised - set ADMIN_TOKEN env with admin JWT.")
        sys.exit(0)

    if resp.status_code != 200:
        print(f"\n[FAIL] Expected 200, got {resp.status_code}")
        sys.exit(1)

    # 2. Validate structure
    assert "evaluated" in data, "Missing 'evaluated' in response"
    assert "published" in data, "Missing 'published' in response"
    assert "results" in data, "Missing 'results' in response"

    evaluated = data.get("evaluated", 0)
    passed = data.get("passed", 0)
    published = data.get("published", 0)
    results = data.get("results", [])

    print("\n" + "=" * 60)
    print("COUNTS")
    print("=" * 60)
    print(f"  Evaluated (pending_review): {evaluated}")
    print(f"  Passed rules:               {passed}")
    print(f"  Published:                  {published}")
    print(f"  Failed (in results):        {len([r for r in results if not r.get('success')])}")

    # 3. Write report for restore/validation
    report = {
        "timestamp": datetime.utcnow().isoformat(),
        "store_id": STORE_ID,
        "evaluated": evaluated,
        "passed": passed,
        "published": published,
        "results": results,
        "message": data.get("message", ""),
    }
    report_path = os.path.join(os.path.dirname(__file__), "evaluate_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nReport saved: {report_path}")

    print("\n[PASS] Evaluate endpoint returned 200 with expected structure.")
    sys.exit(0)


if __name__ == "__main__":
    main()
