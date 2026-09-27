from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

UserRole = Literal["admin", "analyst", "reviewer", "viewer"]


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: EmailStr
    full_name: str | None = None
    role: UserRole
    organization: str | None = None
    created_at: datetime


class ProfileUpsert(BaseModel):
    full_name: str | None = Field(default=None, max_length=200)
    organization: str | None = Field(default=None, max_length=200)


class CurrentUser(BaseModel):
    id: UUID
    email: EmailStr
    role: UserRole
    full_name: str | None = None
    organization: str | None = None