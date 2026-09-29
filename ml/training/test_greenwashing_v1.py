"""Smoke test the new greenwashing pipeline."""
import sys
from pathlib import Path
sys.path.insert(0, "backend")

from app.database.supabase_client import get_supabase_admin
from app.services.analysis_service import run_analysis

sb = get_supabase_admin()

# Run on Infosys (has indicators)
infy = sb.table("companies").select("id").eq("ticker", "INFY").limit(1).execute().data[0]
infy_report = sb.table("esg_reports").select("id").eq("company_id", infy["id"]).limit(1).execute().data[0]

print("Running analysis on Infosys...")
result = run_analysis(sb, report_id=infy_report["id"])

a = result["analysis"]
print(f"model_version: {a['model_version']}")
print(f"greenwashing_risk: {a['greenwashing_risk']}")
print(f"greenwashing_probability: {a['greenwashing_probability']}")
print()
print("Greenwashing components:")
for k, v in (a.get("feature_vector", {}).get("greenwashing_components") or {}).items():
    print(f"  {k}: {v}")
print()
print(f"Evidence rows: {len(result['evidence_table'])}")
print()
print("Top 5 divergence cases:")
for e in result["evidence_table"][:5]:
    print(f"  [{e['metric']}] claimed={e['claimed_pct']} actual={e['actual_pct']} div={e['divergence']}")
    print(f"    {e['sentence'][:100]}")
