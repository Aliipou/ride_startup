"""Wallet service — atomic balance operations."""

import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..models.wallet import Wallet, WalletTransaction, TransactionType


def get_or_create_wallet(db: Session, user_id: uuid.UUID) -> Wallet:
    """Get existing wallet or create one with zero balance."""
    wallet = db.execute(
        select(Wallet).where(Wallet.user_id == user_id)
    ).scalar_one_or_none()

    if not wallet:
        wallet = Wallet(user_id=user_id, balance=0.0)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)

    return wallet


def get_balance(db: Session, user_id: uuid.UUID) -> float:
    """Return current wallet balance for a user."""
    wallet = get_or_create_wallet(db, user_id)
    return wallet.balance


def deduct(
    db: Session,
    user_id: uuid.UUID,
    amount: float,
    description: str,
    ride_id: uuid.UUID | None = None,
) -> WalletTransaction:
    """
    Atomically deduct amount from wallet.

    Raises:
        ValueError: If balance is insufficient.
    """
    wallet = get_or_create_wallet(db, user_id)

    if wallet.balance < amount:
        raise ValueError(
            f"Insufficient wallet balance: have €{wallet.balance:.2f}, need €{amount:.2f}"
        )

    wallet.balance = round(wallet.balance - amount, 2)
    txn = WalletTransaction(
        wallet_id=wallet.id,
        type=TransactionType.PAYMENT,
        amount=-amount,
        description=description,
        ride_id=ride_id,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


def credit(
    db: Session,
    user_id: uuid.UUID,
    amount: float,
    description: str,
    ride_id: uuid.UUID | None = None,
    txn_type: TransactionType = TransactionType.CREDIT,
) -> WalletTransaction:
    """Atomically credit amount to wallet."""
    wallet = get_or_create_wallet(db, user_id)

    wallet.balance = round(wallet.balance + amount, 2)
    txn = WalletTransaction(
        wallet_id=wallet.id,
        type=txn_type,
        amount=amount,
        description=description,
        ride_id=ride_id,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


def topup(
    db: Session,
    user_id: uuid.UUID,
    stripe_intent_id: str,
    amount: float,
) -> WalletTransaction:
    """Credit wallet after a confirmed Stripe payment."""
    return credit(
        db,
        user_id,
        amount,
        description=f"Wallet top-up via Stripe",
        txn_type=TransactionType.TOPUP,
    )
