"""Review queue endpoint."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import require_roles
from app.database.supabase_client import get_supabase_admin
from app.schemas.auth import CurrentUser

router = APIRouter()


@router.get("/pending")
async def pending_reviews(
    _user: CurrentUser = Depends(require_roles("admin", "reviewer")),
) -> dict:
    sb = get_supabase_admin()
    # Fetch analyses with no human_reviews
    analyses_res = (
        sb.table("analyses")
        .select("id, company_id, esg_trust_score, greenwashing_risk, risk_rating, greenwashing_probability, created_at")
        .eq("status", "completed")
        .order("created_at", desc=True)
        .execute()
    )
    analyses = analyses_res.data or []

    reviewed_ids = set()
    if analyses:
        a_ids = [a["id"] for a in analyses]
        r_res = (
            sb.table("human_reviews").select("analysis_id").in_("analysis_id", a_ids).execute()
        )
        reviewed_ids = {r["analysis_id"] for r in (r_res.data or [])}

    pending = [a for a in analyses if a["id"] not in reviewed_ids]

    # Enrich with company name
    company_ids = list({a["company_id"] for a in pending if a.get("company_id")})
    companies = {}
    if company_ids:
        c_res = sb.table("companies").select("id, name, ticker").in_("id", company_ids).execute()
        companies = {c["id"]: c for c in (c_res.data or [])}

    items = []
    for a in pending:
        c = companies.get(a["company_id"]) or {}
        items.append({
            **a,
            "company_name": c.get("name"),
            "ticker": c.get("ticker"),
        })

    return {"items": items, "total": len(items)}