"""PromoCode and PromoUsage SQLAlchemy models."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, String
from sqlalchemy import Integer  # noqa: F401
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class PromoType(str, enum.Enum):
    PERCENTAGE = "PERCENTAGE"
    FIXED = "FIXED"
    FREE_RIDE = "FREE_RIDE"


class PromoCode(Base):
    """Promotional discount code."""

    __tablename__ = "promo_codes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    type: Mapped[PromoType] = mapped_column(
        Enum(PromoType, name="promo_type"), nullable=False
    )
    value: Mapped[float] = mapped_column(Float, nullable=False)  # percent or EUR amount
    min_order_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    max_discount: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_uses: Mapped[int | None] = mapped_column(Integer, nullable=True)  # None = unlimited
    current_uses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    usages: Mapped[list["PromoUsage"]] = relationship(
        "PromoUsage", back_populates="promo_code", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<PromoCode code={self.code} type={self.type}>"


class PromoUsage(Base):
    """Tracks which user used which promo on which ride."""

    __tablename__ = "promo_usages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    promo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("promo_codes.id"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    ride_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rides.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    promo_code: Mapped[PromoCode] = relationship("PromoCode", back_populates="usages")

    def __repr__(self) -> str:
        return f"<PromoUsage promo={self.promo_id} user={self.user_id}>"
