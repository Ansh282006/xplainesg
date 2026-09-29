import httpx, json, sys
from pathlib import Path
sys.path.insert(0, str(Path.cwd() / "backend"))

from app.database.supabase_client import get_supabase_admin

sb = get_supabase_admin()
aid = sb.table("analyses").select("id").order("created_at", desc=True).limit(1).execute().data[0]["id"]

r = httpx.get(f"http://127.0.0.1:8000/explanations/{aid}/rating-attribution")
print("Status:", r.status_code)
print(json.dumps(r.json(), indent=2))
