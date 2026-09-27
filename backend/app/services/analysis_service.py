"""Orchestrates a single analysis run: claims -> scores -> analyses row -> explanations."""
from __future__ import annotations

from typing import Any

from supabase import Client

from app.core import scoring
from app.explainability.claim_explainer import explain_with_lime, explain_with_shap
from app.ml.claim_classifier import load_active_model, predict_unsubstantiated_probabilities
from app.services.explanation_service import save_explanation
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


def _classifier_risk(claims: list[dict[str, Any]]) -> dict[str, Any] | None:
    pipeline, metadata = load_active_model()
    if pipeline is None or not claims:
        return None

    sentences = [c.get("sentence") or "" for c in claims]
    probs = predict_unsubstantiated_probabilities(sentences)
    if not probs or len(probs) != len(claims):
        return None

    weights = [max(float(c.get("claim_strength") or 0.0), 0.01) for c in claims]
    total_weight = sum(weights)
    if total_weight <= 0:
        return None

    weighted_mean = sum(p * w for p, w in zip(probs, weights)) / total_weight

    if weighted_mean >= scoring.RISK_HIGH_THRESHOLD:
        risk = "HIGH"
    elif weighted_mean >= scoring.RISK_MEDIUM_THRESHOLD:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    return {
        "model": metadata.get("model") if metadata else "unknown",
        "metadata": {
            "f1_macro": metadata.get("f1_macro") if metadata else None,
            "roc_auc": metadata.get("roc_auc") if metadata else None,
            "trained_at": metadata.get("trained_at") if metadata else None,
        },
        "weighted_probability": round(weighted_mean, 4),
        "risk": risk,
        "n_claims": len(claims),
        "per_claim_mean": round(sum(probs) / len(probs), 4),
    }


def _persist_explanations(
    sb: Client,
    analysis_id: str,
    claims: list[dict[str, Any]],
    top_n: int = 2,
) -> dict[str, int]:
    """Best-effort: persist SHAP and LIME for the top-N highest-strength claims."""
    counts = {"SHAP": 0, "LIME": 0}
    top_claims = sorted(
        claims, key=lambda c: float(c.get("claim_strength") or 0.0), reverse=True
    )[:top_n]

    for claim in top_claims:
        text = (claim.get("sentence") or "").strip()
        if not text:
            continue

        for kind, fn in (("SHAP", explain_with_shap), ("LIME", explain_with_lime)):
            try:
                out = fn(text, top_k=8)
                feats = out.get("features") or []
                counts[kind] += save_explanation(
                    sb,
                    analysis_id=analysis_id,
                    explanation_type=kind,
                    features=feats,
                )
            except Exception as exc:
                logger.warning("%s persistence skipped: %s", kind, exc)
    return counts


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

    classifier = _classifier_risk(claims)
    if classifier is not None:
        risk = {
            "risk": classifier["risk"],
            "score": classifier["weighted_probability"],
            "source": "trained_model",
            "model": classifier["model"],
            "components": {
                "weighted_mean_unsubstantiated": classifier["weighted_probability"],
                "unweighted_mean_unsubstantiated": classifier["per_claim_mean"],
                "n_claims": classifier["n_claims"],
                "model_metrics": classifier["metadata"],
            },
        }
        scoring_version = classifier["model"]
    else:
        risk = scoring.classify_greenwashing_risk(claims, indicators)
        risk["source"] = "baseline_rule"
        scoring_version = scoring.SCORING_VERSION

    missing_data: dict[str, Any] = {}
    if performance.get("score") is None:
        missing_data["esg_performance"] = performance
    if trust.get("score") is None:
        missing_data["esg_trust"] = trust

    feature_vector = {
        "claim_count": len(claims),
        "credibility_components": credibility.get("components"),
        "risk_components": risk.get("components"),
        "risk_source": risk.get("source"),
    }

    row = {
        "company_id": company_id,
        "report_id": report_id,
        "model_version": scoring_version,
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
        "Analysis %s via %s: credibility=%s, risk=%s, prob=%s",
        analysis_row["id"],
        scoring_version,
        credibility.get("score"),
        risk.get("risk"),
        risk.get("score"),
    )

    # --- Persist explanations (best-effort, does not affect the analysis row) ---
    if claims:
        try:
            counts = _persist_explanations(sb, analysis_row["id"], claims, top_n=2)
            logger.info(
                "Persisted explanations for %s: SHAP=%d, LIME=%d rows",
                analysis_row["id"], counts["SHAP"], counts["LIME"],
            )
        except Exception as exc:
            logger.warning("Explanation persistence failed: %s", exc)

    return {
        "analysis": analysis_row,
        "scoring_version": scoring_version,
        "explanations": {
            "claim_credibility": credibility,
            "esg_performance": performance,
            "esg_trust": trust,
            "greenwashing_risk": risk,
        },
    }
