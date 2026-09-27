"""Diagnostic: figure out why /auth/me returns 500."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database.supabase_client import get_supabase_admin

# 1. Get a fresh token
import subprocess
out = subprocess.run(
    ["python", "scripts/auth_test.py",
     "--email", "analyst@xplainesg.local",
     "--password", "XplainESG2026!",
     "--full-name", "Test Analyst"],
    capture_output=True, text=True,
).stdout

token = None
for line in out.splitlines():
    if line.startswith("eyJ"):
        token = line.strip()
        break

print("=" * 60)
print("TOKEN:", "found, length=" + str(len(token)) if token else "NOT FOUND")
if not token:
    print(out)
    sys.exit(1)

sb = get_supabase_admin()

# 2. Try get_user
print("=" * 60)
print("STEP: sb.auth.get_user(token)")
try:
    res = sb.auth.get_user(token)
    print("  type:", type(res).__name__)
    print("  dir has .user?:", hasattr(res, "user"))
    user = getattr(res, "user", None)
    print("  user is None?:", user is None)
    if user:
        print("  user.id:", user.id)
        print("  user.email:", user.email)
except Exception as e:
    print("  FAILED:", type(e).__name__, "-", e)
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 3. Look up profile
print("=" * 60)
print("STEP: profiles lookup")
uid = getattr(user, "id", None) if user else None
if not uid:
    print("  No user.id — cannot continue")
    sys.exit(1)

try:
    prof = sb.table("profiles").select("*").eq("id", str(uid)).limit(1).execute()
    print("  data:", prof.data)
    if prof.data:
        row = prof.data[0]
        print("  row keys:", list(row.keys()))
        for k, v in row.items():
            print(f"    {k}: {v!r} (type={type(v).__name__})")
except Exception as e:
    print("  FAILED:", type(e).__name__, "-", e)
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 4. Try to construct ProfileOut like the endpoint does
print("=" * 60)
print("STEP: build ProfileOut")
try:
    from app.schemas.auth import ProfileOut
    p = ProfileOut(**prof.data[0])
    print("  OK:", p.model_dump())
except Exception as e:
    print("  FAILED:", type(e).__name__, "-", e)
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("=" * 60)
print("ALL STEPS PASSED — /auth/me should work")
