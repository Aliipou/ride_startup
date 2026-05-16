"""Rating SQLAlchemy model."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy import Integer  # noqa: F401 — critical import
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class Rating(Base):
    """Post-ride rating given by a passenger to a rider."""

    __tablename__ = "ratings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    ride_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rides.id"), unique=True, nullable=False, index=True
    )
    from_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    to_rider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("riders.id"), nullable=False, index=True
    )
    stars: Mapped[int] = mapped_column(Integer, nullable=False)  # 1–5
    comment: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    tip_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    ride: Mapped["Ride"] = relationship("Ride", back_populates="rating")  # type: ignore[name-defined]  # noqa: F821
    from_user: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", back_populates="ratings_given", foreign_keys=[from_user_id]
    )
    to_rider: Mapped["Rider"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Rider", back_populates="ratings_received", foreign_keys=[to_rider_id]
    )

    def __repr__(self) -> str:
        return f"<Rating id={self.id} stars={self.stars}>"
