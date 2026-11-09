#!/usr/bin/env python3
"""
Automated Monthly Refresh & Version Diffing Job for SwasthyaBillCheck (NMBTP).
Compares current database rate_item records against newly fetched / updated raw rate lists,
computes item-by-item version diffs (added, modified, removed, rate delta),
logs a new `rate_version` row, and updates the database.
"""

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT_DIR / "data" / "raw"
DB_PATH = ROOT_DIR / "data" / "swasthyabillcheck.db"


def compute_rate_diff(old_rates: dict[str, dict], new_rates: list[dict]) -> dict:
    added = []
    modified = []
    unchanged = 0
    seen_ids = set()

    for r in new_rates:
        rid = r["rate_id"]
        seen_ids.add(rid)
        if rid not in old_rates:
            added.append({"rate_id": rid, "name": r["name"], "new_rate": float(r["rate"])})
        else:
            prev = old_rates[rid]
            if abs(float(prev["rate"]) - float(r["rate"])) > 0.001 or prev["effective_from"] != r["effective_from"]:
                modified.append(
                    {
                        "rate_id": rid,
                        "name": r["name"],
                        "old_rate": float(prev["rate"]),
                        "new_rate": float(r["rate"]),
                        "delta": round(float(r["rate"]) - float(prev["rate"]), 2),
                    }
                )
            else:
                unchanged += 1

    removed = [
        {"rate_id": rid, "name": prev["name"], "old_rate": float(prev["rate"])}
        for rid, prev in old_rates.items()
        if rid not in seen_ids
    ]

    return {
        "added_count": len(added),
        "modified_count": len(modified),
        "removed_count": len(removed),
        "unchanged_count": unchanged,
        "added": added,
        "modified": modified,
        "removed": removed,
    }


def run_monthly_refresh(candidate_rates: list[dict] | None = None) -> dict:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    existing_rows = cur.execute("SELECT * FROM rate_item").fetchall()
    old_map = {row["rate_id"]: dict(row) for row in existing_rows}

    if candidate_rates is None:
        candidate_rates = json.loads((RAW_DIR / "rate_items.json").read_text(encoding="utf-8"))

    diff = compute_rate_diff(old_map, candidate_rates)
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    version_id = f"REFRESH_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"

    cur.execute(
        """
        INSERT INTO rate_version (
            version_id, source_id, version_label, retrieved_at,
            row_count, added_count, modified_count, removed_count, diff_summary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            version_id,
            "SRC_CGHS_2023_OM",
            f"Monthly Scheduled Refresh ({now_iso[:10]})",
            now_iso,
            len(candidate_rates),
            diff["added_count"],
            diff["modified_count"],
            diff["removed_count"],
            json.dumps(diff),
        ),
    )
    conn.commit()
    conn.close()
    return {"version_id": version_id, "retrieved_at": now_iso, "diff": diff}


if __name__ == "__main__":
    result = run_monthly_refresh()
    print(f"[Monthly Refresh] Completed version {result['version_id']}: {result['diff']['unchanged_count']} unchanged, {result['diff']['modified_count']} modified.")
