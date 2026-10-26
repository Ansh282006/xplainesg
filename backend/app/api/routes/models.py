"""Model registry endpoint — reads ml/models/registry.json."""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

# Resolve to repo/ml/models/registry.json
_REPO_ROOT = Path(__file__).resolve().parents[4]
_REGISTRY_PATH = _REPO_ROOT / "ml" / "models" / "registry.json"


@router.get("")
async def list_models() -> dict:
    if not _REGISTRY_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                "Model registry not found. Train models with "
                "`python ml/training/train_claim_classifier.py`."
            ),
        )
    try:
        return json.loads(_REGISTRY_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.exception("Failed to parse registry: %s", exc)
        raise HTTPException(status_code=500, detail=f"Registry parse failed: {exc}") from exc
