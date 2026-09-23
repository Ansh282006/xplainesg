from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_supabase_admin() -> Client:
    """
    Service-role Supabase client. Bypasses Row Level Security.

    NEVER return data obtained through this client to the frontend without an
    explicit authorisation check in the route/service layer.
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)