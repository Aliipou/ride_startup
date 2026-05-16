"""Ride orchestration service — rider matching, notifications, timeout logic."""

import asyncio
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.models.ride import Ride, RideStatus
from app.models.rider import ApprovalStatus, Rider, RiderStatus
from app.utils.geo import haversine


_RIDE_TIMEOUT_SECONDS = 30  # Auto-cancel if no rider accepts within 30 seconds


def find_nearest_rider(
    db: Session,
    lat: float,
    lng: float,
    bike_type: str | None = None,
    max_radius_km: float = 5.0,
) -> Optional[Rider]:
    """Find the nearest ONLINE and APPROVED rider to the given coordinates.

    Args:
        db: Database session.
        lat: Origin latitude.
        lng: Origin longitude.
        bike_type: Optional filter by bike type (``"STANDARD"`` or ``"ELECTRIC"``).
        max_radius_km: Maximum search radius in kilometres.

    Returns:
        Nearest qualifying Rider, or None if none found within radius.
    """
    query = db.query(Rider).filter(
        Rider.status == RiderStatus.ONLINE,
        Rider.approval_status == ApprovalStatus.APPROVED,
        Rider.current_lat.isnot(None),
        Rider.current_lng.isnot(None),
    )

    if bike_type:
        query = query.filter(Rider.bike_type == bike_type)

    riders = query.all()

    nearest: Rider | None = None
    nearest_distance = float("inf")

    for rider in riders:
        if rider.current_lat is None or rider.current_lng is None:
            continue
        dist = haversine(lat, lng, rider.current_lat, rider.current_lng)
        if dist < max_radius_km and dist < nearest_distance:
            nearest_distance = dist
            nearest = rider

    return nearest


async def notify_rider_new_ride(rider: Rider, ride: Ride) -> None:
    """Notify a rider of a new incoming ride request via WebSocket and push.

    Sends a WebSocket message to the connected rider (if online) and
    also dispatches a Firebase push notification as a fallback.

    Args:
        rider: The Rider to notify.
        ride: The newly created Ride.
    """
    # Lazy import to avoid circular dependency with ws router
    try:
        from app.routers.ws import manager  # noqa: PLC0415

        await manager.send_to_rider(
            str(rider.id),
            {
                "type": "new_ride_request",
                "ride_id": str(ride.id),
                "origin_address": ride.origin_address,
                "destination_address": ride.destination_address,
                "origin_lat": ride.origin_lat,
                "origin_lng": ride.origin_lng,
                "destination_lat": ride.destination_lat,
                "destination_lng": ride.destination_lng,
                "final_price": ride.final_price,
                "payment_method": ride.payment_method.value,
                "bike_type": ride.bike_type.value,
                "timeout_seconds": _RIDE_TIMEOUT_SECONDS,
            },
        )
    except Exception:
        pass

    # Push notification fallback
    try:
        from app.services.notification_service import send_push  # noqa: PLC0415

        if rider.user and rider.user.push_token:
            send_push(
                rider.user.push_token,
                title="New ride request!",
                body=f"From {ride.origin_address} to {ride.destination_address}",
                data={"ride_id": str(ride.id), "type": "new_ride_request"},
            )
    except Exception:
        pass


async def timeout_ride(ride_id: uuid.UUID, db_factory) -> None:
    """Auto-cancel a ride if no rider accepts within the timeout window.

    This coroutine should be launched as a background task immediately
    after a ride is created.  It waits for ``_RIDE_TIMEOUT_SECONDS`` then,
    if the ride is still PENDING, transitions it to CANCELLED.

    Args:
        ride_id: UUID of the ride to monitor.
        db_factory: Callable that returns a new DB session (e.g. ``SessionLocal``).
    """
    await asyncio.sleep(_RIDE_TIMEOUT_SECONDS)

    db: Session = db_factory()
    try:
        ride = db.query(Ride).filter(Ride.id == ride_id).first()
        if ride and ride.status == RideStatus.PENDING:
            ride.status = RideStatus.CANCELLED
            ride.cancel_reason = "No rider accepted within the time limit"
            ride.cancelled_by = "system"
            db.commit()

            # Notify user via WebSocket
            try:
                from app.routers.ws import manager  # noqa: PLC0415

                await manager.send_to_user(
                    str(ride.user_id),
                    {
                        "type": "ride_cancelled",
                        "ride_id": str(ride_id),
                        "reason": "No available riders. Please try again.",
                    },
                )
            except Exception:
                pass
    finally:
        db.close()
