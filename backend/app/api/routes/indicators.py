from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user, require_roles
from app.database.supabase_client import get_supabase_admin
from app.schemas.auth import CurrentUser
from app.schemas.indicator import IndicatorCreate, IndicatorOut
from app.services import indicator_service
from app.services.audit_service import log_action

router = APIRouter()


@router.post("", response_model=IndicatorOut, status_code=status.HTTP_201_CREATED)
async def upsert_indicator(
    payload: IndicatorCreate,
    user: CurrentUser = Depends(require_roles("admin", "analyst")),
) -> IndicatorOut:
    sb = get_supabase_admin()
    row = indicator_service.upsert_indicator(sb, payload)
    log_action(
        sb,
        user_id=user.id,
        action="indicator.upsert",
        entity_type="esg_indicator",
        entity_id=row["id"],
        new_value=row,
    )
    return IndicatorOut(**row)


@router.get("/company/{company_id}", response_model=list[IndicatorOut])
async def list_indicators(
    company_id: UUID,
    user: CurrentUser = Depends(get_current_user),
) -> list[IndicatorOut]:
    sb = get_supabase_admin()
    rows = indicator_service.list_indicators(sb, str(company_id))
    return [IndicatorOut(**r) for r in rows]