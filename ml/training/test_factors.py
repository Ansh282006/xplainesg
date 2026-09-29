"""Test /factors and /narrative endpoints."""
import httpx
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.database.supabase_client import get_supabase_admin

sb = get_supabase_admin()
analysis = (
    sb.table("analyses")
    .select("id")
    .order("created_at", desc=True)
    .limit(1)
    .execute()
)
if not analysis.data:
    print("No analyses in DB")
    sys.exit(1)

aid = analysis.data[0]["id"]
print(f"Analysis ID: {aid}")
print()

# --- /factors ---
r = httpx.get(f"http://127.0.0.1:8000/explanations/{aid}/factors")
print("=== /factors ===")
print("Status:", r.status_code)
if r.status_code == 200:
    d = r.json()
    print(f"SHAP tokens: {d['shap_token_count']}, LIME tokens: {d['lime_token_count']}")
    print()
    print("Top SHAP factors:")
    for f in d["shap_factors"][:6]:
        print(f"  {f['label']:35s} {f['contribution']:+.4f}  {f['direction']}  ({f['n_tokens']} tokens)")
    print()
    print("Top LIME factors:")
    for f in d["lime_factors"][:6]:
        print(f"  {f['label']:35s} {f['contribution']:+.4f}  {f['direction']}  ({f['n_tokens']} tokens)")
else:
    print(r.text)

print()
print("=== /narrative ===")
r = httpx.get(f"http://127.0.0.1:8000/explanations/{aid}/narrative")
print("Status:", r.status_code)
if r.status_code == 200:
    d = r.json()
    print(f"Rating: {d['rating']}")
    print()
    print("Top factors:")
    for f in d["top_factors"]:
        print(f"  {f['label']:35s} {f['contribution']:+.4f}")
    print()
    print("Narrative:")
    print(d["narrative"])
else:
    print(r.text)
