"""Dashboard endpoint — calls the get_dashboard_stats() RPC."""
from fastapi import APIRouter, HTTPException

from app.database.supabase_client import get_supabase_admin
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.get("/stats")
async def dashboard_stats() -> dict:
    sb = get_supabase_admin()
    try:
        res = sb.rpc("get_dashboard_stats").execute()
        return res.data or {}
    except Exception as exc:
        logger.exception("get_dashboard_stats RPC failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Dashboard stats failed: {exc}") from exc
