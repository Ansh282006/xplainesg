"""Audit log endpoints — restricted to admin / reviewer."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.deps import require_roles
from app.database.supabase_client import get_supabase_admin
from app.schemas.auth import CurrentUser

router = APIRouter()


@router.get("")
async def list_audit_logs(
    action: str | None = Query(default=None, max_length=100),
    entity_type: str | None = Query(default=None, max_length=50),
    limit: int = Query(default=100, ge=1, le=500),
    _user: CurrentUser = Depends(require_roles("admin", "reviewer")),
) -> dict:
    sb = get_supabase_admin()
    q = sb.table("audit_logs").select("*", count="exact")
    if action:
        q = q.eq("action", action)
    if entity_type:
        q = q.eq("entity_type", entity_type)
    q = q.order("timestamp", desc=True).limit(limit)
    res = q.execute()
    return {"items": res.data or [], "total": res.count or 0}
