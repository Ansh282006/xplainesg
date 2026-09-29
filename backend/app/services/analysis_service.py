"""Analysis pipeline: claims + indicators -> divergence -> scores -> analysis row."""
from __future__ import annotations

from typing import Any

from supabase import Client

from app.core import scoring
from app.core.divergence import aggregate_divergence, compute_divergence
from app.explainability.claim_explainer import explain_with_lime, explain_with_shap
from app.ml.claim_classifier import load_active_model, predict_unsubstantiated_probabilities
from app.nlp.claim_metric_parser import parse_claim_metric
from app.services.explanation_service import save_explanation
from app.utils.logging import get_logger

logger = get_logger(__name__)


def _load_report(sb, report_id):
    res = sb.table("esg_reports").select("*").eq("id", report_id).limit(1).execute()
    if not res.data:
        raise LookupError(f"Report not found: {report_id}")
    return res.data[0]


def _load_claims(sb, report_id):
    res = sb.table("esg_claims").select("*").eq("report_id", report_id).execute()
    return res.data or []


def _load_indicators_for_years(sb, company_id, year):
    res = (
        sb.table("esg_indicators")
        .select("*")
        .eq("company_id", company_id)
        .in_("year", [year, year - 1])
        .execute()
    )
    rows = res.data or []
    current = next((r for r in rows if r["year"] == year), None)
    previous = next((r for r in rows if r["year"] == year - 1), None)
    return current, previous


def _indicator_strength(indicators):
    if not indicators:
        return None
    signals = []
    ren = indicators.get("renewable_energy_percentage")
    if ren is not None:
        signals.append(max(0.0, 1 - float(ren) / 100.0))
    bi = indicators.get("board_independence")
    if bi is not None:
        signals.append(max(0.0, 1 - float(bi) / 100.0))
    bd = indicators.get("board_diversity")
    if bd is not None:
        signals.append(max(0.0, 1 - float(bd) / 100.0))
    turnover = indicators.get("employee_turnover")
    if turnover is not None and turnover > 0:
        signals.append(min(1.0, float(turnover) / 30.0))
    if not signals:
        return None
    return round(sum(signals) / len(signals), 4)


def _claim_vagueness(claims):
    pipeline, metadata = load_active_model()
    if pipeline is None or not claims:
        return None, {"reason": "model_unavailable"}
    sentences = [c.get("sentence") or "" for c in claims]
    probs = predict_unsubstantiated_probabilities(sentences)
    if not probs or len(probs) != len(claims):
        return None, {"reason": "inference_failed"}
    weights = [max(float(c.get("claim_strength") or 0.0), 0.01) for c in claims]
    tw = sum(weights)
    if tw <= 0:
        return None, {"reason": "no_weights"}
    wm = sum(p * w for p, w in zip(probs, weights)) / tw
    return round(wm, 4), {
        "model": metadata.get("model") if metadata else "unknown",
        "n_claims": len(claims),
        "unweighted_mean": round(sum(probs) / len(probs), 4),
        "model_metrics": {
            "f1_macro": metadata.get("f1_macro") if metadata else None,
            "roc_auc": metadata.get("roc_auc") if metadata else None,
        },
    }


def _build_evidence_table(claims, current_indicator, previous_indicator):
    """
    For each claim, parse its metric.
    STRICT: only keep claims where parser found a metric + quantity
    (confidence >= 0.5).
    """
    results = []
    evidence = []
    for c in claims:
        text = (c.get("sentence") or "").strip()
        if not text:
            continue
        metric = parse_claim_metric(text)
        if metric.metric is None or metric.confidence < 0.5:
            continue
        div = compute_divergence(metric, current_indicator, previous_indicator)
        if div is None:
            continue
        results.append(div)
        evidence.append({
            "claim_id": c.get("id"),
            "sentence": text,
            "page_number": c.get("page_number"),
            "claim_type": c.get("claim_type"),
            "metric": div.metric,
            "direction": metric.direction,
            "claimed_pct": div.claimed_pct,
            "actual_pct": div.actual_pct,
            "divergence": div.divergence,
            "interpretation": div.interpretation,
            "reliable": div.reliable,
        })
    evidence.sort(key=lambda e: e["divergence"], reverse=True)
    return evidence, results


def _persist_explanations(sb, analysis_id, claims, top_n=2):
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
                counts[kind] += save_explanation(
                    sb, analysis_id=analysis_id,
                    explanation_type=kind, features=out.get("features") or [],
                )
            except Exception as exc:
                logger.warning("%s persistence skipped: %s", kind, exc)
    return counts


def run_analysis(sb, *, report_id, override_indicators=None):
    report = _load_report(sb, report_id)
    company_id = report["company_id"]
    year = report["report_year"]

    claims = _load_claims(sb, report_id)
    logger.info("Loaded %d claims for report %s", len(claims), report_id)

    if override_indicators is not None:
        current_indicator = override_indicators
        previous_indicator = None
    else:
        current_indicator, previous_indicator = _load_indicators_for_years(
            sb, company_id, year
        )

    credibility = scoring.compute_claim_credibility(claims)
    performance = scoring.compute_esg_performance(current_indicator)
    trust = scoring.compute_trust_score(
        performance_score=performance.get("score"),
        credibility_score=credibility.get("score"),
    )

    vagueness, vagueness_detail = _claim_vagueness(claims)
    evidence_table, divergence_results = _build_evidence_table(
        claims, current_indicator, previous_indicator
    )
    divergence_agg = aggregate_divergence(divergence_results)
    indicator_weakness = _indicator_strength(current_indicator)

    greenwashing = scoring.compute_greenwashing_v1(
        claim_vagueness=vagueness,
        divergence_score=divergence_agg.get("score"),
        indicator_strength=indicator_weakness,
        components_detail={
            "vagueness": vagueness_detail,
            "divergence": divergence_agg,
            "indicator_weakness": indicator_weakness,
        },
    )
    if greenwashing.get("score") is None:
        fallback = scoring.classify_greenwashing_risk(claims, current_indicator)
        fallback["source"] = "baseline_rule"
        greenwashing = fallback
    else:
        greenwashing["source"] = "greenwashing-v1"

    scoring_version = greenwashing.get("version") or scoring.SCORING_VERSION

    missing_data: dict[str, Any] = {}
    if performance.get("score") is None:
        missing_data["esg_performance"] = performance
    if trust.get("score") is None:
        missing_data["esg_trust"] = trust
    if not current_indicator:
        missing_data["indicators"] = "no_indicator_row_for_year"
    if not previous_indicator:
        missing_data["previous_year_indicators"] = "no_prior_year_row"

    feature_vector = {
        "claim_count": len(claims),
        "credibility_components": credibility.get("components"),
        "greenwashing_components": greenwashing.get("components"),
        "greenwashing_source": greenwashing.get("source"),
        "divergence_components": divergence_agg,
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
        "greenwashing_risk": greenwashing.get("risk"),
        "greenwashing_probability": greenwashing.get("score"),
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
        analysis_row["id"], scoring_version,
        credibility.get("score"), greenwashing.get("risk"), greenwashing.get("score"),
    )

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
            "greenwashing_risk": greenwashing,
        },
        "evidence_table": evidence_table[:50],
        "evidence_summary": divergence_agg,
    }
