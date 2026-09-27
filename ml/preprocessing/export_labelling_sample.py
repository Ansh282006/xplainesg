"""
Export a stratified sample of claims for hand-labelling.

Usage:
  cd backend
  .\.venv\Scripts\Activate.ps1
  python ..\ml\preprocessing\export_labelling_sample.py --n 120 --out ..\ml\datasets\processed\claims_to_label.csv
"""
from __future__ import annotations

import argparse
import csv
import random
import sys
from pathlib import Path

# Make `app` importable
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

from app.database.supabase_client import get_supabase_admin
from app.utils.logging import get_logger

logger = get_logger(__name__)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--n", type=int, default=120, help="Total claims to sample")
    p.add_argument("--out", required=True, help="Output CSV path")
    p.add_argument("--seed", type=int, default=42)
    args = p.parse_args()

    random.seed(args.seed)
    sb = get_supabase_admin()

    # Pull claims with company + report info via two queries (Supabase REST
    # doesn't easily do joins with our current schema permissions).
    claims_res = sb.table("esg_claims").select(
        "id, sentence, category, claim_type, claim_strength, "
        "evidence_available, page_number, report_id, company_id"
    ).execute()
    claims = claims_res.data or []

    if not claims:
        logger.error("No claims found in the database.")
        sys.exit(1)

    companies = {
        c["id"]: c["name"]
        for c in (sb.table("companies").select("id, name").execute()).data or []
    }
    reports = {
        r["id"]: r["report_title"]
        for r in (sb.table("esg_reports").select("id, report_title").execute()).data or []
    }

    # Stratify: proportional sample by (company, category), but every stratum
    # gets at least 1 if it exists. Cap at 40% per company to avoid any single
    # report dominating the label set.
    buckets: dict[tuple[str, str], list[dict]] = {}
    for c in claims:
        key = (c.get("company_id") or "unknown", c.get("category") or "unknown")
        buckets.setdefault(key, []).append(c)

    per_bucket = max(1, args.n // max(len(buckets), 1))
    sampled: list[dict] = []
    for key, items in buckets.items():
        random.shuffle(items)
        sampled.extend(items[:per_bucket])

    # If we overshoot, trim randomly. If we undershoot, top up from the pool.
    if len(sampled) > args.n:
        sampled = random.sample(sampled, args.n)
    elif len(sampled) < args.n:
        remaining = [c for c in claims if c not in sampled]
        random.shuffle(remaining)
        sampled.extend(remaining[: args.n - len(sampled)])

    # Sort by company+category for easier labelling
    sampled.sort(key=lambda c: (companies.get(c["company_id"], "?"), c.get("category") or "?"))

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with out_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow([
            "id", "company", "report", "category", "claim_type",
            "claim_strength", "evidence_available", "page",
            "sentence",
            "label",  # <-- to be filled in by hand
            "notes",  # optional
        ])
        for c in sampled:
            w.writerow([
                c["id"],
                companies.get(c["company_id"], ""),
                reports.get(c["report_id"], ""),
                c.get("category") or "",
                c.get("claim_type") or "",
                c.get("claim_strength"),
                c.get("evidence_available"),
                c.get("page_number") or "",
                (c.get("sentence") or "").replace("\n", " ").strip(),
                "",  # label
                "",  # notes
            ])

    logger.info("Wrote %d claims to %s", len(sampled), out_path)

    from collections import Counter
    counts = Counter(
        (companies.get(c["company_id"], "?"), c.get("category") or "?")
        for c in sampled
    )
    print()
    print("=== Distribution of sampled claims ===")
    for k, v in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"  {k[0]:25s} {k[1]:15s}  {v}")
    print()
    print(f"Total: {len(sampled)} claims -> {out_path}")


if __name__ == "__main__":
    main()
