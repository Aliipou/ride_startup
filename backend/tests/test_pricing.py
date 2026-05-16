"""Unit tests for the pricing service.

Tests are fast, independent, and meaningful.
Price logic is the most critical business rule — tested exhaustively.
"""

import pytest
from datetime import datetime, timezone

from app.services.pricing_service import calculate_price, is_surge_time
from app.models.rider import BikeType


class TestSurgeDetection:
    def test_surge_at_night_after_22(self):
        dt = datetime(2024, 3, 15, 23, 0, tzinfo=timezone.utc)  # Friday 23:00
        assert is_surge_time(dt) is True

    def test_surge_at_night_before_6(self):
        dt = datetime(2024, 3, 15, 3, 0, tzinfo=timezone.utc)  # 03:00
        assert is_surge_time(dt) is True

    def test_surge_on_saturday(self):
        dt = datetime(2024, 3, 16, 14, 0, tzinfo=timezone.utc)  # Saturday 14:00
        assert is_surge_time(dt) is True

    def test_surge_on_sunday(self):
        dt = datetime(2024, 3, 17, 10, 0, tzinfo=timezone.utc)  # Sunday 10:00
        assert is_surge_time(dt) is True

    def test_no_surge_weekday_afternoon(self):
        dt = datetime(2024, 3, 18, 14, 0, tzinfo=timezone.utc)  # Monday 14:00
        assert is_surge_time(dt) is False

    def test_boundary_exactly_22(self):
        dt = datetime(2024, 3, 18, 22, 0, tzinfo=timezone.utc)
        assert is_surge_time(dt) is True

    def test_boundary_exactly_6(self):
        dt = datetime(2024, 3, 18, 6, 0, tzinfo=timezone.utc)
        assert is_surge_time(dt) is False  # 06:00 is not < 6


class TestPriceCalculation:
    def test_standard_ride_no_surge(self):
        """3 km, standard bike, no surge, no promo."""
        result = calculate_price(distance_km=3.0, bike_type=BikeType.STANDARD, force_surge=False)

        assert result["base_fare"] == 3.00
        assert result["distance_cost"] == 4.50  # 3 * 1.50
        assert result["subtotal"] == 7.50
        assert result["is_surge"] is False
        assert result["surge_multiplier"] == 1.0
        assert result["ebike_premium"] == 0.0
        assert result["promo_discount"] == 0.0
        assert result["final_price"] == 7.50

    def test_surge_multiplier_applied(self):
        """Same 3 km ride during surge should be 1.5x."""
        result = calculate_price(distance_km=3.0, bike_type=BikeType.STANDARD, force_surge=True)

        assert result["is_surge"] is True
        assert result["surge_multiplier"] == 1.5
        assert result["final_price"] == pytest.approx(11.25, abs=0.01)

    def test_electric_bike_premium(self):
        """E-bike costs 10% more."""
        result = calculate_price(distance_km=3.0, bike_type=BikeType.ELECTRIC, force_surge=False)

        assert result["ebike_premium"] > 0
        assert result["final_price"] > 7.50
        assert result["final_price"] == pytest.approx(8.25, abs=0.01)

    def test_promo_discount_applied(self):
        """Promo discount reduces the final price."""
        result = calculate_price(
            distance_km=3.0,
            bike_type=BikeType.STANDARD,
            promo_discount=2.0,
            force_surge=False,
        )
        assert result["promo_discount"] == 2.0
        assert result["final_price"] == pytest.approx(5.50, abs=0.01)

    def test_minimum_fare_enforced(self):
        """Very short ride must not go below minimum fare (€4.00)."""
        result = calculate_price(distance_km=0.1, bike_type=BikeType.STANDARD, force_surge=False)
        assert result["final_price"] == 4.00  # minimum fare

    def test_promo_cannot_push_below_minimum(self):
        """Promo applied to a cheap ride still respects minimum fare."""
        result = calculate_price(
            distance_km=0.5,
            bike_type=BikeType.STANDARD,
            promo_discount=10.0,
            force_surge=False,
        )
        assert result["final_price"] == 4.00

    def test_electric_surge_combined(self):
        """E-bike + surge stacks correctly."""
        result = calculate_price(distance_km=3.0, bike_type=BikeType.ELECTRIC, force_surge=True)
        # 7.50 * 1.10 = 8.25, then * 1.5 = 12.375
        assert result["final_price"] == pytest.approx(12.38, abs=0.01)

    def test_distance_reflected_in_breakdown(self):
        result = calculate_price(distance_km=5.0, bike_type=BikeType.STANDARD, force_surge=False)
        assert result["distance_km"] == 5.0
        assert result["distance_cost"] == pytest.approx(7.50, abs=0.01)

    def test_zero_promo_no_effect(self):
        base = calculate_price(distance_km=3.0, force_surge=False)
        with_zero_promo = calculate_price(distance_km=3.0, promo_discount=0.0, force_surge=False)
        assert base["final_price"] == with_zero_promo["final_price"]
