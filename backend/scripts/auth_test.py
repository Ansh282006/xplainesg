"""Create-or-login a test user and print the JWT."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import get_settings
from supabase import create_client


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--email", required=True)
    p.add_argument("--password", required=True)
    p.add_argument("--full-name", default="Test User")
    args = p.parse_args()

    s = get_settings()
    client = create_client(s.supabase_url, s.supabase_service_role_key)

    try:
        client.auth.sign_up({
            "email": args.email,
            "password": args.password,
            "options": {"data": {"full_name": args.full_name}},
        })
        print("Signup OK (or user already existed)")
    except Exception as exc:
        print(f"Signup skipped: {exc}")

    res = client.auth.sign_in_with_password({
        "email": args.email,
        "password": args.password,
    })
    print()
    print("USER ID:", res.user.id if res.user else None)
    print("EMAIL:", res.user.email if res.user else None)
    print()
    print("ACCESS_TOKEN:")
    print(res.session.access_token if res.session else None)


if __name__ == "__main__":
    main()