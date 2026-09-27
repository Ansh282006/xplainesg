"""Full diagnostic — sign in + get_user + profile + ProfileOut."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from supabase import create_client
from app.core.config import get_settings
from app.database.supabase_client import get_supabase_admin

EMAIL = "analyst@xplainesg.local"
PASSWORD = "XplainESG2026!"

s = get_settings()

print("=" * 60)
print("STEP 1: Sign in")
client = create_client(s.supabase_url, s.supabase_service_role_key)
try:
    res = client.auth.sign_in_with_password({"email": EMAIL, "password": PASSWORD})
    token = res.session.access_token
    user_id = res.user.id
    print(f"  OK. user_id={user_id}")
    print(f"  token length={len(token)}")
except Exception as e:
    import traceback
    traceback.print_exc()
    sys.exit(1)

print()
print("=" * 60)
print("STEP 2: sb.auth.get_user(token)")
sb = get_supabase_admin()
try:
    r = sb.auth.get_user(token)
    print(f"  type: {type(r).__name__}")
    print(f"  public attrs: {[a for a in dir(r) if not a.startswith('_')][:20]}")
    u = getattr(r, "user", None)
    print(f"  .user type: {type(u).__name__}")
    print(f"  .user repr: {u!r}")
    if u is not None:
        print(f"  has .id: {hasattr(u, 'id')}")
        print(f"  has .email: {hasattr(u, 'email')}")
        if hasattr(u, 'id'):
            print(f"  .id = {u.id}")
        if hasattr(u, 'email'):
            print(f"  .email = {u.email}")
        if hasattr(u, 'model_dump'):
            try:
                print(f"  model_dump keys: {list(u.model_dump().keys())}")
            except Exception as e:
                print(f"  model_dump failed: {e}")
except Exception as e:
    import traceback
    traceback.print_exc()

print()
print("=" * 60)
print("STEP 3: profile lookup")
try:
    prof = sb.table("profiles").select("*").eq("id", user_id).execute()
    print(f"  rows: {len(prof.data)}")
    if prof.data:
        for k, v in prof.data[0].items():
            print(f"    {k}: {v!r}  (type={type(v).__name__})")
except Exception as e:
    import traceback
    traceback.print_exc()

print()
print("=" * 60)
print("STEP 4: ProfileOut validation")
try:
    from app.schemas.auth import ProfileOut
    p = ProfileOut(**prof.data[0])
    print(f"  OK: {p.model_dump()}")
except Exception as e:
    import traceback
    traceback.print_exc()

print()
print("=" * 60)
print("DONE")
