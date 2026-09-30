"""Dashboard endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user
from app.database.supabase_client import get_supabase_admin
from app.schemas.auth import CurrentUser
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.get("/stats")
async def dashboard_stats(
    _user: CurrentUser = Depends(get_current_user),
) -> dict:
    sb = get_supabase_admin()
    try:
        res = sb.rpc("get_dashboard_stats").execute()
        return res.data or {}
    except Exception as exc:
        logger.exception("get_dashboard_stats RPC failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Dashboard stats failed: {exc}") from exc


@router.get("/recent-analyses")
async def recent_analyses(
    limit: int = Query(default=10, ge=1, le=50),
    _user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Latest analyses with joined company name/ticker/sector."""
    sb = get_supabase_admin()

    analyses_res = (
        sb.table("analyses")
        .select(
            "id, company_id, report_id, model_version, esg_trust_score, "
            "esg_performance_score, claim_credibility_score, greenwashing_risk, "
            "greenwashing_probability, risk_rating, status, created_at"
        )
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    rows = analyses_res.data or []
    if not rows:
        return {"items": [], "total": 0}

    company_ids = list({r["company_id"] for r in rows if r.get("company_id")})
    comp_res = (
        sb.table("companies")
        .select("id, name, ticker, sector")
        .in_("id", company_ids)
        .execute()
    )
    companies = {c["id"]: c for c in (comp_res.data or [])}

    items = []
    for r in rows:
        company = companies.get(r.get("company_id")) or {}
        items.append({
            "id": r.get("id"),
            "company_id": r.get("company_id"),
            "company_name": company.get("name"),
            "ticker": company.get("ticker"),
            "sector": company.get("sector"),
            "model_version": r.get("model_version"),
            "esg_trust_score": r.get("esg_trust_score"),
            "claim_credibility_score": r.get("claim_credibility_score"),
            "greenwashing_risk": r.get("greenwashing_risk"),
            "greenwashing_probability": r.get("greenwashing_probability"),
            "risk_rating": r.get("risk_rating"),
            "status": r.get("status"),
            "created_at": r.get("created_at"),
        })

    return {"items": items, "total": len(items)}
