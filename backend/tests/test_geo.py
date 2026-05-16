"""Unit tests for geolocation utilities."""

import pytest
from app.utils.geo import haversine, estimate_duration


class TestHaversine:
    def test_kokkola_to_helsinki(self):
        """Kokkola (63.84°N, 23.13°E) to Helsinki (60.17°N, 24.94°E) ≈ 440 km."""
        dist = haversine(63.84, 23.13, 60.17, 24.94)
        assert 420 < dist < 470, f"Expected ~440 km, got {dist:.1f} km"

    def test_same_point_is_zero(self):
        dist = haversine(63.84, 23.13, 63.84, 23.13)
        assert dist == pytest.approx(0.0, abs=0.001)

    def test_short_urban_distance(self):
        """Two points ~500 m apart in Kokkola city centre."""
        dist = haversine(63.8380, 23.1315, 63.8412, 23.1385)
        assert 0.3 < dist < 0.8, f"Expected ~0.5 km, got {dist:.3f} km"

    def test_symmetrical(self):
        """Distance A→B equals B→A."""
        d1 = haversine(63.84, 23.13, 60.17, 24.94)
        d2 = haversine(60.17, 24.94, 63.84, 23.13)
        assert d1 == pytest.approx(d2, rel=1e-6)

    def test_north_south_crossing(self):
        """Non-zero distance across equator."""
        dist = haversine(10.0, 0.0, -10.0, 0.0)
        assert dist == pytest.approx(2223.9, abs=5.0)


class TestEstimateDuration:
    def test_3km_at_15kmh_with_overhead(self):
        """3 km at 15 km/h = 12 min travel + 2 min overhead = 14 minutes."""
        mins = estimate_duration(3.0)
        assert mins == 14

    def test_zero_distance_returns_minimum(self):
        # Implementation returns minimum 1 for zero distance
        assert estimate_duration(0.0) == 1

    def test_1km_with_overhead(self):
        # 1 km = 4 min travel + 2 overhead = 6
        mins = estimate_duration(1.0)
        assert mins == 6

    def test_returns_integer(self):
        result = estimate_duration(2.5)
        assert isinstance(result, int)

    def test_longer_distance(self):
        # 6 km = 24 min travel + 2 overhead = 26
        mins = estimate_duration(6.0)
        assert mins == 26
