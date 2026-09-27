"""Reports endpoints."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.database.supabase_client import get_supabase_admin
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.get("")
async def list_reports(
    company_id: UUID | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
) -> dict:
    sb = get_supabase_admin()
    q = sb.table("esg_reports").select("*", count="exact")
    if company_id:
        q = q.eq("company_id", str(company_id))
    q = q.order("created_at", desc=True).limit(limit)
    res = q.execute()
    return {"items": res.data or [], "total": res.count or 0}


@router.get("/{report_id}")
async def get_report(report_id: UUID) -> dict:
    sb = get_supabase_admin()
    res = sb.table("esg_reports").select("*").eq("id", str(report_id)).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Report not found")
    return res.data[0]


@router.get("/{report_id}/claims")
async def list_claims(
    report_id: UUID,
    category: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
) -> dict:
    sb = get_supabase_admin()
    q = sb.table("esg_claims").select("*", count="exact").eq("report_id", str(report_id))
    if category:
        q = q.eq("category", category)
    q = q.order("claim_strength", desc=True).limit(limit)
    res = q.execute()
    return {"items": res.data or [], "total": res.count or 0}
