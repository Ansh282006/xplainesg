"""Pre-fill label suggestions for human review.

Rule used:
  evidence_available == True  -> substantiated
  evidence_available == False -> unsubstantiated

This is a SUGGESTION. Human reviewer must verify each row before training.
"""
import csv
from pathlib import Path

src = Path(r"C:\Users\anshb\Desktop\Hack\Project\xplainesg\ml\datasets\processed\claims_to_label.csv")

rows = []
with src.open("r", encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    for r in reader:
        # Only pre-fill if label is currently blank
        if not r.get("label", "").strip():
            has_numbers = str(r.get("evidence_available", "")).lower() == "true"
            r["label"] = "substantiated" if has_numbers else "unsubstantiated"
            r["notes"] = "auto-suggested"
        rows.append(r)

with src.open("w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fieldnames)
    w.writeheader()
    w.writerows(rows)

from collections import Counter
counts = Counter(r["label"] for r in rows)
print("Pre-filled labels:")
for k, v in counts.most_common():
    print(f"  {k}: {v}")
print(f"\nTotal: {len(rows)} rows")
print("\nNow OPEN the CSV and correct any wrong labels.")
print("When done, change 'notes' from 'auto-suggested' to 'verified' on rows you've checked.")
