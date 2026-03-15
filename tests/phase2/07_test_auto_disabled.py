#!/usr/bin/env python3
"""
Phase 2 QA: Test that auto_publish disabled → no processing.
1. Disable auto_publish via API
2. Call evaluate
3. Verify evaluated=0 or no products published
4. Re-enable for other tests
"""

import os
import sys
import requests

BASE_URL = os.environ.get("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
STORE_ID = 1


def main():
    token = os.environ.get("ADMIN_TOKEN", "")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Cookie"] = f"admin-token={token}"

    print("Phase 2 QA: Auto-publish disabled test")

    # 1. Disable
    r = requests.post(
        f"{BASE_URL}/api/v1/automation/rules",
        json={"store_id": STORE_ID, "auto_publish_enabled": False},
        headers=headers,
        timeout=10,
    )
    if r.status_code != 200:
        print(f"FAIL: Could not disable rules: {r.status_code}")
        sys.exit(1)

    # 2. Evaluate
    r = requests.post(
        f"{BASE_URL}/api/v1/automation/evaluate",
        json={"store_id": STORE_ID},
        headers=headers,
        timeout=60,
    )
    data = r.json() if r.ok else {}

    # 3. Verify
    if r.status_code != 200:
        print(f"FAIL: Evaluate returned {r.status_code}")
        sys.exit(1)
    if data.get("evaluated", -1) != 0 or data.get("published", -1) != 0:
        print(f"FAIL: Expected evaluated=0, published=0. Got evaluated={data.get('evaluated')}, published={data.get('published')}")
        sys.exit(1)

    # 4. Re-enable
    requests.post(
        f"{BASE_URL}/api/v1/automation/rules",
        json={"store_id": STORE_ID, "auto_publish_enabled": True},
        headers=headers,
        timeout=10,
    )

    print("[PASS] Auto-publish disabled → no processing")
    sys.exit(0)


if __name__ == "__main__":
    main()
