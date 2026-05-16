"""Payment schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.payment import PaymentStatus


class PaymentResponse(BaseModel):
    """Stripe payment record."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ride_id: uuid.UUID
    stripe_intent_id: str
    amount: float
    status: PaymentStatus
    refund_amount: float
    created_at: datetime
    updated_at: datetime


class RefundRequest(BaseModel):
    """Admin-initiated partial or full refund."""

    model_config = ConfigDict(from_attributes=True)

    amount: float = Field(gt=0.0, description="Amount to refund in EUR")
    reason: str | None = Field(default=None, max_length=500)
