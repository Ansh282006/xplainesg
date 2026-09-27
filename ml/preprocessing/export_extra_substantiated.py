"""Pull 100 MORE claims likely to be substantiated, to balance the training set.

Targets claims containing:
  - any numeric digit
  - or target-year patterns (by 202X / 203X)
  - or certification mentions (ISO, SBTi, GRI, TCFD, BRSR)
  - or "achieved/reduced/committed to X by Y"

Appends to claims_to_label.csv.
"""
import csv
import random
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

from app.database.supabase_client import get_supabase_admin

STRONG_SIGNAL = re.compile(
    r"(\d[\d,\.]*\s*(%|percent|per cent))"        # a percentage
    r"|(\bby\s+20[2-9]\d\b)"                      # target year "by 2030"
    r"|(\b(ISO|SBTi|GRI|TCFD|BRSR|CDP|SASB)\b)"   # certification / framework
    r"|(scope\s*[123])"                            # scope emissions language
    r"|(\b(net[\s-]?zero|carbon[\s-]?neutral|science[\s-]?based\s+targets?)\b)",
    re.IGNORECASE,
)

def main() -> None:
    random.seed(7)
    sb = get_supabase_admin()
    out_path = Path(r"C:\Users\anshb\Desktop\Hack\Project\xplainesg\ml\datasets\processed\claims_to_label.csv")

    # Load existing IDs so we don't duplicate
    existing_ids = set()
    existing_rows: list[dict] = []
    fieldnames: list[str] = []
    if out_path.exists():
        with out_path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames
            for r in reader:
                existing_ids.add(r["id"])
                existing_rows.append(r)

    if not fieldnames:
        fieldnames = ["id","company","report","category","claim_type",
                      "claim_strength","evidence_available","page",
                      "sentence","label","notes"]

    # Fetch all claims
    claims = sb.table("esg_claims").select(
        "id, sentence, category, claim_type, claim_strength, "
        "evidence_available, page_number, report_id, company_id"
    ).execute().data or []

    companies = {c["id"]: c["name"] for c in (sb.table("companies").select("id, name").execute()).data or []}
    reports = {r["id"]: r["report_title"] for r in (sb.table("esg_reports").select("id, report_title").execute()).data or []}

    # Candidates: not already labelled, match strong signal
    candidates = []
    for c in claims:
        if c["id"] in existing_ids:
            continue
        if STRONG_SIGNAL.search(c.get("sentence") or ""):
            candidates.append(c)

    random.shuffle(candidates)
    new_rows = candidates[:100]

    # Append with blank labels for the user to fill
    with out_path.open("a", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        for c in new_rows:
            w.writerow({
                "id": c["id"],
                "company": companies.get(c["company_id"], ""),
                "report": reports.get(c["report_id"], ""),
                "category": c.get("category") or "",
                "claim_type": c.get("claim_type") or "",
                "claim_strength": c.get("claim_strength") or "",
                "evidence_available": c.get("evidence_available"),
                "page": c.get("page_number") or "",
                "sentence": (c.get("sentence") or "").replace("\n", " ").strip(),
                "label": "",
                "notes": "",
            })

    total_candidates = len(candidates)
    print(f"Candidates matching strong-signal patterns (unlabelled): {total_candidates}")
    print(f"Appended {len(new_rows)} new rows to {out_path}")
    print()
    print("Now label the NEW rows (the ones with blank labels at the bottom of the CSV).")
    print("Most will be 'substantiated' given how they were sampled.")
    print("Set notes = 'verified' when you're satisfied with a label.")


if __name__ == "__main__":
    main()
