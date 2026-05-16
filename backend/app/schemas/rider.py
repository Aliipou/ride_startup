"""Rider schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.rider import ApprovalStatus, BikeType, RiderStatus


class RiderResponse(BaseModel):
    """Public rider profile."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    status: RiderStatus
    approval_status: ApprovalStatus
    bike_type: BikeType
    current_lat: float | None
    current_lng: float | None
    total_rides: int
    average_rating: float
    total_earnings: float
    pending_earnings: float
    stripe_account_id: str | None
    rejection_reason: str | None
    created_at: datetime
    updated_at: datetime


class RiderLocationUpdate(BaseModel):
    """GPS location ping from a rider."""

    model_config = ConfigDict(from_attributes=True)

    lat: float = Field(ge=-90.0, le=90.0)
    lng: float = Field(ge=-180.0, le=180.0)


class RiderStatusUpdate(BaseModel):
    """Toggle a rider between OFFLINE / ONLINE."""

    model_config = ConfigDict(from_attributes=True)

    status: RiderStatus


class RiderApprovalRequest(BaseModel):
    """Admin approval or rejection payload."""

    model_config = ConfigDict(from_attributes=True)

    rejection_reason: str | None = Field(default=None, max_length=500)


class RiderRegisterRequest(BaseModel):
    """Payload for a user to register as a rider."""

    model_config = ConfigDict(from_attributes=True)

    bike_type: BikeType = BikeType.STANDARD


class RiderPublicProfile(BaseModel):
    """Minimal rider info shown to passengers."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str | None = None
    profile_photo_url: str | None = None
    bike_type: BikeType
    average_rating: float
    total_rides: int
