"""Pricing service — all fare calculations happen here, never in frontend."""

from datetime import datetime, timezone
from typing import TypedDict

from ..config import settings
from ..models.rider import BikeType


class PriceBreakdown(TypedDict):
    base_fare: float
    distance_cost: float
    subtotal: float
    is_surge: bool
    surge_multiplier: float
    ebike_premium: float
    promo_discount: float
    final_price: float
    distance_km: float


def is_surge_time(dt: datetime | None = None) -> bool:
    """Return True during surge pricing periods (nights 22:00-06:00 and weekends)."""
    now = dt or datetime.now(tz=timezone.utc)
    hour = now.hour
    weekday = now.weekday()  # 0=Mon, 6=Sun

    is_night = hour >= 22 or hour < 6
    is_weekend = weekday >= 5

    return is_night or is_weekend


def calculate_price(
    distance_km: float,
    bike_type: BikeType = BikeType.STANDARD,
    promo_discount: float = 0.0,
    force_surge: bool | None = None,
    dt: datetime | None = None,
) -> PriceBreakdown:
    """
    Calculate ride price server-side.

    Args:
        distance_km: Distance of the ride in kilometres.
        bike_type: STANDARD or ELECTRIC.
        promo_discount: Fixed euro amount to subtract (after surge applied).
        force_surge: Override surge detection (useful for tests).
        dt: Datetime to evaluate surge for (defaults to now).

    Returns:
        Full price breakdown dict.
    """
    base_fare = settings.BASE_FARE
    distance_cost = round(distance_km * settings.RATE_PER_KM, 2)
    subtotal = round(base_fare + distance_cost, 2)

    # E-bike premium
    ebike_premium = 0.0
    if bike_type == BikeType.ELECTRIC:
        ebike_premium = round(subtotal * settings.EBIKE_PREMIUM, 2)
        subtotal = round(subtotal + ebike_premium, 2)

    # Surge multiplier
    surge = force_surge if force_surge is not None else is_surge_time(dt)
    surge_multiplier = settings.SURGE_MULTIPLIER if surge else 1.0
    if surge:
        subtotal = round(subtotal * surge_multiplier, 2)

    # Promo discount
    discounted = round(subtotal - promo_discount, 2)

    # Enforce minimum fare
    final_price = round(max(discounted, settings.MIN_FARE), 2)

    return PriceBreakdown(
        base_fare=base_fare,
        distance_cost=distance_cost,
        subtotal=subtotal,
        is_surge=surge,
        surge_multiplier=surge_multiplier,
        ebike_premium=ebike_premium,
        promo_discount=promo_discount,
        final_price=final_price,
        distance_km=distance_km,
    )
