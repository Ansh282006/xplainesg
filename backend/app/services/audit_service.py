from __future__ import annotations

from typing import Any
from uuid import UUID

from supabase import Client

from app.utils.logging import get_logger

logger = get_logger(__name__)


def log_action(
    sb: Client,
    *,
    user_id: UUID | str | None,
    action: str,
    entity_type: str | None = None,
    entity_id: UUID | str | None = None,
    previous_value: dict[str, Any] | None = None,
    new_value: dict[str, Any] | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    payload = {
        "user_id": str(user_id) if user_id else None,
        "action": action,
        "entity_type": entity_type,
        "entity_id": str(entity_id) if entity_id else None,
        "previous_value": previous_value,
        "new_value": new_value,
        "metadata": metadata or {},
    }
    try:
        sb.table("audit_logs").insert(payload).execute()
    except Exception as exc:
        logger.error("Audit log write failed for action=%s: %s", action, exc)