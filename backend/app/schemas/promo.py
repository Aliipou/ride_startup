"""Promo code schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.promo import PromoType


class PromoValidateRequest(BaseModel):
    """Check whether a promo code is valid for a given order value."""

    model_config = ConfigDict(from_attributes=True)

    code: str = Field(max_length=50)
    ride_price: float = Field(gt=0.0)


class PromoValidateResponse(BaseModel):
    """Result of promo validation — includes calculated discount."""

    model_config = ConfigDict(from_attributes=True)

    code: str
    type: PromoType
    value: float
    discount_amount: float
    final_price: float
    is_valid: bool
    message: str = "Promo code applied"


class PromoCodeCreate(BaseModel):
    """Admin schema for creating a new promo code."""

    model_config = ConfigDict(from_attributes=True)

    code: str = Field(min_length=3, max_length=50)
    type: PromoType
    value: float = Field(gt=0.0)
    min_order_value: float = Field(default=0.0, ge=0.0)
    max_discount: float | None = None
    max_uses: int | None = Field(default=None, gt=0)
    is_active: bool = True
    valid_from: datetime | None = None
    valid_until: datetime | None = None


class PromoCodeResponse(BaseModel):
    """Full promo code record for admin views."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    type: PromoType
    value: float
    min_order_value: float
    max_discount: float | None
    max_uses: int | None
    current_uses: int
    is_active: bool
    valid_from: datetime | None
    valid_until: datetime | None
    created_at: datetime
