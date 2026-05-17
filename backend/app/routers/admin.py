"""Admin router — stats, user/rider management, pricing, promos, reports."""

import csv
import io
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from ..database import get_db
from ..models.ride import Ride, RideStatus
from ..models.user import User
from ..models.rider import Rider, ApprovalStatus, RiderStatus
from ..schemas.admin import AdminStats, PricingConfig
from ..utils.deps import get_current_admin

router = APIRouter()


@router.get("/stats/today", response_model=AdminStats)
def stats_today(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    today = datetime.now(tz=timezone.utc).date()
    today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)

    total_rides_today = db.execute(
        select(func.count()).where(Ride.created_at >= today_start)
    ).scalar() or 0

    revenue_today = db.execute(
        select(func.coalesce(func.sum(Ride.final_price), 0.0))
        .where(Ride.status == RideStatus.COMPLETED, Ride.completed_at >= today_start)
    ).scalar() or 0.0

    active_riders = db.execute(
        select(func.count()).where(Rider.status.in_([RiderStatus.ONLINE, RiderStatus.ON_RIDE]))
    ).scalar() or 0

    new_users_today = db.execute(
        select(func.count()).where(User.created_at >= today_start)
    ).scalar() or 0

    return AdminStats(
        total_rides_today=total_rides_today,
        revenue_today=round(float(revenue_today), 2),
        active_riders=active_riders,
        new_users_today=new_users_today,
    )


@router.get("/stats/chart")
def stats_chart(
    days: int = 30,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    since = datetime.now(tz=timezone.utc) - timedelta(days=days)
    rides = db.execute(
        select(
            func.date(Ride.created_at).label("date"),
            func.count().label("rides"),
            func.coalesce(func.sum(Ride.final_price), 0).label("revenue"),
        )
        .where(Ride.created_at >= since)
        .group_by(func.date(Ride.created_at))
        .order_by(func.date(Ride.created_at))
    ).all()
    return [{"date": str(r.date), "rides": r.rides, "revenue": float(r.revenue)} for r in rides]


@router.get("/rides/live")
def live_rides(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    from ..models.ride import RideStatus

    active = db.execute(
        select(Ride).where(Ride.status.in_([RideStatus.ACCEPTED, RideStatus.RIDER_ARRIVED, RideStatus.IN_PROGRESS]))
    ).scalars().all()
    return active


@router.get("/users")
def list_users(
    skip: int = 0,
    limit: int = 25,
    search: str = "",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    q = select(User)
    if search:
        q = q.where(User.email.ilike(f"%{search}%") | User.full_name.ilike(f"%{search}%"))
    users = db.execute(q.offset(skip).limit(limit)).scalars().all()
    return users


@router.get("/riders")
def list_riders(
    skip: int = 0,
    limit: int = 25,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    riders = db.execute(select(Rider).offset(skip).limit(limit)).scalars().all()
    return riders


@router.get("/riders/pending")
def pending_riders(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    riders = db.execute(
        select(Rider).where(Rider.approval_status == ApprovalStatus.PENDING)
    ).scalars().all()
    return riders


@router.post("/riders/{rider_id}/approve", status_code=200)
def approve_rider(
    rider_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    import uuid
    rider = db.get(Rider, uuid.UUID(rider_id))
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")
    rider.approval_status = ApprovalStatus.APPROVED
    db.commit()
    return {"status": "approved"}


@router.post("/riders/{rider_id}/reject")
def reject_rider(
    rider_id: str,
    data: dict,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    import uuid
    rider = db.get(Rider, uuid.UUID(rider_id))
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")
    rider.approval_status = ApprovalStatus.REJECTED
    rider.rejection_reason = data.get("reason", "")
    db.commit()
    return {"status": "rejected"}


@router.get("/pricing", response_model=PricingConfig)
def get_pricing(_: User = Depends(get_current_admin)):
    from ..config import settings
    return PricingConfig(
        base_fare=settings.BASE_FARE,
        rate_per_km=settings.RATE_PER_KM,
        surge_multiplier=settings.SURGE_MULTIPLIER,
        min_fare=settings.MIN_FARE,
        ebike_premium=settings.EBIKE_PREMIUM,
    )


@router.patch("/pricing", response_model=PricingConfig)
def update_pricing(
    data: PricingConfig,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Update pricing config. In production, persist to DB and reload settings."""
    from ..config import settings
    settings.BASE_FARE = data.base_fare
    settings.RATE_PER_KM = data.rate_per_km
    settings.SURGE_MULTIPLIER = data.surge_multiplier
    settings.MIN_FARE = data.min_fare
    settings.EBIKE_PREMIUM = data.ebike_premium
    return data


@router.get("/promos")
def list_promos(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    from ..models.promo import PromoCode
    return db.execute(select(PromoCode).order_by(desc(PromoCode.created_at))).scalars().all()


@router.post("/promos", status_code=201)
def create_promo(
    data: dict,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from ..models.promo import PromoCode
    promo = PromoCode(**data)
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return promo


@router.get("/reports/revenue")
def revenue_report(
    from_date: str = "",
    to_date: str = "",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Download revenue report as CSV."""
    q = select(Ride).where(Ride.status == RideStatus.COMPLETED)
    if from_date:
        q = q.where(Ride.completed_at >= datetime.fromisoformat(from_date))
    if to_date:
        q = q.where(Ride.completed_at <= datetime.fromisoformat(to_date))

    rides = db.execute(q.order_by(desc(Ride.completed_at))).scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ride_id", "completed_at", "distance_km", "final_price", "tip_amount", "payment_method", "bike_type"])
    for r in rides:
        writer.writerow([
            str(r.id), r.completed_at, r.distance_km,
            r.final_price, r.tip_amount, r.payment_method.value, r.bike_type.value,
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=revenue_report.csv"},
    )
