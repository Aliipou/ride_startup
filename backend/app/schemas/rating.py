"""Rating schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RatingCreate(BaseModel):
    """Submit a post-ride rating."""

    model_config = ConfigDict(from_attributes=True)

    ride_id: uuid.UUID
    stars: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)
    tip_amount: float = Field(default=0.0, ge=0.0, le=50.0)


class RatingResponse(BaseModel):
    """Rating record returned to clients."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ride_id: uuid.UUID
    from_user_id: uuid.UUID
    to_rider_id: uuid.UUID
    stars: int
    comment: str | None
    tip_amount: float
    created_at: datetime
