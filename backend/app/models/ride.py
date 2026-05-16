"""Ride SQLAlchemy model."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, String
from sqlalchemy import Integer  # noqa: F401 — critical import
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class RideStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    RIDER_ARRIVED = "RIDER_ARRIVED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class PaymentMethod(str, enum.Enum):
    WALLET = "WALLET"
    CARD = "CARD"
    CASH = "CASH"
    APPLE_PAY = "APPLE_PAY"
    GOOGLE_PAY = "GOOGLE_PAY"


class RideBikeType(str, enum.Enum):
    STANDARD = "STANDARD"
    ELECTRIC = "ELECTRIC"


class Ride(Base):
    """A single ride booking from request to completion."""

    __tablename__ = "rides"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    rider_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("riders.id"), nullable=True, index=True
    )

    # Location
    origin_address: Mapped[str] = mapped_column(String(500), nullable=False)
    destination_address: Mapped[str] = mapped_column(String(500), nullable=False)
    origin_lat: Mapped[float] = mapped_column(Float, nullable=False)
    origin_lng: Mapped[float] = mapped_column(Float, nullable=False)
    destination_lat: Mapped[float] = mapped_column(Float, nullable=False)
    destination_lng: Mapped[float] = mapped_column(Float, nullable=False)

    # Metrics
    distance_km: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Pricing (calculated server-side ONLY)
    base_price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    surge_multiplier: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    final_price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    tip_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    is_surge: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Ride options
    bike_type: Mapped[RideBikeType] = mapped_column(
        Enum(RideBikeType, name="ride_bike_type"), default=RideBikeType.STANDARD, nullable=False
    )
    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method"), default=PaymentMethod.CASH, nullable=False
    )
    status: Mapped[RideStatus] = mapped_column(
        Enum(RideStatus, name="ride_status"), default=RideStatus.PENDING, nullable=False
    )

    # Promo
    promo_code_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("promo_codes.id"), nullable=True
    )
    promo_discount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Payment
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Scheduling
    is_scheduled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Cancellation
    cancel_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cancelled_by: Mapped[str | None] = mapped_column(String(50), nullable=True)  # "user" | "rider" | "system"

    # Timestamps
    requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    arrived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", back_populates="rides", foreign_keys=[user_id]
    )
    rider: Mapped["Rider | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Rider", back_populates="rides", foreign_keys=[rider_id]
    )
    rating: Mapped["Rating | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Rating", back_populates="ride", uselist=False
    )
    payment: Mapped["Payment | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Payment", back_populates="ride", uselist=False
    )
    promo_code: Mapped["PromoCode | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "PromoCode", foreign_keys=[promo_code_id]
    )

    def __repr__(self) -> str:
        return f"<Ride id={self.id} status={self.status}>"
