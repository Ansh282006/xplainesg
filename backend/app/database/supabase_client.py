from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_supabase_admin() -> Client:
    """Service-role Supabase client. Bypasses RLS. Never expose to frontend."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)