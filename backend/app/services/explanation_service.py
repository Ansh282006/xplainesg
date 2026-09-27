"""Persist SHAP/LIME explanations to the explanations table."""
from __future__ import annotations

from typing import Any

from supabase import Client

from app.utils.logging import get_logger

logger = get_logger(__name__)


def save_explanation(
    sb: Client,
    *,
    analysis_id: str,
    explanation_type: str,  # 'SHAP' or 'LIME'
    features: list[dict[str, Any]],
) -> int:
    """Insert one row per feature. Returns count inserted."""
    if not features:
        return 0

    rows = [
        {
            "analysis_id": analysis_id,
            "explanation_type": explanation_type,
            "feature_name": f["feature"],
            "feature_value": None,
            "contribution": f["contribution"],
            "direction": f["direction"] if f["direction"] in ("positive", "negative", "neutral") else (
                "positive" if f["direction"] == "unsubstantiated" else "negative"
            ),
            "explanation_text": None,
        }
        for f in features
    ]

    try:
        sb.table("explanations").insert(rows).execute()
        return len(rows)
    except Exception as exc:
        logger.error("Failed to persist explanations: %s", exc)
        return 0
