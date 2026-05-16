"""Ratings router."""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..schemas.rating import RatingCreate, RatingResponse
from ..utils.deps import get_current_user

router = APIRouter()


@router.post("", response_model=RatingResponse, status_code=201)
def create_rating(
    data: RatingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from sqlalchemy import select
    from ..models.rating import Rating
    from ..models.ride import Ride, RideStatus
    from ..models.rider import Rider

    ride = db.execute(select(Ride).where(Ride.id == data.ride_id)).scalar_one_or_none()
    if not ride or ride.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.status != RideStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Can only rate completed rides")

    existing = db.execute(select(Rating).where(Rating.ride_id == data.ride_id)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Ride already rated")

    rating = Rating(
        ride_id=data.ride_id,
        from_user_id=current_user.id,
        to_rider_id=ride.rider_id,
        stars=data.stars,
        comment=data.comment,
        tip_amount=data.tip_amount or 0,
    )
    db.add(rating)

    # Update rider average rating
    rider = db.execute(select(Rider).where(Rider.id == ride.rider_id)).scalar_one_or_none()
    if rider:
        total = (rider.average_rating * rider.total_rides + data.stars) / (rider.total_rides + 1)
        rider.average_rating = round(total, 2)

    db.commit()
    db.refresh(rating)
    return rating


@router.get("/rider/{rider_id}", response_model=list[RatingResponse])
def rider_ratings(rider_id: uuid.UUID, db: Session = Depends(get_db)):
    from sqlalchemy import select, desc
    from ..models.rating import Rating

    ratings = db.execute(
        select(Rating).where(Rating.to_rider_id == rider_id).order_by(desc(Rating.created_at)).limit(50)
    ).scalars().all()
    return ratings


@router.get("/mine", response_model=list[RatingResponse])
def my_ratings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from sqlalchemy import select, desc
    from ..models.rating import Rating

    ratings = db.execute(
        select(Rating).where(Rating.from_user_id == current_user.id).order_by(desc(Rating.created_at))
    ).scalars().all()
    return ratings
