"""Explanation endpoints — SHAP, LIME, factors, narrative, rating attribution."""
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
    sb = get_supabase_admin()

    a_res = (
        sb.table("analyses").select("*").eq("id", str(analysis_id)).limit(1).execute()
    )
    if not a_res.data:
        raise HTTPException(status_code=404, detail="Analysis not found")
    a = a_res.data[0]

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

    if divergence is not None and divergence < 0.15:
        parts.append(
            "The textual claims are largely consistent with disclosed indicators."
        )
    elif divergence is not None and divergence < 0.35:
        parts.append(
            "Some claims show minor divergence from disclosed indicators — typically "
            "where forward-looking targets are compared against current-year baselines."
        )
    elif divergence is not None:
        parts.append(
            "Claims and indicators diverge meaningfully. Several numeric claims do not "
            "align with the company's own disclosed ESG values — the primary signal we "
            "treat as potential greenwashing risk."
        )

    parts.append(
        "For ESG practitioners, this suggests prioritising verification of the highest-"
        "contributing factors above. This is an AI-generated research assessment, not "
        "a certified ESG audit or legal determination."
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


# ---------------------------------------------------------------------------
# NEW: Rating attribution — "Why this rating?"
# ---------------------------------------------------------------------------
@router.get("/{analysis_id}/rating-attribution")
async def rating_attribution(analysis_id: UUID) -> dict:
    """
    Decomposes the final 0-10 rating into its weighted components, with a
    waterfall of contributions and a sensitivity analysis.

    This is the primary view a reviewer / regulator uses to answer:
      "Why is the rating what it is, and what would change it?"
    """
    sb = get_supabase_admin()
    a_res = (
        sb.table("analyses").select("*").eq("id", str(analysis_id)).limit(1).execute()
    )
    if not a_res.data:
        raise HTTPException(status_code=404, detail="Analysis not found")
    a = a_res.data[0]

    fv = a.get("feature_vector") or {}
    gw = (fv.get("greenwashing_components") or {}) if isinstance(fv, dict) else {}

    rating = a.get("risk_rating")
    if rating is None and a.get("greenwashing_probability") is not None:
        rating = round(a["greenwashing_probability"] * 10, 2)

    # Weighted components — these match GREENWASHING_WEIGHTS in scoring.py
    WEIGHTS = {
        "claim_vagueness": 0.4,
        "claim_indicator_divergence": 0.4,
        "indicator_strength": 0.2,
    }

    LABELS = {
        "claim_vagueness": "Claim vagueness",
        "claim_indicator_divergence": "Claim-indicator divergence",
        "indicator_strength": "Indicator weakness",
    }

    DESCRIPTIONS = {
        "claim_vagueness":
            "How vague or unsubstantiated the report's language is, per the ML classifier.",
        "claim_indicator_divergence":
            "How far the report's numeric claims diverge from its own disclosed indicators.",
        "indicator_strength":
            "How weak the company's disclosed ESG indicators are in absolute terms.",
    }

    values = {
        "claim_vagueness": gw.get("claim_vagueness"),
        "claim_indicator_divergence": gw.get("claim_indicator_divergence"),
        "indicator_strength": gw.get("indicator_strength"),
    }

    available = {k: v for k, v in values.items() if v is not None}
    weight_sum = sum(WEIGHTS[k] for k in available) if available else 0.0

    contributions: list[dict] = []
    for key in ["claim_vagueness", "claim_indicator_divergence", "indicator_strength"]:
        v = values[key]
        if v is None or weight_sum == 0:
            contributions.append({
                "component": key,
                "label": LABELS[key],
                "description": DESCRIPTIONS[key],
                "value": None,
                "weight": WEIGHTS[key],
                "normalized_weight": None,
                "contribution": None,
                "available": False,
            })
            continue
        norm_w = WEIGHTS[key] / weight_sum
        contribution = v * norm_w * 10.0  # rescale to rating points
        contributions.append({
            "component": key,
            "label": LABELS[key],
            "description": DESCRIPTIONS[key],
            "value": round(v, 4),
            "weight": WEIGHTS[key],
            "normalized_weight": round(norm_w, 4),
            "contribution": round(contribution, 3),
            "available": True,
        })

    # Sensitivity: if each component were 0, what would the rating be?
    sensitivity: list[dict] = []
    if weight_sum > 0 and rating is not None:
        for key in ["claim_vagueness", "claim_indicator_divergence", "indicator_strength"]:
            if values.get(key) is None:
                continue
            other_sum = sum(
                values[k] * (WEIGHTS[k] / weight_sum)
                for k in values
                if k != key and values[k] is not None
            )
            new_rating = round(other_sum * 10, 3)
            sensitivity.append({
                "if_zero": LABELS[key],
                "new_rating": new_rating,
                "delta": round(new_rating - rating, 3),
            })

    # What if vagueness dropped to 0.30 (a common improvement scenario)?
    hypothetical = None
    if values.get("claim_vagueness") is not None and weight_sum > 0:
        improved_vagueness = 0.30
        other_contrib = sum(
            values[k] * (WEIGHTS[k] / weight_sum) * 10
            for k in values
            if k != "claim_vagueness" and values[k] is not None
        )
        improved = improved_vagueness * (WEIGHTS["claim_vagueness"] / weight_sum) * 10 + other_contrib
        hypothetical = {
            "scenario": "If claim vagueness dropped to 0.30 (industry median)",
            "new_rating": round(improved, 3),
            "current_rating": rating,
            "delta": round(improved - (rating or 0), 3),
        }

    return {
        "rating": rating,
        "formula": (
            "rating = 10 × [ "
            "0.4·vagueness + 0.4·divergence + 0.2·indicator_weakness "
            "] / Σ(weights of available components)"
        ),
        "contributions": contributions,
        "sensitivity": sensitivity,
        "hypothetical": hypothetical,
        "weights_config": WEIGHTS,
        "note": (
            "Contribution = component_value × normalized_weight × 10. "
            "Sum of contributions equals the final rating. "
            "Ratings reflect potential risk; they are not a determination of intent."
        ),
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
