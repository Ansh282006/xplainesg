"""
ESG scoring configuration and pure functions. Versioned. No I/O.
"""
from __future__ import annotations

import statistics
from typing import Any

SCORING_VERSION = "baseline-v0"
GREENWASHING_VERSION = "greenwashing-v1"

ESG_WEIGHTS: dict[str, float] = {
    "environmental": 0.40,
    "social": 0.30,
    "governance": 0.30,
}

TRUST_WEIGHTS: dict[str, float] = {
    "performance": 0.70,
    "credibility": 0.30,
}

# Greenwashing composite weights (v1)
GREENWASHING_WEIGHTS: dict[str, float] = {
    "claim_vagueness": 0.40,          # from RF: mean P(unsubstantiated)
    "claim_indicator_divergence": 0.40,  # from divergence engine
    "indicator_strength": 0.20,        # weak ESG numbers = higher risk
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
    """Rule-based fallback when the trained model isn't available."""
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
        "version": SCORING_VERSION,
        "components": {
            "avg_claim_strength": round(avg_strength, 3),
            "evidence_ratio": round(evidence_ratio, 3),
            "greenwash_signal": round(greenwash_signal, 3),
            "category_imbalance": round(category_imbalance, 3),
        },
    }


def compute_greenwashing_v1(
    *,
    claim_vagueness: float | None,          # 0-1, from trained model
    divergence_score: float | None,         # 0-1, from divergence engine
    indicator_strength: float | None,       # 0-1, weak indicators = 1
    components_detail: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Composite greenwashing score v1.

    score = 0.4·vagueness + 0.4·divergence + 0.2·indicator_strength

    Components may be missing — we renormalise weights over available ones.
    """
    parts = {
        "claim_vagueness": (claim_vagueness, GREENWASHING_WEIGHTS["claim_vagueness"]),
        "claim_indicator_divergence": (divergence_score, GREENWASHING_WEIGHTS["claim_indicator_divergence"]),
        "indicator_strength": (indicator_strength, GREENWASHING_WEIGHTS["indicator_strength"]),
    }

    available = {k: v for k, (v, _) in parts.items() if v is not None}
    if not available:
        return {
            "risk": None,
            "score": None,
            "version": GREENWASHING_VERSION,
            "reason": "no_components_available",
        }

    weight_sum = sum(w for v, w in parts.values() if v is not None)
    score = sum(v * w for v, w in parts.values() if v is not None) / weight_sum

    if score >= RISK_HIGH_THRESHOLD:
        risk = "HIGH"
    elif score >= RISK_MEDIUM_THRESHOLD:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    return {
        "risk": risk,
        "score": round(score, 4),
        "version": GREENWASHING_VERSION,
        "components": {
            k: (round(v, 4) if v is not None else None)
            for k, (v, _) in parts.items()
        },
        "detail": components_detail or {},
    }


# ---------------------------------------------------------------------------
# Public indicator weakness helper (for /analysis/preview)
# ---------------------------------------------------------------------------
def compute_indicator_weakness_public(indicators: dict[str, Any]) -> dict[str, Any]:
    """
    Returns a 0-1 weakness score computed from user-supplied indicators.
    Higher = weaker ESG performance = more greenwashing risk.

    Transparent mapping:
      renewable_energy_percentage  -> 1 - pct/100
      board_independence           -> 1 - pct/100
      board_diversity              -> 1 - pct/100
      governance_score             -> 1 - score/100
      employee_turnover            -> turnover / 30, capped at 1.0
    """
    if not indicators:
        return {"score": None, "reason": "no_indicators", "signals": {}}

    signals: dict[str, float] = {}

    def _get(key):
        v = indicators.get(key)
        try:
            return float(v) if v is not None else None
        except (TypeError, ValueError):
            return None

    ren = _get("renewable_energy_percentage")
    if ren is not None:
        signals["renewable_energy_percentage"] = max(0.0, 1 - ren / 100.0)

    bi = _get("board_independence")
    if bi is not None:
        signals["board_independence"] = max(0.0, 1 - bi / 100.0)

    bd = _get("board_diversity")
    if bd is not None:
        signals["board_diversity"] = max(0.0, 1 - bd / 100.0)

    gs = _get("governance_score")
    if gs is not None:
        signals["governance_score"] = max(0.0, 1 - gs / 100.0)

    to = _get("employee_turnover")
    if to is not None and to > 0:
        signals["employee_turnover"] = min(1.0, to / 30.0)

    if not signals:
        return {"score": None, "reason": "no_recognised_fields", "signals": {}}

    score = round(sum(signals.values()) / len(signals), 4)
    return {
        "score": score,
        "rating": round(score * 10, 2),
        "signals": {k: round(v, 4) for k, v in signals.items()},
        "n_signals": len(signals),
    }
