"""FastAPI dependencies: JWT verification and role guards."""
from __future__ import annotations

from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.database.supabase_client import get_supabase_admin
from app.schemas.auth import CurrentUser, UserRole
from app.utils.logging import get_logger

logger = get_logger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)


def _resolve_profile(sb, user_id: str) -> dict:
    try:
        res = (
            sb.table("profiles")
            .select("role, full_name, organization")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        logger.warning("Profile lookup failed for %s: %s", user_id, exc)
        return {}
    return res.data[0] if res.data else {}


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    if creds is None or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    sb = get_supabase_admin()
    try:
        auth_res = sb.auth.get_user(creds.credentials)
    except Exception as exc:
        logger.info("Token verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = getattr(auth_res, "user", None)
    if user is None or not getattr(user, "id", None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    profile = _resolve_profile(sb, user.id)

    return CurrentUser(
        id=user.id,
        email=user.email,
        role=profile.get("role") or "viewer",
        full_name=profile.get("full_name"),
        organization=profile.get("organization"),
    )


def require_roles(*allowed: UserRole) -> Callable[..., CurrentUser]:
    async def _guard(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(allowed)}",
            )
        return user
    return _guard