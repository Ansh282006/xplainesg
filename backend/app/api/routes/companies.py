"""Companies endpoints — read from the company_overview view."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.database.supabase_client import get_supabase_admin
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.get("")
async def list_companies(
    q: str | None = Query(default=None, max_length=200),
    sector: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> dict:
    sb = get_supabase_admin()
    query = sb.table("company_overview").select("*", count="exact")
    if q:
        query = query.ilike("name", f"%{q}%")
    if sector:
        query = query.eq("sector", sector)
    query = query.order("name").range(offset, offset + limit - 1)
    res = query.execute()
    return {
        "items": res.data or [],
        "total": res.count or 0,
        "limit": limit,
        "offset": offset,
    }


@router.get("/{company_id}")
async def get_company(company_id: UUID) -> dict:
    sb = get_supabase_admin()
    res = (
        sb.table("company_overview")
        .select("*")
        .eq("id", str(company_id))
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Company not found")
    return res.data[0]
