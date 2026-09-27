"""
ESG scoring configuration and pure functions.
Versioned via SCORING_VERSION. All weights live here.
"""

from __future__ import annotations

import statistics
from typing import Any

SCORING_VERSION = "baseline-v0"

ESG_WEIGHTS: dict[str, float] = {
    "environmental": 0.40,
    "social": 0.30,
    "governance": 0.30,
}

TRUST_WEIGHTS: dict[str, float] = {
    "performance": 0.70,
    "credibility": 0.30,
}

RISK_HIGH_THRESHOLD = 0.50
RISK_MEDIUM_THRESHOLD = 0.25


def compute_claim_credibility(claims: list[dict[str, Any]]) -> dict[str, Any]:
    if not claims:
        return {"score": None, "components": {}, "reason": "no_claims"}

    strengths = [c["claim_strength"] for c in claims if c.get("claim_strength") is not None]
    avg_strength = statistics.fmean(strengths) if strengths else 0.0

    evidence_count = sum(1 for c in claims if c.get("evidence_available"))
    evidence_ratio = evidence_count / len(claims)

    categories_present = {c.get("category") for c in claims if c.get("category")}
    category_balance = len(categories_present) / 3.0

    raw = 0.40 * avg_strength + 0.35 * evidence_ratio + 0.25 * category_balance
    score = round(raw * 100, 2)

    return {
        "score": score,
        "components": {
            "avg_claim_strength": round(avg_strength, 3),
            "evidence_ratio": round(evidence_ratio, 3),
            "category_balance": round(category_balance, 3),
        },
        "claim_count": len(claims),
    }


def compute_esg_performance(indicators: dict[str, Any] | None) -> dict[str, Any]:
    if not indicators:
        return {"score": None, "reason": "no_indicators"}

    required_any = [
        "carbon_emissions", "renewable_energy_percentage",
        "employee_count", "board_independence", "governance_score",
    ]
    present = [k for k in required_any if indicators.get(k) is not None]

    if len(present) < 2:
        return {
            "score": None,
            "reason": "insufficient_indicators",
            "present": present,
            "required_min": 2,
        }

    return {
        "score": None,
        "reason": "scoring_not_implemented_in_baseline",
        "present": present,
    }


def compute_trust_score(
    performance_score: float | None,
    credibility_score: float | None,
) -> dict[str, Any]:
    if performance_score is None or credibility_score is None:
        return {
            "score": None,
            "reason": "missing_component",
            "performance_score": performance_score,
            "credibility_score": credibility_score,
        }
    raw = (
        TRUST_WEIGHTS["performance"] * performance_score +
        TRUST_WEIGHTS["credibility"] * credibility_score
    )
    return {"score": round(raw, 2)}


def classify_greenwashing_risk(
    claims: list[dict[str, Any]],
    indicators: dict[str, Any] | None,
) -> dict[str, Any]:
    if not claims:
        return {"risk": None, "score": None, "reason": "no_claims"}

    strengths = [c["claim_strength"] for c in claims if c.get("claim_strength") is not None]
    avg_strength = statistics.fmean(strengths) if strengths else 0.0

    evidence_count = sum(1 for c in claims if c.get("evidence_available"))
    evidence_ratio = evidence_count / len(claims)

    greenwash_signal = avg_strength * (1 - evidence_ratio)

    from collections import Counter
    cat_counts = Counter(c.get("category") for c in claims if c.get("category"))
    if cat_counts and sum(cat_counts.values()) > 0:
        total = sum(cat_counts.values())
        max_share = max(cat_counts.values()) / total
        category_imbalance = 1 - max_share
    else:
        category_imbalance = 0.0

    risk_score = 0.7 * greenwash_signal + 0.3 * category_imbalance

    if risk_score >= RISK_HIGH_THRESHOLD:
        risk = "HIGH"
    elif risk_score >= RISK_MEDIUM_THRESHOLD:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    return {
        "risk": risk,
        "score": round(risk_score, 4),
        "components": {
            "avg_claim_strength": round(avg_strength, 3),
            "evidence_ratio": round(evidence_ratio, 3),
            "greenwash_signal": round(greenwash_signal, 3),
            "category_imbalance": round(category_imbalance, 3),
        },
    }