"""Admin dashboard schemas."""

from pydantic import BaseModel, ConfigDict, Field


class AdminStats(BaseModel):
    """Aggregated stats for today."""

    model_config = ConfigDict(from_attributes=True)

    total_rides_today: int
    completed_rides_today: int
    cancelled_rides_today: int
    revenue_today: float
    active_riders: int
    new_users_today: int
    pending_rider_approvals: int


class AdminChartData(BaseModel):
    """Time-series data point for the dashboard chart."""

    model_config = ConfigDict(from_attributes=True)

    label: str          # e.g. "Mon", "Tue" or "2024-01-01"
    rides: int
    revenue: float
    new_users: int


class PricingConfig(BaseModel):
    """Live pricing configuration (editable by admin)."""

    model_config = ConfigDict(from_attributes=True)

    base_fare: float = Field(gt=0.0)
    rate_per_km: float = Field(gt=0.0)
    surge_multiplier: float = Field(ge=1.0)
    min_fare: float = Field(gt=0.0)
    ebike_premium: float = Field(ge=0.0)


class BroadcastNotificationRequest(BaseModel):
    """Admin broadcast push notification to all or targeted users."""

    model_config = ConfigDict(from_attributes=True)

    title: str = Field(max_length=255)
    body: str = Field(max_length=1000)
    target: str = Field(default="all")  # "all" | "riders" | "users"
    data: dict | None = None
