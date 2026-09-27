from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.database.supabase_client import get_supabase_admin
from app.schemas.auth import CurrentUser, ProfileOut, ProfileUpsert
from app.services.audit_service import log_action

router = APIRouter()


@router.get("/me", response_model=ProfileOut)
async def get_me(user: CurrentUser = Depends(get_current_user)) -> ProfileOut:
    sb = get_supabase_admin()
    res = sb.table("profiles").select("*").eq("id", str(user.id)).limit(1).execute()
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Call POST /auth/profile.",
        )
    return ProfileOut(**res.data[0])


@router.post("/profile", response_model=ProfileOut)
async def upsert_profile(
    payload: ProfileUpsert,
    user: CurrentUser = Depends(get_current_user),
) -> ProfileOut:
    sb = get_supabase_admin()
    existing = (
        sb.table("profiles").select("*").eq("id", str(user.id)).limit(1).execute()
    )
    previous = existing.data[0] if existing.data else None

    row = {
        "id": str(user.id),
        "email": user.email,
        "full_name": payload.full_name,
        "organization": payload.organization,
    }

    if previous is None:
        row["role"] = "viewer"
        res = sb.table("profiles").insert(row).execute()
        action = "profile.create"
    else:
        patch = {k: v for k, v in row.items() if k not in ("id", "email")}
        res = sb.table("profiles").update(patch).eq("id", str(user.id)).execute()
        action = "profile.update"

    log_action(
        sb,
        user_id=user.id,
        action=action,
        entity_type="profile",
        entity_id=user.id,
        previous_value=previous,
        new_value=res.data[0] if res.data else None,
    )
    return ProfileOut(**res.data[0])