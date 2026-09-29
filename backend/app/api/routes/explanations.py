"""Explanation endpoints — SHAP, LIME, factor aggregation, and narrative."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.database.supabase_client import get_supabase_admin
from app.explainability.claim_explainer import explain_with_lime, explain_with_shap
from app.explainability.esg_factors import (
    all_factor_labels,
    aggregate_features_to_factors,
)

router = APIRouter()


def _load_analysis_and_top_claim(analysis_id: UUID):
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


@router.get("/{analysis_id}/persisted")
async def list_explanations(analysis_id: UUID) -> dict:
    sb = get_supabase_admin()
    res = (
        sb.table("explanations")
        .select("*")
        .eq("analysis_id", str(analysis_id))
        .execute()
    )
    return {"items": res.data or [], "total": len(res.data or [])}


@router.get("/{analysis_id}/factors")
async def factor_contributions(analysis_id: UUID) -> dict:
    """
    Reads persisted SHAP + LIME rows for the analysis, groups them by
    one of the 10 real ESG factors, returns aggregated contributions.
    """
    sb = get_supabase_admin()
    res = (
        sb.table("explanations")
        .select("*")
        .eq("analysis_id", str(analysis_id))
        .execute()
    )
    rows = res.data or []

    by_type: dict[str, list[dict]] = {"SHAP": [], "LIME": []}
    for r in rows:
        t = r.get("explanation_type")
        if t not in by_type:
            continue
        by_type[t].append(
            {
                "feature": r.get("feature_name"),
                "contribution": r.get("contribution") or 0.0,
                "direction": r.get("direction"),
            }
        )

    shap_factors = aggregate_features_to_factors(by_type["SHAP"])
    lime_factors = aggregate_features_to_factors(by_type["LIME"])

    return {
        "all_factors": all_factor_labels(),
        "shap_factors": shap_factors,
        "lime_factors": lime_factors,
        "shap_token_count": len(by_type["SHAP"]),
        "lime_token_count": len(by_type["LIME"]),
    }


@router.get("/{analysis_id}/narrative")
async def research_narrative(analysis_id: UUID) -> dict:
    """
    Auto-generates a research-style narrative from real analysis data:
    scores, top divergences, and factor contributions.
    """
    sb = get_supabase_admin()

    a_res = (
        sb.table("analyses").select("*").eq("id", str(analysis_id)).limit(1).execute()
    )
    if not a_res.data:
        raise HTTPException(status_code=404, detail="Analysis not found")
    a = a_res.data[0]

    # Factor contributions
    f_res = (
        sb.table("explanations")
        .select("*")
        .eq("analysis_id", str(analysis_id))
        .execute()
    )
    feats = [
        {
            "feature": r.get("feature_name"),
            "contribution": r.get("contribution") or 0.0,
            "direction": r.get("direction"),
        }
        for r in (f_res.data or [])
    ]
    factors = aggregate_features_to_factors(feats)
    top_factors = factors[:3]

    # Greenwashing components (if stored in feature_vector)
    fv = a.get("feature_vector") or {}
    gw = (fv.get("greenwashing_components") or {}) if isinstance(fv, dict) else {}
    vagueness = gw.get("claim_vagueness")
    divergence = gw.get("claim_indicator_divergence")
    weakness = gw.get("indicator_strength")

    rating = a.get("risk_rating")
    if rating is None and a.get("greenwashing_probability") is not None:
        rating = round(a["greenwashing_probability"] * 10, 2)

    claim_count = fv.get("claim_count") if isinstance(fv, dict) else None
    credibility = a.get("claim_credibility_score")

    # --- Build narrative -------------------------------------------------
    parts: list[str] = []

    if rating is not None:
        band = "LOW" if rating < 3 else "MEDIUM" if rating < 6 else "HIGH"
        parts.append(
            f"This analysis produces a greenwashing risk rating of {rating:.2f}/10 "
            f"({band} risk), derived from {claim_count or 'the'} extracted ESG claims "
            f"and a claim-credibility score of {credibility if credibility is not None else 'N/A'}."
        )

    if any(v is not None for v in (vagueness, divergence, weakness)):
        bits = []
        if vagueness is not None:
            bits.append(f"claim vagueness {vagueness:.2f}")
        if divergence is not None:
            bits.append(f"claim-vs-indicator divergence {divergence:.2f}")
        if weakness is not None:
            bits.append(f"indicator weakness {weakness:.2f}")
        parts.append("Three weighted components drive this rating: " + ", ".join(bits) + ".")

    if top_factors:
        factor_lines = []
        for f in top_factors:
            direction_word = "toward unsubstantiated" if f["direction"] == "unsubstantiated" else "toward substantiated"
            factor_lines.append(
                f"{f['label']} (contribution {f['contribution']:+.3f}, pushing {direction_word})"
            )
        parts.append(
            "The most influential ESG factors in this analysis are: "
            + "; ".join(factor_lines)
            + "."
        )

    # Divergence-based finding
    if divergence is not None and divergence < 0.15:
        parts.append(
            "The textual claims are largely consistent with disclosed indicators — "
            "numeric values in the report match the structured ESG data for the "
            "metrics we could compare."
        )
    elif divergence is not None and divergence < 0.35:
        parts.append(
            "Some claims show minor divergence from disclosed indicators — these "
            "typically occur where forward-looking targets (e.g. 2030 commitments) "
            "are compared against current-year baselines."
        )
    elif divergence is not None:
        parts.append(
            "Claims and indicators diverge meaningfully. Several numeric claims in "
            "the report do not align with the company's own disclosed ESG values, "
            "which is the primary signal we treat as potential greenwashing risk."
        )

    parts.append(
        "For ESG practitioners, this suggests prioritising verification of the "
        "highest-contributing factors above when reviewing the report: cross-check "
        "the claim text against the corresponding BRSR / GRI table before drawing "
        "any conclusions. This is an AI-generated research assessment, not a "
        "certified ESG audit or a legal determination."
    )

    return {
        "narrative": " ".join(parts),
        "rating": rating,
        "top_factors": top_factors,
        "components": {
            "claim_vagueness": vagueness,
            "claim_indicator_divergence": divergence,
            "indicator_weakness": weakness,
        },
    }


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
