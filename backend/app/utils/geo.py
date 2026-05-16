"""Geographic utility functions for distance and duration estimation."""

import math


_EARTH_RADIUS_KM = 6371.0
_AVG_SPEED_KMH = 15.0  # Average bike taxi speed in Kokkola city


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on Earth.

    Uses the Haversine formula which gives accurate results for short-to-medium
    distances. Appropriate for city-scale ride estimations.

    Args:
        lat1: Latitude of origin in decimal degrees.
        lon1: Longitude of origin in decimal degrees.
        lat2: Latitude of destination in decimal degrees.
        lon2: Longitude of destination in decimal degrees.

    Returns:
        Distance in kilometres (float).
    """
    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(delta_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return _EARTH_RADIUS_KM * c


def estimate_duration(distance_km: float) -> int:
    """Estimate ride duration in minutes based on average bike speed.

    Assumes an average speed of 15 km/h through Kokkola city streets.
    Adds a 2-minute fixed overhead for traffic stops and intersections.

    Args:
        distance_km: Distance to travel in kilometres.

    Returns:
        Estimated duration in whole minutes (minimum 1).
    """
    if distance_km <= 0:
        return 1
    travel_minutes = (distance_km / _AVG_SPEED_KMH) * 60
    overhead_minutes = 2.0
    return max(1, round(travel_minutes + overhead_minutes))
