"""Rides router — estimate, request, track, cancel, complete."""

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.rider import Rider
from ..schemas.ride import (
    RideEstimateRequest,
    RideEstimateResponse,
    RideRequest,
    RideResponse,
    RideCancelRequest,
    TipRequest,
)
from ..services import pricing_service, ride_service
from ..utils.deps import get_current_user, require_approved_rider
from ..utils.geo import haversine

router = APIRouter()


@router.post("/estimate", response_model=RideEstimateResponse)
def estimate_ride(
    data: RideEstimateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculate price estimate BEFORE the user confirms booking.
    Price is always calculated server-side — never trust frontend values.
    """
    distance_km = haversine(
        data.origin_lat, data.origin_lng,
        data.destination_lat, data.destination_lng,
    )
    breakdown = pricing_service.calculate_price(
        distance_km=distance_km,
        bike_type=data.bike_type,
    )
    return RideEstimateResponse(
        distance_km=round(distance_km, 2),
        duration_minutes=int(distance_km / 15 * 60),
        **breakdown,
    )


@router.post("/request", response_model=RideResponse, status_code=status.HTTP_201_CREATED)
def request_ride(
    data: RideRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Book a ride. Finds nearest available rider and notifies them."""
    return ride_service.create_ride(db, current_user, data)


@router.get("/history", response_model=list[RideResponse])
def ride_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the authenticated user's ride history (paginated)."""
    return ride_service.get_user_rides(db, current_user.id, skip=skip, limit=limit)


@router.get("/{ride_id}", response_model=RideResponse)
def get_ride(
    ride_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific ride by ID. Only accessible by the ride's user or rider."""
    ride = ride_service.get_ride_or_404(db, ride_id)
    if ride.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your ride")
    return ride


@router.post("/{ride_id}/cancel", response_model=RideResponse)
def cancel_ride(
    ride_id: uuid.UUID,
    data: RideCancelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel a ride (only possible in PENDING or ACCEPTED states)."""
    return ride_service.cancel_ride(db, ride_id, current_user.id, data.reason, cancelled_by="user")


@router.post("/{ride_id}/tip", response_model=RideResponse)
def add_tip(
    ride_id: uuid.UUID,
    data: TipRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a tip to a completed ride."""
    return ride_service.add_tip(db, ride_id, current_user.id, data.amount)


# ── Rider-facing ride actions ──────────────────────────────────────────────────

@router.post("/{ride_id}/accept", response_model=RideResponse)
def accept_ride(
    ride_id: uuid.UUID,
    current_rider: Rider = Depends(require_approved_rider),
    db: Session = Depends(get_db),
):
    """Rider accepts an incoming ride request."""
    return ride_service.accept_ride(db, ride_id, current_rider)


@router.post("/{ride_id}/arrived", response_model=RideResponse)
def mark_arrived(
    ride_id: uuid.UUID,
    current_rider: Rider = Depends(require_approved_rider),
    db: Session = Depends(get_db),
):
    """Rider marks they have arrived at the pickup location."""
    return ride_service.mark_arrived(db, ride_id, current_rider.id)


@router.post("/{ride_id}/start", response_model=RideResponse)
def start_ride(
    ride_id: uuid.UUID,
    current_rider: Rider = Depends(require_approved_rider),
    db: Session = Depends(get_db),
):
    """Rider starts the trip (user is in the vehicle)."""
    return ride_service.start_ride(db, ride_id, current_rider.id)


@router.post("/{ride_id}/complete", response_model=RideResponse)
def complete_ride(
    ride_id: uuid.UUID,
    current_rider: Rider = Depends(require_approved_rider),
    db: Session = Depends(get_db),
):
    """Rider marks the trip as completed. Triggers payment capture."""
    return ride_service.complete_ride(db, ride_id, current_rider.id)
