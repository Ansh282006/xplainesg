from __future__ import annotations

from typing import Any

from supabase import Client

from app.core import scoring
from app.utils.logging import get_logger

logger = get_logger(__name__)


def _load_report(sb: Client, report_id: str) -> dict[str, Any]:
    res = sb.table("esg_reports").select("*").eq("id", report_id).limit(1).execute()
    if not res.data:
        raise LookupError(f"Report not found: {report_id}")
    return res.data[0]


def _load_claims(sb: Client, report_id: str) -> list[dict[str, Any]]:
    res = sb.table("esg_claims").select("*").eq("report_id", report_id).execute()
    return res.data or []


def _load_indicators(sb: Client, company_id: str, year: int) -> dict[str, Any] | None:
    res = (
        sb.table("esg_indicators")
        .select("*")
        .eq("company_id", company_id)
        .eq("year", year)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


def run_analysis(
    sb: Client,
    *,
    report_id: str,
    override_indicators: dict[str, Any] | None = None,
) -> dict[str, Any]:
    report = _load_report(sb, report_id)
    company_id = report["company_id"]
    year = report["report_year"]

    claims = _load_claims(sb, report_id)
    logger.info("Loaded %d claims for report %s", len(claims), report_id)

    indicators = override_indicators
    if indicators is None:
        indicators = _load_indicators(sb, company_id, year)

    credibility = scoring.compute_claim_credibility(claims)
    performance = scoring.compute_esg_performance(indicators)
    trust = scoring.compute_trust_score(
        performance_score=performance.get("score"),
        credibility_score=credibility.get("score"),
    )
    risk = scoring.classify_greenwashing_risk(claims, indicators)

    missing_data: dict[str, Any] = {}
    if performance.get("score") is None:
        missing_data["esg_performance"] = performance
    if trust.get("score") is None:
        missing_data["esg_trust"] = trust

    feature_vector = {
        "claim_count": len(claims),
        "credibility_components": credibility.get("components"),
        "risk_components": risk.get("components"),
    }

    row = {
        "company_id": company_id,
        "report_id": report_id,
        "model_version": scoring.SCORING_VERSION,
        "esg_performance_score": performance.get("score"),
        "esg_trust_score": trust.get("score"),
        "environmental_score": None,
        "social_score": None,
        "governance_score": None,
        "claim_credibility_score": credibility.get("score"),
        "greenwashing_risk": risk.get("risk"),
        "greenwashing_probability": risk.get("score"),
        "confidence_score": None,
        "status": "completed",
        "is_demo": False,
        "missing_data": missing_data or None,
        "feature_vector": feature_vector,
    }

    res = sb.table("analyses").insert(row).execute()
    analysis_row = res.data[0]
    logger.info(
        "Analysis %s: credibility=%s, trust=%s, risk=%s",
        analysis_row["id"],
        credibility.get("score"),
        trust.get("score"),
        risk.get("risk"),
    )

    return {
        "analysis": analysis_row,
        "scoring_version": scoring.SCORING_VERSION,
        "explanations": {
            "claim_credibility": credibility,
            "esg_performance": performance,
            "esg_trust": trust,
            "greenwashing_risk": risk,
        },
    }