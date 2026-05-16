"""Wallet schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.wallet import TransactionType


class WalletResponse(BaseModel):
    """Wallet balance and metadata."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    balance: float
    updated_at: datetime


class TopupRequest(BaseModel):
    """Initiate a wallet top-up via Stripe."""

    model_config = ConfigDict(from_attributes=True)

    amount: float = Field(gt=0.0, le=500.0, description="Amount in EUR")


class TopupResponse(BaseModel):
    """Stripe PaymentIntent details for the client to confirm."""

    model_config = ConfigDict(from_attributes=True)

    client_secret: str
    stripe_intent_id: str
    amount: float


class TransactionResponse(BaseModel):
    """A single wallet ledger entry."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    wallet_id: uuid.UUID
    type: TransactionType
    amount: float
    description: str | None
    ride_id: uuid.UUID | None
    stripe_intent_id: str | None
    created_at: datetime
