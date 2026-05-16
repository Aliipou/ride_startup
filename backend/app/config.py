"""Application configuration — all settings via environment variables.

Secrets must NEVER be in source code. Use:
- Local dev: .env file (gitignored)
- Production: Railway env vars / AWS Secrets Manager / HashiCorp Vault
"""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/rideandchill"
    REDIS_URL: str = "redis://localhost:6379"

    # ── Auth — JWT ────────────────────────────────────────────────────────────
    # 30 minutes = golden standard for access tokens (OWASP recommendation)
    SECRET_KEY: str = "change-me-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── Stripe ────────────────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_CONNECT_CLIENT_ID: str = ""

    # ── Firebase ──────────────────────────────────────────────────────────────
    FIREBASE_SERVICE_ACCOUNT_JSON_BASE64: str = ""

    # ── Twilio ────────────────────────────────────────────────────────────────
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""

    # ── Mapbox ────────────────────────────────────────────────────────────────
    MAPBOX_SECRET_TOKEN: str = ""

    # ── Cloudinary ────────────────────────────────────────────────────────────
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # ── Google OAuth ──────────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""

    # ── CORS ──────────────────────────────────────────────────────────────────
    BACKEND_CORS_ORIGINS: str = (
        "http://localhost:3000,http://localhost:3001,http://localhost:3002"
    )

    # ── Email (SMTP) ──────────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # ── Pricing defaults (overridable per admin panel) ────────────────────────
    BASE_FARE: float = 3.00
    RATE_PER_KM: float = 1.50
    SURGE_MULTIPLIER: float = 1.5
    MIN_FARE: float = 4.00
    EBIKE_PREMIUM: float = 0.10

    # ── Observability ─────────────────────────────────────────────────────────
    OTEL_EXPORTER_OTLP_ENDPOINT: str = ""
    LOG_LEVEL: str = "INFO"
    ENVIRONMENT: str = "development"

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
