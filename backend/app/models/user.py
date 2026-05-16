"""User SQLAlchemy model."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy import Integer  # noqa: F401 — kept for consistency
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    """Platform user — passenger side (and admin flag)."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(30), unique=True, nullable=True, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    profile_photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    referral_code: Mapped[str | None] = mapped_column(
        String(8), unique=True, nullable=True, index=True
    )
    referred_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    push_token: Mapped[str | None] = mapped_column(String(500), nullable=True)
    google_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
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
    wallet: Mapped["Wallet"] = relationship("Wallet", back_populates="user", uselist=False)  # type: ignore[name-defined]  # noqa: F821
    rides: Mapped[list["Ride"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Ride", back_populates="user", foreign_keys="Ride.user_id"
    )
    ratings_given: Mapped[list["Rating"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Rating", back_populates="from_user", foreign_keys="Rating.from_user_id"
    )
    saved_places: Mapped[list["SavedPlace"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "SavedPlace", back_populates="user"
    )
    notifications: Mapped[list["Notification"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Notification", back_populates="user"
    )
    referred_by: Mapped["User | None"] = relationship(
        "User", remote_side="User.id", foreign_keys=[referred_by_id]
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"
