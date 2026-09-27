from fastapi import APIRouter

from app.core.config import get_settings
from app.database.supabase_client import get_supabase_admin

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    settings = get_settings()
    return {"status": "ok", "app_env": settings.app_env}


@router.get("/health/db")
async def health_db() -> dict:
    sb = get_supabase_admin()
    try:
        sb.table("companies").select("id").limit(1).execute()
    except Exception as exc:
        return {"status": "degraded", "database": "unreachable", "error": str(exc)}
    return {"status": "ok", "database": "reachable"}