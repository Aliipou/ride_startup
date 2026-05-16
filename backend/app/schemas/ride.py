"""Ride schemas — price breakdown always comes from the server."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.ride import PaymentMethod, RideBikeType, RideStatus


class RideEstimateRequest(BaseModel):
    """Request a price estimate before booking."""

    model_config = ConfigDict(from_attributes=True)

    origin_lat: float = Field(ge=-90.0, le=90.0)
    origin_lng: float = Field(ge=-180.0, le=180.0)
    destination_lat: float = Field(ge=-90.0, le=90.0)
    destination_lng: float = Field(ge=-180.0, le=180.0)
    bike_type: RideBikeType = RideBikeType.STANDARD
    promo_code: str | None = None


class RideEstimateResponse(BaseModel):
    """Server-calculated price breakdown — never computed on frontend."""

    model_config = ConfigDict(from_attributes=True)

    distance_km: float
    duration_minutes: int
    base_fare: float
    distance_cost: float
    subtotal: float
    surge_multiplier: float
    is_surge: bool
    promo_discount: float
    final_price: float
    bike_type: RideBikeType


class RideRequest(BaseModel):
    """Book a ride after viewing the estimate."""

    model_config = ConfigDict(from_attributes=True)

    origin_address: str = Field(max_length=500)
    destination_address: str = Field(max_length=500)
    origin_lat: float = Field(ge=-90.0, le=90.0)
    origin_lng: float = Field(ge=-180.0, le=180.0)
    destination_lat: float = Field(ge=-90.0, le=90.0)
    destination_lng: float = Field(ge=-180.0, le=180.0)
    bike_type: RideBikeType = RideBikeType.STANDARD
    payment_method: PaymentMethod = PaymentMethod.CASH
    promo_code: str | None = None
    is_scheduled: bool = False
    scheduled_for: datetime | None = None


class RideResponse(BaseModel):
    """Full ride object returned to clients."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    rider_id: uuid.UUID | None
    origin_address: str
    destination_address: str
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    distance_km: float
    duration_minutes: int
    base_price: float
    surge_multiplier: float
    final_price: float
    tip_amount: float
    is_surge: bool
    bike_type: RideBikeType
    payment_method: PaymentMethod
    status: RideStatus
    promo_discount: float
    is_scheduled: bool
    scheduled_for: datetime | None
    cancel_reason: str | None
    cancelled_by: str | None
    requested_at: datetime | None
    accepted_at: datetime | None
    arrived_at: datetime | None
    started_at: datetime | None
    completed_at: datetime | None
    cancelled_at: datetime | None
    created_at: datetime
    updated_at: datetime


class RideStatusUpdate(BaseModel):
    """Rider updates the status of an active ride."""

    model_config = ConfigDict(from_attributes=True)

    status: RideStatus


class RideCancelRequest(BaseModel):
    """User or rider cancels a ride."""

    model_config = ConfigDict(from_attributes=True)

    reason: str | None = Field(default=None, max_length=500)


class TipRequest(BaseModel):
    """Add a tip after a completed ride."""

    model_config = ConfigDict(from_attributes=True)

    amount: float = Field(gt=0.0, le=50.0)
