"""Divergence v2 — 3-case logic with reliable/gap distinction."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.nlp.claim_metric_parser import ClaimMetric


@dataclass(frozen=True)
class DivergenceResult:
    metric: str
    claimed_pct: float | None
    actual_pct: float | None
    divergence: float
    interpretation: str
    reliable: bool


def compute_divergence(
    claim: ClaimMetric,
    current_indicator: dict[str, Any] | None,
    previous_indicator: dict[str, Any] | None,
) -> DivergenceResult | None:
    if claim.metric is None:
        return None

    curr = (current_indicator or {}).get(claim.metric)
    prev = (previous_indicator or {}).get(claim.metric)

    # Case: no current value → gap
    if curr is None:
        if claim.value_pct is None:
            # claim mentions metric without a number and no indicator → weak gap
            return None
        return DivergenceResult(
            metric=claim.metric,
            claimed_pct=claim.value_pct,
            actual_pct=None,
            divergence=0.4,
            interpretation="metric_not_disclosed_by_company",
            reliable=False,
        )

    # Case: current only, no previous → partial gap (needs prior year)
    if prev is None or prev == 0:
        if claim.value_pct is None:
            return None
        return DivergenceResult(
            metric=claim.metric,
            claimed_pct=claim.value_pct,
            actual_pct=None,
            divergence=0.3,
            interpretation="no_prior_year_baseline",
            reliable=False,
        )

    # Case: full computation
    try:
        actual_pct = (float(curr) - float(prev)) / abs(float(prev))
    except (TypeError, ValueError, ZeroDivisionError):
        return None

    if claim.value_pct is None:
        # Claim mentions the metric, has current+prior indicators, but the
        # claim itself makes no numeric promise → not a divergence case
        return None

    diff = abs(claim.value_pct - actual_pct)
    divergence = min(diff / 0.5, 1.0)

    if (claim.value_pct < 0) != (actual_pct < 0):
        divergence = min(divergence + 0.15, 1.0)

    if divergence < 0.15:
        interp = "Claim consistent with indicator"
    elif divergence < 0.35:
        interp = "Minor divergence — claim slightly overstates"
    elif divergence < 0.65:
        interp = "Moderate divergence — claim overstates meaningfully"
    else:
        interp = "High divergence — claim contradicted by indicator"

    return DivergenceResult(
        metric=claim.metric,
        claimed_pct=round(claim.value_pct, 4),
        actual_pct=round(actual_pct, 4),
        divergence=round(divergence, 3),
        interpretation=interp,
        reliable=True,
    )


def aggregate_divergence(results: list[DivergenceResult]) -> dict[str, Any]:
    if not results:
        return {
            "score": None,
            "count": 0,
            "reliable_count": 0,
            "reason": "no_divergence_results",
        }

    reliable = [r for r in results if r.reliable]
    gaps = [r for r in results if not r.reliable and r.interpretation in (
        "metric_not_disclosed_by_company",
    )]

    # If we have NO reliable divergences, we cannot compute a real score.
    # Report the gap count but return score=None so the composite formula
    # can renormalise its weights honestly.
    if not reliable:
        return {
            "score": None,
            "count": len(results),
            "reliable_count": 0,
            "verifiability_gaps": len(gaps),
            "mean_reliable_divergence": None,
            "gap_ratio": round(len(gaps) / len(results), 4) if results else 0.0,
            "reason": "no_reliable_divergence_all_gaps",
        }

    mean_div = sum(r.divergence for r in reliable) / len(reliable)
    gap_ratio = len(gaps) / len(results) if results else 0.0

    score = round(0.6 * mean_div + 0.4 * gap_ratio, 4)

    return {
        "score": score,
        "count": len(results),
        "reliable_count": len(reliable),
        "verifiability_gaps": len(gaps),
        "mean_reliable_divergence": round(mean_div, 4),
        "gap_ratio": round(gap_ratio, 4),
    }
