"""User schemas — hashed_password is NEVER included in any response."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    """Internal schema for creating a user record."""

    model_config = ConfigDict(from_attributes=True)

    email: EmailStr | None = None
    phone: str | None = None
    full_name: str | None = None
    hashed_password: str | None = None
    referral_code: str | None = None
    google_id: str | None = None


class UserResponse(BaseModel):
    """Safe public representation of a user — no sensitive fields."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str | None
    phone: str | None
    full_name: str | None
    profile_photo_url: str | None
    referral_code: str | None
    is_active: bool
    is_verified: bool
    is_admin: bool
    created_at: datetime


class UserProfile(BaseModel):
    """Detailed profile view including wallet balance snapshot."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str | None
    phone: str | None
    full_name: str | None
    profile_photo_url: str | None
    referral_code: str | None
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime


class UpdateProfileRequest(BaseModel):
    """Fields a user may update on their own profile."""

    model_config = ConfigDict(from_attributes=True)

    full_name: str | None = Field(default=None, max_length=255)
    profile_photo_url: str | None = Field(default=None, max_length=500)
    push_token: str | None = Field(default=None, max_length=500)
