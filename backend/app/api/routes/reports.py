"""Reports endpoints."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.core.divergence import compute_divergence
from app.database.supabase_client import get_supabase_admin
from app.nlp.claim_metric_parser import parse_claim_metric
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


@router.get("/{report_id}/claims-with-divergence")
async def list_claims_with_divergence(
    report_id: UUID,
    category: str | None = Query(default=None),
    limit: int = Query(default=300, ge=1, le=1000),
) -> dict:
    """
    Each claim annotated with its computed divergence vs the company's
    own disclosed indicators (from the report's year + prior year).
    """
    sb = get_supabase_admin()

    # Load report to know company + year
    r_res = (
        sb.table("esg_reports").select("*").eq("id", str(report_id)).limit(1).execute()
    )
    if not r_res.data:
        raise HTTPException(status_code=404, detail="Report not found")
    report = r_res.data[0]
    company_id = report["company_id"]
    year = report["report_year"]

    # Load indicators for both years
    ind_res = (
        sb.table("esg_indicators")
        .select("*")
        .eq("company_id", company_id)
        .in_("year", [year, year - 1])
        .execute()
    )
    ind_rows = ind_res.data or []
    current_ind = next((r for r in ind_rows if r["year"] == year), None)
    previous_ind = next((r for r in ind_rows if r["year"] == year - 1), None)

    # Load claims
    q = sb.table("esg_claims").select("*", count="exact").eq("report_id", str(report_id))
    if category:
        q = q.eq("category", category)
    q = q.order("claim_strength", desc=True).limit(limit)
    claims_res = q.execute()
    claims = claims_res.data or []

    # Enrich each claim with metric parse + divergence
    enriched = []
    for c in claims:
        sentence = (c.get("sentence") or "").strip()
        metric = parse_claim_metric(sentence) if sentence else None
        div_result = None
        if metric and metric.metric:
            div_result = compute_divergence(metric, current_ind, previous_ind)

        enriched.append({
            **c,
            "parsed_metric": metric.metric if metric else None,
            "parsed_value": metric.value_pct if metric else None,
            "parsed_claim_type": metric.claim_type if metric else None,
            "divergence": div_result.divergence if div_result else None,
            "divergence_interpretation": div_result.interpretation if div_result else None,
            "divergence_reliable": div_result.reliable if div_result else False,
            "divergence_actual": div_result.actual_pct if div_result else None,
        })

    return {"items": enriched, "total": claims_res.count or 0}
