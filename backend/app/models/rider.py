"""Rider and RiderDocument SQLAlchemy models."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, String
from sqlalchemy import Integer  # Critical: always import Integer from sqlalchemy
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class RiderStatus(str, enum.Enum):
    OFFLINE = "OFFLINE"
    ONLINE = "ONLINE"
    ON_RIDE = "ON_RIDE"


class ApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class BikeType(str, enum.Enum):
    STANDARD = "STANDARD"
    ELECTRIC = "ELECTRIC"


class DocumentType(str, enum.Enum):
    ID_FRONT = "ID_FRONT"
    ID_BACK = "ID_BACK"
    PROFILE_PHOTO = "PROFILE_PHOTO"
    BIKE_PHOTO = "BIKE_PHOTO"


class Rider(Base):
    """Rider (driver) profile linked to a User."""

    __tablename__ = "riders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False, index=True
    )
    status: Mapped[RiderStatus] = mapped_column(
        Enum(RiderStatus, name="rider_status"), default=RiderStatus.OFFLINE, nullable=False
    )
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus, name="approval_status"),
        default=ApprovalStatus.PENDING,
        nullable=False,
    )
    bike_type: Mapped[BikeType] = mapped_column(
        Enum(BikeType, name="bike_type_enum"), default=BikeType.STANDARD, nullable=False
    )
    current_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_rides: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    average_rating: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_earnings: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    pending_earnings: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    stripe_account_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
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
    user: Mapped["User"] = relationship("User", backref="rider")  # type: ignore[name-defined]  # noqa: F821
    documents: Mapped[list["RiderDocument"]] = relationship(
        "RiderDocument", back_populates="rider", cascade="all, delete-orphan"
    )
    rides: Mapped[list["Ride"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Ride", back_populates="rider", foreign_keys="Ride.rider_id"
    )
    ratings_received: Mapped[list["Rating"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Rating", back_populates="to_rider", foreign_keys="Rating.to_rider_id"
    )

    def __repr__(self) -> str:
        return f"<Rider id={self.id} status={self.status}>"


class RiderDocument(Base):
    """Supporting documents uploaded by a rider during registration."""

    __tablename__ = "rider_documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    rider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("riders.id"), nullable=False, index=True
    )
    doc_type: Mapped[DocumentType] = mapped_column(
        Enum(DocumentType, name="document_type"), nullable=False
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    rider: Mapped[Rider] = relationship("Rider", back_populates="documents")

    def __repr__(self) -> str:
        return f"<RiderDocument id={self.id} doc_type={self.doc_type}>"
