"""Explanation endpoints — SHAP and LIME for a given analysis."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.database.supabase_client import get_supabase_admin
from app.explainability.claim_explainer import explain_with_lime, explain_with_shap

router = APIRouter()


def _load_analysis_and_top_claim(analysis_id: UUID) -> tuple[dict, dict]:
    sb = get_supabase_admin()
    a_res = (
        sb.table("analyses").select("*").eq("id", str(analysis_id)).limit(1).execute()
    )
    if not a_res.data:
        raise HTTPException(status_code=404, detail="Analysis not found")
    analysis = a_res.data[0]

    c_res = (
        sb.table("esg_claims")
        .select("sentence, claim_strength")
        .eq("report_id", analysis["report_id"])
        .order("claim_strength", desc=True)
        .limit(1)
        .execute()
    )
    if not c_res.data:
        raise HTTPException(status_code=404, detail="No claims found for this analysis")
    return analysis, c_res.data[0]


@router.get("/{analysis_id}/shap")
async def shap_explanation(analysis_id: UUID) -> dict:
    _, claim = _load_analysis_and_top_claim(analysis_id)
    try:
        return explain_with_shap(claim["sentence"], top_k=10)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/{analysis_id}/lime")
async def lime_explanation(analysis_id: UUID) -> dict:
    _, claim = _load_analysis_and_top_claim(analysis_id)
    try:
        return explain_with_lime(claim["sentence"], top_k=10)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
