from fastapi import APIRouter

from app.core.config import get_settings
from app.database.supabase_client import get_supabase_admin

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    """Liveness probe. Does not touch the database."""
    settings = get_settings()
    return {
        "status": "ok",
        "app_env": settings.app_env,
    }


@router.get("/health/db")
async def health_db() -> dict:
    """Readiness probe. Verifies Supabase connectivity."""
    sb = get_supabase_admin()
    try:
        # Touch a table that will exist after Point 6 (migrations).
        # If migrations aren't run yet, this will fail — that's expected
        # and the error is informative.
        sb.table("companies").select("id").limit(1).execute()
    except Exception as exc:
        return {
            "status": "degraded",
            "database": "unreachable",
            "error": str(exc),
        }
    return {"status": "ok", "database": "reachable"}