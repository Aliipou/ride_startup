"""Promo code validation and application service."""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.promo import PromoCode, PromoType, PromoUsage


def validate_promo(
    db: Session,
    code: str,
    user_id: uuid.UUID,
    ride_price: float,
) -> dict:
    """Validate a promo code for a given user and ride price.

    Checks:
    - Code exists and is active
    - Within valid date range
    - Has not exceeded max uses
    - User has not already used this code
    - Ride price meets minimum order value

    Args:
        db: Database session.
        code: Promo code string (case-insensitive).
        user_id: ID of the user applying the code.
        ride_price: Subtotal before discount.

    Returns:
        Dict with keys ``discount`` (float) and ``promo_code`` (PromoCode).

    Raises:
        HTTPException 400: Code invalid, expired, or not applicable.
    """
    promo = db.query(PromoCode).filter(
        PromoCode.code == code.upper(),
        PromoCode.is_active == True,  # noqa: E712
    ).first()

    if not promo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or inactive promo code",
        )

    now = datetime.now(timezone.utc)

    if promo.valid_from and now < promo.valid_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Promo code is not yet valid",
        )

    if promo.valid_until and now > promo.valid_until:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Promo code has expired",
        )

    if promo.max_uses is not None and promo.current_uses >= promo.max_uses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Promo code has reached its maximum number of uses",
        )

    # Check per-user usage
    already_used = db.query(PromoUsage).filter(
        PromoUsage.promo_id == promo.id,
        PromoUsage.user_id == user_id,
    ).first()
    if already_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already used this promo code",
        )

    if ride_price < promo.min_order_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum order value for this code is €{promo.min_order_value:.2f}",
        )

    # Calculate discount
    discount = _calculate_discount(promo, ride_price)

    return {"discount": discount, "promo_code": promo}


def _calculate_discount(promo: PromoCode, ride_price: float) -> float:
    """Return the EUR discount amount for *promo* applied to *ride_price*."""
    if promo.type == PromoType.PERCENTAGE:
        raw = ride_price * (promo.value / 100)
        if promo.max_discount is not None:
            raw = min(raw, promo.max_discount)
        return round(raw, 2)

    if promo.type == PromoType.FIXED:
        return round(min(promo.value, ride_price), 2)

    if promo.type == PromoType.FREE_RIDE:
        return round(ride_price, 2)  # Full discount

    return 0.0


def apply_promo(
    db: Session,
    promo_id: uuid.UUID,
    user_id: uuid.UUID,
    ride_id: uuid.UUID | None = None,
) -> PromoUsage:
    """Record promo usage and increment the counter (call after ride is created).

    Args:
        db: Database session.
        promo_id: ID of the PromoCode being applied.
        user_id: ID of the user.
        ride_id: Optional ride being discounted.

    Returns:
        Created PromoUsage record.
    """
    promo = db.query(PromoCode).filter(PromoCode.id == promo_id).first()
    if promo:
        promo.current_uses += 1

    usage = PromoUsage(
        promo_id=promo_id,
        user_id=user_id,
        ride_id=ride_id,
    )
    db.add(usage)
    db.commit()
    db.refresh(usage)
    return usage
