"""
Runtime loader for the trained claim classifier.

Loads the winning model from ml/models/{name}/model.joblib lazily on first use.
If the model file is missing, callers get None and should fall back to the
rule-based baseline. NEVER fabricate a probability.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import joblib

from app.core.config import get_settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

# The winner by CV F1 from ml/models/registry.json. Update this when a better
# model is trained. Kept as a constant so the choice is visible and auditable.
ACTIVE_MODEL_NAME = "tfidf-rf-v1"


def _model_dir() -> Path:
    settings = get_settings()
    # MODEL_PATH is ../ml/models relative to the backend working dir by default.
    base = Path(settings.model_path)
    if not base.is_absolute():
        base = (Path(__file__).resolve().parents[2] / base).resolve()
    return base


@lru_cache(maxsize=1)
def load_active_model():
    """Returns (pipeline, metadata) or (None, None) if unavailable."""
    model_dir = _model_dir() / ACTIVE_MODEL_NAME
    model_file = model_dir / "model.joblib"
    metrics_file = model_dir / "metrics.json"

    if not model_file.exists():
        logger.warning(
            "Trained model not found at %s — API will fall back to baseline-v0.",
            model_file,
        )
        return None, None

    pipeline = joblib.load(model_file)
    metadata = {}
    if metrics_file.exists():
        metadata = json.loads(metrics_file.read_text(encoding="utf-8"))

    logger.info(
        "Loaded model %s (F1=%.4f, AUC=%.4f)",
        ACTIVE_MODEL_NAME,
        metadata.get("f1_macro", 0.0),
        metadata.get("roc_auc", 0.0),
    )
    return pipeline, metadata


def predict_unsubstantiated_probabilities(sentences: list[str]) -> list[float]:
    """
    Given a list of claim sentences, return the model's probability that each
    is 'unsubstantiated'. Empty list on any failure.
    """
    pipeline, _ = load_active_model()
    if pipeline is None or not sentences:
        return []

    try:
        classes = list(pipeline.classes_)
        idx = classes.index("unsubstantiated")
    except (AttributeError, ValueError):
        logger.warning("Model does not expose expected classes.")
        return []

    try:
        proba = pipeline.predict_proba(sentences)
    except Exception as exc:
        logger.error("Model inference failed: %s", exc)
        return []

    return [float(p[idx]) for p in proba]
