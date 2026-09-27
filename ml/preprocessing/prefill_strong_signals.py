"""Pre-fill the blank rows (the ones from the strong-signal sample) as substantiated.

These rows were selected BY the strong-signal regex, so a substantiated guess is
correct most of the time. The human reviewer scans for false positives.

Common false positive sources:
  - Financial numbers dressed up as ESG ("revenue grew 15%", "share repurchase $40B")
  - Forward-looking prose that mentions a framework but makes no commitment
  - Boilerplate about being "guided by SASB" without specific metrics

Marked with notes='auto-strong-signal' so you know which rows to scrutinize.
"""
import csv
from pathlib import Path

src = Path(r"C:\Users\anshb\Desktop\Hack\Project\xplainesg\ml\datasets\processed\claims_to_label.csv")

rows = []
filled = 0
with src.open("r", encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    for r in reader:
        if not r.get("label", "").strip():
            r["label"] = "substantiated"
            r["notes"] = "auto-strong-signal"
            filled += 1
        rows.append(r)

with src.open("w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fieldnames)
    w.writeheader()
    w.writerows(rows)

from collections import Counter
counts = Counter(r["label"] for r in rows)
print(f"Pre-filled {filled} blank rows with 'substantiated'")
print()
print("Current distribution:")
for k, v in counts.most_common():
    print(f"  {k}: {v}")
print(f"\nTotal: {len(rows)}")

# Show the 20 longest unsubstantiated + 10 shortest substantiated for QC
print()
print("=== Sanity check: 10 random substantiated (auto-strong-signal) sentences ===")
import random
random.seed(42)
subst_auto = [r for r in rows if r["notes"] == "auto-strong-signal"]
for r in random.sample(subst_auto, min(10, len(subst_auto))):
    print(f"  [{r['company'][:15]:15s}] {r['sentence'][:130]}")
