"""Riders router — rider profile, location, status, earnings."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.rider import Rider
from ..models.user import User
from ..schemas.rider import RiderResponse, RiderLocationUpdate, RiderStatusUpdate
from ..utils.deps import get_current_user, get_current_rider, require_approved_rider

router = APIRouter()


@router.post("/register", response_model=RiderResponse, status_code=201)
def register_rider(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a rider profile for the authenticated user (pending approval)."""
    from sqlalchemy import select
    existing = db.execute(select(Rider).where(Rider.user_id == current_user.id)).scalar_one_or_none()
    if existing:
        return existing

    rider = Rider(user_id=current_user.id)
    db.add(rider)
    db.commit()
    db.refresh(rider)
    return rider


@router.get("/me", response_model=RiderResponse)
def get_rider_profile(current_rider: Rider = Depends(get_current_rider)):
    return current_rider


@router.patch("/location", status_code=204)
def update_location(
    data: RiderLocationUpdate,
    current_rider: Rider = Depends(require_approved_rider),
    db: Session = Depends(get_db),
):
    """Update rider GPS position (called every 5 seconds by the rider app)."""
    current_rider.current_lat = data.lat
    current_rider.current_lng = data.lng
    db.commit()


@router.patch("/status", response_model=RiderResponse)
def update_status(
    data: RiderStatusUpdate,
    current_rider: Rider = Depends(require_approved_rider),
    db: Session = Depends(get_db),
):
    """Toggle rider online/offline status."""
    from ..models.rider import RiderStatus
    if data.status not in (RiderStatus.ONLINE, RiderStatus.OFFLINE):
        from fastapi import HTTPException, status
        raise HTTPException(status_code=400, detail="Can only manually set ONLINE or OFFLINE")

    current_rider.status = data.status
    db.commit()
    db.refresh(current_rider)
    return current_rider


@router.get("/rides/history")
def rider_ride_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_rider: Rider = Depends(require_approved_rider),
    db: Session = Depends(get_db),
):
    from sqlalchemy import select, desc
    from ..models.ride import Ride, RideStatus

    rides = db.execute(
        select(Ride)
        .where(Ride.rider_id == current_rider.id, Ride.status == RideStatus.COMPLETED)
        .order_by(desc(Ride.completed_at))
        .offset(skip)
        .limit(limit)
    ).scalars().all()
    return rides


@router.get("/earnings")
def rider_earnings(current_rider: Rider = Depends(require_approved_rider)):
    return {
        "total_earnings": current_rider.total_earnings,
        "pending_earnings": current_rider.pending_earnings,
        "available_earnings": round(current_rider.total_earnings - current_rider.pending_earnings, 2),
        "total_rides": current_rider.total_rides,
        "average_rating": current_rider.average_rating,
    }
